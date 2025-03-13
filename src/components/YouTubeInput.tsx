
import { useState } from 'react';
import { YoutubeIcon, XIcon, SearchIcon } from 'lucide-react';
import { toast } from "sonner";

interface YouTubeInputProps {
  onSubmit: (url: string) => void;
  isLoading: boolean;
}

const YouTubeInput = ({ onSubmit, isLoading }: YouTubeInputProps) => {
  const [url, setUrl] = useState('');
  
  const isValidYouTubeUrl = (url: string) => {
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})(&.*)?$/;
    return youtubeRegex.test(url);
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!url.trim()) {
      toast.error("Please enter a YouTube URL");
      return;
    }
    
    if (!isValidYouTubeUrl(url)) {
      toast.error("Please enter a valid YouTube URL");
      return;
    }
    
    onSubmit(url);
  };
  
  const clearInput = () => {
    setUrl('');
  };

  return (
    <div className="w-full max-w-2xl mx-auto animate-fade-in-up">
      <div className="mb-3 text-center">
        <p className="text-sm uppercase tracking-widest text-lofi-500 dark:text-lofi-400">Start by pasting a YouTube link</p>
      </div>
      
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative group">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-lofi-400">
            <YoutubeIcon size={20} />
          </div>
          
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://youtube.com/watch?v=..."
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
                <SearchIcon size={16} />
                <span>Search</span>
              </>
            )}
          </button>
        </div>
      </form>
      
      <div className="mt-3 text-center">
        <p className="text-xs text-lofi-500 dark:text-lofi-400">
          We'll download the audio and prepare it for lofi conversion
        </p>
      </div>
    </div>
  );
};

export default YouTubeInput;
