
# 🎵 Lofi Soundscaper

Transform any YouTube video into a chill lo-fi track with customizable audio effects!

![Lofi Soundscaper Screenshot](https://placehold.co/600x400?text=Lofi+Soundscaper)

## ✨ What is Lofi Soundscaper?

Lofi Soundscaper is a web application that lets you convert regular music from YouTube into relaxing lo-fi versions. It's perfect for creating study music, sleep sounds, or just chilling out with some mellow beats.

### Features

- 🎬 **YouTube Integration**: Paste any YouTube link to extract the audio
- 🎛️ **Customizable Effects**: Adjust tempo, reverb, filtering, vinyl noise, and bit crushing
- 🎧 **Real-time Preview**: Listen to your lo-fi creation before downloading
- 📱 **Responsive Design**: Works on desktop and mobile devices
- 🌙 **Dark Mode**: Easy on the eyes during late-night study sessions

## 🚀 How to Use

1. **Paste a YouTube URL** in the input box
2. **Wait** for the audio to extract (this may take a moment)
3. **Adjust the lo-fi settings** to your liking:
   - Tempo: Slows down the track for that classic lo-fi vibe
   - Reverb: Adds spaciousness and atmosphere
   - Filter: Applies low-pass filtering for warmth
   - Vinyl Noise: Adds crackling for authentic vintage sound
   - Bitcrusher: Creates that characteristic lo-fi resolution
4. **Choose from presets** or create your own custom sound
5. **Listen** to the processed audio with the built-in player
6. **Download** your lo-fi masterpiece when you're happy with it

## 🛠️ Technical Details

The application consists of two parts:

### Frontend
- Built with React, TypeScript, and Tailwind CSS
- Features a responsive design with dark mode support
- Uses Web Audio API for audio visualization

### Backend
- Node.js server using Express
- YouTube audio extraction with youtube-dl-exec
- Audio processing with FFmpeg for applying lo-fi effects
- RESTful API for communication between client and server

## 🔧 Development Setup

### Prerequisites
- Node.js (v16 or higher)
- FFmpeg installed on your system
- Python (for youtube-dl)

### Setup Instructions

1. Clone the repository
2. Install frontend dependencies:
   ```
   npm install
   ```
3. Start the frontend development server:
   ```
   npm run dev
   ```
4. Navigate to the server directory and install backend dependencies:
   ```
   cd server
   npm install
   ```
5. Start the backend server:
   ```
   npm start
   ```

## 💡 Project Inspiration

Lofi Soundscaper was created out of a love for lo-fi music and the desire to make it easy for anyone to create their own relaxing tracks from their favorite songs. The project combines audio processing techniques with a simple, intuitive interface to make lo-fi creation accessible to everyone.

## 📝 License

This project is open-source and available under the MIT License.

## 🙏 Acknowledgements

- Built with [React](https://reactjs.org/), [Tailwind CSS](https://tailwindcss.com/), and [shadcn/ui](https://ui.shadcn.com/)
- Audio processing powered by [FFmpeg](https://ffmpeg.org/)
- YouTube extraction via [youtube-dl-exec](https://github.com/microlinkhq/youtube-dl-exec)

---

Made with ♥ for lo-fi music enthusiasts everywhere
