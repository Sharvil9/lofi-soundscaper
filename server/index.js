
const express = require('express');
const cors = require('cors');
const ytdl = require('youtube-dl-exec');
const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
const processedDir = path.join(__dirname, 'processed');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

if (!fs.existsSync(processedDir)) {
  fs.mkdirSync(processedDir, { recursive: true });
}

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use('/processed', express.static(processedDir));

// Extract audio from YouTube URL
app.post('/api/extract', async (req, res) => {
  try {
    const { youtubeUrl } = req.body;
    
    if (!youtubeUrl) {
      return res.status(400).json({ message: 'YouTube URL is required' });
    }
    
    // Generate a unique ID for this extraction
    const fileId = uuidv4();
    const outputPath = path.join(uploadsDir, `${fileId}.mp3`);
    
    // Get video info
    const videoInfo = await ytdl.exec(youtubeUrl, {
      dumpSingleJson: true,
      noCheckCertificates: true,
      noWarnings: true,
      preferFreeFormats: true,
    });
    
    // Download audio only
    await ytdl.exec(youtubeUrl, {
      extractAudio: true,
      audioFormat: 'mp3',
      audioQuality: 0, // best
      output: outputPath,
      noCheckCertificates: true,
      noWarnings: true,
    });
    
    // Return the audio URL and metadata
    const audioUrl = `/uploads/${fileId}.mp3`;
    
    res.json({
      title: videoInfo.title,
      audioUrl: audioUrl,
    });
  } catch (error) {
    console.error('Error extracting audio:', error);
    res.status(500).json({ message: 'Failed to extract audio', error: error.message });
  }
});

// Process audio with lo-fi effects
app.post('/api/process', async (req, res) => {
  try {
    const { audioUrl, settings } = req.body;
    
    if (!audioUrl || !settings) {
      return res.status(400).json({ message: 'Audio URL and settings are required' });
    }
    
    // Extract file ID from URL
    const fileIdMatch = audioUrl.match(/\/uploads\/(.+)\.mp3/);
    if (!fileIdMatch) {
      return res.status(400).json({ message: 'Invalid audio URL' });
    }
    
    const fileId = fileIdMatch[1];
    const inputPath = path.join(uploadsDir, `${fileId}.mp3`);
    const outputId = uuidv4();
    const outputPath = path.join(processedDir, `${outputId}.mp3`);
    
    // Apply lo-fi effects using ffmpeg
    const command = ffmpeg(inputPath);
    
    // Apply tempo change (speed reduction)
    const tempoFactor = settings.tempo / 100;
    if (tempoFactor < 1) {
      command.audioFilters(`atempo=${tempoFactor}`);
    }
    
    // Apply low-pass filter based on filter setting
    if (settings.filter > 0) {
      const cutoffFrequency = 20000 - (settings.filter * 150);
      command.audioFilters(`lowpass=f=${cutoffFrequency}`);
    }
    
    // Add reverb if specified
    if (settings.reverb > 0) {
      const reverbAmount = settings.reverb / 100;
      command.audioFilters(`aecho=0.8:0.9:1000|1800:0.3|0.25`);
    }
    
    // Add noise/vinyl crackle effect
    if (settings.noise > 0) {
      // This would normally mix in a vinyl noise sample
      // For simplicity, we'll just add a small amount of white noise
      const noiseLevel = settings.noise / 500;
      command.audioFilters(`afftdn=nf=-20`);
    }
    
    // Add bitcrusher effect for that lo-fi sound
    if (settings.bitcrusher > 0) {
      // Reduce bit depth
      const bitDepth = 16 - Math.floor(settings.bitcrusher / 20) * 2;
      command.audioFilters(`aresample=8000,channelsplit,aresample=44100`);
    }
    
    // Execute the ffmpeg command
    command
      .output(outputPath)
      .on('end', () => {
        console.log('Processing finished');
        res.json({
          processedAudioUrl: `/processed/${outputId}.mp3`,
          message: 'Audio processed successfully'
        });
      })
      .on('error', (err) => {
        console.error('Error processing audio:', err);
        res.status(500).json({ message: 'Error processing audio', error: err.message });
      })
      .run();
  } catch (error) {
    console.error('Error processing audio:', error);
    res.status(500).json({ message: 'Failed to process audio', error: error.message });
  }
});

// Serve the uploads directory
app.use('/uploads', express.static(uploadsDir));

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
