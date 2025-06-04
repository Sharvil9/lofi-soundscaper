
import { useState, useEffect } from 'react';
import { Volume2, Clock, Filter, Music, Wand2, Play, Waves, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext } from "@/components/ui/carousel";
import { usePresetManager } from '@/hooks/usePresetManager';

export interface LofiSettings {
  bpm: number;           
  reverb: number;
  filter: number;        
  bitcrusher: number;
  pitchShift: number;
}

interface LofiControlsProps {
  onChange: (settings: LofiSettings) => void;
  isProcessing: boolean;
  onProcess: () => void;
  onPreviewToggle?: (enabled: boolean) => void;
  isPreviewEnabled?: boolean;
  processingProgress?: { progress: number; stage: string };
}

const LofiControls = ({ 
  onChange, 
  isProcessing, 
  onProcess, 
  onPreviewToggle, 
  isPreviewEnabled = false,
  processingProgress
}: LofiControlsProps) => {
  const [settings, setSettings] = useState<LofiSettings>({
    bpm: 85,
    reverb: 30,
    filter: 40,      
    bitcrusher: 25,       
    pitchShift: -1,       
  });
  
  const { loadPreset } = usePresetManager();
  
  useEffect(() => {
    onChange(settings);
  }, [settings, onChange]);

  const handleChange = (property: keyof LofiSettings, value: number) => {
    const newSettings = {
      ...settings,
      [property]: value
    };
    setSettings(newSettings);
  };
  
  const applyPreset = (preset: string) => {
    const presetSettings = loadPreset(preset);
    if (presetSettings) {
      setSettings(presetSettings);
    }
  };

  return (
    <div className="w-full p-6 glass-panel animate-fade-in-up delay-200">
      <div className="flex flex-col gap-8">
        {/* Header with controls */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">Lo-fi Controls</h3>
          <div className="flex items-center gap-2">
            {/* Real-time Preview Toggle */}
            {onPreviewToggle && (
              <Button
                onClick={() => onPreviewToggle(!isPreviewEnabled)}
                variant={isPreviewEnabled ? "default" : "outline"}
                size="sm"
                disabled={isProcessing}
              >
                {isPreviewEnabled ? "Preview On" : "Preview Off"}
              </Button>
            )}
          </div>
        </div>

        <div className="w-full">
          <h4 className="text-md font-medium mb-4 text-center">Quick Presets</h4>
          <Carousel className="max-w-md mx-auto">
            <CarouselContent>
              {['chill', 'study', 'sleep', 'deep'].map(preset => (
                <CarouselItem key={preset} className="basis-1/2 md:basis-1/3">
                  <button
                    onClick={() => applyPreset(preset)}
                    disabled={isProcessing}
                    className="w-full px-4 py-2 rounded-full text-sm font-medium bg-lofi-200 dark:bg-lofi-800 hover:bg-lofi-300 dark:hover:bg-lofi-700 transition-all duration-200 capitalize disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-1"
                  >
                    <Wand2 size={14} />
                    <span>{preset}</span>
                  </button>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="hidden md:flex -left-4" />
            <CarouselNext className="hidden md:flex -right-4" />
          </Carousel>
        </div>
        
        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <ControlSlider
            label="BPM"
            value={settings.bpm}
            onChange={value => handleChange('bpm', value)}
            min={60}
            max={120}
            icon={<Clock size={18} />}
            suffix=" BPM"
            hint="Tempo change"
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
            hint="Space and ambience"
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
            hint="Lo-pass warmth"
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
            hint="Vinyl crackle & warmth"
            disabled={isProcessing}
          />
          
          <ControlSlider
            label="Pitch Shift"
            value={settings.pitchShift}
            onChange={value => handleChange('pitchShift', value)}
            min={-6}
            max={6}
            icon={<Waves size={18} />}
            suffix=" st"
            hint="Pitch adjustment only"
            disabled={isProcessing}
          />
        </div>
        
        <div className="flex justify-center mt-4">
          <Button 
            onClick={onProcess} 
            disabled={isProcessing} 
            className="bg-accent hover:bg-accent/90 text-white font-medium px-8 py-3 text-base min-w-[200px] flex flex-col items-center justify-center gap-1 relative overflow-hidden"
          >
            {isProcessing ? (
              <>
                <div className="flex items-center gap-2">
                  <RefreshCw size={16} className="animate-spin" />
                  <span>Processing...</span>
                </div>
                <div className="w-full mt-1">
                  <Progress 
                    value={processingProgress?.progress || 0} 
                    className="h-1 bg-white/20"
                  />
                </div>
                <span className="text-xs opacity-80 mt-1">
                  {Math.round(processingProgress?.progress || 0)}% - {processingProgress?.stage || 'Processing...'}
                </span>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <Play size={16} />
                  <span>Process Audio</span>
                </div>
              </>
            )}
          </Button>
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
