
import { toast } from "sonner";
import { LofiSettings } from "@/components/LofiControls";

// YouTube audio extraction and lo-fi processing backend API URL
// This would point to your deployed backend service
const BACKEND_API_URL = "https://your-backend-service.com/api";

interface YouTubeApiResponse {
  title: string;
  audioUrl: string;
  thumbnailUrl: string;
}

export const fetchYouTubeAudio = async (youtubeUrl: string): Promise<YouTubeApiResponse> => {
  try {
    console.log("Fetching audio for YouTube video:", youtubeUrl);
    
    // Check if it's a valid YouTube URL
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})(&.*)?$/;
    
    if (!youtubeRegex.test(youtubeUrl)) {
      toast.error("Invalid YouTube URL");
      throw new Error("Invalid YouTube URL");
    }
    
    // Extract video ID for thumbnail generation
    const videoIdMatch = youtubeUrl.match(/([a-zA-Z0-9_-]{11})/);
    const videoId = videoIdMatch ? videoIdMatch[0] : "";
    
    // Get the thumbnail URL from the video ID
    const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
    
    // In development mode, use the fake audio service
    if (import.meta.env.DEV && !import.meta.env.VITE_USE_REAL_BACKEND) {
      return simulateAudioExtraction(videoId, thumbnailUrl);
    }
    
    // Call the backend API to extract audio
    const response = await fetch(`${BACKEND_API_URL}/extract`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ youtubeUrl }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      toast.error(errorData.message || "Failed to extract audio");
      throw new Error(errorData.message || "Failed to extract audio");
    }
    
    const data = await response.json();
    toast.success("Audio extracted successfully");
    
    return {
      title: data.title,
      audioUrl: data.audioUrl,
      thumbnailUrl
    };
  } catch (error) {
    console.error("Error fetching YouTube audio:", error);
    toast.error("Failed to extract audio from YouTube");
    throw error;
  }
};

export const createLofiVersion = async (
  audioUrl: string, 
  settings: LofiSettings
): Promise<string> => {
  try {
    console.log("Creating lo-fi version with settings:", settings);
    
    // In development mode, use the fake processing service
    if (import.meta.env.DEV && !import.meta.env.VITE_USE_REAL_BACKEND) {
      return simulateLofiProcessing(audioUrl, settings);
    }
    
    // Call the backend API to process audio
    const response = await fetch(`${BACKEND_API_URL}/process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        audioUrl,
        settings
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      toast.error(errorData.message || "Failed to process audio");
      throw new Error(errorData.message || "Failed to process audio");
    }
    
    const data = await response.json();
    toast.success("Lo-fi conversion complete");
    
    // Return the URL to the processed audio
    return data.processedAudioUrl;
  } catch (error) {
    console.error("Error creating lo-fi version:", error);
    toast.error("Failed to create lo-fi version");
    throw error;
  }
};

// Simulated functions for development/testing
const simulateAudioExtraction = (videoId: string, thumbnailUrl: string): Promise<YouTubeApiResponse> => {
  return new Promise((resolve) => {
    // Simulate API delay
    setTimeout(() => {
      // Use a placeholder audio URL for demo purposes
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
        audioUrl,
        thumbnailUrl
      });
      
      toast.success("Audio extracted successfully");
    }, 2000);
  });
};

const simulateLofiProcessing = (audioUrl: string, settings: LofiSettings): Promise<string> => {
  return new Promise((resolve) => {
    // Simulate processing time based on complexity of settings
    const processingTime = 3000 + Math.random() * 2000; // 3-5 seconds
    
    setTimeout(() => {
      toast.success("Lo-fi conversion complete");
      resolve(audioUrl);
    }, processingTime);
  });
};
