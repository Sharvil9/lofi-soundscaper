
import { toast } from "sonner";
import { LofiSettings } from "@/components/LofiControls";
import { ClientAudioProcessor } from "./clientAudioProcessor";

export interface AudioSource {
  title: string;
  audioUrl: string;
  thumbnailUrl: string;
  platform: "youtube" | "soundcloud" | "other" | "local";
  originalFile?: File;
  audioBuffer?: AudioBuffer;
}

let audioProcessor: ClientAudioProcessor | null = null;

// Handle file uploads with real client-side processing
export const handleFileUpload = async (file: File): Promise<AudioSource> => {
  try {
    // Enhanced audio file validation
    const validTypes = [
      'audio/mpeg',        // MP3
      'audio/wav',         // WAV
      'audio/aac',         // AAC
      'audio/ogg',         // OGG/OPUS
      'audio/opus',        // OPUS
      'audio/x-m4a',       // M4A
      'audio/mp4',         // M4A (alternative MIME type)
      'audio/flac'         // FLAC
    ];
    
    const validExtensions = ['.mp3', '.wav', '.aac', '.ogg', '.opus', '.m4a', '.flac'];
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    
    const isValidType = validTypes.includes(file.type) || validExtensions.includes(fileExtension);
    
    if (!isValidType) {
      toast.error("Please upload a valid audio file (MP3, WAV, AAC, OGG, OPUS, M4A, FLAC)");
      throw new Error("Invalid file type");
    }
    
    console.log(`Processing uploaded file: ${file.name} (${file.type || 'type detected by extension'})`);
    
    // Initialize audio processor
    if (!audioProcessor) {
      audioProcessor = new ClientAudioProcessor();
    }
    
    // Load the audio file and get the buffer
    const audioBuffer = await audioProcessor.loadAudioFile(file);
    
    // Create a local URL for the original file
    const audioUrl = URL.createObjectURL(file);
    
    // For file uploads, use a default thumbnail
    const thumbnailUrl = "/placeholder.svg";
    
    // Return audio source object with the loaded buffer
    const audioSource: AudioSource = {
      title: file.name.replace(/\.[^/.]+$/, ""), // Remove file extension
      audioUrl,
      thumbnailUrl,
      platform: "local",
      originalFile: file,
      audioBuffer
    };
    
    toast.success(`Loaded: ${file.name}`);
    return audioSource;
  } catch (error) {
    console.error("Error loading file:", error);
    toast.error("Failed to load audio file");
    throw error;
  }
};

// Process audio to lo-fi using client-side processing
export const processToLofi = async (
  audioSource: AudioSource,
  settings: LofiSettings
): Promise<string> => {
  try {
    console.log("Processing audio to lo-fi with settings:", settings);
    
    if (!audioProcessor) {
      audioProcessor = new ClientAudioProcessor();
    }
    
    // If we have the original file, reload it for processing
    if (audioSource.originalFile) {
      await audioProcessor.loadAudioFile(audioSource.originalFile);
    } else {
      throw new Error("No original file available for processing");
    }
    
    // Process the audio with lo-fi settings
    const processedBlob = await audioProcessor.processToLofi(settings);
    
    // Create URL for the processed audio
    const processedUrl = URL.createObjectURL(processedBlob);
    
    console.log("Processed audio URL:", processedUrl);
    return processedUrl;
  } catch (error) {
    console.error("Error processing to lo-fi:", error);
    toast.error("Failed to process audio");
    throw error;
  }
};

// Dummy function for link extraction (shows humorous error)
export const extractAudio = async (url: string): Promise<AudioSource> => {
  // This will never actually work, but we'll show a humorous error
  throw new Error("Link extraction is not supported in this demo version");
};

// Detect platform (kept for compatibility)
export const detectPlatform = (url: string): "youtube" | "soundcloud" | "other" => {
  if (/youtube\.com\/watch|youtu\.be/.test(url)) {
    return "youtube";
  } else if (/soundcloud\.com/.test(url)) {
    return "soundcloud";
  } else {
    return "other";
  }
};

// Cleanup function
export const cleanupAudioProcessor = () => {
  if (audioProcessor) {
    audioProcessor.dispose();
    audioProcessor = null;
  }
};
