/**
 * Stand-in for the `server-only` guard when server modules are executed by
 * Node scripts (seed, worker) rather than by Next. Mapped in
 * `tsconfig.scripts.json` only — the real guard still applies to the app build.
 */
export {};
