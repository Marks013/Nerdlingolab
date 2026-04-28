(function () {
  try {
    var isAdminRoute = window.location.pathname.indexOf("/admin") === 0;
    var legacyThemeKey = "nerdlingolab-theme";
    var adminThemeKey = "nerdlingolab-admin-theme";
    var legacyTheme = window.localStorage.getItem(legacyThemeKey);
    var storedTheme = isAdminRoute ? window.localStorage.getItem(adminThemeKey) || legacyTheme : null;
    var theme = storedTheme === "dark" ? "dark" : "light";
    var root = document.documentElement;

    if (isAdminRoute && legacyTheme && !window.localStorage.getItem(adminThemeKey)) {
      window.localStorage.setItem(adminThemeKey, theme);
    }

    window.localStorage.removeItem(legacyThemeKey);

    root.classList.toggle("light", theme === "light");
    root.classList.toggle("dark", isAdminRoute && theme === "dark");
    root.dataset.theme = theme;
    root.dataset.themeScope = isAdminRoute ? "admin" : "shop";
    root.style.colorScheme = isAdminRoute && theme === "dark" ? "dark" : "light";

    var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function bootMotion() {
      root.classList.add("nl-motion-ready");

      if (reduceMotion) {
        return;
      }

      var lastMove = 0;
      document.addEventListener(
        "pointermove",
        function (event) {
          var now = Date.now();

          if (now - lastMove < 80) {
            return;
          }

          lastMove = now;
          root.style.setProperty("--pointer-x", event.clientX + "px");
          root.style.setProperty("--pointer-y", event.clientY + "px");
        },
        { passive: true }
      );

      document.addEventListener(
        "pointerdown",
        function (event) {
          var target = event.target && event.target.closest ? event.target.closest("a, button") : null;

          if (!target) {
            return;
          }

          target.classList.remove("nl-tap");
          void target.offsetWidth;
          target.classList.add("nl-tap");
        },
        { passive: true }
      );
    }

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", bootMotion, { once: true });
    } else {
      bootMotion();
    }
  } catch (_error) {
    document.documentElement.classList.add("light");
    document.documentElement.style.colorScheme = "light";
  }
})();
