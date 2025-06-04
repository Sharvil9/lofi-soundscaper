
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
  private previewNodes: AudioNode[] = [];

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
    if (!this.audioBuffer) return;

    // Stop any existing preview
    this.stopPreview();

    try {
      if (onProgress) onProgress({ progress: 10, stage: "Starting live preview..." });

      this.previewAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Create a short preview buffer (5 seconds)
      const previewDuration = Math.min(5, this.audioBuffer.duration);
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

      this.previewSource = this.previewAudioContext.createBufferSource();
      this.previewSource.buffer = previewBuffer;
      this.previewSource.loop = true;

      let currentNode: AudioNode = this.previewSource;

      // Apply BPM change (tempo only, no pitch change)
      if (settings.bpm !== 85) {
        const tempoRatio = settings.bpm / 85;
        this.previewSource.playbackRate.value = tempoRatio;
      }

      // Apply pitch shift separately (without affecting tempo)
      if (settings.pitchShift !== 0) {
        this.previewSource.detune.value = settings.pitchShift * 100;
      }

      // Apply effects
      currentNode = this.applyEffects(currentNode, settings, this.previewAudioContext);

      this.previewGain = this.previewAudioContext.createGain();
      this.previewGain.gain.value = 0.5;
      currentNode.connect(this.previewGain);
      this.previewGain.connect(this.previewAudioContext.destination);

      this.previewSource.start(0);
      this.isPreviewActive = true;

      if (onProgress) onProgress({ progress: 100, stage: "Live preview active!" });

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

    this.previewNodes.forEach(node => {
      try {
        node.disconnect();
      } catch (error) {
        // Node might already be disconnected
      }
    });
    this.previewNodes = [];

    if (this.previewAudioContext) {
      this.previewAudioContext.close();
      this.previewAudioContext = null;
    }

    this.isPreviewActive = false;
  }

  private applyEffects(inputNode: AudioNode, settings: LofiSettings, context: AudioContext): AudioNode {
    let currentNode = inputNode;

    // Low-pass filter for warmth
    if (settings.filter > 0) {
      const lowPassFilter = context.createBiquadFilter();
      lowPassFilter.type = 'lowpass';
      const filterIntensity = settings.filter / 100;
      lowPassFilter.frequency.value = Math.max(300, 8000 - (filterIntensity * 6000));
      lowPassFilter.Q.value = 1 + (filterIntensity * 8);
      currentNode.connect(lowPassFilter);
      currentNode = lowPassFilter;
      this.previewNodes.push(lowPassFilter);

      // Add high-pass for character
      const highPassFilter = context.createBiquadFilter();
      highPassFilter.type = 'highpass';
      highPassFilter.frequency.value = 80 + (filterIntensity * 200);
      highPassFilter.Q.value = 1.5;
      currentNode.connect(highPassFilter);
      currentNode = highPassFilter;
      this.previewNodes.push(highPassFilter);
    }

    // Reverb
    if (settings.reverb > 0) {
      const convolver = context.createConvolver();
      convolver.buffer = this.createReverbImpulse(context, settings.reverb / 100);
      
      const inputGain = context.createGain();
      const dryGain = context.createGain();
      const wetGain = context.createGain();
      const outputGain = context.createGain();
      
      const wetAmount = settings.reverb / 100;
      dryGain.gain.value = 1 - (wetAmount * 0.5);
      wetGain.gain.value = wetAmount * 0.6;
      
      currentNode.connect(inputGain);
      inputGain.connect(dryGain);
      inputGain.connect(convolver);
      convolver.connect(wetGain);
      
      dryGain.connect(outputGain);
      wetGain.connect(outputGain);
      currentNode = outputGain;
      
      this.previewNodes.push(convolver, inputGain, dryGain, wetGain, outputGain);
    }

    // Enhanced Lo-fi effect (vinyl crackle and warmth)
    if (settings.bitcrusher > 0) {
      const waveshaper = context.createWaveShaper();
      waveshaper.curve = this.createVinylCrackleEffect(settings.bitcrusher);
      waveshaper.oversample = '4x';
      currentNode.connect(waveshaper);
      currentNode = waveshaper;
      this.previewNodes.push(waveshaper);
      
      // Add some vintage warmth with a subtle compressor
      const compressor = context.createDynamicsCompressor();
      compressor.threshold.value = -18;
      compressor.knee.value = 4;
      compressor.ratio.value = 2;
      compressor.attack.value = 0.001;
      compressor.release.value = 0.05;
      currentNode.connect(compressor);
      currentNode = compressor;
      this.previewNodes.push(compressor);
    }

    return currentNode;
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
      
      if (onProgress) onProgress({ progress: 5, stage: "Initializing..." });

      // Calculate new length based on BPM change only
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
      
      // Apply tempo change
      source.playbackRate.value = tempoRatio;
      
      // Apply pitch shift separately (this won't affect tempo when using detune)
      if (settings.pitchShift !== 0) {
        source.detune.value = settings.pitchShift * 100;
      }

      let currentNode: AudioNode = source;

      if (onProgress) onProgress({ progress: 30, stage: "Applying filters..." });

      // Apply all effects
      currentNode = this.applyEffects(currentNode, settings, offlineContext);

      if (onProgress) onProgress({ progress: 80, stage: "Final processing..." });

      // Master compression for lo-fi character
      const masterCompressor = offlineContext.createDynamicsCompressor();
      masterCompressor.threshold.value = -20;
      masterCompressor.knee.value = 6;
      masterCompressor.ratio.value = 3;
      masterCompressor.attack.value = 0.001;
      masterCompressor.release.value = 0.1;
      currentNode.connect(masterCompressor);
      currentNode = masterCompressor;

      // Final output gain
      const masterGain = offlineContext.createGain();
      masterGain.gain.value = 0.8;
      currentNode.connect(masterGain);
      masterGain.connect(offlineContext.destination);

      if (onProgress) onProgress({ progress: 90, stage: "Rendering audio..." });

      source.start(0);
      const renderedBuffer = await offlineContext.startRendering();
      
      if (onProgress) onProgress({ progress: 100, stage: "Complete!" });
      
      toast.success("Lo-fi processing complete!");
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

  private createReverbImpulse(context: AudioContext, reverbAmount: number): AudioBuffer {
    const length = Math.floor(context.sampleRate * (1 + reverbAmount * 2));
    const impulse = context.createBuffer(2, length, context.sampleRate);
    
    for (let channel = 0; channel < 2; channel++) {
      const channelData = impulse.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        const t = i / context.sampleRate;
        const decay = Math.exp(-t * (2 - reverbAmount)) * reverbAmount;
        channelData[i] = (Math.random() * 2 - 1) * decay;
      }
    }
    
    return impulse;
  }

  private createVinylCrackleEffect(amount: number): Float32Array {
    const samples = 4096;
    const curve = new Float32Array(samples);
    
    const intensity = amount / 100;
    
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      
      // Add vinyl-style saturation and warmth
      let processed = Math.tanh(x * (1 + intensity * 2)) * 0.9;
      
      // Add subtle harmonic distortion for warmth
      processed += Math.sin(x * Math.PI) * intensity * 0.1;
      
      // Add some random crackle texture
      if (Math.random() < intensity * 0.02) {
        processed += (Math.random() * 2 - 1) * intensity * 0.05;
      }
      
      // Mix with original signal
      curve[i] = x * (1 - intensity * 0.7) + processed * intensity;
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
