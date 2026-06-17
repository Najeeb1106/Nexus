import React, { useState } from 'react';
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Button } from '../ui/Button';
import toast from 'react-hot-toast';
import axios from 'axios';

interface StripePaymentFormProps {
  amount: number;
  onSuccess: () => void;
}

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const StripePaymentForm: React.FC<StripePaymentFormProps> = ({ amount, onSuccess }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsProcessing(true);
    const toastId = toast.loading('Initiating payment intent...');
    try {
      // 1. Create Payment Intent
      const { data } = await API.post('/payments/create-intent', { 
        amount,
        description: `Stripe sandbox deposit of $${amount}`
      });

      // 2. Confirm Payment via Stripe SDK
      toast.loading('Confirming card details with Stripe...', { id: toastId });
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) throw new Error('CardElement not found');

      const result = await stripe.confirmCardPayment(data.clientSecret, {
        payment_method: {
          card: cardElement,
        }
      });

      if (result.error) {
        // Confirm fail with backend
        await API.post('/payments/confirm', { paymentIntentId: data.clientSecret.split('_secret')[0] });
        throw new Error(result.error.message || 'Payment card rejected');
      }

      if (result.paymentIntent?.status === 'succeeded') {
        // 3. Confirm with Backend
        await API.post('/payments/confirm', { paymentIntentId: result.paymentIntent.id });
        toast.success('Payment successful and processed!', { id: toastId });
        onSuccess();
      } else {
        throw new Error('Payment processing failed');
      }
    } catch (err: any) {
      toast.error(err.message || 'Payment failed', { id: toastId });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handlePay} className="space-y-4 border border-gray-100 bg-gray-50/50 p-6 rounded-xl">
      <div className="space-y-1">
        <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider">Credit or Debit Card</label>
        <div className="bg-white border border-gray-200 rounded-md p-3 focus-within:ring-2 focus-within:ring-primary-500/20 focus-within:border-primary-500 transition-all">
          <CardElement 
            options={{
              style: {
                base: {
                  fontSize: '14px',
                  color: '#0f172a',
                  '::placeholder': {
                    color: '#94a3b8',
                  },
                },
                invalid: {
                  color: '#dc2626',
                },
              },
            }}
          />
        </div>
      </div>
      <Button
        type="submit"
        variant="primary"
        fullWidth
        disabled={!stripe || isProcessing}
      >
        {isProcessing ? 'Processing...' : `Deposit $${amount}`}
      </Button>
    </form>
  );
};
