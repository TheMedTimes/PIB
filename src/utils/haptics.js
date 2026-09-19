// The Vibration API is only supported on Android browsers, not iOS Safari
// (including installed iOS PWAs). Calls are guarded and silently do
// nothing where unsupported, so this is safe to call everywhere.

function vibrate(pattern) {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try {
      navigator.vibrate(pattern);
    } catch {
      /* ignore */
    }
  }
}

export const hapticTap = () => vibrate(8);
export const hapticCorrect = () => vibrate([10, 30, 10]);
export const hapticWrong = () => vibrate(40);
export const hapticComplete = () => vibrate([10, 40, 10, 40, 20]);
