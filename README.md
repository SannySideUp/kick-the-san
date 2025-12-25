# 😡 Angry At San

**Angry At San** is a playful, iOS-styled web game where you can take out your frustration on a cartoon character named San.  
Tap, punch, throw tomatoes, and watch San react with sounds, animations, tears, and sarcastic messages — all wrapped in a clean, modern mobile UI.

Built as a fun personal project with a polished **iOS app–like experience**.

---

## ✨ Features

### 📱 iOS-Style UI
- Frosted glass cards
- Pill-shaped buttons
- Sticky bottom toolbar
- Safe-area support (iPhone notch & home bar)

### 🎮 Interactive Character
- Tap to attack
- Smooth hit animations
- Crying when health is low
- Full death state with visual changes

### 🩸 Weapons & Tools
- 👊 Punch  
- 🦯 Bat  
- 🔪 Knife  
- 🔫 Gun  
- 🍅 Tomato (with splat + stains)

### 💬 Message System
- Weapon-specific custom messages
- iOS-style toast notifications
- Fully customizable text

### 🔊 Sound
- Weapon-specific sound effects
- Audio pooling (no clipping)
- Mute toggle

### 🎨 UI Polish
- Tool-selection micro “haptic” bounce
- Health bar smoothly shifts:
  - 🟢 Green → 🟡 Yellow → 🔴 Red
- Optimized for Mobile Safari

---

## 🧠 Why This Project Exists

This project was built as a **creative frontend experiment** combining:

- Modern mobile UI patterns
- Micro-animations & interaction polish
- Humor and personality

It’s intentionally lightweight, fast, and focused on **feel over complexity**.

---

## 🛠️ Tech Stack

- **HTML5** — Structure  
- **CSS3** — iOS-style UI, animations, layout  
- **Vanilla JavaScript** — Game logic, sound, interaction  
- **No frameworks** — Simple and fast  

---

## 📂 Project Structure

```text
/
├── index.html
├── style.css
├── script.js
└── sounds/
    ├── punch.mp3
    ├── bat.mp3
    ├── knife.mp3
    ├── gun.mp3
    ├── squish.mp3
    └── dead.mp3
```

---

## ▶️ How to Run

### Option 1: Local
1. Clone or download the repository
2. Open `index.html` in your browser
3. Best viewed in **mobile mode**

### Option 2: GitHub Pages
```
https://<your-username>.github.io/
```

---

## ✏️ Customizing the Messages

All weapon messages live in `script.js`:

```js
const tools = {
  punch: {
    messages: [
      "Ouch! That gonna leave a purple mark!",
      "Yara, your not hitting hard enough!",
      "I can't feel my face"
    ]
  }
};
```

---

## 📱 Best Experience

- iPhone (Safari recommended)
- Mobile viewport (~375×812)
- Sound ON 🔊

---

## ⚠️ Disclaimer

This project is **purely for fun**.  
No real people were harmed (emotionally or otherwise).

---

## ❤️ Credits

Designed & built by **San**  
With inspiration, motivation, and chaos provided by **Yara**
