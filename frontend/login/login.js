/*
  Frontend-only login using sql.js (SQLite in WASM) and Web Crypto.
  - Initializes an in-memory SQLite DB in the browser
  - Creates a `users` table and seeds a single admin user: admin@admas.local / Admin123!
  - Passwords are stored as SHA-256 hex digests for demo purposes
  - On successful login stores user info and a demo token in localStorage
*/

// Helper: convert ArrayBuffer to hex
function toHex(buffer) {
  const bytes = new Uint8Array(buffer);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Hash a string using SHA-256 and return hex
async function sha256Hex(str) {
  const enc = new TextEncoder();
  const data = enc.encode(str);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return toHex(hash);
}

// Fallback UUID generator for browsers without crypto.randomUUID (some mobile/older browsers)
function safeUuid() {
  if (crypto && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  if (crypto && crypto.getRandomValues) {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    // Set version and variant bits (UUID v4)
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes).map((b) => b.toString(16).padStart(2, '0'));
    return `${hex[0]}${hex[1]}${hex[2]}${hex[3]}-${hex[4]}${hex[5]}-${hex[6]}${hex[7]}-${hex[8]}${hex[9]}-${hex[10]}${hex[11]}${hex[12]}${hex[13]}${hex[14]}${hex[15]}`;
  }
  // Last resort
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  const qpTab = params.get('tabId');
  const tabId = qpTab || window.name || safeUuid();
  window.name = tabId;

  function setScoped(key, value) {
    localStorage.setItem(`${key}_${tabId}`, value);
  }

  const form = document.getElementById('login-form');
  const msg = document.getElementById('message');
  const forgotLink = document.getElementById('forgot-link');
  const forgotModal = document.getElementById('forgot-modal');
  const forgotCancel = document.getElementById('forgot-cancel');
  const forgotForm = document.getElementById('forgot-form');
  const forgotEmail = document.getElementById('forgot-email');
  const forgotMsg = document.getElementById('forgot-msg');
  // Build API base from current host so it works across IP changes/LAN
  const apiBase = 'https://whole-baboons-wash.loca.lt';
  const channel = ('BroadcastChannel' in window) ? new BroadcastChannel('admas-updates') : null;

  const openForgot = () => {
    if (!forgotModal) return;
    forgotModal.classList.add('open');
    forgotModal.setAttribute('aria-hidden', 'false');
    if (forgotEmail) forgotEmail.focus();
  };
  const closeForgot = () => {
    if (!forgotModal) return;
    forgotModal.classList.remove('open');
    forgotModal.setAttribute('aria-hidden', 'true');
    if (forgotMsg) forgotMsg.textContent = '';
    if (forgotForm) forgotForm.reset();
  };

  if (forgotLink) forgotLink.addEventListener('click', (e) => { e.preventDefault(); openForgot(); });
  if (forgotCancel) forgotCancel.addEventListener('click', closeForgot);
  if (forgotModal) {
    forgotModal.addEventListener('click', (e) => {
      if (e.target === forgotModal) closeForgot();
    });
  }

  if (forgotForm) {
    forgotForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!forgotEmail) return;
      const email = forgotEmail.value.trim().toLowerCase();
      if (!email) {
        if (forgotMsg) forgotMsg.textContent = 'Please enter an email.';
        return;
      }
      if (forgotMsg) { forgotMsg.textContent = 'Sending...'; forgotMsg.style.color = ''; }
      try {
        const res = await fetch(`${apiBase}/api/auth/forgot`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        });
        const data = await res.json().catch(() => null);
        if (res.ok && data && data.success !== false) {
          if (forgotMsg) { forgotMsg.textContent = 'Request sent to admin.'; forgotMsg.style.color = 'green'; }
          if (channel) channel.postMessage({ type: 'reset-requested', email });
          setTimeout(closeForgot, 800);
        } else {
          const errText = (data && data.error) || 'Could not submit request.';
          if (forgotMsg) { forgotMsg.textContent = errText; forgotMsg.style.color = '#b91c1c'; }
        }
      } catch (err) {
        if (forgotMsg) { forgotMsg.textContent = 'Network error.'; forgotMsg.style.color = '#b91c1c'; }
      }
    });
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    msg.style.color = ''; // reset
    msg.textContent = 'Logging in...';
    const email = document.getElementById('email').value.trim().toLowerCase();
    const password = document.getElementById('password').value;

    if (!email || !password) {
      msg.textContent = 'Email and password are required.';
      return;
    }

    try {
      const res = await fetch(`${apiBase}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json().catch(() => null);
      if (res.ok && data && data.success) {
        setScoped('admas_token', data.data.token);
        setScoped('admas_user', JSON.stringify(data.data.user));
        // also keep a default copy so opening a new tab in the same role works
        localStorage.setItem('admas_token', data.data.token);
        localStorage.setItem('admas_user', JSON.stringify(data.data.user));
        msg.style.color = 'green';
        msg.textContent = 'Login successful. Redirecting...';

        const isFile = window.location.protocol === 'file:';
        const isGhPages = window.location.hostname.includes('github.io');
        const baseRoot = (() => {
          if (isFile) return 'file:///C:/codin/final%203/final-project-admas/frontend';
          if (isGhPages) {
            // Assume repo name is the first path segment
            const segs = window.location.pathname.split('/').filter(Boolean);
            const repo = segs.length ? segs[0] : '';
            return repo ? `${window.location.origin}/${repo}/frontend` : `${window.location.origin}/frontend`;
          }
          return `${window.location.origin}/frontend`;
        })();
        const roleRaw = (data.data.user.role || '').toLowerCase();
        const roleKey = roleRaw.replace(/[\s_-]+/g, '');
        const tabQuery = `?tabId=${encodeURIComponent(tabId)}`;
        let target = `${baseRoot}/clerk/index.html${tabQuery}`;
        if (roleKey === 'admin') {
          target = `${baseRoot}/dashboard/index.html${tabQuery}`;
        } else if (roleKey === 'departmenthead' || roleKey === 'depthead') {
          target = `${baseRoot}/dept-head/index.html${tabQuery}`;
        }

        setTimeout(() => { window.location.assign(target); }, 500);
      } else {
        const errMsg = data && data.error ? data.error : 'Invalid credentials or server error.';
        msg.style.color = '#b91c1c';
        msg.textContent = errMsg;
      }
    } catch (err) {
      console.error('Login request failed', err);
      msg.style.color = '#b91c1c';
      msg.textContent = `Network error. Is the backend running at ${apiBase}? (${err.message || err})`;
    }
  });
});



