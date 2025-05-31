
import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EqualizerProps {
  isOpen: boolean;
  onClose: () => void;
  audioElement: HTMLAudioElement | null;
}

const Equalizer = ({ isOpen, onClose, audioElement }: EqualizerProps) => {
  const [gains, setGains] = useState<number[]>([0, 0, 0, 0, 0, 0, 0, 0, 0, 0]); // 10 bands
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
        
        // Create filters for each frequency band
        const filterNodes = frequencies.map((freq, index) => {
          const filter = context.createBiquadFilter();
          filter.type = index === 0 ? 'lowshelf' : index === frequencies.length - 1 ? 'highshelf' : 'peaking';
          filter.frequency.value = freq;
          filter.Q.value = 1;
          filter.gain.value = 0;
          return filter;
        });

        // Connect filters in series
        let lastNode: AudioNode = sourceNode;
        filterNodes.forEach(filter => {
          lastNode.connect(filter);
          lastNode = filter;
        });
        
        // Connect to destination
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
      <div className="bg-white dark:bg-gray-900 rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold">Equalizer</h3>
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

        <div className="flex items-end justify-center gap-4 h-64 mb-4">
          {gains.map((gain, index) => (
            <div key={index} className="flex flex-col items-center gap-2">
              <div className="text-xs font-mono text-gray-600 dark:text-gray-400">
                +{Math.max(0, Math.round(gain))}
              </div>
              <div className="relative h-40 w-8">
                <input
                  type="range"
                  min="-20"
                  max="20"
                  step="0.5"
                  value={gain}
                  onChange={(e) => handleGainChange(index, parseFloat(e.target.value))}
                  className="absolute inset-0 w-full h-full appearance-none bg-transparent [writing-mode:bt-lr] slider-vertical"
                  style={{
                    background: `linear-gradient(to top, 
                      transparent ${((20 + gain) / 40) * 100}%, 
                      #3b82f6 ${((20 + gain) / 40) * 100}%, 
                      #3b82f6 50%, 
                      transparent 50%)`
                  }}
                />
                <div className="absolute inset-0 w-full bg-gray-200 dark:bg-gray-700 rounded-full -z-10"></div>
                <div className="absolute top-1/2 left-0 w-full h-px bg-gray-400 dark:bg-gray-600 -z-10"></div>
              </div>
              <div className="text-xs font-mono text-gray-600 dark:text-gray-400">
                -{Math.max(0, Math.round(-gain))}
              </div>
              <div className="text-xs text-center font-medium mt-1">
                {labels[index]}
              </div>
            </div>
          ))}
        </div>

        <div className="text-center text-sm text-gray-600 dark:text-gray-400">
          Adjust frequency bands to customize your audio output
        </div>
      </div>
    </div>
  );
};

export default Equalizer;
