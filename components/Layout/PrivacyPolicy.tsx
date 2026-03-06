import React from 'react';

interface PrivacyPolicyProps {
  onBack: () => void;
}

const PrivacyPolicy: React.FC<PrivacyPolicyProps> = ({ onBack }) => {
  return (
    <div className="relative z-10 py-20 px-6 max-w-4xl mx-auto text-mystic-100 animate-in fade-in">
      <button onClick={onBack} className="mb-8 text-gold-400 hover:text-white transition-colors flex items-center gap-2">
        <span>←</span> Back to Home
      </button>
      <h1 className="text-4xl font-serif text-white mb-8">Privacy Policy</h1>
      
      <div className="space-y-6 text-mystic-300 leading-relaxed">
        <section>
          <h2 className="text-2xl font-serif text-white mb-4">1. Introduction</h2>
          <p>Welcome to Astro21. We respect your privacy and are committed to protecting your personal data. This privacy policy will inform you as to how we look after your personal data when you visit our website and tell you about your privacy rights and how the law protects you.</p>
        </section>

        <section>
          <h2 className="text-2xl font-serif text-white mb-4">2. The Data We Collect</h2>
          <p>We may collect, use, store and transfer different kinds of personal data about you which we have grouped together as follows:</p>
          <ul className="list-disc pl-6 mt-2 space-y-2">
            <li><strong>Identity Data</strong> includes first name, last name, username or similar identifier, marital status, title, date of birth and gender.</li>
            <li><strong>Contact Data</strong> includes billing address, delivery address, email address and telephone numbers.</li>
            <li><strong>Astrological Data</strong> includes birth time, birth place, and other details required for generating astrological charts.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-serif text-white mb-4">3. How We Use Your Data</h2>
          <p>We will only use your personal data when the law allows us to. Most commonly, we will use your personal data in the following circumstances:</p>
          <ul className="list-disc pl-6 mt-2 space-y-2">
            <li>Where we need to perform the contract we are about to enter into or have entered into with you.</li>
            <li>Where it is necessary for our legitimate interests (or those of a third party) and your interests and fundamental rights do not override those interests.</li>
            <li>Where we need to comply with a legal obligation.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-serif text-white mb-4">4. Data Security</h2>
          <p>We have put in place appropriate security measures to prevent your personal data from being accidentally lost, used or accessed in an unauthorised way, altered or disclosed. In addition, we limit access to your personal data to those employees, agents, contractors and other third parties who have a business need to know.</p>
        </section>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
