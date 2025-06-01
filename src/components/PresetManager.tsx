
import { useState } from 'react';
import { Save, Trash2, Download, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { usePresetManager, LofiPreset } from '@/hooks/usePresetManager';
import { LofiSettings } from './LofiControls';
import { toast } from 'sonner';

interface PresetManagerProps {
  currentSettings: LofiSettings;
  onLoadPreset: (settings: LofiSettings) => void;
  isOpen: boolean;
  onClose: () => void;
}

const PresetManager = ({ currentSettings, onLoadPreset, isOpen, onClose }: PresetManagerProps) => {
  const { presets, savePreset, deletePreset, loadPreset } = usePresetManager();
  const [newPresetName, setNewPresetName] = useState('');
  const [showSaveForm, setShowSaveForm] = useState(false);

  const handleSavePreset = () => {
    if (!newPresetName.trim()) {
      toast.error("Please enter a preset name");
      return;
    }
    
    savePreset(newPresetName.trim(), currentSettings);
    setNewPresetName('');
    setShowSaveForm(false);
  };

  const handleLoadPreset = (id: string) => {
    const settings = loadPreset(id);
    if (settings) {
      onLoadPreset(settings);
      toast.success("Preset loaded!");
    }
  };

  const exportPresets = () => {
    const customPresets = presets.filter(p => !['chill', 'study', 'sleep', 'deep'].includes(p.id));
    const dataStr = JSON.stringify(customPresets, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'lofi-presets.json';
    link.click();
    URL.revokeObjectURL(url);
    
    toast.success("Presets exported!");
  };

  const importPresets = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedPresets: LofiPreset[] = JSON.parse(e.target?.result as string);
        
        importedPresets.forEach(preset => {
          if (preset.settings && preset.name) {
            savePreset(preset.name, preset.settings);
          }
        });
        
        toast.success(`Imported ${importedPresets.length} presets!`);
      } catch (error) {
        toast.error("Invalid preset file");
      }
    };
    reader.readAsText(file);
    
    // Reset input
    event.target.value = '';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Preset Manager</h3>
          <div className="flex items-center gap-2">
            <Button
              onClick={exportPresets}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <Download size={16} />
              Export
            </Button>
            <label className="cursor-pointer">
              <input
                type="file"
                accept=".json"
                onChange={importPresets}
                className="hidden"
              />
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
                asChild
              >
                <span>
                  <Upload size={16} />
                  Import
                </span>
              </Button>
            </label>
            <Button onClick={onClose} variant="ghost" size="sm">
              ✕
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          {/* Save New Preset */}
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            {!showSaveForm ? (
              <Button
                onClick={() => setShowSaveForm(true)}
                className="w-full flex items-center gap-2"
                variant="outline"
              >
                <Save size={16} />
                Save Current Settings as Preset
              </Button>
            ) : (
              <div className="space-y-3">
                <Input
                  placeholder="Enter preset name..."
                  value={newPresetName}
                  onChange={(e) => setNewPresetName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSavePreset()}
                  className="bg-white dark:bg-gray-900"
                />
                <div className="flex gap-2">
                  <Button onClick={handleSavePreset} size="sm">
                    Save
                  </Button>
                  <Button 
                    onClick={() => {
                      setShowSaveForm(false);
                      setNewPresetName('');
                    }} 
                    variant="outline" 
                    size="sm"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Presets List */}
          <div className="space-y-2">
            <h4 className="font-medium text-gray-900 dark:text-gray-100">Available Presets</h4>
            <div className="grid gap-2 max-h-96 overflow-y-auto">
              {presets.map((preset) => (
                <div
                  key={preset.id}
                  className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750"
                >
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 dark:text-gray-100">{preset.name}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      BPM: {preset.settings.bpm} • Reverb: {preset.settings.reverb}% • Filter: {preset.settings.filter}%
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => handleLoadPreset(preset.id)}
                      size="sm"
                      variant="outline"
                    >
                      Load
                    </Button>
                    {!['chill', 'study', 'sleep', 'deep'].includes(preset.id) && (
                      <Button
                        onClick={() => deletePreset(preset.id)}
                        size="sm"
                        variant="outline"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20"
                      >
                        <Trash2 size={14} />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PresetManager;
