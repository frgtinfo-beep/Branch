(function () {
  const form = document.getElementById('contactForm');
  if (!form) return;

  const statusEl = document.getElementById('formStatus');
  const submitBtn = form.querySelector('button[type="submit"]');
  const submitLabel = document.getElementById('submitLabel');
  const fields = ['name', 'email', 'company', 'projectType', 'message'].map((id) => document.getElementById(id));

  // translations.js exposes the active language; fall back to English copy if it hasn't loaded
  const FALLBACK = {
    form_sending: 'Sending…',
    form_success: 'Thanks! Your message is on its way. We will get back to you within 24 hours.',
    form_missing: 'Please fill in the highlighted fields.',
    form_error: 'Your message could not be sent. Please try again, or email contact@infobranch.nl.',
    form_network: 'No connection to our server. Check your internet connection and try again.',
    btn_send: 'Send Inquiry →',
  };
  const t = (key) => (window.branchT && window.branchT(key)) || FALLBACK[key];

  const TONES = { info: 'text-[#374151]', success: 'text-[#15803D]', error: 'text-[#B91C1C]' };
  function setStatus(message, tone) {
    statusEl.textContent = message;
    statusEl.classList.remove('hidden', ...Object.values(TONES));
    statusEl.classList.add(TONES[tone]);
  }

  function setSending(sending) {
    submitBtn.disabled = sending;
    submitBtn.setAttribute('aria-busy', String(sending));
    submitLabel.textContent = sending ? t('form_sending') : t('btn_send');
  }

  // Clear the error mark as soon as the visitor fixes a field
  fields.forEach((field) => {
    field.addEventListener('input', () => {
      if (field.checkValidity()) field.removeAttribute('aria-invalid');
    });
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const invalid = fields.filter((field) => !field.checkValidity());
    fields.forEach((field) => {
      if (invalid.includes(field)) field.setAttribute('aria-invalid', 'true');
      else field.removeAttribute('aria-invalid');
    });
    if (invalid.length) {
      setStatus(t('form_missing'), 'error');
      invalid[0].focus();
      return;
    }

    const formData = Object.fromEntries(fields.map((field) => [field.id, field.value.trim()]));

    setSending(true);
    setStatus(t('form_sending'), 'info');

    try {
      const response = await fetch('https://branchdb.onrender.com/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        form.reset();
        setStatus(t('form_success'), 'success');
      } else {
        const errorData = await response.json().catch(() => ({}));
        setStatus(errorData.error || errorData.message || t('form_error'), 'error');
      }
    } catch (error) {
      setStatus(t('form_network'), 'error');
    } finally {
      setSending(false);
    }
  });
})();
