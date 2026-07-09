let f = !1, d = null;
function k() {
  f = !1, c = [], clearTimeout(a), a = null, d && (d.abort(), d = null);
}
const y = {
  endpoint: "/t/event",
  debounceMs: 1e3
}, S = 50, T = 500;
let c = [], a = null, b = { ...y };
const r = (s) => (...i) => {
  try {
    return s(...i);
  } catch {
  }
}, h = r(() => {
  if (a = null, c.length === 0) return;
  const s = { events: [...c] };
  c = [], fetch(b.endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(s),
    credentials: "omit",
    keepalive: !0,
    mode: "same-origin"
  }).catch(() => {
  });
}), m = r((s, i, l = {}) => {
  c.push({ event_type: s, context_id: i, metadata: l }), c.length >= S ? (clearTimeout(a), h()) : a === null && (a = setTimeout(h, T));
});
function A(s = {}) {
  f || (f = !0, r(() => {
    d = new AbortController();
    const { signal: i } = d;
    b = { ...y, ...s };
    const l = /* @__PURE__ */ new Set(), g = (n, e, o = {}) => {
      const t = `${n}:${e}`;
      l.has(t) || (l.add(t), setTimeout(() => l.delete(t), b.debounceMs), m(n, e, o));
    }, p = sessionStorage.getItem("telemetry_last_click");
    if (p) {
      const { id: n, timestamp: e } = JSON.parse(p), o = Date.now() - e;
      o < 1e4 && m("bounce", n, { dwell_time_ms: o }), sessionStorage.removeItem("telemetry_last_click");
    }
    if (document.body.addEventListener("click", r((n) => {
      const e = n.target.closest?.("[data-action]");
      if (!e) return;
      const o = e.getAttribute("data-action"), t = e.getAttribute("data-context-id") || "";
      o === "click" && t && sessionStorage.setItem("telemetry_last_click", JSON.stringify({ id: t, timestamp: Date.now() })), g(o, t);
    }), { signal: i }), document.addEventListener("submit", r((n) => {
      const e = n.target.closest?.('[data-action="search"]');
      if (!e) return;
      const t = (e.querySelector("[data-search-input]") || e.querySelector("input"))?.value.trim() || "", u = e.getAttribute("data-result-count") === "0";
      t && g(u ? "zero_result_search" : "search", t, u ? { result_count: 0 } : {});
    }), { signal: i }), typeof IntersectionObserver < "u") {
      const n = new IntersectionObserver(r((e) => {
        for (const { target: o, isIntersecting: t } of e) {
          if (!t) continue;
          n.unobserve(o);
          const u = o.getAttribute("data-context-id");
          u && m("impression", u);
        }
      }));
      document.querySelectorAll('[data-action="impression"]').forEach((e) => n.observe(e));
    }
  })());
}
export {
  m as enqueue,
  A as initTracker,
  k as resetTrackerForTesting
};
//# sourceMappingURL=tracker.esm.js.map
