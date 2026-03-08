import React from 'react';
import { Astrologer } from '../../types';
import { Star } from 'lucide-react';

interface AstroCardProps {
  astrologer: Astrologer;
  onConnect: (astrologer: Astrologer) => void;
  connectedAstrologerId?: string;
}

const AstroCard: React.FC<AstroCardProps> = ({ astrologer, onConnect, connectedAstrologerId }) => {
  const isConnectedToThis = connectedAstrologerId === astrologer.id;
  const isSessionActive = !!connectedAstrologerId;
  
  // If session is active with SOMEONE ELSE, this card is disabled
  const isOtherSessionActive = isSessionActive && !isConnectedToThis;

  return (
    <div className={`bg-mystic-800/60 backdrop-blur-md border rounded-xl p-4 flex flex-col md:flex-row gap-4 transition-all duration-300 group ${
        isOtherSessionActive ? 'opacity-50 grayscale border-mystic-700 pointer-events-none' : 'hover:bg-mystic-800/80 hover:border-gold-500/50 border-mystic-600/50'
    }`}>
      <div className="relative shrink-0 mx-auto md:mx-0">
        <div className={`w-20 h-20 rounded-full p-[2px] ${isConnectedToThis ? 'bg-green-500 animate-pulse' : 'bg-gradient-to-br from-gold-400 to-mystic-900'}`}>
           <img 
            src={astrologer.imageUrl} 
            alt={`Verified Vedic Astrologer ${astrologer.name} - Expert in ${astrologer.specialty}`} 
            className="w-full h-full rounded-full object-cover border-2 border-mystic-900"
           />
        </div>
        {astrologer.isOnline ? (
          <span className="absolute bottom-1 right-1 w-4 h-4 bg-green-500 border-2 border-mystic-800 rounded-full animate-pulse"></span>
        ) : (
          <span className="absolute bottom-1 right-1 w-4 h-4 bg-gray-500 border-2 border-mystic-800 rounded-full"></span>
        )}
      </div>
      
      <div className="flex-1 text-center md:text-left">
        <div className="flex justify-between items-start mb-1">
            <h3 className={`text-lg font-serif font-bold ${isConnectedToThis ? 'text-green-400' : 'text-mystic-100 group-hover:text-gold-400'} transition-colors`}>
                {astrologer.name}
            </h3>
            <div className="flex items-center text-gold-400 text-sm">
                <Star className="w-3 h-3 fill-current" />
                <span className="ml-1 font-bold">{astrologer.rating}</span>
                <span className="text-mystic-400 text-xs ml-1">({astrologer.reviews})</span>
            </div>
        </div>
        <p className="text-mystic-300 text-sm mb-3 font-medium">{astrologer.specialty}</p>
        
        <div className="flex items-center justify-between mt-auto">
            <span className="text-mystic-200 text-sm bg-mystic-900/50 px-2 py-1 rounded">
                ₹{astrologer.pricePerMin}/min
            </span>
            <button 
                onClick={() => !isOtherSessionActive && onConnect(astrologer)}
                className={`font-bold py-1.5 px-4 rounded-lg text-sm transition-colors shadow-lg ${
                    isConnectedToThis 
                        ? 'bg-green-600 hover:bg-green-500 text-white shadow-green-500/20'
                        : isOtherSessionActive
                            ? 'bg-mystic-900 text-mystic-500 cursor-not-allowed border border-mystic-700'
                            : astrologer.isOnline 
                                ? 'bg-gold-500 hover:bg-gold-400 text-mystic-900 shadow-gold-500/10' 
                                : 'bg-mystic-700 text-mystic-400 cursor-not-allowed'
                }`}
                disabled={!astrologer.isOnline || isOtherSessionActive}
            >
                {isConnectedToThis 
                    ? 'Resume Chat' 
                    : isOtherSessionActive 
                        ? 'In Session' 
                        : astrologer.isOnline 
                            ? 'Chat Now' 
                            : 'Offline'}
            </button>
        </div>
      </div>
    </div>
  );
};

export default AstroCard;