😡 Angry At San

Angry At San is a playful, iOS-styled web game where you can take out your frustration on a cartoon character named San.
Tap, punch, throw tomatoes, and watch San react with sounds, animations, tears, and sarcastic messages — all wrapped in a clean, modern mobile UI.

Built as a fun personal project with a polished “iOS app” aesthetic.

✨ Features

📱 iOS-style UI

Frosted glass cards

Pill buttons and sticky bottom bar

Safe-area support for iPhone (notches & home indicator)

🎮 Interactive character

Tap to attack

Hit reactions with micro-animations

Crying when health is low

Death state with visual changes

🩸 Multiple tools

Punch 👊

Bat 🦯

Knife 🔪

Gun 🔫

Tomato 🍅 (with splat animation & stains)

💬 Custom message system

Unique, humorous messages per weapon

Messages appear as iOS-style toast notifications

Easy to customize (just edit the message arrays)

🔊 Sound effects

Weapon-specific sounds

Mute toggle

Audio pooling for smooth playback

🎨 UI polish

Tool selection “haptic-style” bounce

Health bar smoothly shifts from green → yellow → red

Optimized for mobile Safari

🧠 Why this project exists

This project was created as a fun, expressive experiment combining:

Modern frontend UI/UX

Animation and interaction polish

Personal humor and creativity

It’s intentionally simple, fast, and focused on feel, not complexity.

🛠️ Tech Stack

HTML5 – Structure

CSS3 – iOS-inspired styling, animations, layout

Vanilla JavaScript – Game logic, sound, animations

No frameworks – Lightweight and fast

📂 Project Structure
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

▶️ How to Run
Option 1: Open locally

Download or clone the repo

Open index.html in your browser

For best results, use mobile view or Safari on iPhone

Option 2: GitHub Pages

If hosted on GitHub Pages:

https://<your-username>.github.io/

✏️ Customizing the Messages

All character messages live inside script.js:

const tools = {
  punch: {
    messages: [
      "Ouch! That gonna leave a purple mark!",
      "Yara, your not hitting hard enough!",
      "I can't feel my face"
    ]
  },
  ...
};


Just add, remove, or edit strings — no other code changes needed.

📱 Best Experience

iPhone (Safari or Chrome)

Mobile viewport (375×812 or similar)

Sound ON for full experience

⚠️ Disclaimer

This project is purely for fun.
No real people were harmed (emotionally or otherwise).

❤️ Credits

Designed & built by San
With inspiration, motivation, and chaos provided by Yara
