import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../store/AuthContext';
import { Layout } from '../components/Layout';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { Alert } from '../components/Alert';
import { ShieldCheck, Mail } from 'lucide-react';

export const VerifyOtpPage = () => {
  const [searchParams] = useSearchParams();
  const emailParam = searchParams.get('email') || '';

  const [email, setEmail] = useState(emailParam);
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { verifyOtp, signup } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (emailParam) {
      setEmail(emailParam);
    }
  }, [emailParam]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!email) {
      setError('Please provide your email address.');
      return;
    }

    if (!otp || otp.trim().length !== 6) {
      setError('Please enter the full 6-digit verification code.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await verifyOtp(email, otp);
      setSuccess(res.message || 'Email verified successfully!');
      setTimeout(() => {
        navigate('/login', {
          state: { message: 'Account verified! Enter your password to log in.' }
        });
      }, 1200);
    } catch (err) {
      const msg = err.response?.data?.message || 'Invalid or expired code. Please try again.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) {
      setError('Please enter your email address first.');
      return;
    }
    setError('');
    setSuccess('');
    setIsLoading(true);
    try {
      // Re-trigger signup logic to resend OTP code
      await signup(email, 'dummy_resend_trigger');
      setSuccess('A new verification code has been sent to your email.');
    } catch (err) {
      // Even if signup rejects because pass changed or existing user, message is handled
      const msg = err.response?.data?.message || 'Resent verification email if account exists.';
      if (msg.includes('already exists')) {
        setSuccess('Check your email inbox for your 6-digit code.');
      } else {
        setError(msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Layout
      title="Check your email"
      subtitle={
        email ? (
          <span className="flex items-center justify-center sm:justify-start gap-1">
            <Mail className="w-4 h-4 text-blue-500 inline" /> We sent a code to <strong className="text-slate-700">{email}</strong>
          </span>
        ) : (
          'Enter the 6-digit code sent to your inbox'
        )
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert type="error" message={error} />}
        {success && <Alert type="success" message={success} />}

        {!emailParam && (
          <Input
            id="email"
            name="email"
            type="email"
            label="Email address"
            placeholder="you@domain.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        )}

        <Input
          id="otp"
          name="otp"
          type="text"
          label="6-Digit Verification Code"
          placeholder="e.g. 123456"
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
          maxLength={6}
          required
          className="text-center tracking-widest text-lg font-mono"
        />

        <div className="pt-2">
          <Button type="submit" isLoading={isLoading}>
            Verify Account
          </Button>
        </div>
      </form>

      <div className="mt-6 text-center text-xs text-slate-500 space-y-2">
        <div>
          Didn't receive a code?{' '}
          <button
            type="button"
            onClick={handleResend}
            disabled={isLoading}
            className="font-semibold text-blue-600 hover:underline hover:text-blue-700 focus:outline-none"
          >
            Resend Code
          </button>
        </div>
        <div>
          <Link to="/login" className="text-slate-400 hover:text-slate-600">
            Back to Sign in
          </Link>
        </div>
      </div>
    </Layout>
  );
};
