/* =========================================================================
   POST /api/contacto
   Recibe el formulario del sitio y manda dos correos con Resend:

     1. Aviso interno a BUZON, con responder-a puesto en el correo de quien
        escribe, para contestarle directo desde la bandeja.
     2. Confirmacion a quien escribio, con copia de lo que envio.

   El aviso interno es el critico: si falla, la respuesta es un error y el
   formulario muestra el correo de contacto como alternativa. La
   confirmacion es deseable pero no bloquea.

   Requiere la variable de entorno RESEND_API_KEY en Vercel.
   ========================================================================= */

const RESEND_ENDPOINT = 'https://api.resend.com/emails';

const REMITENTE = 'Impulse AI <no-replay@impulseai.cl>';
const BUZON = 'contacto@impulseai.cl';

/* --------------------------------------------------------- Rate limiting
   Freno en memoria del proceso. Es best-effort a proposito: en serverless
   cada instancia tiene su propio contador y Vercel puede levantar varias,
   asi que esto corta el abuso obvio desde una IP pero no es una garantia.
   El freno duro para trafico real es Vercel Firewall o un contador
   compartido (Upstash / Vercel KV); ver README.

   Dos capas:
     - por IP, para que nadie repita el formulario en bucle
     - global de la instancia, para proteger la cuota de Resend aunque el
       ataque venga repartido entre muchas IP
   -------------------------------------------------------------------------- */

const VENTANA_IP_MS = 10 * 60 * 1000;
const MAX_POR_IP = 5;

const VENTANA_GLOBAL_MS = 60 * 60 * 1000;
const MAX_GLOBAL = 40;

const MAX_IPS_EN_MEMORIA = 5000;

const golpesPorIp = new Map();
let golpesGlobales = [];

function vigentes(marcas, ahora, ventana) {
  let corte = 0;
  while (corte < marcas.length && ahora - marcas[corte] >= ventana) corte++;
  return corte ? marcas.slice(corte) : marcas;
}

function ipDelCliente(req) {
  const cabeceras = req.headers || {};
  const real = cabeceras['x-real-ip'];
  if (real) return String(real).trim();

  const reenviada = cabeceras['x-forwarded-for'];
  if (reenviada) return String(reenviada).split(',')[0].trim();

  return (req.socket && req.socket.remoteAddress) || 'desconocida';
}

/* Devuelve null si puede pasar, o los segundos que faltan para reintentar. */
function esperaRequerida(ip, ahora) {
  golpesGlobales = vigentes(golpesGlobales, ahora, VENTANA_GLOBAL_MS);
  if (golpesGlobales.length >= MAX_GLOBAL) {
    return Math.ceil((VENTANA_GLOBAL_MS - (ahora - golpesGlobales[0])) / 1000);
  }

  const previos = vigentes(golpesPorIp.get(ip) || [], ahora, VENTANA_IP_MS);
  if (previos.length >= MAX_POR_IP) {
    golpesPorIp.set(ip, previos);
    return Math.ceil((VENTANA_IP_MS - (ahora - previos[0])) / 1000);
  }

  previos.push(ahora);
  golpesPorIp.set(ip, previos);
  golpesGlobales.push(ahora);

  /* La memoria de la instancia no puede crecer sin tope: si hay demasiadas
     IP guardadas, se sueltan primero las que ya no tienen golpes vigentes. */
  if (golpesPorIp.size > MAX_IPS_EN_MEMORIA) {
    for (const [clave, marcas] of golpesPorIp) {
      if (!vigentes(marcas, ahora, VENTANA_IP_MS).length) golpesPorIp.delete(clave);
      if (golpesPorIp.size <= MAX_IPS_EN_MEMORIA) break;
    }
  }

  return null;
}

const MARCA = '#FF4D1F';
const TINTA = '#121212';
const GRIS = '#6B6B6B';
const BORDE = '#DFDCD8';
const PAGINA = '#FAF9F8';

const LIMITES = {
  nombre: 120,
  empresa: 160,
  correo: 254,
  interes: 40,
  mensaje: 4000
};

const INTERESES = {
  cierra: 'Cierra: venta de parcelas',
  tapcar: 'TapCar: control de flota',
  nuevo: 'Un producto nuevo',
  otro: 'Otra cosa'
};

const CORREO_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/* ------------------------------------------------------------- Utilidades */

function limpiar(valor, maximo) {
  if (typeof valor !== 'string') return '';
  return valor.replace(/\s+/g, ' ').trim().slice(0, maximo);
}

function limpiarLargo(valor, maximo) {
  if (typeof valor !== 'string') return '';
  return valor.replace(/\r\n/g, '\n').trim().slice(0, maximo);
}

function escapar(texto) {
  return String(texto)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* Una cabecera no puede llevar saltos de linea: cortan el mensaje e
   inyectan cabeceras nuevas. */
function seguroParaCabecera(texto) {
  return texto.replace(/[\r\n]+/g, ' ').trim();
}

function parrafosHtml(texto) {
  return texto
    .split(/\n{2,}/)
    .map(function (bloque) {
      return '<p style="margin:0 0 16px;line-height:1.5">' +
        escapar(bloque).replace(/\n/g, '<br>') + '</p>';
    })
    .join('');
}

/* --------------------------------------------------------------- Plantilla */

function envolver(contenido) {
  return '<!doctype html><html lang="es"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1"></head>' +
    '<body style="margin:0;padding:24px;background:' + PAGINA + ';' +
    'font-family:Helvetica,Arial,sans-serif;font-size:16px;color:' + TINTA + '">' +
    '<table role="presentation" cellpadding="0" cellspacing="0" border="0" ' +
    'style="width:100%;max-width:560px;margin:0 auto;background:#FFFFFF;' +
    'border:1px solid ' + BORDE + '"><tr><td style="padding:32px">' +
    contenido +
    '</td></tr></table>' +
    '<p style="max-width:560px;margin:16px auto 0;font-size:12px;color:' + GRIS + '">' +
    'Impulse AI &middot; impulseai.cl</p>' +
    '</body></html>';
}

function encabezado(etiqueta, titulo) {
  return '<p style="margin:0 0 8px;font-family:Consolas,Menlo,monospace;' +
    'font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:' + GRIS + '">' +
    escapar(etiqueta) + '</p>' +
    '<h1 style="margin:0 0 24px;font-size:24px;font-weight:600;' +
    'letter-spacing:-0.02em;line-height:1.2">' + escapar(titulo) + '</h1>';
}

function filas(datos) {
  return '<table role="presentation" cellpadding="0" cellspacing="0" border="0" ' +
    'style="width:100%;border-top:1px solid ' + BORDE + '">' +
    datos.map(function (par) {
      return '<tr>' +
        '<td style="padding:12px 16px 12px 0;border-bottom:1px solid ' + BORDE + ';' +
        'font-family:Consolas,Menlo,monospace;font-size:11px;letter-spacing:0.14em;' +
        'text-transform:uppercase;color:' + GRIS + ';white-space:nowrap;vertical-align:top">' +
        escapar(par[0]) + '</td>' +
        '<td style="padding:12px 0;border-bottom:1px solid ' + BORDE + ';' +
        'line-height:1.45;word-break:break-word">' + escapar(par[1]) + '</td>' +
        '</tr>';
    }).join('') +
    '</table>';
}

function correoInterno(d) {
  var datos = [['Nombre', d.nombre], ['Correo', d.correo]];
  if (d.empresa) datos.push(['Empresa', d.empresa]);
  if (d.interes) datos.push(['Interés', d.interes]);
  datos.push(['Origen', d.origen]);

  return envolver(
    encabezado('Formulario del sitio', 'Nuevo contacto: ' + d.nombre) +
    filas(datos) +
    '<h2 style="margin:32px 0 12px;font-size:16px;font-weight:600">Qué quiere resolver</h2>' +
    '<div style="color:' + TINTA + '">' + parrafosHtml(d.mensaje) + '</div>' +
    '<p style="margin:24px 0 0;padding-top:24px;border-top:1px solid ' + BORDE + '">' +
    '<a href="mailto:' + escapar(d.correo) + '" style="color:' + MARCA + '">' +
    'Responder a ' + escapar(d.nombre) + '</a></p>'
  );
}

function textoInterno(d) {
  return 'Nuevo contacto desde el sitio\n\n' +
    'Nombre: ' + d.nombre + '\n' +
    'Correo: ' + d.correo + '\n' +
    (d.empresa ? 'Empresa: ' + d.empresa + '\n' : '') +
    (d.interes ? 'Interes: ' + d.interes + '\n' : '') +
    'Origen: ' + d.origen + '\n\n' +
    'Que quiere resolver:\n' + d.mensaje + '\n';
}

function correoCliente(d) {
  return envolver(
    encabezado('Impulse AI', 'Recibimos tu mensaje, ' + d.nombre.split(' ')[0] + '.') +
    '<p style="margin:0 0 16px;line-height:1.5">Te respondemos en un día hábil con una ' +
    'propuesta concreta de primer paso. Si no es para nosotros, también te lo decimos.</p>' +
    '<p style="margin:0 0 32px;line-height:1.5;color:' + GRIS + '">' +
    'Esta es una copia de lo que nos enviaste.</p>' +
    '<div style="border-left:2px solid ' + MARCA + ';padding:4px 0 4px 16px;color:' + GRIS + '">' +
    parrafosHtml(d.mensaje) +
    '</div>' +
    '<p style="margin:32px 0 0;padding-top:24px;border-top:1px solid ' + BORDE + ';' +
    'line-height:1.5;color:' + GRIS + '">Si quieres agregar algo, responde este correo: ' +
    'llega a <a href="mailto:' + BUZON + '" style="color:' + MARCA + '">' + BUZON + '</a>.</p>'
  );
}

function textoCliente(d) {
  return 'Recibimos tu mensaje, ' + d.nombre.split(' ')[0] + '.\n\n' +
    'Te respondemos en un dia habil con una propuesta concreta de primer paso.\n' +
    'Si no es para nosotros, tambien te lo decimos.\n\n' +
    'Copia de lo que nos enviaste:\n' + d.mensaje + '\n\n' +
    'Si quieres agregar algo, responde este correo: llega a ' + BUZON + '.\n\n' +
    'Impulse AI - impulseai.cl\n';
}

/* ----------------------------------------------------------------- Resend */

async function enviar(apiKey, mensaje) {
  const respuesta = await fetch(RESEND_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + apiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(mensaje)
  });

  if (!respuesta.ok) {
    const detalle = await respuesta.text();
    const error = new Error('Resend respondio ' + respuesta.status + ': ' + detalle);
    error.estado = respuesta.status;
    throw error;
  }

  return respuesta.json();
}

/* ------------------------------------------------------------- Controlador */

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Método no permitido.' });
  }

  const espera = esperaRequerida(ipDelCliente(req), Date.now());
  if (espera !== null) {
    res.setHeader('Retry-After', String(espera));
    return res.status(429).json({
      ok: false,
      error: 'Demasiados envíos seguidos. Vuelve a intentar en un rato o escríbenos a ' + BUZON + '.'
    });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error('Falta RESEND_API_KEY en las variables de entorno.');
    return res.status(500).json({
      ok: false,
      error: 'El formulario no está configurado. Escríbenos a ' + BUZON + '.'
    });
  }

  const cuerpo = typeof req.body === 'string' ? safeParse(req.body) : (req.body || {});

  /* Trampa para robots: el campo va oculto, una persona nunca lo llena.
     Se responde exito para no darle pistas al bot. */
  if (limpiar(cuerpo.website, 200)) {
    return res.status(200).json({ ok: true });
  }

  const nombre = limpiar(cuerpo.nombre, LIMITES.nombre);
  const correo = limpiar(cuerpo.correo, LIMITES.correo).toLowerCase();
  const empresa = limpiar(cuerpo.empresa, LIMITES.empresa);
  const mensaje = limpiarLargo(cuerpo.mensaje || cuerpo.problema, LIMITES.mensaje);
  const interesCrudo = limpiar(cuerpo.interes, LIMITES.interes);
  const interes = INTERESES[interesCrudo] || '';
  const origen = limpiar(cuerpo.origen, 40) || 'sitio';

  const faltantes = [];
  if (!nombre) faltantes.push('nombre');
  if (!correo) faltantes.push('correo');
  if (!mensaje) faltantes.push('mensaje');

  if (faltantes.length) {
    return res.status(400).json({
      ok: false,
      error: 'Faltan datos: ' + faltantes.join(', ') + '.',
      campos: faltantes
    });
  }

  if (!CORREO_VALIDO.test(correo)) {
    return res.status(400).json({
      ok: false,
      error: 'El correo no tiene un formato válido.',
      campos: ['correo']
    });
  }

  const datos = { nombre: nombre, correo: correo, empresa: empresa,
                  interes: interes, mensaje: mensaje, origen: origen };

  /* 1. Aviso interno. Es el critico: sin esto se pierde el contacto. */
  try {
    await enviar(apiKey, {
      from: REMITENTE,
      to: [BUZON],
      reply_to: [seguroParaCabecera(correo)],
      subject: 'Contacto: ' + seguroParaCabecera(nombre) + (empresa ? ' · ' + seguroParaCabecera(empresa) : ''),
      html: correoInterno(datos),
      text: textoInterno(datos)
    });
  } catch (error) {
    console.error('No se pudo enviar el aviso interno:', error.message);
    return res.status(502).json({
      ok: false,
      error: 'No pudimos enviar tu mensaje. Escríbenos a ' + BUZON + '.'
    });
  }

  /* 2. Confirmacion a quien escribio. Si falla, el contacto igual llego. */
  let confirmacion = true;
  try {
    await enviar(apiKey, {
      from: REMITENTE,
      to: [seguroParaCabecera(correo)],
      reply_to: [BUZON],
      subject: 'Recibimos tu mensaje — Impulse AI',
      html: correoCliente(datos),
      text: textoCliente(datos)
    });
  } catch (error) {
    confirmacion = false;
    console.error('No se pudo enviar la confirmación al cliente:', error.message);
  }

  return res.status(200).json({ ok: true, confirmacion: confirmacion });
};

function safeParse(texto) {
  try {
    return JSON.parse(texto);
  } catch (error) {
    return {};
  }
}
