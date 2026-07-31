/**
 * core/Monitoring.js
 * ---------------------------------------------------------------------------
 * Integration points for Firebase Analytics, Crash Reporting, and
 * Performance Monitoring — per the brief: "prepare integration... do not
 * enable paid services automatically. Keep architecture ready."
 *
 * Every function below is currently a documented no-op. Wiring in the real
 * Firebase SDKs is a deliberate, later decision (it requires enabling
 * products in the Firebase Console and accepting their data-collection
 * implications) — NOT something this migration should switch on silently.
 * When that decision is made, only this file needs to change; every call
 * site (e.g. `Monitoring.recordError(mappedError)` in a repository's catch
 * block) already exists and doesn't need to be found and updated one by one.
 */

let enabled = false;

/** Call once, only after deliberately deciding to turn monitoring on (see file header). */
export function enableMonitoring() {
  enabled = true;
  // Real implementation, when adopted, goes here — e.g.:
  //   import { getAnalytics, logEvent } from 'firebase/analytics';
  //   import { getPerformance } from 'firebase/performance';
  // and store the resulting instances for the functions below to use.
}

/**
 * @param {string} eventName
 * @param {Record<string, string|number|boolean>} [params]
 */
export function trackEvent(eventName, params) {
  if (!enabled) return;
  // no-op until enableMonitoring() wires in Firebase Analytics' logEvent().
}

/**
 * @param {import('./ErrorMapper.js').MappedError} mappedError
 * @param {{ fatal?: boolean }} [options]
 */
export function recordError(mappedError, options = {}) {
  if (!enabled) return;
  // no-op until enableMonitoring() wires in Crashlytics/Crash Reporting.
}

/**
 * @param {string} traceName
 * @returns {{ stop: () => void }} call .stop() when the measured operation finishes
 */
export function startTrace(traceName) {
  if (!enabled) return { stop() {} };
  // no-op until enableMonitoring() wires in Firebase Performance Monitoring.
  return { stop() {} };
}

export const Monitoring = { enableMonitoring, trackEvent, recordError, startTrace };
