
import { useRef, useEffect } from 'react';

interface AudioVisualizerProps {
  audioUrl?: string;
  isPlaying: boolean;
}

const AudioVisualizer = ({ audioUrl, isPlaying }: AudioVisualizerProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | MediaElementAudioSourceNode | null>(null);
  const animationRef = useRef<number | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!audioUrl) return;
    
    // Create audio context if it doesn't exist
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
    }
    
    // Create and connect audio element if we have a URL
    if (audioUrl && !audioElementRef.current) {
      audioElementRef.current = new Audio(audioUrl);
      audioElementRef.current.crossOrigin = 'anonymous';
      
      audioElementRef.current.addEventListener('canplaythrough', () => {
        if (audioContextRef.current && analyserRef.current && audioElementRef.current) {
          sourceRef.current = audioContextRef.current.createMediaElementSource(audioElementRef.current);
          sourceRef.current.connect(analyserRef.current);
          analyserRef.current.connect(audioContextRef.current.destination);
        }
      });
    }
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      
      if (audioElementRef.current) {
        audioElementRef.current.pause();
        audioElementRef.current.src = '';
      }
      
      if (sourceRef.current) {
        sourceRef.current.disconnect();
      }
      
      if (analyserRef.current) {
        analyserRef.current.disconnect();
      }
      
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
    };
  }, [audioUrl]);
  
  useEffect(() => {
    if (!audioElementRef.current || !analyserRef.current || !canvasRef.current) return;
    
    if (isPlaying) {
      audioElementRef.current.play();
      startVisualization();
    } else {
      audioElementRef.current.pause();
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    }
    
    function startVisualization() {
      if (!canvasRef.current || !analyserRef.current) return;
      
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      const analyser = analyserRef.current;
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      canvas.width = canvas.clientWidth * window.devicePixelRatio;
      canvas.height = canvas.clientHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      
      function renderFrame() {
        if (!ctx || !analyser) return;
        
        animationRef.current = requestAnimationFrame(renderFrame);
        analyser.getByteFrequencyData(dataArray);
        
        const width = canvas.width / window.devicePixelRatio;
        const height = canvas.height / window.devicePixelRatio;
        
        ctx.clearRect(0, 0, width, height);
        
        // Draw visualization
        const barWidth = (width / bufferLength) * 2.5;
        let x = 0;
        
        for (let i = 0; i < bufferLength; i++) {
          const barHeight = dataArray[i] / 255 * height * 0.8;
          
          // Use gradient colors
          const gradient = ctx.createLinearGradient(0, height - barHeight, 0, height);
          
          if (dataArray[i] > 210) {
            gradient.addColorStop(0, 'rgba(125, 211, 252, 0.8)');  // accent color
            gradient.addColorStop(1, 'rgba(125, 211, 252, 0.4)');
          } else if (dataArray[i] > 120) {
            gradient.addColorStop(0, 'rgba(125, 211, 252, 0.6)');
            gradient.addColorStop(1, 'rgba(125, 211, 252, 0.3)');
          } else {
            gradient.addColorStop(0, 'rgba(125, 211, 252, 0.4)');
            gradient.addColorStop(1, 'rgba(125, 211, 252, 0.1)');
          }
          
          ctx.fillStyle = gradient;
          
          // Round the top of the bars
          ctx.beginPath();
          ctx.moveTo(x, height);
          ctx.lineTo(x, height - barHeight + 2);
          ctx.quadraticCurveTo(x, height - barHeight, x + 2, height - barHeight);
          ctx.lineTo(x + barWidth - 2, height - barHeight);
          ctx.quadraticCurveTo(x + barWidth, height - barHeight, x + barWidth, height - barHeight + 2);
          ctx.lineTo(x + barWidth, height);
          ctx.closePath();
          ctx.fill();
          
          x += barWidth + 1;
        }
      }
      
      renderFrame();
    }
  }, [isPlaying, audioUrl]);
  
  return (
    <div className="w-full h-36 glass-panel overflow-hidden animate-fade-in-up delay-300">
      {!audioUrl ? (
        <div className="w-full h-full flex items-center justify-center">
          <div className="flex space-x-1">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
              <div
                key={i}
                className="waveform-bar h-4"
                style={{
                  animationDelay: `${i * 0.1}s`,
                  opacity: 0.3,
                  height: '20%'
                }}
              ></div>
            ))}
          </div>
        </div>
      ) : (
        <canvas 
          ref={canvasRef} 
          className="w-full h-full"
        />
      )}
    </div>
  );
};

export default AudioVisualizer;
