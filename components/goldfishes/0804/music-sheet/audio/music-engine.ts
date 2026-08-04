type ToneModule = typeof import("tone");

type PolyphonicVoice = {
  triggerAttackRelease: (
    notes: string[],
    duration: number,
    time?: number,
    velocity?: number,
  ) => unknown;
  dispose: () => unknown;
};

type DisposableNode = { dispose: () => unknown };

export class MusicSheetEngine {
  private tone: ToneModule | null = null;
  private synth: PolyphonicVoice | null = null;
  private reverb: DisposableNode | null = null;
  private compressor: DisposableNode | null = null;
  private enabling: Promise<void> | null = null;
  private enabled = false;
  private muted = false;
  private tempo = 84;

  setMuted(muted: boolean) {
    this.muted = muted;
  }

  setTempo(tempo: number) {
    this.tempo = Math.min(160, Math.max(40, tempo));
  }

  async enable() {
    if (this.enabled || this.enabling) return this.enabling;
    this.enabling = (async () => {
      const Tone = await import("tone");
      await Tone.start();

      const compressor = new Tone.Compressor({
        threshold: -20,
        ratio: 3,
        attack: 0.012,
        release: 0.18,
      }).toDestination();
      const reverb = new Tone.Reverb({ decay: 1.55, wet: 0.16 }).connect(
        compressor,
      );
      const synth = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: "triangle8" },
        envelope: {
          attack: 0.008,
          decay: 0.16,
          sustain: 0.18,
          release: 0.72,
        },
      }).connect(reverb);
      synth.maxPolyphony = 20;
      synth.volume.value = -12;

      this.tone = Tone;
      this.compressor = compressor;
      this.reverb = reverb;
      this.synth = synth;
      this.enabled = true;
    })().finally(() => {
      this.enabling = null;
    });
    return this.enabling;
  }

  triggerChord(pitches: readonly string[], velocity = 0.45) {
    if (!this.enabled || this.muted || !this.synth || !this.tone) return;
    const uniquePitches = Array.from(new Set(pitches)).slice(0, 6);
    if (uniquePitches.length === 0) return;
    const duration = (60 / this.tempo) * 0.42;
    this.synth.triggerAttackRelease(
      uniquePitches,
      duration,
      this.tone.now(),
      Math.min(0.72, Math.max(0.18, velocity)),
    );
  }

  dispose() {
    this.synth?.dispose();
    this.reverb?.dispose();
    this.compressor?.dispose();
    this.synth = null;
    this.reverb = null;
    this.compressor = null;
    this.tone = null;
    this.enabled = false;
  }
}
