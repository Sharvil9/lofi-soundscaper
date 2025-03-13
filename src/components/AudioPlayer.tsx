
import { useState, useRef, useEffect } from 'react';
import { Play, Pause, Download, RefreshCw } from 'lucide-react';

interface AudioPlayerProps {
  originalAudioUrl?: string;
  lofiAudioUrl?: string;
  onTogglePlay: (isPlaying: boolean) => void;
  isProcessing: boolean;
  songTitle?: string;
  thumbnailUrl?: string;
}

const AudioPlayer = ({ 
  originalAudioUrl, 
  lofiAudioUrl, 
  onTogglePlay,
  isProcessing,
  songTitle,
  thumbnailUrl
}: AudioPlayerProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlayingOriginal, setIsPlayingOriginal] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  useEffect(() => {
    if (!audioRef.current) return;
    
    const handleTimeUpdate = () => {
      if (audioRef.current) {
        setCurrentTime(audioRef.current.currentTime);
      }
    };
    
    const handleLoadedMetadata = () => {
      if (audioRef.current) {
        setDuration(audioRef.current.duration);
      }
    };
    
    const handleEnded = () => {
      setIsPlaying(false);
      onTogglePlay(false);
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        setCurrentTime(0);
      }
    };
    
    audioRef.current.addEventListener('timeupdate', handleTimeUpdate);
    audioRef.current.addEventListener('loadedmetadata', handleLoadedMetadata);
    audioRef.current.addEventListener('ended', handleEnded);
    
    return () => {
      if (audioRef.current) {
        audioRef.current.removeEventListener('timeupdate', handleTimeUpdate);
        audioRef.current.removeEventListener('loadedmetadata', handleLoadedMetadata);
        audioRef.current.removeEventListener('ended', handleEnded);
      }
    };
  }, [onTogglePlay]);
  
  useEffect(() => {
    if (!audioRef.current) return;
    
    if (isPlayingOriginal) {
      audioRef.current.src = originalAudioUrl || '';
    } else {
      audioRef.current.src = lofiAudioUrl || '';
    }
    
    // If it was playing before switching, start playing again
    if (isPlaying) {
      audioRef.current.play();
    }
  }, [isPlayingOriginal, originalAudioUrl, lofiAudioUrl]);
  
  const togglePlay = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    
    setIsPlaying(!isPlaying);
    onTogglePlay(!isPlaying);
  };
  
  const seek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current) return;
    
    const newTime = parseFloat(e.target.value);
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };
  
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };
  
  const downloadLofi = () => {
    if (!lofiAudioUrl) return;
    
    const a = document.createElement('a');
    a.href = lofiAudioUrl;
    a.download = `${songTitle || 'track'}_lofi.mp3`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };
  
  return (
    <div className="w-full glass-panel p-6 animate-fade-in-up delay-400">
      <audio ref={audioRef} />
      
      <div className="flex flex-col md:flex-row gap-6">
        {/* Thumbnail display */}
        {thumbnailUrl && (
          <div className="w-full md:w-48 h-48 rounded-lg overflow-hidden shrink-0">
            <img 
              src={thumbnailUrl} 
              alt={songTitle || "YouTube thumbnail"} 
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
                  disabled={!originalAudioUrl || isProcessing}
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
                  disabled={!lofiAudioUrl || isProcessing}
                >
                  Lo-fi
                </button>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={togglePlay}
                className="w-14 h-14 rounded-full flex items-center justify-center bg-accent text-white hover:bg-accent-dark disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow"
                disabled={(isPlayingOriginal ? !originalAudioUrl : !lofiAudioUrl) || isProcessing}
                aria-label={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? <Pause size={24} /> : <Play size={24} className="ml-1" />}
              </button>
              
              {lofiAudioUrl && (
                <button
                  onClick={downloadLofi}
                  className="w-10 h-10 rounded-full flex items-center justify-center bg-lofi-600 dark:bg-lofi-700 text-white hover:bg-lofi-700 dark:hover:bg-lofi-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isProcessing}
                  aria-label="Download Lo-fi track"
                >
                  <Download size={16} />
                </button>
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
                  disabled={!originalAudioUrl || isProcessing}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div 
                  className="absolute top-0 left-0 h-full bg-accent"
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
    </div>
  );
};

export default AudioPlayer;
