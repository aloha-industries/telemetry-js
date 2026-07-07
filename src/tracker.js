/**
 * @aloha-industries/telemetry-js
 *
 * Privacy-first browser event tracker — zero-identity by design.
 *
 * This module intentionally avoids collecting any PII or device-fingerprinting
 * signals. It sends only the event_type, context_id, and optional metadata.
 * No cookies are read or set, no auth headers are attached, and `credentials: 'omit'`
 * ensures the browser never auto-attaches session cookies.
 */

let initialized = false;
let abortController = null;

/** @internal For testing only */
export function resetTrackerForTesting() {
  initialized = false;
  batch = [];
  clearTimeout(timer);
  timer = null;
  if (abortController) {
    abortController.abort();
    abortController = null;
  }
}

const DEFAULTS = {
  endpoint: '/t/event',
  debounceMs: 1000,
};

const BATCH_SIZE = 50;
const FLUSH_DELAY_MS = 500;

let batch = [];
let timer = null;
let currentConfig = { ...DEFAULTS };

const safe = (fn) => (...args) => {
  try {
    return fn(...args);
  } catch {
    // Telemetry must never break the page
  }
};

const flush = safe(() => {
  timer = null;
  if (batch.length === 0) return;
  
  const payload = { events: [...batch] };
  batch = [];

  fetch(currentConfig.endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    credentials: 'omit',
    keepalive: true,
    mode: 'same-origin',
  }).catch(() => {});
});

/**
 * Queue a generic telemetry event.
 */
export const enqueue = safe((event_type, context_id, metadata = {}) => {
  batch.push({ event_type, context_id, metadata });
  
  if (batch.length >= BATCH_SIZE) {
    clearTimeout(timer);
    flush();
  } else if (timer === null) {
    timer = setTimeout(flush, FLUSH_DELAY_MS);
  }
});

export function initTracker(options = {}) {
  if (initialized) return;
  initialized = true;

  safe(() => {
    abortController = new AbortController();
    const { signal } = abortController;
    currentConfig = { ...DEFAULTS, ...options };
    const seen = new Set();

    const debouncedEnqueue = (event_type, context_id, metadata = {}) => {
      const key = `${event_type}:${context_id}`;
      if (seen.has(key)) return;
      seen.add(key);
      setTimeout(() => seen.delete(key), currentConfig.debounceMs);
      enqueue(event_type, context_id, metadata);
    };

    // 1. Bounce Tracking Check
    const lastClick = sessionStorage.getItem('telemetry_last_click');
    if (lastClick) {
      const { id, timestamp } = JSON.parse(lastClick);
      const dwellTime = Date.now() - timestamp;
      if (dwellTime < 10000) {
        enqueue('bounce', id, { dwell_time_ms: dwellTime });
      }
      sessionStorage.removeItem('telemetry_last_click');
    }

    // 2. Click Handling
    document.body.addEventListener('click', safe((event) => {
      const el = event.target.closest?.('[data-action]');
      if (!el) return;
      
      const action = el.getAttribute('data-action');
      const id = el.getAttribute('data-context-id') || '';
      
      if (action === 'click' && id) {
        sessionStorage.setItem('telemetry_last_click', JSON.stringify({ id, timestamp: Date.now() }));
      }
      
      debouncedEnqueue(action, id);
    }), { signal });

    // 3. Form Submissions (Searches)
    document.addEventListener('submit', safe((event) => {
      const form = event.target.closest?.('[data-action="search"]');
      if (!form) return;
      
      const input = form.querySelector('[data-search-input]') || form.querySelector('input');
      const term = input?.value.trim() || '';
      
      const isZeroResult = form.getAttribute('data-result-count') === '0';
      const eventType = isZeroResult ? 'zero_result_search' : 'search';
      const metadata = isZeroResult ? { result_count: 0 } : {};

      if (term) {
        debouncedEnqueue(eventType, term, metadata);
      }
    }), { signal });

    // 4. Impressions
    if (typeof IntersectionObserver !== 'undefined') {
      const observer = new IntersectionObserver(safe((entries) => {
        for (const { target, isIntersecting } of entries) {
          if (!isIntersecting) continue;
          observer.unobserve(target);
          
          const id = target.getAttribute('data-context-id');
          if (id) enqueue('impression', id);
        }
      }));

      document.querySelectorAll('[data-action="impression"]').forEach(el => observer.observe(el));
    }
  })();
}
