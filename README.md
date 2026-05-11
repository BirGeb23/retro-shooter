# 🎮 Retro Shooter

A browser-based, top-down retro shooter built with vanilla JavaScript and HTML5 Canvas. No installs, no dependencies — just open and play.

![JavaScript](https://img.shields.io/badge/JavaScript-98.4%25-yellow?style=flat-square&logo=javascript) ![HTML](https://img.shields.io/badge/HTML-1.6%25-orange?style=flat-square&logo=html5) ![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)

---

## 🕹️ Gameplay

You're a lone gunslinger dropped into a pixel-art arena. Enemies close in from all directions — move fast, aim true, and survive long enough to face the boss at the end of every level.

- **Move** with the arrow keys or WASD
- **Aim** by moving your mouse
- **Shoot** by clicking
- **Survive** through waves of enemies, grab power-ups, and take down the boss to advance

---

## ✨ Features

- 🎨 Pixel art sprites with character animations
- 🔫 Mouse-aimed shooting with directional gun
- 👾 4 enemy types — crawler, sprinter, shooter, tank — each with unique AI
- 💀 **Boss fights** — every level ends with a 2-phase boss that changes behavior at 50% HP
- 🌟 **Cinematic boss death** — multi-ring particle explosion with screen shake
- 💥 **Particle system** — every kill, hit, and pickup has juicy visual feedback
- 📳 **Screen shake** — scales with damage taken and explosion size
- 🔫 **5 power-ups** — health, rapid fire, spread shot, shotgun, and shield
- 🏆 **High score board** — top 5 scores saved locally with level and date
- 📈 5 levels with increasing difficulty and clear progression
- 🎵 Procedural retro audio via Web Audio API
- 🖥️ Menu screen with play tab and scores tab
- 💯 Pure vanilla JS — no frameworks, no build step

---

## 🚀 Getting Started

```bash
git clone https://github.com/BirGeb23/retro-shooter.git
cd retro-shooter
```

Then open `index.html` in your browser — that's it. No server required.

> **Tip:** For a local dev server, run `npx serve .` and open `http://localhost:3000`

**Play it online:** Once GitHub Pages is enabled, the game is live at:
`https://birgeb23.github.io/retro-shooter`

---

## 🗂️ Project Structure

```
retro-shooter/
├── index.html     # Entry point — game canvas and layout
├── game.js        # Core game loop, levels, enemies, boss AI, input handling
├── sprites.js     # Pixel art sprite definitions and animations
├── audio.js       # Sound effects using the Web Audio API
└── .gitignore
```

---

## 🎯 Controls

| Action | Input |
|--------|-------|
| Move | `↑ ↓ ← →` or `W A S D` |
| Aim | Mouse |
| Shoot | Left Click |
| Navigate menu | `← →` Arrow Keys |
| Confirm / Start | `Enter` or `Space` |

---

## 👾 Enemies

| Enemy | Behavior |
|-------|----------|
| **Crawler** | Steadily moves toward you |
| **Sprinter** | Winds up then dashes at high speed |
| **Shooter** | Keeps distance and fires at you |
| **Tank** | Slow, high HP, fires large slow bullets |
| **Boss** | Phase 1: charges + 3-bullet spread. Phase 2 (50% HP): orbits + 5-bullet rings |

---

## ⚡ Power-ups

| Icon Color | Power-up | Effect |
|-----------|----------|--------|
| 🟢 Green cross | Health | Restores 1 HP |
| 🟡 Yellow arrows | Rapid Fire | 2.5× fire rate for 8s |
| 🔵 Blue spread | Spread Shot | 3-bullet spread for 8s |
| 🟠 Orange burst | Shotgun | 6-pellet blast for 8s |
| 🟣 Purple shield | Shield | Absorbs damage for 12s |

> The boss always drops a health pack and shield on death.

---

## 🏆 High Score Board

Your top 5 scores are saved in your browser's local storage. View them from the main menu (use arrow keys to switch to the Scores tab) or check your ranking on the Game Over screen.

---

## 🛠️ Built With

- HTML5 Canvas for rendering
- Vanilla JavaScript — no libraries
- Web Audio API for procedural sound effects

---

## 🙌 Acknowledgements

Built for fun as a personal portfolio project. Inspired by classic top-down arcade shooters.
