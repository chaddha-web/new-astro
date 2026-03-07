import React from 'react';
import SEOPage from './SEOPage';

const KundliPage: React.FC = () => {
  const faq = [
    {
      question: "Can I get a free kundli on Astro21?",
      answer: "Yes. Astro21 offers instant kundli generation based on your birth date, time and place using Vedic astrology principles."
    },
    {
      question: "What information do I need to generate my kundli?",
      answer: "To generate an accurate Janam Kundli, you need your exact date of birth, time of birth, and place of birth."
    }
  ];

  return (
    <SEOPage
      title="Free Kundli Online | Janam Kundli Generator | Astro21"
      description="Generate your free Janam Kundli online with Astro21. Get detailed birth chart analysis, planetary positions, and personalized Vedic insights in seconds."
      h1="Generate Your Free Kundli Online in Seconds"
      faq={faq}
    >
      <p>
        Your Janam Kundli, or birth chart, is a celestial map of the heavens at the exact moment of your birth. It serves as a blueprint of your life, revealing your strengths, weaknesses, opportunities, and challenges. At Astro21, we use advanced AI algorithms rooted in traditional Vedic astrology principles to generate highly accurate and detailed Kundlis instantly.
      </p>
      <p>
        A comprehensive Kundli analysis can provide deep insights into various aspects of your life, including your personality, career prospects, financial stability, and relationships. By understanding the positions of the planets in different houses of your chart, you can gain a better perspective on why certain events occur and how you can navigate them effectively.
      </p>
      <p>
        Whether you are a seasoned astrology enthusiast or just curious about what the stars have in store for you, our free online Kundli generator is the perfect place to start. Simply enter your birth details, and within seconds, you'll have access to a wealth of information about your cosmic identity. Explore your Lagna chart, Navamsha chart, and various planetary periods (Dashas) to unlock the secrets of your destiny.
      </p>
    </SEOPage>
  );
};

export default KundliPage;
