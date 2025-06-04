
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

      this.previewAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      if (onProgress) onProgress({ progress: 30, stage: "Setting up audio effects..." });

      const previewDuration = Math.min(10, this.audioBuffer.duration);
      const previewLength = Math.floor(previewDuration * this.audioBuffer.sampleRate);
      
      const previewBuffer = this.previewAudioContext.createBuffer(
        this.audioBuffer.numberOfChannels,
        previewLength,
        this.audioBuffer.sampleRate
      );

      for (let channel = 0; channel < this.audioBuffer.numberOfChannels; channel++) {
        const originalData = this.audioBuffer.getChannelData(channel);
        const previewData = previewBuffer.getChannelData(channel);
        for (let i = 0; i < previewLength; i++) {
          previewData[i] = originalData[i];
        }
      }

      if (onProgress) onProgress({ progress: 60, stage: "Applying lo-fi effects..." });

      this.previewSource = this.previewAudioContext.createBufferSource();
      this.previewSource.buffer = previewBuffer;

      let currentNode: AudioNode = this.previewSource;

      // Enhanced BPM change with proper time stretching simulation
      if (settings.bpm !== 85) {
        const tempoRatio = settings.bpm / 85;
        const playbackRate = Math.max(0.5, Math.min(2.0, tempoRatio));
        this.previewSource.playbackRate.value = playbackRate;
      }

      // Pitch shift
      if (settings.pitchShift !== 0) {
        this.previewSource.detune.value = settings.pitchShift * 100;
      }

      // Enhanced aggressive low-pass filter
      const lowPassFilter = this.previewAudioContext.createBiquadFilter();
      lowPassFilter.type = 'lowpass';
      const filterIntensity = settings.filter / 100;
      lowPassFilter.frequency.value = Math.max(300, 8000 - (filterIntensity * 6000));
      lowPassFilter.Q.value = 1 + (filterIntensity * 8);
      currentNode.connect(lowPassFilter);
      currentNode = lowPassFilter;

      // High-pass filter for lo-fi character
      const highPassFilter = this.previewAudioContext.createBiquadFilter();
      highPassFilter.type = 'highpass';
      highPassFilter.frequency.value = 80 + (filterIntensity * 200);
      highPassFilter.Q.value = 1.5;
      currentNode.connect(highPassFilter);
      currentNode = highPassFilter;

      // Enhanced reverb with multiple delays
      if (settings.reverb > 0) {
        const reverbAmount = settings.reverb / 100;
        const delay1 = this.previewAudioContext.createDelay(2);
        const delay2 = this.previewAudioContext.createDelay(2);
        const delay3 = this.previewAudioContext.createDelay(2);
        const feedback = this.previewAudioContext.createGain();
        const wetGain = this.previewAudioContext.createGain();
        const dryGain = this.previewAudioContext.createGain();
        const output = this.previewAudioContext.createGain();

        delay1.delayTime.value = 0.1 + (reverbAmount * 0.3);
        delay2.delayTime.value = 0.15 + (reverbAmount * 0.4);
        delay3.delayTime.value = 0.2 + (reverbAmount * 0.5);
        feedback.gain.value = Math.min(0.8, reverbAmount * 0.9);
        wetGain.gain.value = reverbAmount * 0.6;
        dryGain.gain.value = 1 - (reverbAmount * 0.4);

        currentNode.connect(dryGain);
        currentNode.connect(delay1);
        delay1.connect(delay2);
        delay2.connect(delay3);
        delay3.connect(feedback);
        feedback.connect(delay1);
        delay3.connect(wetGain);

        dryGain.connect(output);
        wetGain.connect(output);
        currentNode = output;
      }

      // Enhanced bit crusher with better algorithm
      if (settings.bitcrusher > 0) {
        const waveshaper = this.previewAudioContext.createWaveShaper();
        const mix = settings.bitcrusher / 100;
        const samples = 2048;
        const curve = new Float32Array(samples);
        
        for (let i = 0; i < samples; i++) {
          const x = (i * 2) / samples - 1;
          const bitDepth = Math.max(2, 12 - (mix * 8));
          const step = Math.pow(2, bitDepth);
          let crushed = Math.round(x * step) / step;
          
          // Add saturation and warmth
          crushed = Math.tanh(crushed * (1 + mix * 2)) * 0.8;
          
          // Mix with original
          curve[i] = x * (1 - mix * 0.8) + crushed * mix;
        }
        
        waveshaper.curve = curve;
        waveshaper.oversample = '4x';
        currentNode.connect(waveshaper);
        currentNode = waveshaper;
      }

      if (onProgress) onProgress({ progress: 90, stage: "Starting preview..." });

      this.previewGain = this.previewAudioContext.createGain();
      this.previewGain.gain.value = 0.7;
      currentNode.connect(this.previewGain);
      this.previewGain.connect(this.previewAudioContext.destination);

      this.previewSource.start(0);
      this.isPreviewActive = true;

      if (onProgress) onProgress({ progress: 100, stage: "Preview started!" });

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
      console.log("Processing audio with enhanced settings:", settings);
      
      if (onProgress) onProgress({ progress: 5, stage: "Initializing audio processing..." });

      // Create buffer with tempo change
      const tempoRatio = settings.bpm / 85;
      const newLength = Math.floor(this.audioBuffer.length / tempoRatio);
      const newSampleRate = this.audioBuffer.sampleRate;

      const offlineContext = new OfflineAudioContext(
        this.audioBuffer.numberOfChannels,
        newLength,
        newSampleRate
      );

      if (onProgress) onProgress({ progress: 15, stage: "Creating audio source..." });

      const source = offlineContext.createBufferSource();
      source.buffer = this.audioBuffer;
      source.playbackRate.value = tempoRatio;

      // Pitch shift
      if (settings.pitchShift !== 0) {
        source.detune.value = settings.pitchShift * 100;
      }

      let currentNode: AudioNode = source;

      if (onProgress) onProgress({ progress: 30, stage: "Applying aggressive filters..." });

      // Much more aggressive low-pass filter
      const lowPassFilter = offlineContext.createBiquadFilter();
      lowPassFilter.type = 'lowpass';
      const filterIntensity = settings.filter / 100;
      lowPassFilter.frequency.value = Math.max(200, 6000 - (filterIntensity * 4500));
      lowPassFilter.Q.value = 2 + (filterIntensity * 12);
      currentNode.connect(lowPassFilter);
      currentNode = lowPassFilter;

      // High-pass for character
      const highPassFilter = offlineContext.createBiquadFilter();
      highPassFilter.type = 'highpass';
      highPassFilter.frequency.value = 100 + (filterIntensity * 300);
      highPassFilter.Q.value = 2;
      currentNode.connect(highPassFilter);
      currentNode = highPassFilter;

      if (onProgress) onProgress({ progress: 50, stage: "Creating lush reverb..." });

      // Enhanced Reverb with convolver
      if (settings.reverb > 0) {
        const convolver = offlineContext.createConvolver();
        convolver.buffer = this.createEnhancedReverbImpulse(offlineContext, settings.reverb / 100);
        
        const inputGain = offlineContext.createGain();
        const dryGain = offlineContext.createGain();
        const wetGain = offlineContext.createGain();
        const outputGain = offlineContext.createGain();
        
        const wetAmount = settings.reverb / 100;
        dryGain.gain.value = 1 - (wetAmount * 0.5);
        wetGain.gain.value = wetAmount * 0.8;
        
        currentNode.connect(inputGain);
        inputGain.connect(dryGain);
        inputGain.connect(convolver);
        convolver.connect(wetGain);
        
        dryGain.connect(outputGain);
        wetGain.connect(outputGain);
        currentNode = outputGain;
      }

      if (onProgress) onProgress({ progress: 70, stage: "Applying vintage bit crushing..." });

      // Much more aggressive bit crusher
      if (settings.bitcrusher > 0) {
        const waveshaper = offlineContext.createWaveShaper();
        waveshaper.curve = this.createEnhancedLofiCrushCurve(settings.bitcrusher);
        waveshaper.oversample = '4x';
        currentNode.connect(waveshaper);
        currentNode = waveshaper;
      }

      if (onProgress) onProgress({ progress: 85, stage: "Applying vintage compression..." });

      // Heavier compression for lo-fi character
      const compressor = offlineContext.createDynamicsCompressor();
      compressor.threshold.value = -24;
      compressor.knee.value = 8;
      compressor.ratio.value = 4;
      compressor.attack.value = 0.001;
      compressor.release.value = 0.1;
      currentNode.connect(compressor);
      currentNode = compressor;

      // Master gain with gentle saturation
      const masterGain = offlineContext.createGain();
      masterGain.gain.value = 0.85;
      currentNode.connect(masterGain);
      masterGain.connect(offlineContext.destination);

      if (onProgress) onProgress({ progress: 95, stage: "Rendering enhanced audio..." });

      source.start(0);
      const renderedBuffer = await offlineContext.startRendering();
      
      if (onProgress) onProgress({ progress: 100, stage: "Lo-fi processing complete!" });
      
      toast.success("Enhanced lo-fi conversion complete!");
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

  private createEnhancedReverbImpulse(context: OfflineAudioContext, reverbAmount: number): AudioBuffer {
    const length = Math.floor(context.sampleRate * (1 + reverbAmount * 3));
    const impulse = context.createBuffer(2, length, context.sampleRate);
    
    for (let channel = 0; channel < 2; channel++) {
      const channelData = impulse.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        const t = i / context.sampleRate;
        const decay = Math.exp(-t * (2 - reverbAmount)) * reverbAmount;
        
        // Multiple reflection pattern
        const early = (Math.random() * 2 - 1) * Math.exp(-t * 20) * 0.8;
        const late = (Math.random() * 2 - 1) * Math.exp(-t * 3) * 0.6;
        const diffuse = (Math.random() * 2 - 1) * Math.exp(-t * 1) * 0.4;
        
        channelData[i] = (early + late + diffuse) * decay;
      }
    }
    
    return impulse;
  }

  private createEnhancedLofiCrushCurve(amount: number): Float32Array {
    const samples = 8192;
    const curve = new Float32Array(samples);
    
    const bitReduction = 2 + (amount / 100) * 10;
    const mix = Math.min(amount / 100, 0.9);
    
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      const step = Math.pow(2, bitReduction);
      let crushed = Math.round(x * step) / step;
      
      // Add multiple stages of saturation
      crushed = Math.tanh(crushed * (1 + mix * 3)) * 0.8;
      crushed = Math.sign(crushed) * Math.pow(Math.abs(crushed), 0.7 + mix * 0.3);
      
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
