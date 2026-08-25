(function () {
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
  const roleMap = {
    flagship: "旗艦",
    cheap: "安さ",
    code: "コード",
    multimodal: "マルチモーダル",
    open: "オープン",
    balanced: "バランス",
  };

  function safeUrl(u) {
    try {
      const x = new URL(u, location.href);
      if (x.protocol === "http:" || x.protocol === "https:") return x.href;
    } catch (e) {}
    return "";
  }

  function noteDetails(label, body) {
    const det = el("details", "note-fold");
    const sm = el("summary");
    tx(sm, label);
    const p = el("p", "note");
    tx(p, body || "");
    det.append(sm, p);
    return det;
  }

  const TAB_IDS = ["news", "lineups", "harnesses", "upcoming", "rankings", "benchmarks"];

  function showTab(id) {
    const tab = TAB_IDS.includes(id) ? id : "news";
    document.querySelectorAll(".tabs button").forEach((b) => {
      const on = b.dataset.tab === tab;
      b.classList.toggle("on", on);
      b.setAttribute("aria-selected", on ? "true" : "false");
    });
    document.querySelectorAll(".panel").forEach((p) => {
      p.classList.toggle("on", p.id === tab);
    });
    if (location.hash.replace(/^#/, "") !== tab) {
      history.replaceState(null, "", "#" + tab);
    }
  }

  document.querySelectorAll(".tabs button").forEach((btn) => {
    btn.addEventListener("click", () => showTab(btn.dataset.tab));
  });
  window.addEventListener("hashchange", () => {
    showTab(location.hash.replace(/^#/, "") || "news");
  });
  showTab(location.hash.replace(/^#/, "") || "news");

  fetch("news.json", { cache: "no-store" })
    .then((r) => {
      if (!r.ok) throw new Error("http");
      return r.json();
    })
    .then((data) => {
      const t = data.generatedAt ? new Date(data.generatedAt) : null;
      tx(
        $("updated"),
        t
          ? "更新 " +
              t.toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })
          : ""
      );

      const news = $("news");
      (data.items || []).forEach((item) => {
        const a = el("article");
        const meta = el("div", "meta");
        tx(meta, [item.date, item.source].filter(Boolean).join(" · "));
        const h = el("h3");
        tx(h, item.title || "");
        a.append(meta, h);
        const summary = item.summary || "";
        if (summary) {
          const clip = el("p", "clip");
          tx(clip, summary);
          a.appendChild(clip);
          if (summary.length > 80) {
            a.appendChild(noteDetails("全文", summary));
          }
        }
        const href = safeUrl(item.url);
        if (href) {
          const p2 = el("p");
          const link = el("a");
          link.href = href;
          link.rel = "noopener";
          link.target = "_blank";
          tx(link, "原文");
          p2.appendChild(link);
          a.appendChild(p2);
        }
        news.appendChild(a);
      });

      const lineups = $("lineups");
      const ln = el("p", "panel-note");
      tx(ln, "公開情報ベース。役割は flagship / cheap / code / multimodal / open の目安。各社を開くとモデルが出ます。");
      lineups.appendChild(ln);
      (data.lineups || []).forEach((v) => {
        const d = el("details", "vendor");
        const s = el("summary");
        const count = (v.models || []).length;
        tx(s, (v.vendor || "") + (count ? "（" + count + "）" : ""));
        d.appendChild(s);
        (v.models || []).forEach((m) => {
          const row = el("div", "model-row");
          const name = el("span", "model-name");
          tx(name, m.name || "");
          const badge = el("span", "role");
          tx(badge, roleMap[m.role] || m.role || "");
          row.append(name, badge);
          if (m.note) row.appendChild(noteDetails("メモ", m.note));
          d.appendChild(row);
        });
        lineups.appendChild(d);
      });

      const hbox = $("harnesses");
      const hn = el("p", "panel-note");
      tx(hn, "モデルを包むコーディング用の道具。存在を確認できたものだけ。");
      hbox.appendChild(hn);
      (data.harnesses || []).forEach((h) => {
        const card = el("div", "card");
        const title = el("h3");
        tx(title, h.name || "");
        const meta = el("div", "meta");
        tx(meta, h.kind || "");
        card.append(title, meta);
        if (h.note) card.appendChild(noteDetails("違い", h.note));
        hbox.appendChild(card);
      });

      const up = $("upcoming");
      (data.upcoming || []).forEach((u) => {
        const card = el("div", "card");
        const h = el("h3");
        tx(h, u.what || "");
        const meta = el("div", "meta");
        tx(meta, u.when || "");
        card.append(h, meta);
        if (u.note) card.appendChild(noteDetails("メモ", u.note));
        up.appendChild(card);
      });

      const ranks = $("rankings");
      const rn = el("p", "panel-note");
      tx(rn, "総合一位は出さない。今日点の目安で、寄った公開ソースを各カードに書く。");
      ranks.appendChild(rn);
      const grid = el("div", "grid two");
      (data.rankings || []).forEach((r) => {
        const d = el("details", "vendor");
        const s = el("summary");
        tx(s, r.use || "");
        d.appendChild(s);
        if (r.sourceNote) d.appendChild(noteDetails("ソースメモ", r.sourceNote));
        const ol = el("ol", "ranks");
        (r.ranks || []).forEach((item) => {
          const li = document.createElement("li");
          const strong = el("strong");
          tx(strong, item.name || "");
          li.appendChild(strong);
          if (item.why) li.appendChild(noteDetails("理由", item.why));
          ol.appendChild(li);
        });
        d.appendChild(ol);
        grid.appendChild(d);
      });
      ranks.appendChild(grid);

      const benches = $("benchmarks");
      (data.benchmarks || []).forEach((b) => {
        const d = el("details", "vendor");
        const s = el("summary");
        tx(s, b.name || "");
        d.appendChild(s);
        const p1 = el("p", "clip");
        tx(p1, b.what || "");
        d.appendChild(p1);
        if (b.what) d.appendChild(noteDetails("説明", b.what));
        if (b.caveat) d.appendChild(noteDetails("欠けやすい点", b.caveat));
        benches.appendChild(d);
      });
    })
    .catch(() => {
      tx($("updated"), "news.json を読めなかった");
    });
})();
