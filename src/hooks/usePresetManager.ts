
import { useState, useCallback } from 'react';
import { LofiSettings } from '@/components/LofiControls';
import { toast } from 'sonner';

export interface LofiPreset {
  id: string;
  name: string;
  settings: LofiSettings;
  createdAt: number;
}

const PRESETS_STORAGE_KEY = 'lofi-presets';

const defaultPresets: LofiPreset[] = [
  {
    id: 'chill',
    name: 'Chill',
    settings: {
      bpm: 85,
      reverb: 35,
      filter: 45,
      noise: 0,
      bitcrusher: 30,
      pitchShift: -1,
    },
    createdAt: Date.now()
  },
  {
    id: 'study',
    name: 'Study',
    settings: {
      bpm: 80,
      reverb: 45,
      filter: 55,
      noise: 0,
      bitcrusher: 40,
      pitchShift: -1.5,
    },
    createdAt: Date.now()
  },
  {
    id: 'sleep',
    name: 'Sleep',
    settings: {
      bpm: 70,
      reverb: 60,
      filter: 70,
      noise: 0,
      bitcrusher: 20,
      pitchShift: -2,
    },
    createdAt: Date.now()
  },
  {
    id: 'deep',
    name: 'Deep',
    settings: {
      bpm: 75,
      reverb: 50,
      filter: 65,
      noise: 0,
      bitcrusher: 60,
      pitchShift: -1.5,
    },
    createdAt: Date.now()
  }
];

export const usePresetManager = () => {
  const [presets, setPresets] = useState<LofiPreset[]>(() => {
    const stored = localStorage.getItem(PRESETS_STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        return [...defaultPresets, ...parsed.filter((p: LofiPreset) => !defaultPresets.find(d => d.id === p.id))];
      } catch {
        return defaultPresets;
      }
    }
    return defaultPresets;
  });

  const savePreset = useCallback((name: string, settings: LofiSettings) => {
    const newPreset: LofiPreset = {
      id: `custom-${Date.now()}`,
      name,
      settings: { ...settings },
      createdAt: Date.now()
    };

    const updatedPresets = [...presets, newPreset];
    setPresets(updatedPresets);
    
    const customPresets = updatedPresets.filter(p => !defaultPresets.find(d => d.id === p.id));
    localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(customPresets));
    
    toast.success(`Preset "${name}" saved!`);
    return newPreset;
  }, [presets]);

  const deletePreset = useCallback((id: string) => {
    if (defaultPresets.find(p => p.id === id)) {
      toast.error("Cannot delete default presets");
      return;
    }

    const updatedPresets = presets.filter(p => p.id !== id);
    setPresets(updatedPresets);
    
    const customPresets = updatedPresets.filter(p => !defaultPresets.find(d => d.id === p.id));
    localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(customPresets));
    
    toast.success("Preset deleted");
  }, [presets]);

  const loadPreset = useCallback((id: string) => {
    const preset = presets.find(p => p.id === id);
    if (preset) {
      return preset.settings;
    }
    return null;
  }, [presets]);

  return {
    presets,
    savePreset,
    deletePreset,
    loadPreset
  };
};
