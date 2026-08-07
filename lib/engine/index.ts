/**
 * Engine barrel — the pure logic layer (BUILD_SPEC §7).
 * gates.ts is the single source of truth; the three run* functions are the
 * only entry points the mock api / UI should call.
 */
export * from "./gates";
export * from "./soften-certainty";
export * from "./readiness-tool";
export * from "./readiness-site";
export * from "./hospital-audit";
