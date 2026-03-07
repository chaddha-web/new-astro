import React from 'react';
import SEOPage from './SEOPage';

const TalkToAstrologer: React.FC = () => {
  const faq = [
    {
      question: "How do I talk to an astrologer online on Astro21?",
      answer: "Sign up for just ₹21, browse verified Vedic astrologers, and start a live chat, voice or video session instantly."
    },
    {
      question: "Are the astrologers on Astro21 verified?",
      answer: "Yes, every astrologer on our platform undergoes a rigorous multi-stage verification process to ensure accuracy and authenticity."
    }
  ];

  return (
    <SEOPage
      title="Talk to Astrologer Online India | Live Chat & Video | Astro21"
      description="Connect with India's best Vedic astrologers online. Get instant guidance on career, love, and health via live chat, voice, or video calls. Start for just ₹21."
      h1="Talk to a Verified Astrologer Online — Anytime, Instantly"
      faq={faq}
    >
      <p>
        In today's fast-paced world, finding clarity and direction can be challenging. Whether you are facing hurdles in your career, confusion in your love life, or seeking spiritual growth, talking to an expert astrologer can provide the insights you need. Astro21 brings the wisdom of ancient Vedic astrology to your fingertips, connecting you with verified professionals who can guide you through life's most complex questions.
      </p>
      <p>
        Our platform is designed to provide a seamless and private consultation experience. You can choose to connect with your preferred astrologer via live chat for quick queries, or opt for voice and video calls for a more in-depth analysis. With experts specializing in Vedic astrology, Vastu Shastra, Numerology, and Tarot, you are sure to find the right guidance for your unique situation.
      </p>
      <p>
        At Astro21, we believe that quality astrological guidance should be accessible to everyone. That's why we've made it possible for you to start your journey for just ₹21. This small step can lead to profound changes in how you perceive your destiny and manage your future. Join thousands of satisfied users who have found their path with the help of our expert astrologers.
      </p>
    </SEOPage>
  );
};

export default TalkToAstrologer;
