
import { useState, useCallback, useRef } from 'react';
import { LofiSettings } from '@/components/LofiControls';

interface HistoryState {
  settings: LofiSettings;
  timestamp: number;
}

export const useUndoRedo = (initialSettings: LofiSettings) => {
  const [history, setHistory] = useState<HistoryState[]>([
    { settings: initialSettings, timestamp: Date.now() }
  ]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const isUpdatingRef = useRef(false);

  const pushToHistory = useCallback((settings: LofiSettings) => {
    if (isUpdatingRef.current) return;

    setHistory(prev => {
      const newHistory = prev.slice(0, currentIndex + 1);
      newHistory.push({ settings: { ...settings }, timestamp: Date.now() });
      
      // Limit history to 50 items
      if (newHistory.length > 50) {
        newHistory.shift();
        return newHistory;
      }
      
      return newHistory;
    });
    
    setCurrentIndex(prev => {
      const newIndex = Math.min(prev + 1, history.length);
      return newIndex;
    });
  }, [currentIndex, history.length]);

  const undo = useCallback(() => {
    if (currentIndex > 0) {
      isUpdatingRef.current = true;
      setCurrentIndex(prev => prev - 1);
      setTimeout(() => {
        isUpdatingRef.current = false;
      }, 0);
      return history[currentIndex - 1].settings;
    }
    return null;
  }, [currentIndex, history]);

  const redo = useCallback(() => {
    if (currentIndex < history.length - 1) {
      isUpdatingRef.current = true;
      setCurrentIndex(prev => prev + 1);
      setTimeout(() => {
        isUpdatingRef.current = false;
      }, 0);
      return history[currentIndex + 1].settings;
    }
    return null;
  }, [currentIndex, history]);

  const canUndo = currentIndex > 0;
  const canRedo = currentIndex < history.length - 1;

  return {
    pushToHistory,
    undo,
    redo,
    canUndo,
    canRedo,
    historyLength: history.length,
    currentIndex
  };
};
