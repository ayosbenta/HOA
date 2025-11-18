import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
// fix: Replaced non-existent `UserShield` icon with `UserCog`.
import { Building, UserCog, User as UserIcon, ShieldCheck } from 'lucide-react';
import { UserRole } from '../types';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const performLogin = async (emailToLogin: string, passwordToLogin: string) => {
    setError('');
    setLoading(true);
    try {
        const user = await login(emailToLogin, passwordToLogin);
        if (!user) {
            // This case handles correct API response but invalid credentials
            setError('Invalid username or password. Please try again.');
        }
        // Successful login is handled by the AuthContext, which will re-render the app
    } catch (err) {
        // This case handles API errors (e.g., network, server error)
        if (err instanceof Error) {
            if (err.message.includes("Failed to fetch")) {
                setError("Login failed: Could not connect to the server. Please check your internet connection and ensure the backend script is deployed correctly.");
            } else {
                setError(`Login failed:\n${err.message}`);
            }
        } else {
            setError('An unexpected error occurred. Please try again later.');
        }
    } finally {
        setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await performLogin(email, password);
  };

  const handleQuickLogin = async (role: UserRole) => {
    let credentials = { email: '', password: '' };
    if (role === UserRole.ADMIN) {
      credentials.email = 'admin@gmail.com';
      credentials.password = 'admin';
    } else if (role === UserRole.HOMEOWNER) {
      credentials.email = 'john.doe@home.com';
      credentials.password = 'password';
    } else if (role === UserRole.STAFF) {
        credentials.email = 'staff@hoa.com';
        credentials.password = 'password';
    }
    await performLogin(credentials.email, credentials.password);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-2xl shadow-lg">
        <div className="text-center">
            <div className="inline-block p-3 bg-brand-light rounded-full mb-4">
                <Building className="h-10 w-10 text-brand-primary" />
            </div>
            <h1 className="text-3xl font-extrabold text-brand-dark">HOAConnect PH</h1>
            <p className="mt-2 text-gray-600">Sign in to your account</p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email-address" className="sr-only">
                Email address
              </label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-brand-secondary focus:border-brand-secondary focus:z-10 sm:text-sm"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-brand-secondary focus:border-brand-secondary focus:z-10 sm:text-sm"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {error && <p className="text-sm text-red-600 text-center whitespace-pre-wrap">{error}</p>}

          <div className="flex items-center justify-between">
            <div className="text-sm">
              <a href="#" className="font-medium text-brand-primary hover:text-brand-secondary">
                Forgot your password?
              </a>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-brand-primary hover:bg-brand-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-secondary transition-colors disabled:bg-gray-400"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                'Sign in'
              )}
            </button>
          </div>
          <div className="mt-6">
            <div className="relative">
                <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-gray-500">
                        Or quick login as
                    </span>
                </div>
            </div>

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                    type="button"
                    onClick={() => handleQuickLogin(UserRole.ADMIN)}
                    disabled={loading}
                    className="w-full inline-flex justify-center items-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                >
                    {/* fix: Replaced non-existent `UserShield` icon with `UserCog`. */}
                    <UserCog className="mr-2 h-5 w-5 text-red-500" />
                    Admin
                </button>
                <button
                    type="button"
                    onClick={() => handleQuickLogin(UserRole.HOMEOWNER)}
                    disabled={loading}
                    className="w-full inline-flex justify-center items-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                >
                    <UserIcon className="mr-2 h-5 w-5 text-green-500" />
                    Homeowner
                </button>
                <button
                    type="button"
                    onClick={() => handleQuickLogin(UserRole.STAFF)}
                    disabled={loading}
                    className="w-full inline-flex justify-center items-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                >
                    <ShieldCheck className="mr-2 h-5 w-5 text-blue-500" />
                    Staff
                </button>
            </div>
          </div>
          <p className="text-center text-sm text-gray-500">
            Don't have an account?{' '}
            <a href="#" className="font-medium text-brand-primary hover:text-brand-secondary">
              Request one
            </a>
          </p>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
