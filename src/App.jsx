import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import Admin from './Admin';

const App = () => {
  const [activeTab, setActiveTab] = useState('registration');
  const [formData, setFormData] = useState({
    fullName: '', zone: '', voterId: '', familyCard: '', panNumber: '', aadhaarNumber: '', phoneNumber: ''
  });
  const [status, setStatus] = useState({ type: '', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-hide toast notification after 5 seconds
  useEffect(() => {
    if (status.message) {
      const timer = setTimeout(() => setStatus({ type: '', message: '' }), 5000);
      return () => clearTimeout(timer);
    }
  }, [status]);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setStatus({ type: 'loading', message: 'Encrypting and saving details...' });

    const { error } = await supabase.from('citizens').insert([{
        full_name: formData.fullName, zone: formData.zone, voter_id: formData.voterId.toUpperCase(),
        family_card: formData.familyCard, pan_number: formData.panNumber.toUpperCase(),
        aadhaar_number: formData.aadhaarNumber, phone_number: formData.phoneNumber
    }]);

    setIsSubmitting(false);
    if (error) {
      setStatus({ type: 'error', message: `Registration Failed: ${error.message}` });
    } else {
      setStatus({ type: 'success', message: 'Member enrolled successfully! Welcome to the movement.' });
      setFormData({ fullName: '', zone: '', voterId: '', familyCard: '', panNumber: '', aadhaarNumber: '', phoneNumber: '' });
    }
  };

  return (
    <div className="min-h-screen flex flex-col font-sans text-slate-800 bg-[#f8fafc] selection:bg-[#8a1c1c] selection:text-white relative">
      
      {/* --- FLOATING TOAST NOTIFICATION --- */}
      {status.message && status.type !== 'loading' && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top-5 fade-in duration-300">
          <div className={`flex items-center gap-3 px-6 py-4 rounded-full shadow-2xl border backdrop-blur-md ${status.type === 'success' ? 'bg-emerald-500/90 border-emerald-400 text-white' : 'bg-red-500/90 border-red-400 text-white'}`}>
            <span className="text-xl">{status.type === 'success' ? '✓' : '⚠️'}</span>
            <p className="font-bold text-sm tracking-wide">{status.message}</p>
          </div>
        </div>
      )}

      {/* --- PREMIUM NAVIGATION --- */}
      <nav className="sticky top-0 z-40 bg-gradient-to-r from-[#5a0c0c] via-[#8a1c1c] to-[#5a0c0c] shadow-lg border-b border-[#a32a2a]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-center h-20 gap-4">
            
            <div className="flex items-center gap-4 cursor-pointer group" onClick={() => setActiveTab('registration')}>
              <div className="w-10 h-10 rounded-full border-2 border-[#facc15] flex items-center justify-center bg-transparent group-hover:scale-105 transition-transform shadow-[0_0_15px_rgba(250,204,21,0.3)]">
                <span className="text-[#facc15] text-xl">🐘</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-[#facc15] tracking-wide">TVK Makkal Connect</h1>
              </div>
            </div>
            
            <div className="flex bg-[#3e0808] p-1 rounded-full border border-[#7a1313] shadow-inner">
              <button 
                onClick={() => setActiveTab('registration')}
                className={`px-8 py-2 rounded-full font-semibold text-sm transition-all duration-300 ${activeTab === 'registration' ? 'bg-[#facc15] text-[#5a0c0c] shadow-md scale-100' : 'text-[#facc15] hover:bg-[#8a1c1c] scale-95 hover:scale-100'}`}
              >
                Enroll Member
              </button>
              <button 
                onClick={() => setActiveTab('admin')}
                className={`px-8 py-2 rounded-full font-semibold text-sm transition-all duration-300 ${activeTab === 'admin' ? 'bg-[#facc15] text-[#5a0c0c] shadow-md scale-100' : 'text-[#facc15] hover:bg-[#8a1c1c] scale-95 hover:scale-100'}`}
              >
                HQ Command Center
              </button>
            </div>

            <div className="hidden md:flex items-center gap-3 text-[#facc15]">
              <div className="w-8 h-8 rounded-full border border-[#facc15] flex items-center justify-center bg-white/5">
                <span className="text-sm">👤</span>
              </div>
              <span className="text-sm font-medium">Command Center</span>
            </div>
          </div>
        </div>
      </nav>

      {/* --- MAIN CONTENT --- */}
      <main className="flex-grow max-w-5xl mx-auto px-4 mt-12 mb-20 w-full sm:px-6 lg:px-8">
        {activeTab === 'admin' && <Admin />}

        {activeTab === 'registration' && (
          <div className="max-w-4xl mx-auto animate-in fade-in zoom-in-95 duration-500">
            <div className="bg-white rounded-[2rem] border border-gray-100 shadow-[0_4px_40px_rgb(0,0,0,0.04)] overflow-hidden">
              
              <div className="px-8 md:px-12 pt-12 pb-8 flex items-center gap-6">
                <div className="bg-red-50 p-4 rounded-2xl border border-red-100 shadow-sm">
                  <span className="text-3xl">📝</span>
                </div>
                <div>
                  <h2 className="text-2xl md:text-[28px] font-bold text-[#1e293b] tracking-tight">Citizen Enrollment</h2>
                  <p className="text-slate-500 font-medium mt-1 text-sm md:text-base">Securely register new members into the central database.</p>
                </div>
              </div>

              <div className="px-12"><hr className="border-gray-100" /></div>
              
              <form onSubmit={handleSubmit} className="px-8 md:px-12 py-10">
                {/* Block 1: Personal Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-10">
                  <div className="flex flex-col group">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1 group-focus-within:text-[#8a1c1c] transition-colors">
                      Full Name <span className="text-[#8a1c1c]">*</span>
                    </label>
                    <input type="text" name="fullName" value={formData.fullName} onChange={handleChange} required 
                      className="w-full bg-transparent border-0 border-b border-gray-200 pb-2 text-slate-800 font-medium placeholder-slate-300 focus:ring-0 focus:outline-none focus:border-[#8a1c1c] transition-colors" placeholder="e.g. Arul Murugan" />
                  </div>
                  
                  <div className="flex flex-col group">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1 group-focus-within:text-[#8a1c1c] transition-colors">
                      Mobile Number <span className="text-[#8a1c1c]">*</span>
                    </label>
                    <div className="flex items-center border-b border-gray-200 focus-within:border-[#8a1c1c] transition-colors pb-2">
                      <span className="text-slate-400 font-semibold pr-3 border-r border-gray-200 mr-3">+91</span>
                      <input type="tel" name="phoneNumber" value={formData.phoneNumber} onChange={handleChange} required maxLength="10" 
                        className="w-full bg-transparent border-0 text-slate-800 font-medium placeholder-slate-300 focus:ring-0 focus:outline-none p-0" placeholder="98765 43210" />
                    </div>
                  </div>

                  <div className="flex flex-col group md:col-span-2">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1 group-focus-within:text-[#8a1c1c] transition-colors">
                      Constituency Zone <span className="text-[#8a1c1c]">*</span>
                    </label>
                    <div className="relative">
                      <select name="zone" value={formData.zone} onChange={handleChange} required 
                        className="w-full bg-transparent border-0 border-b border-gray-200 pb-2 text-slate-800 font-medium focus:ring-0 focus:outline-none focus:border-[#8a1c1c] transition-colors appearance-none cursor-pointer">
                        <option value="" disabled>Select the operational region...</option>
                        <option value="White Town">White Town / Boulevard</option>
                        <option value="Ariyankuppam">Ariyankuppam</option>
                        <option value="Oulgaret">Oulgaret</option>
                        <option value="Lawspet">Lawspet</option>
                        <option value="Villianur">Villianur</option>
                      </select>
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs">▼</div>
                    </div>
                  </div>
                </div>

                <hr className="border-gray-100 my-10" />

                {/* Block 2: Credentials */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-10">
                  <div className="flex flex-col group">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1 group-focus-within:text-[#8a1c1c] transition-colors">
                      Voter ID (EPIC) <span className="text-[#8a1c1c]">*</span>
                    </label>
                    <input type="text" name="voterId" value={formData.voterId} onChange={handleChange} required 
                      className="w-full bg-transparent border-0 border-b border-gray-200 pb-2 text-slate-800 font-mono font-medium placeholder-slate-300 uppercase focus:ring-0 focus:outline-none focus:border-[#8a1c1c] transition-colors" placeholder="PY/01/..." />
                  </div>

                  <div className="flex flex-col group">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1 group-focus-within:text-[#8a1c1c] transition-colors">Aadhaar Card Number</label>
                    <input type="text" name="aadhaarNumber" value={formData.aadhaarNumber} onChange={handleChange} maxLength="12" 
                      className="w-full bg-transparent border-0 border-b border-gray-200 pb-2 text-slate-800 font-mono tracking-[0.2em] font-medium placeholder-slate-300 focus:ring-0 focus:outline-none focus:border-[#8a1c1c] transition-colors" placeholder="1234 5678 9012" />
                  </div>

                  <div className="flex flex-col group">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1 group-focus-within:text-[#8a1c1c] transition-colors">PAN Number</label>
                    <input type="text" name="panNumber" value={formData.panNumber} onChange={handleChange} maxLength="10" 
                      className="w-full bg-transparent border-0 border-b border-gray-200 pb-2 text-slate-800 font-mono font-medium placeholder-slate-300 uppercase focus:ring-0 focus:outline-none focus:border-[#8a1c1c] transition-colors" placeholder="ABCDE1234F" />
                  </div>
                  
                  <div className="flex flex-col group">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1 group-focus-within:text-[#8a1c1c] transition-colors">Family Ration Card</label>
                    <input type="text" name="familyCard" value={formData.familyCard} onChange={handleChange} 
                      className="w-full bg-transparent border-0 border-b border-gray-200 pb-2 text-slate-800 font-mono font-medium placeholder-slate-300 focus:ring-0 focus:outline-none focus:border-[#8a1c1c] transition-colors" placeholder="33XXXXXXXXXX" />
                  </div>
                </div>
                
                {/* Submit Action */}
                <div className="pt-12 flex justify-end items-center gap-4">
                  {isSubmitting && <span className="text-sm font-bold text-slate-400 animate-pulse">Encrypting payload...</span>}
                  <button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="bg-[#8a1c1c] hover:bg-[#6b1515] text-white font-semibold py-3.5 px-8 rounded-xl shadow-[0_8px_20px_rgba(138,28,28,0.25)] hover:shadow-[0_12px_25px_rgba(138,28,28,0.35)] hover:-translate-y-0.5 transition-all active:scale-[0.98] flex items-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                  >
                    {isSubmitting ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    ) : (
                      <>Submit Registration <span className="text-lg leading-none">→</span></>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>

      {/* --- MINIMALIST FOOTER --- */}
      <footer className="mt-auto border-t border-gray-200 bg-white py-8 text-center">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Tamizhaga Vettri Kazhagam © {new Date().getFullYear()}</p>
        <p className="text-[10px] text-slate-300 mt-1 uppercase tracking-wider">Data is End-to-End Encrypted and stored in Central HQ Servers</p>
      </footer>
    </div>
  );
};

export default App;