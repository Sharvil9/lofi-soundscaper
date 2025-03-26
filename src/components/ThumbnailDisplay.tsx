
import { useState, useEffect } from 'react';
import { Music, Image as ImageIcon } from 'lucide-react';

interface ThumbnailDisplayProps {
  thumbnailUrl?: string;
  title?: string;
  isProcessing: boolean;
}

const ThumbnailDisplay = ({ thumbnailUrl, title, isProcessing }: ThumbnailDisplayProps) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    // Reset states when thumbnail changes
    if (thumbnailUrl) {
      setImageLoaded(false);
      setImageError(false);
    }
  }, [thumbnailUrl]);

  if (!thumbnailUrl) return null;

  return (
    <div className="relative w-full max-w-md mx-auto mb-8 animate-fade-in-up">
      <div className="aspect-video overflow-hidden rounded-xl group shadow-lg relative">
        {/* Processing overlay */}
        {isProcessing && (
          <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center z-10 text-white">
            <div className="h-12 w-12 rounded-full border-4 border-t-transparent border-accent animate-spin mb-2"></div>
            <span className="text-sm font-medium">Processing audio...</span>
          </div>
        )}
        
        {/* Thumbnail image with fallback */}
        {!imageError ? (
          <img
            src={thumbnailUrl}
            alt={title || "Video thumbnail"}
            className={`w-full h-full object-cover transition-all duration-500 group-hover:scale-105 ${
              imageLoaded ? 'opacity-100' : 'opacity-0'
            } ${isProcessing ? 'blur-sm' : ''}`}
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full bg-lofi-800 flex items-center justify-center">
            <ImageIcon size={48} className="text-lofi-300" />
          </div>
        )}
        
        {/* Decorative vinyl-like circle */}
        <div className="absolute bottom-4 right-4 w-16 h-16 rounded-full bg-black shadow-lg flex items-center justify-center">
          <div className="w-6 h-6 rounded-full bg-accent"></div>
          <div className="absolute inset-0 rounded-full border-2 border-white/20 animate-spin-slow"></div>
        </div>
        
        {/* Title overlay */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 text-white">
          <div className="flex items-center">
            <Music size={16} className="mr-2 text-accent" />
            <h3 className="font-medium truncate">{title || "Unknown track"}</h3>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ThumbnailDisplay;
