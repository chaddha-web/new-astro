import React, { useState } from 'react';
import { Star } from 'lucide-react';

interface RatingModalProps {
  guruName: string;
  guruImage: string;
  onSubmit: (rating: number, comment: string) => void;
  onSkip: () => void;
}

const RatingModal: React.FC<RatingModalProps> = ({ guruName, guruImage, onSubmit, onSkip }) => {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [hoveredRating, setHoveredRating] = useState(0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-mystic-800 border border-gold-500/30 p-8 rounded-3xl max-w-sm w-full text-center shadow-[0_0_50px_rgba(234,179,8,0.2)]">
        
        <div className="w-20 h-20 bg-mystic-900 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-gold-500 p-1">
            <img src={guruImage} alt={guruName} className="w-full h-full rounded-full object-cover" />
        </div>

        <h3 className="text-xl font-serif text-white mb-2">How was your session?</h3>
        <p className="text-mystic-300 mb-6 text-sm">Rate your experience with <br/><span className="text-gold-400 font-bold">{guruName}</span></p>

        <div className="flex justify-center gap-2 mb-6">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onMouseEnter={() => setHoveredRating(star)}
              onMouseLeave={() => setHoveredRating(0)}
              onClick={() => setRating(star)}
              className="focus:outline-none transition-transform hover:scale-110"
            >
              <span className={`flex items-center justify-center ${star <= (hoveredRating || rating) ? 'text-gold-400' : 'text-mystic-600'}`}>
                <Star className="w-8 h-8 fill-current" />
              </span>
            </button>
          ))}
        </div>

        <textarea 
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Write a compliment (optional)..."
          className="w-full bg-mystic-900/50 border border-mystic-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-gold-500/50 mb-4 h-24 resize-none"
        />

        <button 
            onClick={() => onSubmit(rating, comment)}
            disabled={rating === 0}
            className="w-full bg-gradient-to-r from-gold-600 to-gold-400 hover:from-gold-500 hover:to-gold-300 text-mystic-950 font-bold py-3 rounded-xl shadow-lg disabled:opacity-50 disabled:cursor-not-allowed mb-3"
        >
            Submit Review
        </button>
        
        <button 
            onClick={onSkip}
            className="text-mystic-500 text-xs hover:text-white"
        >
            Skip Feedback
        </button>

      </div>
    </div>
  );
};

export default RatingModal;