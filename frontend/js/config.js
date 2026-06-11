/**
 * Bible Microservices - Deployment Configuration
 * ===============================================
 * 
 * Mode: "local"      → API on /api/v1 (proxied via frontend :3000)
 * Mode: "production" → API at relative path /api/v1 (requires Nginx reverse proxy)
 * Mode: "auto"       → auto-detect from window.location.hostname
 */

var APP_CONFIG = (function() {
  var hostname = (window.location.hostname || "localhost").toLowerCase();

  // ── CHANGE THIS to "local", "production", or "auto" ──
  var mode = "local";
  // ───────────────────────────────────────────────────────

  var isLocalHost = (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname.startsWith("192.168.") ||
    hostname.startsWith("10.") ||
    hostname.startsWith("172.16.")
  );

  function getApiBase() {
    if (mode === "production") return "/api/v1";
    if (mode === "local")      return "/api/v1";
    // auto: detect from hostname (frontend proxy handles routing to backend)
    return "/api/v1";
  }

  function getIsProduction() {
    return mode === "production" || (mode === "auto" && !isLocalHost);
  }

  function getIsLocal() {
    return mode === "local" || (mode === "auto" && isLocalHost);
  }

  return {
    deployMode: mode,
    isProduction: getIsProduction(),
    isLocal: getIsLocal(),
    apiBase: getApiBase(),
    hostname: hostname,

    // Supported domains (informational; actual CORS configured server-side)
    domains: [
      "http://localhost:3000",
      "http://127.0.0.1:3000",
      "https://www.usebible.com",
      "https://usebible.com"
    ]
  };
})();

// Legacy: for backward compatibility with existing code
var API_BASE = APP_CONFIG.apiBase;
var DEPLOY_MODE = APP_CONFIG.deployMode;

// Log config on load (only in local mode)
if (APP_CONFIG.isLocal) {
  console.log("[Config] Mode: " + APP_CONFIG.deployMode + " | API: " + APP_CONFIG.apiBase);
}
