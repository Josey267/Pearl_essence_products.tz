/* Pearl Essence admin - session guard.
   Load synchronously in <head> BEFORE any dashboard UI so unauthenticated users are
   redirected to login.html and never see dashboard content.
   The session format matches login.html (localStorage "pe_admin_auth", 8 hour lifetime).
   NOTE: this is a client-side gate only. Real protection needs server-side auth
   (e.g. Firebase Auth / Supabase) plus matching database security rules. */
(function () {
  'use strict';

  var AUTH_KEY = 'pe_admin_auth';
  var ADMIN_CODE = 'PEARL2024'; // must match login.html until auth moves server-side
  var MAX_AGE_MS = 8 * 60 * 60 * 1000;
  var LOGIN_URL = 'login.html';

  function readSession() {
    try {
      return JSON.parse(localStorage.getItem(AUTH_KEY));
    } catch (e) {
      return null;
    }
  }

  function getSession() {
    var s = readSession();
    if (!s || typeof s.timestamp !== 'number' || s.code !== ADMIN_CODE) return null;
    if (Date.now() - s.timestamp >= MAX_AGE_MS) return null;
    return { startedAt: s.timestamp, expiresAt: s.timestamp + MAX_AGE_MS };
  }

  function clearSession() {
    try { localStorage.removeItem(AUTH_KEY); } catch (e) { /* storage unavailable */ }
  }

  function redirectToLogin() {
    clearSession();
    window.location.replace(LOGIN_URL);
  }

  function requireAuth() {
    if (getSession()) return true;
    redirectToLogin();
    return false;
  }

  window.PearlAdminAuth = {
    getSession: getSession,
    isAuthenticated: function () { return !!getSession(); },
    requireAuth: requireAuth,
    logout: redirectToLogin
  };

  // Hidden (see admin.css) until the session is confirmed
  var root = document.documentElement;
  root.classList.add('auth-pending');
  if (requireAuth()) root.classList.remove('auth-pending');

  // Re-check while the page stays open: timer, tab refocus, and sign-out in another tab
  setInterval(requireAuth, 60 * 1000);
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) requireAuth();
  });
  window.addEventListener('storage', function (e) {
    if (e.key === AUTH_KEY || e.key === null) requireAuth();
  });
})();
