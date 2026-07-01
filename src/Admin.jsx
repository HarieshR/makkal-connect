import React, { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';

const CONSTITUENCIES = [
  "Manadipet - 1", "Thirubhuvanai - 2", "Oussudu - 3", "Mangalam - 4", "Villianur - 5",
  "Ozhukarai - 6", "Kadirgamam - 7", "Indira Nagar - 8", "Thattanchavady - 9", "Kamaraj Nagar - 10",
  "Lawspet - 11", "Kalapet - 12", "Muthialpet - 13", "Raj Bhavan - 14", "Oupalam - 15",
  "Orleanpet - 16", "Nellithope - 17", "Mudaliarpet - 18", "Ariankuppam - 19", "Manavely - 20",
  "Embalam - 21", "Nettapakkam - 22", "Bahour - 23", "Nedungadu - 24", "Thirunallar - 25",
  "Karaikal North - 26", "Karaikal South - 27", "Neravy - T.R Pattinam - 28", "Mahe - 29", "Yanam - 30"
];

const Admin = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState('');
  const MASTER_PASSWORD = "admin"; 

  const [citizens, setCitizens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedZone, setSelectedZone] = useState('All');

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

  const toggleFlag = async (id, currentFlagStatus) => {
    const { error } = await supabase.from('citizens').update({ is_flagged: !currentFlagStatus }).eq('id', id);
    if (!error) {
      setCitizens(citizens.map(c => c.id === id ? { ...c, is_flagged: !currentFlagStatus } : c));
    }
  };

  const exportReport = () => {
    const dataToExport = selectedZone === 'All' ? citizens : citizens.filter(c => c.zone === selectedZone);
    const csvContent = "data:text/csv;charset=utf-8," 
      + "Name,Member ID,Mobile Number,Constituency Area,Voter ID,Ration Card,Referral ID,Status\n"
      + dataToExport.map(c => 
          `${c.full_name},${c.member_id || 'N/A'},${c.phone_number},${c.zone},${c.voter_id},${c.family_card || 'N/A'},${c.referral_id || 'N/A'},${c.is_flagged ? 'Flagged' : 'Clear'}`
        ).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `TVK_Report_${selectedZone === 'All' ? 'All_Zones' : selectedZone}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredCitizens = citizens.filter((person) => {
    const matchesSearch = person.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || person.voter_id?.toLowerCase().includes(searchTerm.toLowerCase()) || person.family_card?.includes(searchTerm);
    const matchesZone = selectedZone === 'All' || person.zone === selectedZone;
    return matchesSearch && matchesZone;
  });

  const totalRegistrations = citizens.length;

  if (!isAuthenticated) {
    return (
      <div className="max-w-sm mx-auto mt-24 relative animate-in fade-in zoom-in-95 duration-500">
        <div className="absolute -inset-1 bg-red-600 rounded-3xl blur-2xl opacity-40 animate-pulse"></div>
        <div className="relative bg-[#f8f9fa] rounded-2xl overflow-hidden shadow-2xl flex flex-col border border-gray-100">
          <div className="bg-gradient-to-b from-[#241a1a] to-[#181212] p-10 flex flex-col items-center justify-center border-b border-[#3a2828] relative">
            <div className="w-12 h-12 bg-[#dc2626] rounded-xl flex items-center justify-center mb-5 shadow-inner border border-red-500/50"><span className="text-[#facc15] text-xl drop-shadow-md">🔒</span></div>
            <h2 className="text-2xl font-black text-white tracking-[0.25em] uppercase">HQ Vault</h2>
            <p className="text-[#ef4444] text-[10px] font-bold uppercase mt-2 tracking-widest">Restricted Access</p>
          </div>
          <div className="p-8 bg-[#fdfdfd]">
            <form onSubmit={handleLogin} className="space-y-5">
              {authError && <div className="bg-red-50 text-red-700 p-3 rounded-lg text-xs font-bold text-center animate-in shake border border-red-100">{authError}</div>}
              <input type="password" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} required className="w-full bg-[#f4f4f5] border border-gray-200 focus:border-[#8a1c1c] focus:ring-4 focus:ring-[#8a1c1c]/10 focus:bg-white rounded-xl py-4 text-center tracking-[0.5em] font-black text-xl text-slate-800 outline-none transition-all shadow-inner" placeholder="••••••••" />
              <button type="submit" className="w-full bg-[#1c1917] hover:bg-black text-white font-bold py-4 rounded-xl tracking-widest uppercase text-xs shadow-lg transition-all active:scale-95">Authenticate</button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
      
      <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-[0_4px_40px_rgb(0,0,0,0.04)] flex flex-col lg:flex-row justify-between items-center gap-6">
        <div>
           <h2 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-3">Command Center <span className="flex h-2.5 w-2.5 relative mt-1"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span></span></h2>
           <p className="text-sm font-medium text-slate-400 mt-1">Review, flag, and generate reports.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto items-center">
          <div className="relative w-full sm:w-auto">
            <select value={selectedZone} onChange={(e) => setSelectedZone(e.target.value)} className="w-full sm:w-48 appearance-none bg-gray-50 border border-gray-200 text-slate-700 text-sm font-bold rounded-xl px-4 py-3 outline-none focus:border-[#8a1c1c] cursor-pointer shadow-inner">
              <option value="All">All Constituencies</option>
              {CONSTITUENCIES.map((zone, idx) => <option key={idx} value={zone}>{zone}</option>)}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">▼</div>
          </div>
          <button onClick={exportReport} className="w-full sm:w-auto px-6 py-3 bg-[#facc15] hover:bg-[#eab308] border border-[#ca8a04] rounded-xl text-sm font-black uppercase tracking-wider text-amber-950 shadow-md transition-colors flex items-center justify-center gap-2">
            <span>📥</span> Generate Report
          </button>
          <div className="relative w-full sm:w-64">
            <input type="text" placeholder="Search Voter or Ration ID..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50 shadow-inner focus:bg-white focus:ring-2 focus:ring-[#8a1c1c]/20 focus:border-[#8a1c1c] outline-none text-sm font-medium transition-all" />
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">🔍</div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] border border-gray-100 shadow-[0_4px_40px_rgb(0,0,0,0.04)] overflow-hidden">
        <div className="overflow-x-auto p-2">
          {loading ? (
            <div className="py-10 px-6 space-y-6">
              {[1, 2, 3].map((i) => <div key={i} className="flex gap-8 animate-pulse items-center"><div className="h-10 bg-slate-100 rounded-lg w-full"></div></div>)}
            </div>
          ) : (
            <table className="w-full text-left border-collapse min-w-[1000px]">
              <thead>
                <tr>
                  <th className="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-gray-100 text-center">Flag</th>
                  <th className="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-gray-100">Member</th>
                  <th className="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-gray-100">ID / Location</th>
                  <th className="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-gray-100">Documents</th>
                  <th className="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-gray-100 text-right">Referral</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredCitizens.length === 0 ? (
                  <tr><td colSpan="5" className="py-16 text-center text-slate-400 font-medium">No matching records found in this constituency.</td></tr>
                ) : (
                  filteredCitizens.map((person) => (
                    <tr key={person.id} className={`${person.is_flagged ? 'bg-red-50/70 hover:bg-red-50' : 'hover:bg-slate-50/50'} transition-colors group cursor-default`}>
                      
                      <td className="px-6 py-5 text-center">
                        <button 
                          onClick={() => toggleFlag(person.id, person.is_flagged)} 
                          className={`w-6 h-6 rounded-full border-2 mx-auto flex items-center justify-center transition-all ${person.is_flagged ? 'border-[#8a1c1c] bg-[#8a1c1c] shadow-inner' : 'border-gray-300 bg-white hover:border-[#8a1c1c]'}`}
                        >
                          {person.is_flagged && <div className="w-2.5 h-2.5 bg-white rounded-full"></div>}
                        </button>
                      </td>

                      <td className="px-6 py-5">
                        <div className="flex items-center gap-4">
                          {person.profile_pic_url ? (
                            <img src={person.profile_pic_url} alt="Profile" className={`w-12 h-12 rounded-xl object-cover border-2 ${person.is_flagged ? 'border-red-300' : 'border-gray-200'}`} />
                          ) : (
                            <div className="w-12 h-12 rounded-xl bg-slate-100 border-2 border-slate-200 flex items-center justify-center text-slate-400 text-xs font-bold">N/A</div>
                          )}
                          <div>
                            <div className={`font-bold text-base ${person.is_flagged ? 'text-[#8a1c1c]' : 'text-slate-800'}`}>{person.full_name}</div>
                            <div className="text-[10px] font-black tracking-widest text-slate-500 uppercase mt-0.5">{person.member_id}</div>
                          </div>
                        </div>
                      </td>
                      
                      <td className="px-6 py-5">
                        <div className="text-xs font-bold text-slate-700 bg-white border border-gray-200 shadow-sm px-2 py-1 rounded inline-flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>{person.zone}
                        </div>
                        <div className="text-xs text-slate-500 font-mono mt-1.5 font-bold">+91 {person.phone_number}</div>
                      </td>
                      
                      <td className="px-6 py-5">
                        <div className="font-mono text-xs font-bold text-slate-700 mb-1"><span className="text-slate-400 mr-1">VOTER:</span>{person.voter_id}</div>
                        <div className="font-mono text-xs text-slate-500"><span className="text-slate-400 mr-1">RATION:</span>{person.family_card || '—'}</div>
                      </td>

                      <td className="px-6 py-5 text-right">
                        <div className="text-xs font-black text-emerald-600 uppercase tracking-widest mb-1">{person.referral_id || '—'}</div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">DOB: {person.dob ? new Date(person.dob).toLocaleDateString('en-GB') : '—'}</div>
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