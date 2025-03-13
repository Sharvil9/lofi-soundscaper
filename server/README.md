
# Lofi Soundscaper Backend

This backend service handles YouTube audio extraction and lo-fi audio processing.

## Requirements

- Node.js (v16+)
- FFmpeg installed on your system
- python-3 (required for youtube-dl)

## Setup

1. Install FFmpeg:
   - MacOS: `brew install ffmpeg`
   - Ubuntu/Debian: `sudo apt install ffmpeg`
   - Windows: Download from [ffmpeg.org](https://ffmpeg.org/download.html) and add to PATH

2. Install dependencies:
   ```
   npm install
   ```

3. Start the server:
   ```
   npm start
   ```

The server will run on port 3001 by default. You can change this by setting the PORT environment variable.

## API Endpoints

### Extract Audio
- **URL**: `/api/extract`
- **Method**: POST
- **Body**: `{ "youtubeUrl": "https://youtube.com/watch?v=..." }`
- **Response**: `{ "title": "Video Title", "audioUrl": "/uploads/123.mp3" }`

### Process Audio
- **URL**: `/api/process`
- **Method**: POST
- **Body**: 
  ```json
  { 
    "audioUrl": "/uploads/123.mp3", 
    "settings": {
      "tempo": 85,
      "reverb": 30,
      "filter": 40,
      "noise": 15,
      "bitcrusher": 10
    }
  }
  ```
- **Response**: `{ "processedAudioUrl": "/processed/456.mp3" }`

## File Storage

Extracted audio files are stored in the `uploads` directory, and processed files are stored in the `processed` directory. These are served as static files.
