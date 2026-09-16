// Audio and Visual Button Effect System
// Provides pleasant, melodious tactile sound feedback and smooth button animations without double-firing

// 65ms soft, pleasant musical bubble pop / kalimba tap (16-bit PCM WAV)
const PLEASANT_MELODIC_WAV =
  'data:audio/wav;base64,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';

// Audio pool for instantaneous single-shot playback
const AUDIO_POOL_SIZE = 6;
const audioPool: HTMLAudioElement[] = [];
let audioPoolIndex = 0;

if (typeof window !== 'undefined') {
  for (let i = 0; i < AUDIO_POOL_SIZE; i++) {
    try {
      const audio = new Audio(PLEASANT_MELODIC_WAV);
      audio.volume = 0.38; // Gentle, comfortable listening volume
      audio.preload = 'auto';
      audioPool.push(audio);
    } catch {
      // Ignore in non-browser environments
    }
  }
}

let audioCtx: AudioContext | null = null;
let lastSoundPlayTime = 0;

/**
 * Resumes AudioContext on user interaction
 */
function unlockAudioContext(): void {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    if (!audioCtx) {
      audioCtx = new AudioCtx();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
  } catch {
    // Ignore audio errors
  }
}

/**
 * Procedurally synthesizes a soft, pleasant musical water-drop / marimba tap
 */
function playWebAudioMelodicPop(volume = 0.38): void {
  if (!audioCtx || audioCtx.state !== 'running') return;
  try {
    const now = audioCtx.currentTime;

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    // Gentle musical bubble pop: 640Hz to 480Hz
    osc.type = 'sine';
    osc.frequency.setValueAtTime(640, now);
    osc.frequency.exponentialRampToValueAtTime(480, now + 0.055);

    // Soft attack (prevents harsh click) and smooth exponential decay
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(volume * 0.45, now + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start(now);
    osc.stop(now + 0.065);
  } catch {
    // Fail silently
  }
}

/**
 * Plays a single, pleasant, soothing button click sound.
 * Guarantees zero double-firing.
 */
export function playButtonClickSound(volume = 0.38): void {
  try {
    const nowTs = Date.now();
    // Strict debounce: strictly 1 sound per 180ms
    if (nowTs - lastSoundPlayTime < 180) {
      return;
    }
    lastSoundPlayTime = nowTs;

    // Prefer Web Audio API if running (zero latency)
    unlockAudioContext();
    if (audioCtx && audioCtx.state === 'running') {
      playWebAudioMelodicPop(volume);
      return; // Single sound source!
    }

    // Otherwise use preloaded pleasant audio pool
    if (audioPool.length > 0) {
      const audio = audioPool[audioPoolIndex];
      audioPoolIndex = (audioPoolIndex + 1) % audioPool.length;
      audio.currentTime = 0;
      audio.volume = volume;
      const p = audio.play();
      if (p !== undefined) {
        p.catch(() => {});
      }
    }
  } catch {
    // Fail gracefully
  }
}

/**
 * Checks if background is dark for ripple contrast
 */
function isDarkBackground(colorStr: string): boolean {
  if (!colorStr || colorStr === 'transparent' || colorStr.includes('rgba(0, 0, 0, 0)')) {
    return false;
  }
  const match = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (match) {
    const r = parseInt(match[1], 10);
    const g = parseInt(match[2], 10);
    const b = parseInt(match[3], 10);
    const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
    return luminance < 140;
  }
  return false;
}

/**
 * Creates smooth visual feedback on the button
 */
function triggerButtonVisualEffect(button: HTMLElement, e: MouseEvent | PointerEvent | TouchEvent): void {
  try {
    // 1. Tactile Press Animation
    const existingTimer = (button as unknown as { __pressTimer?: ReturnType<typeof setTimeout> }).__pressTimer;
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    button.classList.add('btn-press-active');
    (button as unknown as { __pressTimer?: ReturnType<typeof setTimeout> }).__pressTimer = setTimeout(() => {
      button.classList.remove('btn-press-active');
      delete (button as unknown as { __pressTimer?: ReturnType<typeof setTimeout> }).__pressTimer;
    }, 160);

    // 2. High-Contrast Expanding Ripple
    const rect = button.getBoundingClientRect();
    let clientX = rect.left + rect.width / 2;
    let clientY = rect.top + rect.height / 2;

    if ('clientX' in e && e.clientX && e.clientX > 0) {
      clientX = e.clientX;
      clientY = e.clientY;
    } else if ('touches' in e && e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    }

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    const compStyle = window.getComputedStyle(button);
    if (compStyle.position === 'static') {
      button.style.position = 'relative';
    }

    let container = button.querySelector(':scope > .btn-ripple-container') as HTMLElement | null;
    if (!container) {
      container = document.createElement('span');
      container.className = 'btn-ripple-container';
      button.appendChild(container);
    }

    const ripple = document.createElement('span');
    const diameter = Math.max(rect.width, rect.height) * 2;
    ripple.className = 'btn-ripple-wave';

    const bg = compStyle.backgroundColor || '';
    if (isDarkBackground(bg)) {
      ripple.classList.add('btn-ripple-light');
    } else {
      ripple.classList.add('btn-ripple-dark');
    }

    ripple.style.width = `${diameter}px`;
    ripple.style.height = `${diameter}px`;
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;

    container.appendChild(ripple);

    setTimeout(() => {
      ripple.remove();
      if (container && container.children.length === 0) {
        container.remove();
      }
    }, 400);
  } catch {
    // Fail silently
  }
}

/**
 * Initializes global button click audio and visual tactile effects.
 * Includes strict debouncing to eliminate duplicate firing between pointerdown and click.
 */
export function initGlobalButtonEffects(): () => void {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return () => {};
  }

  // Pre-unlock audio on any initial interaction
  const unlockEvents = ['click', 'touchstart', 'touchend', 'pointerdown', 'mousedown', 'keydown'];
  const handleUnlock = () => {
    unlockAudioContext();
  };
  unlockEvents.forEach((evt) => {
    window.addEventListener(evt, handleUnlock, { capture: true, passive: true });
  });

  let lastButtonTarget: Element | null = null;
  let lastEventTime = 0;

  const handleInteraction = (e: MouseEvent | PointerEvent | TouchEvent) => {
    const rawTarget = e.target as HTMLElement | null;
    if (!rawTarget) return;

    const button = rawTarget.closest(
      'button, [role="button"], input[type="button"], input[type="submit"], input[type="reset"], .cursor-pointer[data-tab], a[role="button"]'
    ) as HTMLElement | null;

    if (!button) return;

    // Skip disabled buttons
    if (
      (button as HTMLButtonElement).disabled ||
      button.getAttribute('aria-disabled') === 'true' ||
      button.classList.contains('pointer-events-none')
    ) {
      return;
    }

    const now = Date.now();
    // Strict 320ms debounce per button eliminates double-firing between pointerdown and click
    if (lastButtonTarget === button && now - lastEventTime < 320) {
      return;
    }
    // Global 130ms debounce across any button
    if (now - lastEventTime < 130) {
      return;
    }

    lastButtonTarget = button;
    lastEventTime = now;

    // 1. Play soft, pleasant sound
    playButtonClickSound();

    // 2. Trigger visual press
    triggerButtonVisualEffect(button, e);
  };

  // Listen on pointerdown for immediate tactile responsiveness
  document.addEventListener('pointerdown', handleInteraction, { capture: true, passive: true });
  // Fallback on click for keyboard/enter navigation (debounced from pointerdown)
  document.addEventListener('click', handleInteraction, { capture: true, passive: true });

  return () => {
    document.removeEventListener('pointerdown', handleInteraction, { capture: true });
    document.removeEventListener('click', handleInteraction, { capture: true });
    unlockEvents.forEach((evt) => {
      window.removeEventListener(evt, handleUnlock, { capture: true });
    });
  };
}
