import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { register as registerApi } from '../../services/api';

const steps = ['Account', 'Personal', 'Address'];

const Register = () => {
  const navigate = useNavigate();

  const [step, setStep]       = useState(0);
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(null);
  const [form, setForm]       = useState({
    email:'', password:'', confirmPassword:'',
    firstName:'', lastName:'', phoneNumber:'', nationalId:'',
    dateOfBirth:'', gender:'',
    houseNum:'', streetName:'', landmark:'', regionName:'', postalCode:'',
    consumerType:'Residential',
  });

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  const validateStep = () => {
    if (step === 0) {
      if (!form.email || !form.password || !form.confirmPassword) return 'All fields are required';
      if (form.password !== form.confirmPassword) return 'Passwords do not match';
      if (form.password.length < 6) return 'Password must be at least 6 characters';
    }
    if (step === 1) {
      if (!form.firstName || !form.lastName || !form.phoneNumber || !form.nationalId) return 'All required fields must be filled';
    }
    if (step === 2) {
      if (!form.houseNum || !form.streetName || !form.regionName || !form.postalCode) return 'All address fields are required';
    }
    return null;
  };

  const nextStep = () => {
    const err = validateStep();
    if (err) { setError(err); return; }
    setError('');
    setStep(s => s + 1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const err = validateStep();
    if (err) { setError(err); return; }
    setLoading(true);
    setError('');
    try {
      await registerApi(form);
      navigate('/login', { state: { registered: true } });
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const inputClasses = (name) => `w-full bg-white/[0.03] border rounded-xl px-4 py-3 text-txt placeholder:text-txt/20 outline-none transition-all duration-300 ${focused === name ? 'border-lime/40 bg-white/[0.05]' : 'border-white/5'}`;
  const labelClasses = "block text-[10px] font-mono uppercase tracking-[0.14em] text-txt/30 mb-2 ml-1";

  const renderStep = () => {
    switch(step) {
      case 0:
        return (
          <div className="space-y-4 animate-fade-in">
            <div>
              <label className={labelClasses}>Email Address</label>
              <input type="email" value={form.email} onChange={set('email')} onFocus={() => setFocused('email')} onBlur={() => setFocused(null)} placeholder="you@example.com" required className={inputClasses('email')} />
            </div>
            <div>
              <label className={labelClasses}>Password</label>
              <input type="password" value={form.password} onChange={set('password')} onFocus={() => setFocused('pw')} onBlur={() => setFocused(null)} placeholder="Min. 6 characters" required className={inputClasses('pw')} />
            </div>
            <div>
              <label className={labelClasses}>Confirm Password</label>
              <input type="password" value={form.confirmPassword} onChange={set('confirmPassword')} onFocus={() => setFocused('cpw')} onBlur={() => setFocused(null)} placeholder="Repeat password" required className={inputClasses('cpw')} />
            </div>
            <div>
              <label className={labelClasses}>Consumer Type</label>
              <select value={form.consumerType} onChange={set('consumerType')} className={inputClasses('ct')}>
                <option value="Residential">Residential</option>
                <option value="Commercial">Commercial</option>
              </select>
            </div>
          </div>
        );
      case 1:
        return (
          <div className="space-y-4 animate-fade-in">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClasses}>First Name</label>
                <input type="text" value={form.firstName} onChange={set('firstName')} onFocus={() => setFocused('fn')} onBlur={() => setFocused(null)} placeholder="John" required className={inputClasses('fn')} />
              </div>
              <div>
                <label className={labelClasses}>Last Name</label>
                <input type="text" value={form.lastName} onChange={set('lastName')} onFocus={() => setFocused('ln')} onBlur={() => setFocused(null)} placeholder="Doe" required className={inputClasses('ln')} />
              </div>
            </div>
            <div>
              <label className={labelClasses}>Phone Number</label>
              <input type="tel" value={form.phoneNumber} onChange={set('phoneNumber')} onFocus={() => setFocused('ph')} onBlur={() => setFocused(null)} placeholder="01XXXXXXXXX" required className={inputClasses('ph')} />
            </div>
            <div>
              <label className={labelClasses}>National ID (NID)</label>
              <input type="text" value={form.nationalId} onChange={set('nationalId')} onFocus={() => setFocused('nid')} onBlur={() => setFocused(null)} placeholder="NID number" required className={inputClasses('nid')} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClasses}>Birth Date</label>
                <input type="date" value={form.dateOfBirth} onChange={set('dateOfBirth')} onFocus={() => setFocused('dob')} onBlur={() => setFocused(null)} className={inputClasses('dob')} />
              </div>
              <div>
                <label className={labelClasses}>Gender</label>
                <select value={form.gender} onChange={set('gender')} className={inputClasses('g')}>
                  <option value="">Select</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-4 animate-fade-in">
            <div className="grid grid-cols-5 gap-4">
              <div className="col-span-2">
                <label className={labelClasses}>House No.</label>
                <input type="text" value={form.houseNum} onChange={set('houseNum')} onFocus={() => setFocused('hn')} onBlur={() => setFocused(null)} placeholder="14B" required className={inputClasses('hn')} />
              </div>
              <div className="col-span-3">
                <label className={labelClasses}>Postal Code</label>
                <input type="text" value={form.postalCode} onChange={set('postalCode')} onFocus={() => setFocused('pc')} onBlur={() => setFocused(null)} placeholder="1212" required className={inputClasses('pc')} />
              </div>
            </div>
            <div>
              <label className={labelClasses}>Street Name</label>
              <input type="text" value={form.streetName} onChange={set('streetName')} onFocus={() => setFocused('sn')} onBlur={() => setFocused(null)} placeholder="Motijheel Road" required className={inputClasses('sn')} />
            </div>
            <div>
              <label className={labelClasses}>Region / Area</label>
              <input type="text" value={form.regionName} onChange={set('regionName')} onFocus={() => setFocused('rn')} onBlur={() => setFocused(null)} placeholder="Dhaka Central" required className={inputClasses('rn')} />
            </div>
            <div>
              <label className={labelClasses}>Landmark (Optional)</label>
              <input type="text" value={form.landmark} onChange={set('landmark')} onFocus={() => setFocused('lm')} onBlur={() => setFocused(null)} placeholder="Near X Mosque" className={inputClasses('lm')} />
            </div>
          </div>
        );
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-6 relative overflow-hidden font-outfit">
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-lime blur-[120px] opacity-[0.03] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-cyan blur-[120px] opacity-[0.03] pointer-events-none"></div>

      <div className="w-full max-w-[480px] relative z-10">
        <div className="text-center mb-8">
          <Link to="/" className="inline-block font-barlow text-3xl font-bold tracking-tight text-txt mb-2">
            City<span className="text-lime">Sync</span>
          </Link>
          <div className="flex items-center justify-center gap-2">
            {steps.map((s, i) => (
              <React.Fragment key={s}>
                <div className={`text-[9px] font-mono uppercase tracking-widest ${i <= step ? 'text-lime' : 'text-txt/20'}`}>{s}</div>
                {i < steps.length - 1 && <div className="w-4 h-[1px] bg-white/5"></div>}
              </React.Fragment>
            ))}
          </div>
        </div>

        <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-8 backdrop-blur-xl">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-txt tracking-tight">Create Account</h2>
            <div className="h-1 bg-white/5 rounded-full mt-4 overflow-hidden">
                <div 
                    className="h-full bg-lime transition-all duration-500" 
                    style={{ width: `${((step + 1) / steps.length) * 100}%` }}
                ></div>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={step === steps.length - 1 ? handleSubmit : e => { e.preventDefault(); nextStep(); }}>
            {renderStep()}

            <div className="flex gap-3 mt-8">
              {step > 0 && (
                <button 
                  type="button" 
                  onClick={() => { setStep(s => s - 1); setError(''); }}
                  className="flex-1 bg-white/5 border border-white/10 text-txt/60 font-medium py-3.5 rounded-xl transition-all hover:bg-white/10 hover:text-txt"
                >
                  Back
                </button>
              )}
              <button 
                type="submit" 
                disabled={loading}
                className="flex-[2] bg-lime text-bg font-bold py-3.5 rounded-xl transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
              >
                {loading ? (
                    <div className="w-5 h-5 border-2 border-bg border-t-transparent rounded-full animate-spin mx-auto"></div>
                ) : (
                    step === steps.length - 1 ? 'Complete Setup' : 'Continue'
                )}
              </button>
            </div>
          </form>

          <div className="mt-8 pt-8 border-t border-white/5 text-center">
            <p className="text-txt/40 text-[13px]">
              Already have an account? <Link to="/login" className="text-lime font-medium hover:underline">Sign In</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;