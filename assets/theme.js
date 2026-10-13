(function (global) {
  var KEY = "de.theme";
  var media = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;

  function explicit() {
    try {
      var stored = localStorage.getItem(KEY);
      if (stored === "light" || stored === "dark") return stored;
    } catch (e) {}
    return null;
  }

  function current() {
    return explicit() || ((media && media.matches) ? "dark" : "light");
  }

  function paint() {
    var mode = explicit();
    var root = document.documentElement;
    if (mode) root.setAttribute("data-theme", mode);
    else root.removeAttribute("data-theme");
    var shown = current();
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", shown === "dark" ? "#12110e" : "#f3ecdf");
    document.querySelectorAll("[data-theme-toggle]").forEach(function (btn) {
      var next = shown === "dark" ? "ライト" : "ダーク";
      btn.textContent = next;
      btn.setAttribute("aria-label", next + "表示にする");
    });
  }

  function toggle() {
    var next = current() === "dark" ? "light" : "dark";
    try { localStorage.setItem(KEY, next); } catch (e) {}
    paint();
  }

  document.addEventListener("click", function (event) {
    var btn = event.target.closest && event.target.closest("[data-theme-toggle]");
    if (!btn) return;
    event.preventDefault();
    toggle();
  });

  if (media && media.addEventListener) {
    media.addEventListener("change", function () {
      if (!explicit()) paint();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", paint);
  } else {
    paint();
  }

  global.DETheme = { current: current, paint: paint, toggle: toggle };
})(window);
