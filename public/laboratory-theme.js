/* First-party, pre-paint theme initialization for the editorial laboratory site. */
(() => {
  'use strict';
  const key = 'devonakins.appearance.v1';
  const root = document.documentElement;
  const system = window.matchMedia('(prefers-color-scheme: dark)');
  const valid = value => value === 'system' || value === 'light' || value === 'dark';
  function readPreference() {
    try {
      const saved = window.localStorage.getItem(key);
      return valid(saved) ? saved : 'system';
    } catch {
      return 'system';
    }
  }
  let preference = readPreference();

  function apply() {
    const mode = preference === 'system' ? (system.matches ? 'dark' : 'light') : preference;
    root.dataset.theme = mode;
    root.dataset.themePreference = preference;
    const themeColor = document.querySelector('meta[name="theme-color"]');
    if (themeColor) themeColor.setAttribute('content', root.hasAttribute('data-cal-rook') ? (mode === 'dark' ? '#171B18' : '#F4EBDD') : (mode === 'dark' ? '#0c111a' : '#f3f1e9'));
    document.querySelectorAll('[data-lab-theme-select]').forEach(control => {
      if (control.value !== preference) control.value = preference;
    });
  }
  function setPreference(value) {
    if (!valid(value)) return;
    preference = value;
    try {
      if (value === 'system') window.localStorage.removeItem(key);
      else window.localStorage.setItem(key, value);
    } catch {
      // The current page still honors the choice when storage is blocked.
    }
    apply();
  }
  function bindControls() {
    document.querySelectorAll('[data-lab-theme-select]').forEach(control => {
      control.addEventListener('change', () => setPreference(control.value));
    });
    apply();
  }
  const onSystemChange = () => { if (preference === 'system') apply(); };
  if (typeof system.addEventListener === 'function') system.addEventListener('change', onSystemChange);
  else if (typeof system.addListener === 'function') system.addListener(onSystemChange);
  window.addEventListener('storage', event => {
    if (event.key === key || event.key === null) {
      preference = readPreference();
      apply();
    }
  });
  // Runs in <head>, before the stylesheets, to prevent a wrong-theme flash.
  apply();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindControls, { once: true });
  } else {
    bindControls();
  }
})();
