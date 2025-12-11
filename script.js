// Simple "anger buddy" logic

const buddy = document.getElementById("buddy");
const healthFill = document.getElementById("health-fill");
const healthText = document.getElementById("health-text");
const speech = document.getElementById("speech");
const toolButtons = document.querySelectorAll(".tool-btn");
const resetBtn = document.getElementById("reset-btn");

let health = 100;
let currentTool = "slap";

// Tool definitions
const tools = {
    slap: {
        name: "Slap",
        damage: 8,
        messages: [
            "Ouch! That was a slap!",
            "Hey, I said gentle!",
            "My cheek is still ringing…"
        ]
    },
    pillow: {
        name: "Pillow",
        damage: 4,
        messages: [
            "Fluffy, but still hurts!",
            "Pillow fight champion!",
            "Soft… but rude."
        ]
    },
    water: {
        name: "Water",
        damage: 6,
        messages: [
            "Now I am wet and sad.",
            "Cold shower unlocked.",
            "I did not order this bath."
        ]
    },
    mega: {
        name: "Mega Hit",
        damage: 20,
        messages: [
            "OK WOW. That was a lot.",
            "Critical emotional damage.",
            "I surrender, you win."
        ]
    }
};

function updateHealth() {
    health = Math.max(0, Math.min(100, health));
    healthFill.style.width = health + "%";
    healthText.textContent = "HP: " + health + "%";

    if (health === 0) {
        speech.textContent = "You win. I am now calm… right?";
        buddy.classList.remove("hit");
    }
}

function randomMessage(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function triggerHit() {
    if (health <= 0) {
        speech.textContent = "I am already defeated. Press reset if you want a new round.";
        return;
    }

    // small animation reset hack
    buddy.classList.remove("hit");
    void buddy.offsetWidth; // force reflow
    buddy.classList.add("hit");

    const tool = tools[currentTool];
    health -= tool.damage;
    updateHealth();

    if (health > 0) {
        speech.textContent = randomMessage(tool.messages);
    }
}

// Handle pointer (works for touch + mouse)
buddy.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    triggerHit();
});

// Tool selection
toolButtons.forEach(btn => {
    btn.addEventListener("click", () => {
        toolButtons.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        currentTool = btn.getAttribute("data-tool");

        const tool = tools[currentTool];
        speech.textContent = "Selected: " + tool.name + ". Tap on San.";
    });
});

// Reset
resetBtn.addEventListener("click", () => {
    health = 100;
    updateHealth();
    speech.textContent = "New round. I still love you, even angry.";
});

// Initial state
updateHealth();
