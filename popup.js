/**
 * VISCO — popup.js
 * Settings UI with PIN-lock protection.
 *
 * Flow:
 *  - No PIN set    → user can freely adjust sliders and save; PIN section prompts them to set one
 *  - PIN set       → sliders are still readable/adjustable BUT:
 *      • "Reset" requires PIN verification first
 *      • "Disable" (in locked banner) requires PIN verification first
 *      • Saving new settings does NOT require PIN (they already chose to use the extension)
 *      • Changing the PIN requires the old PIN first
 */

// ── Storage key for hashed PIN ──────────────────────────────
// We store a simple hash (not cryptographic, just obfuscated) to prevent
// plain-text PIN storage. Good enough for a browser extension.
function hashPin(pin) {
  // djb2-style hash → base36 string
  let h = 5381;
  for (let i = 0; i < pin.length; i++) h = ((h << 5) + h) + pin.charCodeAt(i);
  return (h >>> 0).toString(36);
}

const DEFAULTS = {
  enabled: true,
  popupStart: 30,
  blurStart: 40,
  lockoutStart: 85,
  lockoutDuration: 3600,
  pinHash: '',   // empty = no PIN set
};

// ── DOM refs ────────────────────────────────────────────────
const noPinBanner   = document.getElementById('noPinBanner');
const lockedBanner  = document.getElementById('lockedBanner');

const sliderPopup   = document.getElementById('popupStart');
const sliderBlur    = document.getElementById('blurStart');
const sliderLockout = document.getElementById('lockoutStart');
const valPopup      = document.getElementById('popupVal');
const valBlur       = document.getElementById('blurVal');
const valLockout    = document.getElementById('lockVal');

const durButtons    = document.querySelectorAll('.dur-btn');
const btnSave       = document.getElementById('btnSave');
const btnReset      = document.getElementById('btnReset');
const btnDisable    = document.getElementById('btnDisable');
const toast         = document.getElementById('toast');

const pinInput      = document.getElementById('pinInput');
const pinConfirm    = document.getElementById('pinConfirm');
const pinSetError   = document.getElementById('pinSetError');
const pinSection    = document.getElementById('pinSection');
const pinSectionLabel = document.getElementById('pinSectionLabel');
const pinSectionDesc  = document.getElementById('pinSectionDesc');

// Timeline
const tlL1 = document.getElementById('tlL1');
const tlL2 = document.getElementById('tlL2');
const tlL3 = document.getElementById('tlL3');

// PIN Overlay
const pinOverlay      = document.getElementById('pinOverlay');
const pinOverlayTitle = document.getElementById('pinOverlayTitle');
const pinOverlayIcon  = document.getElementById('pinOverlayIcon');
const pinOverlaySub   = document.getElementById('pinOverlaySub');
const pinDots         = [0,1,2,3].map(i => document.getElementById('d' + i));
const pinError        = document.getElementById('pinError');
const numDel          = document.getElementById('numDel');
const btnPinCancel    = document.getElementById('btnPinCancel');

let selectedDuration = DEFAULTS.lockoutDuration;
let storedPinHash    = '';
let pinBuffer        = '';
let pinResolve       = null;   // promise resolver for PIN entry
let pinMode          = 'verify'; // 'verify' | 'change-old' | 'change-new' | 'change-confirm'
let pendingNewPin    = '';

// ── Load settings ────────────────────────────────────────────
chrome.storage.sync.get(DEFAULTS, (stored) => {
  storedPinHash      = stored.pinHash || '';
  selectedDuration   = stored.lockoutDuration;

  sliderPopup.value   = stored.popupStart;
  sliderBlur.value    = stored.blurStart;
  sliderLockout.value = stored.lockoutStart;

  updateAllLabels();
  syncDurButtons();
  updateTimeline();
  updatePinUI();
});

// ── PIN UI state ─────────────────────────────────────────────
function updatePinUI() {
  const hasPIN = !!storedPinHash;

  noPinBanner.classList.toggle('visible', !hasPIN);
  lockedBanner.classList.toggle('visible', hasPIN);

  if (hasPIN) {
    // Show "change PIN" UI instead of "set PIN"
    pinSectionLabel.textContent = 'Change Security PIN';
    pinSectionDesc.textContent  = 'Enter your current PIN then choose a new one.';
    pinInput.placeholder        = 'Current PIN';
    pinConfirm.placeholder      = 'New PIN';
  } else {
    pinSectionLabel.textContent = 'Security PIN';
    pinSectionDesc.textContent  = 'Create a 4-digit PIN to lock your settings. Required to disable or reset Visco.';
    pinInput.placeholder        = 'New PIN';
    pinConfirm.placeholder      = 'Confirm PIN';
  }
}

// ── Sliders ───────────────────────────────────────────────────
sliderPopup.addEventListener('input', () => {
  if (+sliderPopup.value >= +sliderBlur.value)
    sliderBlur.value = +sliderPopup.value + 10;
  updateAllLabels(); updateTimeline();
});
sliderBlur.addEventListener('input', () => {
  if (+sliderBlur.value <= +sliderPopup.value)
    sliderPopup.value = +sliderBlur.value - 10;
  if (+sliderBlur.value >= +sliderLockout.value)
    sliderLockout.value = +sliderBlur.value + 15;
  updateAllLabels(); updateTimeline();
});
sliderLockout.addEventListener('input', () => {
  if (+sliderLockout.value <= +sliderBlur.value) {
    sliderBlur.value = +sliderLockout.value - 15;
    if (+sliderBlur.value <= +sliderPopup.value)
      sliderPopup.value = +sliderBlur.value - 10;
  }
  updateAllLabels(); updateTimeline();
});

function updateAllLabels() {
  valPopup.textContent   = sliderPopup.value + 's';
  valBlur.textContent    = sliderBlur.value + 's';
  valLockout.textContent = sliderLockout.value + 's';
  tlL1.textContent       = sliderPopup.value + 's';
  tlL2.textContent       = sliderBlur.value + 's';
  tlL3.textContent       = sliderLockout.value + 's';
}

function updateTimeline() {
  const p = +sliderPopup.value, b = +sliderBlur.value, l = +sliderLockout.value;
  const total = l + 10;
  const pct = v => (v / total * 100).toFixed(1) + '%';
  document.getElementById('tlSafe').style.width  = pct(p);
  document.getElementById('tlPopup').style.width = pct(b - p);
  document.getElementById('tlBlur').style.width  = pct(l - b);
  tlL1.style.left = pct(p);
  tlL2.style.left = pct(b);
  tlL3.style.left = pct(l);
}

// ── Duration buttons ──────────────────────────────────────────
durButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    durButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    selectedDuration = +btn.dataset.mins * 60;
  });
});
function syncDurButtons() {
  const mins = selectedDuration / 60;
  durButtons.forEach(btn => btn.classList.toggle('active', +btn.dataset.mins === mins));
}

// ── Save ───────────────────────────────────────────────────────
btnSave.addEventListener('click', async () => {
  // Handle PIN change/setup if fields are filled
  const pinA = pinInput.value.trim();
  const pinB = pinConfirm.value.trim();

  if (pinA || pinB) {
    const pinOk = await handlePinSetup(pinA, pinB);
    if (!pinOk) return; // abort save if PIN setup failed
  }

  const settings = {
    enabled: true,
    popupStart:       +sliderPopup.value,
    blurStart:        +sliderBlur.value,
    lockoutStart:     +sliderLockout.value,
    lockoutDuration:  selectedDuration,
    pinHash:          storedPinHash,
  };

  chrome.storage.sync.set(settings, () => {
    showToast('✓ SETTINGS SAVED', 'success');
    pinInput.value   = '';
    pinConfirm.value = '';
    pinSetError.textContent = '';
    notifyContentScript(settings);
  });
});

async function handlePinSetup(a, b) {
  // Validate: digits only, 4 chars
  if (!/^\d{4}$/.test(a) || !/^\d{4}$/.test(b)) {
    pinSetError.textContent = 'PINs must be exactly 4 digits.';
    return false;
  }

  if (storedPinHash) {
    // Changing PIN: a = old PIN, b = new PIN
    if (hashPin(a) !== storedPinHash) {
      pinSetError.textContent = 'Current PIN is incorrect.';
      return false;
    }
    storedPinHash = hashPin(b);
    showToast('🔑 PIN UPDATED', 'success');
  } else {
    // Setting new PIN: a = new PIN, b = confirm
    if (a !== b) {
      pinSetError.textContent = 'PINs do not match.';
      return false;
    }
    storedPinHash = hashPin(a);
    showToast('🔒 PIN SET — SETTINGS LOCKED', 'success');
  }

  updatePinUI();
  return true;
}

// ── Reset (requires PIN if set) ───────────────────────────────
btnReset.addEventListener('click', async () => {
  if (storedPinHash) {
    const verified = await promptPIN('Reset Settings', 'Enter your PIN to reset all settings to defaults.');
    if (!verified) return;
  }

  // Apply defaults
  sliderPopup.value   = DEFAULTS.popupStart;
  sliderBlur.value    = DEFAULTS.blurStart;
  sliderLockout.value = DEFAULTS.lockoutStart;
  selectedDuration    = DEFAULTS.lockoutDuration;
  // Keep PIN hash — reset does NOT remove PIN
  updateAllLabels();
  syncDurButtons();
  updateTimeline();
  showToast('↺ RESET TO DEFAULTS', 'success');
});

// ── Disable (requires PIN) ────────────────────────────────────
btnDisable.addEventListener('click', async () => {
  const verified = await promptPIN('Disable Visco', 'Enter your PIN to turn off Visco on all sites.');
  if (!verified) return;

  const settings = { ...DEFAULTS, pinHash: storedPinHash, enabled: false };
  chrome.storage.sync.set(settings, () => {
    notifyContentScript(settings);
    showToast('⏸ VISCO DISABLED', 'error');
    // Update status badge
    document.getElementById('statusDot').style.background = '#555';
    document.getElementById('statusDot').style.boxShadow = 'none';
    document.getElementById('statusDot').style.animation = 'none';
    document.getElementById('statusText').style.color = '#555';
    document.getElementById('statusText').textContent = 'PAUSED';
  });
});

// ── PIN overlay logic ─────────────────────────────────────────
/**
 * Shows PIN overlay and returns a promise that resolves true/false.
 */
function promptPIN(title, subtitle) {
  pinOverlayTitle.textContent = title;
  pinOverlaySub.textContent   = subtitle;
  pinBuffer = '';
  pinError.textContent = '';
  updatePinDots();
  pinOverlay.classList.add('visible');

  return new Promise(resolve => { pinResolve = resolve; });
}

function updatePinDots() {
  pinDots.forEach((dot, i) => dot.classList.toggle('filled', i < pinBuffer.length));
}

function shakeDots() {
  pinDots.forEach(d => {
    d.classList.remove('shake');
    void d.offsetWidth; // reflow
    d.classList.add('shake');
  });
}

// Number pad input
document.querySelectorAll('.num-btn[data-n]').forEach(btn => {
  btn.addEventListener('click', () => {
    if (pinBuffer.length >= 4) return;
    pinBuffer += btn.dataset.n;
    updatePinDots();
    pinError.textContent = '';

    if (pinBuffer.length === 4) {
      setTimeout(() => verifyPinEntry(), 150);
    }
  });
});

numDel.addEventListener('click', () => {
  pinBuffer = pinBuffer.slice(0, -1);
  updatePinDots();
  pinError.textContent = '';
});

function verifyPinEntry() {
  if (hashPin(pinBuffer) === storedPinHash) {
    pinOverlay.classList.remove('visible');
    pinBuffer = '';
    if (pinResolve) { pinResolve(true); pinResolve = null; }
  } else {
    pinError.textContent = 'INCORRECT PIN';
    shakeDots();
    pinBuffer = '';
    setTimeout(() => { updatePinDots(); }, 400);
  }
}

btnPinCancel.addEventListener('click', () => {
  pinOverlay.classList.remove('visible');
  pinBuffer = '';
  if (pinResolve) { pinResolve(false); pinResolve = null; }
});

// ── Helpers ───────────────────────────────────────────────────
function notifyContentScript(settings) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, { type: 'VISCO_SETTINGS_UPDATED', settings })
        .catch(() => {});
    }
  });
}

let toastTimer;
function showToast(msg, type = 'success') {
  toast.textContent = msg;
  toast.className = `toast ${type} show`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2200);
}
