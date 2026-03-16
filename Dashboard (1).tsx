import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Trophy, BookOpen, Clock, CheckCircle, Zap, ChevronRight, Target, LogOut, CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import { showBannerAd, hideBannerAd } from '@/lib/admob';
import MobileNav from '@/components/MobileNav';

interface TestRecord { id:string; title:string; status:string; num_questions:number; duration_minutes:number; created_at:string; }
interface ResultRecord { id:string; score:number; total_questions:number; correct_answers:number; completed_at:string; test:{title:string}; }

const gradeInfo = (pct:number) => {
  if(pct>=75) return {grade:'A1',color:'#16a34a',bg:'#dcfce7'};
  if(pct>=65) return {grade:'B2',color:'#2563eb',bg:'#dbeafe'};
  if(pct>=55) return {grade:'C5',color:'#d97706',bg:'#fef3c7'};
  return {grade:'F9',color:'#dc2626',bg:'#fee2e2'};
};

const greeting = () => {
  const h = new Date().getHours();
  if(h<12) return 'Good morning';
  if(h<17) return 'Good afternoon';
  return 'Good evening';
};

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [tests,   setTests]   = useState<TestRecord[]>([]);
  const [results, setResults] = useState<ResultRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [menuOpen,setMenuOpen]= useState(false);
  const name = user?.email?.split('@')[0] || 'Student';

  useEffect(() => {
    loadData();
    showBannerAd();
    return () => hideBannerAd();
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    const [t,r] = await Promise.all([
      supabase.from('tests').select('*').eq('user_id',user.id).order('created_at',{ascending:false}).limit(5),
      supabase.from('test_results').select('*,test:tests(title)').eq('user_id',user.id).order('completed_at',{ascending:false}).limit(5),
    ]);
    if(t.data) setTests(t.data);
    if(r.data) setResults(r.data as any);
    setLoading(false);
  };

  const avgScore = results.length
    ? Math.round(results.reduce((s,r) => s + Math.round((r.correct_answers/r.total_questions)*100), 0) / results.length)
    : 0;

  return (
    <div className="min-h-screen bg-slate-50" style={{fontFamily:"'Sora',sans-serif"}}>

      {/* ── Header ── */}
      <header style={{
        background:'white',borderBottom:'1px solid #f1f5f9',
        padding:'0 16px',height:60,display:'flex',alignItems:'center',
        justifyContent:'space-between',position:'sticky',top:0,zIndex:40,
        boxShadow:'0 1px 12px rgba(0,0,0,0.05)',
      }}>
        {/* Logo */}
        <Link to="/dashboard" style={{display:'flex',alignItems:'center',gap:8,textDecoration:'none'}}>
          <div style={{width:34,height:34,borderRadius:10,background:'linear-gradient(135deg,#1d4ed8,#3b82f6)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:17,boxShadow:'0 3px 10px rgba(37,99,235,0.3)'}}>⚡</div>
          <span style={{fontSize:17,fontWeight:900,color:'#0f172a',letterSpacing:'-0.03em'}}>Exam<span style={{color:'#2563eb'}}>Forge</span></span>
        </Link>

        {/* Desktop nav */}
        <nav className="hide-on-mobile" style={{display:'flex',gap:4}}>
          {[{to:'/create-test',l:'Create Test'},{to:'/leaderboard',l:'Leaderboard'},{to:'/question-banks',l:'Question Banks'}].map(n=>(
            <Link key={n.to} to={n.to} style={{padding:'7px 14px',borderRadius:10,fontSize:13,fontWeight:700,color:'#475569',textDecoration:'none',transition:'all .15s'}}
              onMouseEnter={e=>{(e.target as any).style.background='#f1f5f9';(e.target as any).style.color='#1d4ed8'}}
              onMouseLeave={e=>{(e.target as any).style.background='transparent';(e.target as any).style.color='#475569'}}>
              {n.l}
            </Link>
          ))}
        </nav>

        {/* Right side */}
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <Link to="/buy-credits" style={{display:'flex',alignItems:'center',gap:5,background:'#eff6ff',border:'1.5px solid #bfdbfe',padding:'5px 11px',borderRadius:11,textDecoration:'none',transition:'all .15s'}}
            className="touch-btn">
            <Zap size={14} style={{color:'#2563eb',fill:'#2563eb'}}/>
            <span style={{fontSize:12,fontWeight:800,color:'#1d4ed8'}}>Credits</span>
          </Link>
          <div style={{position:'relative'}}>
            <button onClick={()=>setMenuOpen(!menuOpen)} className="touch-btn" style={{
              width:34,height:34,borderRadius:'50%',
              background:'linear-gradient(135deg,#1d4ed8,#3b82f6)',
              border:'none',display:'flex',alignItems:'center',justifyContent:'center',
              color:'white',fontSize:13,fontWeight:900,cursor:'pointer',
            }}>{name[0].toUpperCase()}</button>
            {menuOpen && (
              <div style={{
                position:'absolute',right:0,top:42,background:'white',
                border:'1.5px solid #e2e8f0',borderRadius:16,width:200,
                boxShadow:'0 8px 32px rgba(0,0,0,0.12)',zIndex:100,overflow:'hidden',
              }}>
                <div style={{padding:'12px 16px',borderBottom:'1px solid #f1f5f9'}}>
                  <div style={{fontSize:13,fontWeight:800,color:'#0f172a'}}>{name}</div>
                  <div style={{fontSize:11,color:'#94a3b8',marginTop:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{user?.email}</div>
                </div>
                {[{to:'/buy-credits',icon:CreditCard,l:'Buy Credits'},{to:'/leaderboard',icon:Trophy,l:'Leaderboard'}].map(item=>{
                  const Icon=item.icon;
                  return(
                    <Link key={item.to} to={item.to} onClick={()=>setMenuOpen(false)} style={{display:'flex',alignItems:'center',gap:10,padding:'11px 16px',fontSize:13,fontWeight:600,color:'#334155',textDecoration:'none',transition:'background .1s'}}
                      onMouseEnter={e=>(e.currentTarget.style.background='#f8fafc')}
                      onMouseLeave={e=>(e.currentTarget.style.background='transparent')}>
                      <Icon size={15} style={{color:'#94a3b8'}}/>{item.l}
                    </Link>
                  );
                })}
                <div style={{borderTop:'1px solid #f1f5f9'}}>
                  <button onClick={async()=>{await signOut();navigate('/');}} style={{display:'flex',alignItems:'center',gap:10,padding:'11px 16px',fontSize:13,fontWeight:600,color:'#dc2626',background:'none',border:'none',cursor:'pointer',width:'100%',fontFamily:"'Sora',sans-serif",transition:'background .1s'}}
                    onMouseEnter={e=>(e.currentTarget.style.background='#fef2f2')}
                    onMouseLeave={e=>(e.currentTarget.style.background='transparent')}>
                    <LogOut size={15}/>Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── Main ── */}
      <main style={{maxWidth:560,margin:'0 auto',padding:'16px 14px'}} className="pb-mobile">

        {/* Hero */}
        <div className="anim-1" onClick={()=>navigate('/create-test')} style={{
          background:'linear-gradient(135deg,#0f172a 0%,#1e3a8a 55%,#1d4ed8 100%)',
          borderRadius:22,padding:'22px 20px',marginBottom:14,cursor:'pointer',
          position:'relative',overflow:'hidden',
        }}>
          <div style={{position:'absolute',top:-50,right:-50,width:160,height:160,background:'rgba(255,255,255,0.05)',borderRadius:'50%'}}/>
          <div style={{position:'absolute',bottom:-30,right:20,width:100,height:100,background:'rgba(255,255,255,0.03)',borderRadius:'50%'}}/>
          <div style={{position:'relative',zIndex:1}}>
            <p style={{fontSize:11,fontWeight:700,color:'rgba(147,197,253,0.9)',marginBottom:4}}>{greeting()} 👋</p>
            <h1 style={{fontSize:20,fontWeight:900,color:'white',letterSpacing:'-0.02em',lineHeight:1.25,marginBottom:14}}>
              Ready to study,<br/>{name}?
            </h1>
            <span style={{
              display:'inline-flex',alignItems:'center',gap:7,padding:'9px 15px',
              borderRadius:11,fontSize:13,fontWeight:800,color:'white',
              background:'rgba(255,255,255,0.14)',border:'1.5px solid rgba(255,255,255,0.22)',
              backdropFilter:'blur(8px)',
            }}>⚡ Generate New Test</span>
          </div>
        </div>

        {/* Stats */}
        <div className="anim-2" style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:14}}>
          {[
            {icon:'📄',bg:'#eff6ff',val:tests.length,lbl:'Tests'},
            {icon:'🎯',bg:'#f0fdf4',val:results.length?`${avgScore}%`:'—',lbl:'Avg Score',color:avgScore>=50?'#16a34a':'#dc2626'},
            {icon:'🏆',bg:'#fffbeb',val:results.length,lbl:'Completed'},
          ].map((s,i)=>(
            <div key={i} style={{background:'white',border:'1.5px solid #e2e8f0',borderRadius:16,padding:'14px 10px',textAlign:'center'}}>
              <div style={{width:34,height:34,background:s.bg,borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 7px',fontSize:15}}>{s.icon}</div>
              <div style={{fontSize:22,fontWeight:900,letterSpacing:'-0.02em',color:s.color||'#0f172a'}}>{s.val}</div>
              <div style={{fontSize:10,fontWeight:600,color:'#94a3b8',marginTop:1}}>{s.lbl}</div>
            </div>
          ))}
        </div>

        {/* Quick actions */}
        <div className="anim-3" style={{marginBottom:14}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
            <span style={{fontSize:15,fontWeight:900,color:'#0f172a'}}>Quick Actions</span>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
            {[
              {to:'/create-test',icon:'⚡',bg:'#eff6ff',title:'Generate Test',sub:'AI from your notes'},
              {to:'/leaderboard',icon:'🏆',bg:'#fffbeb',title:'Leaderboard',sub:'See top students'},
              {to:'/question-banks',icon:'📚',bg:'#f5f3ff',title:'Question Banks',sub:'Save & organise'},
              {to:'/buy-credits',icon:'💳',bg:'#f0fdf4',title:'Buy Credits',sub:'Top up your wallet'},
            ].map(item=>(
              <Link key={item.to} to={item.to} className="touch-card" style={{padding:16,display:'block',textDecoration:'none'}}>
                <div style={{width:38,height:38,background:item.bg,borderRadius:11,display:'flex',alignItems:'center',justifyContent:'center',marginBottom:9,fontSize:18}}>{item.icon}</div>
                <div style={{fontSize:13,fontWeight:800,color:'#0f172a',marginBottom:2}}>{item.title}</div>
                <div style={{fontSize:11,fontWeight:500,color:'#94a3b8'}}>{item.sub}</div>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Tests */}
        {tests.length > 0 && (
          <div className="anim-4" style={{marginBottom:14}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
              <span style={{fontSize:15,fontWeight:900,color:'#0f172a'}}>Recent Tests</span>
              <Link to="/create-test" style={{fontSize:12,fontWeight:700,color:'#2563eb',textDecoration:'none',display:'flex',alignItems:'center',gap:3}}>
                <Plus size={13}/> New
              </Link>
            </div>
            <div style={{background:'white',border:'1.5px solid #e2e8f0',borderRadius:18,overflow:'hidden'}}>
              {tests.slice(0,4).map((t,i)=>(
                <button key={t.id} className="touch-btn" onClick={()=>navigate(t.status==='completed'?`/results/${t.id}`:`/test/${t.id}`)} style={{
                  display:'flex',alignItems:'center',gap:12,padding:'13px 14px',
                  width:'100%',background:'none',border:'none',cursor:'pointer',textAlign:'left',
                  borderBottom:i<tests.slice(0,4).length-1?'1px solid #f8fafc':'none',
                }}>
                  <div style={{width:36,height:36,borderRadius:11,background:t.status==='completed'?'#f0fdf4':'#eff6ff',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,fontSize:16}}>
                    {t.status==='completed'?'✅':'⏱️'}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:13,fontWeight:700,color:'#0f172a',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{t.title}</div>
                    <div style={{fontSize:11,color:'#94a3b8',marginTop:1}}>{t.num_questions} questions · {t.status}</div>
                  </div>
                  <ChevronRight size={16} style={{color:'#d1d5db',flexShrink:0}}/>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Recent Results */}
        {results.length > 0 && (
          <div className="anim-5" style={{marginBottom:14}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
              <span style={{fontSize:15,fontWeight:900,color:'#0f172a'}}>Recent Results</span>
              <Link to="/leaderboard" style={{fontSize:12,fontWeight:700,color:'#2563eb',textDecoration:'none',display:'flex',alignItems:'center',gap:2}}>
                Leaderboard <ChevronRight size={12}/>
              </Link>
            </div>
            <div style={{background:'white',border:'1.5px solid #e2e8f0',borderRadius:18,overflow:'hidden'}}>
              {results.slice(0,4).map((r,i)=>{
                const pct=Math.round((r.correct_answers/r.total_questions)*100);
                const {grade,color,bg}=gradeInfo(pct);
                return(
                  <div key={r.id} style={{display:'flex',alignItems:'center',gap:12,padding:'13px 14px',borderBottom:i<results.slice(0,4).length-1?'1px solid #f8fafc':'none'}}>
                    <div style={{width:36,height:36,borderRadius:11,background:bg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:900,color,flexShrink:0}}>{grade}</div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:13,fontWeight:700,color:'#0f172a',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{(r as any).test?.title||'Test'}</div>
                      <div style={{fontSize:11,color:'#94a3b8',marginTop:1}}>{r.correct_answers}/{r.total_questions} correct</div>
                    </div>
                    <span style={{fontSize:15,fontWeight:900,color,flexShrink:0}}>{pct}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!loading && tests.length===0 && (
          <div style={{background:'white',border:'1.5px solid #e2e8f0',borderRadius:20,padding:'40px 20px',textAlign:'center'}}>
            <div style={{width:60,height:60,background:'#eff6ff',borderRadius:18,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 14px',fontSize:26}}>⚡</div>
            <h3 style={{fontSize:17,fontWeight:900,color:'#0f172a',marginBottom:8}}>Create your first test</h3>
            <p style={{fontSize:13,color:'#94a3b8',marginBottom:20}}>Upload your notes and AI generates exam questions in seconds.</p>
            <Link to="/create-test" style={{
              display:'inline-flex',alignItems:'center',gap:7,padding:'12px 20px',
              borderRadius:13,background:'linear-gradient(135deg,#1d4ed8,#2563eb)',
              color:'white',fontSize:14,fontWeight:800,textDecoration:'none',
              boxShadow:'0 4px 14px rgba(37,99,235,0.3)',
            }}><Plus size={15}/> Generate Test</Link>
          </div>
        )}
      </main>

      <MobileNav/>
    </div>
  );
}
