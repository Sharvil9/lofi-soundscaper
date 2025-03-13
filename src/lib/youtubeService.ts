
import { toast } from "sonner";

// This would use a backend service in a real application
// For demo purposes, we're simulating the API calls

interface YouTubeApiResponse {
  title: string;
  audioUrl: string;
}

export const fetchYouTubeAudio = async (youtubeUrl: string): Promise<YouTubeApiResponse> => {
  // This is a simulation function only
  // In a real app, this would call a backend API

  return new Promise((resolve, reject) => {
    // Check if it's a valid YouTube URL
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})(&.*)?$/;
    
    if (!youtubeRegex.test(youtubeUrl)) {
      toast.error("Invalid YouTube URL");
      reject(new Error("Invalid YouTube URL"));
      return;
    }
    
    // Extract video ID from URL
    const videoIdMatch = youtubeUrl.match(/([a-zA-Z0-9_-]{11})/);
    const videoId = videoIdMatch ? videoIdMatch[0] : "";
    
    console.log("Fetching audio for YouTube video:", videoId);
    
    // Simulate API delay
    setTimeout(() => {
      // Use a placeholder audio URL for demo purposes
      // In a real app, this would be generated from your backend service
      const audioSamples = [
        "https://cdn.freesound.org/previews/633/633687_14015493-lq.mp3", // Piano melody
        "https://cdn.freesound.org/previews/612/612295_5674468-lq.mp3",  // Acoustic guitar
        "https://cdn.freesound.org/previews/612/612092_13278513-lq.mp3", // Ambient melody
        "https://cdn.freesound.org/previews/608/608292_13612908-lq.mp3"  // Synth pad
      ];
      
      // Select a random audio sample for demonstration
      const randomIndex = Math.floor(Math.random() * audioSamples.length);
      const audioUrl = audioSamples[randomIndex];
      
      // Generate a fake title based on the video ID
      const titlePrefixes = ["Chill", "Mellow", "Dreamy", "Ambient", "Relaxing"];
      const randomPrefix = titlePrefixes[Math.floor(Math.random() * titlePrefixes.length)];
      const title = `${randomPrefix} Track ${videoId.substring(0, 4)}`;
      
      resolve({
        title,
        audioUrl
      });
      
      toast.success("Audio extracted successfully");
    }, 2000);
  });
};

export const createLofiVersion = async (
  audioUrl: string, 
  settings: {
    tempo: number;
    reverb: number;
    filter: number;
    noise: number;
    bitcrusher: number;
  }
): Promise<string> => {
  // This is a simulation function only
  // In a real app, this would call a backend API to process audio
  
  return new Promise((resolve, reject) => {
    console.log("Creating lo-fi version with settings:", settings);
    
    // Simulate processing time
    const processingTime = 3000 + Math.random() * 2000; // 3-5 seconds
    
    setTimeout(() => {
      // In a real app, this would return a new URL to the processed audio
      // For demonstration, we'll return the same URL
      toast.success("Lo-fi conversion complete");
      resolve(audioUrl);
    }, processingTime);
  });
};
