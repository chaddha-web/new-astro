import React, { useEffect, useState } from 'react';
import { RAZORPAY_KEY_ID, TEST_RAZORPAY_KEY } from './constants';
import { loadRazorpay } from './utils/razorpay';

export default function BezarCheckout() {
  const [status, setStatus] = useState('Initializing Secure Payment...');

  useEffect(() => {
    const init = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const amountInr = urlParams.get('amountInr'); // Total amount including 8% fee
      const holdUsd = urlParams.get('holdUsd');
      const userId = urlParams.get('userId');
      const name = urlParams.get('name') || 'Affiliate Member';
      const email = urlParams.get('email') || 'support@bezar.in';
      const mobile = urlParams.get('mobile') || '';
      const bezar_checkout = urlParams.get('bezar_checkout');

      if (!bezar_checkout || !amountInr || !holdUsd || !userId || !mobile) {
        setStatus('Invalid payment parameters. Mobile number is required.');
        return;
      }

      await loadRazorpay();
      
      const primaryKey = RAZORPAY_KEY_ID && RAZORPAY_KEY_ID.length > 5 ? RAZORPAY_KEY_ID : TEST_RAZORPAY_KEY;
      
      const options = {
        key: primaryKey,
        amount: Math.round(Number(amountInr) * 100), // Razorpay requires paise
        currency: "INR",
        name: "Bezar Ecosystem",
        description: "Affiliate Node Deposit",
        image: "https://bezar.in/logo.png",
        handler: function (response: any) {
          setStatus('Payment Successful! Confirming with Bezar...');
          if (window.opener) {
            window.opener.postMessage({
              type: 'RAZORPAY_SUCCESS',
              paymentId: response.razorpay_payment_id,
              userId,
              holdUsd
            }, "*");
          } else {
            setStatus('Payment successful, but Bezar window is missing. Please contact support.');
          }
        },
        prefill: {
          name: name,
          email: email,
          contact: mobile
        },
        send_sms_hash: false, // Attempt to disable razorpay native SMS
        theme: {
          color: "#000000"
        },
        modal: {
          ondismiss: function() {
            setStatus('Payment cancelled. You can close this window.');
          }
        }
      };

      if ((window as any).Razorpay) {
        try {
          const rzp = new (window as any).Razorpay(options);
          rzp.on('payment.failed', function (response: any) {
            setStatus('Payment failed: ' + response.error.description);
          });
          rzp.open();
        } catch (err) {
          console.error("Razorpay error", err);
          setStatus("Failed to load payment gateway.");
        }
      } else {
        setStatus("Razorpay script failed to load.");
      }
    };
    init();
  }, []);

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#000', color: '#fff', fontFamily: 'sans-serif', padding: 20, textAlign: 'center' }}>
      <div>
        <h2>Bezar Secure Payment</h2>
        <p style={{ color: '#a1a1aa', marginTop: 10 }}>{status}</p>
      </div>
    </div>
  );
}
