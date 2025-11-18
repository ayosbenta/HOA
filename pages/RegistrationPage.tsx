import React, { useState } from 'react';
import { apiRegister, RegistrationPayload } from '../services/googleSheetsApi';
import { Building, CheckCircle } from 'lucide-react';

interface RegistrationPageProps {
  onNavigateToLogin: () => void;
}

const RegistrationPage: React.FC<RegistrationPageProps> = ({ onNavigateToLogin }) => {
  const [formData, setFormData] = useState<RegistrationPayload>({
    fullName: '',
    email: '',
    phone: '',
    block: '',
    lot: '',
    password: '',
  });
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prevState => ({ ...prevState, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (isNaN(Number(formData.block)) || isNaN(Number(formData.lot))) {
        setError('Block and Lot must be numbers.');
        return;
    }

    setLoading(true);
    try {
      const result = await apiRegister(formData);
      setSuccessMessage(result.message);
    } catch (err) {
      if (err instanceof Error) {
        setError(`Registration failed: ${err.message}`);
      } else {
        setError('An unexpected error occurred during registration.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (successMessage) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
        <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-2xl shadow-lg text-center">
          <div className="inline-block p-3 bg-green-100 rounded-full mb-4">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Registration Successful!</h1>
          <p className="text-gray-600">{successMessage}</p>
          <button
            onClick={onNavigateToLogin}
            className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-brand-primary hover:bg-brand-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-secondary transition-colors"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-2xl shadow-lg">
        <div className="text-center">
          <div className="inline-block p-3 bg-brand-light rounded-full mb-4">
            <Building className="h-10 w-10 text-brand-primary" />
          </div>
          <h1 className="text-3xl font-extrabold text-brand-dark">Request an Account</h1>
          <p className="mt-2 text-gray-600">Enter your details to register</p>
        </div>
        <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
          <input name="fullName" type="text" required className="appearance-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-brand-secondary focus:border-brand-secondary sm:text-sm" placeholder="Full Name" value={formData.fullName} onChange={handleChange} />
          <input name="email" type="email" required className="appearance-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-brand-secondary focus:border-brand-secondary sm:text-sm" placeholder="Email Address" value={formData.email} onChange={handleChange} />
          <input name="phone" type="tel" required className="appearance-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-brand-secondary focus:border-brand-secondary sm:text-sm" placeholder="Phone Number" value={formData.phone} onChange={handleChange} />
          <div className="grid grid-cols-2 gap-4">
            <input name="block" type="number" required className="appearance-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-brand-secondary focus:border-brand-secondary sm:text-sm" placeholder="Block" value={formData.block} onChange={handleChange} />
            <input name="lot" type="number" required className="appearance-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-brand-secondary focus:border-brand-secondary sm:text-sm" placeholder="Lot" value={formData.lot} onChange={handleChange} />
          </div>
          <input name="password" type="password" required className="appearance-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-brand-secondary focus:border-brand-secondary sm:text-sm" placeholder="Password" value={formData.password} onChange={handleChange} />
          <input name="confirmPassword" type="password" required className="appearance-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-brand-secondary focus:border-brand-secondary sm:text-sm" placeholder="Confirm Password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
          
          {error && <p className="text-sm text-red-600 text-center whitespace-pre-wrap">{error}</p>}

          <div>
            <button type="submit" disabled={loading} className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-brand-primary hover:bg-brand-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-secondary transition-colors disabled:bg-gray-400">
              {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : 'Register'}
            </button>
          </div>

          <p className="text-center text-sm text-gray-500">
            Already have an account?{' '}
            <a href="#" onClick={(e) => { e.preventDefault(); onNavigateToLogin(); }} className="font-medium text-brand-primary hover:text-brand-secondary">
              Sign in
            </a>
          </p>
        </form>
      </div>
    </div>
  );
};

export default RegistrationPage;
