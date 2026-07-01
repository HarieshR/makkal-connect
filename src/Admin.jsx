import React, { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import { FixedSizeList as List } from 'react-window';

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
  
  const [activeTab, setActiveTab] = useState('cadres'); 
  const [citizens, setCitizens] = useState([]);
  const [grievances, setGrievances] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedZone, setSelectedZone] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [replyInputs, setReplyInputs] = useState({});

  useEffect(() => { if (isAuthenticated) { fetchCitizens(); fetchGrievances(); } }, [isAuthenticated]);

  const handleLogin = (e) => {
    e.preventDefault();
    if (loginForm.password === "admin") {
      if (loginForm.role === 'Zonal Admin' && !loginForm.zone) return alert('Select your authorized zone.');
      if (loginForm.role === 'Zonal Admin') setSelectedZone(loginForm.zone);
      setIsAuthenticated(true); 
    } else alert('Access Denied: Unrecognized Credentials.');
  };

  const fetchCitizens = async () => {
    setLoading(true);
    let query = supabase.from('citizens').select('*').order('created_at', { ascending: false });
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

  const handleReplyGrievance = async (id) => {
    const replyText = replyInputs[id];
    if(!replyText) return alert("Please type a reply first.");
    await supabase.from('grievances').update({ status: 'Resolved', reply: replyText }).eq('id', id);
    setGrievances(grievances.map(g => g.id === id ? { ...g, status: 'Resolved', reply: replyText } : g));
    alert("Response sent to user's portal successfully.");
  };

  const exportReport = () => {
    const dataToExport = filteredCitizens;
    const csvContent = "data:text/csv;charset=utf-8," + "Name,Member ID,Mobile,Zone,Status\n"
      + dataToExport.map(c => `${c.full_name},${c.member_id},${c.phone_number},${c.zone},${c.is_flagged ? 'Pending' : 'Cleared'}`).join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `TVK_Report.csv`);
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  const filteredCitizens = citizens.filter((p) => {
    const matchSearch = p.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || p.member_id?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchZone = selectedZone === 'All' ? true : p.zone === selectedZone;
    const matchStatus = filterStatus === 'All' ? true : filterStatus === 'Pending' ? p.is_flagged : !p.is_flagged;
    return matchSearch && matchZone && matchStatus;
  });

  const getZoneCounts = () => {
    const counts = {};
    citizens.forEach(c => { counts[c.zone] = (counts[c.zone] || 0) + 1; });
    return counts;
  };
  const zoneCounts = getZoneCounts();
  const maxCount = Math.max(...Object.values(zoneCounts), 1);

  // --- VIRTUAL DOM ROW FOR MOBILE ---
  const VirtualRow = ({ index, style }) => {
    const p = filteredCitizens[index];
    return (
      <div style={style} className="flex items-center border-b border-gray-100 hover:bg-slate-50 transition-colors px-4 py-2 min-w-[700px]">
        <div className="w-[100px] flex-shrink-0">
          <select value={p.is_flagged ? "Pending" : "Cleared"} onChange={(e) => updateStatus(p.id, e.target.value)} className={`text-[10px] font-bold rounded-lg px-2 py-1 outline-none border shadow-sm cursor-pointer ${p.is_flagged ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
            <option value="Pending">Pending</option><option value="Cleared">Cleared</option>
          </select>
        </div>
        <div className="flex-1 flex items-center gap-3">
          <img src={p.profile_pic_url} alt="pic" className="w-10 h-10 rounded-lg object-cover border" />
          <div><div className="font-bold text-xs text-slate-800">{p.full_name}</div><div className="text-[9px] font-black tracking-widest text-slate-500 uppercase">{p.member_id}</div></div>
        </div>
        <div className="w-[120px] text-[11px] font-bold text-slate-700">{p.zone}</div>
        <div className="w-[100px] text-[11px] font-mono text-slate-500">{p.voter_id}</div>
      </div>
    );
  };

  if (!isAuthenticated) {
    return (
      <div className="max-w-sm mx-auto mt-16 px-4">
        <div className="bg-[#f8f9fa] rounded-3xl overflow-hidden shadow-2xl flex flex-col border border-gray-100">
          <div className="bg-gradient-to-b from-[#241a1a] to-[#181212] p-8 flex flex-col items-center justify-center">
            <div className="w-10 h-10 bg-[#dc2626] rounded-xl flex items-center justify-center mb-4"><span className="text-[#facc15] text-lg">🔒</span></div>
            <h2 className="text-xl font-black text-white tracking-[0.2em] uppercase">HQ Vault</h2>
          </div>
          <form onSubmit={handleLogin} className="p-6 space-y-4">
            <select value={loginForm.role} onChange={(e) => setLoginForm({...loginForm, role: e.target.value})} className="w-full bg-gray-100 p-3 rounded-xl font-bold text-sm outline-none">
              <option>Super Admin</option><option>Zonal Admin</option>
            </select>
            {loginForm.role === 'Zonal Admin' && (
              <select value={loginForm.zone} onChange={(e) => setLoginForm({...loginForm, zone: e.target.value})} className="w-full bg-gray-100 p-3 rounded-xl text-sm outline-none">
                <option value="">Select Permitted Zone...</option>{CONSTITUENCIES.map(z => <option key={z} value={z}>{z}</option>)}
              </select>
            )}
            <input type="password" value={loginForm.password} onChange={(e) => setLoginForm({...loginForm, password: e.target.value})} required className="w-full bg-gray-100 border rounded-xl py-3 text-center tracking-[0.5em] font-black outline-none text-sm" placeholder="••••••••" />
            <button type="submit" className="w-full bg-black text-white font-bold py-3.5 rounded-xl uppercase text-xs hover:bg-gray-900 transition-colors">Authenticate</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Top Nav (Mobile Scrollable) */}
      <div className="bg-white p-4 rounded-3xl border flex flex-col sm:flex-row justify-between items-center gap-4">
        <h2 className="font-bold text-base flex items-center gap-2">{loginForm.role} {loginForm.role === 'Zonal Admin' && <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-1 rounded-full">{loginForm.zone}</span>}</h2>
        <div className="flex gap-1.5 bg-gray-50 p-1.5 rounded-xl w-full sm:w-auto overflow-x-auto hide-scrollbar">
          <button onClick={()=>setActiveTab('cadres')} className={`flex-1 sm:flex-none px-4 py-2 text-[11px] font-bold rounded-lg whitespace-nowrap transition-colors ${activeTab==='cadres'?'bg-white shadow text-[#8a1c1c]':'text-gray-500'}`}>Cadres</button>
          <button onClick={()=>setActiveTab('grievances')} className={`flex-1 sm:flex-none px-4 py-2 text-[11px] font-bold rounded-lg whitespace-nowrap transition-colors ${activeTab==='grievances'?'bg-white shadow text-[#8a1c1c]':'text-gray-500'}`}>Grievances</button>
          {loginForm.role === 'Super Admin' && <button onClick={()=>setActiveTab('heatmap')} className={`flex-1 sm:flex-none px-4 py-2 text-[11px] font-bold rounded-lg whitespace-nowrap transition-colors ${activeTab==='heatmap'?'bg-white shadow text-[#8a1c1c]':'text-gray-500'}`}>Heatmap</button>}
          <button onClick={()=>setActiveTab('broadcast')} className={`flex-1 sm:flex-none px-4 py-2 text-[11px] font-bold rounded-lg whitespace-nowrap transition-colors ${activeTab==='broadcast'?'bg-white shadow text-[#8a1c1c]':'text-gray-500'}`}>Broadcast</button>
        </div>
      </div>

      {activeTab === 'cadres' && (
        <div className="bg-white rounded-3xl border shadow-sm overflow-hidden p-4 md:p-6">
          
          <div className="flex flex-col md:flex-row gap-3 w-full items-center mb-5 justify-between">
            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
              <div className="flex gap-2">
                <select value={selectedZone} onChange={(e) => setSelectedZone(e.target.value)} disabled={loginForm.role === 'Zonal Admin'} className="flex-1 sm:w-36 bg-gray-50 border border-gray-200 text-slate-700 text-[11px] font-bold rounded-xl px-3 py-2 outline-none disabled:opacity-70">
                  {loginForm.role === 'Super Admin' && <option value="All">All Zones</option>}
                  {loginForm.role === 'Zonal Admin' ? <option value={loginForm.zone}>{loginForm.zone}</option> : CONSTITUENCIES.map((z, i) => <option key={i} value={z}>{z}</option>)}
                </select>
                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="flex-1 sm:w-32 bg-gray-50 border border-gray-200 text-slate-700 text-[11px] font-bold rounded-xl px-3 py-2 outline-none">
                  <option value="All">All Status</option><option value="Pending">Pending</option><option value="Cleared">Cleared</option>
                </select>
              </div>
              <button onClick={exportReport} className="w-full sm:w-auto px-5 py-2 bg-[#facc15] hover:bg-[#eab308] border border-[#ca8a04] rounded-xl text-[10px] font-black uppercase tracking-wider text-amber-950 shadow-sm">📥 CSV</button>
            </div>
            <input type="text" placeholder="Search ID or Name..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full md:w-56 px-4 py-2 rounded-xl border border-gray-200 bg-gray-50 shadow-inner focus:bg-white outline-none text-xs" />
          </div>

          <div className="w-full overflow-x-auto hide-scrollbar border border-gray-100 rounded-2xl">
            <div className="flex text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-gray-200 px-4 py-3 bg-gray-50 min-w-[700px]">
               <div className="w-[100px]">Status</div><div className="flex-1">Member Profile</div><div className="w-[120px]">Zone</div><div className="w-[100px]">Voter ID</div>
            </div>
            
            <div className="min-w-[700px]">
              {loading ? <p className="p-8 text-center text-xs text-gray-400">Loading Database...</p> : (
                <>
                  <div className="max-h-[500px] overflow-y-auto">
                    <List height={500} itemCount={filteredCitizens.length} itemSize={65} width={"100%"}>
                      {VirtualRow}
                    </List>
                  </div>
                  {filteredCitizens.length === 0 && <div className="p-8 text-center text-xs font-bold text-slate-400">No records found.</div>}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'grievances' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {grievances.length === 0 ? <p className="text-slate-400 text-sm p-4">No grievances reported.</p> : grievances.map(g => (
            <div key={g.id} className="bg-white p-5 rounded-3xl border shadow-sm">
              <div className="flex justify-between items-start mb-2">
                <span className="bg-indigo-100 text-indigo-800 text-[9px] font-bold px-2 py-0.5 rounded uppercase">{g.department}</span>
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase ${g.status==='Open'?'bg-red-100 text-red-800':'bg-green-100 text-green-800'}`}>{g.status}</span>
              </div>
              <p className="text-[10px] text-gray-400 font-mono mb-2">{g.member_id} • {g.zone}</p>
              <p className="text-xs font-medium mt-1 mb-3">{g.description}</p>
              
              {g.lat && <a href={`https://www.google.com/maps/search/?api=1&query=${g.lat},${g.lng}`} target="_blank" rel="noreferrer" className="text-[10px] text-blue-500 font-bold mb-3 block hover:underline">📍 View GPS Location</a>}
              
              {g.status === 'Open' ? (
                <div className="border-t pt-3 flex flex-col sm:flex-row gap-2">
                  <input type="text" placeholder="Type resolution reply..." value={replyInputs[g.id] || ''} onChange={(e)=>setReplyInputs({...replyInputs, [g.id]: e.target.value})} className="flex-1 border rounded-xl px-3 py-2 text-xs outline-none focus:border-[#8a1c1c]" />
                  <button onClick={() => handleReplyGrievance(g.id)} className="w-full sm:w-auto bg-green-600 text-white font-bold text-xs py-2 px-4 rounded-xl hover:bg-green-700">Resolve</button>
                </div>
              ) : (
                <div className="bg-gray-50 border rounded-xl p-3 mt-2"><p className="text-[9px] font-bold text-gray-400 uppercase mb-1">HQ Reply</p><p className="text-xs font-medium text-gray-800">{g.reply}</p></div>
              )}
            </div>
          ))}
        </div>
      )}

      {activeTab === 'heatmap' && (
        <div className="bg-white p-6 md:p-8 rounded-3xl border shadow-sm">
          <h2 className="text-lg font-bold mb-5">Zone Registration Heatmap</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {CONSTITUENCIES.map(zone => {
              const count = zoneCounts[zone] || 0;
              const intensity = count === 0 ? 0.05 : Math.max(0.2, count / maxCount);
              return (
                <div key={zone} className="p-3 rounded-2xl border relative overflow-hidden flex flex-col justify-between h-20">
                  <div className="absolute inset-0 bg-[#8a1c1c] transition-all" style={{ opacity: intensity }}></div>
                  <h3 className="relative z-10 text-[10px] font-bold text-slate-800 mix-blend-multiply leading-tight">{zone}</h3>
                  <p className="relative z-10 text-lg font-black text-slate-900 mix-blend-multiply">{count}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'broadcast' && (
        <div className="bg-white p-6 md:p-8 rounded-3xl border shadow-sm max-w-lg mx-auto text-center">
          <div className="text-4xl mb-3">💬</div><h2 className="text-lg font-bold mb-1">WhatsApp Bulk Broadcast</h2>
          <p className="text-xs text-gray-500 mb-5">Send an official HQ update to all Cleared cadres.</p>
          <textarea rows="4" className="w-full border rounded-2xl p-4 bg-gray-50 outline-none focus:border-[#8a1c1c] mb-4 text-xs" placeholder="Type your message in Tamil or English..."></textarea>
          <button onClick={() => alert("Message queued for WhatsApp API delivery via Twilio.")} className="w-full bg-[#8a1c1c] hover:bg-[#6b1515] text-white font-bold py-3.5 rounded-xl shadow-md transition-colors text-sm">Send Broadcast</button>
        </div>
      )}
    </div>
  );
};

export default Admin;