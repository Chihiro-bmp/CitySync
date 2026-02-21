import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTheme } from '../Layout/ThemeContext';
import { register as registerApi } from '../../services/api';
import { tokens, fonts } from '../../theme';
import { SunIcon, MoonIcon } from '../../Icons';

const steps = ['Account', 'Personal', 'Address'];

const Register = () => {
  const { isDark, toggle } = useTheme();
  const navigate = useNavigate();
  const t = tokens[isDark ? 'dark' : 'light'];

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

  const inputStyle = (name) => ({
    width:'100%', padding:'11px 14px', borderRadius:10,
    border:`1.5px solid ${focused === name ? t.primary : t.border}`,
    background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
    color:t.text, fontSize:14, fontFamily:fonts.ui, outline:'none',
    transition:'border-color 0.2s', boxSizing:'border-box',
  });

  const labelStyle = { display:'block', fontSize:12, fontWeight:500, color:t.textSub, marginBottom:6 };

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

  const stepContent = [
    // Step 0 — Account
    <>
      <div style={{ marginBottom:16 }}>
        <label style={labelStyle}>Email address</label>
        <input type="email" value={form.email} onChange={set('email')} onFocus={() => setFocused('email')} onBlur={() => setFocused(null)} placeholder="you@example.com" required style={inputStyle('email')} />
      </div>
      <div style={{ marginBottom:16 }}>
        <label style={labelStyle}>Password</label>
        <input type="password" value={form.password} onChange={set('password')} onFocus={() => setFocused('pw')} onBlur={() => setFocused(null)} placeholder="Min. 6 characters" required style={inputStyle('pw')} />
      </div>
      <div style={{ marginBottom:16 }}>
        <label style={labelStyle}>Confirm Password</label>
        <input type="password" value={form.confirmPassword} onChange={set('confirmPassword')} onFocus={() => setFocused('cpw')} onBlur={() => setFocused(null)} placeholder="Repeat password" required style={inputStyle('cpw')} />
      </div>
      <div style={{ marginBottom:4 }}>
        <label style={labelStyle}>Consumer Type</label>
        <select value={form.consumerType} onChange={set('consumerType')} style={{ ...inputStyle('ct'), cursor:'pointer' }}>
          <option value="Residential">Residential</option>
          <option value="Commercial">Commercial</option>
        </select>
      </div>
    </>,

    // Step 1 — Personal
    <>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:16 }}>
        <div>
          <label style={labelStyle}>First Name *</label>
          <input type="text" value={form.firstName} onChange={set('firstName')} onFocus={() => setFocused('fn')} onBlur={() => setFocused(null)} placeholder="Ananta" required style={inputStyle('fn')} />
        </div>
        <div>
          <label style={labelStyle}>Last Name *</label>
          <input type="text" value={form.lastName} onChange={set('lastName')} onFocus={() => setFocused('ln')} onBlur={() => setFocused(null)} placeholder="Debnath" required style={inputStyle('ln')} />
        </div>
      </div>
      <div style={{ marginBottom:16 }}>
        <label style={labelStyle}>Phone Number *</label>
        <input type="tel" value={form.phoneNumber} onChange={set('phoneNumber')} onFocus={() => setFocused('ph')} onBlur={() => setFocused(null)} placeholder="01XXXXXXXXX" required style={inputStyle('ph')} />
      </div>
      <div style={{ marginBottom:16 }}>
        <label style={labelStyle}>National ID *</label>
        <input type="text" value={form.nationalId} onChange={set('nationalId')} onFocus={() => setFocused('nid')} onBlur={() => setFocused(null)} placeholder="NID number" required style={inputStyle('nid')} />
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
        <div>
          <label style={labelStyle}>Date of Birth</label>
          <input type="date" value={form.dateOfBirth} onChange={set('dateOfBirth')} onFocus={() => setFocused('dob')} onBlur={() => setFocused(null)} style={inputStyle('dob')} />
        </div>
        <div>
          <label style={labelStyle}>Gender</label>
          <select value={form.gender} onChange={set('gender')} style={{ ...inputStyle('g'), cursor:'pointer' }}>
            <option value="">Select</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>
        </div>
      </div>
    </>,

    // Step 2 — Address
    <>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:16 }}>
        <div>
          <label style={labelStyle}>House / Flat No. *</label>
          <input type="text" value={form.houseNum} onChange={set('houseNum')} onFocus={() => setFocused('hn')} onBlur={() => setFocused(null)} placeholder="e.g. 14B" required style={inputStyle('hn')} />
        </div>
        <div>
          <label style={labelStyle}>Postal Code *</label>
          <input type="text" value={form.postalCode} onChange={set('postalCode')} onFocus={() => setFocused('pc')} onBlur={() => setFocused(null)} placeholder="e.g. 1000" required style={inputStyle('pc')} />
        </div>
      </div>
      <div style={{ marginBottom:16 }}>
        <label style={labelStyle}>Street Name *</label>
        <input type="text" value={form.streetName} onChange={set('streetName')} onFocus={() => setFocused('sn')} onBlur={() => setFocused(null)} placeholder="Motijheel Road" required style={inputStyle('sn')} />
      </div>
      <div style={{ marginBottom:16 }}>
        <label style={labelStyle}>Region / Area *</label>
        <input type="text" value={form.regionName} onChange={set('regionName')} onFocus={() => setFocused('rn')} onBlur={() => setFocused(null)} placeholder="Dhaka Central" required style={inputStyle('rn')} />
      </div>
      <div style={{ marginBottom:4 }}>
        <label style={labelStyle}>Landmark (optional)</label>
        <input type="text" value={form.landmark} onChange={set('landmark')} onFocus={() => setFocused('lm')} onBlur={() => setFocused(null)} placeholder="Near X mosque, Y school..." style={inputStyle('lm')} />
      </div>
    </>,
  ];

  return (
    <div style={{ minHeight:'100vh', background: isDark ? '#080C18' : '#F5F6FA', display:'flex', transition:'background 0.35s', fontFamily:fonts.ui }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=Syne:wght@600;700&family=JetBrains+Mono:wght@400;500&display=swap');`}</style>

      {/* Left panel */}
      <div style={{ width:'45%', background:'#0B0F1C', display:'flex', flexDirection:'column', justifyContent:'space-between', padding:'40px 48px', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:'-80px', left:'-80px', width:320, height:320, borderRadius:'50%', background:'rgba(59,111,255,0.12)', filter:'blur(80px)', pointerEvents:'none' }} />
        <div style={{ position:'absolute', bottom:'-60px', right:'-60px', width:260, height:260, borderRadius:'50%', background:'rgba(0,196,255,0.08)', filter:'blur(70px)', pointerEvents:'none' }} />

        {/* Logo */}
        <div style={{ display:'flex', alignItems:'center', gap:12, position:'relative' }}>
          <div style={{ width:40, height:40, borderRadius:11, background:'linear-gradient(135deg,#3B6FFF,#00C4FF)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 4px 14px rgba(59,111,255,0.4)' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M3 9L12 3L21 9V20C21 20.55 20.55 21 20 21H15V15H9V21H4C3.45 21 3 20.55 3 20V9Z" fill="#fff"/>
            </svg>
          </div>
          <div style={{ fontFamily:fonts.display, fontSize:18, fontWeight:700, color:'#fff' }}>CitySync</div>
        </div>

        {/* Step indicator */}
        <div style={{ position:'relative' }}>
          <div style={{ fontSize:11, fontWeight:600, color:'#3B6FFF', fontFamily:fonts.mono, letterSpacing:'0.15em', textTransform:'uppercase', marginBottom:24 }}>
            Registration
          </div>
          {steps.map((s, i) => (
            <div key={s} style={{ display:'flex', alignItems:'center', gap:14, marginBottom: i < steps.length - 1 ? 20 : 0 }}>
              {/* Step circle */}
              <div style={{
                width:32, height:32, borderRadius:'50%', flexShrink:0,
                display:'flex', alignItems:'center', justifyContent:'center',
                background: i < step ? 'linear-gradient(135deg,#3B6FFF,#00C4FF)' : i === step ? 'rgba(59,111,255,0.2)' : 'rgba(255,255,255,0.04)',
                border: i === step ? '2px solid #3B6FFF' : i < step ? 'none' : '2px solid #1E2840',
                fontSize:13, fontWeight:600, color: i <= step ? '#fff' : '#2A3550',
                transition:'all 0.3s',
              }}>
                {i < step ? '✓' : i + 1}
              </div>
              <div>
                <div style={{ fontSize:14, fontWeight: i === step ? 600 : 400, color: i === step ? '#fff' : i < step ? '#4D7DFF' : '#2A3550', transition:'color 0.3s' }}>{s}</div>
                <div style={{ fontSize:11, color:'#1E2840', fontFamily:fonts.mono }}>
                  {['Account credentials','Personal details','Home address'][i]}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ fontSize:12, color:'#2A3550', fontFamily:fonts.mono, position:'relative' }}>
          © 2026 CitySync · Dhaka, Bangladesh
        </div>
      </div>

      {/* Right panel */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'40px 32px', position:'relative' }}>

        {/* Theme toggle */}
        <button onClick={toggle} style={{ position:'absolute', top:28, right:28, display:'flex', alignItems:'center', gap:8, padding:'7px 14px 7px 8px', borderRadius:100, border:`1px solid ${t.border}`, background: isDark ? '#0F1628' : '#fff', cursor:'pointer', color:t.textSub, fontSize:13, fontFamily:fonts.ui, fontWeight:500 }}>
          <div style={{ width:26, height:26, borderRadius:'50%', background: isDark ? 'linear-gradient(135deg,#F5A623,#FFD200)' : 'linear-gradient(135deg,#3B6FFF,#00C4FF)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            {isDark ? <SunIcon size={13} /> : <MoonIcon size={13} />}
          </div>
          {isDark ? 'Light' : 'Dark'}
        </button>

        <div style={{ width:'100%', maxWidth:440 }}>
          {/* Header */}
          <div style={{ marginBottom:28 }}>
            <div style={{ fontSize:11, fontWeight:600, color:t.primary, fontFamily:fonts.mono, letterSpacing:'0.12em', textTransform:'uppercase', marginBottom:6 }}>
              Step {step + 1} of {steps.length}
            </div>
            <h1 style={{ fontFamily:fonts.ui, fontSize:22, fontWeight:600, color:t.text, letterSpacing:'-0.3px', marginBottom:5 }}>
              {['Create your account', 'Personal information', 'Your address'][step]}
            </h1>
            <p style={{ fontSize:13, color:t.textSub }}>
              {['Set up your login credentials', 'Tell us a bit about yourself', 'Where should we connect your utilities?'][step]}
            </p>
          </div>

          {/* Progress bar */}
          <div style={{ height:3, background:t.border, borderRadius:100, marginBottom:28, overflow:'hidden' }}>
            <div style={{ height:'100%', borderRadius:100, background:'linear-gradient(90deg,#3B6FFF,#00C4FF)', width:`${((step + 1) / steps.length) * 100}%`, transition:'width 0.4s ease' }} />
          </div>

          {/* Error */}
          {error && (
            <div style={{ padding:'12px 16px', borderRadius:10, marginBottom:20, background: isDark ? '#2D0C0C' : '#FEE2E2', border:`1px solid ${isDark ? '#F8717133' : '#FCA5A5'}`, color: isDark ? '#F87171' : '#B91C1C', fontSize:13 }}>
              {error}
            </div>
          )}

          {/* Step content */}
          <form onSubmit={step === steps.length - 1 ? handleSubmit : e => { e.preventDefault(); nextStep(); }}>
            {stepContent[step]}

            {/* Navigation buttons */}
            <div style={{ display:'flex', gap:12, marginTop:24 }}>
              {step > 0 && (
                <button type="button" onClick={() => { setStep(s => s - 1); setError(''); }} style={{ flex:1, padding:'12px', borderRadius:10, border:`1.5px solid ${t.border}`, background:'transparent', color:t.text, fontSize:14, fontWeight:500, fontFamily:fonts.ui, cursor:'pointer' }}>
                  Back
                </button>
              )}
              <button type="submit" disabled={loading} style={{ flex:1, padding:'12px', borderRadius:10, border:'none', background: loading ? t.textMuted : 'linear-gradient(135deg,#3B6FFF,#2952D9)', color:'#fff', fontSize:14, fontWeight:600, fontFamily:fonts.ui, cursor: loading ? 'not-allowed' : 'pointer', boxShadow: loading ? 'none' : '0 4px 14px rgba(59,111,255,0.3)', transition:'all 0.2s' }}>
                {loading ? 'Creating account...' : step === steps.length - 1 ? 'Create Account' : 'Continue'}
              </button>
            </div>
          </form>

          <p style={{ textAlign:'center', fontSize:13, color:t.textSub, marginTop:20 }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color:t.primary, fontWeight:600, textDecoration:'none' }}>Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;