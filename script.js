const gameWrapper = document.getElementById("gameWrapper");
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

/* ---------------- FUN STATS / BEHAVIOR TRACKING ---------------- */
const stats = {
  hitsTotal: 0,
  toolHits: { punch: 0, bat: 0, knife: 0, gun: 0, tomato: 0 },
  firstToolUsed: null,
  usedGun: false,
  usedOnlyTomatoes: true,
  usedNoGun: true,
  resets: 0,

  // combo
  combo: 0,
  lastHitAt: 0
};

let xrpnTapCount = 0;
let xrpnTapTimer = null;
let xrpnShieldNextHit = false;

/* ---------------- TOOLS (YOUR CUSTOM MESSAGES LIVE HERE) ---------------- */
const tools = {
  punch: {
    name: "Punch",
    damage: 10,
    messages: [
      "Ouch! That gonna leave a purple mark!",
      "Yara, your not hitting hard enough!",
      "I can't feel my face"
    ]
  },
  bat: {
    name: "Bat",
    damage: 15,
    messages: [
      "Yara, I crave the cruelty of your bat!",
      "I think you broke my legs!",
      "okay that one did not hurt."
    ]
  },
  knife: {
    name: "Knife",
    damage: 20,
    messages: [
      "NOOO my hands, now I can't text Yara.",
      "Yara I think thats enough, you don't need two kidneys.",
      "Yara please no more."
    ]
  },
  gun: {
    name: "Gun",
    damage: 99,
    messages: [
      "Just finish it off im already dying here.",
      "I did not know you hated me that much.",
      "You might as well just delete me from the screen."
    ]
  },
  tomato: {
    name: "Tomato",
    damage: 5,
    messages: [
      "Ew. Tomato juice in my eyes.",
      "That was disrespectful.",
      "Not the face 😭"
    ]
  }
};

/* ---------------- XRPN: RARE COMMENTARY ---------------- */
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

/* Weapon-judgment style lines (triggered occasionally) */
const xrpnJudgements = {
  gun: [
    "Xrpn: straight to violence, huh.",
    "Xrpn: that escalated immediately.",
    "Xrpn: I’m concerned. Slightly impressed."
  ],
  tomato: [
    "Xrpn calls this: humiliation.",
    "Xrpn: you’re enjoying this too much.",
    "Xrpn: tomatoes are a personality trait now."
  ],
  knife: [
    "Xrpn respects the commitment.",
    "Xrpn: that’s… dramatic.",
    "Xrpn: okay, scary."
  ],
  bat: [
    "Xrpn: that came from the soul.",
    "Xrpn: wow. okay.",
    "Xrpn: bonk energy."
  ],
  punch: [
    "Xrpn: classic.",
    "Xrpn: consistent effort. I respect it.",
    "Xrpn: simple. effective. cruel."
  ]
};

/* Combo phrases (no numbers) */
const comboPhrases = [
  { at: 3, text: "Okay okay chill." },
  { at: 5, text: "This feels personal." },
  { at: 8, text: "She woke up and chose violence." },
  { at: 12, text: "Someone stop her." }
];

/* Overreaction moments (rare) */
const overreactionLines = [
  "EMOTIONAL DAMAGE.",
  "That one came with intentions.",
  "Okay. That was cinematic.",
  "He felt that in 4K."
];

/* ---------------- AUDIO ---------------- */
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

/* ---------------- iOS POLISH: HP COLOR SHIFT ---------------- */
function setHealthHue(percent) {
  const hue = Math.max(0, Math.min(120, Math.round((percent / 100) * 120)));
  document.documentElement.style.setProperty("--hpHue", String(hue));
}

/* ---------------- SPEECH TOAST ---------------- */
function showSpeech(msg, ms = 1400) {
  if (!speech) return;

  speech.textContent = msg;
  speech.classList.add("show");

  if (speechTimer) clearTimeout(speechTimer);
  speechTimer = setTimeout(() => {
    speech.classList.remove("show");
  }, ms);
}

/* ---------------- HELPERS ---------------- */
function setToolsEnabled(enabled) {
  toolButtons.forEach(btn => (btn.disabled = !enabled));
}

function setActiveToolButton(toolName) {
  toolButtons.forEach(btn => {
    const active = btn.dataset.tool === toolName;
    btn.classList.toggle("active", active);
    btn.setAttribute("aria-selected", active ? "true" : "false");
  });
}

function randomPick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/* ---------------- XRPN STATE ---------------- */
function updateCatState() {
  if (!cssCat) return;

  cssCat.classList.remove("happy", "dance");

  if (health === 0) {
    cssCat.classList.add("dance");
    return;
  }

  if (health > 0 && health <= 30) {
    cssCat.classList.add("happy");
  }
}

/* XRPN: tapping consequences */
function xrpnTap() {
  xrpnTapCount++;

  // reset tap counter if user pauses
  if (xrpnTapTimer) clearTimeout(xrpnTapTimer);
  xrpnTapTimer = setTimeout(() => {
    xrpnTapCount = 0;
  }, 1200);

  if (xrpnTapCount === 1) {
    showSpeech("Xrpn: …", 700);
    return;
  }
  if (xrpnTapCount === 2) {
    showSpeech("Xrpn: Don’t touch Xrpn.", 1000);
    return;
  }
  if (xrpnTapCount >= 3) {
    xrpnTapCount = 0;
    xrpnShieldNextHit = true;
    showSpeech("Xrpn intervened. Next hit is blocked.", 1400);
  }
}

/* ---------------- TEARS ---------------- */
let cryingInterval = null;

function spawnTears() {
  const face = document.querySelector(".face");
  if (!face) return;

  const count = Math.floor(Math.random() * 3) + 2;
  for (let i = 0; i < count; i++) {
    const tear = document.createElement("div");
    tear.className = "tear";
    const xBase = Math.random() < 0.5 ? 28 : 72;
    tear.style.left = xBase + (Math.random() * 6 - 3) + "%";
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

/* ---------------- TOMATO ---------------- */
function capStains(max = 20) {
  const stains = document.querySelectorAll(".tomato-stain");
  if (stains.length <= max) return;
  const extra = stains.length - max;
  for (let i = 0; i < extra; i++) stains[i].remove();
}

function throwTomato() {
  const face = document.querySelector(".face");
  if (!face || !gameWrapper) return;

  const tomato = document.createElement("div");
  tomato.className = "tomato";
  gameWrapper.appendChild(tomato);

  const wrapperRect = gameWrapper.getBoundingClientRect();
  const faceRect = face.getBoundingClientRect();

  const startX = wrapperRect.width / 2;
  const startY = wrapperRect.height - 95;

  const offsetX = Math.random() * faceRect.width * 0.6 + faceRect.width * 0.2;
  const offsetY = Math.random() * faceRect.height * 0.6 + faceRect.height * 0.2;

  const targetX = (faceRect.left - wrapperRect.left) + offsetX;
  const targetY = (faceRect.top - wrapperRect.top) + offsetY;

  tomato.style.left = startX + "px";
  tomato.style.top = startY + "px";

  tomato.animate(
    [
      { transform: "translate(0,0) scale(1)" },
      { transform: `translate(${targetX - startX}px, ${targetY - startY}px) scale(0.9)` }
    ],
    { duration: 420, easing: "cubic-bezier(.4,0,.2,1)" }
  ).onfinish = () => {
    tomato.classList.add("splat");
    sfx.squish.play();

    const stain = document.createElement("div");
    stain.className = "tomato-stain";
    stain.style.left = offsetX + "px";
    stain.style.top = offsetY + "px";
    face.appendChild(stain);
    capStains(20);

    setTimeout(() => tomato.remove(), 220);
  };
}

/* ---------------- COMBO + JUICE ---------------- */
function updateCombo() {
  const now = Date.now();
  const windowMs = 1200;

  if (now - stats.lastHitAt <= windowMs) stats.combo++;
  else stats.combo = 1;

  stats.lastHitAt = now;
}

function maybeComboPhrase() {
  const entry = comboPhrases.slice().reverse().find(x => stats.combo >= x.at);
  if (!entry) return null;

  // Don’t spam — only show sometimes
  if (Math.random() < 0.55) return entry.text;
  return null;
}

function triggerOverreaction() {
  // 1 in 20-ish
  if (Math.random() > 0.05) return false;

  playCard.classList.remove("shake", "zoom");
  void playCard.offsetWidth;
  playCard.classList.add("shake", "zoom");
  setTimeout(() => playCard.classList.remove("shake", "zoom"), 320);

  showSpeech(randomPick(overreactionLines), 1200);
  return true;
}

/* ---------------- XRPN: RARE OVERRIDE + JUDGEMENT ---------------- */
function maybeXrpnOverride() {
  // rare: ~8%
  return Math.random() < 0.08;
}

function maybeXrpnJudgement(toolName) {
  // occasional: ~12%
  if (Math.random() >= 0.12) return null;

  // Escalate if gun used a lot
  if (toolName === "gun" && stats.toolHits.gun >= 2) {
    return "Xrpn: okay… that’s concerning.";
  }

  return randomPick(xrpnJudgements[toolName] || xrpnComments);
}

/* ---------------- ENDING NARRATIONS ---------------- */
function endingNarration() {
  // behavior-based endings
  if (stats.toolHits.tomato >= 12 && stats.toolHits.gun === 0) {
    return "Xrpn: You chose humiliation. Respect.";
  }
  if (stats.toolHits.gun > 0 && stats.firstToolUsed === "gun") {
    return "Xrpn: That escalated fast. Like… immediately.";
  }
  if (stats.toolHits.gun === 0) {
    return "Xrpn acknowledges restraint. Barely.";
  }
  if (stats.toolHits.tomato > stats.hitsTotal * 0.6) {
    return "Xrpn calls this: emotional damage.";
  }
  if (stats.combo >= 10) {
    return "Xrpn: I witnessed a crime.";
  }
  return "Xrpn wins. San loses.";
}

/* ---------------- GAME LOGIC ---------------- */
function updateHealth() {
  health = Math.max(0, Math.min(100, health));
  setHealthHue(health);
  updateCatState();

  if (healthFill) healthFill.style.width = health + "%";
  if (healthText) healthText.textContent = "HP: " + health + "%";

  if (health === 0) {
    buddy.classList.add("dead");
    mouth.classList.add("sad");
    setToolsEnabled(false);

    stopCrying();
    document.querySelectorAll(".tear").forEach(t => t.remove());

    showSpeech(endingNarration(), 2200);

    if (!hasPlayedDeathSound) {
      sfx.dead.play();
      hasPlayedDeathSound = true;
    }
  } else {
    buddy.classList.remove("dead");
    mouth.classList.remove("sad");
    setToolsEnabled(true);

    if (health <= 30) startCrying();
    else stopCrying();
  }
}

function triggerHit() {
  if (health <= 0) return;

  // XRPN shield blocks the next hit fully (no damage)
  if (xrpnShieldNextHit) {
    xrpnShieldNextHit = false;

    buddy.classList.remove("hit");
    void buddy.offsetWidth;
    buddy.classList.add("hit");

    // small juice
    playCard.classList.remove("shake");
    void playCard.offsetWidth;
    playCard.classList.add("shake");
    setTimeout(() => playCard.classList.remove("shake"), 320);

    showSpeech("Xrpn blocked that. San lives… for now.", 1400);
    return;
  }

  stats.hitsTotal++;
  stats.toolHits[currentTool]++;

  if (!stats.firstToolUsed) stats.firstToolUsed = currentTool;

  // track special behavior
  if (currentTool === "gun") {
    stats.usedGun = true;
    stats.usedNoGun = false;
  }
  if (currentTool !== "tomato") stats.usedOnlyTomatoes = false;

  // combo update
  updateCombo();

  // buddy hit anim
  buddy.classList.remove("hit");
  void buddy.offsetWidth;
  buddy.classList.add("hit");

  spawnTears();

  // tool audio + tomato anim
  if (currentTool === "tomato") {
    throwTomato();
  } else if (sfx[currentTool]) {
    sfx[currentTool].play();
  }

  // rare overreaction moment
  const didOverreact = triggerOverreaction();

  // apply damage
  const tool = tools[currentTool];
  health -= tool.damage;
  updateHealth();

  if (health <= 0) return;

  // Build message pipeline:
  // 1) Sometimes Xrpn overrides
  // 2) Else normal tool message
  // 3) Sometimes add judgement or combo phrase
  let msg;

  if (maybeXrpnOverride()) {
    msg = randomPick(xrpnComments);
  } else {
    msg = randomPick(tool.messages);
  }

  // occasional judgement line (replace or append)
  const judgement = maybeXrpnJudgement(currentTool);
  if (judgement && Math.random() < 0.55) {
    msg = judgement;
  } else if (judgement && Math.random() < 0.35) {
    msg = `${msg} • ${judgement}`;
  }

  // combo phrase (append sometimes)
  const comboLine = maybeComboPhrase();
  if (comboLine) msg = `${msg} • ${comboLine}`;

  // extra special case: gun early = judge harder
  if (currentTool === "gun" && stats.toolHits.gun === 1 && stats.hitsTotal <= 2) {
    msg = "Xrpn: straight to the gun? wow.";
  }

  // special tomato spam comment sometimes
  if (currentTool === "tomato" && stats.toolHits.tomato >= 6 && Math.random() < 0.25) {
    msg = "Xrpn: tomatoes are a personality now.";
  }

  // if overreaction just happened, keep that line dominant sometimes
  if (didOverreact && Math.random() < 0.55) {
    msg = randomPick(overreactionLines);
  }

  showSpeech(msg, 1400);
}

/* ---------------- EVENTS ---------------- */
buddy.addEventListener("pointerdown", e => {
  e.preventDefault();
  triggerHit();
});

buddy.addEventListener("keydown", e => {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    triggerHit();
  }
});

toolButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    currentTool = btn.dataset.tool;
    setActiveToolButton(currentTool);

    // iOS micro-bounce
    btn.classList.remove("bounce");
    void btn.offsetWidth;
    btn.classList.add("bounce");

    // sometimes Xrpn judges your selection
    const judge = maybeXrpnJudgement(currentTool);
    const msg = judge ? judge : `Selected: ${tools[currentTool].name}`;
    showSpeech(msg, 1000);
  });
});

resetBtn.addEventListener("click", () => {
  health = 100;
  hasPlayedDeathSound = false;

  stats.hitsTotal = 0;
  stats.toolHits = { punch: 0, bat: 0, knife: 0, gun: 0, tomato: 0 };
  stats.firstToolUsed = null;
  stats.usedGun = false;
  stats.usedOnlyTomatoes = true;
  stats.usedNoGun = true;
  stats.combo = 0;
  stats.lastHitAt = 0;

  xrpnShieldNextHit = false;

  document.querySelectorAll(".tomato-stain").forEach(s => s.remove());
  stopCrying();

  updateHealth();
  setToolsEnabled(true);

  stats.resets++;
  if (stats.resets >= 3) {
    showSpeech("Xrpn: running from your actions again?", 1400);
  } else {
    showSpeech("Reset done. Select a tool and tap on San.", 1400);
  }
});

if (muteBtn) {
  muteBtn.addEventListener("click", () => setMute(!isMuted));
}

/* XRPN taps */
if (cssCat) {
  cssCat.addEventListener("pointerdown", e => {
    e.preventDefault();
    xrpnTap();
  });

  cssCat.addEventListener("keydown", e => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      xrpnTap();
    }
  });
}

/* ---------------- INIT ---------------- */
setMute(false);
setActiveToolButton(currentTool);
updateHealth();
showSpeech("Select a tool and tap on San.", 1200);
