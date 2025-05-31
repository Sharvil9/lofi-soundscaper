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
      
      // Apply sample rate reduction if specified
      let targetSampleRate = this.audioBuffer.sampleRate;
      if (settings.sampleRateReduction > 0) {
        targetSampleRate = Math.max(8000, this.audioBuffer.sampleRate * (1 - settings.sampleRateReduction / 100));
      }
      
      // Create offline audio context for processing
      const offlineContext = new OfflineAudioContext(
        this.audioBuffer.numberOfChannels,
        Math.floor(this.audioBuffer.length * tempoRatio),
        targetSampleRate
      );

      // Create source
      const source = offlineContext.createBufferSource();
      source.buffer = this.audioBuffer;

      // Apply tempo change
      source.playbackRate.value = tempoRatio;

      // Create effects chain
      let currentNode: AudioNode = source;

      // Pitch shift (detune)
      if (settings.pitchShift !== 0) {
        source.detune.value = settings.pitchShift * 100; // Convert semitones to cents
      }

      // Enhanced low-pass filter for that classic lo-fi sound
      const lowPassFilter = offlineContext.createBiquadFilter();
      lowPassFilter.type = 'lowpass';
      // More aggressive filtering for lo-fi effect
      lowPassFilter.frequency.value = Math.max(500, 8000 - (settings.filter * 60));
      lowPassFilter.Q.value = 0.5 + (settings.filter / 200); // Slight resonance
      currentNode.connect(lowPassFilter);
      currentNode = lowPassFilter;

      // High-pass filter to remove some low end mud
      const highPassFilter = offlineContext.createBiquadFilter();
      highPassFilter.type = 'highpass';
      highPassFilter.frequency.value = 80 + (settings.filter * 2);
      highPassFilter.Q.value = 0.7;
      currentNode.connect(highPassFilter);
      currentNode = highPassFilter;

      // Enhanced Reverb with proper wet/dry mix
      if (settings.reverb > 0) {
        const convolver = offlineContext.createConvolver();
        convolver.buffer = this.createReverbImpulse(offlineContext, settings.reverb / 100);
        
        const inputGain = offlineContext.createGain();
        const dryGain = offlineContext.createGain();
        const wetGain = offlineContext.createGain();
        const outputGain = offlineContext.createGain();
        
        // Proper wet/dry mixing
        const wetAmount = settings.reverb / 100;
        dryGain.gain.value = 1 - (wetAmount * 0.5);
        wetGain.gain.value = wetAmount * 0.3;
        
        currentNode.connect(inputGain);
        inputGain.connect(dryGain);
        inputGain.connect(convolver);
        convolver.connect(wetGain);
        
        dryGain.connect(outputGain);
        wetGain.connect(outputGain);
        currentNode = outputGain;
      }

      // Improved bit crusher effect (less harsh)
      if (settings.bitcrusher > 0) {
        const waveshaper = offlineContext.createWaveShaper();
        waveshaper.curve = this.createSmoothBitCrushCurve(settings.bitcrusher);
        waveshaper.oversample = '2x';
        currentNode.connect(waveshaper);
        currentNode = waveshaper;
      }

      // Saturation/Distortion for analog warmth
      if (settings.saturation > 0) {
        const saturationNode = offlineContext.createWaveShaper();
        saturationNode.curve = this.createSaturationCurve(settings.saturation);
        saturationNode.oversample = '4x';
        currentNode.connect(saturationNode);
        currentNode = saturationNode;
      }

      // Subtle compression for cohesion
      const compressor = offlineContext.createDynamicsCompressor();
      compressor.threshold.value = -12;
      compressor.knee.value = 8;
      compressor.ratio.value = 3;
      compressor.attack.value = 0.01;
      compressor.release.value = 0.1;
      currentNode.connect(compressor);
      currentNode = compressor;

      // Master gain with subtle limiting
      const masterGain = offlineContext.createGain();
      masterGain.gain.value = 0.85;
      currentNode.connect(masterGain);
      masterGain.connect(offlineContext.destination);

      // Start processing
      source.start(0);
      
      const renderedBuffer = await offlineContext.startRendering();
      
      // Add vinyl noise if specified
      if (settings.noise > 0) {
        this.addVinylNoise(renderedBuffer, settings.noise);
      }
      
      // Convert to WAV blob
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
    const length = Math.floor(context.sampleRate * (1 + reverbAmount * 2)); // Variable length based on amount
    const impulse = context.createBuffer(2, length, context.sampleRate);
    
    for (let channel = 0; channel < 2; channel++) {
      const channelData = impulse.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        const decay = Math.pow(1 - (i / length), 1.5) * reverbAmount;
        // Create more realistic room impulse
        const early = Math.random() * 2 - 1;
        const late = (Math.random() * 2 - 1) * 0.5;
        channelData[i] = (early * Math.exp(-i / (context.sampleRate * 0.1)) + late) * decay;
      }
    }
    
    return impulse;
  }

  private createSmoothBitCrushCurve(amount: number): Float32Array {
    const samples = 44100;
    const curve = new Float32Array(samples);
    const bitReduction = 1 + (amount / 100) * 6; // Reduced range for smoother effect
    
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      const step = Math.pow(2, bitReduction);
      const crushed = Math.round(x * step) / step;
      // Soften the harsh edges
      curve[i] = crushed * 0.8 + x * 0.2;
    }
    
    return curve;
  }

  private createSaturationCurve(amount: number = 50): Float32Array {
    const samples = 44100;
    const curve = new Float32Array(samples);
    const drive = 1 + (amount / 100) * 3;
    
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      // Tube-style saturation
      const saturated = Math.tanh(x * drive) * (1 / Math.tanh(drive));
      curve[i] = saturated * 0.9; // Prevent clipping
    }
    
    return curve;
  }

  private addVinylNoise(buffer: AudioBuffer, noiseAmount: number): void {
    if (noiseAmount === 0) return;
    
    const noiseGain = (noiseAmount / 100) * 0.05; // Reduced noise level
    
    for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      for (let i = 0; i < channelData.length; i++) {
        // Create vinyl-like crackle and pop
        const crackle = (Math.random() * 2 - 1) * noiseGain * 0.3;
        const pop = Math.random() < 0.0001 ? (Math.random() * 2 - 1) * noiseGain * 3 : 0;
        channelData[i] += crackle + pop;
        
        // Prevent clipping
        channelData[i] = Math.max(-1, Math.min(1, channelData[i]));
      }
    }
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

  addNoise(buffer: AudioBuffer, noiseAmount: number): void {
    if (noiseAmount === 0) return;
    
    for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      for (let i = 0; i < channelData.length; i++) {
        const noise = (Math.random() * 2 - 1) * (noiseAmount / 100) * 0.1;
        channelData[i] += noise;
      }
    }
  }

  dispose(): void {
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
    }
  }
}
