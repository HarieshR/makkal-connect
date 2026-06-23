import React, { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';

const Admin = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState('');
  const MASTER_PASSWORD = "admin"; 

  const [citizens, setCitizens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (isAuthenticated) fetchCitizens();
  }, [isAuthenticated]);

  const handleLogin = (e) => {
    e.preventDefault();
    if (passwordInput === MASTER_PASSWORD) {
      setIsAuthenticated(true);
      setAuthError('');
    } else {
      setAuthError('Access Denied: Unrecognized Credentials.');
      setPasswordInput('');
    }
  };

  const fetchCitizens = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('citizens').select('*').order('created_at', { ascending: false });
    if (error) console.error("Error fetching data:", error.message);
    else setCitizens(data);
    setLoading(false);
  };

  const filteredCitizens = citizens.filter((person) =>
    person.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    person.voter_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    person.phone_number?.includes(searchTerm)
  );

  const totalRegistrations = citizens.length;
  const today = new Date().toDateString();
  const registrationsToday = citizens.filter(person => new Date(person.created_at).toDateString() === today).length;
  const activeZones = new Set(citizens.map(person => person.zone).filter(Boolean)).size;

  // --- PREMIUM LOGIN VAULT ---
  if (!isAuthenticated) {
    return (
      <div className="max-w-sm mx-auto mt-24 relative animate-in fade-in zoom-in-95 duration-500">
        <div className="absolute -inset-1 bg-red-600 rounded-3xl blur-2xl opacity-40 animate-pulse"></div>
        <div className="relative bg-[#f8f9fa] rounded-2xl overflow-hidden shadow-2xl flex flex-col border border-gray-100">
          <div className="bg-gradient-to-b from-[#241a1a] to-[#181212] p-10 flex flex-col items-center justify-center border-b border-[#3a2828] relative overflow-hidden">
            {/* Subtle background grid pattern inside vault header */}
            <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]"></div>
            <div className="w-12 h-12 bg-[#dc2626] rounded-xl flex items-center justify-center mb-5 shadow-inner relative z-10 border border-red-500/50">
              <span className="text-[#facc15] text-xl drop-shadow-md">🔒</span>
            </div>
            <h2 className="text-2xl font-black text-white tracking-[0.25em] uppercase relative z-10">HQ Vault</h2>
            <p className="text-[#ef4444] text-[10px] font-bold uppercase mt-2 tracking-widest relative z-10">Restricted Access</p>
          </div>

          <div className="p-8 bg-[#fdfdfd]">
            <form onSubmit={handleLogin} className="space-y-5">
              {authError && <div className="bg-red-50 text-red-700 p-3 rounded-lg text-xs font-bold text-center animate-in shake border border-red-100">{authError}</div>}
              <input 
                type="password" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} required
                className="w-full bg-[#f4f4f5] border border-gray-200 focus:border-[#8a1c1c] focus:ring-4 focus:ring-[#8a1c1c]/10 focus:bg-white rounded-xl py-4 text-center tracking-[0.5em] font-black text-xl text-slate-800 outline-none transition-all shadow-inner" 
                placeholder="••••••••"
              />
              <button type="submit" className="w-full bg-[#1c1917] hover:bg-black text-white font-bold py-4 rounded-xl tracking-widest uppercase text-xs shadow-lg hover:shadow-xl transition-all active:scale-95">
                Authenticate
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // --- UNLOCKED COMMAND CENTER DASHBOARD ---
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
      
      {/* Header, Search, and Action Buttons */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-4 mb-4">
        <div>
           <h2 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
             Movement Data 
             <span className="flex h-2.5 w-2.5 relative mt-1">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
           </h2>
           <p className="text-sm font-medium text-slate-400 mt-1">Live synchronisation active.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          {/* Export Button */}
          <button className="px-5 py-2.5 bg-white border border-gray-200 rounded-full text-sm font-bold text-slate-600 shadow-sm hover:border-[#8a1c1c] hover:text-[#8a1c1c] transition-colors flex items-center justify-center gap-2">
            <span>📥</span> Export CSV
          </button>
          
          {/* Lock Vault Button */}
          <button onClick={() => { setIsAuthenticated(false); setPasswordInput(''); }} className="px-5 py-2.5 bg-slate-800 hover:bg-black rounded-full text-sm font-bold text-white shadow-md transition-colors flex items-center justify-center gap-2">
            <span>🔒</span> Lock Vault
          </button>

          <div className="relative w-full md:w-72">
            <input 
              type="text" placeholder="Search records..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-full border border-gray-200 bg-white shadow-sm focus:ring-2 focus:ring-[#8a1c1c]/20 focus:border-[#8a1c1c] outline-none text-sm font-medium transition-all"
            />
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">🔍</div>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-300 bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200 hidden sm:block">⌘K</div>
          </div>
        </div>
      </div>

      {/* The 3 Premium Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-[#8a1c1c] to-[#5a0c0c] border border-[#a32a2a] shadow-lg rounded-[2rem] p-8 relative overflow-hidden text-white flex flex-col justify-between h-48 group hover:-translate-y-1 transition-transform">
          <div className="absolute top-0 right-0 opacity-10 text-8xl -mt-4 -mr-4 transition-transform group-hover:scale-110">🙏</div>
          <div className="flex justify-between items-start relative z-10">
            <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-sm shadow-inner"><span className="text-2xl">🙏</span></div>
            <div className="text-right">
              <h3 className="text-5xl font-bold tracking-tight">{totalRegistrations}</h3>
              <p className="text-red-200 text-sm font-medium mt-1">Total Cadres</p>
            </div>
          </div>
          <div className="w-full h-12 opacity-50 relative mt-4">
             <svg viewBox="0 0 100 30" className="w-full h-full stroke-white fill-none stroke-2" preserveAspectRatio="none"><path d="M0,20 Q10,25 20,15 T40,20 T60,10 T80,25 T100,5" /></svg>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-[#facc15] to-[#d97706] border border-[#fde047] shadow-lg rounded-[2rem] p-8 relative overflow-hidden text-[#5a0c0c] flex flex-col justify-between h-48 group hover:-translate-y-1 transition-transform">
          <div className="absolute top-0 right-0 opacity-10 text-8xl -mt-4 -mr-4 transition-transform group-hover:scale-110">👤</div>
          <div className="flex justify-between items-start relative z-10">
            <div className="bg-white/30 p-3 rounded-2xl backdrop-blur-sm text-2xl shadow-inner">📈</div>
            <div className="text-right">
              <h3 className="text-5xl font-bold tracking-tight">+{registrationsToday}</h3>
              <p className="text-amber-900/70 text-sm font-medium mt-1">Enrolled Today</p>
            </div>
          </div>
          <div className="text-right text-sm font-bold opacity-70 mt-auto">↗ Trending Upwards</div>
        </div>

        <div className="bg-gradient-to-br from-[#334155] to-[#1e293b] border border-[#475569] shadow-lg rounded-[2rem] p-8 relative overflow-hidden text-white flex flex-col justify-between h-48 group hover:-translate-y-1 transition-transform">
          <div className="absolute top-0 right-0 opacity-10 text-8xl -mt-4 -mr-4 transition-transform group-hover:scale-110">📍</div>
          <div className="flex justify-between items-start relative z-10">
            <div className="bg-white/10 p-3 rounded-2xl backdrop-blur-sm text-2xl shadow-inner">📍</div>
            <div className="text-right">
              <h3 className="text-5xl font-bold tracking-tight">{activeZones}</h3>
              <p className="text-slate-400 text-sm font-medium mt-1">Active Zones</p>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-auto text-sm text-emerald-400 font-medium">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div> Grid Active
          </div>
        </div>
      </div>

      {/* Clean Minimalist Table */}
      <div className="bg-white rounded-[2rem] border border-gray-100 shadow-[0_4px_40px_rgb(0,0,0,0.04)] overflow-hidden">
        <div className="overflow-x-auto p-2">
          {loading ? (
            /* --- SKELETON LOADER --- */
            <div className="py-10 px-6 space-y-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex gap-8 animate-pulse items-center">
                  <div className="h-10 bg-slate-100 rounded-lg w-1/4"></div>
                  <div className="h-10 bg-slate-100 rounded-lg w-1/4"></div>
                  <div className="h-10 bg-slate-100 rounded-lg w-1/4"></div>
                  <div className="h-10 bg-slate-100 rounded-lg w-1/4"></div>
                </div>
              ))}
            </div>
          ) : (
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr>
                  <th className="px-8 py-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-gray-100">Voter ID (EPIC)</th>
                  <th className="px-8 py-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-gray-100">Cadre Details</th>
                  <th className="px-8 py-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-gray-100">Contact</th>
                  <th className="px-8 py-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-gray-100">Aadhaar</th>
                  <th className="px-8 py-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-gray-100 text-right">Enrollment Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredCitizens.length === 0 ? (
                  <tr><td colSpan="5" className="py-16 text-center text-slate-400 font-medium">No matching records found in the secure grid.</td></tr>
                ) : (
                  filteredCitizens.map((person) => (
                    <tr key={person.id} className="hover:bg-slate-50/50 transition-colors group cursor-default">
                      <td className="px-8 py-5">
                        <div className="font-bold text-slate-800 font-mono tracking-tight">{person.voter_id}</div>
                        <div className="text-[9px] font-black tracking-widest text-[#8a1c1c] bg-[#8a1c1c]/10 px-2 py-0.5 rounded inline-block mt-1 uppercase">Verified</div>
                      </td>
                      <td className="px-8 py-5">
                        <div className="font-bold text-slate-800">{person.full_name}</div>
                        <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>{person.zone}
                        </div>
                      </td>
                      <td className="px-8 py-5 text-slate-600 font-medium font-mono text-sm">
                        {person.phone_number ? `+91 ${person.phone_number}` : "—"}
                      </td>
                      <td className="px-8 py-5 text-slate-500 font-mono text-sm tracking-widest">
                        {person.aadhaar_number ? `**** ${person.aadhaar_number.toString().slice(-4)}` : "—"}
                      </td>
                      <td className="px-8 py-5 text-slate-400 text-sm font-medium text-right group-hover:text-slate-600 transition-colors">
                        {new Date(person.created_at).toLocaleDateString('en-US', {month:'short', day:'numeric', year:'numeric'})}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default Admin;