(function () {
  var ASSET = "../assets/";

  function ensureCss() {
    // Lessons written from the old template carry an inline <style>; drop it so site.css wins.
    document.querySelectorAll("head style").forEach(function (s) { s.remove(); });
    if (document.querySelector('link[href*="assets/site.css"]')) return;
    var link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = ASSET + "site.css";
    document.head.appendChild(link);
  }

  function ensureScript(name) {
    if (document.querySelector('script[src$="' + name + '"]')) return Promise.resolve();
    return new Promise(function (resolve) {
      var script = document.createElement("script");
      script.src = ASSET + name;
      script.onload = function () { resolve(); };
      script.onerror = function () { resolve(); };
      document.head.appendChild(script);
    });
  }

  function ensureTopbar() {
    if (document.querySelector(".topbar")) return;
    var bar = document.createElement("header");
    bar.className = "topbar";
    var brand = document.createElement("a");
    brand.className = "brand";
    brand.href = "../index.html";
    brand.innerHTML = "英語の10分<small>一覧へ</small>";
    var actions = document.createElement("div");
    actions.className = "topbar-actions";
    var theme = document.createElement("button");
    theme.type = "button";
    theme.className = "icon-btn";
    theme.setAttribute("data-theme-toggle", "");
    theme.textContent = "ダーク";
    theme.setAttribute("aria-label", "ダーク表示にする");
    actions.appendChild(theme);
    bar.append(brand, actions);
    document.body.insertBefore(bar, document.body.firstChild);
  }

  function boot() {
  document.body.classList.add("lesson");
  ensureCss();
  ensureTopbar();
  if (window.DETheme) DETheme.paint();

  var main = document.querySelector("main");
  if (!main) return;

  function lessonDate() {
    var match = location.pathname.match(/(\d{4}-\d{2}-\d{2})/);
    return match ? match[1] : "";
  }

  function formatDate(iso) {
    var parts = iso.split("-");
    return Number(parts[1]) + "月" + Number(parts[2]) + "日";
  }

  function tabLabel(heading) {
    var clone = heading.cloneNode(true);
    clone.querySelectorAll("button").forEach(function (btn) { btn.remove(); });
    var raw = clone.textContent.replace(/\s+/g, " ").trim();
    var cleaned = raw.replace(/^\d+\.\s*/, "");
    var pairs = [
      [/流れ/, "流れ"],
      [/聞く|短文/, "聞く"],
      [/チャンク|単語|意味/, "意味"],
      [/音読|口に/, "音読"],
      [/シャドー/, "シャドー"],
      [/英作文/, "作文"],
      [/クイズ/, "クイズ"]
    ];
    for (var i = 0; i < pairs.length; i++) {
      if (pairs[i][0].test(cleaned)) return pairs[i][1];
    }
    return cleaned.slice(0, 8) || "項目";
  }

  function upgradeReveals() {
    document.querySelectorAll("[data-toggle]").forEach(function (btn) {
      var target = document.querySelector(btn.getAttribute("data-toggle"));
      if (!target || target.closest("details.reveal")) return;
      var details = document.createElement("details");
      details.className = "reveal";
      var summary = document.createElement("summary");
      summary.textContent = "日本語を見る";
      var body = document.createElement("div");
      body.className = "hint";
      body.innerHTML = target.innerHTML;
      details.append(summary, body);
      var holder = btn.parentElement;
      if (holder && holder.tagName === "P" && holder.querySelectorAll("button").length === 1) holder.replaceWith(details);
      else btn.replaceWith(details);
      target.remove();
    });

    document.querySelectorAll("[data-reveal]").forEach(function (btn) {
      var box = btn.closest(".prompt");
      var model = box && box.querySelector(".model");
      if (!model || model.closest("details.reveal")) return;
      var details = document.createElement("details");
      details.className = "reveal";
      var summary = document.createElement("summary");
      summary.textContent = "英語を見る";
      details.append(summary, model);
      btn.replaceWith(details);
    });
  }

  function buildTabs() {
    var sections = Array.prototype.slice.call(main.querySelectorAll(":scope > section"));
    if (!sections.length) return;
    var tabs = document.createElement("div");
    tabs.className = "tabs";
    tabs.setAttribute("role", "tablist");
    tabs.setAttribute("aria-label", "レッスンの手順");

    var labels = sections.map(function (section) {
      var heading = section.querySelector("h2");
      return heading ? tabLabel(heading) : "項目";
    });

    var prefer = labels.findIndex(function (label) { return label === "聞く"; });
    if (prefer < 0) prefer = 0;
    var stored = null;
    try { stored = sessionStorage.getItem("de.tab." + lessonDate()); } catch (e) {}
    var initial = stored == null ? prefer : Number(stored);
    if (!sections[initial]) initial = prefer;

    function select(index) {
      sections.forEach(function (section, i) {
        var on = i === index;
        section.hidden = !on;
        var tab = tabs.children[i];
        tab.setAttribute("aria-selected", on ? "true" : "false");
        tab.tabIndex = on ? 0 : -1;
      });
      try { sessionStorage.setItem("de.tab." + lessonDate(), String(index)); } catch (e) {}
    }

    sections.forEach(function (section, i) {
      var tab = document.createElement("button");
      tab.type = "button";
      tab.setAttribute("role", "tab");
      tab.id = "tab-" + i;
      tab.setAttribute("aria-controls", "panel-" + i);
      tab.textContent = labels[i];
      section.setAttribute("role", "tabpanel");
      section.id = "panel-" + i;
      section.setAttribute("aria-labelledby", tab.id);
      tab.addEventListener("click", function () { select(i); });
      tabs.appendChild(tab);
    });

    var header = main.querySelector("header");
    if (header) header.insertAdjacentElement("afterend", tabs);
    else main.insertBefore(tabs, sections[0]);
    select(initial);
  }

  function markDate() {
    var date = lessonDate();
    var kicker = document.querySelector(".kicker");
    if (!date || !kicker || kicker.querySelector(".date-chip")) return;
    var chip = document.createElement("span");
    chip.className = "date-chip";
    chip.textContent = formatDate(date);
    kicker.appendChild(chip);
  }

  function wireProgress() {
    if (!window.DEProgress) return;
    var date = lessonDate();
    if (!date) return;
    var actions = document.querySelector(".topbar-actions");
    if (!actions) return;

    var complete = document.createElement("button");
    complete.type = "button";
    complete.className = "btn";
    complete.setAttribute("data-complete", "");

    function sync() {
      var done = DEProgress.isDone(date);
      complete.setAttribute("aria-pressed", done ? "true" : "false");
      complete.textContent = done ? "完了済み" : "完了にする";
    }

    complete.addEventListener("click", function () {
      var next = complete.getAttribute("aria-pressed") !== "true";
      DEProgress.setDone(date, next);
      sync();
    });
    sync();
    actions.insertBefore(complete, actions.firstChild);

    var footer = document.querySelector("footer");
    if (!footer) return;
    var row = document.createElement("div");
    row.className = "foot-actions";
    var restart = document.createElement("button");
    restart.type = "button";
    restart.className = "btn ghost";

    function syncRestart() {
      var state = DEProgress.read();
      var here = state.restart === date;
      restart.textContent = here ? "ここが起点です" : "ここを起点にする";
      restart.setAttribute("aria-pressed", here ? "true" : "false");
    }

    restart.addEventListener("click", function () {
      var state = DEProgress.read();
      if (state.restart === date) DEProgress.setRestart(null);
      else DEProgress.setRestart(date);
      syncRestart();
    });
    syncRestart();
    row.appendChild(restart);
    var note = document.createElement("p");
    note.className = "fine";
    note.textContent = "完了と起点は、このブラウザにだけ残ります。";
    footer.prepend(note);
    footer.prepend(row);
  }

  function wirePager() {
    var footer = document.querySelector("footer");
    if (!footer) return;
    var file = location.pathname.split("/").pop();
    fetch("../index.html", { credentials: "same-origin" }).then(function (res) {
      if (!res.ok) return null;
      return res.text();
    }).then(function (html) {
      if (!html) return;
      var doc = new DOMParser().parseFromString(html, "text/html");
      var links = [];
      var today = doc.querySelector("a.today");
      if (today) links.push(today);
      doc.querySelectorAll("#arch a").forEach(function (link) { links.push(link); });
      var index = -1;
      links.forEach(function (link, i) {
        var href = link.getAttribute("href") || "";
        if (href.endsWith(file)) index = i;
      });
      if (index < 0) return;
      var nav = document.createElement("nav");
      nav.className = "pager";
      nav.setAttribute("aria-label", "前後のレッスン");
      function add(link, caption) {
        if (!link) return;
        var a = document.createElement("a");
        var href = link.getAttribute("href") || "";
        a.href = href.replace(/^lessons\//, "");
        var small = document.createElement("small");
        small.textContent = caption;
        var title = document.createElement("span");
        title.className = "jump";
        var strong = link.querySelector("strong");
        title.textContent = strong ? strong.textContent.trim() : link.textContent.replace(/\s+/g, " ").replace(/\d+\/\d+\s*$/, "").trim();
        a.append(small, title);
        nav.appendChild(a);
      }
      add(links[index - 1], "新しい日");
      add(links[index + 1], "ひとつ前");
      if (nav.childElementCount) footer.appendChild(nav);
    }).catch(function () {});
  }

  var title = document.querySelector("main h1");
  if (title && !title.getAttribute("lang")) title.setAttribute("lang", "en");

  document.querySelectorAll(".passage, .en-line, .speak-line span").forEach(function (el) {
    if (!el.getAttribute("lang")) el.setAttribute("lang", "en");
  });

  upgradeReveals();
  buildTabs();
  markDate();
  wireProgress();
  wirePager();
  }

  Promise.all([ensureScript("progress.js"), ensureScript("theme.js")]).then(boot);
})();
