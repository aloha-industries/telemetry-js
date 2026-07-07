import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { initTracker, resetTrackerForTesting } from '../src/tracker.js';
/**
 * jsdom doesn't implement IntersectionObserver — provide a controllable stub
 * so tests can simulate elements scrolling into and out of view.
 */
export class FakeIntersectionObserver {
  static instances = [];
  observed = new Set();
  constructor(callback) {
    this.callback = callback;
    FakeIntersectionObserver.instances.push(this);
  }
  observe(el) { this.observed.add(el); }
  unobserve(el) { this.observed.delete(el); }
  disconnect() { this.observed.clear(); }
  intersect(elements) {
    const entries = elements.map(target => ({ target, isIntersecting: true }));
    this.callback(entries);
  }
}

beforeEach(() => {
  globalThis.IntersectionObserver = FakeIntersectionObserver;
  FakeIntersectionObserver.instances = [];
  globalThis.fetch = vi.fn(() => Promise.resolve());
  vi.useFakeTimers();
  sessionStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
  document.body.innerHTML = '';
  resetTrackerForTesting();
});

function setHtml(html) {
  document.body.innerHTML = html;
}

function lastRequestBody() {
  const calls = globalThis.fetch.mock.calls;
  if (calls.length === 0) throw new Error('fetch was not called');
  return JSON.parse(calls[calls.length - 1][1].body);
}

describe('initTracker — clicks and bounces', () => {
  it('sends click event and stores bounce timestamp', () => {
    setHtml(`<button data-action="click" data-context-id="1042">Click</button>`);
    initTracker();

    document.querySelector('button').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    vi.advanceTimersByTime(600); // flush

    expect(lastRequestBody()).toEqual({ events: [{ event_type: 'click', context_id: '1042', metadata: {} }] });
    expect(sessionStorage.getItem('telemetry_last_click')).toContain('"id":"1042"');
  });

  it('sends bounce event if initialized within 10 seconds of a click', () => {
    sessionStorage.setItem('telemetry_last_click', JSON.stringify({ id: '2001', timestamp: Date.now() - 5000 }));
    
    initTracker();
    vi.advanceTimersByTime(600); // flush

    const payload = lastRequestBody();
    expect(payload.events).toHaveLength(1);
    expect(payload.events[0].event_type).toBe('bounce');
    expect(payload.events[0].context_id).toBe('2001');
    expect(payload.events[0].metadata.dwell_time_ms).toBeGreaterThanOrEqual(5000);
    expect(sessionStorage.getItem('telemetry_last_click')).toBeNull();
  });
});

describe('initTracker — searches', () => {
  it('sends normal search event', () => {
    setHtml(`
      <form data-action="search">
        <input type="text" value="Coffee" />
      </form>
    `);
    initTracker();

    document.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    vi.advanceTimersByTime(600); // flush

    expect(lastRequestBody()).toEqual({ events: [{ event_type: 'search', context_id: 'Coffee', metadata: {} }] });
  });

  it('sends zero_result_search if data-result-count is 0', () => {
    setHtml(`
      <form data-action="search" data-result-count="0">
        <input type="text" value="Coffee" />
      </form>
    `);
    initTracker();

    document.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    vi.advanceTimersByTime(600); // flush

    expect(lastRequestBody()).toEqual({ events: [{ event_type: 'zero_result_search', context_id: 'Coffee', metadata: { result_count: 0 } }] });
  });
});

describe('initTracker — impressions', () => {
  it('batches impressions', () => {
    setHtml(`
      <div data-action="impression" data-context-id="1042"></div>
      <div data-action="impression" data-context-id="2001"></div>
    `);
    initTracker();

    const [observer] = FakeIntersectionObserver.instances;
    observer.intersect([...document.querySelectorAll('[data-action="impression"]')]);

    vi.advanceTimersByTime(600); // flush

    expect(lastRequestBody()).toEqual({
      events: [
        { event_type: 'impression', context_id: '1042', metadata: {} },
        { event_type: 'impression', context_id: '2001', metadata: {} },
      ]
    });
  });
});

describe('silent failure', () => {
  it('never throws when fetch rejects', () => {
    globalThis.fetch.mockImplementation(() => Promise.reject(new Error('network down')));
    setHtml(`<div data-action="impression" data-context-id="1042"></div>`);
    initTracker();

    const [observer] = FakeIntersectionObserver.instances;
    expect(() => observer.intersect([...document.querySelectorAll('[data-action]')])).not.toThrow();
    expect(() => vi.advanceTimersByTime(600)).not.toThrow();
  });
});
