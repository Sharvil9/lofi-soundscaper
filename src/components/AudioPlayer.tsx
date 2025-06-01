import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Play, Pause, Download, RefreshCw, Sliders } from 'lucide-react';
import Equalizer from './Equalizer';

interface AudioPlayerProps {
  originalAudioUrl?: string;
  lofiAudioUrl?: string;
  onTogglePlay: (isPlaying: boolean) => void;
  isProcessing: boolean;
  songTitle?: string;
  thumbnailUrl?: string;
  isPlaying?: boolean;
  autoPlayLofi?: boolean;
}

const AudioPlayer = forwardRef<HTMLAudioElement | null, AudioPlayerProps>(({ 
  originalAudioUrl, 
  lofiAudioUrl, 
  onTogglePlay,
  isProcessing,
  songTitle,
  thumbnailUrl,
  isPlaying: externalIsPlaying,
  autoPlayLofi = false
}, ref) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlayingOriginal, setIsPlayingOriginal] = useState(false);
  const [audioLoading, setAudioLoading] = useState(false);
  const [showEqualizer, setShowEqualizer] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  // Forward the audio element ref to the parent component
  useImperativeHandle(ref, () => audioRef.current);
  
  // Debounce play/pause to prevent conflicts
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const debouncedTogglePlay = (shouldPlay: boolean) => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    
    debounceTimeoutRef.current = setTimeout(() => {
      if (shouldPlay !== isPlaying) {
        setIsPlaying(shouldPlay);
        onTogglePlay(shouldPlay);
      }
    }, 100);
  };
  
  // Handle external play state changes
  useEffect(() => {
    if (externalIsPlaying !== undefined && externalIsPlaying !== isPlaying) {
      setIsPlaying(externalIsPlaying);
    }
  }, [externalIsPlaying]);
  
  // Handle auto-play of lofi version when it becomes available
  useEffect(() => {
    if (autoPlayLofi && lofiAudioUrl && !isPlayingOriginal && !isProcessing) {
      setIsPlayingOriginal(false);
      setTimeout(() => {
        debouncedTogglePlay(true);
      }, 500);
    }
  }, [lofiAudioUrl, autoPlayLofi, isPlayingOriginal, isProcessing]);
  
  // Audio event handlers
  useEffect(() => {
    if (!audioRef.current) return;
    
    const audio = audioRef.current;
    
    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      setAudioLoading(false);
    };
    const handleLoadStart = () => setAudioLoading(true);
    const handleCanPlay = () => setAudioLoading(false);
    const handleEnded = () => {
      setIsPlaying(false);
      onTogglePlay(false);
      setCurrentTime(0);
    };
    const handleError = () => {
      setAudioLoading(false);
      setIsPlaying(false);
      onTogglePlay(false);
      console.error("Audio playback error");
    };
    
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('loadstart', handleLoadStart);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);
    
    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('loadstart', handleLoadStart);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
    };
  }, [onTogglePlay]);
  
  // Handle audio source changes
  useEffect(() => {
    if (!audioRef.current) return;
    
    const currentUrl = isPlayingOriginal ? originalAudioUrl : lofiAudioUrl;
    
    if (currentUrl && audioRef.current.src !== currentUrl) {
      console.log(`Loading ${isPlayingOriginal ? 'original' : 'lo-fi'} audio:`, currentUrl);
      
      setAudioLoading(true);
      setCurrentTime(0);
      
      audioRef.current.src = currentUrl;
      audioRef.current.load();
      
      // Play if we should be playing
      if (isPlaying) {
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch(error => {
            console.error("Error playing audio:", error);
            setIsPlaying(false);
            onTogglePlay(false);
            setAudioLoading(false);
          });
        }
      }
    }
  }, [isPlayingOriginal, originalAudioUrl, lofiAudioUrl, isPlaying, onTogglePlay]);
  
  const togglePlay = () => {
    if (!audioRef.current || audioLoading) return;
    
    if (isPlaying) {
      audioRef.current.pause();
      debouncedTogglePlay(false);
    } else {
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => debouncedTogglePlay(true))
          .catch(error => {
            console.error("Error playing audio:", error);
            debouncedTogglePlay(false);
          });
      }
    }
  };
  
  const seek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current) return;
    
    const newTime = parseFloat(e.target.value);
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };
  
  const formatTime = (seconds: number) => {
    if (!isFinite(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };
  
  const downloadLofi = () => {
    if (!lofiAudioUrl) return;
    
    const a = document.createElement('a');
    a.href = lofiAudioUrl;
    a.download = `${songTitle || 'track'}_lofi.wav`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);
  
  return (
    <div className="w-full glass-panel p-6 animate-fade-in-up delay-400">
      <audio ref={audioRef} preload="metadata" />
      
      <div className="flex flex-col md:flex-row gap-6">
        {/* Thumbnail display */}
        {thumbnailUrl && (
          <div className="w-full md:w-48 h-48 rounded-lg overflow-hidden shrink-0">
            <img 
              src={thumbnailUrl} 
              alt={songTitle || "Audio thumbnail"} 
              className="w-full h-full object-cover"
            />
          </div>
        )}
        
        <div className="flex-1 flex flex-col justify-between">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-medium truncate">
                {songTitle || 'Audio Track'}
              </h3>
              
              <div className="flex items-center mt-1">
                <button
                  onClick={() => setIsPlayingOriginal(true)}
                  className={`text-xs px-3 py-1 rounded-l-md ${
                    isPlayingOriginal 
                      ? 'bg-accent text-white' 
                      : 'bg-lofi-200 dark:bg-lofi-800 text-lofi-700 dark:text-lofi-300 hover:bg-lofi-300 dark:hover:bg-lofi-700'
                  }`}
                  disabled={!originalAudioUrl || isProcessing || audioLoading}
                >
                  Original
                </button>
                <button
                  onClick={() => setIsPlayingOriginal(false)}
                  className={`text-xs px-3 py-1 rounded-r-md ${
                    !isPlayingOriginal 
                      ? 'bg-accent text-white' 
                      : 'bg-lofi-200 dark:bg-lofi-800 text-lofi-700 dark:text-lofi-300 hover:bg-lofi-300 dark:hover:bg-lofi-700'
                  }`}
                  disabled={!lofiAudioUrl || isProcessing || audioLoading}
                >
                  Lo-fi {lofiAudioUrl ? '✓' : ''}
                </button>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={togglePlay}
                className="w-14 h-14 rounded-full flex items-center justify-center bg-accent text-white hover:bg-accent-dark disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow"
                disabled={(isPlayingOriginal ? !originalAudioUrl : !lofiAudioUrl) || isProcessing || audioLoading}
                aria-label={isPlaying ? "Pause" : "Play"}
              >
                {audioLoading ? (
                  <RefreshCw size={20} className="animate-spin" />
                ) : isPlaying ? (
                  <Pause size={24} />
                ) : (
                  <Play size={24} className="ml-1" />
                )}
              </button>
              
              {lofiAudioUrl && (
                <>
                  <button
                    onClick={() => setShowEqualizer(true)}
                    className="w-10 h-10 rounded-full flex items-center justify-center bg-purple-600 dark:bg-purple-700 text-white hover:bg-purple-700 dark:hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={isProcessing || audioLoading}
                    aria-label="Open Equalizer"
                  >
                    <Sliders size={16} />
                  </button>
                  
                  <button
                    onClick={downloadLofi}
                    className="w-10 h-10 rounded-full flex items-center justify-center bg-lofi-600 dark:bg-lofi-700 text-white hover:bg-lofi-700 dark:hover:bg-lofi-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={isProcessing || audioLoading}
                    aria-label="Download Lo-fi track"
                  >
                    <Download size={16} />
                  </button>
                </>
              )}
              
              {isProcessing && (
                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-lofi-200 dark:bg-lofi-800">
                  <RefreshCw size={16} className="animate-spin" />
                </div>
              )}
            </div>
          </div>
          
          <div className="mt-4">
            <div className="flex items-center space-x-2 mb-1">
              <span className="text-xs font-mono text-lofi-600 dark:text-lofi-400">
                {formatTime(currentTime)}
              </span>
              <div className="relative flex-1 h-2 bg-lofi-200 dark:bg-lofi-800 rounded-full overflow-hidden">
                <input
                  type="range"
                  min="0"
                  max={duration || 0}
                  value={currentTime}
                  onChange={seek}
                  disabled={!originalAudioUrl || isProcessing || audioLoading}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div 
                  className="absolute top-0 left-0 h-full bg-accent transition-all duration-200"
                  style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
                />
              </div>
              <span className="text-xs font-mono text-lofi-600 dark:text-lofi-400">
                {formatTime(duration)}
              </span>
            </div>
          </div>
        </div>
      </div>
      
      <Equalizer 
        isOpen={showEqualizer}
        onClose={() => setShowEqualizer(false)}
        audioElement={audioRef.current}
      />
    </div>
  );
});

AudioPlayer.displayName = "AudioPlayer";

export default AudioPlayer;
