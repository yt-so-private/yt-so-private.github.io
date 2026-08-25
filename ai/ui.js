const $ = (id) => document.getElementById(id);
const el = (tag, cls) => { const n = document.createElement(tag); if (cls) n.className = cls; return n; };
const tx = (n, s) => { n.textContent = s == null ? "" : String(s); return n; };
const roleMap = {flagship:"旗艦", cheap:"安さ", code:"コード", multimodal:"マルチモーダル", open:"オープン", balanced:"バランス"};
function safeUrl(u){
  try { const x = new URL(u, location.href); if (x.protocol === "http:" || x.protocol === "https:") return x.href; } catch (e) {}
  return "";
}
document.querySelectorAll(".tabs button").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tabs button").forEach((b) => b.classList.toggle("on", b === btn));
    document.querySelectorAll(".panel").forEach((p) => p.classList.toggle("on", p.id === btn.dataset.tab));
  });
});
fetch("news.json", {cache:"no-store"}).then((r) => { if (!r.ok) throw new Error("http"); return r.json(); }).then((data) => {
  const t = data.generatedAt ? new Date(data.generatedAt) : null;
  tx($("updated"), t ? ("更新 " + t.toLocaleString("ja-JP", {timeZone:"Asia/Tokyo"})) : "");
  const news = $("news");
  (data.items || []).slice(0, 6).forEach((item) => {
    const a = el("article");
    const meta = el("div", "meta"); tx(meta, [item.date, item.source].filter(Boolean).join(" · "));
    const h = el("h3"); tx(h, item.title || "");
    const p = el("p", "clip"); tx(p, item.summary || "");
    a.append(meta, h, p);
    const href = safeUrl(item.url);
    if (href) { const p2 = el("p"); const link = el("a"); link.href = href; link.rel = "noopener"; link.target = "_blank"; tx(link, "原文"); p2.appendChild(link); a.appendChild(p2); }
    news.appendChild(a);
  });
  const lineups = $("lineups");
  (data.lineups || []).forEach((v) => {
    const d = el("details", "vendor");
    const s = el("summary"); tx(s, v.vendor || "");
    d.appendChild(s);
    const table = el("table");
    (v.models || []).forEach((m) => {
      const tr = el("tr");
      const n = el("td"); tx(n, m.name || "");
      const r = el("td"); const b = el("span", "role"); tx(b, roleMap[m.role] || m.role || ""); r.appendChild(b);
      const note = el("td");
      const det = el("details"); const sm = el("summary"); tx(sm, "メモ"); const p = el("p", "note"); tx(p, m.note || "");
      det.append(sm, p); note.appendChild(det);
      tr.append(n, r, note); table.appendChild(tr);
    });
    d.appendChild(table); lineups.appendChild(d);
  });
  const hbox = $("harnesses");
  const ht = el("table");
  (data.harnesses || []).forEach((h) => {
    const tr = el("tr");
    const n = el("td"); tx(n, h.name || "");
    const k = el("td"); tx(k, h.kind || "");
    const note = el("td");
    const det = el("details"); const sm = el("summary"); tx(sm, "違い"); const p = el("p", "note"); tx(p, h.note || "");
    det.append(sm, p); note.appendChild(det);
    tr.append(n, k, note); ht.appendChild(tr);
  });
  hbox.appendChild(ht);
  const up = $("upcoming");
  (data.upcoming || []).forEach((u) => {
    const card = el("div", "card");
    const h = el("h3"); tx(h, u.what || "");
    const meta = el("div", "meta"); tx(meta, u.when || "");
    const p = el("p", "note"); tx(p, u.note || "");
    card.append(h, meta, p); up.appendChild(card);
  });
  const ranks = $("rankings");
  (data.rankings || []).forEach((r) => {
    const d = el("details", "vendor");
    const s = el("summary"); tx(s, r.use || "");
    d.appendChild(s);
    const note = el("p", "note"); tx(note, r.sourceNote || "");
    const ol = document.createElement("ol");
    (r.ranks || []).forEach((item) => {
      const li = document.createElement("li");
      const strong = el("strong"); tx(strong, item.name || "");
      li.append(strong, document.createTextNode(" — " + (item.why || "")));
      ol.appendChild(li);
    });
    d.append(note, ol); ranks.appendChild(d);
  });
  const benches = $("benchmarks");
  (data.benchmarks || []).forEach((b) => {
    const d = el("details", "vendor");
    const s = el("summary"); tx(s, b.name || "");
    d.appendChild(s);
    const p1 = el("p"); tx(p1, b.what || "");
    const p2 = el("p", "note"); tx(p2, "欠けやすい点: " + (b.caveat || ""));
    d.append(p1, p2); benches.appendChild(d);
  });
}).catch(() => { tx($("updated"), "news.json を読めなかった"); });
