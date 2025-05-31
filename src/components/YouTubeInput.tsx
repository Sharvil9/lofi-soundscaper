
import { useState } from 'react';
import { YoutubeIcon, XIcon, SearchIcon, MusicIcon, LinkIcon, AlertTriangle } from 'lucide-react';
import { toast } from "sonner";

interface YouTubeInputProps {
  onSubmit: (url: string) => void;
  isLoading: boolean;
}

const YouTubeInput = ({ onSubmit, isLoading }: YouTubeInputProps) => {
  const [url, setUrl] = useState('');
  const [showHumorousError, setShowHumorousError] = useState(false);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!url.trim()) {
      toast.error("Please enter a media URL");
      return;
    }
    
    // Show humorous error for any URL attempt
    setShowHumorousError(true);
    setTimeout(() => setShowHumorousError(false), 5000);
    
    const humorousMessages = [
      "🤖 Sorry, our AI hamsters are on strike and refuse to download from YouTube!",
      "💸 YouTube wants us to pay $99999/month for their API. We spent it on coffee instead.",
      "🚫 The internet police told us 'No more free music downloads!' We're law-abiding citizens.",
      "🎭 Plot twist: We're actually a file upload service in disguise!",
      "🐛 Our download feature went to buy cigarettes and never came back.",
      "🎪 This feature is as real as unicorns and my social life.",
      "💻 Error 418: I'm a teapot, not a YouTube downloader!"
    ];
    
    const randomMessage = humorousMessages[Math.floor(Math.random() * humorousMessages.length)];
    toast.error(randomMessage, { duration: 8000 });
  };
  
  const clearInput = () => {
    setUrl('');
    setShowHumorousError(false);
  };

  return (
    <div className="w-full max-w-2xl mx-auto animate-fade-in-up">
      <div className="mb-3 text-center">
        <p className="text-sm uppercase tracking-widest text-lofi-500 dark:text-lofi-400">
          Paste a link (but it won't work, just for show 😉)
        </p>
      </div>
      
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative group">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-lofi-400">
            <LinkIcon size={20} />
          </div>
          
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://youtube.com/watch?v=... (this won't work but try anyway!)"
            className="w-full h-14 pl-12 pr-24 rounded-xl border border-lofi-200 dark:border-lofi-700 bg-white dark:bg-lofi-900 focus:border-accent focus:ring-2 focus:ring-accent/20 shadow-sm transition-all duration-300 text-lofi-800 dark:text-lofi-100"
            disabled={isLoading}
          />
          
          {url && (
            <button
              type="button"
              onClick={clearInput}
              className="absolute right-20 top-1/2 -translate-y-1/2 text-lofi-400 hover:text-lofi-600 dark:hover:text-lofi-200 transition-colors"
              aria-label="Clear input"
            >
              <XIcon size={18} />
            </button>
          )}
          
          <button
            type="submit"
            disabled={isLoading || !url.trim()}
            className="absolute right-3 top-1/2 -translate-y-1/2 h-10 px-4 rounded-lg bg-accent text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:bg-accent-dark flex items-center space-x-1 shadow-sm group-hover:shadow"
          >
            {isLoading ? (
              <span className="flex items-center justify-center w-5 h-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <>
                <LinkIcon size={16} />
                <span>Try Anyway</span>
              </>
            )}
          </button>
        </div>
      </form>
      
      {showHumorousError && (
        <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg animate-fade-in-up">
          <div className="flex items-center space-x-2 text-red-700 dark:text-red-300">
            <AlertTriangle size={20} />
            <p className="font-medium">Feature Unavailable (As Expected!)</p>
          </div>
          <p className="text-sm text-red-600 dark:text-red-400 mt-1">
            This is a demo limitation. Please use the file upload feature instead - it actually works! 🎵
          </p>
        </div>
      )}
      
      <div className="mt-3 text-center">
        <p className="text-xs text-lofi-500 dark:text-lofi-400">
          Pro tip: Upload your own audio files instead! That actually works. 🎧
        </p>
      </div>
    </div>
  );
};

export default YouTubeInput;
