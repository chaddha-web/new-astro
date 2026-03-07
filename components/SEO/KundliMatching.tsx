import React from 'react';
import SEOPage from './SEOPage';

const KundliMatching: React.FC = () => {
  const faq = [
    {
      question: "What is kundli matching?",
      answer: "Kundli matching (kundli milan) is a Vedic astrology compatibility analysis for marriage. Astro21 compares two birth charts across 36 gunas to assess compatibility."
    },
    {
      question: "How many gunas should match for a good marriage?",
      answer: "In Vedic astrology, a match of 18 or more gunas out of 36 is considered acceptable for marriage, while 25 or more is considered a very good match."
    }
  ];

  return (
    <SEOPage
      title="Kundli Matching for Marriage | Kundli Milan | Astro21"
      description="Perform free Kundli matching for marriage online. Get a detailed 36 Guna Milan report and compatibility analysis for a happy and prosperous married life."
      h1="Kundli Matching for Marriage — 36 Guna Milan Analysis"
      faq={faq}
    >
      <p>
        Marriage is one of the most significant milestones in a person's life, and in Indian culture, ensuring compatibility between partners is of paramount importance. Kundli Matching, also known as Kundli Milan or Guna Milan, is an ancient Vedic practice that assesses the compatibility of two individuals based on their birth charts. At Astro21, we provide a detailed and accurate matching report to help you make informed decisions about your future.
      </p>
      <p>
        Our Kundli Matching process involves the analysis of eight different categories, or 'Ashtakootas', which together comprise 36 Gunas. These categories evaluate various aspects of compatibility, including mental temperament, physical attraction, health, longevity, and the potential for children. A high Guna score indicates a strong foundation for a harmonious and lasting relationship.
      </p>
      <p>
        Beyond just the Guna score, our analysis also considers critical factors like Mangal Dosha and Bhakoot Dosha, which can significantly impact marital bliss. By identifying potential challenges early on, you can seek appropriate Vedic remedies and guidance to mitigate their effects. Trust Astro21 to provide the clarity you need for a successful and happy union.
      </p>
    </SEOPage>
  );
};

export default KundliMatching;
