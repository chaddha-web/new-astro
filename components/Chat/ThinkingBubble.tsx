
import React from 'react';
import { Sparkles } from 'lucide-react';

const ThinkingBubble: React.FC = () => {
  return (
    <div className="flex w-full mb-6 items-end gap-3 animate-in fade-in duration-300 slide-in-from-bottom-2">
      {/* Avatar */}
      <div className="shrink-0 w-10 h-10 rounded-full shadow-lg border border-white/20 overflow-hidden relative bg-mystic-900 flex items-center justify-center">
         <div className="animate-pulse"><Sparkles className="w-5 h-5 text-gold-400" /></div>
      </div>

      {/* Bubble */}
      <div className="bg-mystic-800/95 text-mystic-100 rounded-2xl rounded-bl-none border border-white/10 py-4 px-5 shadow-lg relative min-w-[120px]">
         {/* Bouncing Dots */}
         <div className="flex items-center gap-1.5 h-4 mb-1">
            <span className="w-2 h-2 bg-gold-500 rounded-full animate-[bounce_1s_infinite_0ms]"></span>
            <span className="w-2 h-2 bg-gold-500 rounded-full animate-[bounce_1s_infinite_200ms]"></span>
            <span className="w-2 h-2 bg-gold-500 rounded-full animate-[bounce_1s_infinite_400ms]"></span>
         </div>
         
         {/* Text */}
         <p className="text-[10px] text-mystic-400 font-mono uppercase tracking-widest animate-pulse">
            Consulting the Stars...
         </p>
      </div>
    </div>
  );
};

export default ThinkingBubble;
