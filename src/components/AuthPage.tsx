import React, { useState, useEffect } from 'react';
import { WhaleAnimation } from './WhaleAnimation';
import { FlyingWhalesLogo } from './FlyingWhalesLogo';
import { User } from '../types';
import {
  AlertCircle,
  Sun,
  Moon,
  Eye,
  EyeOff,
} from 'lucide-react';

interface AuthPageProps {
  onAuthSuccess?: (user: User, token: string) => void;
  onLoginSuccess?: (user: User, token: string) => void;
  darkMode?: boolean;
  onToggleDarkMode?: () => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({
  onAuthSuccess,
  onLoginSuccess,
  darkMode = false,
  onToggleDarkMode,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Login ID + Password state
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Load remembered Login ID
  useEffect(() => {
    try {
      const savedId = localStorage.getItem('fw_saved_login_id') || localStorage.getItem('fw_saved_employee_id');
      if (savedId) {
        setLoginId(savedId);
      }
    } catch {
      // ignore
    }
  }, []);

  const handleSuccess = (user: User, token: string) => {
    try {
      if (loginId.trim()) {
        localStorage.setItem('fw_saved_login_id', loginId.trim());
      }
    } catch {
      // ignore
    }

    if (onLoginSuccess) {
      onLoginSuccess(user, token);
    } else if (onAuthSuccess) {
      onAuthSuccess(user, token);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanLoginId = loginId.trim();

    if (!cleanLoginId) {
      setError('Please enter your Login ID.');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          loginId: cleanLoginId,
          password,
        }),
      });

      // Robust response parsing: safely handle status, Content-Type, and response body
      const contentType = res.headers.get('content-type') || '';
      const rawText = await res.text();
      let data: any = null;

      if (rawText && rawText.trim()) {
        try {
          data = JSON.parse(rawText);
        } catch (parseErr) {
          console.error('[AUTH API] Non-JSON response received:', {
            status: res.status,
            contentType,
            preview: rawText.slice(0, 300),
            parseErr,
          });
        }
      }

      if (!res.ok) {
        let userMessage = 'Authentication failed. Please check your credentials.';
        if (data && (data.error || data.message)) {
          userMessage = data.error || data.message;
        } else if (res.status === 401) {
          userMessage = 'Invalid Login ID or password. Please verify your credentials.';
        } else if (res.status === 403) {
          userMessage = 'This employee account is inactive. Please contact your administrator.';
        } else if (res.status === 404) {
          userMessage = 'Login service endpoint not reachable (404). Please verify deployment configuration.';
        } else if (res.status >= 500) {
          userMessage = 'Login service temporarily unavailable. Please try again in a moment.';
        }
        throw new Error(userMessage);
      }

      if (!data || !data.user) {
        console.error('[AUTH API] Missing user object in login response:', data);
        throw new Error('Invalid response received from server. Please try again.');
      }

      handleSuccess(data.user, data.token);
    } catch (err: any) {
      console.error('[LOGIN ERROR]', err);
      const rawMessage = err?.message || '';
      // Ensure syntax errors or unexpected tokens are NEVER shown to the user
      if (
        rawMessage.includes('Unexpected token') ||
        rawMessage.includes('is not valid JSON') ||
        rawMessage.includes('JSON.parse')
      ) {
        setError('Login service temporarily unavailable. Please try again.');
      } else {
        setError(rawMessage || 'Authentication failed. Please check your credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`min-h-screen w-full flex items-center justify-center p-4 transition-colors duration-200 ${
        darkMode ? 'bg-slate-950' : 'bg-slate-100'
      }`}
    >
      <div className="w-full max-w-[1020px] bg-white dark:bg-slate-900 rounded-2xl shadow-xl overflow-hidden flex flex-col lg:flex-row border border-slate-200 dark:border-slate-800">
        {/* Left Side: Original Approved Whale Animation Stage */}
        <div className="hidden lg:block lg:w-1/2 relative overflow-hidden bg-[#020914] min-h-[550px]">
          <WhaleAnimation dark={darkMode} />
        </div>

        {/* Right Side: Simple Original Sign-In Form */}
        <div className="w-full lg:w-1/2 p-8 sm:p-10 lg:p-12 flex flex-col justify-between">
          <div>
            {/* Top Row: Logo + Theme Toggle */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <FlyingWhalesLogo size={36} />
                <div>
                  <h2 className="text-base font-bold tracking-tight text-slate-900 dark:text-white leading-tight">
                    Flying Whales
                  </h2>
                  <p className="text-xs text-sky-600 dark:text-sky-400 font-medium">
                    Ad Films
                  </p>
                </div>
              </div>

              {onToggleDarkMode && (
                <button
                  type="button"
                  id="auth-theme-toggle"
                  onClick={onToggleDarkMode}
                  className="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                >
                  {darkMode ? (
                    <Sun className="w-4 h-4 text-amber-400" />
                  ) : (
                    <Moon className="w-4 h-4 text-slate-500" />
                  )}
                </button>
              )}
            </div>

            {/* Title & Simple Welcome Copy */}
            <div className="mb-6">
              <h3 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                Sign In
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                Welcome to Flying Whales Ad Filming Company.<br />
                Sign in to enter and manage your Flying Whales data.
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div
                id="auth-error-message"
                className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2.5"
              >
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
                <span className="leading-snug">{error}</span>
              </div>
            )}

            {/* Sign In Form */}
            <form onSubmit={handleSignIn} className="space-y-4">
              <div>
                <label
                  htmlFor="auth-login-id-input"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  Login ID
                </label>
                <input
                  id="auth-login-id-input"
                  type="text"
                  required
                  autoComplete="username"
                  value={loginId}
                  onChange={(e) => setLoginId(e.target.value)}
                  placeholder="e.g. employee@id"
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-[#1a66c2] dark:focus:border-sky-400 transition-colors"
                />
              </div>

              <div>
                <label
                  htmlFor="auth-password-input"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  Password
                </label>
                <div className="relative">
                  <input
                    id="auth-password-input"
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full pl-3.5 pr-10 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-[#1a66c2] dark:focus:border-sky-400 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <button
                id="auth-sign-in-btn"
                type="submit"
                disabled={loading}
                className="w-full mt-3 py-2.5 px-4 rounded-xl bg-[#1a66c2] hover:bg-[#1555a3] text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {loading ? (
                  <span>Signing in...</span>
                ) : (
                  <span>Sign In</span>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
