import React from 'react';
import SEOPage from './SEOPage';

const DailyHoroscope: React.FC = () => {
  const faq = [
    {
      question: "What is included in the ₹21 plan?",
      answer: "The ₹21 starter plan gives you 3 years of access, a daily AI-powered horoscope, and 15 personal questions (3 per day)."
    },
    {
      question: "Is the daily horoscope personalized?",
      answer: "Yes. Unlike generic sun-sign horoscopes, Astro21 uses your exact birth details to provide a truly personalized daily forecast."
    }
  ];

  return (
    <SEOPage
      title="Daily Horoscope in Hindi & English | Rashifal Today | Astro21"
      description="Get your personalized daily horoscope on Astro21. Stay ahead with accurate Rashifal today for career, love, and health, powered by AI and Vedic wisdom."
      h1="Your Daily Horoscope — Personalized by AI, Rooted in Vedic Wisdom"
      faq={faq}
    >
      <p>
        Start your day with the guidance of the stars. Your daily horoscope on Astro21 is not just a generic prediction based on your sun sign; it is a personalized forecast generated using your unique birth details. By analyzing the current transits of the planets in relation to your natal chart, our AI-powered system provides specific insights that are relevant to your life today.
      </p>
      <p>
        Whether you are looking for guidance on a crucial business meeting, wondering about a potential romantic encounter, or simply want to know the best time to start a new project, our daily Rashifal has you covered. We provide clear and actionable advice across various life domains, including career, finance, health, and relationships, helping you make the most of every day.
      </p>
      <p>
        At Astro21, we combine the timeless principles of Vedic astrology with cutting-edge technology to deliver insights that are both accurate and easy to understand. Available in multiple languages including Hindi, English, Malayalam, Punjabi, and Marathi, our daily horoscope ensures that you stay connected with your cosmic rhythm, no matter where you are.
      </p>
    </SEOPage>
  );
};

export default DailyHoroscope;
