
import React, { useState } from 'react';
import { Transaction } from '../../types';
import { X, CreditCard, Phone, Package, ScrollText, ShoppingBag, Video, Sparkles, Flower2 } from 'lucide-react';

interface HistoryModalProps {
  transactions: Transaction[];
  onClose: () => void;
  initialTab?: 'all' | 'calls' | 'purchases';
}

const HistoryModal: React.FC<HistoryModalProps> = ({ transactions, onClose, initialTab = 'all' }) => {
  const [activeTab, setActiveTab] = useState<'all' | 'calls' | 'purchases'>(initialTab);

  const filteredData = transactions.filter(t => {
      if (activeTab === 'calls') return t.type === 'Consultation';
      if (activeTab === 'purchases') return t.type === 'Product';
      return true;
  });

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-mystic-900 border border-gold-500/30 rounded-3xl w-full max-w-2xl h-[80vh] flex flex-col relative shadow-2xl">
        
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex justify-between items-center bg-mystic-800/50 rounded-t-3xl">
            <div>
                <h3 className="text-xl font-serif text-white font-bold">History & Billing</h3>
                <p className="text-xs text-mystic-400">Track your spiritual journey expenditures.</p>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white transition-colors"><X className="w-4 h-4" /></button>
        </div>

        {/* Tabs */}
        <div className="flex p-4 gap-2 border-b border-white/5 bg-black/20 overflow-x-auto">
            {[
                { id: 'all', label: 'All Transactions', icon: <CreditCard className="w-4 h-4" /> },
                { id: 'calls', label: 'Call History', icon: <Phone className="w-4 h-4" /> },
                { id: 'purchases', label: 'Purchases', icon: <Package className="w-4 h-4" /> }
            ].map(tab => (
                <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                        activeTab === tab.id 
                        ? 'bg-gold-500 text-mystic-900 shadow-lg shadow-gold-500/20' 
                        : 'bg-white/5 text-mystic-400 hover:text-white hover:bg-white/10'
                    }`}
                >
                    <span>{tab.icon}</span> {tab.label}
                </button>
            ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {filteredData.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-mystic-500 opacity-50">
                    <ScrollText className="w-10 h-10 mb-2" />
                    <p>No records found in this category.</p>
                </div>
            ) : (
                filteredData.map(tx => (
                    <div key={tx.id} className="bg-mystic-800/40 border border-white/5 rounded-xl p-4 flex items-center justify-between hover:bg-mystic-800 transition-colors group">
                        <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                tx.type === 'Product' ? 'bg-blue-500/10 text-blue-400' :
                                tx.type === 'Consultation' ? 'bg-green-500/10 text-green-400' :
                                tx.type === 'Subscription' ? 'bg-purple-500/10 text-purple-400' :
                                'bg-gold-500/10 text-gold-400'
                            }`}>
                                {tx.type === 'Product' ? <ShoppingBag className="w-5 h-5" /> : tx.type === 'Consultation' ? <Video className="w-5 h-5" /> : tx.type === 'Subscription' ? <Sparkles className="w-5 h-5" /> : <Flower2 className="w-5 h-5" />}
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-white group-hover:text-gold-300 transition-colors">{tx.details}</h4>
                                <p className="text-xs text-mystic-500 font-mono">{tx.date} • {tx.id}</p>
                            </div>
                        </div>
                        <div className="text-right">
                             <p className={`font-bold font-mono ${tx.type === 'Dakshina' ? 'text-gold-400' : 'text-white'}`}>
                                - ₹{tx.amount}
                             </p>
                             <span className="text-[10px] bg-green-500/10 text-green-500 px-2 py-0.5 rounded uppercase tracking-wider">{tx.status}</span>
                        </div>
                    </div>
                ))
            )}
        </div>
        
        <div className="p-4 border-t border-white/10 bg-mystic-900/80 rounded-b-3xl text-center">
            <p className="text-[10px] text-mystic-600">Secure payments processed via Razorpay</p>
        </div>

      </div>
    </div>
  );
};

export default HistoryModal;
