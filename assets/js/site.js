/* =========================================================================
   Impulse AI — Comportamiento del sitio
   Dos cosas: menu movil y envio del formulario de contacto.
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
