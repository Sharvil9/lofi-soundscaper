
import { useState, useEffect, useCallback, useRef } from 'react';
import Header from '@/components/Header';
import YouTubeInput from '@/components/YouTubeInput';
import FileUpload from '@/components/FileUpload';
import LofiControls, { LofiSettings } from '@/components/LofiControls';
import AudioVisualizer from '@/components/AudioVisualizer';
import AudioPlayer from '@/components/AudioPlayer';
import ThumbnailDisplay from '@/components/ThumbnailDisplay';
import FeatureBanner from '@/components/FeatureBanner';
import { extractAudio, processToLofi, AudioSource, handleFileUpload } from '@/lib/audioService';
import { toast } from "sonner";

const Index = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [audioSource, setAudioSource] = useState<AudioSource | null>(null);
  const [lofiAudioUrl, setLofiAudioUrl] = useState<string | undefined>();
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeTab, setActiveTab] = useState<'link' | 'upload'>('link');
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const [lofiSettings, setLofiSettings] = useState<LofiSettings>({
    tempo: 85,
    reverb: 30,
    filter: 40,
    noise: 15,
    bitcrusher: 10,
  });
  
  const handleMediaSubmit = async (url: string) => {
    setIsLoading(true);
    setAudioSource(null);
    setLofiAudioUrl(undefined);
    setIsPlaying(false);
    
    try {
      // Extract the audio from the URL
      const source = await extractAudio(url);
      setAudioSource(source);
      
      // Immediately process to lo-fi with auto-delete of original
      setIsProcessing(true);
      const lofiUrl = await processToLofi(source, lofiSettings, true);
      setLofiAudioUrl(lofiUrl);
      
      // Auto-play the processed lo-fi version
      setTimeout(() => {
        setIsPlaying(true);
      }, 500); // Small delay to ensure player is ready
      
    } catch (error) {
      console.error("Error processing media:", error);
      toast.error("Failed to process media link");
    } finally {
      setIsLoading(false);
      setIsProcessing(false);
    }
  };
  
  const handleFileUpload = async (file: File) => {
    setIsLoading(true);
    setAudioSource(null);
    setLofiAudioUrl(undefined);
    setIsPlaying(false);
    
    try {
      // Process the uploaded file
      const source = await handleFileUpload(file);
      setAudioSource(source);
      
      // Immediately process to lo-fi
      setIsProcessing(true);
      const lofiUrl = await processToLofi(source, lofiSettings, true);
      setLofiAudioUrl(lofiUrl);
      
      // Auto-play the processed lo-fi version
      setTimeout(() => {
        setIsPlaying(true);
      }, 500);
      
    } catch (error) {
      console.error("Error processing uploaded file:", error);
      toast.error("Failed to process audio file");
    } finally {
      setIsLoading(false);
      setIsProcessing(false);
    }
  };
  
  const handleSettingsChange = useCallback((settings: LofiSettings) => {
    setLofiSettings(settings);
  }, []);
  
  const applyLofiSettings = async () => {
    if (!audioSource) return;
    
    setIsProcessing(true);
    setLofiAudioUrl(undefined);
    setIsPlaying(false);
    
    try {
      // Process with auto-delete of original
      const lofiUrl = await processToLofi(audioSource, lofiSettings, true);
      setLofiAudioUrl(lofiUrl);
      toast.success("Lo-fi settings applied");
      
      // Auto-play the newly processed lo-fi version
      setTimeout(() => {
        setIsPlaying(true);
      }, 500); // Small delay to ensure player is ready
      
    } catch (error) {
      console.error("Error applying lo-fi settings:", error);
      toast.error("Failed to apply lo-fi settings");
    } finally {
      setIsProcessing(false);
    }
  };
  
  // This effect ensures autoplay works when lofiAudioUrl changes
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-lofi-100 dark:from-background dark:to-lofi-900 transition-colors duration-500">
      <div className="max-w-4xl mx-auto px-4 pb-16">
        <Header />
        
        <main className="mt-8">
          <div className="mb-12 text-center animate-fade-in-up">
            <h1 className="text-4xl font-bold mb-3">Lofi Soundscaper</h1>
            <p className="text-lofi-600 dark:text-lofi-300 max-w-2xl mx-auto">
              Transform your favorite songs into relaxing lo-fi versions.
              Adjust the tempo, add vinyl crackle, apply filters, and create the perfect ambient sound.
            </p>
          </div>
          
          <div className="space-y-6">
            {/* Tab navigation for link/upload */}
            <div className="flex justify-center mb-4">
              <div className="flex rounded-lg bg-lofi-100 dark:bg-lofi-800 p-1 shadow-inner">
                <button 
                  onClick={() => setActiveTab('link')} 
                  className={`px-4 py-2 rounded-md ${activeTab === 'link' ? 'bg-accent text-white shadow' : 'text-lofi-600 dark:text-lofi-300'} transition-all`}
                >
                  YouTube Link
                </button>
                <button 
                  onClick={() => setActiveTab('upload')} 
                  className={`px-4 py-2 rounded-md ${activeTab === 'upload' ? 'bg-accent text-white shadow' : 'text-lofi-600 dark:text-lofi-300'} transition-all`}
                >
                  Upload File
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
                />
                
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
              <h2 className="text-xl font-medium mb-2">How it works</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6 text-lofi-600 dark:text-lofi-300">
                <div>
                  <div className="mb-2 text-lofi-800 dark:text-lofi-100 font-medium">1. {activeTab === 'link' ? 'Paste a YouTube link' : 'Upload an audio file'}</div>
                  <p className="text-sm">{activeTab === 'link' ? 'Enter any YouTube URL to extract the audio in high quality' : 'Select an audio file from your computer to process'}</p>
                </div>
                <div>
                  <div className="mb-2 text-lofi-800 dark:text-lofi-100 font-medium">2. Adjust lo-fi settings</div>
                  <p className="text-sm">Customize the tempo, reverb, filters, and background noise</p>
                </div>
                <div>
                  <div className="mb-2 text-lofi-800 dark:text-lofi-100 font-medium">3. Download your lo-fi track</div>
                  <p className="text-sm">Save the lo-fi version to your device and enjoy anytime</p>
                </div>
              </div>
            </div>
          )}
        </main>
        
        <footer className="mt-16 text-center text-sm text-lofi-500 dark:text-lofi-400">
          <p>Created with ♥ for lo-fi music enthusiasts</p>
        </footer>
      </div>
    </div>
  );
};

export default Index;
