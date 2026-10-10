(() => {
  'use strict';

  const panel = document.getElementById('portfolio-panel');
  const closeButton = document.getElementById('portfolio-close');
  const sections = [...document.querySelectorAll('[data-journal-section]')];
  if (!panel || !closeButton || sections.length !== 6) return;

  const navLinks = [...panel.querySelectorAll('.journal-nav a')];
  const focusableSelector = 'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), summary, [tabindex="0"]';
  let isOpen = false;
  let returnFocus = null;
  let inertBranches = [];
  let lastRoute = null;

  function fragment() {
    try { return decodeURIComponent(location.hash.slice(1)); } catch { return ''; }
  }

  function resolveTarget(id) {
    const target = document.getElementById(id);
    if (!target || !panel.contains(target)) return null;
    const section = target.closest('[data-journal-section]');
    return section ? { target, section } : null;
  }

  function setOutsideInert(disabled) {
    if (!disabled) {
      inertBranches.forEach(({ element, inert }) => { element.inert = inert; });
      inertBranches = [];
      return;
    }
    // Works whether the journal is a body child or lives within main.
    let branch = panel;
    while (branch.parentElement) {
      const parent = branch.parentElement;
      for (const element of parent.children) {
        if (element === branch || ['SCRIPT', 'STYLE', 'LINK'].includes(element.tagName)) continue;
        inertBranches.push({ element, inert: element.inert });
        element.inert = true;
      }
      if (parent === document.body) break;
      branch = parent;
    }
  }

  function publishVisibility(open) {
    window.dispatchEvent(new CustomEvent('portfolio:visibility', { detail: { open } }));
  }

  function open(id, { focus = true } = {}) {
    const destination = resolveTarget(id);
    if (!destination) return false;
    const { target, section } = destination;
    if (!isOpen) {
      returnFocus = document.activeElement;
      isOpen = true;
      panel.hidden = false;
      panel.setAttribute('role', 'dialog');
      panel.setAttribute('aria-modal', 'true');
      document.body.classList.add('portfolio-open');
      setOutsideInert(true);
      publishVisibility(true);
    }
    sections.forEach(item => { item.hidden = item !== section; });
    navLinks.forEach(link => {
      if (link.getAttribute('href') === `#${section.id}`) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
    let detail = target.closest('details');
    while (detail && panel.contains(detail)) {
      detail.open = true;
      detail = detail.parentElement.closest('details');
    }
    panel.scrollTop = 0;
    if (target !== section) {
      const bounds = target.getBoundingClientRect();
      const headerHeight = panel.querySelector('.journal-header').getBoundingClientRect().height;
      panel.scrollTop = Math.max(0, bounds.top - panel.getBoundingClientRect().top - headerHeight - 20);
    }
    if (focus) {
      const focusTarget = target.matches('details') ? target.querySelector('summary') : target.matches('h2, h3, h4, summary') ? target : target.querySelector('h2, h3, h4') || target;
      if (!focusTarget.matches('summary')) focusTarget.setAttribute('tabindex', '-1');
      focusTarget.focus({ preventScroll: true });
    }
    lastRoute = id;
    return true;
  }

  function close({ updateHistory = false, restoreFocus = true } = {}) {
    if (!isOpen) return;
    isOpen = false;
    panel.hidden = true;
    panel.removeAttribute('role');
    panel.removeAttribute('aria-modal');
    document.body.classList.remove('portfolio-open');
    setOutsideInert(false);
    if (updateHistory) {
      history.pushState(null, '', '#top');
      lastRoute = 'top';
    }
    publishVisibility(false);
    if (restoreFocus && returnFocus?.isConnected && returnFocus !== document.body) returnFocus.focus({ preventScroll: true });
    else if (restoreFocus) document.querySelector('a[href="#profile"], a[href="#work"]')?.focus({ preventScroll: true });
  }

  function route({ initial = false } = {}) {
    const id = fragment();
    if (id === lastRoute && !initial) return;
    if (!open(id, { focus: !initial })) {
      close();
      lastRoute = id;
    }
  }

  document.addEventListener('click', event => {
    const link = event.target.closest?.('a[href^="#"]');
    if (!link || event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
    let id;
    try { id = decodeURIComponent(link.getAttribute('href').slice(1)); } catch { return; }
    if (!resolveTarget(id)) return;
    event.preventDefault();
    if (location.hash !== `#${id}`) history.pushState(null, '', `#${id}`);
    open(id);
  });

  closeButton.addEventListener('click', () => close({ updateHistory: true }));
  document.addEventListener('keydown', event => {
    if (!isOpen) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      close({ updateHistory: true });
    } else if (event.key === 'Tab') {
      const focusable = [...panel.querySelectorAll(focusableSelector)].filter(element => element.getClientRects().length && !element.closest('[hidden]'));
      const first = focusable[0];
      const last = focusable.at(-1);
      const active = document.activeElement;
      if (!first) { event.preventDefault(); return; }
      if (event.shiftKey && (active === first || !focusable.includes(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || !focusable.includes(active))) {
        event.preventDefault();
        first.focus();
      }
    }
  });

  window.addEventListener('portfolio:open', event => {
    const id = typeof event.detail?.id === 'string' ? event.detail.id.replace(/^#/, '') : 'profile';
    if (!resolveTarget(id)) return;
    if (location.hash !== `#${id}`) history.pushState(null, '', `#${id}`);
    open(id);
  });
  window.addEventListener('hashchange', () => route());
  window.addEventListener('popstate', () => route());

  // Native POST navigation preserves Airform's delivery and response contract.
  const form = panel.querySelector('.journal-form');
  const submit = form?.querySelector('[type="submit"]');
  let submitTimer;
  const resetSubmit = () => {
    clearTimeout(submitTimer);
    if (submit) { submit.disabled = false; submit.textContent = 'Send message ↗'; }
  };
  form?.addEventListener('submit', () => {
    submit.disabled = true;
    submit.textContent = 'Opening Airform…';
    submitTimer = setTimeout(resetSubmit, 12000);
  });
  window.addEventListener('pageshow', resetSubmit);

  let printState = null;
  window.addEventListener('beforeprint', () => {
    printState = [...panel.querySelectorAll('details')].map(element => ({ element, open: element.open }));
    printState.forEach(({ element }) => { element.open = true; });
  });
  window.addEventListener('afterprint', () => {
    printState?.forEach(({ element, open: wasOpen }) => { element.open = wasOpen; });
    printState = null;
  });

  document.documentElement.classList.add('dossier-ready');
  panel.hidden = true;
  route({ initial: true });
})();
