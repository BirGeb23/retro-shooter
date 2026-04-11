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
    // Prevent default for game keys
    if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','Enter'].includes(e.code)) {
        e.preventDefault();
    }
});
window.addEventListener('keyup', e => { input.keys[e.code] = false; });
canvas.addEventListener('mousemove', e => {
    const rect = canvas.getBoundingClientRect();
    // Account for object-fit: contain letterboxing
    const canvasAspect = canvas.width / canvas.height;
    const rectAspect = rect.width / rect.height;
    let renderWidth, renderHeight, offsetX, offsetY;
    if (rectAspect > canvasAspect) {
        // Wider than canvas — letterbox on sides
        renderHeight = rect.height;
        renderWidth = rect.height * canvasAspect;
        offsetX = rect.left + (rect.width - renderWidth) / 2;
        offsetY = rect.top;
    } else {
        // Taller than canvas — letterbox on top/bottom
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
// PIXEL TEXT RENDERER
// ============================================================
// 5x7 bitmap font: each char is 7 rows, each row is 5 bits (left=MSB)
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
        curX += 6 * scale; // 5px char + 1px gap
    }
}

function textWidth(text, scale) {
    return text.length * 6 * scale - scale; // no gap after last char
}

// ============================================================
// LEVEL DEFINITIONS
// ============================================================
const LEVELS = [
    {
        name: 'OUTPOST ALPHA',
        waves: [
            { spawnDelay: 1.0, enemies: [{ type: 'crawler', count: 4 }] },
            { spawnDelay: 0.8, enemies: [{ type: 'crawler', count: 6 }] },
            { spawnDelay: 0.7, enemies: [{ type: 'crawler', count: 8 }] },
        ]
    },
    {
        name: 'DANGER ZONE',
        waves: [
            { spawnDelay: 0.9, enemies: [{ type: 'crawler', count: 5 }, { type: 'sprinter', count: 2 }] },
            { spawnDelay: 0.7, enemies: [{ type: 'sprinter', count: 4 }, { type: 'crawler', count: 4 }] },
            { spawnDelay: 0.6, enemies: [{ type: 'crawler', count: 5 }, { type: 'shooter', count: 2 }] },
        ]
    },
    {
        name: 'SIEGE TOWER',
        waves: [
            { spawnDelay: 0.8, enemies: [{ type: 'crawler', count: 6 }, { type: 'sprinter', count: 3 }] },
            { spawnDelay: 0.6, enemies: [{ type: 'shooter', count: 3 }, { type: 'sprinter', count: 4 }] },
            { spawnDelay: 0.5, enemies: [{ type: 'tank', count: 1 }, { type: 'crawler', count: 6 }] },
        ]
    },
    {
        name: 'IRON CORRIDOR',
        waves: [
            { spawnDelay: 0.7, enemies: [{ type: 'sprinter', count: 5 }, { type: 'shooter', count: 3 }] },
            { spawnDelay: 0.5, enemies: [{ type: 'shooter', count: 4 }, { type: 'crawler', count: 6 }] },
            { spawnDelay: 0.5, enemies: [{ type: 'tank', count: 1 }, { type: 'sprinter', count: 5 }] },
            { spawnDelay: 0.4, enemies: [{ type: 'shooter', count: 3 }, { type: 'sprinter', count: 4 }, { type: 'crawler', count: 4 }] },
        ]
    },
    {
        name: 'FINAL STAND',
        waves: [
            { spawnDelay: 0.6, enemies: [{ type: 'shooter', count: 4 }, { type: 'sprinter', count: 4 }] },
            { spawnDelay: 0.5, enemies: [{ type: 'tank', count: 2 }, { type: 'crawler', count: 5 }] },
            { spawnDelay: 0.4, enemies: [{ type: 'shooter', count: 5 }, { type: 'sprinter', count: 5 }] },
            { spawnDelay: 0.3, enemies: [{ type: 'tank', count: 2 }, { type: 'shooter', count: 3 }, { type: 'sprinter', count: 5 }] },
        ]
    },
];

// ============================================================
// ENEMY TEMPLATES
// ============================================================
const ENEMY_TEMPLATES = {
    crawler:  { w:10, h:10, speed:45, hp:2, damage:1, score:100, fireRate:0 },
    sprinter: { w:8, h:8, speed:35, hp:1, damage:1, score:150, fireRate:0 },
    shooter:  { w:12, h:12, speed:25, hp:3, damage:1, score:200, fireRate:1.5 },
    tank:     { w:16, h:16, speed:18, hp:8, damage:2, score:500, fireRate:2.0 },
};

// ============================================================
// GAME STATE
// ============================================================
const game = {
    state: 'menu', // 'menu' | 'playing' | 'levelComplete' | 'gameOver'
    score: 0,
    highScore: parseInt(localStorage.getItem('retroShooterHighScore')) || 0,
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
    // Screen state
    menuBlink: 0,
    menuStars: [],
    fadeAlpha: 0,
    fadeDirection: 0, // 0=none, 1=fading in, -1=fading out
    // Screen shake
    shakeIntensity: 0,
    shakeDuration: 0,
    // Power-up timers
    rapidFireTimer: 0,
    spreadShotTimer: 0,
    // Level complete timer
    levelCompleteTimer: 0,
};

// ============================================================
// ENTITY FACTORIES
// ============================================================
function createPlayer() {
    return {
        type: 'player',
        x: W / 2, y: H / 2,
        w: 10, h: 10, // hitbox
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

function createBullet(x, y, angle, speed, damage, owner) {
    return {
        type: 'bullet',
        x, y,
        w: 3, h: 3,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        damage, owner,
        lifetime: BULLET_LIFETIME,
        alive: true,
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
        // AI state
        aiState: 'approach', // approach, windup, sprint, pause, strafe
        aiTimer: 0,
        hitFlash: 0,
        windupFlash: false,
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
        pickupType, // 'health', 'rapidFire', 'spread'
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
        // Generate starfield
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
        // Animate stars
        for (const star of game.menuStars) {
            star.y += star.speed * dt;
            if (star.y > H) {
                star.y = -2;
                star.x = Math.random() * W;
            }
        }
        if (input.justPressed['Enter'] || input.justPressed['Space'] || input.mouseJustPressed) {
            game.state = 'playing';
            states.playing.enter(true); // new game
        }
    },
    draw(ctx) {
        // Dark background
        ctx.fillStyle = '#0a0a1a';
        ctx.fillRect(0, 0, W, H);
        // Stars
        for (const star of game.menuStars) {
            const b = Math.floor(star.brightness * 255);
            ctx.fillStyle = `rgb(${b},${b},${b + 30})`;
            ctx.fillRect(Math.round(star.x), Math.round(star.y), 1, 1);
        }
        // Title
        const title = 'RETRO SHOOTER';
        const titleScale = 3;
        const tw = textWidth(title, titleScale);
        drawText(ctx, title, (W - tw) / 2, 50, titleScale, '#FF004D');
        // Subtitle
        const sub = 'A TOP-DOWN SURVIVAL GAME';
        const subScale = 1;
        const sw = textWidth(sub, subScale);
        drawText(ctx, sub, (W - sw) / 2, 95, subScale, '#83769C');
        // Blinking prompt
        if (Math.floor(game.menuBlink * 2) % 2 === 0) {
            const prompt = 'PRESS ENTER OR CLICK TO START';
            const ps = 1;
            const pw = textWidth(prompt, ps);
            drawText(ctx, prompt, (W - pw) / 2, 160, ps, '#FFF1E8');
        }
        // Controls
        const controls = [
            'ARROW KEYS/WASD - MOVE',
            'MOUSE - AIM',
            'LEFT CLICK - SHOOT',
        ];
        controls.forEach((line, i) => {
            const ls = 1;
            const lw = textWidth(line, ls);
            drawText(ctx, line, (W - lw) / 2, 195 + i * 12, ls, '#5F574F');
        });
        // High score
        if (game.highScore > 0) {
            const hs = 'HIGH SCORE: ' + game.highScore;
            const hsW = textWidth(hs, 1);
            drawText(ctx, hs, (W - hsW) / 2, 240, 1, '#FFEC27');
        }
    },
};

// --- PLAYING STATE ---
states.playing = {
    enter(newGame) {
        if (newGame !== false) {
            // Full reset for new game
            game.player = createPlayer();
            game.enemies = [];
            game.bullets = [];
            game.particles = [];
            game.pickups = [];
            game.score = 0;
            game.level = 0;
            game.currentWave = 0;
            game.shakeIntensity = 0;
            game.shakeDuration = 0;
            game.rapidFireTimer = 0;
            game.spreadShotTimer = 0;
        }
        // When continuing to next level, preserve score/level/player
        this.loadWave();
    },
    loadWave() {
        const level = LEVELS[game.level];
        if (!level) {
            // Beat all levels! Show victory
            game.state = 'gameOver';
            states.gameOver.enter(true);
            return;
        }
        if (game.currentWave >= level.waves.length) {
            // Level complete!
            game.state = 'levelComplete';
            states.levelComplete.enter();
            return;
        }
        const wave = level.waves[game.currentWave];
        game.spawnQueue = [];
        for (const group of wave.enemies) {
            for (let i = 0; i < group.count; i++) {
                game.spawnQueue.push(group.type);
            }
        }
        // Shuffle the spawn queue
        for (let i = game.spawnQueue.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [game.spawnQueue[i], game.spawnQueue[j]] = [game.spawnQueue[j], game.spawnQueue[i]];
        }
        game.spawnTimer = 0.5; // Brief initial delay
        game.wavePauseTimer = 0;
    },
    update(dt) {
        const p = game.player;

        // Update power-up timers
        if (game.rapidFireTimer > 0) game.rapidFireTimer -= dt;
        if (game.spreadShotTimer > 0) game.spreadShotTimer -= dt;

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
        // Normalize diagonal movement
        if (dx !== 0 && dy !== 0) {
            const inv = 1 / Math.sqrt(2);
            dx *= inv;
            dy *= inv;
        }
        p.x += dx * p.speed * dt;
        p.y += dy * p.speed * dt;
        // Clamp to bounds
        p.x = Math.max(p.w / 2, Math.min(W - p.w / 2, p.x));
        p.y = Math.max(p.h / 2, Math.min(H - p.h / 2, p.y));

        // Walk animation
        if (dx !== 0 || dy !== 0) {
            p.walkTimer += dt;
            if (p.walkTimer > 0.12) {
                p.walkTimer = 0;
                p.walkFrame = (p.walkFrame + 1) % 2; // 0=walk1, 1=walk2
            }
        } else {
            p.walkFrame = -1; // idle
            p.walkTimer = 0;
        }

        // Aim angle
        p.aimAngle = Math.atan2(input.mouseY - p.y, input.mouseX - p.x);

        // Invulnerability
        if (p.invulnTimer > 0) p.invulnTimer -= dt;

        // --- Shooting ---
        p.lastFire -= dt;
        const fireRate = game.rapidFireTimer > 0 ? p.fireRate / 2 : p.fireRate;
        if (input.mouseDown && p.lastFire <= 0) {
            p.lastFire = fireRate;
            const gunOffset = 8; // Distance from center to gun tip
            const bx = p.x + Math.cos(p.aimAngle) * gunOffset;
            const by = p.y + Math.sin(p.aimAngle) * gunOffset;

            if (game.spreadShotTimer > 0) {
                // Spread shot: 3 bullets
                for (let i = -1; i <= 1; i++) {
                    game.bullets.push(createBullet(bx, by, p.aimAngle + i * 0.15, BULLET_SPEED, 1, 'player'));
                }
            } else {
                game.bullets.push(createBullet(bx, by, p.aimAngle, BULLET_SPEED, 1, 'player'));
            }
            // Muzzle flash particles
            spawnParticles(bx, by, '#FFEC27', 3, 20, 60, 0.06, 2);
            audio.playShoot();
        }

        // --- Spawn enemies ---
        if (game.wavePauseTimer > 0) {
            game.wavePauseTimer -= dt;
            if (game.wavePauseTimer <= 0) {
                this.loadWave();
            }
        } else if (game.spawnQueue.length > 0) {
            game.spawnTimer -= dt;
            if (game.spawnTimer <= 0) {
                const level = LEVELS[game.level];
                const wave = level.waves[game.currentWave];
                game.spawnTimer = wave.spawnDelay;
                const etype = game.spawnQueue.shift();
                const pos = randomSpawnPos();
                game.enemies.push(createEnemy(pos.x, pos.y, etype));
            }
        }

        // --- Update bullets ---
        for (let i = game.bullets.length - 1; i >= 0; i--) {
            const b = game.bullets[i];
            b.x += b.vx * dt;
            b.y += b.vy * dt;
            b.lifetime -= dt;
            // Remove if off screen or expired
            if (b.lifetime <= 0 || b.x < -20 || b.x > W + 20 || b.y < -20 || b.y > H + 20) {
                removeEntity(game.bullets, i);
                continue;
            }
        }

        // --- Update enemies ---
        for (let i = game.enemies.length - 1; i >= 0; i--) {
            const e = game.enemies[i];
            // Hit flash timer
            if (e.hitFlash > 0) e.hitFlash -= dt;

            // AI behavior
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
                        // Wind-up phase: flash and stay still
                        e.aiTimer += dt;
                        // Don't overwrite hitFlash from actual damage
                        if (e.hitFlash <= 0) e.windupFlash = true;
                        if (e.aiTimer >= 0.8) {
                            e.aiState = 'sprint';
                            e.aiTimer = 0;
                            e.hitFlash = 0;
                        }
                    } else if (e.aiState === 'sprint') {
                        // Sprint toward player at 2.5x speed
                        e.x += dirX * e.speed * 2.5 * dt;
                        e.y += dirY * e.speed * 2.5 * dt;
                        e.aiTimer += dt;
                        if (e.aiTimer >= 1.5) {
                            e.aiState = 'pause';
                            e.aiTimer = 0;
                        }
                    } else if (e.aiState === 'pause') {
                        e.aiTimer += dt;
                        if (e.aiTimer >= 0.5) {
                            e.aiState = 'approach';
                            e.aiTimer = 0;
                        }
                    }
                    break;

                case 'shooter':
                    if (distToPlayer > 120) {
                        // Move toward player
                        e.x += dirX * e.speed * dt;
                        e.y += dirY * e.speed * dt;
                    } else {
                        // Strafe and shoot
                        e.aiTimer += dt;
                        // Strafe sideways
                        const strafeAngle = Math.atan2(toPlayerY, toPlayerX) + Math.PI / 2;
                        e.x += Math.cos(strafeAngle) * e.speed * 0.5 * dt;
                        e.y += Math.sin(strafeAngle) * e.speed * 0.5 * dt;
                    }
                    // Shoot
                    e.lastFire -= dt;
                    if (e.lastFire <= 0 && distToPlayer < 200) {
                        e.lastFire = e.fireRate;
                        const shootAngle = Math.atan2(toPlayerY, toPlayerX) + (Math.random() - 0.5) * 0.2;
                        game.bullets.push(createBullet(e.x, e.y, shootAngle, 120, 1, 'enemy'));
                        audio.playEnemyShoot();
                    }
                    break;

                case 'tank':
                    // Always move toward player
                    e.x += dirX * e.speed * dt;
                    e.y += dirY * e.speed * dt;
                    // Shoot occasionally
                    e.lastFire -= dt;
                    if (e.lastFire <= 0 && distToPlayer < 250) {
                        e.lastFire = e.fireRate;
                        const shootAngle = Math.atan2(toPlayerY, toPlayerX) + (Math.random() - 0.5) * 0.15;
                        // Tank shoots bigger, slower bullets
                        const tb = createBullet(e.x, e.y, shootAngle, 80, 1, 'enemy');
                        tb.w = 5; tb.h = 5;
                        game.bullets.push(tb);
                        audio.playEnemyShoot();
                    }
                    break;
            }

            // Keep enemies on screen loosely (allow slight overshoot for spawning)
            e.x = Math.max(-10, Math.min(W + 10, e.x));
            e.y = Math.max(-10, Math.min(H + 10, e.y));
        }

        // --- Collision: player bullets vs enemies ---
        for (let bi = game.bullets.length - 1; bi >= 0; bi--) {
            const b = game.bullets[bi];
            if (b.owner !== 'player') continue;
            for (let ei = game.enemies.length - 1; ei >= 0; ei--) {
                const e = game.enemies[ei];
                if (aabbOverlap(b, e)) {
                    e.hp -= b.damage;
                    e.hitFlash = 0.1;
                    b.alive = false;
                    spawnParticles(b.x, b.y, '#FFA300', 5, 30, 80, 0.15, 2);
                    audio.playHit();
                    if (e.hp <= 0) {
                        e.alive = false;
                        game.score += e.score;
                        spawnParticles(e.x, e.y, PALETTE[8], 15, 40, 120, 0.3, 3); // red explosion
                        spawnParticles(e.x, e.y, '#FFEC27', 8, 30, 80, 0.2, 2); // yellow sparks
                        game.shakeIntensity = 2;
                        game.shakeDuration = 0.1;
                        audio.playExplosion();
                        // Maybe drop pickup
                        const roll = Math.random();
                        if (roll < 0.08) {
                            game.pickups.push(createPickup(e.x, e.y, 'health'));
                        } else if (roll < 0.13) {
                            game.pickups.push(createPickup(e.x, e.y, 'rapidFire'));
                        } else if (roll < 0.17) {
                            game.pickups.push(createPickup(e.x, e.y, 'spread'));
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
                    p.hp -= b.damage;
                    p.invulnTimer = PLAYER_INVULN_TIME;
                    b.alive = false;
                    game.shakeIntensity = 4;
                    game.shakeDuration = 0.15;
                    spawnParticles(p.x, p.y, '#FF004D', 10, 40, 100, 0.25, 2);
                    audio.playPlayerHit();
                    removeEntity(game.bullets, bi);
                    if (p.hp <= 0) {
                        p.alive = false;
                        game.state = 'gameOver';
                        states.gameOver.enter();
                        return;
                    }
                    break;
                }
            }
        }

        // --- Collision: enemies vs player (contact damage) ---
        if (p.invulnTimer <= 0) {
            for (const e of game.enemies) {
                if (aabbOverlap(e, p)) {
                    p.hp -= e.damage;
                    p.invulnTimer = PLAYER_INVULN_TIME;
                    game.shakeIntensity = 3;
                    game.shakeDuration = 0.12;
                    spawnParticles(p.x, p.y, '#FF004D', 8, 30, 80, 0.2, 2);
                    audio.playPlayerHit();
                    // Push apart
                    const pushDist = 20;
                    const pushAngle = Math.atan2(p.y - e.y, p.x - e.x);
                    p.x += Math.cos(pushAngle) * pushDist;
                    p.y += Math.sin(pushAngle) * pushDist;
                    p.x = Math.max(p.w / 2, Math.min(W - p.w / 2, p.x));
                    p.y = Math.max(p.h / 2, Math.min(H - p.h / 2, p.y));
                    if (p.hp <= 0) {
                        p.alive = false;
                        game.state = 'gameOver';
                        states.gameOver.enter();
                        return;
                    }
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
                        break;
                    case 'rapidFire':
                        game.rapidFireTimer = 8;
                        break;
                    case 'spread':
                        game.spreadShotTimer = 8;
                        break;
                }
                spawnParticles(pk.x, pk.y, '#FFEC27', 12, 30, 70, 0.25, 2);
                audio.playPickup();
                removeEntity(game.pickups, pi);
            }
        }

        // --- Update pickups ---
        for (let i = game.pickups.length - 1; i >= 0; i--) {
            const pk = game.pickups[i];
            pk.age += dt;
            pk.lifetime -= dt;
            if (pk.lifetime <= 0) {
                removeEntity(game.pickups, i);
            }
        }

        // --- Remove dead bullets ---
        for (let i = game.bullets.length - 1; i >= 0; i--) {
            if (!game.bullets[i].alive) removeEntity(game.bullets, i);
        }
        // --- Remove dead enemies ---
        for (let i = game.enemies.length - 1; i >= 0; i--) {
            if (!game.enemies[i].alive) removeEntity(game.enemies, i);
        }

        // --- Update particles ---
        for (let i = game.particles.length - 1; i >= 0; i--) {
            const pt = game.particles[i];
            pt.x += pt.vx * dt;
            pt.y += pt.vy * dt;
            pt.vx *= 0.97; // Friction
            pt.vy *= 0.97;
            pt.lifetime -= dt;
            if (pt.lifetime <= 0) {
                removeEntity(game.particles, i);
            }
        }

        // --- Check wave completion ---
        if (game.spawnQueue.length === 0 && game.enemies.length === 0 && game.wavePauseTimer <= 0) {
            game.currentWave++;
            game.wavePauseTimer = 2.0;
        }
    },
    draw(ctx) {
        // Floor
        drawFloor(ctx);

        // Apply screen shake
        ctx.save();
        if (game.shakeDuration > 0) {
            const ox = (Math.random() - 0.5) * game.shakeIntensity * 2;
            const oy = (Math.random() - 0.5) * game.shakeIntensity * 2;
            ctx.translate(Math.round(ox), Math.round(oy));
        }

        // Pickups
        for (const pk of game.pickups) {
            drawPickup(ctx, pk);
        }

        // Enemies
        for (const e of game.enemies) {
            drawEnemy(ctx, e);
        }

        // Player
        const p = game.player;
        if (p.alive) {
            // Blink when invulnerable
            if (p.invulnTimer <= 0 || Math.floor(p.invulnTimer * 10) % 2 === 0) {
                const spriteName = p.walkFrame === -1 ? 'playerIdle' : (p.walkFrame === 0 ? 'playerWalk1' : 'playerWalk2');
                drawRotated(ctx, spriteCache[spriteName], p.x, p.y, p.aimAngle + Math.PI / 2);
            }
        }

        // Bullets
        for (const b of game.bullets) {
            if (b.owner === 'player') {
                ctx.fillStyle = '#FFEC27';
            } else {
                ctx.fillStyle = '#FF004D';
            }
            ctx.fillRect(Math.round(b.x - b.w / 2), Math.round(b.y - b.h / 2), b.w, b.h);
        }

        // Particles
        for (const pt of game.particles) {
            const alpha = pt.lifetime / pt.maxLifetime;
            ctx.globalAlpha = alpha;
            ctx.fillStyle = pt.color;
            const s = pt.size * alpha;
            ctx.fillRect(Math.round(pt.x - s / 2), Math.round(pt.y - s / 2), Math.round(s), Math.round(s));
        }
        ctx.globalAlpha = 1;

        ctx.restore(); // End screen shake

        // Crosshair
        drawSprite(ctx, spriteCache.crosshair, input.mouseX, input.mouseY);

        // HUD
        drawHUD(ctx);

        // Wave announcement
        if (game.wavePauseTimer > 1.0 && game.currentWave > 0) {
            const level = LEVELS[game.level];
            if (level) {
                const waveText = 'WAVE ' + (game.currentWave + 1) + '/' + level.waves.length;
                const ws = 2;
                const ww = textWidth(waveText, ws);
                drawText(ctx, waveText, (W - ww) / 2, H / 2 - 10, ws, '#FFF1E8');
            }
        }
    },
};

// --- LEVEL COMPLETE STATE ---
states.levelComplete = {
    enter() {
        game.levelCompleteTimer = 0;
        audio.playLevelComplete();
    },
    update(dt) {
        game.levelCompleteTimer += dt;
        // Update particles during level complete
        for (let i = game.particles.length - 1; i >= 0; i--) {
            const pt = game.particles[i];
            pt.x += pt.vx * dt;
            pt.y += pt.vy * dt;
            pt.vx *= 0.97;
            pt.vy *= 0.97;
            pt.lifetime -= dt;
            if (pt.lifetime <= 0) removeEntity(game.particles, i);
        }
        if (game.levelCompleteTimer > 1.5 && (input.justPressed['Enter'] || input.justPressed['Space'])) {
            game.level++;
            game.currentWave = 0;
            game.state = 'playing';
            states.playing.enter(false); // continue, not new game
        }
    },
    draw(ctx) {
        drawFloor(ctx);
        // Draw remaining enemies (dead) and particles for visual continuity
        for (const pt of game.particles) {
            const alpha = pt.lifetime / pt.maxLifetime;
            ctx.globalAlpha = alpha;
            ctx.fillStyle = pt.color;
            const s = pt.size * alpha;
            ctx.fillRect(Math.round(pt.x - s / 2), Math.round(pt.y - s / 2), Math.round(s), Math.round(s));
        }
        ctx.globalAlpha = 1;

        // Dark overlay
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(0, 0, W, H);

        // Level complete text
        const level = LEVELS[game.level];
        const levelName = level ? level.name : 'UNKNOWN';
        const titleText = 'LEVEL COMPLETE!';
        const titleScale = 2;
        const tw = textWidth(titleText, titleScale);
        drawText(ctx, titleText, (W - tw) / 2, 80, titleScale, '#FFEC27');

        const nameText = levelName;
        const nameScale = 1;
        const nw = textWidth(nameText, nameScale);
        drawText(ctx, nameText, (W - nw) / 2, 115, nameScale, '#C2C3C7');

        const scoreText = 'SCORE: ' + game.score;
        const ss = 2;
        const sw = textWidth(scoreText, ss);
        drawText(ctx, scoreText, (W - sw) / 2, 145, ss, '#FFF1E8');

        if (game.levelCompleteTimer > 1.5) {
            const prompt = 'PRESS ENTER TO CONTINUE';
            const ps = 1;
            const pw = textWidth(prompt, ps);
            drawText(ctx, prompt, (W - pw) / 2, 200, ps, '#5F574F');
        }
    },
};

// --- GAME OVER STATE ---
states.gameOver = {
    enter(victory) {
        game.levelCompleteTimer = 0;
        game.victory = victory || false;
        if (game.score > game.highScore) {
            game.highScore = game.score;
            localStorage.setItem('retroShooterHighScore', game.highScore);
        }
        audio.playGameOver();
    },
    update(dt) {
        game.levelCompleteTimer += dt;
        if (game.levelCompleteTimer > 1.5 && (input.justPressed['Enter'] || input.justPressed['Space'] || input.mouseJustPressed)) {
            game.state = 'menu';
            states.menu.enter();
        }
    },
    draw(ctx) {
        // Draw the frozen game state
        drawFloor(ctx);
        for (const e of game.enemies) {
            drawEnemy(ctx, e);
        }
        // Bullets
        for (const b of game.bullets) {
            ctx.fillStyle = b.owner === 'player' ? '#FFEC27' : '#FF004D';
            ctx.fillRect(Math.round(b.x - b.w / 2), Math.round(b.y - b.h / 2), b.w, b.h);
        }

        // Dark overlay
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(0, 0, W, H);

        const title = game.victory ? 'VICTORY!' : 'GAME OVER';
        const titleScale = 3;
        const tw = textWidth(title, titleScale);
        drawText(ctx, title, (W - tw) / 2, 60, titleScale, '#FF004D');

        const scoreText = 'FINAL SCORE: ' + game.score;
        const ss = 2;
        const sw = textWidth(scoreText, ss);
        drawText(ctx, scoreText, (W - sw) / 2, 120, ss, '#FFF1E8');

        const levelText = 'REACHED LEVEL: ' + (game.level + 1);
        const ls = 1;
        const lw = textWidth(levelText, ls);
        drawText(ctx, levelText, (W - lw) / 2, 150, ls, '#C2C3C7');

        if (game.levelCompleteTimer > 1.5) {
            const prompt = 'PRESS ENTER TO RETRY';
            const ps = 1;
            const pw = textWidth(prompt, ps);
            drawText(ctx, prompt, (W - pw) / 2, 200, ps, '#5F574F');
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
        ctx.beginPath();
        ctx.moveTo(x + 0.5, 0);
        ctx.lineTo(x + 0.5, H);
        ctx.stroke();
    }
    for (let y = 0; y < H; y += 32) {
        ctx.beginPath();
        ctx.moveTo(0, y + 0.5);
        ctx.lineTo(W, y + 0.5);
        ctx.stroke();
    }
}

function drawEnemy(ctx, e) {
    // Flash white on hit
    const spriteName = e.aiType;
    if (e.hitFlash > 0) {
        ctx.globalAlpha = 0.7;
        drawRotated(ctx, spriteCache[spriteName], e.x, e.y, Math.atan2(game.player.y - e.y, game.player.x - e.x) + Math.PI / 2);
        ctx.globalAlpha = 1;
        // White overlay
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        drawRotated(ctx, spriteCache[spriteName], e.x, e.y, Math.atan2(game.player.y - e.y, game.player.x - e.x) + Math.PI / 2);
        ctx.restore();
    } else {
        // Sprinter flashes during windup (use windupFlash flag instead of overwriting hitFlash)
        if (e.windupFlash && Math.floor(e.aiTimer * 8) % 2 === 0) {
            ctx.globalAlpha = 0.5;
        }
        drawRotated(ctx, spriteCache[spriteName], e.x, e.y, Math.atan2(game.player.y - e.y, game.player.x - e.x) + Math.PI / 2);
        ctx.globalAlpha = 1;
    }
    // HP bar for enemies with more than 1 max HP
    if (e.maxHp > 2) {
        const barW = e.w;
        const barH = 2;
        const barX = e.x - barW / 2;
        const barY = e.y - e.h / 2 - 4;
        ctx.fillStyle = '#5F574F';
        ctx.fillRect(Math.round(barX), Math.round(barY), barW, barH);
        ctx.fillStyle = '#FF004D';
        ctx.fillRect(Math.round(barX), Math.round(barY), Math.round(barW * (e.hp / e.maxHp)), barH);
    }
}

function drawPickup(ctx, pk) {
    const spriteNames = { health: 'pickupHealth', rapidFire: 'pickupRapid', spread: 'pickupSpread' };
    const sprite = spriteCache[spriteNames[pk.pickupType]];
    // Bob up and down
    const bobOffset = Math.sin(pk.age * 3) * 2;
    // Blink when about to expire
    if (pk.lifetime < 3 && Math.floor(pk.lifetime * 5) % 2 === 0) {
        ctx.globalAlpha = 0.4;
    }
    drawSprite(ctx, sprite, pk.x, pk.y + bobOffset);
    ctx.globalAlpha = 1;
}

function drawHUD(ctx) {
    const p = game.player;
    // Score - top left
    drawText(ctx, 'SCORE ' + game.score, 4, 4, 1, '#FFF1E8');

    // Wave - top right
    const level = LEVELS[game.level];
    if (level) {
        const waveText = 'WAVE ' + (game.currentWave + 1) + '-' + (Math.min(game.currentWave + 1, level.waves.length));
        const wtW = textWidth(waveText, 1);
        drawText(ctx, waveText, W - wtW - 4, 4, 1, '#83769C');
    }

    // Level name
    if (level) {
        const ln = level.name;
        const lnW = textWidth(ln, 1);
        drawText(ctx, ln, (W - lnW) / 2, 4, 1, '#5F574F');
    }

    // Hearts - bottom left
    for (let i = 0; i < p.maxHp; i++) {
        const sprite = i < p.hp ? spriteCache.heart : spriteCache.heartEmpty;
        drawSprite(ctx, sprite, 8 + i * 10, H - 8);
    }

    // Power-up indicators - bottom right
    if (game.rapidFireTimer > 0) {
        const rft = 'RAPID ' + Math.ceil(game.rapidFireTimer) + 'S';
        drawText(ctx, rft, W - textWidth(rft, 1) - 4, H - 14, 1, '#FFEC27');
    }
    if (game.spreadShotTimer > 0) {
        const sst = 'SPREAD ' + Math.ceil(game.spreadShotTimer) + 'S';
        drawText(ctx, sst, W - textWidth(sst, 1) - 4, H - 4, 1, '#29ADFF');
    }
}

// ============================================================
// GAME LOOP
// ============================================================
let lastTime = 0;
let accumulator = 0;

function gameLoop(timestamp) {
    const dt = (timestamp - lastTime) / 1000; // delta in seconds
    lastTime = timestamp;

    // Cap delta to prevent spiral of death
    const cappedDt = Math.min(dt, 0.25);
    accumulator += cappedDt;

    while (accumulator >= TICK / 1000) {
        // Update current state
        states[game.state].update(TICK / 1000);
        // Clear single-frame inputs
        input.justPressed = {};
        input.mouseJustPressed = false;
        accumulator -= TICK / 1000;
    }

    // Render
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