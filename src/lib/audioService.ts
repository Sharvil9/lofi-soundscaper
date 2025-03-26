
import { toast } from "sonner";
import { LofiSettings } from "@/components/LofiControls";
import { fetchYouTubeAudio, createLofiVersion } from "./youtubeService";

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
  // For now, we're using the same processing function for all platforms
  // In the future, this could be extended for platform-specific processing
  return createLofiVersion(audioSource.audioUrl, settings);
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
