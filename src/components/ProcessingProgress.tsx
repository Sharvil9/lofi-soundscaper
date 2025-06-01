
import { Progress } from '@/components/ui/progress';
import { Loader2 } from 'lucide-react';

interface ProcessingProgressProps {
  isVisible: boolean;
  progress: number;
  stage: string;
}

const ProcessingProgress = ({ isVisible, progress, stage }: ProcessingProgressProps) => {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg p-8 max-w-md w-full border border-gray-200 dark:border-gray-700">
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
          
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
              Processing Audio
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {stage}
            </p>
          </div>
          
          <div className="space-y-2">
            <Progress value={progress} className="w-full" />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {Math.round(progress)}% complete
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProcessingProgress;
