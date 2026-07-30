(() => {
  "use strict";

  const root = document.documentElement;
  const themeButton = document.querySelector(".theme-toggle");
  const menuButton = document.querySelector(".menu-toggle");
  const navigation = document.querySelector(".site-nav");
  const navigationLinks = [...document.querySelectorAll('.site-nav a[href^="#"]')];
  const revealItems = [...document.querySelectorAll(".reveal")];

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
      // Theme selection still works for the current page when storage is unavailable.
    }
  };

  const updateThemeButton = (theme) => {
    if (!themeButton) return;

    const darkThemeActive = theme === "dark";
    themeButton.setAttribute("aria-label", darkThemeActive ? "Switch to light theme" : "Switch to dark theme");
    themeButton.title = darkThemeActive ? "Switch to light theme" : "Switch to dark theme";

    const icon = themeButton.querySelector("span");
    if (icon) icon.textContent = darkThemeActive ? "☀" : "☾";
  };

  const applyTheme = (theme, persist = false) => {
    root.dataset.theme = theme;
    updateThemeButton(theme);
    if (persist) saveTheme(theme);
  };

  const savedTheme = readSavedTheme();
  const colorSchemeQuery = typeof window.matchMedia === "function"
    ? window.matchMedia("(prefers-color-scheme: dark)")
    : null;
  const systemPrefersDark = colorSchemeQuery?.matches === true;
  applyTheme(savedTheme || (systemPrefersDark ? "dark" : "light"));

  themeButton?.addEventListener("click", () => {
    applyTheme(root.dataset.theme === "dark" ? "light" : "dark", true);
  });

  if (!savedTheme && colorSchemeQuery) {
    const handleColorSchemeChange = (event) => {
      if (!readSavedTheme()) applyTheme(event.matches ? "dark" : "light");
    };

    if (typeof colorSchemeQuery.addEventListener === "function") {
      colorSchemeQuery.addEventListener("change", handleColorSchemeChange);
    } else if (typeof colorSchemeQuery.addListener === "function") {
      colorSchemeQuery.addListener(handleColorSchemeChange);
    }
  }

  const closeMenu = () => {
    if (!menuButton || !navigation) return;
    menuButton.setAttribute("aria-expanded", "false");
    menuButton.setAttribute("aria-label", "Open navigation");
    navigation.classList.remove("is-open");
  };

  menuButton?.addEventListener("click", () => {
    if (!navigation) return;
    const willOpen = menuButton.getAttribute("aria-expanded") !== "true";
    menuButton.setAttribute("aria-expanded", String(willOpen));
    menuButton.setAttribute("aria-label", willOpen ? "Close navigation" : "Open navigation");
    navigation.classList.toggle("is-open", willOpen);
  });

  navigationLinks.forEach((link) => link.addEventListener("click", closeMenu));

  document.addEventListener("click", (event) => {
    if (!navigation?.classList.contains("is-open")) return;
    if (!navigation.contains(event.target) && !menuButton?.contains(event.target)) closeMenu();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeMenu();
      menuButton?.focus();
    }
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 860) closeMenu();
  });

  if ("IntersectionObserver" in window) {
    const revealObserver = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px" }
    );

    revealItems.forEach((item) => revealObserver.observe(item));
  } else {
    revealItems.forEach((item) => item.classList.add("is-visible"));
  }

  const sections = navigationLinks
    .map((link) => document.querySelector(link.getAttribute("href")))
    .filter(Boolean);

  if ("IntersectionObserver" in window && sections.length) {
    const sectionObserver = new IntersectionObserver(
      (entries) => {
        const visibleSections = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

        if (!visibleSections.length) return;

        const activeId = `#${visibleSections[0].target.id}`;
        navigationLinks.forEach((link) => {
          link.classList.toggle("is-active", link.getAttribute("href") === activeId);
        });
      },
      { rootMargin: "-30% 0px -58%", threshold: [0, 0.2, 0.5, 0.8] }
    );

    sections.forEach((section) => sectionObserver.observe(section));
  }

  const year = document.querySelector("#current-year");
  if (year) year.textContent = String(new Date().getFullYear());
})();
