/** Tiny HTML splash helpers (before Phaser paints). */
export function setBootHint(text: string) {
  const el = document.getElementById("boot-hint");
  if (el) el.textContent = text;
}

export function hideBoot() {
  const el = document.getElementById("boot");
  if (!el) return;
  el.classList.add("hide");
  window.setTimeout(() => el.remove(), 400);
}
