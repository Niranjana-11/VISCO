/**
 * VISCO: THE SPEED BUMP
 * Final Consolidated MVP Script — Settings-aware version
 */

// --- 1. CONFIGURATION & STATE ---
let secondsActive = 0;
let frictionEnabled = false;
let lockoutActive = false;
let viscoEnabled = true;

// Defaults (overridden by user settings on load)
let POPUP_START      = 30;
let BLUR_START       = 40;
let LOCKOUT_START    = 85;
let LOCKOUT_DURATION = 3600;

// --- 2. LOAD SETTINGS FROM STORAGE ---
const DEFAULTS = {
  enabled: true,
  popupStart: 30,
  blurStart: 40,
  lockoutStart: 85,
  lockoutDuration: 3600,
};

function applySettings(s) {
  viscoEnabled     = s.enabled    ?? DEFAULTS.enabled;
  POPUP_START      = s.popupStart ?? DEFAULTS.popupStart;
  BLUR_START       = s.blurStart  ?? DEFAULTS.blurStart;
  LOCKOUT_START    = s.lockoutStart ?? DEFAULTS.lockoutStart;
  LOCKOUT_DURATION = s.lockoutDuration ?? DEFAULTS.lockoutDuration;
}

chrome.storage.sync.get(DEFAULTS, (result) => {
  applySettings(result);
});

// Listen for live updates from popup
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'VISCO_SETTINGS_UPDATED') {
    applySettings(msg.settings);
    if (!msg.settings.enabled) resetFriction();
  }
});

// --- 3. INITIALIZE DOM ELEMENTS ---
const overlay = document.createElement('div');
overlay.id = 'speed-bump-overlay';
document.body.appendChild(overlay);

const popup = document.createElement('div');
popup.id = 'speed-bump-timer-popup';
popup.innerHTML = `
    <h2>Mindfulness Check</h2>
    <p>You've been here for a while. Is this intentional?</p>
    <div class="speed-bump-bar"><div class="speed-bump-progress"></div></div>
`;
document.body.appendChild(popup);

// --- 4. PERSISTENCE CHECK (Anti-Refresh) ---
chrome.storage.local.get(['lockoutEndTime'], (result) => {
    const now = Date.now();
    if (result.lockoutEndTime && now < result.lockoutEndTime) {
        const remaining = Math.round((result.lockoutEndTime - now) / 1000);
        startHardLockout(remaining);
    }
});

// --- 5. HELPER FUNCTIONS ---

function isEducationalContent() {
    const descriptionText = document.querySelector("#description-inline-expander, #description")?.innerText || "";
    const categoryLabel = document.querySelector("a[href*='category=Education']");
    const tags = Array.from(document.querySelectorAll("a[href*='/hashtag/']")).map(t => t.innerText.toLowerCase());
    const eduHashtags = ["#education", "#learning", "#tutorial", "#science", "#coding", "#history", "#productivity"];
    const hasEduHashtag = tags.some(tag => eduHashtags.includes(tag));
    return !!categoryLabel || hasEduHashtag || descriptionText.includes("Category: Education");
}

function handleScrollFriction(e) {
    window.scrollBy(0, -e.deltaY * 0.6); 
}

function resetFriction() {
    document.body.style.filter = "none";
    document.body.style.pointerEvents = "auto";
    document.body.style.overflow = "auto";
    overlay.style.display = 'none';
    popup.classList.remove('show');
    if (frictionEnabled) {
        window.removeEventListener('wheel', handleScrollFriction);
        frictionEnabled = false;
    }
}

// --- 6. MAIN ENGINE ---

function updateLogic() {
    if (lockoutActive) return;
    if (!viscoEnabled) return;

    if (isEducationalContent()) {
        secondsActive = 0;
        resetFriction();
        return;
    }

    secondsActive++;

    // PHASE 1: Show Popup
    if (secondsActive >= POPUP_START && secondsActive < BLUR_START) {
        popup.classList.add('show');
    } 
    
    // PHASE 2: Blur & Friction
    else if (secondsActive >= BLUR_START && secondsActive < LOCKOUT_START) {
        if (popup.classList.contains('show')) popup.classList.remove('show');
        
        const blurWindow = LOCKOUT_START - BLUR_START;
        let blurIntensity = (secondsActive - BLUR_START) / (blurWindow / 9);
        document.body.style.filter = `blur(${blurIntensity}px) grayscale(40%)`;
        
        const progress = document.querySelector('.speed-bump-progress');
        if (progress) progress.style.width = `${((secondsActive - BLUR_START) / blurWindow) * 100}%`;

        if (!frictionEnabled) {
            window.addEventListener('wheel', handleScrollFriction, { passive: false });
            frictionEnabled = true;
        }
    }

    // PHASE 3: Hard Lockout
    else if (secondsActive >= LOCKOUT_START) {
        startHardLockout();
    }
}

function startHardLockout(resumeDuration = LOCKOUT_DURATION) {
    lockoutActive = true;
    
    const endTime = Date.now() + (resumeDuration * 1000);
    chrome.storage.local.set({ lockoutEndTime: endTime });

    window.removeEventListener('wheel', handleScrollFriction);
    overlay.style.display = 'flex';
    document.body.style.pointerEvents = "none";
    document.body.style.overflow = "hidden";

    let remaining = resumeDuration;
    
    const lockoutInterval = setInterval(() => {
        remaining--;
        
        const hrs = Math.floor(remaining / 3600);
        const mins = Math.floor((remaining % 3600) / 60);
        const secs = (remaining % 60).toString().padStart(2, '0');

        overlay.innerHTML = `
            <div style="text-align:center; padding: 40px; animation: fadeIn 1s;">
                <h1 style="color: #ff4757; font-size: 3rem;">Session Terminated</h1>
                <p style="font-size: 1.2rem;">Doomscroll detected. Your dopamine receptors need a break.</p>
                <div style="font-size: 6rem; font-weight: bold; margin: 30px 0;">${hrs}:${mins}:${secs}</div>
                <p style="opacity: 0.6;">You can try again in a bit. Go outside.</p>
            </div>
        `;

        document.querySelectorAll('video').forEach(v => {
            v.pause();
            v.currentTime = 0;
        });

        if (remaining <= 0) {
            clearInterval(lockoutInterval);
            chrome.storage.local.remove('lockoutEndTime');
            lockoutActive = false;
            secondsActive = 0;
            resetFriction();
            location.reload();
        }
    }, 1000);
}

// Global Heartbeat
setInterval(updateLogic, 1000);

// SPA Navigation Handler
let lastUrl = location.href;
new MutationObserver(() => {
    if (location.href !== lastUrl) {
        lastUrl = location.href;
        if (isEducationalContent()) {
            resetFriction();
            secondsActive = 0;
        }
    }
}).observe(document, { subtree: true, childList: true });
