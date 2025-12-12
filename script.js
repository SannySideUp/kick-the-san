// Simple "anger buddy" logic

const buddy = document.getElementById("buddy");
const healthFill = document.getElementById("health-fill");
const healthText = document.getElementById("health-text");
const speech = document.getElementById("speech");
const toolButtons = document.querySelectorAll(".tool-btn");
const resetBtn = document.getElementById("reset-btn");
const mouth = document.querySelector(".mouth");


let health = 100;
let currentTool = "punch";

// Tool definitions
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
            "Just finish it off I'm already dying here.",
            "I did not know you hated me that much.",
            "You might as well just kill me in real life"
        ]
    }
};

function updateHealth() {
    health = Math.max(0, Math.min(100, health));
    healthFill.style.width = health + "%";
    healthText.textContent = "HP: " + health + "%";

    if (health === 0) {
        speech.textContent = "You win. Yara is now calm… right?";
        buddy.classList.remove("hit");

        // Make sad face
        mouth.classList.add("sad");
    } else {
        // Ensure normal face if not dead
        mouth.classList.remove("sad");
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
    speech.textContent = "New round. please don't be too angry this time.";
});

// Initial state
updateHealth();
