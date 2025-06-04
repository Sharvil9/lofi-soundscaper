
import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EqualizerProps {
  isOpen: boolean;
  onClose: () => void;
  audioElement: HTMLAudioElement | null;
}

const Equalizer = ({ isOpen, onClose, audioElement }: EqualizerProps) => {
  const [gains, setGains] = useState<number[]>([0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [filters, setFilters] = useState<BiquadFilterNode[]>([]);
  const [source, setSource] = useState<MediaElementAudioSourceNode | null>(null);

  const frequencies = [60, 120, 250, 500, 1000, 2000, 4000, 8000, 12000, 16000];
  const labels = ['60Hz', '120Hz', '250Hz', '500Hz', '1kHz', '2kHz', '4kHz', '8kHz', '12kHz', '16kHz'];

  useEffect(() => {
    if (isOpen && audioElement && !audioContext) {
      try {
        const context = new (window.AudioContext || (window as any).webkitAudioContext)();
        const sourceNode = context.createMediaElementSource(audioElement);
        
        const filterNodes = frequencies.map((freq, index) => {
          const filter = context.createBiquadFilter();
          filter.type = index === 0 ? 'lowshelf' : index === frequencies.length - 1 ? 'highshelf' : 'peaking';
          filter.frequency.value = freq;
          filter.Q.value = 1;
          filter.gain.value = 0;
          return filter;
        });

        let lastNode: AudioNode = sourceNode;
        filterNodes.forEach(filter => {
          lastNode.connect(filter);
          lastNode = filter;
        });
        
        lastNode.connect(context.destination);

        setAudioContext(context);
        setFilters(filterNodes);
        setSource(sourceNode);
      } catch (error) {
        console.error("Error setting up equalizer:", error);
      }
    }

    return () => {
      if (audioContext && source) {
        try {
          source.disconnect();
          filters.forEach(filter => filter.disconnect());
        } catch (error) {
          console.error("Error cleaning up equalizer:", error);
        }
      }
    };
  }, [isOpen, audioElement]);

  const handleGainChange = (index: number, value: number) => {
    const newGains = [...gains];
    newGains[index] = value;
    setGains(newGains);

    if (filters[index]) {
      filters[index].gain.value = value;
    }
  };

  const resetEqualizer = () => {
    const resetGains = new Array(10).fill(0);
    setGains(resetGains);
    filters.forEach(filter => {
      filter.gain.value = 0;
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg p-6 max-w-3xl w-full max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold">10-Band Equalizer</h3>
          <div className="flex items-center gap-2">
            <Button
              onClick={resetEqualizer}
              variant="outline"
              size="sm"
            >
              Reset
            </Button>
            <Button
              onClick={onClose}
              variant="ghost"
              size="sm"
              className="p-2"
            >
              <X size={20} />
            </Button>
          </div>
        </div>

        <div className="flex items-end justify-center gap-3 h-80 mb-6 bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
          {gains.map((gain, index) => (
            <div key={index} className="flex flex-col items-center gap-2 h-full">
              {/* Gain display */}
              <div className="text-xs font-mono text-gray-600 dark:text-gray-400 h-6 flex items-center justify-center">
                {gain > 0 ? `+${Math.round(gain)}` : Math.round(gain)}dB
              </div>
              
              {/* Vertical slider container */}
              <div className="relative flex-1 w-8 flex items-center justify-center">
                <div className="absolute w-1 h-full bg-gray-300 dark:bg-gray-600 rounded-full"></div>
                <div className="absolute w-3 h-px bg-gray-400 dark:text-gray-500" style={{ top: '50%' }}></div>
                
                {/* Vertical range input */}
                <input
                  type="range"
                  min="-20"
                  max="20"
                  step="0.5"
                  value={gain}
                  onChange={(e) => handleGainChange(index, parseFloat(e.target.value))}
                  className="absolute w-full h-4 appearance-none bg-transparent cursor-pointer vertical-slider"
                  style={{
                    transform: 'rotate(-90deg)',
                    transformOrigin: 'center',
                    width: '200px',
                    height: '16px',
                    left: '-92px',
                    top: '50%',
                    marginTop: '-8px'
                  }}
                />
                
                {/* Visual indicator */}
                <div 
                  className="absolute w-3 h-3 bg-blue-500 rounded-full pointer-events-none shadow-lg"
                  style={{
                    top: `${50 - (gain / 40) * 100}%`,
                    transform: 'translateY(-50%)'
                  }}
                ></div>
              </div>
              
              {/* Frequency label */}
              <div className="text-xs text-center font-medium mt-2 h-8 flex items-center justify-center">
                {labels[index]}
              </div>
            </div>
          ))}
        </div>

        <div className="text-center text-sm text-gray-600 dark:text-gray-400">
          Move sliders vertically to adjust frequency bands • Changes apply in real-time
        </div>
      </div>

      <style>{`
        .vertical-slider::-webkit-slider-thumb {
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: 2px solid white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
        
        .vertical-slider::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: 2px solid white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
        
        .vertical-slider::-webkit-slider-track {
          background: transparent;
        }
        
        .vertical-slider::-moz-range-track {
          background: transparent;
        }
      `}</style>
    </div>
  );
};

export default Equalizer;
