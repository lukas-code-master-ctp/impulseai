/* =========================================================================
   Impulse AI — Comportamiento del sitio
   Tres cosas: menu movil, movimiento y envio del formulario de contacto.
   Sin dependencias.
   ========================================================================= */
(function () {
  'use strict';

  /* ----------------------------------------------------------- Menu movil */
  var toggle = document.querySelector('[data-nav-toggle]');
  var panel = document.querySelector('[data-nav-panel]');

  if (toggle && panel) {
    var setOpen = function (open) {
      panel.setAttribute('data-open', open ? 'true' : 'false');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.textContent = open ? 'Cerrar' : 'Menú';
    };

    setOpen(false);

    toggle.addEventListener('click', function () {
      setOpen(panel.getAttribute('data-open') !== 'true');
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && panel.getAttribute('data-open') === 'true') {
        setOpen(false);
        toggle.focus();
      }
    });

    panel.addEventListener('click', function (event) {
      if (event.target.closest('a')) setOpen(false);
    });

    window.addEventListener('resize', function () {
      if (window.innerWidth > 860) setOpen(false);
    });
  }

  /* ----------------------------------------------------------- Movimiento
     Solo corre si el <head> activo html.motion: sin movimiento reducido y
     con IntersectionObserver. Lo que se oculta lo decide site.css.
     ---------------------------------------------------------------------- */
  var root = document.documentElement;

  if (root.classList.contains('motion')) {
    var REVEAL = [
      '.hero__copy > :not(.hero__title)',
      '.hero__panel > .shot',
      '.section-head > *',
      '.grid > *',
      '.ruled-list > li',
      '.split__side > :not(h1)',
      '.panel-ink > *',
      '.cta > *',
      'main > .section:first-child > .wrap.stack > :not(h1)'
    ].join(',');

    // Titulos display: cada palabra en su propia mascara. El lector de
    // pantalla lee el aria-label, no los fragmentos.
    Array.prototype.forEach.call(document.querySelectorAll('h1.t-display'), function (titulo) {
      if (titulo.children.length) { titulo.classList.add('is-split'); return; }
      var texto = titulo.textContent.trim();
      titulo.setAttribute('aria-label', texto);
      titulo.textContent = '';
      texto.split(/\s+/).forEach(function (palabra, i) {
        var mascara = document.createElement('span');
        var interior = document.createElement('span');
        mascara.className = 'split-word';
        mascara.setAttribute('aria-hidden', 'true');
        mascara.style.setProperty('--word-index', i);
        interior.textContent = palabra;
        mascara.appendChild(interior);
        titulo.appendChild(mascara);
        titulo.appendChild(document.createTextNode(' '));
      });
      titulo.classList.add('is-split');
    });

    // Cifras: las que son un entero de dos o tres digitos cuentan desde cero
    var contar = function (el) {
      var match = /^(\+?)(\d{2,3})$/.exec(el.textContent.trim());
      if (!match) return;
      var prefijo = match[1];
      var meta = parseInt(match[2], 10);
      var inicio = null;
      var DURACION = 900;
      var paso = function (t) {
        if (inicio === null) inicio = t;
        var p = Math.min((t - inicio) / DURACION, 1);
        var curva = 1 - Math.pow(1 - p, 3);
        el.textContent = prefijo + Math.round(meta * curva);
        if (p < 1) requestAnimationFrame(paso);
      };
      el.setAttribute('aria-label', el.textContent.trim());
      requestAnimationFrame(paso);
    };

    // Escalonado: cada elemento espera segun su posicion entre hermanos
    var escalonar = function (el) {
      var hermanos = el.parentElement ? el.parentElement.children : [];
      var i = Array.prototype.indexOf.call(hermanos, el);
      el.style.setProperty('--reveal-delay', Math.min(i, 6) * 70 + 'ms');
    };

    var revelar = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (entrada) {
        if (!entrada.isIntersecting) return;
        var el = entrada.target;
        el.classList.add('is-visible');
        Array.prototype.forEach.call(el.querySelectorAll('.stat__value'), contar);
        revelar.unobserve(el);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });

    Array.prototype.forEach.call(document.querySelectorAll(REVEAL), function (el) {
      escalonar(el);
      revelar.observe(el);
    });

    // Bucles del panel naranja: se detienen fuera de pantalla y con el boton
    var panelMarca = document.querySelector('.hero__panel--brand');
    if (panelMarca) {
      new IntersectionObserver(function (entradas) {
        panelMarca.classList.toggle('is-offscreen', !entradas[0].isIntersecting);
      }).observe(panelMarca);
    }

    var pausa = document.querySelector('[data-motion-toggle]');
    if (pausa) {
      pausa.addEventListener('click', function () {
        var pausado = root.getAttribute('data-motion') !== 'paused';
        if (pausado) root.setAttribute('data-motion', 'paused');
        else root.removeAttribute('data-motion');
        pausa.textContent = pausado ? 'Reanudar animación' : 'Pausar animación';
      });
    }

    root.classList.add('motion-ready');
  }

  /* --------------------------------------------- Formulario de contacto */
  var form = document.querySelector('[data-contact-form]');
  if (!form) return;

  var ENDPOINT = '/api/contacto';
  var EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  var BUZON = 'contacto@impulseai.cl';

  var status = form.querySelector('[data-form-status]');
  var boton = form.querySelector('button[type=submit]');
  var textoBoton = boton ? boton.textContent : 'Enviar';
  var enviando = false;

  var mostrarError = function (campo, mensaje) {
    var contenedor = campo.closest('.field');
    if (!contenedor) return;
    contenedor.classList.add('field--error');
    var hueco = contenedor.querySelector('[data-error]');
    if (hueco) hueco.textContent = mensaje;
    campo.setAttribute('aria-invalid', 'true');
  };

  var limpiarError = function (campo) {
    var contenedor = campo.closest('.field');
    if (!contenedor) return;
    contenedor.classList.remove('field--error');
    var hueco = contenedor.querySelector('[data-error]');
    if (hueco) hueco.textContent = '';
    campo.removeAttribute('aria-invalid');
  };

  var avisar = function (mensaje, esError) {
    if (!status) return;
    status.hidden = false;
    status.textContent = mensaje;
    status.setAttribute('data-tone', esError ? 'error' : 'ok');
    status.focus();
  };

  var bloquear = function (activo) {
    enviando = activo;
    if (!boton) return;
    boton.disabled = activo;
    boton.textContent = activo ? 'Enviando…' : textoBoton;
  };

  form.addEventListener('input', function (event) {
    if (event.target.matches('.field__control')) limpiarError(event.target);
  });

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    if (enviando) return;

    var campos = Array.prototype.slice.call(form.querySelectorAll('.field__control'));
    var primerInvalido = null;

    campos.forEach(function (campo) {
      limpiarError(campo);
      var valor = (campo.value || '').trim();

      if (campo.required && !valor) {
        mostrarError(campo, 'Este campo es obligatorio.');
        primerInvalido = primerInvalido || campo;
        return;
      }
      if (campo.type === 'email' && valor && !EMAIL.test(valor)) {
        mostrarError(campo, 'Revisa el correo: falta el formato nombre@empresa.cl');
        primerInvalido = primerInvalido || campo;
      }
    });

    if (primerInvalido) {
      avisar('Faltan datos. Revisa los campos marcados.', true);
      primerInvalido.focus();
      return;
    }

    var datos = {};
    new FormData(form).forEach(function (valor, clave) {
      datos[clave] = valor;
    });

    bloquear(true);
    avisar('Enviando tu mensaje…', false);

    fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datos)
    })
      .then(function (respuesta) {
        return respuesta.json()
          .catch(function () { return {}; })
          .then(function (cuerpo) {
            return { ok: respuesta.ok, cuerpo: cuerpo };
          });
      })
      .then(function (resultado) {
        bloquear(false);

        if (!resultado.ok || !resultado.cuerpo.ok) {
          var mensaje = resultado.cuerpo.error ||
            'No pudimos enviar tu mensaje. Escríbenos a ' + BUZON + '.';
          avisar(mensaje, true);

          (resultado.cuerpo.campos || []).forEach(function (nombre) {
            var campo = form.querySelector('[name="' + nombre + '"]');
            if (campo) mostrarError(campo, 'Revisa este campo.');
          });
          return;
        }

        avisar(
          'Listo. Te enviamos una confirmación a tu correo y respondemos en un día hábil.',
          false
        );
        form.reset();
      })
      .catch(function () {
        bloquear(false);
        avisar('No hay conexión. Escríbenos a ' + BUZON + '.', true);
      });
  });
})();
