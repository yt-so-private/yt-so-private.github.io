/* Public AI digest. Renders ai/news.json in the browser.
   The weekday bot rewrites only news.json. This file tolerates missing fields.
   Contract (all keys optional): generatedAt; items[]{date,title,summary,url,source};
   lineups[]{vendor,models[]{name,role,note}}; harnesses[]{name,kind,note};
   upcoming[]{what,when,note}; rankings[]{use,sourceNote,ranks[]{place,name,why}};
   benchmarks[]{name,what,caveat}. No required schema additions. */
(function () {
  const TAB_IDS = ["news", "lineups", "harnesses", "upcoming", "rankings", "benchmarks"];
  const TAB_LABELS = {
    news: "今日のニュース",
    lineups: "ラインナップ",
    harnesses: "ハーネス",
    upcoming: "予定",
    rankings: "用途",
    benchmarks: "読み方",
  };
  const ROLE_LABEL = {
    flagship: "旗艦",
    cheap: "安さ",
    code: "コード",
    multimodal: "マルチモーダル",
    open: "オープン",
    balanced: "バランス",
  };
  const ROLE_ORDER = ["flagship", "balanced", "cheap", "code", "multimodal", "open"];
  const THEME_KEY = "ai-news-theme";
  const clampWatch = [];

  const $ = (id) => document.getElementById(id);
  const el = (tag, cls) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    return n;
  };
  const tx = (n, s) => {
    n.textContent = s == null ? "" : String(s);
    return n;
  };
  function str(v) {
    if (typeof v === "string") return v.trim();
    if (typeof v === "number" && Number.isFinite(v)) return String(v);
    return "";
  }
  function list(v) {
    return Array.isArray(v) ? v.filter((x) => x && typeof x === "object") : [];
  }
  function chars(s) {
    return Array.from(s).length;
  }

  function safeUrl(u) {
    if (!u || !/^https?:\/\//i.test(u)) return "";
    try {
      const x = new URL(u);
      if (x.protocol === "http:" || x.protocol === "https:") return x.href;
    } catch (e) {}
    return "";
  }

  function chevron() {
    const c = el("span", "chev");
    c.setAttribute("aria-hidden", "true");
    return c;
  }

  function fold(label, body) {
    const det = el("details", "fold");
    const sm = el("summary");
    sm.append(chevron(), document.createTextNode(label));
    const p = el("p", "note");
    tx(p, body);
    det.append(sm, p);
    return det;
  }

  function chip(text, role) {
    const s = el("span", "chip");
    if (role && ROLE_LABEL[role]) s.dataset.role = role;
    const dot = el("span", "dot");
    dot.setAttribute("aria-hidden", "true");
    s.append(dot, document.createTextNode(text));
    return s;
  }

  function linkOut(href, label) {
    const a = el("a", "more");
    a.href = href;
    a.rel = "noopener noreferrer";
    a.target = "_blank";
    a.referrerPolicy = "no-referrer";
    tx(a, label);
    a.setAttribute("aria-label", label + "（外部のサイトを開きます）");
    return a;
  }

  function empty(message) {
    return tx(el("p", "empty"), message);
  }

  function heading(text) {
    return tx(el("h2", "sr-only"), text);
  }

  function noteLine(text) {
    return tx(el("p", "panel-note"), text);
  }

  function parseDay(s) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || "");
    if (!m) return null;
    const y = +m[1];
    const mo = +m[2];
    const d = +m[3];
    const dt = new Date(Date.UTC(y, mo - 1, d));
    if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return null;
    return { y: y, mo: mo, d: d, wd: "日月火水木金土"[dt.getUTCDay()] };
  }

  function formatDay(s, withYear) {
    const p = parseDay(s);
    if (!p) return s || "";
    const core = p.mo + "月" + p.d + "日（" + p.wd + "）";
    return withYear ? p.y + "年" + core : core;
  }

  function formatGenerated(iso) {
    const t = new Date(iso);
    if (Number.isNaN(t.getTime())) return "";
    const parts = new Intl.DateTimeFormat("ja-JP", {
      timeZone: "Asia/Tokyo",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).formatToParts(t);
    const get = (type) => {
      const hit = parts.find((p) => p.type === type);
      return hit ? hit.value : "";
    };
    return get("month") + "月" + get("day") + "日（" + get("weekday") + "）" + get("hour") + ":" + get("minute") + " 更新";
  }

  function generatedYear(iso) {
    const t = new Date(iso);
    if (Number.isNaN(t.getTime())) return null;
    const y = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Tokyo", year: "numeric" }).format(t);
    return +y;
  }

  function isClamped(node) {
    if (!node.getClientRects().length) return null;
    const cs = getComputedStyle(node);
    const clone = node.cloneNode(true);
    clone.className = "";
    clone.style.cssText = [
      "position:absolute",
      "visibility:hidden",
      "pointer-events:none",
      "display:block",
      "overflow:visible",
      "height:auto",
      "max-height:none",
      "margin:0",
      "padding:0",
      "width:" + cs.width,
      "font:" + cs.font,
      "line-height:" + cs.lineHeight,
      "letter-spacing:" + cs.letterSpacing,
      "white-space:" + cs.whiteSpace,
      "overflow-wrap:" + cs.overflowWrap,
      "word-break:" + cs.wordBreak,
    ].join(";");
    node.parentElement.appendChild(clone);
    const extra = clone.offsetHeight - node.offsetHeight;
    clone.remove();
    return extra > 8;
  }

  function refreshClamps() {
    clampWatch.forEach((item) => {
      if (!item.clip.isConnected) return;
      const need = isClamped(item.clip);
      if (need === null) return;
      item.det.hidden = !need;
    });
  }

  function watchClamp(clip, det, text) {
    det.hidden = chars(text) < 36 && !/[\r\n]/.test(text);
    clampWatch.push({ clip: clip, det: det });
  }

  function preview(text, label) {
    const clip = el("p", "clip");
    tx(clip, text);
    const det = fold(label, text);
    det.classList.add("expands");
    watchClamp(clip, det, text);
    return { clip: clip, det: det };
  }

  function roleMix(models) {
    const counts = new Map();
    models.forEach((m) => {
      const role = str(m.role);
      if (!role) return;
      counts.set(role, (counts.get(role) || 0) + 1);
    });
    const keys = ROLE_ORDER.filter((k) => counts.has(k));
    counts.forEach((_n, k) => {
      if (keys.indexOf(k) === -1) keys.push(k);
    });
    return keys.map((k) => (ROLE_LABEL[k] || k) + " " + counts.get(k)).join(" · ");
  }

  function accordion(title, sub, count) {
    const d = el("details", "acc");
    const sm = el("summary");
    const text = el("span", "sum-text");
    text.appendChild(tx(el("span", "sum-title"), title));
    if (sub) text.appendChild(tx(el("span", "sum-sub"), sub));
    sm.append(chevron(), text);
    if (count != null) sm.appendChild(tx(el("span", "count"), String(count)));
    d.appendChild(sm);
    return d;
  }

  function cardFoot(det, href) {
    if (!det && !href) return null;
    const foot = el("div", "card-foot");
    if (det) foot.appendChild(det);
    if (href) foot.appendChild(linkOut(href, "原文"));
    return foot;
  }

  function renderNews(items, year) {
    const nodes = [heading(TAB_LABELS.news)];
    if (!items.length) {
      nodes.push(empty("今日のニュースはまだありません。"));
      return nodes;
    }
    const groups = [];
    const index = new Map();
    items.forEach((item) => {
      const key = str(item.date);
      if (!index.has(key)) {
        const g = { key: key, items: [] };
        index.set(key, g);
        groups.push(g);
      }
      index.get(key).items.push(item);
    });
    const sheet = el("div", "sheet");
    let lead = true;
    groups.forEach((g) => {
      const group = el("section", "group");
      const day = el("div", "day");
      const parsed = parseDay(g.key);
      if (parsed) {
        const time = el("time");
        time.dateTime = g.key;
        tx(time, formatDay(g.key, year == null || parsed.y !== year));
        day.appendChild(time);
      } else {
        day.appendChild(tx(el("span"), g.key ? g.key : "日付なし"));
      }
      day.appendChild(tx(el("span"), g.items.length + "件"));
      group.appendChild(day);
      g.items.forEach((item) => {
        const card = el("article", lead ? "card lead reveal" : "card reveal");
        const meta = el("div", "meta");
        const source = str(item.source);
        if (source) meta.appendChild(tx(el("span", "source"), source));
        if (lead) meta.appendChild(tx(el("span", "fresh"), "最新"));
        if (meta.childNodes.length) card.appendChild(meta);
        const h = el("h3");
        tx(h, str(item.title) || "（無題）");
        card.appendChild(h);
        const summary = str(item.summary);
        let det = null;
        if (summary) {
          const prev = preview(summary, "全文");
          card.appendChild(prev.clip);
          det = prev.det;
        }
        const foot = cardFoot(det, safeUrl(str(item.url)));
        if (foot) card.appendChild(foot);
        group.appendChild(card);
        lead = false;
      });
      sheet.appendChild(group);
    });
    nodes.push(sheet);
    return nodes;
  }

  function renderLineups(rows) {
    const nodes = [
      heading(TAB_LABELS.lineups),
      noteLine("各社を開くとモデルが出ます。メモは閉じたままです。"),
    ];
    if (!rows.length) {
      nodes.push(empty("ラインナップはまだありません。"));
      return nodes;
    }
    const stack = el("div", "stack");
    rows.forEach((v) => {
      const models = list(v.models).filter((m) => str(m.name) || str(m.role) || str(m.note));
      const name = str(v.vendor) || "（名称なし）";
      const acc = accordion(name, roleMix(models), models.length);
      const body = el("div", "acc-body");
      if (!models.length) {
        body.appendChild(tx(el("p", "quiet"), "モデルはまだありません。"));
      }
      models.forEach((m) => {
        const row = el("div", "model");
        const main = el("div", "model-main");
        const title = el("span", "model-name");
        title.translate = false;
        tx(title, str(m.name) || "（無題）");
        main.appendChild(title);
        const role = str(m.role);
        if (role) main.appendChild(chip(ROLE_LABEL[role] || role, role));
        const note = str(m.note);
        if (note) main.appendChild(fold("メモ", note));
        row.appendChild(main);
        body.appendChild(row);
      });
      acc.appendChild(body);
      stack.appendChild(acc);
    });
    nodes.push(stack);
    return nodes;
  }

  function renderHarnesses(rows) {
    const nodes = [
      heading(TAB_LABELS.harnesses),
      noteLine("モデルを包む道具です。違いは開いて読みます。"),
    ];
    if (!rows.length) {
      nodes.push(empty("ハーネスはまだありません。"));
      return nodes;
    }
    const grid = el("div", "stack split");
    rows.forEach((h) => {
      const card = el("article", "card reveal");
      const kind = str(h.kind);
      if (kind) {
        const meta = el("div", "meta");
        meta.appendChild(chip(kind));
        card.appendChild(meta);
      }
      const title = el("h3");
      tx(title, str(h.name) || "（無題）");
      card.appendChild(title);
      const note = str(h.note);
      if (note) {
        const prev = preview(note, "違い");
        card.appendChild(prev.clip);
        const foot = cardFoot(prev.det, "");
        if (foot) card.appendChild(foot);
      }
      grid.appendChild(card);
    });
    nodes.push(grid);
    return nodes;
  }

  function renderUpcoming(rows) {
    const nodes = [
      heading(TAB_LABELS.upcoming),
      noteLine("時期が動くものは、開くと補足があります。"),
    ];
    if (!rows.length) {
      nodes.push(empty("予定はまだありません。"));
      return nodes;
    }
    const timeline = el("div", "timeline");
    rows.forEach((u) => {
      const card = el("article", "card reveal");
      const when = str(u.when);
      if (when) card.appendChild(tx(el("div", "meta"), when));
      const h = el("h3");
      tx(h, str(u.what) || "（無題）");
      card.appendChild(h);
      const note = str(u.note);
      if (note) {
        const prev = preview(note, "補足");
        card.appendChild(prev.clip);
        const foot = cardFoot(prev.det, "");
        if (foot) card.appendChild(foot);
      }
      timeline.appendChild(card);
    });
    nodes.push(timeline);
    return nodes;
  }

  function renderRankings(rows) {
    const nodes = [
      heading(TAB_LABELS.rankings),
      noteLine("総合順位はありません。用途ごとの今日時点の目安です。"),
    ];
    if (!rows.length) {
      nodes.push(empty("用途のメモはまだありません。"));
      return nodes;
    }
    const grid = el("div", "stack split");
    rows.forEach((r) => {
      const ranks = list(r.ranks);
      const acc = accordion(str(r.use) || "（用途なし）", "", ranks.length);
      const body = el("div", "acc-body");
      const source = str(r.sourceNote);
      if (source) body.appendChild(fold("ソース", source));
      if (!ranks.length) body.appendChild(tx(el("p", "quiet"), "順位はまだありません。"));
      const ol = el("ol", "ranks");
      ranks.forEach((item, i) => {
        const li = el("li", "rank");
        const place = str(item.place) || String(i + 1);
        li.appendChild(tx(el("span", "place"), place));
        const name = el("span", "rank-name");
        name.translate = false;
        tx(name, str(item.name) || "（無題）");
        li.appendChild(name);
        const why = str(item.why);
        if (why) li.appendChild(fold("理由", why));
        ol.appendChild(li);
      });
      if (ranks.length) body.appendChild(ol);
      acc.appendChild(body);
      grid.appendChild(acc);
    });
    nodes.push(grid);
    return nodes;
  }

  function renderBenchmarks(rows) {
    const nodes = [
      heading(TAB_LABELS.benchmarks),
      noteLine("名前を開くと、何を測るかと弱点が出ます。"),
    ];
    if (!rows.length) {
      nodes.push(empty("読み方はまだありません。"));
      return nodes;
    }
    const stack = el("div", "stack");
    rows.forEach((b) => {
      const acc = accordion(str(b.name) || "（無題）");
      const body = el("div", "acc-body reveal");
      const what = str(b.what);
      const caveat = str(b.caveat);
      if (what) {
        const prev = preview(what, "説明");
        body.appendChild(prev.clip);
        body.appendChild(prev.det);
      }
      if (caveat) body.appendChild(fold("注意点", caveat));
      if (!what && !caveat) body.appendChild(tx(el("p", "quiet"), "説明はまだありません。"));
      acc.appendChild(body);
      stack.appendChild(acc);
    });
    nodes.push(stack);
    return nodes;
  }

  function usefulNews(item) {
    return str(item.title) || str(item.summary) || safeUrl(str(item.url));
  }
  function usefulLineup(v) {
    return str(v.vendor) || list(v.models).length > 0;
  }
  function usefulHarness(h) {
    return str(h.name) || str(h.kind) || str(h.note);
  }
  function usefulUpcoming(u) {
    return str(u.what) || str(u.when) || str(u.note);
  }
  function usefulRanking(r) {
    return str(r.use) || str(r.sourceNote) || list(r.ranks).length > 0;
  }
  function usefulBench(b) {
    return str(b.name) || str(b.what) || str(b.caveat);
  }

  const tabs = $("tabs");

  function updateTabFade() {
    if (!tabs) return;
    const max = tabs.scrollWidth - tabs.clientWidth;
    tabs.classList.toggle("fade-end", max > 4 && tabs.scrollLeft < max - 4);
    tabs.classList.toggle("fade-start", tabs.scrollLeft > 4);
  }

  function scrollTabIntoView(btn) {
    if (!btn || !tabs) return;
    const left = btn.offsetLeft;
    const right = left + btn.offsetWidth;
    if (left < tabs.scrollLeft) tabs.scrollLeft = left;
    else if (right > tabs.scrollLeft + tabs.clientWidth) tabs.scrollLeft = right - tabs.clientWidth;
  }

  function hashTab() {
    const raw = location.hash.replace(/^#/, "");
    let id = raw;
    try { id = decodeURIComponent(raw); } catch (e) {}
    return TAB_IDS.indexOf(id) === -1 ? "news" : id;
  }

  function showTab(id, opts) {
    const tab = TAB_IDS.indexOf(id) === -1 ? "news" : id;
    document.querySelectorAll(".tabs button").forEach((b) => {
      const on = b.dataset.tab === tab;
      b.setAttribute("aria-selected", on ? "true" : "false");
      b.tabIndex = on ? 0 : -1;
    });
    document.querySelectorAll(".panel").forEach((p) => {
      const on = p.id === tab;
      p.classList.toggle("on", on);
      p.hidden = !on;
    });
    const next = "#" + tab;
    if (location.hash !== next) history.replaceState(null, "", next);
    scrollTabIntoView(document.getElementById("tab-" + tab));
    if (opts && opts.scroll) window.scrollTo(0, 0);
    updateTabFade();
    requestAnimationFrame(refreshClamps);
  }

  if (tabs) {
    tabs.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-tab]");
      if (!btn) return;
      showTab(btn.dataset.tab, { scroll: true });
    });
    tabs.addEventListener("keydown", (e) => {
      const keys = ["ArrowRight", "ArrowLeft", "Home", "End"];
      if (keys.indexOf(e.key) === -1) return;
      const buttons = Array.prototype.slice.call(tabs.querySelectorAll("button[data-tab]"));
      const i = buttons.indexOf(document.activeElement);
      if (i < 0) return;
      e.preventDefault();
      let n = i;
      if (e.key === "ArrowRight") n = (i + 1) % buttons.length;
      if (e.key === "ArrowLeft") n = (i - 1 + buttons.length) % buttons.length;
      if (e.key === "Home") n = 0;
      if (e.key === "End") n = buttons.length - 1;
      buttons[n].focus();
      showTab(buttons[n].dataset.tab, { scroll: true });
    });
    tabs.addEventListener("scroll", updateTabFade, { passive: true });
  }
  window.addEventListener("hashchange", () => showTab(hashTab(), { scroll: true }));
  window.addEventListener("resize", () => {
    updateTabFade();
    refreshClamps();
  });
  showTab(hashTab(), { scroll: false });

  function explicitTheme() {
    const t = document.documentElement.getAttribute("data-theme");
    return t === "light" || t === "dark" ? t : "system";
  }
  function systemDark() {
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  }
  function resolvedDark() {
    const mode = explicitTheme();
    if (mode === "dark") return true;
    if (mode === "light") return false;
    return systemDark();
  }
  function syncThemeChrome() {
    const mode = explicitTheme();
    const btn = $("theme");
    const names = { system: "自動（端末の設定）", light: "ライト", dark: "ダーク" };
    const next = mode === "system" ? "light" : mode === "light" ? "dark" : "system";
    if (btn) {
      btn.textContent = mode === "light" ? "ライト" : mode === "dark" ? "ダーク" : "自動";
      btn.setAttribute("aria-label", "表示は" + names[mode] + "です。押すと" + names[next] + "に切り替えます");
    }
    const meta = $("theme-color");
    if (meta) meta.setAttribute("content", resolvedDark() ? "#131311" : "#f4f0e6");
  }
  function setTheme(mode) {
    if (mode === "light" || mode === "dark") document.documentElement.setAttribute("data-theme", mode);
    else document.documentElement.removeAttribute("data-theme");
    try {
      if (mode === "light" || mode === "dark") localStorage.setItem(THEME_KEY, mode);
      else localStorage.removeItem(THEME_KEY);
    } catch (e) {}
    syncThemeChrome();
    requestAnimationFrame(refreshClamps);
  }
  const themeBtn = $("theme");
  if (themeBtn) {
    themeBtn.addEventListener("click", () => {
      const mode = explicitTheme();
      setTheme(mode === "system" ? "light" : mode === "light" ? "dark" : "system");
    });
  }
  if (window.matchMedia) {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onScheme = () => syncThemeChrome();
    if (mq.addEventListener) mq.addEventListener("change", onScheme);
    else if (mq.addListener) mq.addListener(onScheme);
  }
  syncThemeChrome();

  function paint(data) {
    clampWatch.length = 0;
    const root = data && typeof data === "object" && !Array.isArray(data) ? data : {};
    const year = generatedYear(str(root.generatedAt));
    const updated = $("updated");
    if (updated) {
      updated.classList.remove("err");
      const label = str(root.generatedAt) ? formatGenerated(str(root.generatedAt)) : "";
      tx(updated, label || "更新日時なし");
    }
    const news = list(root.items).filter(usefulNews);
    const lineups = list(root.lineups).filter(usefulLineup);
    const harnesses = list(root.harnesses).filter(usefulHarness);
    const upcoming = list(root.upcoming).filter(usefulUpcoming);
    const rankings = list(root.rankings).filter(usefulRanking);
    const benchmarks = list(root.benchmarks).filter(usefulBench);
    const map = {
      news: renderNews(news, year),
      lineups: renderLineups(lineups),
      harnesses: renderHarnesses(harnesses),
      upcoming: renderUpcoming(upcoming),
      rankings: renderRankings(rankings),
      benchmarks: renderBenchmarks(benchmarks),
    };
    TAB_IDS.forEach((id) => {
      const panel = $(id);
      if (panel) panel.replaceChildren.apply(panel, map[id]);
    });
    requestAnimationFrame(refreshClamps);
  }

  function fail() {
    const updated = $("updated");
    if (updated) {
      updated.classList.add("err");
      tx(updated, "データを読み込めませんでした");
    }
    const news = $("news");
    if (news) news.replaceChildren(heading(TAB_LABELS.news), empty("再読み込みで、もう一度試せます。"));
  }

  fetch("news.json", { cache: "no-store" })
    .then((r) => {
      if (!r.ok) throw new Error("http");
      return r.json();
    })
    .then(paint)
    .catch(fail);

  if (window.ResizeObserver) {
    const main = $("main");
    if (main) new ResizeObserver(refreshClamps).observe(main);
  }
  requestAnimationFrame(updateTabFade);
})();
