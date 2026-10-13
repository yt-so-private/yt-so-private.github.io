/* Completion and restart live only in this browser. No account, no network. */
(function (global) {
  var KEY = "de.progress.v1";

  function empty() {
    return { done: {}, restart: null };
  }

  function read() {
    var state = empty();
    try {
      var raw = JSON.parse(localStorage.getItem(KEY) || "{}");
      if (!raw || typeof raw !== "object") return state;
      if (raw.done && typeof raw.done === "object") {
        Object.keys(raw.done).forEach(function (date) {
          if (/^\d{4}-\d{2}-\d{2}$/.test(date) && raw.done[date]) state.done[date] = 1;
        });
      }
      if (typeof raw.restart === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw.restart)) {
        state.restart = raw.restart;
      }
    } catch (e) {}
    return state;
  }

  function write(state) {
    var done = {};
    Object.keys(state.done || {}).forEach(function (date) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(date) && state.done[date]) done[date] = 1;
    });
    var next = {
      done: done,
      restart: /^\d{4}-\d{2}-\d{2}$/.test(state.restart || "") ? state.restart : null
    };
    localStorage.setItem(KEY, JSON.stringify(next));
    return next;
  }

  global.DEProgress = {
    read: read,
    isDone: function (date) {
      return !!read().done[date];
    },
    setDone: function (date, on) {
      var state = read();
      if (on) state.done[date] = 1;
      else delete state.done[date];
      return write(state);
    },
    setRestart: function (date) {
      var state = read();
      state.restart = date || null;
      return write(state);
    },
    doneSince: function (dates) {
      var state = read();
      if (!state.restart) return 0;
      var restart = state.restart;
      return dates.filter(function (date) {
        return date >= restart && state.done[date];
      }).length;
    }
  };
})(window);
