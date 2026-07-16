/** Safe haptic pulse for mobile / Yandex WebView. */
export function haptic(ms = 16): void {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(Math.max(8, Math.min(40, ms)));
    }
  } catch {
    /* ignore unsupported */
  }
}

export function hapticCombo(tier: number): void {
  if (tier >= 2) haptic(28);
  else if (tier >= 1) haptic(18);
  else haptic(12);
}
