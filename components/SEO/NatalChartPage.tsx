import React from 'react';
import SEOPage from './SEOPage';

const NatalChartPage: React.FC = () => {
  const faq = [
    {
      question: "What is a natal chart?",
      answer: "A natal chart, or birth chart, is a map of the planetary positions at the exact time and place of your birth."
    },
    {
      question: "How is a natal chart different from a Kundli?",
      answer: "While both are birth charts, a natal chart typically refers to the Western astrology format, whereas a Kundli follows Vedic astrology principles."
    }
  ];

  return (
    <SEOPage
      title="Natal Chart Online | Western Astrology Birth Chart | Astro21"
      description="Generate your free Western astrology natal chart online with Astro21. Get a detailed birth chart analysis and explore your planetary influences."
      h1="Your Natal Chart — Western Astrology Birth Chart Analysis"
      faq={faq}
    >
      <p>
        Your natal chart is a unique celestial snapshot of the heavens at the moment you were born. In Western astrology, this chart serves as a powerful tool for self-discovery and personal growth. By analyzing the positions of the Sun, Moon, and planets in the twelve zodiac signs and houses, you can gain profound insights into your personality, motivations, and life purpose.
      </p>
      <p>
        At Astro21, we provide a comprehensive online natal chart generator that allows you to explore your cosmic identity in detail. Our tool calculates the exact degrees of your planetary placements and provides a clear and easy-to-understand analysis of their meanings. Whether you are an Aries, a Leo, or a Scorpio, your natal chart reveals the complex interplay of energies that make you who you are.
      </p>
      <p>
        Understanding your natal chart can help you navigate life's challenges with greater awareness and confidence. By identifying your natural talents and potential areas of growth, you can make more informed choices about your career, relationships, and personal development. Embark on a journey of self-exploration with Astro21 and unlock the wisdom of your Western astrology birth chart today.
      </p>
    </SEOPage>
  );
};

export default NatalChartPage;
