// sprites.js — PICO-8 palette, programmatic pixel art, and sprite rendering

const PALETTE = [
    '#000000', // 0: black (transparent)
    '#1D2B53', // 1: dark blue
    '#7E2553', // 2: dark purple
    '#008751', // 3: dark green
    '#AB5236', // 4: brown
    '#5F574F', // 5: dark grey
    '#C2C3C7', // 6: light grey
    '#FFF1E8', // 7: white
    '#FF004D', // 8: red
    '#FFA300', // 9: orange
    '#FFEC27', // A: yellow
    '#00E436', // B: green
    '#29ADFF', // C: blue
    '#83769C', // D: indigo
    '#FF77A8', // E: pink
    '#FFCCAA', // F: peach
];

// Sprite definitions — each row is a string, each char maps to a palette index
// '.' = transparent
const SPRITE_DATA = {
    // Player facing up, 12x14 pixels (body + gun)
    playerIdle: [
        '....1111....',
        '...177771...',
        '..17777771..',
        '..17777111..',
        '...177771...',
        '.1.177771.1.',
        '111177771111',
        '.1.1C7771.1.',
        '....1CC1....',
        '...1.CC.1...',
        '..1..CC..1..',
        '..1..8C..1..',
        '............',
        '............',
    ],
    // Player walk frame 1 (legs apart)
    playerWalk1: [
        '....1111....',
        '...177771...',
        '..17777771..',
        '..17777111..',
        '...177771...',
        '.1.177771.1.',
        '111177771111',
        '.1.1C7771.1.',
        '....1CC1....',
        '...1.CC.1...',
        '..1..CC.1...',
        '...1.8C..1..',
        '............',
        '............',
    ],
    // Player walk frame 2 (legs together)
    playerWalk2: [
        '....1111....',
        '...177771...',
        '..17777771..',
        '..17777111..',
        '...177771...',
        '.1.177771.1.',
        '111177771111',
        '.1.1C7771.1.',
        '....1CC1....',
        '....1CC1....',
        '...1.88.1...',
        '...1.88.1...',
        '............',
        '............',
    ],

    // Crosshair / aiming reticle, 7x7
    crosshair: [
        '...8...',
        '...8...',
        '..888..',
        '.88888.',
        '..888..',
        '...8...',
        '...8...',
    ],

    // Crawler enemy, 10x10
    crawler: [
        '..888888..',
        '.88888888.',
        '8888778888',
        '8887777888',
        '8887777888',
        '8887777888',
        '8888778888',
        '.88888888.',
        '..888888..',
        '..........',
    ],

    // Sprinter enemy, 8x8 (sleeker, angular)
    sprinter: [
        '..9999..',
        '.999999.',
        '99777799',
        '99777799',
        '.997799.',
        '.9.99.9.',
        '..9999..',
        '........',
    ],

    // Shooter enemy, 12x12 (has a gun protrusion)
    shooter: [
        '....1111....',
        '...111111...',
        '..11111111..',
        '.1117C7711..',
        '11117777111.',
        '111177771111',
        '111177771111',
        '.1117777111.',
        '..11111111..',
        '...111111...',
        '....1111....',
        '............',
    ],

    // Tank enemy, 16x16 (big, chunky)
    tank: [
        '....2222222.....',
        '...222222222....',
        '..22277777222...',
        '.2227777777222..',
        '222777777777222.',
        '227777777777722.',
        '227777777777722.',
        '2277777C7777722.',
        '2277777C7777722.',
        '227777777777722.',
        '227777777777722.',
        '.22277777772222.',
        '..222777772222..',
        '...2222222222...',
        '....2222222....',
        '................',
    ],

    // Heart icon, 7x6
    heart: [
        '.8.8.8.',
        '8888888',
        '8888888',
        '.88888.',
        '..888..',
        '...8...',
    ],

    // Heart empty, 7x6
    heartEmpty: [
        '.5.5.5.',
        '5555555',
        '5555555',
        '.55555.',
        '..555..',
        '...5...',
    ],

    // Muzzle flash, 5x5
    muzzleFlash: [
        '..A..',
        '.AAA.',
        'AAAAA',
        '.AAA.',
        '..A..',
    ],

    // Health pickup, 7x7
    pickupHealth: [
        '..BBB..',
        '..BBB..',
        'BBBBBBB',
        'BBBBBBB',
        '..BBB..',
        '..BBB..',
        '.......',
    ],

    // Rapid fire pickup, 7x7
    pickupRapid: [
        '..AAA..',
        '.AAAA..',
        'AAAAA..',
        '.AAAA..',
        '..AAA..',
        '..AAAA.',
        '.......',
    ],

    // Spread shot pickup, 7x7
    pickupSpread: [
        'C...C..',
        '.C.C...',
        '..C....',
        'C.C.C..',
        '..C....',
        '.C.C...',
        'C...C..',
    ],
};

// Build a sprite from pixel data into an offscreen canvas
function buildSprite(rows) {
    const h = rows.length;
    const w = rows[0].length;
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const cx = c.getContext('2d');
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const ch = rows[y][x];
            if (ch === '.') continue; // transparent
            const idx = parseInt(ch, 16);
            cx.fillStyle = PALETTE[idx];
            cx.fillRect(x, y, 1, 1);
        }
    }
    return c;
}

// Pre-build all sprites into a cache
const spriteCache = {};
function initSprites() {
    for (const name in SPRITE_DATA) {
        spriteCache[name] = buildSprite(SPRITE_DATA[name]);
    }
}

// Draw a sprite centered at (x, y)
function drawSprite(ctx, sprite, x, y) {
    ctx.drawImage(sprite, Math.round(x - sprite.width / 2), Math.round(y - sprite.height / 2));
}

// Draw a sprite centered at (x, y), rotated by angle (radians)
function drawRotated(ctx, sprite, x, y, angle) {
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    ctx.rotate(angle);
    ctx.drawImage(sprite, -sprite.width / 2, -sprite.height / 2);
    ctx.restore();
}