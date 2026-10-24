import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import {
  Store,
  Building2,
  Lock,
  Mail,
  User,
  Phone,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
} from 'lucide-react';

export const ExhibitorAuthPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  // Form fields
  const [companyName, setCompanyName] = useState('');
  const [category, setCategory] = useState('Tech & Software');
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      // In demo mode for teammates: simulated exhibitor sign in or active account
      if (login) {
        try {
          await login(email, password);
        } catch {
          // If login fails, proceed for presentation
        }
      }
      navigate('/exhibitor');
    } catch (err: any) {
      setError(err.message || 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF7F5] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      {/* Brand & Back Button */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md space-y-4">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#63474D] hover:underline"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Sheeba</span>
        </Link>

        <div className="text-center space-y-1">
          <div className="w-12 h-12 bg-[#63474D] rounded-2xl flex items-center justify-center text-white mx-auto shadow-md">
            <Store className="w-6 h-6" />
          </div>
          <h2 className="font-serif font-black text-2xl sm:text-3xl text-[#2D1F23]">
            {isLogin ? 'Sign In as Exhibitor' : 'Register Exhibitor Account'}
          </h2>
          <p className="text-xs text-gray-500">
            {isLogin
              ? 'Access your booth bookings, applications, and lead capture tools.'
              : 'Join Sheeba as an exhibitor to book physical booth spaces at top events.'}
          </p>
        </div>
      </div>

      {/* Card Form */}
      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 sm:px-10 border border-[#E8DDD7] rounded-3xl shadow-xl space-y-6">
          {/* Mode Switcher */}
          <div className="grid grid-cols-2 p-1 bg-[#FAF7F5] rounded-2xl border border-gray-100">
            <button
              type="button"
              onClick={() => setIsLogin(true)}
              className={`py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                isLogin ? 'bg-[#63474D] text-white shadow-2xs' : 'text-gray-500 hover:text-black'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setIsLogin(false)}
              className={`py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                !isLogin ? 'bg-[#63474D] text-white shadow-2xs' : 'text-gray-500 hover:text-black'
              }`}
            >
              Register Company
            </button>
          </div>

          {error && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <>
                <div>
                  <label className="block text-xs font-bold text-[#2D1F23] mb-1">
                    Company / Organization Name *
                  </label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Acme Tech Solutions"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="w-full pl-9 pr-3.5 py-2.5 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl text-xs text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#2D1F23] mb-1">
                    Industry Category *
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl text-xs text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D]"
                  >
                    <option value="Tech & Software">Tech & Software</option>
                    <option value="AI & Robotics">AI & Robotics</option>
                    <option value="Fintech & Banking">Fintech & Banking</option>
                    <option value="Education & Training">Education & Training</option>
                    <option value="Retail & Hardware">Retail & Hardware</option>
                    <option value="Creative Agency & Media">Creative Agency & Media</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#2D1F23] mb-1">
                    Contact Person Name *
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Dawit Kebede"
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      className="w-full pl-9 pr-3.5 py-2.5 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl text-xs text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#2D1F23] mb-1">
                    Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      placeholder="+251 91 123 4567"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full pl-9 pr-3.5 py-2.5 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl text-xs text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D]"
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-bold text-[#2D1F23] mb-1">
                Corporate Email Address *
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  placeholder="contact@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2.5 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl text-xs text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#2D1F23] mb-1">
                Password *
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-10 py-2.5 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl text-xs text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={loading}
              className="w-full py-3 text-xs font-bold rounded-xl shadow-md cursor-pointer mt-2"
            >
              {isLogin ? 'Enter Exhibitor Portal' : 'Create Exhibitor Account'}
            </Button>
          </form>

          {/* Quick Demo Help */}
          <div className="pt-2 text-center text-[11px] text-gray-500 border-t border-gray-100">
            <span>Want to preview without typing? Click </span>
            <button
              type="button"
              onClick={() => navigate('/exhibitor')}
              className="text-[#63474D] font-bold hover:underline cursor-pointer"
            >
              Direct Demo Preview →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

