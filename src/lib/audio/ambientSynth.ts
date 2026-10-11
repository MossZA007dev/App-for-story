// Ambient Soundscape Synthesizer for Dark Drama / AU Storytelling
// Generates haunting cinematic drones, atmospheric wind sweeps, and crackling embers

class AmbientSoundEngine {
  private ctx: AudioContext | null = null;
  private isRunning: boolean = false;
  private masterGain: GainNode | null = null;
  private nodes: (AudioNode | number)[] = [];
  private currentVolume: number = 0.5;

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  public play(track: "wildfire" | "winter" | "war" | "shadows" = "wildfire") {
    try {
      this.stop();
      this.initContext();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0, now);
      this.masterGain.gain.linearRampToValueAtTime(this.currentVolume, now + 2);
      this.masterGain.connect(this.ctx.destination);

      if (track === "wildfire") {
        this.createWildfireTheme(now);
      } else if (track === "winter") {
        this.createWinterTheme(now);
      } else if (track === "war") {
        this.createWarTheme(now);
      } else {
        this.createShadowsTheme(now);
      }

      this.isRunning = true;
    } catch (err) {
      console.error("Failed to start ambient audio:", err);
    }
  }

  private createWildfireTheme(now: number) {
    if (!this.ctx || !this.masterGain) return;

    // Deep Dark Bass Drone (D2 - 73.4Hz)
    const osc1 = this.ctx.createOscillator();
    osc1.type = "sawtooth";
    osc1.frequency.setValueAtTime(73.42, now);

    const filter1 = this.ctx.createBiquadFilter();
    filter1.type = "lowpass";
    filter1.frequency.setValueAtTime(140, now);

    // LFO to slowly sweep filter
    const lfo = this.ctx.createOscillator();
    lfo.type = "sine";
    lfo.frequency.setValueAtTime(0.1, now); // 10s cycle
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.setValueAtTime(60, now);
    lfo.connect(lfoGain);
    lfoGain.connect(filter1.frequency);
    lfo.start(now);

    const gain1 = this.ctx.createGain();
    gain1.gain.setValueAtTime(0.35, now);
    osc1.connect(filter1);
    filter1.connect(gain1);
    gain1.connect(this.masterGain);
    osc1.start(now);

    // Minor 5th harmony pad (A2 - 110Hz)
    const osc2 = this.ctx.createOscillator();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(110, now);
    const gain2 = this.ctx.createGain();
    gain2.gain.setValueAtTime(0.2, now);
    osc2.connect(gain2);
    gain2.connect(this.masterGain);
    osc2.start(now);

    // Atmospheric Rumble / Wind Noise
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      output[i] = (b0 + b1 + b2) * 0.08;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    noise.loop = true;

    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = "bandpass";
    noiseFilter.frequency.setValueAtTime(250, now);
    noiseFilter.Q.setValueAtTime(2.0, now);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.15, now);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.masterGain);
    noise.start(now);

    this.nodes.push(osc1, osc2, lfo, noise);
  }

  private createWinterTheme(now: number) {
    if (!this.ctx || !this.masterGain) return;

    // Winter Wind Sweeps (Filtered High Noise)
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * 0.1;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    noise.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(400, now);
    filter.Q.setValueAtTime(4.0, now);

    // Wind sweep LFO
    const lfo = this.ctx.createOscillator();
    lfo.type = "sine";
    lfo.frequency.setValueAtTime(0.15, now);
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.setValueAtTime(250, now);
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);
    lfo.start(now);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.3, now);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.masterGain);
    noise.start(now);

    // Cold Low Drone (C2 - 65.4Hz)
    const osc = this.ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(65.41, now);
    const oscGain = this.ctx.createGain();
    oscGain.gain.setValueAtTime(0.25, now);
    osc.connect(oscGain);
    oscGain.connect(this.masterGain);
    osc.start(now);

    this.nodes.push(noise, osc, lfo);
  }

  private createWarTheme(now: number) {
    if (!this.ctx || !this.masterGain) return;

    // Menacing Minor Root (E2 - 82.4Hz)
    const osc = this.ctx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(82.41, now);

    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(120, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.4, now);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);

    // Minor 3rd Tension (G2 - 98Hz)
    const osc2 = this.ctx.createOscillator();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(98.0, now);
    const gain2 = this.ctx.createGain();
    gain2.gain.setValueAtTime(0.2, now);
    osc2.connect(gain2);
    gain2.connect(this.masterGain);
    osc2.start(now);

    this.nodes.push(osc, osc2);
  }

  private createShadowsTheme(now: number) {
    if (!this.ctx || !this.masterGain) return;

    // Whispering Ethereal Sine (F#2 - 92.5Hz)
    const osc = this.ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(92.5, now);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.3, now);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);

    // Shimmer harmonic (C#3 - 138.6Hz)
    const osc2 = this.ctx.createOscillator();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(138.6, now);
    const gain2 = this.ctx.createGain();
    gain2.gain.setValueAtTime(0.18, now);
    osc2.connect(gain2);
    gain2.connect(this.masterGain);
    osc2.start(now);

    this.nodes.push(osc, osc2);
  }

  public setVolume(vol: number) {
    this.currentVolume = Math.max(0, Math.min(1, vol));
    if (this.ctx && this.masterGain) {
      this.masterGain.gain.setValueAtTime(this.currentVolume, this.ctx.currentTime);
    }
  }

  public stop() {
    if (this.ctx && this.masterGain) {
      const now = this.ctx.currentTime;
      this.masterGain.gain.linearRampToValueAtTime(0.001, now + 0.8);
      setTimeout(() => {
        this.nodes.forEach((node) => {
          if (typeof node !== "number" && "stop" in node && typeof (node as AudioScheduledSourceNode).stop === "function") {
            try {
              (node as AudioScheduledSourceNode).stop();
            } catch {}
          }
        });
        this.nodes = [];
      }, 850);
    }
    this.isRunning = false;
  }

  public getIsPlaying(): boolean {
    return this.isRunning;
  }
}

export const ambientSound = new AmbientSoundEngine();
