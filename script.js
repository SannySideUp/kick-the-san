const gameWrapper = document.getElementById("gameWrapper");
const buddy = document.getElementById("buddy");
const healthFill = document.getElementById("health-fill");
const healthText = document.getElementById("health-text");
const speech = document.getElementById("speech");
const toolButtons = document.querySelectorAll(".tool-btn");
const resetBtn = document.getElementById("reset-btn");
const mouth = document.querySelector(".mouth");
const muteBtn = document.getElementById("mute-btn");

let cryingInterval = null;
let speechTimer = null;

let health = 100;
let currentTool = "punch";
let isMuted = false;
let hasPlayedDeathSound = false;

/* ---------------- YOUR CUSTOM MESSAGES ---------------- */
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

/* ---------------- SPEECH TOAST (FIX) ---------------- */

function showSpeech(msg, ms = 1400) {
  if (!speech) return;

  speech.textContent = msg;
  speech.classList.add("show");

  if (speechTimer) clearTimeout(speechTimer);
  speechTimer = setTimeout(() => {
    speech.classList.remove("show");
  }, ms);
}

/* ---------------- UI HELPERS ---------------- */

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

/* ---------------- TEARS ---------------- */

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

    setTimeout(() => tomato.remove(), 220);
  };
}

/* ---------------- GAME LOGIC ---------------- */

function randomMessage(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function updateHealth() {
  health = Math.max(0, Math.min(100, health));
  setHealthHue(health);

  if (healthFill) healthFill.style.width = health + "%";
  if (healthText) healthText.textContent = "HP: " + health + "%";

  if (health === 0) {
    buddy.classList.add("dead");
    mouth.classList.add("sad");
    setToolsEnabled(false);

    stopCrying();
    document.querySelectorAll(".tear").forEach(t => t.remove());

    showSpeech("You win. Yara is now calm… right?", 2000);

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

  buddy.classList.remove("hit");
  void buddy.offsetWidth;
  buddy.classList.add("hit");

  spawnTears();

  if (currentTool === "tomato") {
    throwTomato();
  } else if (sfx[currentTool]) {
    sfx[currentTool].play();
  }

  const tool = tools[currentTool];
  health -= tool.damage;
  updateHealth();

  if (health > 0) {
    showSpeech(randomMessage(tool.messages), 1400);
  }
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

    showSpeech("Selected: " + tools[currentTool].name, 1000);
  });
});

resetBtn.addEventListener("click", () => {
  health = 100;
  hasPlayedDeathSound = false;

  document.querySelectorAll(".tomato-stain").forEach(s => s.remove());
  stopCrying();

  updateHealth();
  setToolsEnabled(true);

  showSpeech("Reset done. Select a tool and tap on San.", 1400);
});

if (muteBtn) {
  muteBtn.addEventListener("click", () => setMute(!isMuted));
}

/* ---------------- INIT ---------------- */

setMute(false);
setActiveToolButton(currentTool);
updateHealth();
showSpeech("Select a tool and tap on San.", 1200);
