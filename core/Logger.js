/**
 * core/Logger.js
 * ---------------------------------------------------------------------------
 * Structured logging with levels (debug/info/warn/error), verbose in
 * development and minimal in production. This is infrastructure for
 * *future* consistent use — the codebase already has zero console.log/
 * debugger statements per the earlier code-quality audit, so this isn't
 * fixing existing violations, it's giving the app one correct place to log
 * through as new code is added, instead of every file reaching for
 * `console.log` directly and forgetting to gate it by environment.
 *
 * Environment detection: Vite exposes `import.meta.env.DEV`/`PROD`
 * automatically, so this needs no separate config to know which mode it's
 * running in.
 */

const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 };

// In production, only warn/error reach the console at all — debug/info are
// silenced (they're for local development, not something end users' browser
// consoles should show, per the brief's "minimal logs in production").
const MIN_LEVEL = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.PROD) ? LEVELS.warn : LEVELS.debug;

function log(level, scope, message, extra) {
  if (LEVELS[level] < MIN_LEVEL) return;
  const prefix = `[${scope}]`;
  const fn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
  // Never log full error objects/stack traces in production (they can leak
  // internal file paths, request payloads, or other details end users
  // shouldn't see) — only the safe, already-mapped message. Development
  // mode still gets the full `extra` for real debugging.
  if (MIN_LEVEL >= LEVELS.warn && extra !== undefined) {
    fn(prefix, message);
  } else if (extra !== undefined) {
    fn(prefix, message, extra);
  } else {
    fn(prefix, message);
  }
}

export const Logger = {
  /** @param {string} scope @param {string} message @param {unknown} [extra] */
  debug: (scope, message, extra) => log('debug', scope, message, extra),
  info: (scope, message, extra) => log('info', scope, message, extra),
  warn: (scope, message, extra) => log('warn', scope, message, extra),
  error: (scope, message, extra) => log('error', scope, message, extra),
};
