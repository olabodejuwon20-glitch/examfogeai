import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { lovable } from '@/integrations/lovable/index';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export default function AuthPage() {
  const [tab, setTab]           = useState<'login'|'signup'>('login');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [name, setName]         = useState('');
  const [loading, setLoading]   = useState(false);
  const [social, setSocial]     = useState<string|null>(null);
  const { signIn, signUp }      = useAuth();
  const navigate                = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (tab==='login') { await signIn(email, password); toast.success('Welcome back!'); }
      else               { await signUp(email, password, name); toast.success('Account created! Check your email.'); }
      navigate('/dashboard');
    } catch (err: any) {
      toast.error(err.message || 'Authentication failed');
    } finally { setLoading(false); }
  };

  const handleSocial = async (provider: 'google'|'apple') => {
    setSocial(provider);
    const { error } = await lovable.auth.signInWithOAuth(provider, { redirect_uri: window.location.origin });
    if (error) toast.error(`${provider} sign-in failed`);
    setSocial(null);
  };

  const inp: React.CSSProperties = {
    width:'100%',padding:'13px 14px',border:'2px solid #e2e8f0',borderRadius:13,
    fontSize:16,fontFamily:"'Sora',sans-serif",color:'#0f172a',outline:'none',
    transition:'border-color .2s',boxSizing:'border-box',background:'white',
  };

  return (
    <div style={{minHeight:'100vh',display:'flex',flexDirection:'column',background:'#0f172a',fontFamily:"'Sora',sans-serif"}}>
      {/* Hero */}
      <div style={{background:'linear-gradient(160deg,#0f172a 0%,#1e3a8a 55%,#1d4ed8 100%)',padding:'48px 24px 40px',position:'relative',overflow:'hidden'}}>
        <div style={{position:'absolute',top:-60,right:-60,width:200,height:200,background:'rgba(255,255,255,0.04)',borderRadius:'50%'}}/>
        <div style={{position:'absolute',bottom:-30,left:-30,width:140,height:140,background:'rgba(59,130,246,0.1)',borderRadius:'50%'}}/>
        {/* Logo */}
        <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:24,position:'relative',zIndex:1}}>
          <div style={{width:44,height:44,borderRadius:13,background:'rgba(255,255,255,0.12)',backdropFilter:'blur(8px)',border:'1.5px solid rgba(255,255,255,0.2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22}}>⚡</div>
          <span style={{fontSize:22,fontWeight:900,color:'white',letterSpacing:'-0.03em'}}>Exam<span style={{color:'#93c5fd'}}>Forge</span></span>
        </div>
        <h1 style={{fontSize:24,fontWeight:900,color:'white',lineHeight:1.25,letterSpacing:'-0.02em',marginBottom:8,position:'relative',zIndex:1}}>
          Study smarter.<br/><span style={{color:'#93c5fd'}}>Score higher.</span>
        </h1>
        <p style={{fontSize:13,color:'rgba(255,255,255,0.5)',marginBottom:16,position:'relative',zIndex:1}}>AI-powered exam prep for African students</p>
        <div style={{display:'flex',gap:7,flexWrap:'wrap',position:'relative',zIndex:1}}>
          {['🇳🇬 WAEC','🇳🇬 JAMB','🇬🇭 WASSCE','🇰🇪 KCSE','🇿🇦 NSC'].map(p=>(
            <span key={p} style={{padding:'4px 11px',borderRadius:100,background:'rgba(255,255,255,0.09)',border:'1px solid rgba(255,255,255,0.14)',fontSize:11,fontWeight:700,color:'rgba(255,255,255,0.65)'}}>{p}</span>
          ))}
        </div>
      </div>

      {/* Form card */}
      <div style={{background:'white',borderRadius:'24px 24px 0 0',flex:1,padding:'28px 20px 40px'}}>
        {/* Tabs */}
        <div style={{display:'flex',background:'#f1f5f9',borderRadius:12,padding:4,gap:4,marginBottom:22}}>
          {(['login','signup'] as const).map(t=>(
            <button key={t} onClick={()=>setTab(t)} style={{flex:1,padding:'10px',borderRadius:9,fontSize:14,fontWeight:800,border:'none',cursor:'pointer',fontFamily:"'Sora',sans-serif",transition:'all .2s',background:tab===t?'white':'transparent',color:tab===t?'#0f172a':'#64748b',boxShadow:tab===t?'0 2px 8px rgba(0,0,0,0.08)':'none'}}>
              {t==='login'?'Sign In':'Create Account'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          {tab==='signup' && (
            <div style={{marginBottom:13}}>
              <label style={{display:'block',fontSize:12,fontWeight:800,color:'#334155',marginBottom:6}}>Full Name</label>
              <input value={name} onChange={e=>setName(e.target.value)} placeholder="Your name" required
                style={inp} onFocus={e=>e.target.style.borderColor='#2563eb'} onBlur={e=>e.target.style.borderColor='#e2e8f0'}/>
            </div>
          )}
          <div style={{marginBottom:13}}>
            <label style={{display:'block',fontSize:12,fontWeight:800,color:'#334155',marginBottom:6}}>Email Address</label>
            <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@gmail.com" required
              style={inp} onFocus={e=>e.target.style.borderColor='#2563eb'} onBlur={e=>e.target.style.borderColor='#e2e8f0'}/>
          </div>
          <div style={{marginBottom:20}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:6}}>
              <label style={{fontSize:12,fontWeight:800,color:'#334155'}}>Password</label>
              {tab==='login' && <button type="button" style={{fontSize:12,fontWeight:700,color:'#2563eb',background:'none',border:'none',cursor:'pointer',fontFamily:"'Sora',sans-serif"}}>Forgot?</button>}
            </div>
            <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" required minLength={6}
              style={inp} onFocus={e=>e.target.style.borderColor='#2563eb'} onBlur={e=>e.target.style.borderColor='#e2e8f0'}/>
          </div>
          <button type="submit" disabled={loading} style={{
            width:'100%',padding:'14px',borderRadius:14,fontSize:15,fontWeight:800,
            background:'linear-gradient(135deg,#1d4ed8,#2563eb)',color:'white',border:'none',
            cursor:'pointer',boxShadow:'0 4px 14px rgba(37,99,235,0.3)',
            display:'flex',alignItems:'center',justifyContent:'center',gap:8,
            fontFamily:"'Sora',sans-serif",marginBottom:16,opacity:loading?.7:1,
          }}>
            {loading?<Loader2 size={16} style={{animation:'efSpin .8s linear infinite'}}/>:null}
            {loading?'Please wait...':(tab==='login'?'Sign In':'Create Account')}
          </button>
        </form>

        <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:16}}>
          <div style={{flex:1,height:1,background:'#e2e8f0'}}/>
          <span style={{fontSize:11,fontWeight:700,color:'#cbd5e1',textTransform:'uppercase'}}>or continue with</span>
          <div style={{flex:1,height:1,background:'#e2e8f0'}}/>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:20}}>
          <button onClick={()=>handleSocial('google')} disabled={!!social||loading} style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8,padding:'12px',border:'2px solid #e2e8f0',borderRadius:13,fontSize:13,fontWeight:800,color:'#334155',background:'white',cursor:'pointer',fontFamily:"'Sora',sans-serif",transition:'all .2s'}}>
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            {social==='google'?'...':'Google'}
          </button>
          <button onClick={()=>handleSocial('apple')} disabled={!!social||loading} style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8,padding:'12px',border:'2px solid #e2e8f0',borderRadius:13,fontSize:13,fontWeight:800,color:'#334155',background:'white',cursor:'pointer',fontFamily:"'Sora',sans-serif"}}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
            </svg>
            {social==='apple'?'...':'Apple'}
          </button>
        </div>

        <p style={{textAlign:'center',fontSize:13,color:'#64748b'}}>
          {tab==='login'?"Don't have an account? ":"Already have an account? "}
          <button onClick={()=>setTab(tab==='login'?'signup':'login')} style={{color:'#2563eb',fontWeight:800,background:'none',border:'none',cursor:'pointer',fontFamily:"'Sora',sans-serif"}}>
            {tab==='login'?'Register free':'Sign in'}
          </button>
        </p>
      </div>
      <style>{`@keyframes efSpin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
