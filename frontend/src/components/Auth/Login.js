import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../Layout/ThemeContext';
import { login as loginApi } from '../../services/api';
import { tokens, fonts } from '../../theme';
import { SunIcon, MoonIcon } from '../../Icons';

const Login = () => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword]     = useState('');
  const [showPass, setShowPass]     = useState(false);
  const [error, setError]           = useState('');
  const [loading, setLoading]       = useState(false);
  const [focused, setFocused]       = useState(null);

  const { login, getHomePath } = useAuth();
  const { isDark, toggle } = useTheme();
  const navigate = useNavigate();
  const t = tokens[isDark ? 'dark' : 'light'];

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

  const inputStyle = (name) => ({
    width: '100%',
    padding: '12px 16px',
    borderRadius: 10,
    border: `1.5px solid ${focused === name ? t.primary : t.border}`,
    background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
    color: t.text,
    fontSize: 14,
    fontFamily: fonts.ui,
    outline: 'none',
    transition: 'border-color 0.2s',
    boxSizing: 'border-box',
  });

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

        {/* Center content */}
        <div style={{ position:'relative' }}>
          <div style={{ fontSize:11, fontWeight:600, color:'#3B6FFF', fontFamily:fonts.mono, letterSpacing:'0.15em', textTransform:'uppercase', marginBottom:16 }}>
            Dhaka Utility Management
          </div>
          <h2 style={{ fontFamily:fonts.ui, fontSize:30, fontWeight:600, color:'#fff', letterSpacing:'-0.5px', lineHeight:1.3, marginBottom:16 }}>
            Managing the city's utilities, one connection at a time.
          </h2>
          <p style={{ fontSize:14, color:'#4A5C78', lineHeight:1.7 }}>
            Electricity, water, and gas services for Dhaka residents — tracked, billed, and managed in one place.
          </p>
          <div style={{ display:'flex', gap:10, marginTop:32, flexWrap:'wrap' }}>
            {[
              { label:'Electricity', grad:'linear-gradient(135deg,#F5A623,#FF5733)' },
              { label:'Water',       grad:'linear-gradient(135deg,#00C4FF,#0057B8)' },
              { label:'Gas',         grad:'linear-gradient(135deg,#FF4E6A,#C2003F)' },
            ].map(u => (
              <div key={u.label} style={{ padding:'5px 14px', borderRadius:100, background:u.grad, fontSize:12, fontWeight:500, color:'#fff' }}>
                {u.label}
              </div>
            ))}
          </div>
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

        <div style={{ width:'100%', maxWidth:400 }}>
          <div style={{ marginBottom:32 }}>
            <h1 style={{ fontFamily:fonts.ui, fontSize:24, fontWeight:600, color:t.text, letterSpacing:'-0.4px', marginBottom:6 }}>Welcome back</h1>
            <p style={{ fontSize:14, color:t.textSub }}>Sign in to your CitySync account</p>
          </div>

          {error && (
            <div style={{ padding:'12px 16px', borderRadius:10, marginBottom:20, background: isDark ? '#2D0C0C' : '#FEE2E2', border:`1px solid ${isDark ? '#F8717133' : '#FCA5A5'}`, color: isDark ? '#F87171' : '#B91C1C', fontSize:13 }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom:18 }}>
              <label style={{ display:'block', fontSize:12, fontWeight:500, color:t.textSub, marginBottom:7 }}>Email or Phone Number</label>
              <input type="text" value={identifier} onChange={e => setIdentifier(e.target.value)} onFocus={() => setFocused('id')} onBlur={() => setFocused(null)} placeholder="consumer@citysync.bd or 01XXXXXXXXX" required style={inputStyle('id')} />
            </div>

            <div style={{ marginBottom:24 }}>
              <label style={{ display:'block', fontSize:12, fontWeight:500, color:t.textSub, marginBottom:7 }}>Password</label>
              <div style={{ position:'relative' }}>
                <input type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} onFocus={() => setFocused('pw')} onBlur={() => setFocused(null)} placeholder="••••••••" required style={{ ...inputStyle('pw'), paddingRight:48 }} />
                <button type="button" onClick={() => setShowPass(s => !s)} style={{ position:'absolute', right:14, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:t.textMuted, fontSize:16, padding:4 }}>
                  {showPass ? '🙈' : '👁'}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} style={{ width:'100%', padding:'13px', borderRadius:10, border:'none', background: loading ? t.textMuted : 'linear-gradient(135deg,#3B6FFF,#2952D9)', color:'#fff', fontSize:15, fontWeight:600, fontFamily:fonts.ui, cursor: loading ? 'not-allowed' : 'pointer', boxShadow: loading ? 'none' : '0 4px 16px rgba(59,111,255,0.35)', transition:'all 0.2s', letterSpacing:'-0.1px' }}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div style={{ display:'flex', alignItems:'center', gap:12, margin:'24px 0' }}>
            <div style={{ flex:1, height:1, background:t.border }} />
            <span style={{ fontSize:12, color:t.textMuted, fontFamily:fonts.mono }}>OR</span>
            <div style={{ flex:1, height:1, background:t.border }} />
          </div>

          <p style={{ textAlign:'center', fontSize:14, color:t.textSub }}>
            Don't have an account?{' '}
            <Link to="/register" style={{ color:t.primary, fontWeight:600, textDecoration:'none' }}>Create account</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;