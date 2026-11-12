// "Gratis website" sign-up form: posts to /api/free-site, which emails the lead to the team
(function () {
  const form = document.getElementById('freeSiteForm');
  if (!form) return;

  const statusEl = document.getElementById('formStatus');
  const submitBtn = form.querySelector('button[type="submit"]');
  const submitLabel = document.getElementById('submitLabel');
  const kvkGroup = document.getElementById('kvkGroup');
  const fields = ['contactName', 'companyName', 'sector', 'clientsPerMonth', 'phone', 'email'].map((id) => document.getElementById(id));
  const kvkInputs = Array.from(form.querySelectorAll('input[name="kvk"]'));

  // translations.js exposes the active language; fall back to Dutch copy if it hasn't loaded
  const FALLBACK = {
    fw_sending: 'Verzenden…',
    fw_success: 'Je aanvraag is binnen. Check je mail voor de bevestiging, we bellen je binnen 24 uur.',
    fw_missing: 'Vul de gemarkeerde velden in.',
    fw_error: 'Je aanvraag kon niet worden verzonden. Probeer het opnieuw, of app ons via +31 6 45055904.',
    fw_network: 'Geen verbinding met onze server. Controleer je internet en probeer het opnieuw.',
    fw_submit: 'Vraag je gratis site aan →',
    fw_slow: 'Nog even geduld, je aanvraag wordt verstuurd…',
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
    submitLabel.textContent = sending ? t('fw_sending') : t('fw_submit');
  }

  const SLOW_KEY = 'fw_slow';

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

  const kvkValue = () => (kvkInputs.find((input) => input.checked) || {}).value || '';

  fields.forEach((field) => {
    const evt = field.tagName === 'SELECT' ? 'change' : 'input';
    field.addEventListener(evt, () => {
      if (field.checkValidity()) field.removeAttribute('aria-invalid');
    });
  });
  kvkInputs.forEach((input) => input.addEventListener('change', () => kvkGroup.removeAttribute('aria-invalid')));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const invalid = fields.filter((field) => !field.checkValidity());
    fields.forEach((field) => {
      if (invalid.includes(field)) field.setAttribute('aria-invalid', 'true');
      else field.removeAttribute('aria-invalid');
    });
    const kvkMissing = !kvkValue();
    if (kvkMissing) kvkGroup.setAttribute('aria-invalid', 'true');

    if (invalid.length || kvkMissing) {
      setStatus(t('fw_missing'), 'error');
      (invalid[0] || kvkInputs[0]).focus();
      return;
    }

    const payload = Object.fromEntries(fields.map((field) => [field.id, field.value.trim()]));
    payload.kvk = kvkValue();
    payload.website = document.getElementById('website').value;

    setSending(true);
    setStatus(t('fw_sending'), 'info');

    try {
      const response = await postWithPatience(API_BASE + '/api/free-site', payload);

      if (response.ok) {
        form.reset();
        setStatus(t('fw_success'), 'success');
        if (window.branchTrack) window.branchTrack('free_site_submit', payload.sector);
      } else {
        setStatus(t('fw_error'), 'error');
        if (window.branchTrack) window.branchTrack('free_site_submit', 'mislukt');
      }
    } catch (error) {
      setStatus(t('fw_network'), 'error');
    } finally {
      setSending(false);
    }
  });
})();
