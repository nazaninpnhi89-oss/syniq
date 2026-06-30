(function () {
  "use strict";

  var script = document.currentScript;
  var locale = (script && script.getAttribute("data-locale")) || "fa";
  var baseUrl = (function () {
    if (!script || !script.src) return "";
    var url = new URL(script.src);
    return url.origin;
  })();

  var isRtl = locale === "fa";
  var STORAGE_KEY = "syniq_widget_open";

  // Load config then init
  fetch(baseUrl + "/api/widget-config")
    .then(function (r) { return r.json(); })
    .then(function (config) { init(config); })
    .catch(function () { init({}); });

  function init(config) {
    // Domain allowlist check
    var allowed = config.allowed_domains;
    if (Array.isArray(allowed) && allowed.length > 0) {
      var host = location.hostname;
      var ok = allowed.some(function (d) { return d === host; });
      if (!ok) return;
    }

    var colorPrimary = config.color_primary || "#1f7bb5";
    var colorLight = lightenHex(colorPrimary, 20);
    var position = config.position || "right";
    var positionOpp = position === "right" ? "left" : "right";
    var chatUrl = baseUrl + "/" + locale + "/chat?source=widget";

    // Inject styles
    var style = document.createElement("style");
    style.textContent = [
      "#syniq-bubble{position:fixed;bottom:24px;" + position + ":24px;z-index:999999;width:60px;height:60px;border-radius:50%;background:linear-gradient(145deg," + colorLight + "," + colorPrimary + ");box-shadow:0 8px 30px -8px " + hexAlpha(colorPrimary, 0.6) + ";border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:transform .2s,box-shadow .2s;}",
      "#syniq-bubble:hover{transform:scale(1.08);box-shadow:0 12px 36px -8px " + hexAlpha(colorPrimary, 0.7) + ";}",
      "#syniq-bubble svg{width:26px;height:26px;fill:#12161c;}",
      "#syniq-panel{position:fixed;bottom:96px;" + position + ":24px;z-index:999998;width:380px;height:600px;border-radius:20px;overflow:hidden;box-shadow:0 20px 60px -12px rgba(0,0,0,0.6);border:1px solid rgba(255,255,255,0.08);transform-origin:bottom " + position + ";transition:transform .25s cubic-bezier(.4,0,.2,1),opacity .25s;opacity:0;transform:scale(.92) translateY(12px);pointer-events:none;}",
      "#syniq-panel.syniq-open{opacity:1;transform:scale(1) translateY(0);pointer-events:auto;}",
      "#syniq-panel iframe{width:100%;height:100%;border:none;display:block;}",
      "@media(max-width:440px){#syniq-panel{width:calc(100vw - 32px);" + position + ":16px;bottom:88px;height:70vh;}}",
    ].join("");
    document.head.appendChild(style);

    var iconOpen = '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M20 2H4a2 2 0 0 0-2 2v18l4-4h14a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2zm-2 10H6v-2h12v2zm0-3H6V7h12v2z"/></svg>';
    var iconClose = '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M18 6 6 18M6 6l12 12" stroke="#12161c" stroke-width="2.5" stroke-linecap="round" fill="none"/></svg>';

    var bubble = document.createElement("button");
    bubble.id = "syniq-bubble";
    bubble.setAttribute("aria-label", locale === "fa" ? "چت با SYNIQ" : "Chat with SYNIQ");
    bubble.innerHTML = iconOpen;
    document.body.appendChild(bubble);

    var panel = document.createElement("div");
    panel.id = "syniq-panel";

    var iframe = document.createElement("iframe");
    iframe.setAttribute("title", "SYNIQ Chat");
    iframe.setAttribute("allow", "microphone");
    panel.appendChild(iframe);
    document.body.appendChild(panel);

    var isOpen = false;
    var iframeLoaded = false;

    function openPanel() {
      isOpen = true;
      panel.classList.add("syniq-open");
      bubble.innerHTML = iconClose;
      bubble.setAttribute("aria-label", locale === "fa" ? "بستن چت" : "Close chat");
      if (!iframeLoaded) {
        iframe.src = chatUrl;
        iframeLoaded = true;
      }
    }

    function closePanel() {
      isOpen = false;
      panel.classList.remove("syniq-open");
      bubble.innerHTML = iconOpen;
      bubble.setAttribute("aria-label", locale === "fa" ? "چت با SYNIQ" : "Chat with SYNIQ");
    }

    bubble.addEventListener("click", function () {
      if (isOpen) closePanel(); else openPanel();
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && isOpen) closePanel();
    });

    // Listen for feedback postMessage from iframe
    window.addEventListener("message", function (e) {
      if (e.origin !== baseUrl) return;
      var data = e.data;
      if (!data || data.type !== "syniq:feedback") return;
      // message_id and rating already submitted by chat-window; this is just for external integrations
    });
  }

  // --- Colour utilities ---

  function parseHex(hex) {
    hex = hex.replace("#", "");
    if (hex.length === 3) hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
    return [
      parseInt(hex.slice(0,2), 16),
      parseInt(hex.slice(2,4), 16),
      parseInt(hex.slice(4,6), 16),
    ];
  }

  function lightenHex(hex, amount) {
    var rgb = parseHex(hex);
    return "rgb(" +
      Math.min(255, rgb[0] + amount) + "," +
      Math.min(255, rgb[1] + amount) + "," +
      Math.min(255, rgb[2] + amount) + ")";
  }

  function hexAlpha(hex, alpha) {
    var rgb = parseHex(hex);
    return "rgba(" + rgb[0] + "," + rgb[1] + "," + rgb[2] + "," + alpha + ")";
  }
})();
