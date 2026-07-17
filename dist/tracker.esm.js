let b = !1, d = null;
function k() {
  b = !1, a = [], clearTimeout(l), l = null, d && (d.abort(), d = null);
}
const y = {
  endpoint: "/t/event",
  debounceMs: 1e3
}, S = 50, T = 500;
let a = [], l = null, p = { ...y };
const i = (s) => (...r) => {
  try {
    return s(...r);
  } catch {
  }
}, g = i(() => {
  if (l = null, a.length === 0) return;
  const s = { events: [...a] };
  a = [], fetch(p.endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(s),
    credentials: "omit",
    keepalive: !0,
    mode: "same-origin"
  }).catch(() => {
  });
}), m = i((s, r, u = {}) => {
  a.push({ event_type: s, context_id: r, metadata: u }), a.length >= S ? (clearTimeout(l), g()) : l === null && (l = setTimeout(g, T));
});
function A(s = {}) {
  b || (b = !0, i(() => {
    d = new AbortController();
    const { signal: r } = d;
    p = { ...y, ...s };
    const u = /* @__PURE__ */ new Set(), h = (o, n, e = {}) => {
      const t = `${o}:${n}`;
      u.has(t) || (u.add(t), setTimeout(() => u.delete(t), p.debounceMs), m(o, n, e));
    }, v = sessionStorage.getItem("telemetry_last_click");
    if (v) {
      const { id: o, timestamp: n } = JSON.parse(v), e = Date.now() - n;
      e < 1e4 && m("bounce", o, { dwell_time_ms: e }), sessionStorage.removeItem("telemetry_last_click");
    }
    if (document.body.addEventListener("click", i((o) => {
      const n = o.target.closest?.("[data-action]");
      if (!n) return;
      const e = n.getAttribute("data-action"), t = n.getAttribute("data-context-id") || "";
      e === "click" && t && sessionStorage.setItem("telemetry_last_click", JSON.stringify({ id: t, timestamp: Date.now() })), h(e, t);
    }), { signal: r }), document.addEventListener("submit", i((o) => {
      const n = o.target.closest?.('[data-action="search"]');
      if (!n) return;
      const t = (n.querySelector("[data-search-input]") || n.querySelector("input"))?.value.trim() || "", c = n.getAttribute("data-result-count") === "0";
      t && h(c ? "zero_result_search" : "search", t, c ? { result_count: 0 } : {});
    }), { signal: r }), typeof IntersectionObserver < "u") {
      const o = new IntersectionObserver(i((e) => {
        for (const { target: t, isIntersecting: c } of e) {
          if (!c) continue;
          o.unobserve(t);
          const f = t.getAttribute("data-context-id");
          f && m("impression", f);
        }
      })), n = (e) => {
        e.nodeType === 1 && (e.matches?.('[data-action="impression"]') && o.observe(e), e.querySelectorAll?.('[data-action="impression"]').forEach((t) => o.observe(t)));
      };
      if (document.querySelectorAll('[data-action="impression"]').forEach((e) => o.observe(e)), typeof MutationObserver < "u") {
        const e = new MutationObserver(i((t) => {
          for (const c of t)
            c.addedNodes.forEach(n);
        }));
        e.observe(document.body, { childList: !0, subtree: !0 }), r.addEventListener("abort", () => e.disconnect());
      }
    }
  })());
}
export {
  m as enqueue,
  A as initTracker,
  k as resetTrackerForTesting
};
//# sourceMappingURL=tracker.esm.js.map
