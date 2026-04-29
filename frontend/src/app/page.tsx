'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { loginUser } from '@/lib/api';
import { TEST_ACCOUNTS, VENTURES } from '@/lib/constants';
import { 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  ChevronDown, 
  LayoutDashboard,
  Building2,
  Briefcase,
  Sparkles
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [selectedVenture, setSelectedVenture] = useState<string>('');
  
  // Mouse tracking state for the WOW spotlight effect
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);
  
  const availableAccounts = useMemo(() => {
    if (!selectedVenture) return [];
    if (selectedVenture === 'all') {
      return TEST_ACCOUNTS.filter(acc => acc.ventureSlug === 'all');
    }
    return TEST_ACCOUNTS.filter(acc => acc.ventureSlug === selectedVenture || acc.ventureSlug === 'all');
  }, [selectedVenture]);

  const handleAccountSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const accEmail = e.target.value;
    if (!accEmail) return;
    
    const acc = TEST_ACCOUNTS.find(a => a.email === accEmail);
    if (acc) {
      setEmail(acc.email);
      setPassword(acc.password);
      toast.success(`Autofilled ${acc.label}`, { icon: '✨' });
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please enter email and password');
      return;
    }
    setLoading(true);
    try {
      const data = await loginUser(email, password);
      if (data.success) {
        localStorage.setItem('internalx_token', data.data.token);
        localStorage.setItem('internalx_user', JSON.stringify(data.data.user));
        toast.success(`Welcome, ${data.data.user.fullName}!`);
        // Slight delay before redirect so they see the success state
        setTimeout(() => router.push('/dashboard'), 600);
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Login failed. Please try again.';
      toast.error(msg);
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen w-full flex items-center justify-center bg-[#030303] text-white relative overflow-hidden font-sans selection:bg-purple-500/30 px-4 py-8 sm:px-6 lg:px-8">
      
      {/* --- WOW FEATURE 1: Interactive Mouse Spotlight --- */}
      <div 
        className="pointer-events-none absolute inset-0 z-10 transition-opacity duration-300 opacity-60"
        style={{
          background: `radial-gradient(600px circle at ${mousePos.x}px ${mousePos.y}px, rgba(139, 92, 246, 0.08), transparent 40%)`,
        }}
      />

      {/* --- WOW FEATURE 2: Dynamic Ambient Background --- */}
      {/* Notice the animation duration drops heavily when `loading` is true to simulate warping/processing! */}
      <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none overflow-hidden">
        <div 
          className={`absolute top-[-10%] left-[-10%] w-[60vw] h-[60vw] max-w-[800px] max-h-[800px] bg-purple-900/15 rounded-full blur-[100px] transition-all duration-1000 ${loading ? 'animate-pulse scale-110' : 'animate-pulse'}`} 
          style={{ animationDuration: loading ? '1s' : '8s' }} 
        />
        <div 
          className={`absolute bottom-[-10%] right-[-10%] w-[60vw] h-[60vw] max-w-[800px] max-h-[800px] bg-cyan-900/15 rounded-full blur-[100px] transition-all duration-1000 ${loading ? 'animate-pulse scale-110' : 'animate-pulse'}`} 
          style={{ animationDuration: loading ? '1.5s' : '10s' }} 
        />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_80%)]"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-[#030303] via-transparent to-[#030303]/80"></div>
      </div>

      <div className="relative z-20 w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-12 lg:gap-16 xl:gap-24 items-center">
        
        {/* Left Content - Staggered entrance */}
        <div className="flex flex-col justify-center text-center lg:text-left space-y-8 lg:space-y-10">
          <div className="flex items-center justify-center lg:justify-start gap-4 lg:gap-5 opacity-0 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
            <div className="relative group/logo">
              <div className="absolute inset-0 bg-purple-500 rounded-2xl blur-xl opacity-40 group-hover/logo:opacity-70 transition-opacity duration-500"></div>
              <div className="w-14 h-14 lg:w-16 lg:h-16 rounded-2xl bg-gradient-to-br from-purple-600 via-indigo-600 to-cyan-600 flex items-center justify-center border border-white/20 ring-1 ring-white/10 shrink-0 relative z-10 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/20 to-white/0 translate-y-[100%] group-hover/logo:translate-y-[-100%] transition-transform duration-700 ease-in-out"></div>
                <LayoutDashboard size={28} className="text-white drop-shadow-md lg:w-8 lg:h-8" />
              </div>
            </div>
            <div className="flex flex-col text-left">
              <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-white leading-none">InternalX</h1>
              <p className="text-xs lg:text-sm text-purple-400 font-bold tracking-[0.2em] uppercase mt-1.5 flex items-center gap-1.5">
                Dropwing Groups <Sparkles size={12} className="inline animate-pulse" />
              </p>
            </div>
          </div>
          
          <h2 className="text-5xl sm:text-6xl lg:text-7xl font-black leading-[1.05] text-white tracking-tight opacity-0 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            Enterprise <br className="hidden lg:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-indigo-400 to-cyan-400 animate-pulse-glow block mt-1">Intelligence.</span>
          </h2>
          
          <p className="text-base sm:text-lg text-gray-400 leading-relaxed max-w-lg mx-auto lg:mx-0 font-medium opacity-0 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
            Secure, centralized access to all venture operations. Authenticate to enter your customized command center.
          </p>

          <div className="flex flex-wrap justify-center lg:justify-start gap-3 pt-2 lg:pt-4 opacity-0 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
            {VENTURES.map(v => (
              <div key={v.slug} className="flex items-center gap-2.5 px-4 py-2 rounded-full bg-white/[0.02] border border-white/5 backdrop-blur-md hover:bg-white/[0.08] hover:border-white/20 transition-all cursor-default group hover:-translate-y-0.5 duration-300">
                <div className="w-2.5 h-2.5 rounded-full shadow-sm group-hover:scale-125 transition-transform duration-300" style={{ backgroundColor: v.color, boxShadow: `0 0 12px ${v.color}` }} />
                <span className="text-[11px] sm:text-xs font-semibold text-gray-300 tracking-wider uppercase">{v.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right Form Card - Holographic Glassmorphism */}
        <div className="w-full max-w-md mx-auto lg:w-full lg:max-w-none opacity-0 animate-fade-in-up" style={{ animationDelay: '0.5s' }}>
          <div className="bg-[#0A0A0A]/40 backdrop-blur-3xl border border-white/[0.08] rounded-[2rem] sm:rounded-[2.5rem] p-6 sm:p-8 lg:p-10 shadow-[0_0_80px_rgba(0,0,0,0.8)] relative overflow-hidden group/card hover:border-white/[0.12] transition-colors duration-500">
            
            {/* Holographic Top Edge */}
            <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-purple-400/50 to-transparent opacity-30 group-hover/card:opacity-100 transition-opacity duration-700" />
            
            {/* Inner ambient glow */}
            <div className="absolute -inset-1 bg-gradient-to-b from-white/[0.03] to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity duration-700 pointer-events-none rounded-[2.5rem]" />
            
            <div className="relative z-10">
              <div className="mb-8 lg:mb-10 text-center lg:text-left">
                <h3 className="text-2xl sm:text-3xl font-bold text-white mb-2 tracking-tight">Sign In</h3>
                <p className="text-sm text-gray-400 font-medium">Access your enterprise workspace</p>
              </div>

              <div className="mb-8 p-4 sm:p-5 rounded-2xl bg-black/50 border border-white-[0.05] shadow-inner relative overflow-hidden group/quick">
                {/* Subtle sheen inside the quick select box */}
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover/quick:opacity-100 transition-opacity duration-500 pointer-events-none"></div>

                <div className="flex items-center gap-2.5 mb-4 text-purple-400 relative z-10">
                  <Briefcase size={16} className="sm:w-[18px] sm:h-[18px]" />
                  <h4 className="text-[11px] sm:text-xs font-bold uppercase tracking-widest">Quick Select</h4>
                </div>
                
                <div className="space-y-3.5 relative z-10">
                  <div className="relative group/select">
                    <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                      <Building2 className="text-gray-500 group-focus-within/select:text-purple-400 transition-colors duration-300" size={18} />
                    </div>
                    <select 
                      value={selectedVenture}
                      onChange={(e) => {
                        setSelectedVenture(e.target.value);
                        setEmail('');
                        setPassword('');
                      }}
                      className="w-full bg-white/[0.02] border border-white/5 rounded-xl py-3.5 pl-11 pr-10 text-sm font-medium text-white appearance-none focus:outline-none focus:border-purple-500/50 focus:bg-white/[0.05] focus:ring-4 focus:ring-purple-500/10 transition-all cursor-pointer hover:border-white/20 hover:bg-white/[0.04]"
                    >
                      <option value="" disabled className="bg-[#0a0a0a] text-gray-500">Choose a venture...</option>
                      <option value="all" className="bg-[#0a0a0a] text-purple-400 font-bold">✧ All Ventures (Super Admin)</option>
                      {VENTURES.map(v => (
                        <option key={v.slug} value={v.slug} className="bg-[#0a0a0a] text-white">{v.name}</option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                      <ChevronDown className="text-gray-500 group-hover/select:text-gray-300 transition-colors" size={16} />
                    </div>
                  </div>

                  <div className="relative group/select">
                    <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                      <LayoutDashboard className={`transition-colors duration-300 ${selectedVenture ? 'text-gray-500 group-focus-within/select:text-purple-400' : 'text-gray-700'}`} size={18} />
                    </div>
                    <select 
                      disabled={!selectedVenture}
                      onChange={handleAccountSelect}
                      defaultValue=""
                      className="w-full bg-white/[0.02] border border-white/5 rounded-xl py-3.5 pl-11 pr-10 text-sm font-medium text-white appearance-none focus:outline-none focus:border-purple-500/50 focus:bg-white/[0.05] focus:ring-4 focus:ring-purple-500/10 transition-all cursor-pointer hover:border-white/20 hover:bg-white/[0.04] disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:border-white/5 disabled:hover:bg-white/[0.02]"
                    >
                      <option value="" disabled className="bg-[#0a0a0a] text-gray-500">Choose a role...</option>
                      {availableAccounts.map(acc => (
                        <option key={acc.email} value={acc.email} className="bg-[#0a0a0a] text-white">
                          {acc.label} (L{acc.level})
                        </option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                      <ChevronDown className="text-gray-500 group-hover/select:text-gray-300 transition-colors" size={16} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 mb-8">
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/10 to-white/10"></div>
                <span className="text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-widest">Or Login Manually</span>
                <div className="flex-1 h-px bg-gradient-to-l from-transparent via-white/10 to-white/10"></div>
              </div>

              <form onSubmit={handleLogin} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-[11px] sm:text-xs font-semibold text-gray-400 ml-1 uppercase tracking-wider">Email Address</label>
                  <div className="relative group/input">
                    <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                      <Mail className="text-gray-500 group-focus-within/input:text-purple-400 transition-colors duration-300" size={18} />
                    </div>
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="name@company.com"
                      className="w-full bg-white/[0.02] border border-white/10 rounded-xl py-3.5 pl-11 pr-4 text-sm font-medium text-white placeholder:text-gray-600 focus:outline-none focus:border-purple-500/50 focus:bg-white/[0.04] focus:ring-4 focus:ring-purple-500/10 transition-all hover:border-white/20 hover:bg-white/[0.04]"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] sm:text-xs font-semibold text-gray-400 ml-1 uppercase tracking-wider">Password</label>
                  <div className="relative group/input">
                    <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                      <Lock className="text-gray-500 group-focus-within/input:text-cyan-400 transition-colors duration-300" size={18} />
                    </div>
                    <input
                      type={showPass ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-white/[0.02] border border-white/10 rounded-xl py-3.5 pl-11 pr-12 text-sm font-medium text-white placeholder:text-gray-600 focus:outline-none focus:border-cyan-500/50 focus:bg-white/[0.04] focus:ring-4 focus:ring-cyan-500/10 transition-all hover:border-white/20 hover:bg-white/[0.04]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(!showPass)}
                      className="absolute inset-y-0 right-3 px-2 flex items-center text-gray-500 hover:text-white transition-colors"
                    >
                      {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full py-4 mt-6 rounded-xl font-bold text-white text-sm shadow-[0_0_20px_rgba(139,92,246,0.25)] hover:shadow-[0_0_30px_rgba(6,182,212,0.4)] transition-all duration-300 transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center relative overflow-hidden group/btn border border-white/10 ${loading ? 'bg-indigo-600' : 'bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-600 hover:from-purple-500 hover:via-indigo-500 hover:to-cyan-500'}`}
                >
                  {/* Sweep shimmer effect */}
                  <div className="absolute inset-0 -translate-x-[150%] bg-gradient-to-r from-transparent via-white/30 to-transparent group-hover/btn:translate-x-[150%] transition-transform duration-1000 ease-in-out"></div>
                  
                  <span className="relative z-10 flex items-center gap-2">
                    {loading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Authenticating...
                      </>
                    ) : 'Authenticate to Nexus'}
                  </span>
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}