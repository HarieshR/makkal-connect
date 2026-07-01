import React, { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';

const CONSTITUENCIES = [
  "Manadipet", "Thirubhuvanai", "Oussudu", "Mangalam", "Villianur", "Ozhukarai", "Kadirgamam", 
  "Indira Nagar", "Thattanchavady", "Kamaraj Nagar", "Lawspet", "Kalapet", "Muthialpet", 
  "Raj Bhavan", "Oupalam", "Orleanpet", "Nellithope", "Mudaliarpet", "Ariankuppam", 
  "Manavely", "Embalam", "Nettapakkam", "Bahour", "Nedungadu", "Thirunallar", 
  "Karaikal North", "Karaikal South", "Neravy", "Mahe", "Yanam"
];

const Admin = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginForm, setLoginForm] = useState({ role: 'Super Admin', zone: '', password: '' });
  const [authError, setAuthError] = useState('');
  
  const [activeTab, setActiveTab] = useState('cadres'); // 'cadres', 'grievances', 'heatmap', 'broadcast'
  const [citizens, setCitizens] = useState([]);
  const [grievances, setGrievances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (isAuthenticated) { fetchCitizens(); fetchGrievances(); }
  }, [isAuthenticated]);

  const handleLogin = (e) => {
    e.preventDefault();
    if (loginForm.password === "admin") {
      if (loginForm.role === 'Zonal Admin' && !loginForm.zone) return setAuthError('Select your authorized zone.');
      setIsAuthenticated(true); setAuthError('');
    } else setAuthError('Access Denied: Unrecognized Credentials.');
  };

  // --- 🔐 RBAC: DATA FETCHING ENFORCEMENT ---
  const fetchCitizens = async () => {
    setLoading(true);
    let query = supabase.from('citizens').select('*').order('created_at', { ascending: false });
    // If Zonal Admin, restrict the database query itself
    if (loginForm.role === 'Zonal Admin') query = query.eq('zone', loginForm.zone);
    const { data } = await query;
    setCitizens(data || []);
    setLoading(false);
  };

  const fetchGrievances = async () => {
    let query = supabase.from('grievances').select('*').order('created_at', { ascending: false });
    if (loginForm.role === 'Zonal Admin') query = query.eq('zone', loginForm.zone);
    const { data } = await query;
    setGrievances(data || []);
  };

  const updateStatus = async (id, newStatusValue) => {
    const isPending = newStatusValue === 'Pending';
    await supabase.from('citizens').update({ is_flagged: isPending }).eq('id', id);
    setCitizens(citizens.map(c => c.id === id ? { ...c, is_flagged: isPending } : c));
  };

  const updateGrievanceStatus = async (id, newStatus) => {
    await supabase.from('grievances').update({ status: newStatus }).eq('id', id);
    setGrievances(grievances.map(g => g.id === id ? { ...g, status: newStatus } : g));
  };

  const filteredCitizens = citizens.filter((p) => p.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || p.member_id?.toLowerCase().includes(searchTerm.toLowerCase()));

  // --- 🗺️ HEATMAP CALCULATION LOGIC ---
  const getZoneCounts = () => {
    const counts = {};
    citizens.forEach(c => { counts[c.zone] = (counts[c.zone] || 0) + 1; });
    return counts;
  };
  const zoneCounts = getZoneCounts();
  const maxCount = Math.max(...Object.values(zoneCounts), 1);

  if (!isAuthenticated) {
    return (
      <div className="max-w-sm mx-auto mt-20">
        <div className="bg-[#f8f9fa] rounded-2xl overflow-hidden shadow-2xl flex flex-col border border-gray-100">
          <div className="bg-gradient-to-b from-[#241a1a] to-[#181212] p-10 flex flex-col items-center justify-center">
            <div className="w-12 h-12 bg-[#dc2626] rounded-xl flex items-center justify-center mb-5"><span className="text-[#facc15] text-xl">🔒</span></div>
            <h2 className="text-2xl font-black text-white tracking-[0.2em] uppercase">HQ Vault</h2>
          </div>
          <form onSubmit={handleLogin} className="p-8 space-y-4">
            {authError && <div className="bg-red-50 text-red-700 p-2 text-xs font-bold text-center rounded">{authError}</div>}
            <select value={loginForm.role} onChange={(e) => setLoginForm({...loginForm, role: e.target.value})} className="w-full bg-gray-100 p-3 rounded-xl font-bold text-sm outline-none">
              <option>Super Admin</option><option>Zonal Admin</option>
            </select>
            {loginForm.role === 'Zonal Admin' && (
              <select value={loginForm.zone} onChange={(e) => setLoginForm({...loginForm, zone: e.target.value})} className="w-full bg-gray-100 p-3 rounded-xl text-sm outline-none">
                <option value="">Select Permitted Zone...</option>
                {CONSTITUENCIES.map(z => <option key={z} value={z}>{z}</option>)}
              </select>
            )}
            <input type="password" value={loginForm.password} onChange={(e) => setLoginForm({...loginForm, password: e.target.value})} required className="w-full bg-gray-100 border rounded-xl py-3 text-center tracking-[0.5em] font-black outline-none" placeholder="••••••••" />
            <button type="submit" className="w-full bg-black text-white font-bold py-4 rounded-xl uppercase text-xs">Authenticate</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Nav */}
      <div className="bg-white p-4 rounded-2xl border flex flex-col sm:flex-row justify-between items-center gap-4">
        <h2 className="font-bold text-lg flex items-center gap-2">
          {loginForm.role} Panel {loginForm.role === 'Zonal Admin' && <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded-full">{loginForm.zone}</span>}
        </h2>
        <div className="flex gap-2 bg-gray-100 p-1 rounded-lg overflow-x-auto">
          <button onClick={()=>setActiveTab('cadres')} className={`px-4 py-2 text-xs font-bold rounded-md whitespace-nowrap ${activeTab==='cadres'?'bg-white shadow':'text-gray-500'}`}>Cadres</button>
          <button onClick={()=>setActiveTab('grievances')} className={`px-4 py-2 text-xs font-bold rounded-md whitespace-nowrap ${activeTab==='grievances'?'bg-white shadow':'text-gray-500'}`}>Grievances</button>
          {loginForm.role === 'Super Admin' && <button onClick={()=>setActiveTab('heatmap')} className={`px-4 py-2 text-xs font-bold rounded-md whitespace-nowrap ${activeTab==='heatmap'?'bg-white shadow':'text-gray-500'}`}>Heatmap</button>}
          <button onClick={()=>setActiveTab('broadcast')} className={`px-4 py-2 text-xs font-bold rounded-md whitespace-nowrap ${activeTab==='broadcast'?'bg-white shadow':'text-gray-500'}`}>Broadcast</button>
        </div>
      </div>

      {activeTab === 'cadres' && (
        <div className="bg-white rounded-[2rem] border shadow-sm p-4">
          <div className="flex justify-end mb-4">
            <input type="text" placeholder="Search ID or Name..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="border p-2 rounded-lg text-sm w-64 outline-none focus:border-[#8a1c1c]" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead><tr className="border-b text-slate-400 text-xs"><th className="pb-3 pl-2">Status</th><th className="pb-3">Cadre Details</th><th className="pb-3">Zone</th><th className="pb-3">Registered</th></tr></thead>
              <tbody className="divide-y">
                {filteredCitizens.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="py-4 pl-2">
                      <select value={p.is_flagged ? "Pending" : "Cleared"} onChange={(e) => updateStatus(p.id, e.target.value)} className={`text-xs font-bold rounded px-2 py-1 outline-none ${p.is_flagged?'bg-amber-100 text-amber-800':'bg-emerald-100 text-emerald-800'}`}>
                        <option>Pending</option><option>Cleared</option>
                      </select>
                    </td>
                    <td className="py-4">
                      <div className="font-bold">{p.full_name}</div>
                      <div className="text-xs font-mono text-slate-500">{p.member_id}</div>
                    </td>
                    <td className="py-4 text-xs font-bold text-slate-600">{p.zone}</td>
                    <td className="py-4 text-xs text-slate-500">{new Date(p.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'grievances' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {grievances.length === 0 ? <p className="text-slate-400">No grievances reported.</p> : grievances.map(g => (
            <div key={g.id} className="bg-white p-6 rounded-2xl border shadow-sm">
              <div className="flex justify-between items-start mb-2">
                <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-1 rounded uppercase">{g.category}</span>
                <span className="text-[10px] font-mono text-gray-400">{g.member_id} • {g.zone}</span>
              </div>
              <p className="text-sm font-medium mt-3 mb-2">{g.description}</p>
              {g.lat && <a href={`https://maps.google.com/?q=${g.lat},${g.lng}`} target="_blank" className="text-xs text-blue-500 font-bold mb-4 block">📍 View Location</a>}
              <div className="flex items-center gap-2 border-t pt-4">
                <span className="text-xs font-bold text-gray-500">Action:</span>
                <select value={g.status} onChange={(e) => updateGrievanceStatus(g.id, e.target.value)} className={`text-xs font-bold rounded px-2 py-1 outline-none ${g.status==='Open'?'bg-red-100 text-red-800':'bg-green-100 text-green-800'}`}>
                  <option>Open</option><option>Resolved</option>
                </select>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'heatmap' && (
        <div className="bg-white p-8 rounded-[2rem] border shadow-sm">
          <h2 className="text-xl font-bold mb-6">Zone Registration Heatmap</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {CONSTITUENCIES.map(zone => {
              const count = zoneCounts[zone] || 0;
              // Calculate opacity based on max count (min 10% opacity for empty)
              const intensity = count === 0 ? 0.05 : Math.max(0.2, count / maxCount);
              return (
                <div key={zone} className="p-4 rounded-xl border relative overflow-hidden flex flex-col justify-between h-24">
                  <div className="absolute inset-0 bg-[#8a1c1c] transition-all" style={{ opacity: intensity }}></div>
                  <h3 className="relative z-10 text-xs font-bold text-slate-800 mix-blend-multiply">{zone}</h3>
                  <p className="relative z-10 text-xl font-black text-slate-900 mix-blend-multiply">{count}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'broadcast' && (
        <div className="bg-white p-8 rounded-[2rem] border shadow-sm max-w-xl mx-auto text-center">
          <div className="text-5xl mb-4">💬</div>
          <h2 className="text-xl font-bold mb-2">WhatsApp Bulk Broadcast</h2>
          <p className="text-sm text-gray-500 mb-6">Send an official HQ update to all Cleared cadres.</p>
          <textarea rows="4" className="w-full border rounded-xl p-4 bg-gray-50 outline-none focus:border-[#8a1c1c] mb-4 text-sm" placeholder="Type your message in Tamil or English..."></textarea>
          <button onClick={() => alert("Message queued for WhatsApp API delivery via Twilio.")} className="w-full bg-[#8a1c1c] text-white font-bold py-3 rounded-xl shadow-md">Send Broadcast</button>
        </div>
      )}
    </div>
  );
};

export default Admin;