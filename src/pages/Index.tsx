import { useState, useEffect, useCallback, useRef } from 'react';
import Header from '@/components/Header';
import YouTubeInput from '@/components/YouTubeInput';
import FileUpload from '@/components/FileUpload';
import LofiControls, { LofiSettings } from '@/components/LofiControls';
import AudioVisualizer from '@/components/AudioVisualizer';
import AudioPlayer from '@/components/AudioPlayer';
import ThumbnailDisplay from '@/components/ThumbnailDisplay';
import FeatureBanner from '@/components/FeatureBanner';
import ProcessingProgress from '@/components/ProcessingProgress';
import { AudioSource, handleFileUpload as processFileUpload, cleanupAudioProcessor } from '@/lib/audioService';
import { ClientAudioProcessor, ProcessingProgress as ProcessingProgressType } from '@/lib/clientAudioProcessor';
import { AudioFormatConverter } from '@/lib/audioFormatConverter';
import { toast } from "sonner";

const Index = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState<ProcessingProgressType>({ progress: 0, stage: '' });
  const [audioSource, setAudioSource] = useState<AudioSource | null>(null);
  const [lofiAudioUrl, setLofiAudioUrl] = useState<string | undefined>();
  const [processedBuffer, setProcessedBuffer] = useState<AudioBuffer | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeTab, setActiveTab] = useState<'link' | 'upload'>('upload');
  const [isPreviewEnabled, setIsPreviewEnabled] = useState(false);
  const [exportFormat, setExportFormat] = useState<'wav' | 'mp3' | 'ogg' | 'flac'>('wav');
  
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const audioProcessorRef = useRef<ClientAudioProcessor | null>(null);
  
  const [lofiSettings, setLofiSettings] = useState<LofiSettings>({
    bpm: 85,
    reverb: 30,
    filter: 40,
    noise: 0,        // Disabled vinyl noise
    bitcrusher: 25,  // Better default
    pitchShift: -1,  // Slight pitch down for lo-fi feel
  });
  
  const handleMediaSubmit = async (url: string) => {
    // This will always show the humorous error now
    // The YouTubeInput component handles this
    console.log("Link submission attempted (but not supported):", url);
  };
  
  const handleFileUpload = async (file: File) => {
    setIsLoading(true);
    setAudioSource(null);
    setLofiAudioUrl(undefined);
    setProcessedBuffer(null);
    setIsPlaying(false);
    
    try {
      // Process the uploaded file
      const source = await processFileUpload(file);
      setAudioSource(source);
      
      // Initialize audio processor
      if (!audioProcessorRef.current) {
        audioProcessorRef.current = new ClientAudioProcessor();
      }
      
      await audioProcessorRef.current.loadAudioFile(file);
      
      toast.success("Audio file loaded! Adjust settings and click 'Process Audio' to create lo-fi version.");
      
    } catch (error) {
      console.error("Error processing uploaded file:", error);
      toast.error("Failed to load audio file");
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleSettingsChange = useCallback((settings: LofiSettings) => {
    setLofiSettings(settings);
    
    // Handle real-time preview
    if (isPreviewEnabled && audioProcessorRef.current && audioSource) {
      audioProcessorRef.current.stopPreview();
      audioProcessorRef.current.startPreview(settings).catch(console.error);
    }
  }, [isPreviewEnabled, audioSource]);

  const handlePreviewToggle = useCallback((enabled: boolean) => {
    setIsPreviewEnabled(enabled);
    
    if (enabled && audioProcessorRef.current && audioSource) {
      audioProcessorRef.current.startPreview(lofiSettings, setProcessingProgress)
        .then(() => toast.success("Real-time preview enabled!"))
        .catch(error => {
          console.error("Preview error:", error);
          toast.error("Failed to start preview");
          setIsPreviewEnabled(false);
        });
    } else if (audioProcessorRef.current) {
      audioProcessorRef.current.stopPreview();
      toast.info("Real-time preview disabled");
    }
  }, [audioSource, lofiSettings]);
  
  const applyLofiSettings = async () => {
    if (!audioSource || !audioProcessorRef.current) {
      toast.error("Please upload an audio file first");
      return;
    }
    
    setIsProcessing(true);
    setLofiAudioUrl(undefined);
    setProcessedBuffer(null);
    setIsPlaying(false);
    setProcessingProgress({ progress: 0, stage: 'Starting...' });
    
    try {
      // Process audio
      const processedAudioBuffer = await audioProcessorRef.current.processToLofi(
        lofiSettings, 
        setProcessingProgress
      );
      
      setProcessedBuffer(processedAudioBuffer);
      
      // Convert to blob for playback
      const wavBlob = AudioFormatConverter.audioBufferToWav(processedAudioBuffer);
      const url = URL.createObjectURL(wavBlob);
      setLofiAudioUrl(url);
      
      // Auto-play the newly processed lo-fi version
      setTimeout(() => {
        setIsPlaying(true);
      }, 500);
      
    } catch (error) {
      console.error("Error applying lo-fi settings:", error);
      toast.error("Failed to apply lo-fi settings");
    } finally {
      setIsProcessing(false);
      setProcessingProgress({ progress: 0, stage: '' });
    }
  };
  
  const downloadLofiAs = async (format: 'wav' | 'mp3' | 'ogg' | 'flac') => {
    if (!processedBuffer || !audioSource) {
      toast.error("No processed audio available");
      return;
    }

    try {
      const blob = await AudioFormatConverter.convertAudioBuffer(processedBuffer, { format });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `${audioSource.title}_lofi${AudioFormatConverter.getFormatExtension(format)}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success(`Downloaded as ${format.toUpperCase()}!`);
    } catch (error) {
      console.error("Export error:", error);
      toast.error(`Failed to export as ${format.toUpperCase()}`);
    }
  };
  
  // Cleanup audio processor on unmount
  useEffect(() => {
    return () => {
      if (audioProcessorRef.current) {
        audioProcessorRef.current.dispose();
      }
      cleanupAudioProcessor();
    };
  }, []);
  
  // Handle auto-play
  useEffect(() => {
    if (lofiAudioUrl && isPlaying && audioPlayerRef.current) {
      console.log("Auto-playing lo-fi version");
      const playPromise = audioPlayerRef.current.play();
      
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          console.error("Error auto-playing audio:", error);
          setIsPlaying(false);
        });
      }
    }
  }, [lofiAudioUrl, isPlaying]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement) return;
      
      switch (event.code) {
        case 'Space':
          event.preventDefault();
          if (audioPlayerRef.current) {
            if (isPlaying) {
              audioPlayerRef.current.pause();
              setIsPlaying(false);
            } else {
              audioPlayerRef.current.play();
              setIsPlaying(true);
            }
          }
          break;
        case 'KeyP':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            if (!isProcessing) {
              applyLofiSettings();
            }
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [isPlaying, isProcessing]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-lofi-100 dark:from-background dark:to-lofi-900 transition-colors duration-500">
      <div className="max-w-4xl mx-auto px-4 pb-16">
        <Header />
        
        <main className="mt-8">
          <div className="mb-12 text-center animate-fade-in-up">
            <h1 className="text-4xl font-bold mb-3 text-gray-900 dark:text-gray-100">Lofi Soundscaper</h1>
            <p className="text-lofi-600 dark:text-lofi-300 max-w-2xl mx-auto">
              Transform your audio files into relaxing lo-fi versions.
              Upload your music, adjust the settings, and create the perfect ambient sound.
            </p>
            <div className="mt-4 text-sm text-lofi-500 dark:text-lofi-400">
              💡 <strong>Keyboard shortcuts:</strong> Space = Play/Pause • Ctrl+P = Process Audio
            </div>
          </div>
          
          <div className="space-y-6">
            {/* Tab navigation for link/upload */}
            <div className="flex justify-center mb-4">
              <div className="flex rounded-lg bg-lofi-100 dark:bg-lofi-800 p-1 shadow-inner">
                <button 
                  onClick={() => setActiveTab('link')} 
                  className={`px-4 py-2 rounded-md ${activeTab === 'link' ? 'bg-accent text-white shadow' : 'text-lofi-600 dark:text-lofi-300'} transition-all relative`}
                >
                  Paste Link
                  <span className="absolute -top-1 -right-1 text-xs bg-red-500 text-white rounded-full px-1">😅</span>
                </button>
                <button 
                  onClick={() => setActiveTab('upload')} 
                  className={`px-4 py-2 rounded-md ${activeTab === 'upload' ? 'bg-accent text-white shadow' : 'text-lofi-600 dark:text-lofi-300'} transition-all relative`}
                >
                  Upload File
                  <span className="absolute -top-1 -right-1 text-xs bg-green-500 text-white rounded-full px-1">✓</span>
                </button>
              </div>
            </div>
            
            {activeTab === 'link' ? (
              <YouTubeInput 
                onSubmit={handleMediaSubmit}
                isLoading={isLoading}
              />
            ) : (
              <FileUpload 
                onUpload={handleFileUpload}
                isLoading={isLoading}
              />
            )}
            
            {audioSource && (
              <>
                <ThumbnailDisplay 
                  thumbnailUrl={audioSource.thumbnailUrl}
                  title={audioSource.title}
                  isProcessing={isProcessing}
                />
                
                <LofiControls 
                  onChange={handleSettingsChange}
                  isProcessing={isProcessing}
                  onProcess={applyLofiSettings}
                  onPreviewToggle={handlePreviewToggle}
                  isPreviewEnabled={isPreviewEnabled}
                />
                
                {/* Export Options */}
                {processedBuffer && (
                  <div className="glass-panel p-4 animate-fade-in-up">
                    <h4 className="text-md font-medium mb-3 text-gray-900 dark:text-gray-100">Export Options</h4>
                    <div className="flex flex-wrap gap-2">
                      {(['wav', 'mp3', 'ogg'] as const).map(format => (
                        <button
                          key={format}
                          onClick={() => downloadLofiAs(format)}
                          className="px-4 py-2 bg-lofi-200 dark:bg-lofi-800 hover:bg-lofi-300 dark:hover:bg-lofi-700 rounded-lg text-sm font-medium transition-all duration-200 uppercase"
                        >
                          Download {format}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                
                <FeatureBanner />
                
                <AudioVisualizer 
                  audioUrl={isPlaying ? (lofiAudioUrl || audioSource.audioUrl) : undefined}
                  isPlaying={isPlaying}
                />
                
                <AudioPlayer 
                  originalAudioUrl={audioSource.audioUrl}
                  lofiAudioUrl={lofiAudioUrl}
                  onTogglePlay={setIsPlaying}
                  isProcessing={isProcessing}
                  songTitle={audioSource.title}
                  thumbnailUrl={audioSource.thumbnailUrl}
                  isPlaying={isPlaying}
                  ref={audioPlayerRef}
                  autoPlayLofi={true}
                />
              </>
            )}
          </div>
          
          {!audioSource && (
            <div className="mt-16 glass-panel p-8 text-center animate-fade-in-up delay-500">
              <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-accent/10 flex items-center justify-center">
                <div className="w-8 h-8 bg-accent rounded-full animate-pulse-subtle"></div>
              </div>
              <h2 className="text-xl font-medium mb-2 text-gray-900 dark:text-gray-100">How it works</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6 text-lofi-600 dark:text-lofi-300">
                <div>
                  <div className="mb-2 text-lofi-800 dark:text-lofi-100 font-medium">1. Upload an audio file</div>
                  <p className="text-sm">Select any audio file from your computer (MP3, WAV, FLAC, etc.)</p>
                </div>
                <div>
                  <div className="mb-2 text-lofi-800 dark:text-lofi-100 font-medium">2. Adjust lo-fi settings</div>
                  <p className="text-sm">Customize the tempo, reverb, filters, and background noise</p>
                </div>
                <div>
                  <div className="mb-2 text-lofi-800 dark:text-lofi-100 font-medium">3. Download your lo-fi track</div>
                  <p className="text-sm">Process and save the lo-fi version to your device</p>
                </div>
              </div>
              
              <div className="mt-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  🎵 <strong>All processing happens on your device!</strong> No uploads to servers, complete privacy.
                </p>
              </div>
            </div>
          )}
        </main>
        
        <footer className="mt-16 text-center text-sm text-lofi-500 dark:text-lofi-400">
          <p>Created with ♥ for lo-fi music enthusiasts • Fully client-side processing</p>
        </footer>
      </div>
      
      <ProcessingProgress
        isVisible={isProcessing}
        progress={processingProgress.progress}
        stage={processingProgress.stage}
      />
    </div>
  );
};

export default Index;
