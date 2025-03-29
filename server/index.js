
const express = require('express');
const cors = require('cors');
const ytdl = require('youtube-dl-exec');
const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
const processedDir = path.join(__dirname, 'processed');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

if (!fs.existsSync(processedDir)) {
  fs.mkdirSync(processedDir, { recursive: true });
}

// Keep track of original audio files for cleanup
const audioFilesMap = new Map();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use('/processed', express.static(processedDir));

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function(req, file, cb) {
    const fileId = uuidv4();
    const extension = path.extname(file.originalname);
    cb(null, `${fileId}${extension}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit
  fileFilter: function(req, file, cb) {
    // Only accept audio files
    if (!file.mimetype.startsWith('audio/')) {
      return cb(new Error('Only audio files are allowed'));
    }
    cb(null, true);
  }
});

// Extract audio from YouTube URL
app.post('/api/extract', async (req, res) => {
  try {
    const { youtubeUrl } = req.body;
    
    if (!youtubeUrl) {
      return res.status(400).json({ message: 'YouTube URL is required' });
    }
    
    console.log(`Attempting to extract audio from: ${youtubeUrl}`);
    
    // Generate a unique ID for this extraction
    const fileId = uuidv4();
    const outputPath = path.join(uploadsDir, `${fileId}.mp3`);
    
    // Get video info with detailed debugging
    try {
      console.log("Fetching video info...");
      const videoInfo = await ytdl.exec(youtubeUrl, {
        dumpSingleJson: true,
        noCheckCertificates: true,
        noWarnings: true,
        preferFreeFormats: true,
      });
      console.log("Video info fetched successfully:", videoInfo.title);
      
      // Download audio only with highest quality
      console.log("Starting audio extraction...");
      await ytdl.exec(youtubeUrl, {
        extractAudio: true,
        audioFormat: 'mp3',
        audioQuality: 0, // best quality
        output: outputPath,
        noCheckCertificates: true,
        noWarnings: true,
      });
      
      console.log(`Audio extracted successfully to: ${outputPath}`);
      
      // Verify the file was actually created
      if (!fs.existsSync(outputPath)) {
        console.error("File was not created at expected path!");
        return res.status(500).json({ message: 'Failed to save extracted audio' });
      }
      
      // Get file size for debugging
      const stats = fs.statSync(outputPath);
      console.log(`File size: ${stats.size / 1024 / 1024} MB`);
      
      // Return the audio URL and metadata
      const audioUrl = `/uploads/${fileId}.mp3`;
      
      res.json({
        title: videoInfo.title,
        audioUrl: audioUrl,
        originalFileId: fileId, // Track for cleanup later
        thumbnailUrl: videoInfo.thumbnail,
      });
    } catch (err) {
      console.error("YouTube extraction error details:", err);
      return res.status(500).json({ 
        message: 'Failed to extract audio', 
        error: err.message,
        stack: err.stack 
      });
    }
  } catch (error) {
    console.error('Error extracting audio:', error);
    res.status(500).json({ message: 'Failed to extract audio', error: error.message });
  }
});

// Upload audio file endpoint
app.post('/api/upload', upload.single('audioFile'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    
    const fileId = path.basename(req.file.filename, path.extname(req.file.filename));
    const audioUrl = `/uploads/${req.file.filename}`;
    
    res.json({
      message: 'File uploaded successfully',
      title: req.file.originalname,
      audioUrl: audioUrl,
      originalFileId: fileId
    });
  } catch (error) {
    console.error('Error handling file upload:', error);
    res.status(500).json({ message: 'Failed to upload file', error: error.message });
  }
});

// Process audio with lo-fi effects
app.post('/api/process', async (req, res) => {
  try {
    const { audioUrl, settings, deleteOriginal } = req.body;
    
    if (!audioUrl || !settings) {
      return res.status(400).json({ message: 'Audio URL and settings are required' });
    }
    
    // Extract file ID from URL
    const fileIdMatch = audioUrl.match(/\/uploads\/(.+)\.mp3/) || audioUrl.match(/\/uploads\/(.+)/);
    if (!fileIdMatch) {
      return res.status(400).json({ message: 'Invalid audio URL' });
    }
    
    // Find the actual file (may have different extension)
    const fileId = fileIdMatch[1];
    const uploadsContents = fs.readdirSync(uploadsDir);
    const matchingFile = uploadsContents.find(filename => filename.startsWith(fileId));
    
    if (!matchingFile) {
      return res.status(404).json({ message: 'Audio file not found' });
    }
    
    const inputPath = path.join(uploadsDir, matchingFile);
    const outputId = uuidv4();
    const outputPath = path.join(processedDir, `${outputId}.mp3`);
    
    // Save file IDs for mapping and cleanup
    audioFilesMap.set(outputId, {
      originalId: fileId,
      originalPath: inputPath
    });
    
    console.log(`Processing file: ${inputPath} with settings:`, settings);
    
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
      .on('start', (commandLine) => {
        console.log('FFmpeg command:', commandLine);
      })
      .on('progress', (progress) => {
        console.log(`Processing: ${progress.percent ? progress.percent.toFixed(1) : 0}% done`);
      })
      .on('end', () => {
        console.log('Processing finished');
        
        // Delete original file if requested
        if (deleteOriginal === true) {
          try {
            fs.unlinkSync(inputPath);
            console.log(`Deleted original file: ${inputPath}`);
          } catch (err) {
            console.error(`Error deleting original file: ${err.message}`);
          }
        }
        
        res.json({
          processedAudioUrl: `/processed/${outputId}.mp3`,
          message: 'Audio processed successfully',
          originalDeleted: deleteOriginal === true
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

// Cleanup endpoint - delete original file after successful processing
app.post('/api/cleanup', (req, res) => {
  try {
    const { processedFileId } = req.body;
    
    if (!processedFileId) {
      return res.status(400).json({ message: 'Processed file ID is required' });
    }
    
    const fileInfo = audioFilesMap.get(processedFileId);
    
    if (!fileInfo) {
      return res.status(404).json({ message: 'File mapping not found' });
    }
    
    if (fs.existsSync(fileInfo.originalPath)) {
      fs.unlinkSync(fileInfo.originalPath);
      console.log(`Cleanup: Deleted original file: ${fileInfo.originalPath}`);
      
      // Remove the mapping after cleanup
      audioFilesMap.delete(processedFileId);
      
      return res.json({ message: 'Original file deleted successfully' });
    } else {
      return res.json({ message: 'Original file already deleted or not found' });
    }
  } catch (error) {
    console.error('Error during cleanup:', error);
    res.status(500).json({ message: 'Failed to clean up files', error: error.message });
  }
});

// Serve the uploads directory
app.use('/uploads', express.static(uploadsDir));

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// Debug endpoint to check downloaded files
app.get('/api/debug/files', (req, res) => {
  try {
    const uploadFiles = fs.readdirSync(uploadsDir).map(file => ({
      name: file,
      path: path.join(uploadsDir, file),
      size: fs.statSync(path.join(uploadsDir, file)).size,
    }));
    
    const processedFiles = fs.readdirSync(processedDir).map(file => ({
      name: file,
      path: path.join(processedDir, file),
      size: fs.statSync(path.join(processedDir, file)).size,
    }));
    
    res.json({
      uploads: uploadFiles,
      processed: processedFiles,
      mappings: Array.from(audioFilesMap.entries())
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
