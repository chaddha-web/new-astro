
import React, { useState } from 'react';
import { UserState } from '../../types';
import { X } from 'lucide-react';

interface ProfileModalProps {
  user: UserState;
  onSave: (updatedData: Partial<UserState>) => void;
  onClose: () => void;
}

const ProfileModal: React.FC<ProfileModalProps> = ({ user, onSave, onClose }) => {
  const [formData, setFormData] = useState({
    name: user.name,
    gender: user.gender || 'Male',
    birthDate: user.birthDate || '',
    birthTime: user.birthTime || '',
    birthPlace: user.birthPlace || '',
    contact: user.contact || ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in">
      <div className="bg-mystic-800 border border-gold-500/30 p-6 rounded-3xl max-w-md w-full relative shadow-2xl">
        <button onClick={onClose} className="absolute top-4 right-4 text-mystic-500 hover:text-white"><X className="w-5 h-5" /></button>
        
        <h3 className="text-2xl font-serif text-white mb-6 text-center">Edit Profile</h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="text-[10px] uppercase text-mystic-400 font-bold">Name</label>
                <input 
                    type="text" 
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    className="w-full bg-mystic-900 border border-mystic-600 rounded-xl px-4 py-2 text-white focus:border-gold-500 outline-none"
                />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="text-[10px] uppercase text-mystic-400 font-bold">Gender</label>
                    <select 
                        value={formData.gender}
                        onChange={e => setFormData({...formData, gender: e.target.value})}
                        className="w-full bg-mystic-900 border border-mystic-600 rounded-xl px-4 py-2 text-white focus:border-gold-500 outline-none"
                    >
                        <option>Male</option>
                        <option>Female</option>
                        <option>Other</option>
                    </select>
                </div>
                <div>
                     <label className="text-[10px] uppercase text-mystic-400 font-bold">Contact</label>
                     <input 
                        type="text" 
                        value={formData.contact}
                        disabled
                        className="w-full bg-mystic-900/50 border border-mystic-700/50 rounded-xl px-4 py-2 text-mystic-500 cursor-not-allowed"
                     />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="text-[10px] uppercase text-mystic-400 font-bold">Birth Date</label>
                    <input 
                        type="date" 
                        value={formData.birthDate}
                        onChange={e => setFormData({...formData, birthDate: e.target.value})}
                        className="w-full bg-mystic-900 border border-mystic-600 rounded-xl px-4 py-2 text-white focus:border-gold-500 outline-none [color-scheme:dark]"
                    />
                </div>
                <div>
                    <label className="text-[10px] uppercase text-mystic-400 font-bold">Birth Time</label>
                    <input 
                        type="time" 
                        value={formData.birthTime}
                        onChange={e => setFormData({...formData, birthTime: e.target.value})}
                        className="w-full bg-mystic-900 border border-mystic-600 rounded-xl px-4 py-2 text-white focus:border-gold-500 outline-none [color-scheme:dark]"
                    />
                </div>
            </div>

            <div>
                <label className="text-[10px] uppercase text-mystic-400 font-bold">Place of Birth</label>
                <input 
                    type="text" 
                    value={formData.birthPlace}
                    onChange={e => setFormData({...formData, birthPlace: e.target.value})}
                    className="w-full bg-mystic-900 border border-mystic-600 rounded-xl px-4 py-2 text-white focus:border-gold-500 outline-none"
                />
            </div>

            <div className="pt-4">
                <button 
                    type="submit"
                    className="w-full bg-gold-500 hover:bg-gold-400 text-mystic-900 font-bold py-3 rounded-xl shadow-lg transition-transform active:scale-[0.98]"
                >
                    Save Changes
                </button>
            </div>
        </form>
      </div>
    </div>
  );
};

export default ProfileModal;
