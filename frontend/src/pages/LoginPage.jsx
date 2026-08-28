import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../store/AuthContext';
import { Layout } from '../components/Layout';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { Alert } from '../components/Alert';
import { Key, ShieldCheck, ArrowLeft } from 'lucide-react';

export const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isUnverified, setIsUnverified] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Account Recovery State
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [recoveryKey, setRecoveryKey] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const { login, recoverAccount } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (location.state?.message) {
      setSuccessMsg(location.state.message);
    }
  }, [location]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setIsUnverified(false);

    if (isRecoveryMode) {
      if (!email || !recoveryKey || !newPassword) {
        setError('Please fill in email, recovery key, and your new password.');
        return;
      }
      if (newPassword.length < 8) {
        setError('New password must be at least 8 characters long.');
        return;
      }
      setIsLoading(true);
      try {
        await recoverAccount(email, recoveryKey, newPassword);
        setSuccessMsg('Account recovered successfully! You can now log in with your new password.');
        setIsRecoveryMode(false);
        setPassword(newPassword);
      } catch (err) {
        setError(err.response?.data?.message || err.message || 'Account recovery failed. Please verify your recovery key.');
      } finally {
        setIsLoading(false);
      }
      return;
    }

    if (!email || !password) {
      setError('Please fill in both email and password.');
      return;
    }

    setIsLoading(true);

    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      const msg = err.response?.data?.message || 'Login failed. Please check your credentials.';
      setError(msg);
      if (err.response?.status === 403 || msg.toLowerCase().includes('not verified')) {
        setIsUnverified(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Layout
      title={isRecoveryMode ? 'Recover Your Account' : 'Welcome back to CloudBox'}
      subtitle={isRecoveryMode ? 'Use your personal safety net key to reset access' : 'Sign in to access your files and personal storage'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {successMsg && <Alert type="success" message={successMsg} />}
        {error && <Alert type="error" message={error} />}

        {isUnverified && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center justify-between">
            <span>Need to verify your code?</span>
            <Link
              to={`/verify-otp?email=${encodeURIComponent(email)}`}
              className="font-semibold text-amber-900 underline hover:text-amber-950"
            >
              Verify Email Now &rarr;
            </Link>
          </div>
        )}

        <Input
          id="email"
          name="email"
          type="email"
          label="Email address"
          placeholder="you@domain.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />

        {isRecoveryMode ? (
          <>
            <Input
              id="recoveryKey"
              name="recoveryKey"
              type="text"
              label="Personal Recovery Key"
              placeholder="e.g. CB-A1B2-C3D4-E5F6"
              value={recoveryKey}
              onChange={(e) => setRecoveryKey(e.target.value)}
              required
              className="font-mono text-sm uppercase tracking-wider"
            />

            <Input
              id="newPassword"
              name="newPassword"
              type="password"
              label="New Password"
              placeholder="Enter new strong password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
            />

            <div className="pt-2">
              <Button type="submit" isLoading={isLoading}>
                Recover Account & Reset Key
              </Button>
            </div>

            <button
              type="button"
              onClick={() => setIsRecoveryMode(false)}
              className="w-full inline-flex items-center justify-center space-x-1.5 text-xs text-slate-500 hover:text-slate-700 py-2"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Normal Sign In</span>
            </button>
          </>
        ) : (
          <>
            <Input
              id="password"
              name="password"
              type="password"
              label="Password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setIsRecoveryMode(true)}
                className="text-xs font-medium text-blue-600 hover:underline hover:text-blue-700"
              >
                Forgot password? Use Recovery Key
              </button>
            </div>

            <div className="pt-2">
              <Button type="submit" isLoading={isLoading}>
                Sign In
              </Button>
            </div>
          </>
        )}
      </form>

      <div className="mt-6 text-center text-sm text-slate-600">
        Don't have an account yet?{' '}
        <Link to="/signup" className="font-semibold text-blue-600 hover:text-blue-700 hover:underline">
          Create one now
        </Link>
      </div>
    </Layout>
  );
};
