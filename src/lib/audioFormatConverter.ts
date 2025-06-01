
export interface ConversionOptions {
  format: 'wav' | 'mp3' | 'flac' | 'ogg';
  quality?: number; // 0-1 for lossy formats
  sampleRate?: number;
}

export class AudioFormatConverter {
  
  // Convert AudioBuffer to WAV
  static audioBufferToWav(buffer: AudioBuffer): Blob {
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

  // Convert AudioBuffer to different formats
  static async convertAudioBuffer(
    buffer: AudioBuffer, 
    options: ConversionOptions
  ): Promise<Blob> {
    switch (options.format) {
      case 'wav':
        return this.audioBufferToWav(buffer);
      
      case 'mp3':
        // For MP3, we'll use MediaRecorder if available, otherwise fall back to WAV
        return this.convertToMp3(buffer, options.quality || 0.9);
      
      case 'ogg':
        return this.convertToOgg(buffer, options.quality || 0.9);
      
      case 'flac':
        // FLAC conversion would require a more complex implementation
        // For now, return high-quality WAV as fallback
        return this.audioBufferToWav(buffer);
      
      default:
        return this.audioBufferToWav(buffer);
    }
  }

  private static async convertToMp3(buffer: AudioBuffer, quality: number): Promise<Blob> {
    try {
      // Create a MediaRecorder with MP3 encoding if supported
      const stream = new MediaStream();
      const audioContext = new AudioContext();
      const source = audioContext.createBufferSource();
      const destination = audioContext.createMediaStreamDestination();
      
      source.buffer = buffer;
      source.connect(destination);
      stream.addTrack(destination.stream.getAudioTracks()[0]);
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/mp3',
        audioBitsPerSecond: Math.floor(320000 * quality)
      });
      
      const chunks: Blob[] = [];
      
      return new Promise((resolve) => {
        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            chunks.push(event.data);
          }
        };
        
        mediaRecorder.onstop = () => {
          const blob = new Blob(chunks, { type: 'audio/mp3' });
          resolve(blob);
        };
        
        mediaRecorder.start();
        source.start();
        
        // Stop recording when audio ends
        setTimeout(() => {
          mediaRecorder.stop();
          source.stop();
          audioContext.close();
        }, (buffer.duration * 1000) + 100);
      });
      
    } catch (error) {
      console.warn("MP3 encoding not supported, falling back to WAV");
      return this.audioBufferToWav(buffer);
    }
  }

  private static async convertToOgg(buffer: AudioBuffer, quality: number): Promise<Blob> {
    try {
      // Similar approach for OGG
      const stream = new MediaStream();
      const audioContext = new AudioContext();
      const source = audioContext.createBufferSource();
      const destination = audioContext.createMediaStreamDestination();
      
      source.buffer = buffer;
      source.connect(destination);
      stream.addTrack(destination.stream.getAudioTracks()[0]);
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/ogg',
        audioBitsPerSecond: Math.floor(320000 * quality)
      });
      
      const chunks: Blob[] = [];
      
      return new Promise((resolve) => {
        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            chunks.push(event.data);
          }
        };
        
        mediaRecorder.onstop = () => {
          const blob = new Blob(chunks, { type: 'audio/ogg' });
          resolve(blob);
        };
        
        mediaRecorder.start();
        source.start();
        
        setTimeout(() => {
          mediaRecorder.stop();
          source.stop();
          audioContext.close();
        }, (buffer.duration * 1000) + 100);
      });
      
    } catch (error) {
      console.warn("OGG encoding not supported, falling back to WAV");
      return this.audioBufferToWav(buffer);
    }
  }

  static getFormatMimeType(format: string): string {
    switch (format) {
      case 'mp3': return 'audio/mpeg';
      case 'wav': return 'audio/wav';
      case 'ogg': return 'audio/ogg';
      case 'flac': return 'audio/flac';
      default: return 'audio/wav';
    }
  }

  static getFormatExtension(format: string): string {
    switch (format) {
      case 'mp3': return '.mp3';
      case 'wav': return '.wav';
      case 'ogg': return '.ogg';
      case 'flac': return '.flac';
      default: return '.wav';
    }
  }
}
