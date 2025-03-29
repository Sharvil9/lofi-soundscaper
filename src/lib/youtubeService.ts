
import { toast } from "sonner";
import { LofiSettings } from "@/components/LofiControls";

// YouTube audio extraction and lo-fi processing backend API URL
// Use localhost for development, otherwise use the deployed backend URL
const BACKEND_API_URL = import.meta.env.DEV 
  ? "http://localhost:3001/api" 
  : "https://your-backend-service.com/api";

interface YouTubeApiResponse {
  title: string;
  audioUrl: string;
  thumbnailUrl: string;
  originalFileId?: string; // Added to track original file
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
    
    // Get the thumbnail URL from the video ID - use high quality version
    const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
    
    // In development mode, use the fake audio service if not using real backend
    if (import.meta.env.DEV && !import.meta.env.VITE_USE_REAL_BACKEND) {
      console.log("Using simulated audio extraction");
      return simulateAudioExtraction(videoId, thumbnailUrl);
    }
    
    // Call the backend API to extract audio
    console.log(`Calling backend API: ${BACKEND_API_URL}/extract`);
    const response = await fetch(`${BACKEND_API_URL}/extract`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ youtubeUrl }),
    });
    
    // Check for network errors
    if (!response) {
      console.error("Network error: No response received");
      toast.error("Network error. Please check your connection.");
      throw new Error("Network error");
    }
    
    // Get the response even if it's an error, to see details
    const data = await response.json();
    
    if (!response.ok) {
      console.error("API Error:", data);
      toast.error(data.message || "Failed to extract audio");
      throw new Error(data.message || "Failed to extract audio");
    }
    
    console.log("Backend response:", data);
    
    // Verify we have all required fields
    if (!data.title || !data.audioUrl) {
      console.error("Invalid response from backend:", data);
      toast.error("Invalid response from server");
      throw new Error("Invalid response from server");
    }
    
    toast.success("Audio extracted successfully");
    
    return {
      title: data.title,
      audioUrl: data.audioUrl,
      thumbnailUrl: data.thumbnailUrl || thumbnailUrl,
      originalFileId: data.originalFileId
    };
  } catch (error) {
    console.error("Error fetching YouTube audio:", error);
    toast.error("Failed to extract audio from YouTube");
    throw error;
  }
};

// Upload local audio file
export const uploadAudioFile = async (file: File): Promise<YouTubeApiResponse> => {
  try {
    console.log("Uploading audio file:", file.name);
    
    // In development mode, use the fake audio service if not using real backend
    if (import.meta.env.DEV && !import.meta.env.VITE_USE_REAL_BACKEND) {
      console.log("Using simulated file upload");
      return simulateFileUpload(file);
    }
    
    // Create form data
    const formData = new FormData();
    formData.append('audioFile', file);
    
    // Call the backend API to upload file
    const response = await fetch(`${BACKEND_API_URL}/upload`, {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      toast.error(errorData.message || "Failed to upload audio file");
      throw new Error(errorData.message || "Failed to upload audio file");
    }
    
    const data = await response.json();
    toast.success("File uploaded successfully");
    
    return {
      title: data.title || file.name,
      audioUrl: data.audioUrl,
      thumbnailUrl: "/placeholder.svg",  // Default placeholder for uploaded files
      originalFileId: data.originalFileId
    };
  } catch (error) {
    console.error("Error uploading audio file:", error);
    toast.error("Failed to upload audio file");
    throw error;
  }
};

export const createLofiVersion = async (
  audioUrl: string, 
  settings: LofiSettings,
  autoDelete: boolean = true
): Promise<string> => {
  try {
    console.log("Creating lo-fi version with settings:", settings);
    console.log("Audio URL:", audioUrl);
    
    // In development mode, use the fake processing service if not using real backend
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
        settings,
        deleteOriginal: autoDelete
      }),
    });
    
    // Check for network errors
    if (!response) {
      console.error("Network error: No response received");
      toast.error("Network error. Please check your connection.");
      throw new Error("Network error");
    }
    
    // Get the response data
    const data = await response.json();
    
    if (!response.ok) {
      console.error("API Error:", data);
      toast.error(data.message || "Failed to process audio");
      throw new Error(data.message || "Failed to process audio");
    }
    
    console.log("Backend processing response:", data);
    
    // Check if original file was deleted
    if (data.originalDeleted) {
      console.log("Original audio file was automatically deleted");
    } else if (autoDelete) {
      // If auto-delete was requested but didn't happen, try using the cleanup endpoint
      const fileIdMatch = data.processedAudioUrl.match(/\/processed\/(.+)\.mp3/);
      if (fileIdMatch && fileIdMatch[1]) {
        const processedFileId = fileIdMatch[1];
        try {
          console.log("Requesting cleanup of original file");
          await fetch(`${BACKEND_API_URL}/cleanup`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              processedFileId
            }),
          });
        } catch (cleanupError) {
          console.error("Error during cleanup:", cleanupError);
          // Don't throw error here, just log it
        }
      }
    }
    
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
        thumbnailUrl,
        originalFileId: `sim-${Date.now()}`
      });
      
      toast.success("Audio extracted successfully");
    }, 2000);
  });
};

// Simulate file upload (for dev/test)
const simulateFileUpload = (file: File): Promise<YouTubeApiResponse> => {
  return new Promise((resolve) => {
    // Simulate API delay
    setTimeout(() => {
      // Create an object URL for the file (this will work in the browser)
      const audioUrl = URL.createObjectURL(file);
      
      resolve({
        title: file.name,
        audioUrl,
        thumbnailUrl: "/placeholder.svg", // placeholder image
        originalFileId: `upload-${Date.now()}`
      });
      
      toast.success("File uploaded successfully");
    }, 1000);
  });
};

const simulateLofiProcessing = (audioUrl: string, settings: LofiSettings): Promise<string> => {
  return new Promise((resolve) => {
    // Simulate processing time based on complexity of settings
    const processingTime = 3000 + Math.random() * 2000; // 3-5 seconds
    
    setTimeout(() => {
      toast.success("Lo-fi conversion complete");
      
      // If we're using an Object URL (local file), just return it
      if (audioUrl.startsWith('blob:')) {
        console.log("Using original local file as lo-fi version");
        resolve(audioUrl);
        return;
      }
      
      // For development/demo, return a different sample to distinguish from original
      const lofiSamples = [
        "https://cdn.freesound.org/previews/632/632724_13435817-lq.mp3", // Lo-fi beat
        "https://cdn.freesound.org/previews/631/631443_11861866-lq.mp3"  // Another lo-fi sample
      ];
      const randomSample = lofiSamples[Math.floor(Math.random() * lofiSamples.length)];
      console.log("Using simulated lo-fi audio:", randomSample);
      resolve(randomSample);
    }, processingTime);
  });
};
