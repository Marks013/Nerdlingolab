(function () {
  try {
    var storedTheme = window.localStorage.getItem("nerdlingolab-theme");
    var theme = storedTheme || "light";
    var root = document.documentElement;

    root.classList.toggle("light", theme === "light");
    root.classList.toggle("dark", theme !== "light");
    root.style.colorScheme = theme === "light" ? "light" : "dark";
  } catch (_error) {
    document.documentElement.classList.add("light");
    document.documentElement.style.colorScheme = "light";
  }
})();
