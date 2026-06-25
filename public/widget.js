(function () {
  "use strict";

  var script = document.currentScript;
  var locale = (script && script.getAttribute("data-locale")) || "fa";
  var baseUrl = (function () {
    if (!script || !script.src) return "";
    var url = new URL(script.src);
    return url.origin;
  })();

  var chatUrl = baseUrl + "/" + locale + "/chat?source=widget";
  var isRtl = locale === "fa";
  var STORAGE_KEY = "syniq_widget_open";

  // Inject styles
  var style = document.createElement("style");
  style.textContent = [
    "#syniq-bubble{position:fixed;bottom:24px;" + (isRtl ? "left" : "right") + ":24px;z-index:999999;width:60px;height:60px;border-radius:50%;background:linear-gradient(145deg,#3db2ec,#1f7bb5);box-shadow:0 8px 30px -8px rgba(61,178,236,0.6);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:transform .2s,box-shadow .2s;}",
    "#syniq-bubble:hover{transform:scale(1.08);box-shadow:0 12px 36px -8px rgba(61,178,236,0.7);}",
    "#syniq-bubble svg{width:26px;height:26px;fill:#12161c;}",
    "#syniq-panel{position:fixed;bottom:96px;" + (isRtl ? "left" : "right") + ":24px;z-index:999998;width:380px;height:600px;border-radius:20px;overflow:hidden;box-shadow:0 20px 60px -12px rgba(0,0,0,0.6);border:1px solid rgba(255,255,255,0.08);transform-origin:bottom " + (isRtl ? "left" : "right") + ";transition:transform .25s cubic-bezier(.4,0,.2,1),opacity .25s;opacity:0;transform:scale(.92) translateY(12px);pointer-events:none;}",
    "#syniq-panel.syniq-open{opacity:1;transform:scale(1) translateY(0);pointer-events:auto;}",
    "#syniq-panel iframe{width:100%;height:100%;border:none;display:block;}",
    "@media(max-width:440px){#syniq-panel{width:calc(100vw - 32px);" + (isRtl ? "left" : "right") + ":16px;bottom:88px;height:70vh;}}",
  ].join("");
  document.head.appendChild(style);

  // Chat icon SVG
  var iconOpen = '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M20 2H4a2 2 0 0 0-2 2v18l4-4h14a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2zm-2 10H6v-2h12v2zm0-3H6V7h12v2z"/></svg>';
  var iconClose = '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M18 6 6 18M6 6l12 12" stroke="#12161c" stroke-width="2.5" stroke-linecap="round" fill="none"/></svg>';

  // Create bubble button
  var bubble = document.createElement("button");
  bubble.id = "syniq-bubble";
  bubble.setAttribute("aria-label", locale === "fa" ? "چت با SYNIQ" : "Chat with SYNIQ");
  bubble.innerHTML = iconOpen;
  document.body.appendChild(bubble);

  // Create panel
  var panel = document.createElement("div");
  panel.id = "syniq-panel";

  var iframe = document.createElement("iframe");
  iframe.setAttribute("title", "SYNIQ Chat");
  iframe.setAttribute("allow", "microphone");
  panel.appendChild(iframe);
  document.body.appendChild(panel);

  var isOpen = false;
  var iframeLoaded = false;

  function open() {
    isOpen = true;
    panel.classList.add("syniq-open");
    bubble.innerHTML = iconClose;
    bubble.setAttribute("aria-label", locale === "fa" ? "بستن چت" : "Close chat");
    if (!iframeLoaded) {
      iframe.src = chatUrl;
      iframeLoaded = true;
    }
  }

  function close() {
    isOpen = false;
    panel.classList.remove("syniq-open");
    bubble.innerHTML = iconOpen;
    bubble.setAttribute("aria-label", locale === "fa" ? "چت با SYNIQ" : "Chat with SYNIQ");
  }

  bubble.addEventListener("click", function () {
    if (isOpen) close(); else open();
  });

  // Close on Escape
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && isOpen) close();
  });
})();
