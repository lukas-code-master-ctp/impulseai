/* =========================================================================
   Impulse AI — Comportamiento del sitio
   Solo dos cosas: menu movil y validacion del formulario de contacto.
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

  var status = form.querySelector('[data-form-status]');
  var EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  var showError = function (field, message) {
    var wrapper = field.closest('.field');
    if (!wrapper) return;
    wrapper.classList.add('field--error');
    var slot = wrapper.querySelector('[data-error]');
    if (slot) slot.textContent = message;
    field.setAttribute('aria-invalid', 'true');
  };

  var clearError = function (field) {
    var wrapper = field.closest('.field');
    if (!wrapper) return;
    wrapper.classList.remove('field--error');
    var slot = wrapper.querySelector('[data-error]');
    if (slot) slot.textContent = '';
    field.removeAttribute('aria-invalid');
  };

  form.addEventListener('input', function (event) {
    if (event.target.matches('.field__control')) clearError(event.target);
  });

  form.addEventListener('submit', function (event) {
    event.preventDefault();

    var fields = Array.prototype.slice.call(form.querySelectorAll('.field__control'));
    var firstInvalid = null;

    fields.forEach(function (field) {
      clearError(field);
      var value = (field.value || '').trim();

      if (field.required && !value) {
        showError(field, 'Este campo es obligatorio.');
        firstInvalid = firstInvalid || field;
        return;
      }
      if (field.type === 'email' && value && !EMAIL.test(value)) {
        showError(field, 'Revisa el correo: falta el formato nombre@empresa.cl');
        firstInvalid = firstInvalid || field;
      }
    });

    if (firstInvalid) {
      if (status) {
        status.hidden = false;
        status.textContent = 'Faltan datos. Revisa los campos marcados.';
      }
      firstInvalid.focus();
      return;
    }

    /* El sitio es estatico: aqui va el POST al endpoint real.
       Mientras no exista, se confirma en pantalla y no se envia nada. */
    if (status) {
      status.hidden = false;
      status.textContent = 'Listo. Recibimos tu mensaje y respondemos en un día hábil.';
      status.focus();
    }
    form.reset();
  });
})();
