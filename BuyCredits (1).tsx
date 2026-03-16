import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Zap, CheckCircle, Clock, Shield, Lock, Gift } from 'lucide-react';
import { toast } from 'sonner';
import MobileNav from '@/components/MobileNav';

interface CreditPack {
  id: string; name: string; priceNgn: number;
  credits: number; bonus: number; perCredit: string;
  popular: boolean; icon: string; features: string[];
  accentColor: string; accentBg: string;
}
interface Transaction {
  id: string; amount: number; type: string; description: string; created_at: string;
}

const PACKS: CreditPack[] = [
  { id:'starter', name:'Starter', priceNgn:350, credits:10, bonus:0, perCredit:'₦35/credit',
    popular:false, icon:'⚡', accentColor:'#2563eb', accentBg:'#eff6ff',
    features:['10 AI test generations','Unlocks Community Hub','PDF & JSON export','Credits never expire'] },
  { id:'value', name:'Value', priceNgn:1050, credits:30, bonus:5, perCredit:'₦30/credit',
    popular:true, icon:'⭐', accentColor:'#2563eb', accentBg:'#eff6ff',
    features:['30 + 5 bonus credits','Unlocks Community Hub','All export formats','30 days ad-free ✨','Credits never expire'] },
  { id:'power', name:'Power', priceNgn:2100, credits:60, bonus:15, perCredit:'₦28/credit',
    popular:false, icon:'👑', accentColor:'#d97706', accentBg:'#fffbeb',
    features:['60 + 15 bonus credits','Unlocks Community Hub','All export formats','30 days ad-free ✨','Priority AI processing','Credits never expire'] },
  { id:'mega', name:'Mega', priceNgn:3500, credits:100, bonus:30, perCredit:'₦27/credit',
    popular:false, icon:'💎', accentColor:'#7c3aed', accentBg:'#f5f3ff',
    features:['100 + 30 bonus credits','Unlocks Community Hub','All export formats','60 days ad-free ✨','Priority AI processing','Team sharing','Credits never expire'] },
];

const getTypeIcon = (t: string) =>
  ({ purchase:'💳', usage:'⚡', rewarded_ad:'📺', daily_free:'🎁', bonus:'🏆' }[t] || '✦');

const balColor = (b: number|null) => {
  if (b===null) return '#0f172a';
  if (b===0)    return '#fca5a5';
  if (b<=2)     return '#fcd34d';
  return '#86efac';
};

export default function BuyCredits() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [balance,      setBalance]      = useState<number|null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingBal,   setLoadingBal]   = useState(true);
  const [tab,          setTab]          = useState<'buy'|'history'>('buy');
  const [selected,     setSelected]     = useState('value');
  const [paying,       setPaying]       = useState(false);

  useEffect(() => {
    loadWallet(); loadTransactions();
    const ch = supabase.channel('credits-rt')
      .on('postgres_changes',{event:'*',schema:'public',table:'credits_wallet',filter:`user_id=eq.${user?.id}`},
        (p:any)=>{ if(p.new?.balance!==undefined) setBalance(p.new.balance); })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user?.id]);

  const loadWallet = async () => {
    const { data } = await supabase.from('credits_wallet').select('balance').eq('user_id',user!.id).single();
    if (data) setBalance(data.balance);
    else { await supabase.from('credits_wallet').insert({user_id:user!.id,balance:5}); setBalance(5); }
    setLoadingBal(false);
  };
  const loadTransactions = async () => {
    const { data } = await supabase.from('credit_transactions').select('*')
      .eq('user_id',user!.id).order('created_at',{ascending:false}).limit(20);
    if (data) setTransactions(data);
  };
  const handleBuy = async (pack: CreditPack) => {
    setPaying(true);
    toast.info(`Opening payment for ${pack.name} — ₦${pack.priceNgn.toLocaleString()}`);
    setPaying(false);
  };

  const active = PACKS.find(p=>p.id===selected)||PACKS[1];
  const bc     = balColor(balance);

  return (
    <div style={{minHeight:'100vh',background:'#f8fafc',fontFamily:"'Sora',sans-serif"}}>

      {/* Header */}
      <header style={{background:'white',borderBottom:'1px solid #f1f5f9',height:56,display:'flex',alignItems:'center',padding:'0 14px',gap:10,position:'sticky',top:0,zIndex:40,boxShadow:'0 1px 8px rgba(0,0,0,0.04)'}}>
        <button onClick={()=>navigate('/dashboard')} className="touch-btn" style={{width:34,height:34,borderRadius:'50%',background:'#f1f5f9',border:'none',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}}>
          <ArrowLeft size={16} style={{color:'#64748b'}}/>
        </button>
        <span style={{fontSize:16,fontWeight:900,color:'#0f172a',flex:1}}>Credits</span>
        <div style={{display:'flex',alignItems:'center',gap:5,background:'#1e293b',padding:'6px 12px',borderRadius:11}}>
          <Zap size={13} style={{color:bc,fill:bc}}/>
          <span style={{fontSize:13,fontWeight:800,color:bc}}>{loadingBal?'…':balance??0}</span>
        </div>
      </header>

      <main style={{maxWidth:480,margin:'0 auto',padding:'14px 14px 100px'}} className="pb-mobile">

        {/* Balance hero */}
        <div className="anim-1" style={{background:'linear-gradient(135deg,#0f172a 0%,#1e3a8a 55%,#1d4ed8 100%)',borderRadius:22,padding:'28px 20px',marginBottom:14,textAlign:'center',position:'relative',overflow:'hidden'}}>
          <div style={{position:'absolute',top:-40,right:-40,width:140,height:140,background:'rgba(255,255,255,0.05)',borderRadius:'50%'}}/>
          <div style={{position:'absolute',bottom:-30,left:-20,width:100,height:100,background:'rgba(255,255,255,0.03)',borderRadius:'50%'}}/>
          <p style={{fontSize:11,fontWeight:700,color:'rgba(147,197,253,0.8)',marginBottom:10,textTransform:'uppercase',letterSpacing:'0.08em',position:'relative',zIndex:1}}>Your Credit Balance</p>
          {loadingBal ? (
            <div style={{width:44,height:44,border:'3px solid rgba(255,255,255,0.2)',borderTopColor:'white',borderRadius:'50%',animation:'efSpin .8s linear infinite',margin:'0 auto 12px'}}/>
          ) : (
            <div style={{fontSize:80,fontWeight:900,letterSpacing:'-0.04em',lineHeight:1,marginBottom:10,color:bc,position:'relative',zIndex:1,textShadow:'0 2px 20px rgba(0,0,0,0.3)'}}>
              {balance??0}
            </div>
          )}
          <p style={{fontSize:13,color:'rgba(255,255,255,0.55)',marginBottom:14,position:'relative',zIndex:1}}>
            {balance===0?'😅 No credits — buy a pack or watch an ad'
            :balance===1?'⚠️ Last credit! Top up now'
            :'✅ Each test generation uses 1 credit'}
          </p>
          <div style={{display:'inline-flex',alignItems:'center',gap:6,background:'rgba(255,255,255,0.1)',border:'1px solid rgba(255,255,255,0.15)',borderRadius:100,padding:'6px 14px',position:'relative',zIndex:1}}>
            <Gift size={12} style={{color:'#86efac'}}/>
            <span style={{fontSize:11,fontWeight:700,color:'rgba(255,255,255,0.8)'}}>+2 free credits every 24 hours</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="anim-2" style={{display:'flex',background:'white',border:'1.5px solid #e2e8f0',borderRadius:14,padding:4,gap:4,marginBottom:14}}>
          {(['buy','history'] as const).map(t=>(
            <button key={t} onClick={()=>setTab(t)} style={{flex:1,padding:'10px',borderRadius:10,fontSize:13,fontWeight:800,border:'none',cursor:'pointer',fontFamily:"'Sora',sans-serif",transition:'all .2s',background:tab===t?'linear-gradient(135deg,#1d4ed8,#2563eb)':'transparent',color:tab===t?'white':'#64748b',boxShadow:tab===t?'0 2px 8px rgba(37,99,235,0.25)':'none'}}>
              {t==='buy'?'💳 Buy Credits':'📋 History'}
            </button>
          ))}
        </div>

        {/* BUY TAB */}
        {tab==='buy' && (<>

          {/* Package pills — scrollable */}
          <div className="anim-2" style={{marginBottom:14}}>
            <p style={{fontSize:13,fontWeight:800,color:'#0f172a',marginBottom:10}}>Choose a Package</p>
            <div style={{display:'flex',gap:8,overflowX:'auto',paddingBottom:4,scrollbarWidth:'none',msOverflowStyle:'none'}}>
              {PACKS.map(pack=>{
                const isSel = selected===pack.id;
                return(
                  <button key={pack.id} onClick={()=>setSelected(pack.id)} className="touch-btn" style={{flexShrink:0,padding:'14px 12px',borderRadius:16,border:`2px solid ${isSel?pack.accentColor:'#e2e8f0'}`,background:isSel?pack.accentBg:'white',cursor:'pointer',fontFamily:"'Sora',sans-serif",position:'relative',textAlign:'center',minWidth:88,transition:'all .15s'}}>
                    {pack.popular && (
                      <div style={{position:'absolute',top:-9,left:'50%',transform:'translateX(-50%)',background:'#2563eb',color:'white',fontSize:8,fontWeight:900,padding:'2px 7px',borderRadius:100,whiteSpace:'nowrap'}}>POPULAR</div>
                    )}
                    <div style={{fontSize:24,marginBottom:5}}>{pack.icon}</div>
                    <div style={{fontSize:12,fontWeight:800,color:isSel?pack.accentColor:'#0f172a',marginBottom:3}}>{pack.name}</div>
                    <div style={{fontSize:13,fontWeight:900,color:isSel?pack.accentColor:'#0f172a'}}>₦{pack.priceNgn.toLocaleString()}</div>
                    <div style={{fontSize:10,color:'#94a3b8',marginTop:2}}>{pack.credits+pack.bonus} credits</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected pack detail */}
          <div className="anim-3" style={{background:'white',border:`2px solid ${active.accentColor}`,borderRadius:22,padding:20,marginBottom:14,position:'relative',overflow:'hidden'}}>
            <div style={{position:'absolute',top:-30,right:-30,width:100,height:100,background:active.accentBg,borderRadius:'50%',opacity:.5}}/>

            {/* Header */}
            <div style={{marginBottom:16,position:'relative',zIndex:1}}>
              <div style={{display:'flex',alignItems:'center',gap:9,marginBottom:6}}>
                <span style={{fontSize:30}}>{active.icon}</span>
                <span style={{fontSize:20,fontWeight:900,color:'#0f172a'}}>{active.name}</span>
                {active.popular&&<span style={{fontSize:10,fontWeight:800,background:active.accentColor,color:'white',padding:'2px 8px',borderRadius:100}}>MOST POPULAR</span>}
              </div>
              <div style={{fontSize:40,fontWeight:900,color:'#0f172a',letterSpacing:'-0.03em',lineHeight:1,marginBottom:5}}>
                ₦{active.priceNgn.toLocaleString()}
              </div>
              <div style={{fontSize:14,fontWeight:700,color:active.accentColor}}>
                {active.credits+active.bonus} credits
                {active.bonus>0&&<span style={{color:'#16a34a'}}> ({active.credits} + {active.bonus} bonus 🎁)</span>}
              </div>
              <div style={{fontSize:11,color:'#94a3b8',marginTop:2}}>{active.perCredit}</div>
            </div>

            {/* Features */}
            <div style={{display:'flex',flexDirection:'column',gap:9,marginBottom:18,position:'relative',zIndex:1}}>
              {active.features.map((f,i)=>(
                <div key={i} style={{display:'flex',alignItems:'center',gap:9}}>
                  <CheckCircle size={15} style={{color:'#16a34a',flexShrink:0}}/>
                  <span style={{fontSize:13,color:'#334155',fontWeight:600}}>{f}</span>
                </div>
              ))}
            </div>

            {/* Pay button */}
            <button onClick={()=>handleBuy(active)} disabled={paying} className="touch-btn" style={{width:'100%',padding:'15px',borderRadius:14,fontSize:15,fontWeight:800,background:paying?'#94a3b8':'linear-gradient(135deg,#1d4ed8,#2563eb)',color:'white',border:'none',cursor:paying?'not-allowed':'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:8,boxShadow:paying?'none':'0 6px 20px rgba(37,99,235,0.35)',fontFamily:"'Sora',sans-serif",marginBottom:14}}>
              {paying
                ?<><div style={{width:16,height:16,border:'2px solid rgba(255,255,255,0.4)',borderTopColor:'white',borderRadius:'50%',animation:'efSpin .8s linear infinite'}}/>Processing...</>
                :<><Zap size={16} style={{fill:'white'}}/>Pay ₦{active.priceNgn.toLocaleString()} via Flutterwave</>
              }
            </button>

            {/* Trust badges */}
            <div style={{display:'flex',justifyContent:'center',gap:16,flexWrap:'wrap'}}>
              {[{I:Shield,l:'256-bit SSL'},{I:Lock,l:'Flutterwave'},{I:Zap,l:'Instant delivery'}].map(({I,l})=>(
                <div key={l} style={{display:'flex',alignItems:'center',gap:4,fontSize:10,color:'#94a3b8'}}>
                  <I size={11} style={{color:'#16a34a'}}/>{l}
                </div>
              ))}
            </div>
          </div>

          {/* Free ad */}
          <div className="anim-4" style={{background:'white',border:'2px dashed #e2e8f0',borderRadius:18,padding:'18px 16px',textAlign:'center',marginBottom:10}}>
            <p style={{fontSize:14,fontWeight:800,color:'#0f172a',marginBottom:4}}>📺 No money? No problem!</p>
            <p style={{fontSize:12,color:'#94a3b8',marginBottom:12}}>Watch a short 30-second ad and earn 1 free credit instantly</p>
            <button onClick={()=>toast.info('Rewarded ads available on the mobile app!')} className="touch-btn" style={{padding:'11px 20px',borderRadius:12,border:'2px solid #e2e8f0',fontSize:13,fontWeight:800,color:'#334155',background:'white',cursor:'pointer',fontFamily:"'Sora',sans-serif"}}>
              Watch Ad → Earn 1 Free Credit
            </button>
          </div>

          <p style={{fontSize:11,color:'#94a3b8',textAlign:'center'}}>💡 Credits never expire once purchased. Payments are in NGN.</p>
        </>)}

        {/* HISTORY TAB */}
        {tab==='history'&&(
          <div className="anim-2">
            {transactions.length===0?(
              <div style={{background:'white',border:'1.5px solid #e2e8f0',borderRadius:20,padding:'48px 20px',textAlign:'center'}}>
                <div style={{fontSize:42,marginBottom:12}}>📋</div>
                <p style={{fontSize:15,fontWeight:800,color:'#0f172a',marginBottom:6}}>No transactions yet</p>
                <p style={{fontSize:13,color:'#94a3b8'}}>Your credit history will appear here.</p>
              </div>
            ):(
              <div style={{background:'white',border:'1.5px solid #e2e8f0',borderRadius:20,overflow:'hidden'}}>
                {transactions.map((t,i)=>{
                  const isUsage=t.type==='usage';
                  return(
                    <div key={t.id} style={{display:'flex',alignItems:'center',gap:12,padding:'13px 16px',borderBottom:i<transactions.length-1?'1px solid #f8fafc':'none'}}>
                      <div style={{width:38,height:38,borderRadius:11,background:isUsage?'#fee2e2':'#f0fdf4',display:'flex',alignItems:'center',justifyContent:'center',fontSize:17,flexShrink:0}}>
                        {getTypeIcon(t.type)}
                      </div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:13,fontWeight:700,color:'#0f172a',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{t.description||t.type}</div>
                        <div style={{fontSize:11,color:'#94a3b8',marginTop:1,display:'flex',alignItems:'center',gap:3}}>
                          <Clock size={10}/>{new Date(t.created_at).toLocaleDateString('en-US',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}
                        </div>
                      </div>
                      <span style={{fontSize:15,fontWeight:900,color:isUsage?'#dc2626':'#16a34a',flexShrink:0}}>
                        {isUsage?'-':'+'}{Math.abs(t.amount)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      <MobileNav/>
      <style>{`@keyframes efSpin{to{transform:rotate(360deg)}}::-webkit-scrollbar{display:none}`}</style>
    </div>
  );
}
