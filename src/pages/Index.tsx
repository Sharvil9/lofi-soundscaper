
import { useState, useEffect, useCallback } from 'react';
import Header from '@/components/Header';
import YouTubeInput from '@/components/YouTubeInput';
import LofiControls, { LofiSettings } from '@/components/LofiControls';
import AudioVisualizer from '@/components/AudioVisualizer';
import AudioPlayer from '@/components/AudioPlayer';
import { fetchYouTubeAudio, createLofiVersion } from '@/lib/youtubeService';
import { toast } from "sonner";

const Index = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [originalAudioUrl, setOriginalAudioUrl] = useState<string | undefined>();
  const [lofiAudioUrl, setLofiAudioUrl] = useState<string | undefined>();
  const [songTitle, setSongTitle] = useState<string | undefined>();
  const [thumbnailUrl, setThumbnailUrl] = useState<string | undefined>();
  const [isPlaying, setIsPlaying] = useState(false);
  const [lofiSettings, setLofiSettings] = useState<LofiSettings>({
    tempo: 85,
    reverb: 30,
    filter: 40,
    noise: 15,
    bitcrusher: 10,
  });
  
  const handleYouTubeSubmit = async (url: string) => {
    setIsLoading(true);
    setOriginalAudioUrl(undefined);
    setLofiAudioUrl(undefined);
    setSongTitle(undefined);
    setThumbnailUrl(undefined);
    
    try {
      const response = await fetchYouTubeAudio(url);
      
      setOriginalAudioUrl(response.audioUrl);
      setSongTitle(response.title);
      setThumbnailUrl(response.thumbnailUrl);
      
      // Process lo-fi version
      setIsProcessing(true);
      const lofiUrl = await createLofiVersion(response.audioUrl, lofiSettings);
      setLofiAudioUrl(lofiUrl);
    } catch (error) {
      console.error("Error fetching YouTube audio:", error);
      toast.error("Failed to process YouTube link");
    } finally {
      setIsLoading(false);
      setIsProcessing(false);
    }
  };
  
  const handleSettingsChange = useCallback((settings: LofiSettings) => {
    setLofiSettings(settings);
  }, []);
  
  const applyLofiSettings = async () => {
    if (!originalAudioUrl) return;
    
    setIsProcessing(true);
    setLofiAudioUrl(undefined);
    
    try {
      const lofiUrl = await createLofiVersion(originalAudioUrl, lofiSettings);
      setLofiAudioUrl(lofiUrl);
      toast.success("Lo-fi settings applied");
    } catch (error) {
      console.error("Error applying lo-fi settings:", error);
      toast.error("Failed to apply lo-fi settings");
    } finally {
      setIsProcessing(false);
    }
  };
  
  useEffect(() => {
    if (originalAudioUrl && !isProcessing) {
      applyLofiSettings();
    }
  }, [lofiSettings, originalAudioUrl]);

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
            <YouTubeInput 
              onSubmit={handleYouTubeSubmit}
              isLoading={isLoading}
            />
            
            {originalAudioUrl && (
              <>
                <LofiControls 
                  onChange={handleSettingsChange}
                  isProcessing={isProcessing}
                />
                
                <AudioVisualizer 
                  audioUrl={isPlaying ? (lofiAudioUrl || originalAudioUrl) : undefined}
                  isPlaying={isPlaying}
                />
                
                <AudioPlayer 
                  originalAudioUrl={originalAudioUrl}
                  lofiAudioUrl={lofiAudioUrl}
                  onTogglePlay={setIsPlaying}
                  isProcessing={isProcessing}
                  songTitle={songTitle}
                  thumbnailUrl={thumbnailUrl}
                />
              </>
            )}
          </div>
          
          {!originalAudioUrl && (
            <div className="mt-16 glass-panel p-8 text-center animate-fade-in-up delay-500">
              <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-accent/10 flex items-center justify-center">
                <div className="w-8 h-8 bg-accent rounded-full animate-pulse-subtle"></div>
              </div>
              <h2 className="text-xl font-medium mb-2">How it works</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6 text-lofi-600 dark:text-lofi-300">
                <div>
                  <div className="mb-2 text-lofi-800 dark:text-lofi-100 font-medium">1. Paste a YouTube link</div>
                  <p className="text-sm">Enter any YouTube URL to extract the audio in high quality</p>
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
