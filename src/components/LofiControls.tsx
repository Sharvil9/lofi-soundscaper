
import { useState, useEffect } from 'react';
import { Volume2, Clock, Filter, BarChart2, Music, Wand2 } from 'lucide-react';

export interface LofiSettings {
  tempo: number;
  reverb: number;
  filter: number;
  noise: number;
  bitcrusher: number;
}

interface LofiControlsProps {
  onChange: (settings: LofiSettings) => void;
  isProcessing: boolean;
}

const LofiControls = ({ onChange, isProcessing }: LofiControlsProps) => {
  const [settings, setSettings] = useState<LofiSettings>({
    tempo: 85,      // Original: 100%, Lofi: 85%
    reverb: 30,     // 0-100 (percentage)
    filter: 40,     // 0-100 (percentage), more = more lowpass filter
    noise: 15,      // 0-100 (percentage)
    bitcrusher: 10, // 0-100 (percentage)
  });
  
  useEffect(() => {
    onChange(settings);
  }, [settings, onChange]);

  const handleChange = (property: keyof LofiSettings, value: number) => {
    setSettings(prev => ({
      ...prev,
      [property]: value
    }));
  };
  
  const applyPreset = (preset: string) => {
    switch(preset) {
      case 'chill':
        setSettings({
          tempo: 85,
          reverb: 30,
          filter: 40,
          noise: 15,
          bitcrusher: 10
        });
        break;
      case 'study':
        setSettings({
          tempo: 80,
          reverb: 40,
          filter: 50,
          noise: 20,
          bitcrusher: 15
        });
        break;
      case 'sleep':
        setSettings({
          tempo: 70,
          reverb: 60,
          filter: 70,
          noise: 10,
          bitcrusher: 5
        });
        break;
      case 'deep':
        setSettings({
          tempo: 75,
          reverb: 50,
          filter: 60,
          noise: 25,
          bitcrusher: 20
        });
        break;
      default:
        break;
    }
  };

  return (
    <div className="w-full p-6 glass-panel animate-fade-in-up delay-200">
      <div className="flex flex-col md:flex-row md:items-start gap-8">
        <div className="w-full md:w-auto shrink-0">
          <h3 className="text-lg font-medium mb-4 text-center md:text-left">Presets</h3>
          <div className="grid grid-cols-2 gap-2 max-w-[200px]">
            {['chill', 'study', 'sleep', 'deep'].map(preset => (
              <button
                key={preset}
                onClick={() => applyPreset(preset)}
                disabled={isProcessing}
                className="px-4 py-2 rounded-full text-sm font-medium bg-lofi-200 dark:bg-lofi-800 hover:bg-lofi-300 dark:hover:bg-lofi-700 transition-all duration-200 capitalize disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-1"
              >
                <Wand2 size={14} />
                <span>{preset}</span>
              </button>
            ))}
          </div>
        </div>
        
        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
          <ControlSlider
            label="Tempo"
            value={settings.tempo}
            onChange={value => handleChange('tempo', value)}
            min={60}
            max={100}
            icon={<Clock size={18} />}
            suffix="%"
            hint="Lower = slower"
            disabled={isProcessing}
          />
          
          <ControlSlider
            label="Reverb"
            value={settings.reverb}
            onChange={value => handleChange('reverb', value)}
            min={0}
            max={100}
            icon={<Volume2 size={18} />}
            suffix="%"
            hint="Room ambience"
            disabled={isProcessing}
          />
          
          <ControlSlider
            label="Filter"
            value={settings.filter}
            onChange={value => handleChange('filter', value)}
            min={0}
            max={100}
            icon={<Filter size={18} />}
            suffix="%"
            hint="Lo-pass filter"
            disabled={isProcessing}
          />
          
          <ControlSlider
            label="Noise"
            value={settings.noise}
            onChange={value => handleChange('noise', value)}
            min={0}
            max={100}
            icon={<BarChart2 size={18} />}
            suffix="%"
            hint="Vinyl crackle"
            disabled={isProcessing}
          />
          
          <ControlSlider
            label="Lo-fi Effect"
            value={settings.bitcrusher}
            onChange={value => handleChange('bitcrusher', value)}
            min={0}
            max={100}
            icon={<Music size={18} />}
            suffix="%"
            hint="Bit reduction"
            disabled={isProcessing}
          />
        </div>
      </div>
    </div>
  );
};

interface ControlSliderProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  icon?: React.ReactNode;
  suffix?: string;
  hint?: string;
  disabled?: boolean;
}

const ControlSlider = ({ 
  label, 
  value, 
  onChange, 
  min, 
  max, 
  icon, 
  suffix = '', 
  hint,
  disabled = false
}: ControlSliderProps) => {
  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between mb-1">
        <label className="text-sm font-medium flex items-center gap-1">
          {icon && <span className="text-lofi-500 dark:text-lofi-400">{icon}</span>}
          {label}
        </label>
        <span className="text-sm font-mono text-lofi-600 dark:text-lofi-300">
          {value}{suffix}
        </span>
      </div>
      
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="control-slider"
        disabled={disabled}
      />
      
      {hint && (
        <span className="text-xs text-lofi-500 dark:text-lofi-400 mt-1">{hint}</span>
      )}
    </div>
  );
};

export default LofiControls;
