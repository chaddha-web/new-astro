import React from 'react';

interface TermsProps {
  onBack: () => void;
}

const Terms: React.FC<TermsProps> = ({ onBack }) => {
  return (
    <div className="relative z-10 py-20 px-6 max-w-4xl mx-auto text-mystic-100 animate-in fade-in">
      <button onClick={onBack} className="mb-8 text-gold-400 hover:text-white transition-colors flex items-center gap-2">
        <span>←</span> Back to Home
      </button>
      <h1 className="text-4xl font-serif text-white mb-8">Terms & Conditions</h1>
      
      <div className="space-y-6 text-mystic-300 leading-relaxed">
        <section>
          <h2 className="text-2xl font-serif text-white mb-4">1. Acceptance of Terms</h2>
          <p>By accessing and using Astro21, you accept and agree to be bound by the terms and provision of this agreement. In addition, when using these particular services, you shall be subject to any posted guidelines or rules applicable to such services.</p>
        </section>

        <section>
          <h2 className="text-2xl font-serif text-white mb-4">2. Description of Service</h2>
          <p>Astro21 provides users with access to a rich collection of resources, including various communications tools, forums, shopping services, personalized content and branded programming through its network of properties which may be accessed through any various medium or device now known or hereafter developed.</p>
        </section>

        <section>
          <h2 className="text-2xl font-serif text-white mb-4">3. Registration Obligations</h2>
          <p>In consideration of your use of the Service, you represent that you are of legal age to form a binding contract and are not a person barred from receiving services under the laws of applicable jurisdictions. You also agree to:</p>
          <ul className="list-disc pl-6 mt-2 space-y-2">
            <li>Provide true, accurate, current and complete information about yourself as prompted by the Service's registration form.</li>
            <li>Maintain and promptly update the Registration Data to keep it true, accurate, current and complete.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-serif text-white mb-4">4. Disclaimer of Warranties</h2>
          <p>You expressly understand and agree that your use of the service is at your sole risk. The service is provided on an "as is" and "as available" basis. Astro21 and its subsidiaries, affiliates, officers, employees, agents, partners and licensors expressly disclaim all warranties of any kind, whether express or implied.</p>
        </section>
      </div>
    </div>
  );
};

export default Terms;
