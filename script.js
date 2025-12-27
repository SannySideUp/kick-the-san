/* =========================
   Private tracking (no login)
   ========================= */

const TRACK_ENDPOINT = window.TRACK_ENDPOINT;

function getOrCreateDeviceId() {
  const key = "san_device_id";
  let v = localStorage.getItem(key);
  if (!v) {
    v = (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random());
    localStorage.setItem(key, v);
  }
  return v;
}

const ANALYTICS = {
  deviceId: getOrCreateDeviceId(),
  sessionId: (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random()),
  startedAt: Date.now(),

  engagedMs: 0,
  _activeStart: null,
  _activeEndAt: 0,
  _gapMs: 2000,

  hitsTotal: 0,
  hitsByTool: { punch: 0, bat: 0, knife: 0, gun: 0, tomato: 0 },

  _pendingHits: 0,
  _pendingByTool: { punch: 0, bat: 0, knife: 0, gun: 0, tomato: 0 },
  _flushTimer: null,

  blocked: false,
  _sentEnd: false
};

async function postEvent(event_type, payload) {
  if (!TRACK_ENDPOINT) return { ok: false, blocked: false };

  try {
    const res = await fetch(TRACK_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event_type,
        session_id: ANALYTICS.sessionId,
        device_id: ANALYTICS.deviceId,
        payload
      }),
      keepalive: true
    });

    if (res.status === 403) return { ok: false, blocked: true };
    return { ok: res.ok, blocked: false };
  } catch {
    // Network fail should NOT freeze gameplay.
    return { ok: false, blocked: false };
  }
}

function markBlocked() {
  ANALYTICS.blocked = true;

  // Block means no interaction at all.
  setToolButtonsEnabled(false);
  if (resetBtn) resetBtn.disabled = true;

  showSpeech("Access blocked.", 3000);
}

async function analyticsStart() {
  const r = await postEvent("session_start", {
    path: location.pathname,
    referrer: document.referrer || null,
    user_agent: navigator.userAgent
  });
  if (r.blocked) markBlocked();
}

function analyticsHit(toolName) {
  ANALYTICS.hitsTotal++;
  if (ANALYTICS.hitsByTool[toolName] !== undefined) ANALYTICS.hitsByTool[toolName]++;

  const now = Date.now();
  if (ANALYTICS._activeStart === null) {
    ANALYTICS._activeStart = now;
    ANALYTICS._activeEndAt = now + ANALYTICS._gapMs;
  } else if (now <= ANALYTICS._activeEndAt) {
    ANALYTICS._activeEndAt = now + ANALYTICS._gapMs;
  } else {
    ANALYTICS.engagedMs += Math.max(0, ANALYTICS._activeEndAt - ANALYTICS._activeStart);
    ANALYTICS._activeStart = now;
    ANALYTICS._activeEndAt = now + ANALYTICS._gapMs;
  }

  ANALYTICS._pendingHits++;
  if (ANALYTICS._pendingByTool[toolName] !== undefined) ANALYTICS._pendingByTool[toolName]++;

  if (!ANALYTICS._flushTimer) {
    ANALYTICS._flushTimer = setTimeout(flushHitBatch, 4000);
  }
}

function finalizeEngagement() {
  if (ANALYTICS._activeStart !== null) {
    ANALYTICS.engagedMs += Math.max(0, ANALYTICS._activeEndAt - ANALYTICS._activeStart);
    ANALYTICS._activeStart = null;
    ANALYTICS._activeEndAt = 0;
  }
}

async function flushHitBatch() {
  if (ANALYTICS._flushTimer) {
    clearTimeout(ANALYTICS._flushTimer);
    ANALYTICS._flushTimer = null;
  }
  if (ANALYTICS._pendingHits <= 0) return;

  const payload = {
    hits: ANALYTICS._pendingHits,
    by_tool: { ...ANALYTICS._pendingByTool }
  };

  ANALYTICS._pendingHits = 0;
  ANALYTICS._pendingByTool = { punch: 0, bat: 0, knife: 0, gun: 0, tomato: 0 };

  const r = await postEvent("hit_batch", payload);
  if (r.blocked) markBlocked();
}

async function analyticsEndOnce() {
  if (ANALYTICS._sentEnd) return;
  ANALYTICS._sentEnd = true;

  finalizeEngagement();
  await flushHitBatch();

  const r = await postEvent("session_end", {
    duration_ms: Date.now() - ANALYTICS.startedAt,
    engaged_ms: ANALYTICS.engagedMs,
    hits_total: ANALYTICS.hitsTotal,
    hits_by_tool: ANALYTICS.hitsByTool
  });

  if (r.blocked) markBlocked();
}

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") analyticsEndOnce();
});
window.addEventListener("pagehide", analyticsEndOnce);
window.addEventListener("beforeunload", analyticsEndOnce);

/* =========================
   Game code
   ========================= */

const playCard = document.getElementById("playCard");
const buddy = document.getElementById("buddy");
const healthFill = document.getElementById("health-fill");
const healthText = document.getElementById("health-text");
const speech = document.getElementById("speech");
const toolButtons = document.querySelectorAll(".tool-btn");
const resetBtn = document.getElementById("reset-btn");
const mouth = document.querySelector(".mouth");
const muteBtn = document.getElementById("mute-btn");
const cssCat = document.getElementById("cssCat");

let cryingInterval = null;
let speechTimer = null;

let health = 100;
let currentTool = "punch";
let isMuted = false;
let hasPlayedDeathSound = false;

const stats = {
  hitsTotal: 0,
  toolHits: { punch: 0, bat: 0, knife: 0, gun: 0, tomato: 0 },
  firstToolUsed: null,
  resets: 0,
  combo: 0,
  lastHitAt: 0
};

let xrpnTapCount = 0;
let xrpnTapTimer = null;
let xrpnShieldNextHit = false;

const tools = {
  punch: { name: "Punch", damage: 10, messages: ["Ouch! That gonna leave a purple mark!","Yara, your not hitting hard enough!","I can't feel my face"] },
  bat: { name: "Bat", damage: 15, messages: ["Yara, I crave the cruelty of your bat!","I think you broke my legs!","okay that one did not hurt."] },
  knife: { name: "Knife", damage: 20, messages: ["NOOO my hands, now I can't text Yara.","Yara I think thats enough, you don't need two kidneys.","Yara please no more."] },
  gun: { name: "Gun", damage: 99, messages: ["Just finish it off im already dying here.","I did not know you hated me that much.","You might as well just delete me from the screen."] },
  tomato: { name: "Tomato", damage: 5, messages: ["Ew. Tomato juice in my eyes.","That was disrespectful.","Not the face 😭"] }
};

const xrpnComments = [
  "Xrpn is taking notes.",
  "Xrpn approves this choice.",
  "This is why Xrpn doesn’t trust humans.",
  "Xrpn saw that coming.",
  "Xrpn will remember this.",
  "Xrpn: emotionally, I’m thriving.",
  "Xrpn: that was personal.",
  "Xrpn: I’m judging both of you."
];

const xrpnJudgements = {
  gun: ["Xrpn: straight to violence, huh.","Xrpn: that escalated immediately.","Xrpn: I’m concerned. Slightly impressed."],
  tomato: ["Xrpn calls this: humiliation.","Xrpn: you’re enjoying this too much.","Xrpn: tomatoes are a personality trait now."],
  knife: ["Xrpn respects the commitment.","Xrpn: that’s… dramatic.","Xrpn: okay, scary."],
  bat: ["Xrpn: that came from the soul.","Xrpn: wow. okay.","Xrpn: bonk energy."],
  punch: ["Xrpn: classic.","Xrpn: consistent effort. I respect it.","Xrpn: simple. effective. cruel."]
};

const comboPhrases = [
  { at: 3, text: "Okay okay chill." },
  { at: 5, text: "This feels personal." },
  { at: 8, text: "She woke up and chose violence." },
  { at: 12, text: "Someone stop her." }
];

const overreactionLines = [
  "EMOTIONAL DAMAGE.",
  "That one came with intentions.",
  "Okay. That was cinematic.",
  "He felt that in 4K."
];

function createAudioPool(src, poolSize = 4, volume = 0.6) {
  const pool = [];
  for (let i = 0; i < poolSize; i++) {
    const a = new Audio(src);
    a.preload = "auto";
    a.volume = volume;
    pool.push(a);
  }
  return {
    pool,
    index: 0,
    play() {
      if (isMuted) return;
      const a = pool[this.index];
      this.index = (this.index + 1) % pool.length;
      try { a.currentTime = 0; } catch (_) {}
      a.play().catch(() => {});
    }
  };
}

// Keep your audio paths as-is
const sfx = {
  punch: createAudioPool("sounds/punch.mp3", 5, 0.55),
  bat: createAudioPool("sounds/bat.mp3", 4, 0.6),
  knife: createAudioPool("sounds/knife.mp3", 4, 0.6),
  gun: createAudioPool("sounds/gun.mp3", 4, 0.65),
  squish: createAudioPool("sounds/squish.mp3", 4, 0.6),
  dead: createAudioPool("sounds/dead.mp3", 2, 0.6)
};

function setMute(state) {
  isMuted = state;
  if (!muteBtn) return;
  muteBtn.setAttribute("aria-pressed", String(isMuted));
  const icon = muteBtn.querySelector(".icon");
  const label = muteBtn.querySelector(".label");
  if (icon) icon.textContent = isMuted ? "🔇" : "🔊";
  if (label) label.textContent = isMuted ? "Sound Off" : "Sound";
}

function setHealthHue(percent) {
  const hue = Math.max(0, Math.min(120, Math.round((percent / 100) * 120)));
  document.documentElement.style.setProperty("--hpHue", String(hue));
}

function showSpeech(msg, ms = 1400) {
  if (!speech) return;
  speech.textContent = msg;
  speech.classList.add("show");
  if (speechTimer) clearTimeout(speechTimer);
  speechTimer = setTimeout(() => speech.classList.remove("show"), ms);
}

function randomPick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function updateCatState() {
  if (!cssCat) return;
  cssCat.classList.remove("happy", "dance");
  if (health === 0) cssCat.classList.add("dance");
  else if (health <= 30) cssCat.classList.add("happy");
}

function xrpnTap() {
  xrpnTapCount++;
  if (xrpnTapTimer) clearTimeout(xrpnTapTimer);
  xrpnTapTimer = setTimeout(() => { xrpnTapCount = 0; }, 1200);

  if (xrpnTapCount === 1) return showSpeech("Xrpn: …", 700);
  if (xrpnTapCount === 2) return showSpeech("Xrpn: Don’t touch Xrpn.", 1000);
  if (xrpnTapCount >= 3) {
    xrpnTapCount = 0;
    xrpnShieldNextHit = true;
    return showSpeech("Xrpn intervened. Next hit is blocked.", 1400);
  }
}

function spawnTears() {
  const face = document.querySelector(".face");
  if (!face) return;

  const count = Math.floor(Math.random() * 3) + 2;
  for (let i = 0; i < count; i++) {
    const tear = document.createElement("div");
    tear.className = "tear";

    const xBase = Math.random() < 0.5 ? 28 : 72;
    tear.style.left = (xBase + (Math.random() * 6 - 3)) + "%";
    tear.style.top = "46%";

    face.appendChild(tear);
    setTimeout(() => tear.remove(), 1000);
  }
}

function startCrying() {
  if (cryingInterval) return;
  cryingInterval = setInterval(() => {
    if (health > 0 && health <= 30) spawnTears();
  }, 700);
}

function stopCrying() {
  if (cryingInterval) {
    clearInterval(cryingInterval);
    cryingInterval = null;
  }
}

function updateCombo() {
  const now = Date.now();
  const windowMs = 1200;
  stats.combo = (now - stats.lastHitAt <= windowMs) ? (stats.combo + 1) : 1;
  stats.lastHitAt = now;
}

function maybeComboPhrase() {
  const entry = comboPhrases.slice().reverse().find(x => stats.combo >= x.at);
  if (!entry) return null;
  return Math.random() < 0.55 ? entry.text : null;
}

function triggerOverreaction() {
  if (Math.random() > 0.05) return false;
  playCard.classList.remove("shake", "zoom");
  void playCard.offsetWidth;
  playCard.classList.add("shake", "zoom");
  setTimeout(() => playCard.classList.remove("shake", "zoom"), 320);
  showSpeech(randomPick(overreactionLines), 1200);
  return true;
}

function maybeXrpnOverride() { return Math.random() < 0.08; }
function maybeXrpnJudgement(toolName) {
  if (Math.random() >= 0.12) return null;
  return randomPick(xrpnJudgements[toolName] || xrpnComments);
}

function endingNarration() {
  if (stats.toolHits.tomato >= 12 && stats.toolHits.gun === 0) return "Xrpn: You chose humiliation. Respect.";
  if (stats.toolHits.gun > 0 && stats.firstToolUsed === "gun") return "Xrpn: That escalated fast. Like… immediately.";
  if (stats.toolHits.gun === 0) return "Xrpn acknowledges restraint. Barely.";
  if (stats.toolHits.tomato > stats.hitsTotal * 0.6) return "Xrpn calls this: emotional damage.";
  if (stats.combo >= 10) return "Xrpn: I witnessed a crime.";
  return "Xrpn wins. San loses.";
}

/* --------- FIXED ENABLE/DISABLE LOGIC ---------- */
function setToolButtonsEnabled(enabled) {
  toolButtons.forEach(btn => (btn.disabled = !enabled));
}

/* IMPORTANT:
   - Reset should remain enabled even when San dies.
   - Reset should be disabled ONLY when blocked.
*/
function setResetEnabled(enabled) {
  if (!resetBtn) return;
  resetBtn.disabled = !enabled;
}

function setActiveToolButton(toolName) {
  toolButtons.forEach(btn => {
    const active = btn.dataset.tool === toolName;
    btn.classList.toggle("active", active);
    btn.setAttribute("aria-selected", active ? "true" : "false");
  });
}

function updateHealth() {
  health = Math.max(0, Math.min(100, health));
  setHealthHue(health);
  updateCatState();

  if (healthFill) healthFill.style.width = health + "%";
  if (healthText) healthText.textContent = "HP: " + health + "%";

  if (ANALYTICS.blocked) {
    // If blocked, everything stays disabled.
    setToolButtonsEnabled(false);
    setResetEnabled(false);
    return;
  }

  if (health === 0) {
    buddy.classList.add("dead");
    mouth.classList.add("sad");

    // Disable only tools, keep reset enabled (FIX)
    setToolButtonsEnabled(false);
    setResetEnabled(true);

    stopCrying();
    showSpeech(endingNarration(), 2200);

    if (!hasPlayedDeathSound) {
      sfx.dead.play();
      hasPlayedDeathSound = true;
    }
  } else {
    buddy.classList.remove("dead");
    mouth.classList.remove("sad");

    setToolButtonsEnabled(true);
    setResetEnabled(true);

    if (health <= 30) startCrying();
    else stopCrying();
  }
}

function triggerHit() {
  if (ANALYTICS.blocked) return;
  if (health <= 0) return;

  analyticsHit(currentTool);

  if (xrpnShieldNextHit) {
    xrpnShieldNextHit = false;
    buddy.classList.remove("hit");
    void buddy.offsetWidth;
    buddy.classList.add("hit");
    showSpeech("Xrpn blocked that. San lives… for now.", 1400);
    return;
  }

  stats.hitsTotal++;
  stats.toolHits[currentTool]++;
  if (!stats.firstToolUsed) stats.firstToolUsed = currentTool;

  updateCombo();

  buddy.classList.remove("hit");
  void buddy.offsetWidth;
  buddy.classList.add("hit");

  spawnTears();
  if (sfx[currentTool]) sfx[currentTool].play();

  const didOverreact = triggerOverreaction();

  const tool = tools[currentTool];
  health -= tool.damage;
  updateHealth();

  if (health <= 0) return;

  let msg = maybeXrpnOverride() ? randomPick(xrpnComments) : randomPick(tool.messages);

  const judgement = maybeXrpnJudgement(currentTool);
  if (judgement && Math.random() < 0.55) msg = judgement;
  else if (judgement && Math.random() < 0.35) msg = `${msg} • ${judgement}`;

  const comboLine = maybeComboPhrase();
  if (comboLine) msg = `${msg} • ${comboLine}`;

  if (didOverreact && Math.random() < 0.55) msg = randomPick(overreactionLines);

  showSpeech(msg, 1400);
}

/* Events */
buddy.addEventListener("pointerdown", (e) => { e.preventDefault(); triggerHit(); });
buddy.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") { e.preventDefault(); triggerHit(); }
});

toolButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    if (ANALYTICS.blocked) return;
    if (health <= 0) return; // prevent selecting tools when dead (tools should be disabled anyway)

    currentTool = btn.dataset.tool;
    setActiveToolButton(currentTool);

    const judge = maybeXrpnJudgement(currentTool);
    showSpeech(judge ? judge : `Selected: ${tools[currentTool].name}`, 1000);
  });
});

resetBtn.addEventListener("click", () => {
  if (ANALYTICS.blocked) return;

  health = 100;
  hasPlayedDeathSound = false;

  stats.hitsTotal = 0;
  stats.toolHits = { punch: 0, bat: 0, knife: 0, gun: 0, tomato: 0 };
  stats.firstToolUsed = null;
  stats.combo = 0;
  stats.lastHitAt = 0;

  xrpnShieldNextHit = false;
  stopCrying();

  updateHealth();
  showSpeech("Reset done. Select a tool and tap on San.", 1400);
});

if (muteBtn) muteBtn.addEventListener("click", () => setMute(!isMuted));

if (cssCat) {
  cssCat.addEventListener("pointerdown", (e) => { e.preventDefault(); xrpnTap(); });
  cssCat.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); xrpnTap(); }
  });
}

/* Init */
setMute(false);
setActiveToolButton(currentTool);
updateHealth();
showSpeech("Select a tool and tap on San.", 1200);
analyticsStart();