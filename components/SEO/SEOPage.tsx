import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';

interface SEOPageProps {
  title: string;
  description: string;
  h1: string;
  children: React.ReactNode;
  faq?: { question: string; answer: string }[];
}

const SEOPage: React.FC<SEOPageProps> = ({ title, description, h1, children, faq }) => {
  useEffect(() => {
    document.title = title;
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', description);
    }
    window.scrollTo(0, 0);
  }, [title, description]);

  return (
    <div className="min-h-screen bg-mystic-900 text-mystic-100 font-sans selection:bg-gold-500/30">
      <nav className="sticky top-0 z-50 bg-mystic-800/60 backdrop-blur-md border-b border-gold-500/20 px-6 py-4 flex justify-between items-center">
        <Link to="/" className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-violet-600 to-indigo-900 rounded-full flex items-center justify-center text-xl shadow-[0_0_15px_rgba(124,58,237,0.5)] border border-white/20">
            🔮
          </div>
          <span className="text-2xl font-serif font-bold bg-clip-text text-transparent bg-gradient-to-r from-white via-gold-200 to-mystic-300">
            Astro21
          </span>
        </Link>
        <Link to="/" className="px-4 py-2 rounded-full bg-gold-500 text-black font-bold text-sm hover:bg-gold-400 transition-colors">
          Start for ₹21
        </Link>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-16">
        <h1 className="text-4xl md:text-6xl font-serif font-bold text-white mb-12 leading-tight">
          {h1}
        </h1>
        
        <div className="prose prose-invert prose-gold max-w-none mb-16 text-mystic-200 leading-relaxed space-y-6">
          {children}
        </div>

        {faq && faq.length > 0 && (
          <section className="mb-16 border-t border-white/10 pt-16">
            <h2 className="text-3xl font-serif text-white mb-8">Frequently Asked Questions</h2>
            <div className="space-y-6">
              {faq.map((item, index) => (
                <div key={index} className="bg-mystic-800/40 border border-white/5 p-6 rounded-2xl">
                  <h3 className="text-lg font-bold text-gold-400 mb-2">{item.question}</h3>
                  <p className="text-mystic-300">{item.answer}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        <div className="bg-gradient-to-br from-mystic-800 to-mystic-900 border border-gold-500/30 p-8 md:p-12 rounded-3xl text-center shadow-2xl">
          <h2 className="text-2xl md:text-3xl font-serif text-white mb-4">Ready to discover your destiny?</h2>
          <p className="text-mystic-300 mb-8 max-w-lg mx-auto">Join 10,000+ seekers who have found clarity with India's #1 AI-powered astrology platform.</p>
          <Link to="/" className="inline-block bg-gold-500 hover:bg-gold-400 text-black font-bold text-xl py-4 px-12 rounded-full shadow-lg transition-all transform hover:-translate-y-1">
            Get Started for ₹21
          </Link>
        </div>
      </main>

      <footer className="bg-mystic-950 py-12 border-t border-white/5 text-center">
        <p className="text-mystic-500 text-sm">© 2024 Astro21. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default SEOPage;
