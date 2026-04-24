(function () {
  try {
    var storedTheme = window.localStorage.getItem("nerdlingolab-theme");
    var prefersLight = window.matchMedia("(prefers-color-scheme: light)").matches;
    var theme = storedTheme || (prefersLight ? "light" : "dark");
    var root = document.documentElement;

    root.classList.toggle("light", theme === "light");
    root.classList.toggle("dark", theme !== "light");
    root.style.colorScheme = theme === "light" ? "light" : "dark";
  } catch (_error) {
    document.documentElement.classList.add("dark");
    document.documentElement.style.colorScheme = "dark";
  }
})();
