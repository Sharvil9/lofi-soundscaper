
import { toast } from "sonner";
import { LofiSettings } from "@/components/LofiControls";

// Interface for extracting YouTube video info
export interface YouTubeVideoInfo {
  title: string;
  audioUrl: string;
}

// Mock function to simulate audio processing since we can't actually process audio on the client side
export const processToLofi = async (
  audioUrl: string,
  settings: LofiSettings
): Promise<string> => {
  return new Promise((resolve, reject) => {
    console.log("Processing audio with settings:", settings);
    
    // In a real app, this would call a backend service to process the audio
    // For now, we'll simulate processing with a delay
    const processingTime = 3000 + Math.random() * 2000; // Random time between 3-5 seconds
    
    setTimeout(() => {
      // In a real implementation, this would return a URL to the processed audio
      // For demo purposes, we'll just return the original URL
      // (In reality you'd need a backend service to do the actual audio processing)
      resolve(audioUrl);
    }, processingTime);
  });
};

// Simulate extracting info from a YouTube URL
// In a real app, this would use a backend service due to CORS restrictions
export const extractYouTubeInfo = async (youtubeUrl: string): Promise<YouTubeVideoInfo> => {
  return new Promise((resolve, reject) => {
    try {
      // Extract video ID from URL
      const videoIdMatch = youtubeUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
      
      if (!videoIdMatch) {
        toast.error("Could not extract video ID from URL");
        reject(new Error("Invalid YouTube URL"));
        return;
      }
      
      const videoId = videoIdMatch[1];
      console.log("Extracted video ID:", videoId);
      
      // Simulate fetching video info with a delay
      setTimeout(() => {
        // For demo purposes, create a fake title based on the video ID
        const title = `YouTube Track ${videoId.substring(0, 6)}`;
        
        // In a real app, this would be a URL to the downloaded audio
        // For demo purposes, use a sample audio file
        const audioUrl = "https://cdn.freesound.org/previews/633/633687_14015493-lq.mp3";
        
        resolve({
          title,
          audioUrl
        });
      }, 1500);
    } catch (error) {
      console.error("Error extracting YouTube info:", error);
      reject(error);
    }
  });
};
