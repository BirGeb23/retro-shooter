// game.js — Core game logic: loop, input, entities, collision, waves, screens

// ============================================================
// CONSTANTS
// ============================================================
const W = 480, H = 270;
const TICK = 1000 / 60;
const PLAYER_SPEED = 90;
const BULLET_SPEED = 300;
const BULLET_LIFETIME = 2.0;
const PLAYER_FIRE_RATE = 0.18; // seconds between shots
const PLAYER_INVULN_TIME = 1.2;
const PLAYER_MAX_HP = 5;
const MAX_HIGH_SCORES = 5;

// ============================================================
// CANVAS & CONTEXT
// ============================================================
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

// ============================================================
// INPUT
// ============================================================
const input = {
    keys: {},
    justPressed: {},
    mouseX: 0,
    mouseY: 0,
    mouseDown: false,
    mouseJustPressed: false,
};

window.addEventListener('keydown', e => {
    if (!input.keys[e.code]) input.justPressed[e.code] = true;
    input.keys[e.code] = true;
    if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','Enter'].includes(e.code)) {
        e.preventDefault();
    }
});
window.addEventListener('keyup', e => { input.keys[e.code] = false; });
canvas.addEventListener('mousemove', e => {
    const rect = canvas.getBoundingClientRect();
    const canvasAspect = canvas.width / canvas.height;
    const rectAspect = rect.width / rect.height;
    let renderWidth, renderHeight, offsetX, offsetY;
    if (rectAspect > canvasAspect) {
        renderHeight = rect.height;
        renderWidth = rect.height * canvasAspect;
        offsetX = rect.left + (rect.width - renderWidth) / 2;
        offsetY = rect.top;
    } else {
        renderWidth = rect.width;
        renderHeight = rect.width / canvasAspect;
        offsetX = rect.left;
        offsetY = rect.top + (rect.height - renderHeight) / 2;
    }
    input.mouseX = (e.clientX - offsetX) * (canvas.width / renderWidth);
    input.mouseY = (e.clientY - offsetY) * (canvas.height / renderHeight);
});
canvas.addEventListener('mousedown', e => {
    e.preventDefault();
    input.mouseDown = true;
    input.mouseJustPressed = true;
    audio.init();
    audio.resume();
});
canvas.addEventListener('mouseup', () => { input.mouseDown = false; });
canvas.addEventListener('contextmenu', e => e.preventDefault());

// ============================================================
// HIGH SCORE PERSISTENCE
// ============================================================
function loadHighScores() {
    try {
        return JSON.parse(localStorage.getItem('retroShooterScores')) || [];
    } catch (e) {
        return [];
    }
}

function saveHighScore(score, level) {
    let scores = loadHighScores();
    scores.push({ score, level, date: new Date().toLocaleDateString() });
    scores.sort((a, b) => b.score - a.score);
    scores = scores.slice(0, MAX_HIGH_SCORES);
    localStorage.setItem('retroShooterScores', JSON.stringify(scores));
    // Also keep legacy single high score key
    if (scores.length > 0) {
        localStorage.setItem('retroShooterHighScore', scores[0].score);
    }
    return scores;
}

// ============================================================
// PIXEL TEXT RENDERER
// ============================================================
const FONT = {
    'A': [0x04,0x0A,0x11,0x1F,0x11,0x11,0x11],
    'B': [0x1E,0x11,0x11,0x1E,0x11,0x11,0x1E],
    'C': [0x0E,0x11,0x10,0x10,0x10,0x11,0x0E],
    'D': [0x1C,0x12,0x11,0x11,0x11,0x12,0x1C],
    'E': [0x1F,0x10,0x10,0x1E,0x10,0x10,0x1F],
    'F': [0x1F,0x10,0x10,0x1E,0x10,0x10,0x10],
    'G': [0x0E,0x11,0x10,0x17,0x11,0x11,0x0F],
    'H': [0x11,0x11,0x11,0x1F,0x11,0x11,0x11],
    'I': [0x0E,0x04,0x04,0x04,0x04,0x04,0x0E],
    'J': [0x07,0x02,0x02,0x02,0x02,0x12,0x0C],
    'K': [0x11,0x12,0x14,0x18,0x14,0x12,0x11],
    'L': [0x10,0x10,0x10,0x10,0x10,0x10,0x1F],
    'M': [0x11,0x1B,0x15,0x15,0x11,0x11,0x11],
    'N': [0x11,0x19,0x15,0x13,0x11,0x11,0x11],
    'O': [0x0E,0x11,0x11,0x11,0x11,0x11,0x0E],
    'P': [0x1E,0x11,0x11,0x1E,0x10,0x10,0x10],
    'Q': [0x0E,0x11,0x11,0x11,0x15,0x12,0x0D],
    'R': [0x1E,0x11,0x11,0x1E,0x14,0x12,0x11],
    'S': [0x0E,0x11,0x10,0x0E,0x01,0x11,0x0E],
    'T': [0x1F,0x04,0x04,0x04,0x04,0x04,0x04],
    'U': [0x11,0x11,0x11,0x11,0x11,0x11,0x0E],
    'V': [0x11,0x11,0x11,0x11,0x0A,0x0A,0x04],
    'W': [0x11,0x11,0x11,0x15,0x15,0x1B,0x11],
    'X': [0x11,0x11,0x0A,0x04,0x0A,0x11,0x11],
    'Y': [0x11,0x11,0x0A,0x04,0x04,0x04,0x04],
    'Z': [0x1F,0x01,0x02,0x04,0x08,0x10,0x1F],
    '0': [0x0E,0x13,0x15,0x15,0x15,0x19,0x0E],
    '1': [0x04,0x0C,0x04,0x04,0x04,0x04,0x0E],
    '2': [0x0E,0x11,0x01,0x06,0x08,0x10,0x1F],
    '3': [0x0E,0x11,0x01,0x06,0x01,0x11,0x0E],
    '4': [0x02,0x06,0x0A,0x12,0x1F,0x02,0x02],
    '5': [0x1F,0x10,0x1E,0x01,0x01,0x11,0x0E],
    '6': [0x06,0x08,0x10,0x1E,0x11,0x11,0x0E],
    '7': [0x1F,0x01,0x02,0x04,0x08,0x08,0x08],
    '8': [0x0E,0x11,0x11,0x0E,0x11,0x11,0x0E],
    '9': [0x0E,0x11,0x11,0x0F,0x01,0x02,0x0C],
    ':': [0x00,0x04,0x04,0x00,0x04,0x04,0x00],
    '.': [0x00,0x00,0x00,0x00,0x00,0x04,0x00],
    '!': [0x04,0x04,0x04,0x04,0x04,0x00,0x04],
    '-': [0x00,0x00,0x00,0x1F,0x00,0x00,0x00],
    ' ': [0x00,0x00,0x00,0x00,0x00,0x00,0x00],
    '/': [0x01,0x01,0x02,0x04,0x08,0x10,0x10],
    '#': [0x0A,0x0A,0x1F,0x0A,0x1F,0x0A,0x0A],
};

function drawText(ctx, text, x, y, scale, color) {
    ctx.fillStyle = color || '#FFF1E8';
    const chars = text.toUpperCase().split('');
    let curX = x;
    for (const ch of chars) {
        const glyph = FONT[ch];
        if (glyph) {
            for (let row = 0; row < 7; row++) {
                const bits = glyph[row];
                for (let col = 0; col < 5; col++) {
                    if (bits & (1 << (4 - col))) {
                        ctx.fillRect(curX + col * scale, y + row * scale, scale, scale);
                    }
                }
            }
        }
        curX += 6 * scale;
    }
}

function textWidth(text, scale) {
    return text.length * 6 * scale - scale;
}

// ============================================================
// LEVEL DEFINITIONS  (boss wave added to every level)
// ============================================================
const LEVELS = [
    {
        name: 'OUTPOST ALPHA',
        waves: [
            { spawnDelay: 1.0, enemies: [{ type: 'crawler', count: 4 }] },
            { spawnDelay: 0.8, enemies: [{ type: 'crawler', count: 6 }] },
            { spawnDelay: 0.7, enemies: [{ type: 'crawler', count: 8 }] },
            { spawnDelay: 0,   enemies: [{ type: 'boss',    count: 1 }] }, // BOSS WAVE
        ]
    },
    {
        name: 'DANGER ZONE',
        waves: [
            { spawnDelay: 0.9, enemies: [{ type: 'crawler', count: 5 }, { type: 'sprinter', count: 2 }] },
            { spawnDelay: 0.7, enemies: [{ type: 'sprinter', count: 4 }, { type: 'crawler', count: 4 }] },
            { spawnDelay: 0.6, enemies: [{ type: 'crawler', count: 5 }, { type: 'shooter', count: 2 }] },
            { spawnDelay: 0,   enemies: [{ type: 'boss',    count: 1 }] },
        ]
    },
    {
        name: 'SIEGE TOWER',
        waves: [
            { spawnDelay: 0.8, enemies: [{ type: 'crawler', count: 6 }, { type: 'sprinter', count: 3 }] },
            { spawnDelay: 0.6, enemies: [{ type: 'shooter', count: 3 }, { type: 'sprinter', count: 4 }] },
            { spawnDelay: 0.5, enemies: [{ type: 'tank', count: 1 }, { type: 'crawler', count: 6 }] },
            { spawnDelay: 0,   enemies: [{ type: 'boss', count: 1 }] },
        ]
    },
    {
        name: 'IRON CORRIDOR',
        waves: [
            { spawnDelay: 0.7, enemies: [{ type: 'sprinter', count: 5 }, { type: 'shooter', count: 3 }] },
            { spawnDelay: 0.5, enemies: [{ type: 'shooter', count: 4 }, { type: 'crawler', count: 6 }] },
            { spawnDelay: 0.5, enemies: [{ type: 'tank', count: 1 }, { type: 'sprinter', count: 5 }] },
            { spawnDelay: 0.4, enemies: [{ type: 'shooter', count: 3 }, { type: 'sprinter', count: 4 }, { type: 'crawler', count: 4 }] },
            { spawnDelay: 0,   enemies: [{ type: 'boss', count: 1 }] },
        ]
    },
    {
        name: 'FINAL STAND',
        waves: [
            { spawnDelay: 0.6, enemies: [{ type: 'shooter', count: 4 }, { type: 'sprinter', count: 4 }] },
            { spawnDelay: 0.5, enemies: [{ type: 'tank', count: 2 }, { type: 'crawler', count: 5 }] },
            { spawnDelay: 0.4, enemies: [{ type: 'shooter', count: 5 }, { type: 'sprinter', count: 5 }] },
            { spawnDelay: 0.3, enemies: [{ type: 'tank', count: 2 }, { type: 'shooter', count: 3 }, { type: 'sprinter', count: 5 }] },
            { spawnDelay: 0,   enemies: [{ type: 'boss', count: 1 }] },
        ]
    },
];

// ============================================================
// ENEMY TEMPLATES  (boss added)
// ============================================================
const ENEMY_TEMPLATES = {
    crawler:  { w:10, h:10, speed:45,  hp:2,  damage:1, score:100,  fireRate:0 },
    sprinter: { w:8,  h:8,  speed:35,  hp:1,  damage:1, score:150,  fireRate:0 },
    shooter:  { w:12, h:12, speed:25,  hp:3,  damage:1, score:200,  fireRate:1.5 },
    tank:     { w:16, h:16, speed:18,  hp:8,  damage:2, score:500,  fireRate:2.0 },
    boss:     { w:24, h:24, speed:28,  hp:40, damage:2, score:2000, fireRate:0.8 },
};

// ============================================================
// GAME STATE
// ============================================================
const game = {
    state: 'menu', // 'menu' | 'playing' | 'bossIntro' | 'levelComplete' | 'gameOver' | 'scores'
    score: 0,
    highScore: parseInt(localStorage.getItem('retroShooterHighScore')) || 0,
    highScores: loadHighScores(),
    level: 0,
    player: null,
    enemies: [],
    bullets: [],
    particles: [],
    pickups: [],
    // Wave/spawn state
    currentWave: 0,
    spawnQueue: [],
    spawnTimer: 0,
    wavePauseTimer: 0,
    // Boss intro
    bossIntroTimer: 0,
    pendingBossSpawn: false,
    // Screen state
    menuBlink: 0,
    menuStars: [],
    menuTab: 'play', // 'play' | 'scores'
    fadeAlpha: 0,
    fadeDirection: 0,
    // Screen shake
    shakeIntensity: 0,
    shakeDuration: 0,
    // Power-up timers
    rapidFireTimer: 0,
    spreadShotTimer: 0,
    shotgunTimer: 0,
    shieldTimer: 0,
    // Level complete timer
    levelCompleteTimer: 0,
    victory: false,
    // Flash text queue: [{text, color, timer, maxTimer}]
    flashTexts: [],
};

// ============================================================
// ENTITY FACTORIES
// ============================================================
function createPlayer() {
    return {
        type: 'player',
        x: W / 2, y: H / 2,
        w: 10, h: 10,
        speed: PLAYER_SPEED,
        hp: PLAYER_MAX_HP, maxHp: PLAYER_MAX_HP,
        aimAngle: 0,
        fireRate: PLAYER_FIRE_RATE,
        lastFire: 0,
        invulnTimer: 0,
        walkTimer: 0,
        walkFrame: 0,
        alive: true,
    };
}

function createBullet(x, y, angle, speed, damage, owner, big) {
    return {
        type: 'bullet',
        x, y,
        w: big ? 5 : 3,
        h: big ? 5 : 3,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        damage, owner,
        lifetime: BULLET_LIFETIME,
        alive: true,
        big: !!big,
    };
}

function createEnemy(x, y, aiType) {
    const t = ENEMY_TEMPLATES[aiType];
    return {
        type: 'enemy',
        aiType,
        x, y,
        w: t.w, h: t.h,
        speed: t.speed,
        hp: t.hp, maxHp: t.hp,
        damage: t.damage,
        score: t.score,
        fireRate: t.fireRate,
        lastFire: 0,
        alive: true,
        aiState: 'approach',
        aiTimer: 0,
        hitFlash: 0,
        windupFlash: false,
        // boss-specific
        bossPhase: 1,      // 1 or 2 (phase 2 below 50% HP)
        bossAngle: 0,      // orbit angle for phase-2 circling
    };
}

function createParticle(x, y, vx, vy, color, lifetime, size) {
    return {
        x, y, vx, vy, color,
        lifetime, maxLifetime: lifetime,
        size: size || 2,
        alive: true,
    };
}

function createPickup(x, y, pickupType) {
    return {
        type: 'pickup',
        pickupType, // 'health' | 'rapidFire' | 'spread' | 'shotgun' | 'shield'
        x, y, w: 7, h: 7,
        age: 0,
        lifetime: 10.0,
        alive: true,
    };
}

// ============================================================
// SPAWN HELPERS
// ============================================================
function randomSpawnPos() {
    const edge = Math.floor(Math.random() * 4);
    const margin = 20;
    switch (edge) {
        case 0: return { x: Math.random() * W, y: -margin };
        case 1: return { x: Math.random() * W, y: H + margin };
        case 2: return { x: -margin, y: Math.random() * H };
        case 3: return { x: W + margin, y: Math.random() * H };
    }
}

function spawnParticles(x, y, color, count, speedMin, speedMax, lifetime, size) {
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = speedMin + Math.random() * (speedMax - speedMin);
        game.particles.push(createParticle(
            x, y,
            Math.cos(angle) * speed,
            Math.sin(angle) * speed,
            color, lifetime, size || 2
        ));
    }
}

// Big cinematic explosion for boss death
function spawnBossExplosion(x, y) {
    // Multiple rings of particles in different colors
    const colors = ['#FF004D', '#FFA300', '#FFEC27', '#FF77A8', '#FFF1E8'];
    for (let ring = 0; ring < 5; ring++) {
        const delay = ring * 0.06;
        const count = 18 + ring * 6;
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2 + ring * 0.3;
            const speed = 60 + ring * 30 + Math.random() * 40;
            const p = createParticle(
                x + (Math.random() - 0.5) * ring * 8,
                y + (Math.random() - 0.5) * ring * 8,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                colors[ring % colors.length],
                0.5 + ring * 0.12 + Math.random() * 0.2,
                3 + ring
            );
            game.particles.push(p);
        }
    }
}

// ============================================================
// FLASH TEXT
// ============================================================
function addFlashText(text, color, duration) {
    game.flashTexts.push({ text, color: color || '#FFEC27', timer: duration || 1.2, maxTimer: duration || 1.2 });
}

// ============================================================
// COLLISION
// ============================================================
function aabbOverlap(a, b) {
    return a.x - a.w / 2 < b.x + b.w / 2 &&
           a.x + a.w / 2 > b.x - b.w / 2 &&
           a.y - a.h / 2 < b.y + b.h / 2 &&
           a.y + a.h / 2 > b.y - b.h / 2;
}

function removeEntity(list, index) {
    list[index] = list[list.length - 1];
    list.pop();
}

// ============================================================
// GAME STATES
// ============================================================
const states = {};

// --- MENU STATE ---
states.menu = {
    enter() {
        game.menuBlink = 0;
        game.menuTab = 'play';
        game.menuStars = [];
        for (let i = 0; i < 60; i++) {
            game.menuStars.push({
                x: Math.random() * W,
                y: Math.random() * H,
                speed: 5 + Math.random() * 15,
                brightness: 0.3 + Math.random() * 0.7,
            });
        }
    },
    update(dt) {
        game.menuBlink += dt;
        for (const star of game.menuStars) {
            star.y += star.speed * dt;
            if (star.y > H) { star.y = -2; star.x = Math.random() * W; }
        }
        // Tab switching
        if (input.justPressed['ArrowLeft'] || input.justPressed['ArrowRight'] ||
            input.justPressed['KeyA'] || input.justPressed['KeyD']) {
            game.menuTab = game.menuTab === 'play' ? 'scores' : 'play';
        }
        if (game.menuTab === 'play') {
            if (input.justPressed['Enter'] || input.justPressed['Space'] || input.mouseJustPressed) {
                game.state = 'playing';
                states.playing.enter(true);
            }
        } else {
            if (input.justPressed['Enter'] || input.justPressed['Space'] || input.mouseJustPressed) {
                game.menuTab = 'play';
            }
        }
    },
    draw(ctx) {
        ctx.fillStyle = '#0a0a1a';
        ctx.fillRect(0, 0, W, H);
        for (const star of game.menuStars) {
            const b = Math.floor(star.brightness * 255);
            ctx.fillStyle = `rgb(${b},${b},${b + 30})`;
            ctx.fillRect(Math.round(star.x), Math.round(star.y), 1, 1);
        }
        // Title
        const title = 'RETRO SHOOTER';
        const titleScale = 3;
        const tw = textWidth(title, titleScale);
        drawText(ctx, title, (W - tw) / 2, 30, titleScale, '#FF004D');

        // Tab headers
        const playLabel  = 'PLAY';
        const scoreLabel = 'HIGH SCORES';
        const tabScale = 1;
        const playW  = textWidth(playLabel, tabScale);
        const scoreW = textWidth(scoreLabel, tabScale);
        const tabY = 78;
        const playX  = W / 2 - 50;
        const scoreX = W / 2 + 10;
        drawText(ctx, playLabel,  playX,  tabY, tabScale, game.menuTab === 'play'   ? '#FFEC27' : '#5F574F');
        drawText(ctx, scoreLabel, scoreX, tabY, tabScale, game.menuTab === 'scores' ? '#FFEC27' : '#5F574F');
        // Tab underlines
        if (game.menuTab === 'play') {
            ctx.fillStyle = '#FFEC27';
            ctx.fillRect(playX, tabY + 10, playW, 1);
        } else {
            ctx.fillStyle = '#FFEC27';
            ctx.fillRect(scoreX, tabY + 10, scoreW, 1);
        }

        if (game.menuTab === 'play') {
            // Blinking prompt
            if (Math.floor(game.menuBlink * 2) % 2 === 0) {
                const prompt = 'PRESS ENTER OR CLICK TO START';
                const ps = 1;
                const pw = textWidth(prompt, ps);
                drawText(ctx, prompt, (W - pw) / 2, 120, ps, '#FFF1E8');
            }
            // Controls
            const controls = ['ARROW KEYS/WASD - MOVE', 'MOUSE - AIM', 'LEFT CLICK - SHOOT'];
            controls.forEach((line, i) => {
                const lw = textWidth(line, 1);
                drawText(ctx, line, (W - lw) / 2, 155 + i * 12, 1, '#5F574F');
            });
            // Powerup legend
            const legend = [
                { color: '#00E436', label: '+ HEALTH' },
                { color: '#FFEC27', label: '>> RAPID FIRE' },
                { color: '#29ADFF', label: '))) SPREAD' },
                { color: '#FFA300', label: '::: SHOTGUN' },
                { color: '#83769C', label: 'O  SHIELD' },
            ];
            legend.forEach((item, i) => {
                const col = i < 3 ? 0 : 1;
                const row = i < 3 ? i : i - 3;
                const lx = W / 2 - 80 + col * 100;
                const ly = 210 + row * 10;
                drawText(ctx, item.label, lx, ly, 1, item.color);
            });
        } else {
            // High scores table
            drawScoresTable(ctx, 98, game.highScores);
        }

        // Arrow hint
        const nav = '< ARROW KEYS TO SWITCH >';
        const nw = textWidth(nav, 1);
        drawText(ctx, nav, (W - nw) / 2, 255, 1, '#1D2B53');
    },
};

function drawScoresTable(ctx, startY, scores) {
    if (!scores || scores.length === 0) {
        const msg = 'NO SCORES YET - PLAY FIRST!';
        const mw = textWidth(msg, 1);
        drawText(ctx, msg, (W - mw) / 2, startY + 30, 1, '#5F574F');
        return;
    }
    const headers = ['#', 'SCORE', 'LVL', 'DATE'];
    const cols = [W/2 - 100, W/2 - 60, W/2 + 30, W/2 + 60];
    headers.forEach((h, i) => drawText(ctx, h, cols[i], startY, 1, '#83769C'));
    ctx.fillStyle = '#1D2B53';
    ctx.fillRect(cols[0], startY + 9, 200, 1);
    scores.forEach((s, idx) => {
        const y = startY + 16 + idx * 12;
        const rowColor = idx === 0 ? '#FFEC27' : '#FFF1E8';
        drawText(ctx, '' + (idx + 1), cols[0], y, 1, rowColor);
        drawText(ctx, '' + s.score,   cols[1], y, 1, rowColor);
        drawText(ctx, '' + s.level,   cols[2], y, 1, rowColor);
        // Date — shorten if too long
        const dateStr = (s.date || '').slice(0, 8);
        drawText(ctx, dateStr, cols[3], y, 1, '#83769C');
    });
}

// --- BOSS INTRO STATE ---
states.bossIntro = {
    enter() {
        game.bossIntroTimer = 0;
        game.pendingBossSpawn = true;
        audio.playBossIntro();
    },
    update(dt) {
        game.bossIntroTimer += dt;
        if (game.bossIntroTimer >= 2.5) {
            // Spawn boss and transition to playing
            if (game.pendingBossSpawn) {
                game.pendingBossSpawn = false;
                const pos = randomSpawnPos();
                game.enemies.push(createEnemy(pos.x, pos.y, 'boss'));
            }
            game.state = 'playing';
        }
    },
    draw(ctx) {
        // Draw frozen game state underneath
        states.playing.draw(ctx);
        // Dark vignette
        const vignette = ctx.createRadialGradient(W/2, H/2, 30, W/2, H/2, W/1.2);
        vignette.addColorStop(0, 'rgba(0,0,0,0)');
        vignette.addColorStop(1, 'rgba(0,0,0,0.75)');
        ctx.fillStyle = vignette;
        ctx.fillRect(0, 0, W, H);
        // Boss warning text
        const pulse = 0.6 + 0.4 * Math.abs(Math.sin(game.bossIntroTimer * 4));
        ctx.globalAlpha = pulse;
        const warn  = '! WARNING !';
        const warn2 = 'BOSS INCOMING';
        const ws = 2;
        drawText(ctx, warn,  (W - textWidth(warn,  ws)) / 2, H/2 - 20, ws, '#FF004D');
        const ws2 = 1;
        drawText(ctx, warn2, (W - textWidth(warn2, ws2)) / 2, H/2 + 10, ws2, '#FFF1E8');
        ctx.globalAlpha = 1;
    },
};

// --- PLAYING STATE ---
states.playing = {
    enter(newGame) {
        if (newGame !== false) {
            game.player = createPlayer();
            game.enemies = [];
            game.bullets = [];
            game.particles = [];
            game.pickups = [];
            game.flashTexts = [];
            game.score = 0;
            game.level = 0;
            game.currentWave = 0;
            game.shakeIntensity = 0;
            game.shakeDuration = 0;
            game.rapidFireTimer = 0;
            game.spreadShotTimer = 0;
            game.shotgunTimer = 0;
            game.shieldTimer = 0;
        }
        this.loadWave();
    },

    loadWave() {
        const level = LEVELS[game.level];
        if (!level) {
            game.state = 'gameOver';
            states.gameOver.enter(true);
            return;
        }
        if (game.currentWave >= level.waves.length) {
            game.state = 'levelComplete';
            states.levelComplete.enter();
            return;
        }
        const wave = level.waves[game.currentWave];
        const isBossWave = wave.enemies.some(g => g.type === 'boss');

        if (isBossWave) {
            // Transition through boss intro screen
            game.state = 'bossIntro';
            states.bossIntro.enter();
            game.spawnQueue = [];
            game.wavePauseTimer = 0;
            return;
        }

        game.spawnQueue = [];
        for (const group of wave.enemies) {
            for (let i = 0; i < group.count; i++) {
                game.spawnQueue.push(group.type);
            }
        }
        // Shuffle
        for (let i = game.spawnQueue.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [game.spawnQueue[i], game.spawnQueue[j]] = [game.spawnQueue[j], game.spawnQueue[i]];
        }
        game.spawnTimer = 0.5;
        game.wavePauseTimer = 0;
    },

    update(dt) {
        const p = game.player;

        // Power-up timers
        if (game.rapidFireTimer  > 0) game.rapidFireTimer  -= dt;
        if (game.spreadShotTimer > 0) game.spreadShotTimer -= dt;
        if (game.shotgunTimer    > 0) game.shotgunTimer    -= dt;
        if (game.shieldTimer     > 0) game.shieldTimer     -= dt;

        // Flash texts
        for (let i = game.flashTexts.length - 1; i >= 0; i--) {
            game.flashTexts[i].timer -= dt;
            if (game.flashTexts[i].timer <= 0) game.flashTexts.splice(i, 1);
        }

        // Screen shake
        if (game.shakeDuration > 0) {
            game.shakeDuration -= dt;
            if (game.shakeDuration < 0) game.shakeDuration = 0;
        }

        // --- Player movement ---
        let dx = 0, dy = 0;
        if (input.keys['ArrowLeft'] || input.keys['KeyA']) dx -= 1;
        if (input.keys['ArrowRight'] || input.keys['KeyD']) dx += 1;
        if (input.keys['ArrowUp'] || input.keys['KeyW']) dy -= 1;
        if (input.keys['ArrowDown'] || input.keys['KeyS']) dy += 1;
        if (dx !== 0 && dy !== 0) { const inv = 1 / Math.sqrt(2); dx *= inv; dy *= inv; }
        p.x += dx * p.speed * dt;
        p.y += dy * p.speed * dt;
        p.x = Math.max(p.w / 2, Math.min(W - p.w / 2, p.x));
        p.y = Math.max(p.h / 2, Math.min(H - p.h / 2, p.y));

        // Walk animation
        if (dx !== 0 || dy !== 0) {
            p.walkTimer += dt;
            if (p.walkTimer > 0.12) { p.walkTimer = 0; p.walkFrame = (p.walkFrame + 1) % 2; }
        } else { p.walkFrame = -1; p.walkTimer = 0; }

        p.aimAngle = Math.atan2(input.mouseY - p.y, input.mouseX - p.x);
        if (p.invulnTimer > 0) p.invulnTimer -= dt;

        // --- Shooting ---
        p.lastFire -= dt;
        const fireRate = game.rapidFireTimer > 0 ? p.fireRate / 2.5 : p.fireRate;
        if (input.mouseDown && p.lastFire <= 0) {
            p.lastFire = fireRate;
            const gunOffset = 8;
            const bx = p.x + Math.cos(p.aimAngle) * gunOffset;
            const by = p.y + Math.sin(p.aimAngle) * gunOffset;

            if (game.shotgunTimer > 0) {
                // Shotgun: 6-pellet spread
                for (let i = -2; i <= 3; i++) {
                    const pelletAngle = p.aimAngle + i * 0.12 + (Math.random() - 0.5) * 0.05;
                    game.bullets.push(createBullet(bx, by, pelletAngle, BULLET_SPEED * (0.8 + Math.random() * 0.3), 1, 'player'));
                }
                spawnParticles(bx, by, '#FFA300', 8, 30, 100, 0.1, 2);
                audio.playShotgunShoot();
            } else if (game.spreadShotTimer > 0) {
                // Spread: 3 bullets
                for (let i = -1; i <= 1; i++) {
                    game.bullets.push(createBullet(bx, by, p.aimAngle + i * 0.15, BULLET_SPEED, 1, 'player'));
                }
                spawnParticles(bx, by, '#29ADFF', 4, 20, 70, 0.08, 2);
                audio.playShoot();
            } else {
                game.bullets.push(createBullet(bx, by, p.aimAngle, BULLET_SPEED, 1, 'player'));
                spawnParticles(bx, by, '#FFEC27', 3, 20, 60, 0.06, 2);
                audio.playShoot();
            }
        }

        // --- Spawn enemies ---
        if (game.wavePauseTimer > 0) {
            game.wavePauseTimer -= dt;
            if (game.wavePauseTimer <= 0) this.loadWave();
        } else if (game.spawnQueue.length > 0) {
            game.spawnTimer -= dt;
            if (game.spawnTimer <= 0) {
                const level = LEVELS[game.level];
                const wave  = level.waves[game.currentWave];
                game.spawnTimer = wave.spawnDelay;
                const etype = game.spawnQueue.shift();
                const pos   = randomSpawnPos();
                game.enemies.push(createEnemy(pos.x, pos.y, etype));
            }
        }

        // --- Update bullets ---
        for (let i = game.bullets.length - 1; i >= 0; i--) {
            const b = game.bullets[i];
            b.x += b.vx * dt;
            b.y += b.vy * dt;
            b.lifetime -= dt;
            if (b.lifetime <= 0 || b.x < -20 || b.x > W + 20 || b.y < -20 || b.y > H + 20) {
                removeEntity(game.bullets, i);
            }
        }

        // --- Update enemies ---
        for (let i = game.enemies.length - 1; i >= 0; i--) {
            const e = game.enemies[i];
            if (e.hitFlash > 0) e.hitFlash -= dt;

            const toPlayerX = p.x - e.x;
            const toPlayerY = p.y - e.y;
            const distToPlayer = Math.sqrt(toPlayerX * toPlayerX + toPlayerY * toPlayerY) || 1;
            const dirX = toPlayerX / distToPlayer;
            const dirY = toPlayerY / distToPlayer;

            switch (e.aiType) {
                case 'crawler':
                    e.x += dirX * e.speed * dt;
                    e.y += dirY * e.speed * dt;
                    break;

                case 'sprinter':
                    if (e.aiState === 'approach') {
                        e.aiTimer += dt;
                        if (e.hitFlash <= 0) e.windupFlash = true;
                        if (e.aiTimer >= 0.8) { e.aiState = 'sprint'; e.aiTimer = 0; e.hitFlash = 0; }
                    } else if (e.aiState === 'sprint') {
                        e.x += dirX * e.speed * 2.5 * dt;
                        e.y += dirY * e.speed * 2.5 * dt;
                        e.aiTimer += dt;
                        if (e.aiTimer >= 1.5) { e.aiState = 'pause'; e.aiTimer = 0; }
                    } else if (e.aiState === 'pause') {
                        e.aiTimer += dt;
                        if (e.aiTimer >= 0.5) { e.aiState = 'approach'; e.aiTimer = 0; }
                    }
                    break;

                case 'shooter':
                    if (distToPlayer > 120) {
                        e.x += dirX * e.speed * dt;
                        e.y += dirY * e.speed * dt;
                    } else {
                        e.aiTimer += dt;
                        const strafeAngle = Math.atan2(toPlayerY, toPlayerX) + Math.PI / 2;
                        e.x += Math.cos(strafeAngle) * e.speed * 0.5 * dt;
                        e.y += Math.sin(strafeAngle) * e.speed * 0.5 * dt;
                    }
                    e.lastFire -= dt;
                    if (e.lastFire <= 0 && distToPlayer < 200) {
                        e.lastFire = e.fireRate;
                        const shootAngle = Math.atan2(toPlayerY, toPlayerX) + (Math.random() - 0.5) * 0.2;
                        game.bullets.push(createBullet(e.x, e.y, shootAngle, 120, 1, 'enemy'));
                        audio.playEnemyShoot();
                    }
                    break;

                case 'tank':
                    e.x += dirX * e.speed * dt;
                    e.y += dirY * e.speed * dt;
                    e.lastFire -= dt;
                    if (e.lastFire <= 0 && distToPlayer < 250) {
                        e.lastFire = e.fireRate;
                        const shootAngle = Math.atan2(toPlayerY, toPlayerX) + (Math.random() - 0.5) * 0.15;
                        game.bullets.push(createBullet(e.x, e.y, shootAngle, 80, 1, 'enemy', true));
                        audio.playEnemyShoot();
                    }
                    break;

                case 'boss':
                    this.updateBoss(e, p, dt, distToPlayer, dirX, dirY, toPlayerX, toPlayerY);
                    break;
            }

            // Keep enemies loosely on screen
            if (e.aiType !== 'boss') {
                e.x = Math.max(-10, Math.min(W + 10, e.x));
                e.y = Math.max(-10, Math.min(H + 10, e.y));
            }
        }

        // --- Collision: player bullets vs enemies ---
        for (let bi = game.bullets.length - 1; bi >= 0; bi--) {
            const b = game.bullets[bi];
            if (b.owner !== 'player') continue;
            let hit = false;
            for (let ei = game.enemies.length - 1; ei >= 0; ei--) {
                const e = game.enemies[ei];
                if (aabbOverlap(b, e)) {
                    e.hp -= b.damage;
                    e.hitFlash = 0.08;
                    b.alive = false;
                    hit = true;
                    // Hit particles — bigger for boss
                    if (e.aiType === 'boss') {
                        spawnParticles(b.x, b.y, '#FF77A8', 8, 40, 100, 0.2, 3);
                        audio.playBossHit();
                    } else {
                        spawnParticles(b.x, b.y, '#FFA300', 5, 30, 80, 0.15, 2);
                        audio.playHit();
                    }
                    if (e.hp <= 0) {
                        e.alive = false;
                        game.score += e.score;
                        if (e.aiType === 'boss') {
                            // Epic boss death
                            spawnBossExplosion(e.x, e.y);
                            game.shakeIntensity = 8;
                            game.shakeDuration  = 0.6;
                            addFlashText('BOSS DEFEATED! +' + e.score, '#FFEC27', 2.5);
                            audio.playBossExplosion();
                            // Drop guaranteed shield + health
                            game.pickups.push(createPickup(e.x - 10, e.y, 'health'));
                            game.pickups.push(createPickup(e.x + 10, e.y, 'shield'));
                        } else {
                            spawnParticles(e.x, e.y, PALETTE[8], 15, 40, 120, 0.3, 3);
                            spawnParticles(e.x, e.y, '#FFEC27',  8, 30, 80,  0.2, 2);
                            game.shakeIntensity = 2;
                            game.shakeDuration  = 0.1;
                            audio.playExplosion();
                            // Random pickup drop
                            const roll = Math.random();
                            if      (roll < 0.08) game.pickups.push(createPickup(e.x, e.y, 'health'));
                            else if (roll < 0.13) game.pickups.push(createPickup(e.x, e.y, 'rapidFire'));
                            else if (roll < 0.17) game.pickups.push(createPickup(e.x, e.y, 'spread'));
                            else if (roll < 0.20) game.pickups.push(createPickup(e.x, e.y, 'shotgun'));
                            else if (roll < 0.22) game.pickups.push(createPickup(e.x, e.y, 'shield'));
                        }
                    }
                    removeEntity(game.bullets, bi);
                    break;
                }
            }
        }

        // --- Collision: enemy bullets vs player ---
        if (p.invulnTimer <= 0) {
            for (let bi = game.bullets.length - 1; bi >= 0; bi--) {
                const b = game.bullets[bi];
                if (b.owner !== 'enemy') continue;
                if (aabbOverlap(b, p)) {
                    if (game.shieldTimer > 0) {
                        // Shield absorbs hit
                        spawnParticles(p.x, p.y, '#83769C', 12, 30, 80, 0.2, 3);
                        game.shieldTimer = Math.max(0, game.shieldTimer - 2);
                        addFlashText('SHIELD!', '#83769C', 0.6);
                    } else {
                        p.hp -= b.damage;
                        p.invulnTimer = PLAYER_INVULN_TIME;
                        game.shakeIntensity = 4;
                        game.shakeDuration  = 0.15;
                        spawnParticles(p.x, p.y, '#FF004D', 10, 40, 100, 0.25, 2);
                        audio.playPlayerHit();
                    }
                    b.alive = false;
                    removeEntity(game.bullets, bi);
                    if (p.hp <= 0) { p.alive = false; game.state = 'gameOver'; states.gameOver.enter(); return; }
                    break;
                }
            }
        }

        // --- Collision: enemies vs player (contact damage) ---
        if (p.invulnTimer <= 0) {
            for (const e of game.enemies) {
                if (aabbOverlap(e, p)) {
                    if (game.shieldTimer > 0) {
                        spawnParticles(p.x, p.y, '#83769C', 10, 30, 70, 0.15, 3);
                        game.shieldTimer = Math.max(0, game.shieldTimer - 1.5);
                        p.invulnTimer = 0.5;
                        addFlashText('SHIELD!', '#83769C', 0.6);
                    } else {
                        p.hp -= e.damage;
                        p.invulnTimer = PLAYER_INVULN_TIME;
                        game.shakeIntensity = 3;
                        game.shakeDuration  = 0.12;
                        spawnParticles(p.x, p.y, '#FF004D', 8, 30, 80, 0.2, 2);
                        audio.playPlayerHit();
                        const pushAngle = Math.atan2(p.y - e.y, p.x - e.x);
                        p.x += Math.cos(pushAngle) * 20;
                        p.y += Math.sin(pushAngle) * 20;
                        p.x = Math.max(p.w / 2, Math.min(W - p.w / 2, p.x));
                        p.y = Math.max(p.h / 2, Math.min(H - p.h / 2, p.y));
                    }
                    if (p.hp <= 0) { p.alive = false; game.state = 'gameOver'; states.gameOver.enter(); return; }
                    break;
                }
            }
        }

        // --- Collision: player vs pickups ---
        for (let pi = game.pickups.length - 1; pi >= 0; pi--) {
            const pk = game.pickups[pi];
            if (aabbOverlap(pk, p)) {
                switch (pk.pickupType) {
                    case 'health':
                        p.hp = Math.min(p.hp + 1, p.maxHp);
                        addFlashText('+1 HP', '#00E436', 1.0);
                        audio.playPickup();
                        break;
                    case 'rapidFire':
                        game.rapidFireTimer = 8;
                        addFlashText('RAPID FIRE!', '#FFEC27', 1.2);
                        audio.playPickup();
                        break;
                    case 'spread':
                        game.spreadShotTimer = 8;
                        addFlashText('SPREAD SHOT!', '#29ADFF', 1.2);
                        audio.playPickup();
                        break;
                    case 'shotgun':
                        game.shotgunTimer = 8;
                        addFlashText('SHOTGUN!', '#FFA300', 1.2);
                        audio.playShotgunShoot();
                        break;
                    case 'shield':
                        game.shieldTimer = 12;
                        addFlashText('SHIELD UP!', '#83769C', 1.2);
                        audio.playShield();
                        break;
                }
                spawnParticles(pk.x, pk.y, '#FFEC27', 12, 30, 70, 0.25, 2);
                removeEntity(game.pickups, pi);
            }
        }

        // --- Update pickups ---
        for (let i = game.pickups.length - 1; i >= 0; i--) {
            const pk = game.pickups[i];
            pk.age += dt;
            pk.lifetime -= dt;
            if (pk.lifetime <= 0) removeEntity(game.pickups, i);
        }

        // --- Remove dead entities ---
        for (let i = game.bullets.length - 1; i >= 0; i--)
            if (!game.bullets[i].alive) removeEntity(game.bullets, i);
        for (let i = game.enemies.length - 1; i >= 0; i--)
            if (!game.enemies[i].alive) removeEntity(game.enemies, i);

        // --- Update particles ---
        for (let i = game.particles.length - 1; i >= 0; i--) {
            const pt = game.particles[i];
            pt.x += pt.vx * dt;
            pt.y += pt.vy * dt;
            pt.vx *= 0.97;
            pt.vy *= 0.97;
            pt.lifetime -= dt;
            if (pt.lifetime <= 0) removeEntity(game.particles, i);
        }

        // --- Wave completion check ---
        if (game.spawnQueue.length === 0 && game.enemies.length === 0 && game.wavePauseTimer <= 0) {
            game.currentWave++;
            game.wavePauseTimer = 2.0;
        }
    },

    // Boss AI
    updateBoss(e, p, dt, distToPlayer, dirX, dirY, toPlayerX, toPlayerY) {
        // Phase check
        const phaseThreshold = e.maxHp * 0.5;
        if (e.hp <= phaseThreshold && e.bossPhase === 1) {
            e.bossPhase = 2;
            e.fireRate  = 0.4; // shoot faster in phase 2
            addFlashText('PHASE 2!', '#FF004D', 1.5);
            spawnParticles(e.x, e.y, '#FF004D', 30, 50, 150, 0.4, 4);
            game.shakeIntensity = 5;
            game.shakeDuration  = 0.3;
        }

        if (e.bossPhase === 1) {
            // Phase 1: approach + shoot spread
            e.x += dirX * e.speed * dt;
            e.y += dirY * e.speed * dt;
            e.lastFire -= dt;
            if (e.lastFire <= 0 && distToPlayer < 280) {
                e.lastFire = e.fireRate;
                // 3-bullet spread toward player
                for (let i = -1; i <= 1; i++) {
                    const a = Math.atan2(toPlayerY, toPlayerX) + i * 0.2 + (Math.random() - 0.5) * 0.1;
                    game.bullets.push(createBullet(e.x, e.y, a, 100, 1, 'enemy', true));
                }
                audio.playBossShoot();
            }
        } else {
            // Phase 2: orbit + bullet ring + charge
            e.bossAngle += dt * 1.2;
            const orbitRadius = 90;
            const targetX = p.x + Math.cos(e.bossAngle) * orbitRadius;
            const targetY = p.y + Math.sin(e.bossAngle) * orbitRadius;
            const toBossX = targetX - e.x;
            const toBossY = targetY - e.y;
            const len = Math.sqrt(toBossX * toBossX + toBossY * toBossY) || 1;
            e.x += (toBossX / len) * e.speed * 1.4 * dt;
            e.y += (toBossY / len) * e.speed * 1.4 * dt;
            // Shoot 5-bullet burst in ring
            e.lastFire -= dt;
            if (e.lastFire <= 0) {
                e.lastFire = e.fireRate;
                for (let i = 0; i < 5; i++) {
                    const a = (i / 5) * Math.PI * 2;
                    game.bullets.push(createBullet(e.x, e.y, a, 90, 1, 'enemy', true));
                }
                audio.playBossShoot();
            }
        }
        // Clamp boss to arena
        e.x = Math.max(e.w / 2, Math.min(W - e.w / 2, e.x));
        e.y = Math.max(e.h / 2, Math.min(H - e.h / 2, e.y));
    },

    draw(ctx) {
        drawFloor(ctx);

        ctx.save();
        if (game.shakeDuration > 0) {
            const ox = (Math.random() - 0.5) * game.shakeIntensity * 2;
            const oy = (Math.random() - 0.5) * game.shakeIntensity * 2;
            ctx.translate(Math.round(ox), Math.round(oy));
        }

        // Shield aura around player
        if (game.shieldTimer > 0) {
            const p = game.player;
            const pulse = 0.4 + 0.3 * Math.abs(Math.sin(Date.now() / 200));
            ctx.globalAlpha = pulse;
            ctx.strokeStyle = '#83769C';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(Math.round(p.x), Math.round(p.y), 10, 0, Math.PI * 2);
            ctx.stroke();
            ctx.globalAlpha = 1;
        }

        // Pickups
        for (const pk of game.pickups) drawPickup(ctx, pk);

        // Enemies
        for (const e of game.enemies) drawEnemy(ctx, e);

        // Player
        const p = game.player;
        if (p.alive && (p.invulnTimer <= 0 || Math.floor(p.invulnTimer * 10) % 2 === 0)) {
            const spriteName = p.walkFrame === -1 ? 'playerIdle' : (p.walkFrame === 0 ? 'playerWalk1' : 'playerWalk2');
            drawRotated(ctx, spriteCache[spriteName], p.x, p.y, p.aimAngle + Math.PI / 2);
        }

        // Bullets
        for (const b of game.bullets) {
            if (b.owner === 'player') {
                ctx.fillStyle = game.shotgunTimer > 0 ? '#FFA300' : (game.spreadShotTimer > 0 ? '#29ADFF' : '#FFEC27');
            } else {
                ctx.fillStyle = b.big ? '#FF77A8' : '#FF004D';
            }
            ctx.fillRect(Math.round(b.x - b.w / 2), Math.round(b.y - b.h / 2), b.w, b.h);
        }

        // Particles
        for (const pt of game.particles) {
            const alpha = pt.lifetime / pt.maxLifetime;
            ctx.globalAlpha = alpha;
            ctx.fillStyle = pt.color;
            const s = Math.max(1, pt.size * alpha);
            ctx.fillRect(Math.round(pt.x - s / 2), Math.round(pt.y - s / 2), Math.round(s), Math.round(s));
        }
        ctx.globalAlpha = 1;

        ctx.restore(); // End shake

        // Crosshair
        drawSprite(ctx, spriteCache.crosshair, input.mouseX, input.mouseY);

        // HUD
        drawHUD(ctx);

        // Flash texts — centered, fading up
        for (const ft of game.flashTexts) {
            const progress = 1 - (ft.timer / ft.maxTimer);
            const alpha    = ft.timer / ft.maxTimer;
            const yOffset  = -progress * 20;
            ctx.globalAlpha = alpha;
            const fs = 2;
            const fw = textWidth(ft.text, fs);
            drawText(ctx, ft.text, (W - fw) / 2, H / 2 - 30 + yOffset, fs, ft.color);
            ctx.globalAlpha = 1;
        }

        // Wave announcement
        if (game.wavePauseTimer > 1.0 && game.currentWave > 0) {
            const level = LEVELS[game.level];
            if (level) {
                const isBossNext = game.currentWave < level.waves.length &&
                    level.waves[game.currentWave].enemies.some(g => g.type === 'boss');
                const waveText = isBossNext ? 'BOSS WAVE!' : 'WAVE ' + (game.currentWave + 1) + '/' + level.waves.length;
                const waveColor = isBossNext ? '#FF004D' : '#FFF1E8';
                const ws = isBossNext ? 2 : 2;
                const ww = textWidth(waveText, ws);
                drawText(ctx, waveText, (W - ww) / 2, H / 2 - 10, ws, waveColor);
            }
        }
    },
};

// --- LEVEL COMPLETE ---
states.levelComplete = {
    enter() {
        game.levelCompleteTimer = 0;
        audio.playLevelComplete();
    },
    update(dt) {
        game.levelCompleteTimer += dt;
        for (let i = game.particles.length - 1; i >= 0; i--) {
            const pt = game.particles[i];
            pt.x += pt.vx * dt; pt.y += pt.vy * dt;
            pt.vx *= 0.97; pt.vy *= 0.97;
            pt.lifetime -= dt;
            if (pt.lifetime <= 0) removeEntity(game.particles, i);
        }
        if (game.levelCompleteTimer > 1.5 && (input.justPressed['Enter'] || input.justPressed['Space'])) {
            game.level++;
            game.currentWave = 0;
            game.state = 'playing';
            states.playing.enter(false);
        }
    },
    draw(ctx) {
        drawFloor(ctx);
        for (const pt of game.particles) {
            const alpha = pt.lifetime / pt.maxLifetime;
            ctx.globalAlpha = alpha;
            ctx.fillStyle = pt.color;
            const s = pt.size * alpha;
            ctx.fillRect(Math.round(pt.x - s / 2), Math.round(pt.y - s / 2), Math.round(s), Math.round(s));
        }
        ctx.globalAlpha = 1;
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(0, 0, W, H);
        const titleText = 'LEVEL COMPLETE!';
        drawText(ctx, titleText, (W - textWidth(titleText, 2)) / 2, 70, 2, '#FFEC27');
        const level = LEVELS[game.level];
        if (level) {
            drawText(ctx, level.name, (W - textWidth(level.name, 1)) / 2, 105, 1, '#C2C3C7');
        }
        const scoreText = 'SCORE: ' + game.score;
        drawText(ctx, scoreText, (W - textWidth(scoreText, 2)) / 2, 130, 2, '#FFF1E8');
        if (game.levelCompleteTimer > 1.5) {
            drawText(ctx, 'PRESS ENTER TO CONTINUE', (W - textWidth('PRESS ENTER TO CONTINUE', 1)) / 2, 185, 1, '#5F574F');
        }
    },
};

// --- GAME OVER ---
states.gameOver = {
    enter(victory) {
        game.levelCompleteTimer = 0;
        game.victory = victory || false;
        game.highScores = saveHighScore(game.score, game.level + 1);
        game.highScore  = game.highScores.length > 0 ? game.highScores[0].score : game.score;
        if (victory) audio.playVictory();
        else         audio.playGameOver();
    },
    update(dt) {
        game.levelCompleteTimer += dt;
        if (game.levelCompleteTimer > 1.5 &&
           (input.justPressed['Enter'] || input.justPressed['Space'] || input.mouseJustPressed)) {
            game.state = 'menu';
            states.menu.enter();
        }
    },
    draw(ctx) {
        drawFloor(ctx);
        for (const e of game.enemies) drawEnemy(ctx, e);
        for (const b of game.bullets) {
            ctx.fillStyle = b.owner === 'player' ? '#FFEC27' : '#FF004D';
            ctx.fillRect(Math.round(b.x - b.w / 2), Math.round(b.y - b.h / 2), b.w, b.h);
        }
        ctx.fillStyle = 'rgba(0,0,0,0.75)';
        ctx.fillRect(0, 0, W, H);

        const title = game.victory ? 'VICTORY!' : 'GAME OVER';
        drawText(ctx, title, (W - textWidth(title, 3)) / 2, 40, 3, '#FF004D');

        const scoreText = 'FINAL SCORE: ' + game.score;
        drawText(ctx, scoreText, (W - textWidth(scoreText, 2)) / 2, 100, 2, '#FFF1E8');

        const levelText = 'REACHED LEVEL: ' + (game.level + 1);
        drawText(ctx, levelText, (W - textWidth(levelText, 1)) / 2, 128, 1, '#C2C3C7');

        // Is it a new record?
        if (game.highScores.length > 0 && game.score === game.highScores[0].score && game.score > 0) {
            const rec = 'NEW HIGH SCORE!';
            const pulse = 0.6 + 0.4 * Math.abs(Math.sin(game.levelCompleteTimer * 4));
            ctx.globalAlpha = pulse;
            drawText(ctx, rec, (W - textWidth(rec, 1)) / 2, 142, 1, '#FFEC27');
            ctx.globalAlpha = 1;
        }

        // Mini leaderboard
        const lbY = 156;
        drawText(ctx, 'TOP SCORES', (W - textWidth('TOP SCORES', 1)) / 2, lbY, 1, '#83769C');
        ctx.fillStyle = '#1D2B53';
        ctx.fillRect(W/2 - 80, lbY + 9, 160, 1);
        game.highScores.slice(0, 3).forEach((s, i) => {
            const y = lbY + 14 + i * 10;
            const isThis = (i === 0 && game.score === s.score);
            const color  = isThis ? '#FFEC27' : '#5F574F';
            const line   = (i + 1) + '. ' + s.score + '  LVL ' + s.level;
            drawText(ctx, line, (W - textWidth(line, 1)) / 2, y, 1, color);
        });

        if (game.levelCompleteTimer > 1.5) {
            drawText(ctx, 'PRESS ENTER TO RETRY', (W - textWidth('PRESS ENTER TO RETRY', 1)) / 2, 216, 1, '#5F574F');
        }
    },
};

// ============================================================
// DRAWING HELPERS
// ============================================================
function drawFloor(ctx) {
    ctx.fillStyle = '#111122';
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = '#1a1a33';
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 32) {
        ctx.beginPath(); ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, H); ctx.stroke();
    }
    for (let y = 0; y < H; y += 32) {
        ctx.beginPath(); ctx.moveTo(0, y + 0.5); ctx.lineTo(W, y + 0.5); ctx.stroke();
    }
}

function drawEnemy(ctx, e) {
    const angle = Math.atan2(game.player.y - e.y, game.player.x - e.x) + Math.PI / 2;
    const spriteName = e.aiType;
    // Phase 2 boss gets a red tint
    if (e.aiType === 'boss' && e.bossPhase === 2) {
        ctx.save();
        ctx.globalCompositeOperation = 'multiply';
        ctx.globalAlpha = 0.0;
        ctx.restore();
    }
    if (e.hitFlash > 0) {
        ctx.globalAlpha = 0.7;
        drawRotated(ctx, spriteCache[spriteName], e.x, e.y, angle);
        ctx.globalAlpha = 1;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        drawRotated(ctx, spriteCache[spriteName], e.x, e.y, angle);
        ctx.restore();
    } else {
        if (e.windupFlash && Math.floor(e.aiTimer * 8) % 2 === 0) ctx.globalAlpha = 0.5;
        drawRotated(ctx, spriteCache[spriteName], e.x, e.y, angle);
        ctx.globalAlpha = 1;
    }
    // HP bar for enemies with more than 1 max HP
    if (e.maxHp > 2) {
        const barW = e.w;
        const barH = e.aiType === 'boss' ? 3 : 2;
        const barX = e.x - barW / 2;
        const barY = e.y - e.h / 2 - (e.aiType === 'boss' ? 6 : 4);
        const hpColor = e.aiType === 'boss'
            ? (e.bossPhase === 2 ? '#FF004D' : '#FF77A8')
            : '#FF004D';
        ctx.fillStyle = '#5F574F';
        ctx.fillRect(Math.round(barX), Math.round(barY), barW, barH);
        ctx.fillStyle = hpColor;
        ctx.fillRect(Math.round(barX), Math.round(barY), Math.round(barW * (e.hp / e.maxHp)), barH);
    }
}

function drawPickup(ctx, pk) {
    const spriteNames = {
        health:    'pickupHealth',
        rapidFire: 'pickupRapid',
        spread:    'pickupSpread',
        shotgun:   'pickupShotgun',
        shield:    'pickupShield',
    };
    const sprite = spriteCache[spriteNames[pk.pickupType]];
    const bobOffset = Math.sin(pk.age * 3) * 2;
    if (pk.lifetime < 3 && Math.floor(pk.lifetime * 5) % 2 === 0) ctx.globalAlpha = 0.4;
    drawSprite(ctx, sprite, pk.x, pk.y + bobOffset);
    ctx.globalAlpha = 1;
}

function drawHUD(ctx) {
    const p = game.player;
    drawText(ctx, 'SCORE ' + game.score, 4, 4, 1, '#FFF1E8');

    const level = LEVELS[game.level];
    if (level) {
        const wt = 'WAVE ' + (game.currentWave + 1) + '-' + Math.min(game.currentWave + 1, level.waves.length);
        drawText(ctx, wt, W - textWidth(wt, 1) - 4, 4, 1, '#83769C');
        const ln = level.name;
        drawText(ctx, ln, (W - textWidth(ln, 1)) / 2, 4, 1, '#5F574F');
    }

    // Hearts
    for (let i = 0; i < p.maxHp; i++) {
        const sprite = i < p.hp ? spriteCache.heart : spriteCache.heartEmpty;
        drawSprite(ctx, sprite, 8 + i * 10, H - 8);
    }

    // Active power-up indicators — stack bottom-right
    let puY = H - 4;
    if (game.shieldTimer > 0) {
        const t = 'SHIELD ' + Math.ceil(game.shieldTimer) + 'S';
        drawText(ctx, t, W - textWidth(t, 1) - 4, puY, 1, '#83769C');
        puY -= 10;
    }
    if (game.shotgunTimer > 0) {
        const t = 'SHOTGUN ' + Math.ceil(game.shotgunTimer) + 'S';
        drawText(ctx, t, W - textWidth(t, 1) - 4, puY, 1, '#FFA300');
        puY -= 10;
    }
    if (game.rapidFireTimer > 0) {
        const t = 'RAPID ' + Math.ceil(game.rapidFireTimer) + 'S';
        drawText(ctx, t, W - textWidth(t, 1) - 4, puY, 1, '#FFEC27');
        puY -= 10;
    }
    if (game.spreadShotTimer > 0) {
        const t = 'SPREAD ' + Math.ceil(game.spreadShotTimer) + 'S';
        drawText(ctx, t, W - textWidth(t, 1) - 4, puY, 1, '#29ADFF');
    }
}

// ============================================================
// GAME LOOP
// ============================================================
let lastTime = 0;
let accumulator = 0;

function gameLoop(timestamp) {
    const dt      = (timestamp - lastTime) / 1000;
    lastTime      = timestamp;
    const cappedDt = Math.min(dt, 0.25);
    accumulator   += cappedDt;

    while (accumulator >= TICK / 1000) {
        states[game.state].update(TICK / 1000);
        input.justPressed    = {};
        input.mouseJustPressed = false;
        accumulator -= TICK / 1000;
    }

    ctx.clearRect(0, 0, W, H);
    states[game.state].draw(ctx);
    requestAnimationFrame(gameLoop);
}

// ============================================================
// INIT & START
// ============================================================
initSprites();
audio.init();
states.menu.enter();
requestAnimationFrame(gameLoop);
