
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
      
      // Create offline audio context for processing
      const offlineContext = new OfflineAudioContext(
        this.audioBuffer.numberOfChannels,
        Math.floor(this.audioBuffer.length * (settings.tempo / 100)),
        this.audioBuffer.sampleRate
      );

      // Create source
      const source = offlineContext.createBufferSource();
      source.buffer = this.audioBuffer;

      // Apply tempo change (simplified)
      source.playbackRate.value = settings.tempo / 100;

      // Create effects chain
      let currentNode: AudioNode = source;

      // Low-pass filter for that muffled lo-fi sound
      const lowPassFilter = offlineContext.createBiquadFilter();
      lowPassFilter.type = 'lowpass';
      lowPassFilter.frequency.value = 3000 - (settings.filter * 20); // Reduce frequency based on filter setting
      currentNode.connect(lowPassFilter);
      currentNode = lowPassFilter;

      // High-pass filter to remove some low end
      const highPassFilter = offlineContext.createBiquadFilter();
      highPassFilter.type = 'highpass';
      highPassFilter.frequency.value = 100 + (settings.filter * 2);
      currentNode.connect(highPassFilter);
      currentNode = highPassFilter;

      // Reverb (convolution)
      if (settings.reverb > 0) {
        const convolver = offlineContext.createConvolver();
        convolver.buffer = this.createReverbImpulse(offlineContext, settings.reverb / 100);
        
        const dry = offlineContext.createGain();
        dry.gain.value = 1 - (settings.reverb / 200);
        
        const wet = offlineContext.createGain();
        wet.gain.value = settings.reverb / 200;
        
        currentNode.connect(dry);
        currentNode.connect(convolver);
        convolver.connect(wet);
        
        const merger = offlineContext.createGain();
        dry.connect(merger);
        wet.connect(merger);
        currentNode = merger;
      }

      // Bit crusher effect (simplified)
      if (settings.bitcrusher > 0) {
        const waveshaper = offlineContext.createWaveShaper();
        waveshaper.curve = this.createBitCrushCurve(settings.bitcrusher);
        currentNode.connect(waveshaper);
        currentNode = waveshaper;
      }

      // Add some saturation/warmth
      const saturation = offlineContext.createWaveShaper();
      saturation.curve = this.createSaturationCurve();
      saturation.oversample = '4x';
      currentNode.connect(saturation);
      currentNode = saturation;

      // Master gain
      const masterGain = offlineContext.createGain();
      masterGain.gain.value = 0.8; // Slightly reduce volume
      currentNode.connect(masterGain);
      masterGain.connect(offlineContext.destination);

      // Start processing
      source.start(0);
      
      const renderedBuffer = await offlineContext.startRendering();
      
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
    const length = context.sampleRate * 2; // 2 seconds
    const impulse = context.createBuffer(2, length, context.sampleRate);
    
    for (let channel = 0; channel < 2; channel++) {
      const channelData = impulse.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        const decay = Math.pow(1 - (i / length), 2) * reverbAmount;
        channelData[i] = (Math.random() * 2 - 1) * decay;
      }
    }
    
    return impulse;
  }

  private createBitCrushCurve(amount: number): Float32Array {
    const samples = 44100;
    const curve = new Float32Array(samples);
    const step = amount / 100;
    
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      curve[i] = Math.sign(x) * Math.pow(Math.abs(x), 1 + step);
    }
    
    return curve;
  }

  private createSaturationCurve(): Float32Array {
    const samples = 44100;
    const curve = new Float32Array(samples);
    
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      curve[i] = Math.tanh(x * 2) * 0.7;
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
