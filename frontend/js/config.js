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
  var pathname = window.location.pathname || "/";

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

  // Detect base path from URL: if pathname starts with /bible/, use it as prefix
  // This handles nginx deployment where frontend is at /bible/
  var basePath = "";
  if (pathname.startsWith("/bible/")) {
    basePath = "/bible";
  }

  function getApiBase() {
    // API is always at /api/v1 (nginx proxies /api/ to monolith:8080)
    // In production with /bible/ prefix, API is still at /api/v1 (not /bible/api/v1)
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
    basePath: basePath,        // "" for local, "/bible" for production
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
var BASE_PATH = APP_CONFIG.basePath;

// Log config on load (only in local mode)
if (APP_CONFIG.isLocal) {
  console.log("[Config] Mode: " + APP_CONFIG.deployMode + " | API: " + APP_CONFIG.apiBase + " | BasePath: " + APP_CONFIG.basePath);
}
