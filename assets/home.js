(function () {
  var arch = document.getElementById("arch");
  var today = document.querySelector("a.today");
  var shelf = document.getElementById("shelf");
  var panel = document.getElementById("restart-panel");
  var ribbon = document.getElementById("restart-ribbon");
  var status = document.getElementById("today-status");
  var live = document.getElementById("live");
  if (!arch || !today || !shelf || !panel || !window.DEProgress) return;

  var heading = document.querySelector("main h1");
  if (heading && heading.textContent.trim() === "Today") heading.textContent = "今日のレッスン";
  var summary = document.querySelector("details.archive summary");
  if (summary && summary.textContent.trim() === "Archive") summary.textContent = "これまでのレッスン";
  var badge = today.querySelector(".badge");
  if (badge) badge.textContent = "今日の1枚 · 15分";

  function textOf(node) {
    return Array.prototype.filter.call(node.childNodes, function (n) {
      return n.nodeType === 3;
    }).map(function (n) { return n.textContent; }).join("").replace(/\s+/g, " ").trim();
  }

  function dateFrom(href) {
    var match = String(href || "").match(/(\d{4}-\d{2}-\d{2})/);
    return match ? match[1] : "";
  }

  function formatDate(iso) {
    var parts = iso.split("-");
    return Number(parts[1]) + "月" + Number(parts[2]) + "日";
  }

  function formatMonth(key) {
    var parts = key.split("-");
    return parts[0] + "年" + Number(parts[1]) + "月";
  }

  var todayDate = dateFrom(today.getAttribute("href"));
  var items = Array.prototype.map.call(arch.querySelectorAll(":scope > li"), function (li) {
    var link = li.querySelector("a");
    return {
      href: link.getAttribute("href"),
      date: dateFrom(link.getAttribute("href")),
      title: textOf(link)
    };
  }).filter(function (item) { return item.date; });

  var trackedDates = [todayDate].concat(items.map(function (item) { return item.date; }));

  function announce(message) {
    if (live) live.textContent = message;
  }

  function button(label, className, onClick) {
    var el = document.createElement("button");
    el.type = "button";
    el.className = className;
    el.textContent = label;
    el.addEventListener("click", onClick);
    return el;
  }

  function renderRestart(state) {
    panel.replaceChildren();
    var text = document.createElement("p");
    var actions = document.createElement("div");
    actions.className = "restart-actions";
    if (!state.restart) {
      text.textContent = "遅れは数えません。今日の1枚からで大丈夫です。";
      actions.appendChild(button("ここから再スタート", "btn primary", function () {
        DEProgress.setRestart(todayDate);
        announce("今日を起点にしました。前の分はそのままで大丈夫です。");
        render();
      }));
    } else {
      var count = DEProgress.doneSince(trackedDates);
      text.textContent = formatDate(state.restart) + "を起点に、" + count + "枚完了。前の分は置いてあります。";
      if (state.restart !== todayDate) {
        actions.appendChild(button("今日を起点にする", "btn primary", function () {
          DEProgress.setRestart(todayDate);
          announce("起点を今日に移しました。前の分はそのままで大丈夫です。");
          render();
        }));
      }
      actions.appendChild(button("起点を外す", "btn ghost", function () {
        DEProgress.setRestart(null);
        announce("起点を外しました。");
        render();
      }));
    }
    panel.append(text, actions);
    if (ribbon) ribbon.hidden = state.restart !== todayDate;
  }

  function renderShelf(state) {
    var doneCount = trackedDates.filter(function (date) {
      if (state.restart && date < state.restart) return false;
      return !!state.done[date];
    }).length;
    shelf.replaceChildren();

    var head = document.createElement("div");
    head.className = "shelf-head";
    var heading = document.createElement("h2");
    heading.textContent = "これまでのレッスン";
    var count = document.createElement("p");
    count.className = "shelf-count";
    count.textContent = state.restart ? ("起点から " + doneCount + "枚") : (doneCount ? (doneCount + "枚完了") : "");
    head.append(heading, count);
    shelf.appendChild(head);

    var groups = [];
    items.forEach(function (item) {
      var key = item.date.slice(0, 7);
      var group = groups.find(function (entry) { return entry.key === key; });
      if (!group) {
        group = { key: key, items: [] };
        groups.push(group);
      }
      group.items.push(item);
    });

    var openMonths = {};
    shelf.querySelectorAll("details.month[open]").forEach(function (node) {
      openMonths[node.getAttribute("data-month")] = true;
    });
    var keepOpen = shelf.querySelector("details.month") !== null;

    groups.forEach(function (group, index) {
      var details = document.createElement("details");
      details.className = "month";
      details.setAttribute("data-month", group.key);
      details.open = keepOpen ? !!openMonths[group.key] : index === 0;
      var summary = document.createElement("summary");
      var label = document.createElement("span");
      label.textContent = formatMonth(group.key);
      var meta = document.createElement("span");
      meta.className = "month-count";
      var monthDone = group.items.filter(function (item) { return state.done[item.date]; }).length;
      var allQuiet = state.restart && group.items.every(function (item) { return item.date < state.restart; });
      meta.textContent = allQuiet ? "以前の分" : (monthDone ? (monthDone + "枚完了") : "");
      summary.append(label, meta);
      details.appendChild(summary);

      var list = document.createElement("ul");
      group.items.forEach(function (item) {
        var tracked = !!state.restart && item.date >= state.restart;
        if (state.restart === item.date) {
          var marker = document.createElement("li");
          marker.className = "marker";
          marker.textContent = "ここから再スタート";
          list.appendChild(marker);
        }
        var row = document.createElement("li");
        row.className = "lesson-row" + (tracked ? "" : " is-quiet") + (state.done[item.date] ? " is-done" : "");
        var done = !!state.done[item.date];
        if (tracked) {
          var check = document.createElement("button");
          check.type = "button";
          check.className = "check";
          check.setAttribute("data-date", item.date);
          check.setAttribute("aria-pressed", done ? "true" : "false");
          check.setAttribute("aria-label", (done ? "完了を取り消す：" : "完了にする：") + item.title);
          row.appendChild(check);
        } else if (done) {
          var mark = document.createElement("span");
          mark.className = "done-note";
          mark.textContent = "完了";
          row.appendChild(mark);
        }
        var link = document.createElement("a");
        link.href = item.href;
        var title = document.createElement("span");
        title.className = "lt";
        title.textContent = item.title;
        var when = document.createElement("span");
        when.className = "ld";
        when.textContent = formatDate(item.date);
        link.append(title, when);
        row.appendChild(link);
        list.appendChild(row);
      });
      details.appendChild(list);
      shelf.appendChild(details);
    });
  }

  function renderToday(state) {
    if (!status) return;
    status.textContent = state.done[todayDate] ? "今日の分は完了です。" : "";
  }

  function render() {
    var state = DEProgress.read();
    renderToday(state);
    renderRestart(state);
    renderShelf(state);
  }

  shelf.addEventListener("click", function (event) {
    var check = event.target.closest && event.target.closest(".check");
    if (!check) return;
    var date = check.getAttribute("data-date");
    var next = check.getAttribute("aria-pressed") !== "true";
    DEProgress.setDone(date, next);
    announce(next ? "完了にしました。" : "完了を取り消しました。");
    render();
    var again = shelf.querySelector('.check[data-date="' + date + '"]');
    if (again) again.focus();
  });

  render();
})();
