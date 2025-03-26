
import { toast } from "sonner";
import { LofiSettings } from "@/components/LofiControls";

export interface AudioSource {
  title: string;
  audioUrl: string;
  thumbnailUrl: string;
  platform: "youtube" | "soundcloud" | "other";
}

// Detect the platform from the URL
export const detectPlatform = (url: string): "youtube" | "soundcloud" | "other" => {
  if (/youtube\.com\/watch|youtu\.be/.test(url)) {
    return "youtube";
  } else if (/soundcloud\.com/.test(url)) {
    return "soundcloud";
  } else {
    return "other";
  }
};

// Extract audio from various platforms
export const extractAudio = async (url: string): Promise<AudioSource> => {
  const platform = detectPlatform(url);
  
  try {
    switch (platform) {
      case "youtube":
        const ytResponse = await fetchYouTubeAudio(url);
        return {
          ...ytResponse,
          platform
        };
        
      case "soundcloud":
        // For demo, we're using a simulated response
        // In a real app, this would call a SoundCloud API
        toast.info("SoundCloud support is coming soon");
        return simulateSoundCloudExtraction(url);
        
      default:
        toast.error("Unsupported platform. Currently only YouTube is fully supported.");
        throw new Error("Unsupported platform");
    }
  } catch (error) {
    console.error("Error extracting audio:", error);
    throw error;
  }
};

// Process audio to lo-fi from any platform
export const processToLofi = async (
  audioSource: AudioSource,
  settings: LofiSettings
): Promise<string> => {
  try {
    // Log the processing attempt
    console.log(`Processing ${audioSource.platform} audio to lo-fi with settings:`, settings);
    
    // For now, we're using the same processing function for all platforms
    // In the future, this could be extended for platform-specific processing
    if (audioSource.platform === "youtube") {
      // Make sure we're getting a proper URL back from the processing
      const processedUrl = await createLofiVersion(audioSource.audioUrl, settings);
      console.log("Processed audio URL:", processedUrl);
      
      // Ensure the URL is valid
      if (!processedUrl || typeof processedUrl !== 'string') {
        console.error("Invalid processed URL received:", processedUrl);
        throw new Error("Invalid processed audio URL");
      }
      
      return processedUrl;
    } else {
      // For other platforms, use a simpler approach for now
      const processedUrl = await simulateLofiProcessing(audioSource.audioUrl, settings);
      console.log("Processed audio URL (simulated):", processedUrl);
      return processedUrl;
    }
  } catch (error) {
    console.error("Error processing to lo-fi:", error);
    throw error;
  }
};

// Simulated function for SoundCloud (for demo purposes)
const simulateSoundCloudExtraction = (url: string): Promise<AudioSource> => {
  return new Promise((resolve) => {
    // Simulate API delay
    setTimeout(() => {
      const trackId = url.split('/').pop() || 'unknown';
      
      resolve({
        title: `SoundCloud Track: ${trackId}`,
        audioUrl: "https://cdn.freesound.org/previews/612/612295_5674468-lq.mp3", // demo audio
        thumbnailUrl: "https://placekitten.com/500/500", // placeholder image
        platform: "soundcloud"
      });
      
      toast.success("SoundCloud track extracted (simulation)");
    }, 2000);
  });
};

// Helper functions for the audio service
// Import these from youtubeService.ts in a real implementation
import { fetchYouTubeAudio, createLofiVersion } from "./youtubeService";

// Additional helper function for simulating lo-fi processing
const simulateLofiProcessing = (audioUrl: string, settings: LofiSettings): Promise<string> => {
  return new Promise((resolve) => {
    // Simulate processing time based on complexity of settings
    const processingTime = 3000 + Math.random() * 2000; // 3-5 seconds
    
    setTimeout(() => {
      toast.success("Lo-fi conversion complete");
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
