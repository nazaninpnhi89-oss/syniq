const EVENT = "funnelyze:toggle";

export function toggleFunnelyzePanel() {
  window.dispatchEvent(new Event(EVENT));
}

export function onFunnelyzePanelToggle(callback: () => void) {
  window.addEventListener(EVENT, callback);
  return () => window.removeEventListener(EVENT, callback);
}
