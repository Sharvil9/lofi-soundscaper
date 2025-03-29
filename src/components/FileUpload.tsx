
import { useState } from 'react';
import { Upload, Music } from 'lucide-react';
import { toast } from "sonner";
import { Button } from '@/components/ui/button';

interface FileUploadProps {
  onUpload: (file: File) => void;
  isLoading: boolean;
}

const FileUpload = ({ onUpload, isLoading }: FileUploadProps) => {
  const [dragActive, setDragActive] = useState(false);
  
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  };
  
  const handleFiles = (files: FileList) => {
    if (files.length === 0) return;
    
    const file = files[0];
    
    // Check if the file is an audio file
    if (!file.type.startsWith('audio/')) {
      toast.error("Please upload an audio file");
      return;
    }
    
    // Pass the file to the parent component
    onUpload(file);
  };
  
  return (
    <div className="w-full max-w-2xl mx-auto mt-6">
      <div className="border-2 border-dashed border-lofi-300 dark:border-lofi-700 rounded-xl p-6 relative transition-all duration-300 ease-in-out hover:border-accent hover:shadow-sm"
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        style={{ 
          background: dragActive ? 'rgba(128, 90, 213, 0.05)' : 'transparent',
          borderColor: dragActive ? 'rgb(128, 90, 213)' : ''
        }}
      >
        <input 
          type="file" 
          id="file-upload" 
          className="hidden" 
          accept="audio/*" 
          onChange={handleFileChange} 
          disabled={isLoading}
        />
        
        <label htmlFor="file-upload" className="flex flex-col items-center justify-center cursor-pointer">
          <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mb-4">
            <Music size={24} className="text-accent" />
          </div>
          
          <p className="text-lg font-medium mb-2 text-center">Upload audio file</p>
          <p className="text-sm text-lofi-500 dark:text-lofi-400 text-center mb-4">
            Drag and drop or click to browse
          </p>
          
          <Button 
            type="button" 
            variant="outline" 
            size="sm" 
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            <Upload size={16} />
            <span>Select File</span>
          </Button>
        </label>
        
        <div className="mt-4 text-xs text-center text-lofi-500 dark:text-lofi-400">
          Supported formats: MP3, WAV, AAC, OGG, FLAC
        </div>
      </div>
    </div>
  );
};

export default FileUpload;
