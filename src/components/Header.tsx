
import { useState, useEffect } from 'react';
import { MoonIcon, SunIcon } from 'lucide-react';

const Header = () => {
  const [isDark, setIsDark] = useState(false);
  
  useEffect(() => {
    // Check for system dark mode preference
    const darkModePreference = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setIsDark(darkModePreference);
    
    // Apply dark mode class if needed
    if (darkModePreference) {
      document.documentElement.classList.add('dark');
    }
  }, []);
  
  const toggleDarkMode = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle('dark');
  };

  return (
    <header className="w-full px-8 py-6 flex items-center justify-between animate-fade-in">
      <div className="flex items-center space-x-2">
        <div className="relative w-10 h-10 rounded-full bg-accent flex items-center justify-center overflow-hidden">
          <span className="absolute w-3 h-3 bg-white rounded-full animate-float"></span>
          <span className="absolute w-2 h-2 bg-accent-light rounded-full animate-float" style={{ animationDelay: '1s' }}></span>
        </div>
        <div className="text-xl font-medium bg-clip-text">
          <span className="font-semibold">Lofi</span>Soundscaper
        </div>
      </div>
      <button 
        onClick={toggleDarkMode}
        className="w-10 h-10 rounded-full flex items-center justify-center bg-lofi-100 dark:bg-lofi-800 text-lofi-800 dark:text-lofi-100 hover:bg-lofi-200 dark:hover:bg-lofi-700 transition-all duration-300"
        aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      >
        {isDark ? <SunIcon size={18} /> : <MoonIcon size={18} />}
      </button>
    </header>
  );
};

export default Header;
