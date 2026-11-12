(function () {
  const form = document.getElementById('contactForm');
  if (!form) return;

  const statusEl = document.getElementById('formStatus');
  const submitBtn = form.querySelector('button[type="submit"]');
  const submitLabel = document.getElementById('submitLabel');
  const fields = ['name', 'email', 'company', 'projectType', 'message'].map((id) => document.getElementById(id));

  // translations.js exposes the active language; fall back to Dutch copy if it hasn't loaded
  const FALLBACK = {
    form_sending: 'Verzenden…',
    form_success: 'Bedankt, je bericht is verzonden. We nemen binnen 24 uur contact met je op.',
    form_missing: 'Vul de gemarkeerde velden in.',
    form_error: 'Je bericht kon niet worden verzonden. Probeer het opnieuw, of mail naar contact@infobranch.nl.',
    form_network: 'Geen verbinding met onze server. Controleer je internetverbinding en probeer het opnieuw.',
    btn_send: 'Aanvraag verzenden →',
    form_slow: 'Nog even geduld, je bericht wordt verstuurd…',
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

  const SLOW_KEY = 'form_slow';

  // The API runs on a host that sleeps when idle; the first request can take up to a minute.
  // Wake it as soon as someone starts filling in the form, tell them if a send is slow,
  // and retry once or twice if the host answers "not ready yet" (502/503/504).
  const API_BASE = 'https://branchdb.onrender.com';
  let warmedUp = false;
  form.addEventListener('focusin', () => {
    if (warmedUp) return;
    warmedUp = true;
    fetch(API_BASE + '/api/health', { mode: 'no-cors' }).catch(() => {});
  });
  async function postWithPatience(url, payload) {
    const slowTimer = setTimeout(() => setStatus(t(SLOW_KEY), 'info'), 4000);
    try {
      for (let attempt = 0; ; attempt++) {
        const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (![502, 503, 504].includes(response.status) || attempt === 2) return response;
        await new Promise((resolve) => setTimeout(resolve, 4000));
      }
    } finally {
      clearTimeout(slowTimer);
    }
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
      const response = await postWithPatience(API_BASE + '/api/contact', formData);

      if (response.ok) {
        form.reset();
        setStatus(t('form_success'), 'success');
        if (window.branchTrack) window.branchTrack('form_submit', 'verzonden');
      } else {
        const errorData = await response.json().catch(() => ({}));
        setStatus(errorData.error || errorData.message || t('form_error'), 'error');
        if (window.branchTrack) window.branchTrack('form_submit', 'mislukt');
      }
    } catch (error) {
      setStatus(t('form_network'), 'error');
    } finally {
      setSending(false);
    }
  });
})();
