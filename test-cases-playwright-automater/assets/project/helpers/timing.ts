import type { Page } from '@playwright/test';

/** Navigate and capture basic timing + LCP. Thresholds are asserted by the test, not here. */
export async function capturePerf(page: Page, path: string) {
  await page.goto(path, { waitUntil: 'load' });
  return page.evaluate(async () => {
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
    const lcp = await new Promise<number>((res) => {
      let v = 0;
      try {
        new PerformanceObserver((list) => {
          for (const e of list.getEntries()) v = (e as any).renderTime || (e as any).loadTime || v;
        }).observe({ type: 'largest-contentful-paint', buffered: true });
      } catch { /* not supported */ }
      setTimeout(() => res(Math.round(v)), 1500);
    });
    return {
      ttfb: nav ? Math.round(nav.responseStart) : null,
      domContentLoaded: nav ? Math.round(nav.domContentLoadedEventEnd) : null,
      load: nav ? Math.round(nav.loadEventEnd) : null,
      lcp,
    };
  });
}

export async function viewportWidth(page: Page): Promise<number> {
  return page.evaluate(() => document.documentElement.clientWidth);
}
