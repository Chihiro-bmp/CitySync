import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { login as loginApi } from '../../services/api';

const Login = () => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword]     = useState('');
  const [showPass, setShowPass]     = useState(false);
  const [error, setError]           = useState('');
  const [loading, setLoading]       = useState(false);
  const [focused, setFocused]       = useState(null);

  const { login, getHomePath } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await loginApi({ identifier, password });
      login(response.data.token, response.data.user);
      navigate(getHomePath(response.data.user.role));
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-6 relative overflow-hidden font-outfit">
      {/* Background Blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-lime blur-[120px] opacity-[0.03] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-cyan blur-[120px] opacity-[0.03] pointer-events-none"></div>

      <div className="w-full max-w-[420px] relative z-10">
        <div className="text-center mb-10">
          <Link to="/" className="inline-block font-barlow text-3xl font-bold tracking-tight text-txt mb-2">
            City<span className="text-lime">Sync</span>
          </Link>
          <p className="text-txt/40 text-sm font-light">Enter your credentials to access your dashboard</p>
        </div>

        <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-8 backdrop-blur-xl">
          <h2 className="text-2xl font-bold text-txt mb-6 tracking-tight">Welcome Back</h2>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm animate-shake">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-[11px] font-mono uppercase tracking-widest text-txt/30 mb-2 ml-1">Identifier</label>
              <input 
                type="text" 
                value={identifier} 
                onChange={e => setIdentifier(e.target.value)}
                onFocus={() => setFocused('id')}
                onBlur={() => setFocused(null)}
                placeholder="Email or phone number"
                required
                className={`w-full bg-white/[0.03] border rounded-xl px-4 py-3.5 text-txt placeholder:text-txt/20 outline-none transition-all duration-300 ${focused === 'id' ? 'border-lime/40 bg-white/[0.05]' : 'border-white/5'}`}
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-2 ml-1">
                <label className="block text-[11px] font-mono uppercase tracking-widest text-txt/30">Password</label>
                <a href="#" className="text-[10px] font-mono uppercase tracking-wider text-lime/60 hover:text-lime transition-colors">Forgot?</a>
              </div>
              <div className="relative">
                <input 
                  type={showPass ? 'text' : 'password'} 
                  value={password} 
                  onChange={e => setPassword(e.target.value)}
                  onFocus={() => setFocused('pw')}
                  onBlur={() => setFocused(null)}
                  placeholder="••••••••"
                  required
                  className={`w-full bg-white/[0.03] border rounded-xl px-4 py-3.5 text-txt placeholder:text-txt/20 outline-none transition-all duration-300 ${focused === 'pw' ? 'border-lime/40 bg-white/[0.05]' : 'border-white/5'}`}
                />
                <button 
                  type="button" 
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-txt/20 hover:text-txt/40 transition-colors"
                >
                  {showPass ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-lime text-bg font-bold py-4 rounded-xl mt-4 transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed group"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-bg border-t-transparent rounded-full animate-spin mx-auto"></div>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  Sign In <span className="transition-transform group-hover:translate-x-1">→</span>
                </span>
              )}
            </button>
          </form>

          <div className="mt-8 pt-8 border-t border-white/5 text-center">
            <p className="text-txt/40 text-[13px]">
              New to CitySync? <Link to="/register" className="text-lime font-medium hover:underline">Create an account</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;