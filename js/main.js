(() => {
  "use strict";

  const root = document.documentElement;
  const themeButton = document.querySelector(".theme-toggle");
  const menuButton = document.querySelector(".menu-toggle");
  const navigation = document.querySelector(".site-nav");
  const navigationLinks = [...document.querySelectorAll('.site-nav a[href^="#"]')];
  const revealItems = [...document.querySelectorAll(".reveal")];
  const contactForm = document.querySelector(".contact-form");
  const submitButton = contactForm?.querySelector('button[type="submit"]');
  const mobileNavigationQuery = typeof window.matchMedia === "function"
    ? window.matchMedia("(max-width: 960px)")
    : null;
  const colorSchemeQuery = typeof window.matchMedia === "function"
    ? window.matchMedia("(prefers-color-scheme: dark)")
    : null;

  const readSavedTheme = () => {
    try {
      const savedTheme = localStorage.getItem("portfolio-theme");
      return savedTheme === "dark" || savedTheme === "light" ? savedTheme : null;
    } catch {
      return null;
    }
  };

  const saveTheme = (theme) => {
    try {
      localStorage.setItem("portfolio-theme", theme);
    } catch {
      // The selected theme still applies to the current page.
    }
  };

  const updateThemeButton = (theme) => {
    if (!themeButton) return;

    const darkThemeActive = theme === "dark";
    const label = darkThemeActive ? "Switch to light theme" : "Switch to dark theme";
    themeButton.setAttribute("aria-label", label);
    themeButton.title = label;

    const icon = themeButton.querySelector("span");
    if (icon) icon.textContent = darkThemeActive ? "☀" : "☾";
  };

  const applyTheme = (theme, persist = false) => {
    root.dataset.theme = theme;
    updateThemeButton(theme);

    const themeColor = document.querySelector('meta[name="theme-color"]');
    if (themeColor) themeColor.setAttribute("content", theme === "dark" ? "#0c1815" : "#075d45");
    if (persist) saveTheme(theme);
  };

  const initialTheme = root.dataset.theme === "dark" ? "dark" : "light";
  applyTheme(initialTheme);

  themeButton?.addEventListener("click", () => {
    applyTheme(root.dataset.theme === "dark" ? "light" : "dark", true);
  });

  if (!readSavedTheme() && colorSchemeQuery) {
    const handleColorSchemeChange = (event) => {
      if (!readSavedTheme()) applyTheme(event.matches ? "dark" : "light");
    };

    if (typeof colorSchemeQuery.addEventListener === "function") {
      colorSchemeQuery.addEventListener("change", handleColorSchemeChange);
    } else if (typeof colorSchemeQuery.addListener === "function") {
      colorSchemeQuery.addListener(handleColorSchemeChange);
    }
  }

  const closeMenu = ({ returnFocus = false } = {}) => {
    if (!menuButton || !navigation) return;

    const wasOpen = navigation.classList.contains("is-open");
    menuButton.setAttribute("aria-expanded", "false");
    menuButton.setAttribute("aria-label", "Open navigation");
    navigation.classList.remove("is-open");

    if (wasOpen && returnFocus) menuButton.focus();
  };

  menuButton?.addEventListener("click", () => {
    if (!navigation) return;

    const willOpen = menuButton.getAttribute("aria-expanded") !== "true";
    menuButton.setAttribute("aria-expanded", String(willOpen));
    menuButton.setAttribute("aria-label", willOpen ? "Close navigation" : "Open navigation");
    navigation.classList.toggle("is-open", willOpen);
  });

  navigationLinks.forEach((link) => {
    link.addEventListener("click", () => closeMenu());
  });

  document.addEventListener("click", (event) => {
    if (!navigation?.classList.contains("is-open")) return;
    if (!navigation.contains(event.target) && !menuButton?.contains(event.target)) closeMenu();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeMenu({ returnFocus: true });
  });

  const handleNavigationBreakpoint = (event) => {
    if (!event.matches) closeMenu();
  };

  if (mobileNavigationQuery) {
    if (typeof mobileNavigationQuery.addEventListener === "function") {
      mobileNavigationQuery.addEventListener("change", handleNavigationBreakpoint);
    } else if (typeof mobileNavigationQuery.addListener === "function") {
      mobileNavigationQuery.addListener(handleNavigationBreakpoint);
    }
  }

  if ("IntersectionObserver" in window && revealItems.length) {
    root.classList.add("reveal-enabled");

    const revealObserver = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.08, rootMargin: "0px 0px -28px" }
    );

    revealItems.forEach((item) => revealObserver.observe(item));

    window.setTimeout(() => {
      revealItems.forEach((item) => item.classList.add("is-visible"));
    }, 2200);
  } else {
    revealItems.forEach((item) => item.classList.add("is-visible"));
  }

  const sections = navigationLinks
    .map((link) => document.querySelector(link.getAttribute("href")))
    .filter(Boolean);

  const setActiveNavigation = (activeId) => {
    navigationLinks.forEach((link) => {
      const active = link.getAttribute("href") === activeId;
      link.classList.toggle("is-active", active);
      if (active) {
        link.setAttribute("aria-current", "location");
      } else {
        link.removeAttribute("aria-current");
      }
    });
  };

  if ("IntersectionObserver" in window && sections.length) {
    const sectionObserver = new IntersectionObserver(
      (entries) => {
        const visibleSections = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

        if (visibleSections.length) setActiveNavigation(`#${visibleSections[0].target.id}`);
      },
      { rootMargin: "-28% 0px -60%", threshold: [0, 0.2, 0.5, 0.8] }
    );

    sections.forEach((section) => sectionObserver.observe(section));
  }

  let submitResetTimer;

  const resetSubmitButton = () => {
    if (!submitButton) return;
    window.clearTimeout(submitResetTimer);
    submitButton.disabled = false;
    submitButton.textContent = submitButton.dataset.defaultLabel || "Send message";
  };

  contactForm?.addEventListener("submit", () => {
    if (!submitButton) return;
    submitButton.disabled = true;
    submitButton.textContent = "Sending…";
    submitResetTimer = window.setTimeout(resetSubmitButton, 12000);
  });

  window.addEventListener("pageshow", () => {
    revealItems.forEach((item) => item.classList.add("is-visible"));
    resetSubmitButton();
  });

  const year = document.querySelector("#current-year");
  if (year) year.textContent = String(new Date().getFullYear());
})();
