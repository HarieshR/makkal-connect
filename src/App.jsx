import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import Admin from './Admin';

const CONSTITUENCIES = [
  "Manadipet - 1", "Thirubhuvanai - 2", "Oussudu - 3", "Mangalam - 4", "Villianur - 5",
  "Ozhukarai - 6", "Kadirgamam - 7", "Indira Nagar - 8", "Thattanchavady - 9", "Kamaraj Nagar - 10",
  "Lawspet - 11", "Kalapet - 12", "Muthialpet - 13", "Raj Bhavan - 14", "Oupalam - 15",
  "Orleanpet - 16", "Nellithope - 17", "Mudaliarpet - 18", "Ariankuppam - 19", "Manavely - 20",
  "Embalam - 21", "Nettapakkam - 22", "Bahour - 23", "Nedungadu - 24", "Thirunallar - 25",
  "Karaikal North - 26", "Karaikal South - 27", "Neravy - T.R Pattinam - 28", "Mahe - 29", "Yanam - 30"
];

const App = () => {
  const [activeTab, setActiveTab] = useState('registration');
  const [formData, setFormData] = useState({
    fullName: '', dob: '', zone: '', voterId: '', familyCard: '', panNumber: '', aadhaarNumber: '', phoneNumber: '', referralId: ''
  });
  
  // Registration State
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [status, setStatus] = useState({ type: '', message: '', data: null });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // User Portal State
  const [portalLogin, setPortalLogin] = useState({ memberId: '', phone: '' });
  const [portalUser, setPortalUser] = useState(null);
  const [portalStatus, setPortalStatus] = useState({ type: '', message: '' });
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    if (status.message && status.type !== 'success') {
      const timer = setTimeout(() => setStatus({ type: '', message: '', data: null }), 5000);
      return () => clearTimeout(timer);
    }
  }, [status]);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
  const handlePortalChange = (e) => setPortalLogin({ ...portalLogin, [e.target.name]: e.target.value });

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  // --- REGISTRATION LOGIC ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!imageFile) return setStatus({ type: 'error', message: 'Profile photo is required for the ID card.' });
    
    setIsSubmitting(true);
    setStatus({ type: 'loading', message: 'Generating ID & securing data...' });

    const generatedMemberId = `TVK-PY-${Math.floor(100000 + Math.random() * 900000)}`;
    const fileExt = imageFile.name.split('.').pop();
    const fileName = `public/${generatedMemberId}-${Math.floor(Math.random() * 10000)}.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage.from('profile_pics').upload(fileName, imageFile, { contentType: imageFile.type, upsert: false });
    
    if (uploadError) {
      setIsSubmitting(false);
      return setStatus({ type: 'error', message: `Photo Upload Failed: ${uploadError.message}` });
    }

    const profilePicUrl = supabase.storage.from('profile_pics').getPublicUrl(fileName).data.publicUrl;

    const newCitizen = {
      member_id: generatedMemberId,
      full_name: formData.fullName, 
      dob: formData.dob,
      zone: formData.zone, 
      voter_id: formData.voterId.toUpperCase(),
      family_card: formData.familyCard || null, 
      pan_number: formData.panNumber ? formData.panNumber.toUpperCase() : null,
      aadhaar_number: formData.aadhaarNumber || null, 
      phone_number: formData.phoneNumber,
      referral_id: formData.referralId ? formData.referralId.toUpperCase() : null,
      profile_pic_url: profilePicUrl,
      is_flagged: true // DEFAULT IS NOW "PENDING" (true)
    };

    const { error } = await supabase.from('citizens').insert([newCitizen]);

    setIsSubmitting(false);

    if (error) {
      let errorMsg = `Database Error: ${error.message}`;
      if (error.message.includes('citizens_voter_id_key')) errorMsg = 'This Voter ID is already registered in the system.';
      else if (error.message.includes('citizens_aadhaar_number_key')) errorMsg = 'This Aadhaar Number is already registered.';
      else if (error.message.includes('citizens_pan_number_key')) errorMsg = 'This PAN Number is already registered.';
      setStatus({ type: 'error', message: errorMsg });
    } else {
      setStatus({ type: 'success', message: 'Registration Complete! Your account is Pending Review.', data: newCitizen });
      setFormData({ fullName: '', dob: '', zone: '', voterId: '', familyCard: '', panNumber: '', aadhaarNumber: '', phoneNumber: '', referralId: '' });
      setImageFile(null);
      setImagePreview(null);
    }
  };

  // --- USER PORTAL LOGIN LOGIC ---
  const handlePortalLogin = async (e) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setPortalStatus({ type: 'loading', message: 'Verifying credentials...' });

    const { data, error } = await supabase
      .from('citizens')
      .select('*')
      .eq('member_id', portalLogin.memberId.toUpperCase())
      .eq('phone_number', portalLogin.phone)
      .single();

    setIsLoggingIn(false);

    if (error || !data) {
      setPortalStatus({ type: 'error', message: 'Invalid Member ID or Phone Number.' });
      setTimeout(() => setPortalStatus({ type: '', message: '' }), 4000);
    } else {
      setPortalUser(data);
      setPortalStatus({ type: '', message: '' });
    }
  };

  // --- INITIATE REFERRAL LOGIC ---
  const handleReferral = () => {
    setFormData({ ...formData, referralId: portalUser.member_id });
    setActiveTab('registration');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen flex flex-col font-sans text-slate-800 bg-[#f8fafc] selection:bg-[#8a1c1c] selection:text-white">
      
      {/* --- FLOATING TOAST NOTIFICATION --- */}
      {status.message && !status.data && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top-5 fade-in duration-300">
          <div className={`flex items-center gap-3 px-6 py-4 rounded-full shadow-2xl border backdrop-blur-md ${status.type === 'loading' ? 'bg-amber-500/90 border-amber-400 text-white' : 'bg-red-500/90 border-red-400 text-white'}`}>
            {status.type === 'loading' ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <span>⚠️</span>}
            <p className="font-bold text-sm tracking-wide">{status.message}</p>
          </div>
        </div>
      )}

      {/* --- PREMIUM NAVIGATION --- */}
      <nav className="sticky top-0 z-40 bg-gradient-to-r from-[#5a0c0c] via-[#8a1c1c] to-[#5a0c0c] shadow-lg border-b border-[#a32a2a]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-center h-auto sm:h-20 py-4 gap-4">
            <div className="flex items-center gap-4 cursor-pointer" onClick={() => setActiveTab('registration')}>
              <div className="w-10 h-10 rounded-full border-2 border-[#facc15] flex items-center justify-center shadow-[0_0_15px_rgba(250,204,21,0.3)]"><span className="text-[#facc15] text-xl">🐘</span></div>
              <h1 className="text-xl font-bold text-[#facc15] tracking-wide">TVK Makkal Connect</h1>
            </div>
            
            <div className="flex flex-wrap justify-center bg-[#3e0808] p-1 rounded-full border border-[#7a1313] shadow-inner gap-1">
              <button onClick={() => setActiveTab('registration')} className={`px-5 py-2 rounded-full font-semibold text-xs md:text-sm transition-all duration-300 ${activeTab === 'registration' ? 'bg-[#facc15] text-[#5a0c0c] shadow-md scale-100' : 'text-[#facc15] hover:bg-[#8a1c1c] scale-95 hover:scale-100'}`}>Enroll</button>
              <button onClick={() => setActiveTab('portal')} className={`px-5 py-2 rounded-full font-semibold text-xs md:text-sm transition-all duration-300 ${activeTab === 'portal' ? 'bg-[#facc15] text-[#5a0c0c] shadow-md scale-100' : 'text-[#facc15] hover:bg-[#8a1c1c] scale-95 hover:scale-100'}`}>Member Portal</button>
              <button onClick={() => setActiveTab('admin')} className={`px-5 py-2 rounded-full font-semibold text-xs md:text-sm transition-all duration-300 ${activeTab === 'admin' ? 'bg-[#facc15] text-[#5a0c0c] shadow-md scale-100' : 'text-[#facc15] hover:bg-[#8a1c1c] scale-95 hover:scale-100'}`}>HQ Admin</button>
            </div>
          </div>
        </div>
      </nav>

      {/* --- MAIN CONTENT --- */}
      <main className="flex-grow max-w-5xl mx-auto px-4 mt-8 mb-20 w-full sm:px-6 lg:px-8">
        
        {/* --- 1. ADMIN TAB --- */}
        {activeTab === 'admin' && <Admin />}

        {/* --- 2. REGISTRATION TAB --- */}
        {activeTab === 'registration' && (
          <div className="max-w-4xl mx-auto animate-in fade-in zoom-in-95 duration-500">
            {status.data ? (
              <div className="flex flex-col items-center mt-10 animate-in slide-in-from-bottom-8">
                <div className="bg-gradient-to-br from-[#8a1c1c] to-[#5a0c0c] p-8 rounded-[2rem] text-white shadow-2xl w-full max-w-md relative overflow-hidden border-4 border-[#facc15]">
                  <div className="absolute top-0 right-0 p-4 opacity-10 text-8xl">🐘</div>
                  <div className="flex justify-between items-start border-b border-white/20 pb-6 mb-6">
                    <div>
                      <h3 className="text-xs font-bold text-[#facc15] uppercase tracking-widest">Digital ID Card</h3>
                      <h2 className="text-2xl font-black tracking-widest mt-1 text-white">TVK CADRE</h2>
                      <p className="font-mono text-sm tracking-widest mt-2 bg-black/30 px-3 py-1 rounded inline-block border border-white/10">{status.data.member_id}</p>
                    </div>
                    <img src={status.data.profile_pic_url} alt="Profile" className="w-24 h-24 rounded-2xl object-cover border-2 border-[#facc15] shadow-xl bg-white" />
                  </div>
                  <div className="space-y-4 relative z-10">
                    <div className="grid grid-cols-2 gap-4">
                      <div><p className="text-[10px] text-red-200/80 uppercase tracking-widest">Full Name</p><p className="font-bold text-lg leading-tight">{status.data.full_name}</p></div>
                      <div><p className="text-[10px] text-red-200/80 uppercase tracking-widest">D.O.B</p><p className="font-bold text-lg leading-tight">{new Date(status.data.dob).toLocaleDateString('en-GB')}</p></div>
                    </div>
                    <div><p className="text-[10px] text-red-200/80 uppercase tracking-widest">Constituency Zone</p><p className="font-bold">{status.data.zone}</p></div>
                  </div>
                  <div className="mt-8 bg-white/90 p-3 rounded-xl flex justify-center shadow-inner">
                    <div className="h-10 w-full bg-[repeating-linear-gradient(90deg,#1e293b,#1e293b_3px,transparent_3px,transparent_6px,#1e293b_6px,#1e293b_8px,transparent_8px,transparent_14px)] opacity-80"></div>
                  </div>
                </div>
                <div className="mt-6 text-center">
                  <p className="text-sm font-bold text-amber-600 bg-amber-50 px-4 py-2 rounded-full border border-amber-200 inline-block mb-4">Status: Pending HQ Verification</p>
                </div>
                <button onClick={() => window.print()} className="bg-white border border-gray-200 text-slate-800 font-bold py-3 px-8 rounded-full shadow-md hover:border-[#8a1c1c] hover:text-[#8a1c1c] transition-all flex items-center gap-2">
                  <span>🖨️</span> Print / Save ID Card
                </button>
              </div>
            ) : (
            <div className="bg-white rounded-[2rem] border border-gray-100 shadow-[0_4px_40px_rgb(0,0,0,0.04)] overflow-hidden">
              <div className="px-8 md:px-12 pt-12 pb-8 flex items-center gap-6">
                <div className="bg-red-50 p-4 rounded-2xl border border-red-100 shadow-sm"><span className="text-3xl">📝</span></div>
                <div>
                  <h2 className="text-2xl md:text-[28px] font-bold text-[#1e293b] tracking-tight">Citizen Enrollment</h2>
                  <p className="text-slate-500 font-medium mt-1 text-sm md:text-base">Securely register new members into the central database.</p>
                </div>
              </div>
              <div className="px-12"><hr className="border-gray-100" /></div>
              <form onSubmit={handleSubmit} className="px-8 md:px-12 py-10">
                <div className="mb-10 flex flex-col items-center sm:items-start group">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1">Profile Photo <span className="text-[#8a1c1c]">*</span></label>
                  <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" id="photo-upload" />
                  <label htmlFor="photo-upload" className="cursor-pointer flex flex-col sm:flex-row items-center gap-4 bg-gray-50 border-2 border-dashed border-gray-300 rounded-2xl p-6 w-full sm:w-auto hover:border-[#8a1c1c] transition-all">
                    {imagePreview ? <img src={imagePreview} className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-md" alt="Preview" /> : <div className="w-20 h-20 rounded-full bg-white border border-gray-200 flex items-center justify-center text-3xl shadow-sm text-gray-400">📸</div>}
                    <div className="text-center sm:text-left"><p className="text-sm font-bold text-[#8a1c1c]">{imagePreview ? 'Tap to Change' : 'Upload or Take Selfie'}</p></div>
                  </label>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-10">
                  <div className="flex flex-col group"><label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Full Name *</label><input type="text" name="fullName" value={formData.fullName} onChange={handleChange} required className="w-full bg-transparent border-0 border-b border-gray-200 pb-2 text-slate-800 font-medium focus:ring-0 focus:border-[#8a1c1c] outline-none" placeholder="Arul Murugan" /></div>
                  <div className="flex flex-col group"><label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Date of Birth *</label><input type="date" name="dob" value={formData.dob} onChange={handleChange} required className="w-full bg-transparent border-0 border-b border-gray-200 pb-2 text-slate-800 font-medium focus:ring-0 focus:border-[#8a1c1c] outline-none" /></div>
                  <div className="flex flex-col group">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Mobile Number *</label>
                    <div className="flex items-center border-b border-gray-200 pb-2 focus-within:border-[#8a1c1c]">
                      <span className="text-slate-400 font-semibold pr-3 border-r border-gray-200 mr-3">+91</span>
                      <input type="tel" name="phoneNumber" value={formData.phoneNumber} onChange={handleChange} required maxLength="10" className="w-full bg-transparent border-0 text-slate-800 font-medium focus:ring-0 outline-none p-0" placeholder="98765 43210" />
                    </div>
                  </div>
                  <div className="flex flex-col group"><label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Referral ID (Optional)</label><input type="text" name="referralId" value={formData.referralId} onChange={handleChange} className="w-full bg-transparent border-0 border-b border-gray-200 pb-2 text-slate-800 font-mono font-medium uppercase focus:ring-0 focus:border-[#8a1c1c] outline-none" placeholder="TVK-PY-123456" /></div>
                  <div className="flex flex-col group md:col-span-2">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Constituency Zone *</label>
                    <select name="zone" value={formData.zone} onChange={handleChange} required className="w-full bg-transparent border-0 border-b border-gray-200 pb-2 text-slate-800 font-medium focus:ring-0 focus:border-[#8a1c1c] outline-none appearance-none cursor-pointer">
                      <option value="" disabled>Select region...</option>
                      {CONSTITUENCIES.map((zone, idx) => <option key={idx} value={zone}>{zone}</option>)}
                    </select>
                  </div>
                </div>
                <hr className="border-gray-100 my-10" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-10">
                  <div className="flex flex-col group"><label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Voter ID (EPIC) *</label><input type="text" name="voterId" value={formData.voterId} onChange={handleChange} required className="w-full bg-transparent border-0 border-b border-gray-200 pb-2 text-slate-800 font-mono uppercase focus:ring-0 focus:border-[#8a1c1c] outline-none" placeholder="PY/01/..." /></div>
                  <div className="flex flex-col group"><label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Aadhaar Number</label><input type="text" name="aadhaarNumber" value={formData.aadhaarNumber} onChange={handleChange} maxLength="12" className="w-full bg-transparent border-0 border-b border-gray-200 pb-2 text-slate-800 font-mono tracking-[0.2em] focus:ring-0 focus:border-[#8a1c1c] outline-none" placeholder="1234 5678 9012" /></div>
                  <div className="flex flex-col group"><label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Ration Card</label><input type="text" name="familyCard" value={formData.familyCard} onChange={handleChange} className="w-full bg-transparent border-0 border-b border-gray-200 pb-2 text-slate-800 font-mono focus:ring-0 focus:border-[#8a1c1c] outline-none" placeholder="33XXXXXXXXXX" /></div>
                  <div className="flex flex-col group"><label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">PAN Number</label><input type="text" name="panNumber" value={formData.panNumber} onChange={handleChange} maxLength="10" className="w-full bg-transparent border-0 border-b border-gray-200 pb-2 text-slate-800 font-mono uppercase focus:ring-0 focus:border-[#8a1c1c] outline-none" placeholder="ABCDE1234F" /></div>
                </div>
                <div className="pt-12 flex justify-end items-center gap-4">
                  <button type="submit" disabled={isSubmitting} className="bg-[#8a1c1c] hover:bg-[#6b1515] text-white font-semibold py-3.5 px-8 rounded-xl shadow-[0_8px_20px_rgba(138,28,28,0.25)] transition-all active:scale-[0.98] flex items-center gap-3 disabled:opacity-70">
                    {isSubmitting ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <>Submit & Generate ID <span className="text-lg leading-none">→</span></>}
                  </button>
                </div>
              </form>
            </div>
            )}
          </div>
        )}

        {/* --- 3. MEMBER PORTAL TAB --- */}
        {activeTab === 'portal' && (
          <div className="max-w-4xl mx-auto animate-in fade-in zoom-in-95 duration-500">
            {!portalUser ? (
              // PORTAL LOGIN
              <div className="max-w-md mx-auto bg-white rounded-[2rem] border border-gray-100 shadow-[0_4px_40px_rgb(0,0,0,0.04)] overflow-hidden mt-10">
                <div className="p-10 text-center border-b border-gray-100">
                  <div className="w-16 h-16 bg-red-50 rounded-2xl mx-auto flex items-center justify-center mb-4 border border-red-100"><span className="text-3xl">👤</span></div>
                  <h2 className="text-2xl font-bold text-slate-800">Member Portal</h2>
                  <p className="text-slate-500 text-sm mt-1">Access your Digital ID & Referrals</p>
                </div>
                <form onSubmit={handlePortalLogin} className="p-8 space-y-6">
                  {portalStatus.message && <div className={`p-3 rounded-xl text-xs font-bold text-center animate-in shake ${portalStatus.type === 'error' ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-amber-50 text-amber-700'}`}>{portalStatus.message}</div>}
                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Member ID</label>
                      <input type="text" name="memberId" value={portalLogin.memberId} onChange={handlePortalChange} required className="w-full bg-gray-50 border border-gray-200 focus:border-[#8a1c1c] rounded-xl py-3 px-4 font-mono uppercase text-slate-800 outline-none" placeholder="TVK-PY-XXXXXX" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Registered Mobile</label>
                      <input type="tel" name="phone" value={portalLogin.phone} onChange={handlePortalChange} required maxLength="10" className="w-full bg-gray-50 border border-gray-200 focus:border-[#8a1c1c] rounded-xl py-3 px-4 font-mono text-slate-800 outline-none" placeholder="9876543210" />
                    </div>
                  </div>
                  <button type="submit" disabled={isLoggingIn} className="w-full bg-[#8a1c1c] hover:bg-[#6b1515] text-white font-bold py-4 rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-70">
                    {isLoggingIn ? 'Verifying...' : 'Access Portal'}
                  </button>
                </form>
              </div>
            ) : (
              // PORTAL DASHBOARD
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start mt-4">
                
                {/* ID Card Display */}
                <div className="bg-gradient-to-br from-[#8a1c1c] to-[#5a0c0c] p-8 rounded-[2rem] text-white shadow-2xl relative overflow-hidden border-4 border-[#facc15]">
                  <div className="absolute top-0 right-0 p-4 opacity-10 text-8xl">🐘</div>
                  <div className="flex justify-between items-start border-b border-white/20 pb-6 mb-6">
                    <div>
                      <h3 className="text-xs font-bold text-[#facc15] uppercase tracking-widest">Digital ID Card</h3>
                      <h2 className="text-2xl font-black tracking-widest mt-1 text-white">TVK CADRE</h2>
                      <p className="font-mono text-sm tracking-widest mt-2 bg-black/30 px-3 py-1 rounded inline-block border border-white/10">{portalUser.member_id}</p>
                    </div>
                    <img src={portalUser.profile_pic_url} alt="Profile" className="w-24 h-24 rounded-2xl object-cover border-2 border-[#facc15] shadow-xl bg-white" />
                  </div>
                  <div className="space-y-4 relative z-10">
                    <div><p className="text-[10px] text-red-200/80 uppercase tracking-widest">Full Name</p><p className="font-bold text-lg leading-tight">{portalUser.full_name}</p></div>
                    <div><p className="text-[10px] text-red-200/80 uppercase tracking-widest">Constituency Zone</p><p className="font-bold">{portalUser.zone}</p></div>
                  </div>
                  <div className="mt-8 flex justify-between items-center">
                    <div className="bg-white/90 p-2 rounded flex-grow mr-4">
                      <div className="h-6 w-full bg-[repeating-linear-gradient(90deg,#1e293b,#1e293b_3px,transparent_3px,transparent_6px,#1e293b_6px,#1e293b_8px,transparent_8px,transparent_14px)] opacity-80"></div>
                    </div>
                    <div className={`px-3 py-1 rounded text-[10px] font-black uppercase tracking-widest border ${portalUser.is_flagged ? 'bg-amber-500/20 text-amber-300 border-amber-400/50' : 'bg-emerald-500/20 text-emerald-300 border-emerald-400/50'}`}>
                      {portalUser.is_flagged ? 'Pending' : 'Cleared'}
                    </div>
                  </div>
                </div>

                {/* Portal Actions */}
                <div className="space-y-6">
                  <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-[0_4px_20px_rgb(0,0,0,0.04)]">
                    <h3 className="text-xl font-bold text-slate-800 mb-2">Welcome, {portalUser.full_name.split(' ')[0]}</h3>
                    <p className="text-slate-500 text-sm mb-6">Your current verification status is <span className={`font-bold ${portalUser.is_flagged ? 'text-amber-600' : 'text-emerald-600'}`}>{portalUser.is_flagged ? 'Pending Review' : 'Active & Cleared'}</span>.</p>
                    
                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-6 text-center">
                      <div className="text-4xl mb-3">🤝</div>
                      <h4 className="font-bold text-blue-900 mb-1">Grow the Movement</h4>
                      <p className="text-xs text-blue-700 mb-4">Enroll friends and family under your Member ID to build your regional network.</p>
                      <button onClick={handleReferral} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-md transition-all active:scale-95">
                        Refer a New Member
                      </button>
                    </div>
                  </div>
                  
                  <button onClick={() => {setPortalUser(null); setPortalLogin({memberId:'', phone:''});}} className="w-full bg-gray-100 hover:bg-gray-200 text-slate-600 font-bold py-4 rounded-[1.5rem] transition-all">
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default App;