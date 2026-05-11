// audio.js — Procedural retro sound effects using Web Audio API
// Safari-compatible: AudioContext created and resumed inside user gesture

const audio = {
    ctx: null,
    enabled: true,
    unlocked: false,

    // Call this inside a user gesture (click, keydown, touchstart)
    // Safari requires AudioContext to be CREATED inside the gesture, not just resumed
    unlock() {
        if (this.unlocked) return;
        try {
            // Create context inside the gesture for Safari compatibility
            if (!this.ctx) {
                const AudioCtx = window.AudioContext || window.webkitAudioContext;
                if (!AudioCtx) { this.enabled = false; return; }
                this.ctx = new AudioCtx();
            }
            // Safari needs a silent buffer played to fully unlock
            if (this.ctx.state === 'suspended') {
                this.ctx.resume();
            }
            // Play a silent buffer — this is the key Safari unlock trick
            const buf = this.ctx.createBuffer(1, 1, this.ctx.sampleRate);
            const src = this.ctx.createBufferSource();
            src.buffer = buf;
            src.connect(this.ctx.destination);
            src.start(0);
            src.onended = () => { this.unlocked = true; };
            this.unlocked = true;
        } catch (e) {
            this.enabled = false;
        }
    },

    // Legacy aliases so game.js calls still work
    init()   { /* no-op: context created lazily in unlock() */ },
    resume() { this.unlock(); },

    // Internal helper — safely get current time
    _t() {
        if (!this.ctx || !this.enabled) return null;
        if (this.ctx.state === 'suspended') this.ctx.resume();
        return this.ctx.currentTime;
    },

    // Player shoot — short square wave sweep down
    playShoot() {
        const t = this._t(); if (t === null) return;
        const osc  = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(600, t);
        osc.frequency.exponentialRampToValueAtTime(150, t + 0.08);
        gain.gain.setValueAtTime(0.12, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
        osc.connect(gain).connect(this.ctx.destination);
        osc.start(t); osc.stop(t + 0.08);
    },

    // Shotgun shoot — wide noise burst + low thud
    playShotgunShoot() {
        const t = this._t(); if (t === null) return;
        const bufferSize = this.ctx.sampleRate * 0.12;
        const buffer     = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data       = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1);
        const src  = this.ctx.createBufferSource();
        src.buffer = buffer;
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.22, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
        src.connect(gain).connect(this.ctx.destination);
        src.start(t);
        const osc = this.ctx.createOscillator();
        const og  = this.ctx.createGain();
        osc.type  = 'sine';
        osc.frequency.setValueAtTime(200, t);
        osc.frequency.exponentialRampToValueAtTime(60, t + 0.1);
        og.gain.setValueAtTime(0.15, t);
        og.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
        osc.connect(og).connect(this.ctx.destination);
        osc.start(t); osc.stop(t + 0.1);
    },

    // Enemy hit — brief noise burst
    playHit() {
        const t = this._t(); if (t === null) return;
        const bufferSize = this.ctx.sampleRate * 0.05;
        const buffer     = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data       = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.3;
        const src  = this.ctx.createBufferSource();
        src.buffer = buffer;
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.15, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
        src.connect(gain).connect(this.ctx.destination);
        src.start(t);
    },

    // Enemy death — noise + low sine
    playExplosion() {
        const t = this._t(); if (t === null) return;
        const bufferSize = this.ctx.sampleRate * 0.15;
        const buffer     = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data       = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1);
        const src  = this.ctx.createBufferSource();
        src.buffer = buffer;
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
        src.connect(gain).connect(this.ctx.destination);
        src.start(t);
        const osc  = this.ctx.createOscillator();
        const og   = this.ctx.createGain();
        osc.type   = 'sine';
        osc.frequency.setValueAtTime(120, t);
        osc.frequency.exponentialRampToValueAtTime(40, t + 0.2);
        og.gain.setValueAtTime(0.15, t);
        og.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
        osc.connect(og).connect(this.ctx.destination);
        osc.start(t); osc.stop(t + 0.2);
    },

    // Boss death — massive layered explosion
    playBossExplosion() {
        const t = this._t(); if (t === null) return;
        const bufferSize = this.ctx.sampleRate * 0.6;
        const buffer     = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data       = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1);
        const src  = this.ctx.createBufferSource();
        src.buffer = buffer;
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.35, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
        src.connect(gain).connect(this.ctx.destination);
        src.start(t);
        [80, 60, 40].forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            const og  = this.ctx.createGain();
            osc.type  = 'sawtooth';
            osc.frequency.setValueAtTime(freq * 2, t + i * 0.15);
            osc.frequency.exponentialRampToValueAtTime(freq * 0.5, t + i * 0.15 + 0.25);
            og.gain.setValueAtTime(0.2, t + i * 0.15);
            og.gain.exponentialRampToValueAtTime(0.001, t + i * 0.15 + 0.25);
            osc.connect(og).connect(this.ctx.destination);
            osc.start(t + i * 0.15); osc.stop(t + i * 0.15 + 0.25);
        });
    },

    // Boss intro — ominous low drone swell
    playBossIntro() {
        const t = this._t(); if (t === null) return;
        [55, 110, 165].forEach((freq, i) => {
            const osc  = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type   = 'sawtooth';
            osc.frequency.setValueAtTime(freq, t);
            gain.gain.setValueAtTime(0.0, t);
            gain.gain.linearRampToValueAtTime(0.07, t + 0.4);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 1.0);
            osc.connect(gain).connect(this.ctx.destination);
            osc.start(t + i * 0.05); osc.stop(t + 1.1);
        });
    },

    // Boss hit — heavier thud
    playBossHit() {
        const t = this._t(); if (t === null) return;
        const bufferSize = this.ctx.sampleRate * 0.08;
        const buffer     = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data       = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.5;
        const src  = this.ctx.createBufferSource();
        src.buffer = buffer;
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
        src.connect(gain).connect(this.ctx.destination);
        src.start(t);
        const osc = this.ctx.createOscillator();
        const og  = this.ctx.createGain();
        osc.type  = 'sine';
        osc.frequency.setValueAtTime(150, t);
        osc.frequency.exponentialRampToValueAtTime(50, t + 0.1);
        og.gain.setValueAtTime(0.12, t);
        og.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
        osc.connect(og).connect(this.ctx.destination);
        osc.start(t); osc.stop(t + 0.1);
    },

    // Shield pickup — shimmery ascending chord
    playShield() {
        const t = this._t(); if (t === null) return;
        [523, 659, 784, 1047].forEach((freq, i) => {
            const osc  = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type   = 'sine';
            osc.frequency.setValueAtTime(freq, t + i * 0.05);
            gain.gain.setValueAtTime(0.08, t + i * 0.05);
            gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.05 + 0.25);
            osc.connect(gain).connect(this.ctx.destination);
            osc.start(t + i * 0.05); osc.stop(t + i * 0.05 + 0.25);
        });
    },

    // Player hit — low thud
    playPlayerHit() {
        const t = this._t(); if (t === null) return;
        const osc  = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type   = 'sine';
        osc.frequency.setValueAtTime(80, t);
        osc.frequency.exponentialRampToValueAtTime(30, t + 0.12);
        gain.gain.setValueAtTime(0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
        osc.connect(gain).connect(this.ctx.destination);
        osc.start(t); osc.stop(t + 0.12);
    },

    // Player death — descending sawtooth
    playPlayerDeath() {
        const t = this._t(); if (t === null) return;
        const osc  = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type   = 'sawtooth';
        osc.frequency.setValueAtTime(400, t);
        osc.frequency.exponentialRampToValueAtTime(50, t + 0.5);
        gain.gain.setValueAtTime(0.15, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
        osc.connect(gain).connect(this.ctx.destination);
        osc.start(t); osc.stop(t + 0.5);
    },

    // Level complete — ascending C-E-G arpeggio
    playLevelComplete() {
        const t = this._t(); if (t === null) return;
        [523.25, 659.25, 783.99].forEach((freq, i) => {
            const osc  = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type   = 'square';
            osc.frequency.setValueAtTime(freq, t + i * 0.15);
            gain.gain.setValueAtTime(0.1, t + i * 0.15);
            gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.15 + 0.2);
            osc.connect(gain).connect(this.ctx.destination);
            osc.start(t + i * 0.15); osc.stop(t + i * 0.15 + 0.2);
        });
    },

    // Game over — descending E4-C4
    playGameOver() {
        const t = this._t(); if (t === null) return;
        [329.63, 261.63].forEach((freq, i) => {
            const osc  = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type   = 'triangle';
            osc.frequency.setValueAtTime(freq, t + i * 0.3);
            gain.gain.setValueAtTime(0.12, t + i * 0.3);
            gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.3 + 0.35);
            osc.connect(gain).connect(this.ctx.destination);
            osc.start(t + i * 0.3); osc.stop(t + i * 0.3 + 0.35);
        });
    },

    // Victory fanfare — full ascending arpeggio
    playVictory() {
        const t = this._t(); if (t === null) return;
        [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((freq, i) => {
            const osc  = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type   = 'square';
            osc.frequency.setValueAtTime(freq, t + i * 0.12);
            gain.gain.setValueAtTime(0.1, t + i * 0.12);
            gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.12 + 0.3);
            osc.connect(gain).connect(this.ctx.destination);
            osc.start(t + i * 0.12); osc.stop(t + i * 0.12 + 0.3);
        });
    },

    // Pickup collected — bright chirp
    playPickup() {
        const t = this._t(); if (t === null) return;
        const osc  = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type   = 'sine';
        osc.frequency.setValueAtTime(400, t);
        osc.frequency.exponentialRampToValueAtTime(800, t + 0.1);
        gain.gain.setValueAtTime(0.12, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
        osc.connect(gain).connect(this.ctx.destination);
        osc.start(t); osc.stop(t + 0.1);
    },

    // Enemy shoot — short pitched blip
    playEnemyShoot() {
        const t = this._t(); if (t === null) return;
        const osc  = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type   = 'sawtooth';
        osc.frequency.setValueAtTime(300, t);
        osc.frequency.exponentialRampToValueAtTime(100, t + 0.06);
        gain.gain.setValueAtTime(0.06, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
        osc.connect(gain).connect(this.ctx.destination);
        osc.start(t); osc.stop(t + 0.06);
    },

    // Boss shoot — deep heavy blip
    playBossShoot() {
        const t = this._t(); if (t === null) return;
        const osc  = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type   = 'sawtooth';
        osc.frequency.setValueAtTime(180, t);
        osc.frequency.exponentialRampToValueAtTime(60, t + 0.1);
        gain.gain.setValueAtTime(0.1, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
        osc.connect(gain).connect(this.ctx.destination);
        osc.start(t); osc.stop(t + 0.1);
    },
};
