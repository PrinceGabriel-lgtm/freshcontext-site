const form = document.getElementById('request-form');
const button = document.getElementById('send-request');
const status = document.getElementById('request-status');
const service = document.getElementById('service');
const requested = new URLSearchParams(location.search).get('service');
if ([...service.options].some(option => option.value === requested)) service.value = requested;
function showService() {
  document.getElementById('request-title').textContent = service.selectedOptions[0].textContent;
  document.getElementById('price-amount').textContent = service.value === 'assessment' ? 'US$750-1,500' : 'Quoted after scoping';
}
service.addEventListener('change', showService);
showService();
let config, widget, token = '', pending = false, key = crypto.randomUUID(), previous = '';
const campaign = new URLSearchParams(location.search).get('utm_source');
const attribution = ['coderlegion', 'producthunt', 'devto'].includes(campaign) ? campaign : 'unknown';
const timeout = 15000;
function refreshChallenge() { token = ''; if (widget !== undefined && window.turnstile) window.turnstile.reset(widget); }
async function setup() {
  try {
    const response = await fetch('/api/request-config', { cache: 'no-store', signal: AbortSignal.timeout(timeout) });
    if (!response.ok) throw new Error();
    config = await response.json();
    if (config.mode === 'local-preview' && ['127.0.0.1', 'localhost'].includes(location.hostname)) {
      document.getElementById('preview-notice').hidden = false;
      document.getElementById('receipt-title').textContent = 'Local preview receipt';
      button.disabled = false; status.textContent = 'Synthetic test entries only. Nothing is sent externally.'; return;
    }
    if (!config.enabled || !config.site_key) throw new Error();
    window.onTurnstileReady = () => {
      widget = window.turnstile.render('#challenge', { sitekey: config.site_key, action: 'commercial_request', callback: value => { token = value; button.disabled = false; status.textContent = ''; }, 'expired-callback': () => { token = ''; button.disabled = true; status.textContent = 'Verification expired. Please verify again.'; }, 'error-callback': () => { button.disabled = true; status.textContent = 'Verification is unavailable. Please use the email link.'; } });
    };
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileReady&render=explicit';
    script.onerror = () => { status.textContent = 'Verification is unavailable. Please use the email link.'; };
    document.head.append(script);
  } catch { status.textContent = 'Direct requests are unavailable. Please use the email link below.'; }
}
form.addEventListener('submit', async event => {
  event.preventDefault();
  if (pending || !form.reportValidity()) return;
  const fields = Object.fromEntries(new FormData(form));
  const payload = { name: fields.name.trim(), email: fields.email.trim(), company: fields.company.trim(), workflow: fields.workflow.trim(), service: fields.service, acknowledgement: true, attribution };
  const basis = JSON.stringify(payload);
  if (previous && previous !== basis) key = crypto.randomUUID();
  previous = basis;
  if (!config?.enabled) return;
  pending = true; button.disabled = true; status.textContent = 'Sending request...';
  try {
    const response = await fetch('/api/requests', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...payload, idempotency_key: key, turnstile_token: token }), signal: AbortSignal.timeout(timeout) });
    const receipt = await response.json();
    if (!response.ok || typeof receipt.reference !== 'string' || !/^FC-REQ-[A-F0-9]{24}$/.test(receipt.reference)) {
      if (response.status === 409) { key = crypto.randomUUID(); previous = ''; }
      throw new Error();
    }
    document.getElementById('receipt-reference').textContent = receipt.reference;
    form.hidden = true; const area = document.getElementById('receipt'); area.hidden = false; area.focus();
  } catch {
    status.textContent = 'Receipt could not be confirmed. Retry with the same details, or use the email link. Do not send payment.';
    refreshChallenge();
  } finally { pending = false; button.disabled = config?.mode !== 'local-preview' && !token; }
});
setup();
