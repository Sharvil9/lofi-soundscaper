import { LofiSettings } from "@/components/LofiControls";
import { toast } from "sonner";
import { AudioFormatConverter, ConversionOptions } from "./audioFormatConverter";

export interface ProcessingProgress {
  progress: number;
  stage: string;
}

export class ClientAudioProcessor {
  private audioContext: AudioContext | null = null;
  private audioBuffer: AudioBuffer | null = null;
  private previewAudioContext: AudioContext | null = null;
  private previewSource: AudioBufferSourceNode | null = null;
  private previewGain: GainNode | null = null;
  private isPreviewActive = false;

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

  async startPreview(settings: LofiSettings, onProgress?: (progress: ProcessingProgress) => void): Promise<void> {
    if (!this.audioBuffer || this.isPreviewActive) return;

    try {
      if (onProgress) onProgress({ progress: 10, stage: "Initializing preview..." });

      // Create separate context for preview
      this.previewAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      if (onProgress) onProgress({ progress: 30, stage: "Setting up audio effects..." });

      // Create a shorter buffer for preview (first 10 seconds)
      const previewDuration = Math.min(10, this.audioBuffer.duration);
      const previewLength = Math.floor(previewDuration * this.audioBuffer.sampleRate);
      
      const previewBuffer = this.previewAudioContext.createBuffer(
        this.audioBuffer.numberOfChannels,
        previewLength,
        this.audioBuffer.sampleRate
      );

      // Copy audio data
      for (let channel = 0; channel < this.audioBuffer.numberOfChannels; channel++) {
        const originalData = this.audioBuffer.getChannelData(channel);
        const previewData = previewBuffer.getChannelData(channel);
        for (let i = 0; i < previewLength; i++) {
          previewData[i] = originalData[i];
        }
      }

      if (onProgress) onProgress({ progress: 60, stage: "Applying lo-fi effects..." });

      // Create effects chain for preview
      this.previewSource = this.previewAudioContext.createBufferSource();
      this.previewSource.buffer = previewBuffer;

      let currentNode: AudioNode = this.previewSource;

      // Apply BPM change via detune
      if (settings.bpm !== 120) {
        const tempoRatio = settings.bpm / 120;
        const detuneAmount = (tempoRatio - 1) * 1200;
        this.previewSource.detune.value = detuneAmount;
      }

      // Pitch shift
      if (settings.pitchShift !== 0) {
        this.previewSource.detune.value += settings.pitchShift * 100;
      }

      // Low-pass filter
      const lowPassFilter = this.previewAudioContext.createBiquadFilter();
      lowPassFilter.type = 'lowpass';
      lowPassFilter.frequency.value = Math.max(800, 12000 - (settings.filter * 80));
      lowPassFilter.Q.value = 0.7 + (settings.filter / 150);
      currentNode.connect(lowPassFilter);
      currentNode = lowPassFilter;

      // High-pass filter
      const highPassFilter = this.previewAudioContext.createBiquadFilter();
      highPassFilter.type = 'highpass';
      highPassFilter.frequency.value = 60 + (settings.filter * 1.5);
      highPassFilter.Q.value = 0.5;
      currentNode.connect(highPassFilter);
      currentNode = highPassFilter;

      // Simple reverb simulation using delay
      if (settings.reverb > 0) {
        const delay = this.previewAudioContext.createDelay(1);
        const feedback = this.previewAudioContext.createGain();
        const wetGain = this.previewAudioContext.createGain();
        const dryGain = this.previewAudioContext.createGain();
        const output = this.previewAudioContext.createGain();

        delay.delayTime.value = 0.1 + (settings.reverb / 100) * 0.4;
        feedback.gain.value = Math.min(0.7, settings.reverb / 100);
        wetGain.gain.value = settings.reverb / 100 * 0.3;
        dryGain.gain.value = 1 - (settings.reverb / 100 * 0.2);

        currentNode.connect(dryGain);
        currentNode.connect(delay);
        delay.connect(feedback);
        feedback.connect(delay);
        delay.connect(wetGain);

        dryGain.connect(output);
        wetGain.connect(output);
        currentNode = output;
      }

      // Bit crusher simulation
      if (settings.bitcrusher > 0) {
        const waveshaper = this.previewAudioContext.createWaveShaper();
        const mix = settings.bitcrusher / 100;
        const samples = 1024;
        const curve = new Float32Array(samples);
        
        for (let i = 0; i < samples; i++) {
          const x = (i * 2) / samples - 1;
          const step = Math.pow(2, 3 + (settings.bitcrusher / 100) * 5);
          let crushed = Math.round(x * step) / step;
          crushed = Math.tanh(crushed * 1.2) * 0.9;
          curve[i] = x * (1 - mix) + crushed * mix;
        }
        
        waveshaper.curve = curve;
        currentNode.connect(waveshaper);
        currentNode = waveshaper;
      }

      if (onProgress) onProgress({ progress: 90, stage: "Starting preview..." });

      // Master gain
      this.previewGain = this.previewAudioContext.createGain();
      this.previewGain.gain.value = 0.7;
      currentNode.connect(this.previewGain);
      this.previewGain.connect(this.previewAudioContext.destination);

      // Start preview
      this.previewSource.start(0);
      this.isPreviewActive = true;

      if (onProgress) onProgress({ progress: 100, stage: "Preview started!" });

      // Auto-stop after preview duration
      setTimeout(() => {
        this.stopPreview();
      }, previewDuration * 1000);

    } catch (error) {
      console.error("Error starting preview:", error);
      this.stopPreview();
      throw error;
    }
  }

  stopPreview(): void {
    if (this.previewSource) {
      try {
        this.previewSource.stop();
      } catch (error) {
        // Source might already be stopped
      }
      this.previewSource = null;
    }

    if (this.previewAudioContext) {
      this.previewAudioContext.close();
      this.previewAudioContext = null;
    }

    this.isPreviewActive = false;
  }

  async processToLofi(
    settings: LofiSettings, 
    onProgress?: (progress: ProcessingProgress) => void
  ): Promise<AudioBuffer> {
    if (!this.audioBuffer || !this.audioContext) {
      throw new Error("No audio loaded");
    }

    try {
      console.log("Processing audio with settings:", settings);
      
      if (onProgress) onProgress({ progress: 5, stage: "Initializing audio processing..." });

      const offlineContext = new OfflineAudioContext(
        this.audioBuffer.numberOfChannels,
        this.audioBuffer.length,
        this.audioBuffer.sampleRate
      );

      if (onProgress) onProgress({ progress: 15, stage: "Creating audio source..." });

      const source = offlineContext.createBufferSource();
      source.buffer = this.audioBuffer;

      // Apply tempo and pitch changes
      if (settings.bpm !== 120) {
        const tempoRatio = settings.bpm / 120;
        const detuneAmount = (tempoRatio - 1) * 1200;
        source.detune.value = detuneAmount;
      }

      if (settings.pitchShift !== 0) {
        source.detune.value += settings.pitchShift * 100;
      }

      let currentNode: AudioNode = source;

      if (onProgress) onProgress({ progress: 30, stage: "Applying filters..." });

      // Enhanced low-pass filter for warm lo-fi sound
      const lowPassFilter = offlineContext.createBiquadFilter();
      lowPassFilter.type = 'lowpass';
      lowPassFilter.frequency.value = Math.max(800, 12000 - (settings.filter * 80));
      lowPassFilter.Q.value = 0.7 + (settings.filter / 150);
      currentNode.connect(lowPassFilter);
      currentNode = lowPassFilter;

      // High-pass filter to clean up low end
      const highPassFilter = offlineContext.createBiquadFilter();
      highPassFilter.type = 'highpass';
      highPassFilter.frequency.value = 60 + (settings.filter * 1.5);
      highPassFilter.Q.value = 0.5;
      currentNode.connect(highPassFilter);
      currentNode = highPassFilter;

      if (onProgress) onProgress({ progress: 50, stage: "Adding reverb..." });

      // Enhanced Reverb
      if (settings.reverb > 0) {
        const convolver = offlineContext.createConvolver();
        convolver.buffer = this.createReverbImpulse(offlineContext, settings.reverb / 100);
        
        const inputGain = offlineContext.createGain();
        const dryGain = offlineContext.createGain();
        const wetGain = offlineContext.createGain();
        const outputGain = offlineContext.createGain();
        
        const wetAmount = settings.reverb / 100;
        dryGain.gain.value = 1 - (wetAmount * 0.3);
        wetGain.gain.value = wetAmount * 0.4;
        
        currentNode.connect(inputGain);
        inputGain.connect(dryGain);
        inputGain.connect(convolver);
        convolver.connect(wetGain);
        
        dryGain.connect(outputGain);
        wetGain.connect(outputGain);
        currentNode = outputGain;
      }

      if (onProgress) onProgress({ progress: 70, stage: "Applying lo-fi effects..." });

      // Improved bit crusher effect
      if (settings.bitcrusher > 0) {
        const waveshaper = offlineContext.createWaveShaper();
        waveshaper.curve = this.createLofiCrushCurve(settings.bitcrusher);
        waveshaper.oversample = '2x';
        currentNode.connect(waveshaper);
        currentNode = waveshaper;
      }

      if (onProgress) onProgress({ progress: 85, stage: "Applying compression..." });

      // Gentle compression
      const compressor = offlineContext.createDynamicsCompressor();
      compressor.threshold.value = -18;
      compressor.knee.value = 6;
      compressor.ratio.value = 2.5;
      compressor.attack.value = 0.003;
      compressor.release.value = 0.05;
      currentNode.connect(compressor);
      currentNode = compressor;

      // Master gain
      const masterGain = offlineContext.createGain();
      masterGain.gain.value = 0.9;
      currentNode.connect(masterGain);
      masterGain.connect(offlineContext.destination);

      if (onProgress) onProgress({ progress: 95, stage: "Rendering audio..." });

      source.start(0);
      const renderedBuffer = await offlineContext.startRendering();
      
      if (onProgress) onProgress({ progress: 100, stage: "Processing complete!" });
      
      toast.success("Lo-fi conversion complete!");
      return renderedBuffer;
      
    } catch (error) {
      console.error("Error processing audio:", error);
      toast.error("Failed to process audio");
      throw error;
    }
  }

  async exportAudio(buffer: AudioBuffer, options: ConversionOptions): Promise<Blob> {
    return AudioFormatConverter.convertAudioBuffer(buffer, options);
  }

  private createReverbImpulse(context: OfflineAudioContext, reverbAmount: number): AudioBuffer {
    const length = Math.floor(context.sampleRate * (0.5 + reverbAmount * 1.5));
    const impulse = context.createBuffer(2, length, context.sampleRate);
    
    for (let channel = 0; channel < 2; channel++) {
      const channelData = impulse.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        const decay = Math.pow(1 - (i / length), 2) * reverbAmount;
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
    
    const bitReduction = 1 + (amount / 100) * 8;
    const mix = Math.min(amount / 100, 0.8);
    
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      const step = Math.pow(2, bitReduction);
      let crushed = Math.round(x * step) / step;
      crushed = Math.tanh(crushed * 1.2) * 0.9;
      curve[i] = x * (1 - mix) + crushed * mix;
    }
    
    return curve;
  }

  dispose(): void {
    this.stopPreview();
    
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
    }
  }
}
