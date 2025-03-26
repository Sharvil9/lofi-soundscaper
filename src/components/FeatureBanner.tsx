
import { MusicNote, Laptop, Headphones, Clock } from 'lucide-react';

const FeatureBanner = () => {
  const features = [
    {
      icon: <MusicNote size={28} className="text-accent" />,
      title: "Lo-fi Effects",
      description: "Transform any sound with authentic lo-fi processing"
    },
    {
      icon: <Clock size={28} className="text-accent" />,
      title: "Tempo Control",
      description: "Slow down tracks for that perfect chill vibe"
    },
    {
      icon: <Headphones size={28} className="text-accent" />,
      title: "Study Focus",
      description: "Create the ideal background for concentration"
    },
    {
      icon: <Laptop size={28} className="text-accent" />,
      title: "Multi-Platform",
      description: "Process audio from YouTube and SoundCloud"
    }
  ];

  return (
    <div className="w-full py-8 my-6 bg-gradient-to-r from-lofi-100/50 to-lofi-200/50 dark:from-lofi-900/50 dark:to-lofi-800/50 rounded-xl shadow-inner animate-fade-in-up delay-300">
      <div className="max-w-4xl mx-auto px-4">
        <h2 className="text-2xl font-medium text-center mb-8">Enhanced Lo-fi Experience</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <div key={index} className="flex flex-col items-center text-center p-4 transition-transform hover:scale-105">
              <div className="w-12 h-12 rounded-full bg-lofi-200 dark:bg-lofi-800 flex items-center justify-center mb-3">
                {feature.icon}
              </div>
              <h3 className="font-medium mb-1">{feature.title}</h3>
              <p className="text-sm text-lofi-600 dark:text-lofi-400">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FeatureBanner;
