// Stub: login.js moved to /login/login.js
// If this file is loaded directly, redirect to the canonical login page.
console.warn('frontend/login.js is a stub; the real login files live under /frontend/login/');
if (typeof window !== 'undefined') {
  try {
    if (window.location.pathname.endsWith('/login.js') || window.location.pathname.endsWith('/frontend/login.js')) {
      window.location.href = './login/';
    }
  } catch (e) {
    // ignore
  }
}
