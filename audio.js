// audio.js — Procedural retro sound effects using Web Audio API
 
const audio = {
    ctx: null,
    enabled: true,
 
    init() {
        if (this.ctx) return;
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            this.enabled = false;
        }
    },
 
    resume() {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    },
 
    // Player shoot — short square wave sweep down
    playShoot() {
        if (!this.ctx || !this.enabled) return;
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(600, t);
        osc.frequency.exponentialRampToValueAtTime(150, t + 0.08);
        gain.gain.setValueAtTime(0.12, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
        osc.connect(gain).connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.08);
    },
 
    // Shotgun shoot — wide noise burst
    playShotgunShoot() {
        if (!this.ctx || !this.enabled) return;
        const t = this.ctx.currentTime;
        const bufferSize = this.ctx.sampleRate * 0.12;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1);
        const src = this.ctx.createBufferSource();
        src.buffer = buffer;
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.22, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
        // Low thud underneath
        const osc = this.ctx.createOscillator();
        const og = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(200, t);
        osc.frequency.exponentialRampToValueAtTime(60, t + 0.1);
        og.gain.setValueAtTime(0.15, t);
        og.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
        osc.connect(og).connect(this.ctx.destination);
        osc.start(t); osc.stop(t + 0.1);
        src.connect(gain).connect(this.ctx.destination);
        src.start(t);
    },
 
    // Enemy hit — brief noise burst
    playHit() {
        if (!this.ctx || !this.enabled) return;
        const t = this.ctx.currentTime;
        const bufferSize = this.ctx.sampleRate * 0.05;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * 0.3;
        }
        const src = this.ctx.createBufferSource();
        src.buffer = buffer;
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.15, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
        src.connect(gain).connect(this.ctx.destination);
        src.start(t);
    },
 
    // Enemy death — longer noise + low sine
    playExplosion() {
        if (!this.ctx || !this.enabled) return;
        const t = this.ctx.currentTime;
        const bufferSize = this.ctx.sampleRate * 0.15;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1);
        const src = this.ctx.createBufferSource();
        src.buffer = buffer;
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
        src.connect(gain).connect(this.ctx.destination);
        src.start(t);
        const osc = this.ctx.createOscillator();
        const oscGain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(120, t);
        osc.frequency.exponentialRampToValueAtTime(40, t + 0.2);
        oscGain.gain.setValueAtTime(0.15, t);
        oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
        osc.connect(oscGain).connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.2);
    },
 
    // Boss death — massive explosion: layered noise + deep bass drops
    playBossExplosion() {
        if (!this.ctx || !this.enabled) return;
        const t = this.ctx.currentTime;
        // Big noise burst
        const bufferSize = this.ctx.sampleRate * 0.6;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1);
        const src = this.ctx.createBufferSource();
        src.buffer = buffer;
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.35, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
        src.connect(gain).connect(this.ctx.destination);
        src.start(t);
        // Three descending bass hits
        [80, 60, 40].forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            const og = this.ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(freq * 2, t + i * 0.15);
            osc.frequency.exponentialRampToValueAtTime(freq * 0.5, t + i * 0.15 + 0.25);
            og.gain.setValueAtTime(0.2, t + i * 0.15);
            og.gain.exponentialRampToValueAtTime(0.001, t + i * 0.15 + 0.25);
            osc.connect(og).connect(this.ctx.destination);
            osc.start(t + i * 0.15);
            osc.stop(t + i * 0.15 + 0.25);
        });
    },
 
    // Boss intro — ominous low drone swell
    playBossIntro() {
        if (!this.ctx || !this.enabled) return;
        const t = this.ctx.currentTime;
        [55, 110, 165].forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(freq, t);
            gain.gain.setValueAtTime(0.0, t);
            gain.gain.linearRampToValueAtTime(0.07, t + 0.4);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 1.0);
            osc.connect(gain).connect(this.ctx.destination);
            osc.start(t + i * 0.05);
            osc.stop(t + 1.1);
        });
    },
 
    // Boss hit — heavier thud
    playBossHit() {
        if (!this.ctx || !this.enabled) return;
        const t = this.ctx.currentTime;
        const bufferSize = this.ctx.sampleRate * 0.08;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.5;
        const src = this.ctx.createBufferSource();
        src.buffer = buffer;
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
        src.connect(gain).connect(this.ctx.destination);
        src.start(t);
        const osc = this.ctx.createOscillator();
        const og = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(150, t);
        osc.frequency.exponentialRampToValueAtTime(50, t + 0.1);
        og.gain.setValueAtTime(0.12, t);
        og.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
        osc.connect(og).connect(this.ctx.destination);
        osc.start(t); osc.stop(t + 0.1);
    },
 
    // Shield pickup — shimmery ascending chord
    playShield() {
        if (!this.ctx || !this.enabled) return;
        const t = this.ctx.currentTime;
        [523, 659, 784, 1047].forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, t + i * 0.05);
            gain.gain.setValueAtTime(0.08, t + i * 0.05);
            gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.05 + 0.25);
            osc.connect(gain).connect(this.ctx.destination);
            osc.start(t + i * 0.05);
            osc.stop(t + i * 0.05 + 0.25);
        });
    },
 
    // Player hit — low thud
    playPlayerHit() {
        if (!this.ctx || !this.enabled) return;
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(80, t);
        osc.frequency.exponentialRampToValueAtTime(30, t + 0.12);
        gain.gain.setValueAtTime(0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
        osc.connect(gain).connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.12);
    },
 
    // Player death — descending tone with noise
    playPlayerDeath() {
        if (!this.ctx || !this.enabled) return;
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(400, t);
        osc.frequency.exponentialRampToValueAtTime(50, t + 0.5);
        gain.gain.setValueAtTime(0.15, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
        osc.connect(gain).connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.5);
    },
 
    // Level complete — ascending C-E-G arpeggio
    playLevelComplete() {
        if (!this.ctx || !this.enabled) return;
        const t = this.ctx.currentTime;
        const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
        notes.forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(freq, t + i * 0.15);
            gain.gain.setValueAtTime(0.1, t + i * 0.15);
            gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.15 + 0.2);
            osc.connect(gain).connect(this.ctx.destination);
            osc.start(t + i * 0.15);
            osc.stop(t + i * 0.15 + 0.2);
        });
    },
 
    // Game over — descending E4-C4
    playGameOver() {
        if (!this.ctx || !this.enabled) return;
        const t = this.ctx.currentTime;
        const notes = [329.63, 261.63]; // E4, C4
        notes.forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, t + i * 0.3);
            gain.gain.setValueAtTime(0.12, t + i * 0.3);
            gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.3 + 0.35);
            osc.connect(gain).connect(this.ctx.destination);
            osc.start(t + i * 0.3);
            osc.stop(t + i * 0.3 + 0.35);
        });
    },
 
    // Victory fanfare — full ascending arpeggio
    playVictory() {
        if (!this.ctx || !this.enabled) return;
        const t = this.ctx.currentTime;
        const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5]; // C5-E5-G5-C6-E6
        notes.forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(freq, t + i * 0.12);
            gain.gain.setValueAtTime(0.1, t + i * 0.12);
            gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.12 + 0.3);
            osc.connect(gain).connect(this.ctx.destination);
            osc.start(t + i * 0.12);
            osc.stop(t + i * 0.12 + 0.3);
        });
    },
 
    // Pickup collected — bright chirp
    playPickup() {
        if (!this.ctx || !this.enabled) return;
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, t);
        osc.frequency.exponentialRampToValueAtTime(800, t + 0.1);
        gain.gain.setValueAtTime(0.12, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
        osc.connect(gain).connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.1);
    },
 
    // Enemy shoot — short pitched blip
    playEnemyShoot() {
        if (!this.ctx || !this.enabled) return;
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(300, t);
        osc.frequency.exponentialRampToValueAtTime(100, t + 0.06);
        gain.gain.setValueAtTime(0.06, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
        osc.connect(gain).connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.06);
    },
 
    // Boss shoot — deep heavy blip
    playBossShoot() {
        if (!this.ctx || !this.enabled) return;
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(180, t);
        osc.frequency.exponentialRampToValueAtTime(60, t + 0.1);
        gain.gain.setValueAtTime(0.1, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
        osc.connect(gain).connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.1);
    },
};
