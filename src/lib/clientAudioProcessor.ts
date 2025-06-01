
import { LofiSettings } from "@/components/LofiControls";
import { toast } from "sonner";

export class ClientAudioProcessor {
  private audioContext: AudioContext | null = null;
  private audioBuffer: AudioBuffer | null = null;

  constructor() {
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }

  async loadAudioFile(file: File): Promise<AudioBuffer> {
    try {
      const arrayBuffer = await file.arrayBuffer();
      this.audioBuffer = await this.audioContext!.decodeAudioData(arrayBuffer);
      return this.audioBuffer;
    } catch (error) {
      console.error("Error loading audio file:", error);
      toast.error("Failed to load audio file");
      throw error;
    }
  }

  async processToLofi(settings: LofiSettings): Promise<Blob> {
    if (!this.audioBuffer || !this.audioContext) {
      throw new Error("No audio loaded");
    }

    try {
      console.log("Processing audio with settings:", settings);
      
      // Calculate tempo ratio from BPM (assuming original is around 120 BPM)
      const tempoRatio = settings.bpm / 120;
      
      // Create offline audio context with original duration (no tempo stretching)
      const offlineContext = new OfflineAudioContext(
        this.audioBuffer.numberOfChannels,
        this.audioBuffer.length, // Keep original length
        this.audioBuffer.sampleRate // Keep original sample rate
      );

      // Create source
      const source = offlineContext.createBufferSource();
      source.buffer = this.audioBuffer;

      // Apply tempo change through detune instead of playback rate to maintain duration
      if (tempoRatio !== 1) {
        // Convert tempo ratio to detune cents (approximate)
        const detuneAmount = (tempoRatio - 1) * 1200; // Convert to cents
        source.detune.value = detuneAmount;
      }

      // Create effects chain
      let currentNode: AudioNode = source;

      // Pitch shift (detune) for tape wobble effect
      if (settings.pitchShift !== 0) {
        source.detune.value += settings.pitchShift * 100; // Add to existing detune
      }

      // Enhanced low-pass filter for warm lo-fi sound
      const lowPassFilter = offlineContext.createBiquadFilter();
      lowPassFilter.type = 'lowpass';
      // More musical frequency range for lo-fi warmth
      lowPassFilter.frequency.value = Math.max(800, 12000 - (settings.filter * 80));
      lowPassFilter.Q.value = 0.7 + (settings.filter / 150); // Musical resonance
      currentNode.connect(lowPassFilter);
      currentNode = lowPassFilter;

      // High-pass filter to clean up low end
      const highPassFilter = offlineContext.createBiquadFilter();
      highPassFilter.type = 'highpass';
      highPassFilter.frequency.value = 60 + (settings.filter * 1.5);
      highPassFilter.Q.value = 0.5;
      currentNode.connect(highPassFilter);
      currentNode = highPassFilter;

      // Enhanced Reverb for spacious lo-fi atmosphere
      if (settings.reverb > 0) {
        const convolver = offlineContext.createConvolver();
        convolver.buffer = this.createReverbImpulse(offlineContext, settings.reverb / 100);
        
        const inputGain = offlineContext.createGain();
        const dryGain = offlineContext.createGain();
        const wetGain = offlineContext.createGain();
        const outputGain = offlineContext.createGain();
        
        // Better wet/dry mixing for musical reverb
        const wetAmount = settings.reverb / 100;
        dryGain.gain.value = 1 - (wetAmount * 0.3); // Less dry reduction
        wetGain.gain.value = wetAmount * 0.4; // More controlled wet signal
        
        currentNode.connect(inputGain);
        inputGain.connect(dryGain);
        inputGain.connect(convolver);
        convolver.connect(wetGain);
        
        dryGain.connect(outputGain);
        wetGain.connect(outputGain);
        currentNode = outputGain;
      }

      // Improved bit crusher effect for authentic lo-fi degradation
      if (settings.bitcrusher > 0) {
        const waveshaper = offlineContext.createWaveShaper();
        waveshaper.curve = this.createLofiCrushCurve(settings.bitcrusher);
        waveshaper.oversample = '2x';
        currentNode.connect(waveshaper);
        currentNode = waveshaper;
      }

      // Gentle compression for cohesion without artifacts
      const compressor = offlineContext.createDynamicsCompressor();
      compressor.threshold.value = -18;
      compressor.knee.value = 6;
      compressor.ratio.value = 2.5;
      compressor.attack.value = 0.003;
      compressor.release.value = 0.05;
      currentNode.connect(compressor);
      currentNode = compressor;

      // Master gain with gentle limiting
      const masterGain = offlineContext.createGain();
      masterGain.gain.value = 0.9;
      currentNode.connect(masterGain);
      masterGain.connect(offlineContext.destination);

      // Start processing
      source.start(0);
      
      const renderedBuffer = await offlineContext.startRendering();
      
      // Convert to WAV blob (no noise added)
      const wavBlob = this.audioBufferToWav(renderedBuffer);
      
      toast.success("Lo-fi conversion complete!");
      return wavBlob;
      
    } catch (error) {
      console.error("Error processing audio:", error);
      toast.error("Failed to process audio");
      throw error;
    }
  }

  private createReverbImpulse(context: OfflineAudioContext, reverbAmount: number): AudioBuffer {
    const length = Math.floor(context.sampleRate * (0.5 + reverbAmount * 1.5)); // Shorter, more controlled reverb
    const impulse = context.createBuffer(2, length, context.sampleRate);
    
    for (let channel = 0; channel < 2; channel++) {
      const channelData = impulse.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        const decay = Math.pow(1 - (i / length), 2) * reverbAmount;
        // Create warm, musical room impulse
        const early = (Math.random() * 2 - 1) * Math.exp(-i / (context.sampleRate * 0.05));
        const late = (Math.random() * 2 - 1) * 0.3 * Math.exp(-i / (context.sampleRate * 0.2));
        channelData[i] = (early + late) * decay * 0.5;
      }
    }
    
    return impulse;
  }

  private createLofiCrushCurve(amount: number): Float32Array {
    const samples = 44100;
    const curve = new Float32Array(samples);
    
    // More musical bit reduction
    const bitReduction = 1 + (amount / 100) * 8; // Increased range for more effect
    const mix = Math.min(amount / 100, 0.8); // Mix control
    
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      const step = Math.pow(2, bitReduction);
      let crushed = Math.round(x * step) / step;
      
      // Add subtle tape saturation
      crushed = Math.tanh(crushed * 1.2) * 0.9;
      
      // Mix with original for musicality
      curve[i] = x * (1 - mix) + crushed * mix;
    }
    
    return curve;
  }

  private audioBufferToWav(buffer: AudioBuffer): Blob {
    const length = buffer.length * buffer.numberOfChannels * 2;
    const arrayBuffer = new ArrayBuffer(44 + length);
    const view = new DataView(arrayBuffer);
    
    // WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };
    
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + length, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, buffer.numberOfChannels, true);
    view.setUint32(24, buffer.sampleRate, true);
    view.setUint32(28, buffer.sampleRate * 2 * buffer.numberOfChannels, true);
    view.setUint16(32, buffer.numberOfChannels * 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, length, true);
    
    // Convert audio data
    let offset = 44;
    for (let i = 0; i < buffer.length; i++) {
      for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
        const sample = Math.max(-1, Math.min(1, buffer.getChannelData(channel)[i]));
        view.setInt16(offset, sample * 0x7FFF, true);
        offset += 2;
      }
    }
    
    return new Blob([arrayBuffer], { type: 'audio/wav' });
  }

  dispose(): void {
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
    }
  }
}
