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
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [status, setStatus] = useState({ type: '', message: '', data: null });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (status.message && status.type !== 'success') {
      const timer = setTimeout(() => setStatus({ type: '', message: '', data: null }), 5000);
      return () => clearTimeout(timer);
    }
  }, [status]);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!imageFile) return setStatus({ type: 'error', message: 'Profile photo is required for the ID card.' });
    
    setIsSubmitting(true);
    setStatus({ type: 'loading', message: 'Generating ID & securing data...' });

    // 1. Generate Official Member ID
    const generatedMemberId = `TVK-PY-${Math.floor(100000 + Math.random() * 900000)}`;

    // 2. Upload Profile Picture (Strictly matching the RLS Policy)
    // We force the path into 'public/' and force the extension to '.jpg'
    const fileName = `public/${generatedMemberId}-${Math.floor(Math.random() * 10000)}.jpg`;
    
    const { error: uploadError } = await supabase.storage.from('profile_pics').upload(fileName, imageFile, {
      contentType: imageFile.type,
      upsert: false
    });
    
    if (uploadError) {
      setIsSubmitting(false);
      return setStatus({ type: 'error', message: `Photo Upload Failed: ${uploadError.message}` });
    }

    const profilePicUrl = supabase.storage.from('profile_pics').getPublicUrl(fileName).data.publicUrl;

    // 3. Prepare Data (Converting empty strings to null for unique DB constraints)
    const newCitizen = {
      member_id: generatedMemberId,
      full_name: formData.fullName, 
      dob: formData.dob,
      zone: formData.zone, 
      voter_id: formData.voterId.toUpperCase(),
      family_card: formData.familyCard ? formData.familyCard : null, 
      pan_number: formData.panNumber ? formData.panNumber.toUpperCase() : null,
      aadhaar_number: formData.aadhaarNumber ? formData.aadhaarNumber : null, 
      phone_number: formData.phoneNumber,
      referral_id: formData.referralId ? formData.referralId.toUpperCase() : null,
      profile_pic_url: profilePicUrl,
      is_flagged: false
    };

    // 4. Save to Database
    const { error } = await supabase.from('citizens').insert([newCitizen]);

    setIsSubmitting(false);

    if (error) {
      // Smart Error Handling for Unique Constraints
      let errorMsg = `Database Error: ${error.message}`;
      if (error.message.includes('citizens_voter_id_key')) {
        errorMsg = 'This Voter ID is already registered in the system.';
      } else if (error.message.includes('citizens_aadhaar_number_key')) {
        errorMsg = 'This Aadhaar Number is already registered.';
      } else if (error.message.includes('citizens_pan_number_key')) {
        errorMsg = 'This PAN Number is already registered.';
      }
      setStatus({ type: 'error', message: errorMsg });
    } else {
      setStatus({ type: 'success', message: 'Registration Complete!', data: newCitizen });
      setFormData({ fullName: '', dob: '', zone: '', voterId: '', familyCard: '', panNumber: '', aadhaarNumber: '', phoneNumber: '', referralId: '' });
      setImageFile(null);
      setImagePreview(null);
    }
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
          <div className="flex flex-col sm:flex-row justify-between items-center h-20 gap-4">
            <div className="flex items-center gap-4 cursor-pointer" onClick={() => {setActiveTab('registration'); setStatus({type:'', message:'', data:null});}}>
              <div className="w-10 h-10 rounded-full border-2 border-[#facc15] flex items-center justify-center shadow-[0_0_15px_rgba(250,204,21,0.3)]">
                <span className="text-[#facc15] text-xl">🐘</span>
              </div>
              <h1 className="text-xl font-bold text-[#facc15] tracking-wide">TVK Makkal Connect</h1>
            </div>
            
            <div className="flex bg-[#3e0808] p-1 rounded-full border border-[#7a1313] shadow-inner">
              <button onClick={() => {setActiveTab('registration'); setStatus({type:'', message:'', data:null});}} className={`px-8 py-2 rounded-full font-semibold text-sm transition-all duration-300 ${activeTab === 'registration' ? 'bg-[#facc15] text-[#5a0c0c] shadow-md scale-100' : 'text-[#facc15] hover:bg-[#8a1c1c] scale-95 hover:scale-100'}`}>
                Enroll Member
              </button>
              <button onClick={() => setActiveTab('admin')} className={`px-8 py-2 rounded-full font-semibold text-sm transition-all duration-300 ${activeTab === 'admin' ? 'bg-[#facc15] text-[#5a0c0c] shadow-md scale-100' : 'text-[#facc15] hover:bg-[#8a1c1c] scale-95 hover:scale-100'}`}>
                HQ Command Center
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* --- MAIN CONTENT --- */}
      <main className="flex-grow max-w-5xl mx-auto px-4 mt-12 mb-20 w-full sm:px-6 lg:px-8">
        {activeTab === 'admin' && <Admin />}

        {activeTab === 'registration' && (
          <div className="max-w-4xl mx-auto animate-in fade-in zoom-in-95 duration-500">
            
            {/* SUCCESS VIEW: DIGITAL ID CARD */}
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
                    <div className="grid grid-cols-2 gap-4">
                      <div><p className="text-[10px] text-red-200/80 uppercase tracking-widest">Mobile Number</p><p className="font-bold font-mono">+91 {status.data.phone_number}</p></div>
                      <div><p className="text-[10px] text-red-200/80 uppercase tracking-widest">Voter ID</p><p className="font-bold font-mono">{status.data.voter_id}</p></div>
                    </div>
                  </div>
                  
                  {/* Fake Barcode for design */}
                  <div className="mt-8 bg-white/90 p-3 rounded-xl flex justify-center shadow-inner">
                    <div className="h-10 w-full bg-[repeating-linear-gradient(90deg,#1e293b,#1e293b_3px,transparent_3px,transparent_6px,#1e293b_6px,#1e293b_8px,transparent_8px,transparent_14px)] opacity-80"></div>
                  </div>
                </div>
                
                <button onClick={() => window.print()} className="mt-8 bg-white border border-gray-200 text-slate-800 font-bold py-3 px-8 rounded-full shadow-md hover:border-[#8a1c1c] hover:text-[#8a1c1c] transition-all flex items-center gap-2">
                  <span>🖨️</span> Print / Save ID Card
                </button>
              </div>
            ) : (
            /* REGISTRATION FORM VIEW */
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
                
                {/* --- PHOTO UPLOAD (Capture attribute removed to allow gallery pick) --- */}
                <div className="mb-10 flex flex-col items-center sm:items-start group">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1">
                    Profile Photo (Upload or Selfie) <span className="text-[#8a1c1c]">*</span>
                  </label>
                  <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" id="photo-upload" />
                  <label htmlFor="photo-upload" className="cursor-pointer flex flex-col sm:flex-row items-center gap-4 bg-gray-50 border-2 border-dashed border-gray-300 rounded-2xl p-6 w-full sm:w-auto hover:border-[#8a1c1c] hover:bg-red-50/30 transition-all shadow-sm">
                    {imagePreview ? (
                      <img src={imagePreview} className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-md" alt="Preview" />
                    ) : (
                      <div className="w-20 h-20 rounded-full bg-white border border-gray-200 flex items-center justify-center text-3xl shadow-sm text-gray-400">📸</div>
                    )}
                    <div className="text-center sm:text-left">
                      <p className="text-sm font-bold text-[#8a1c1c]">{imagePreview ? 'Tap to Change Photo' : 'Click to Upload or Take Selfie'}</p>
                      <p className="text-xs font-medium text-slate-400 mt-0.5">Required for Digital ID Card</p>
                    </div>
                  </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-10">
                  <div className="flex flex-col group">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1 group-focus-within:text-[#8a1c1c] transition-colors">Full Name <span className="text-[#8a1c1c]">*</span></label>
                    <input type="text" name="fullName" value={formData.fullName} onChange={handleChange} required className="w-full bg-transparent border-0 border-b border-gray-200 pb-2 text-slate-800 font-medium focus:ring-0 focus:outline-none focus:border-[#8a1c1c] transition-colors" placeholder="e.g. Arul Murugan" />
                  </div>

                  <div className="flex flex-col group">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1 group-focus-within:text-[#8a1c1c] transition-colors">Date of Birth <span className="text-[#8a1c1c]">*</span></label>
                    <input type="date" name="dob" value={formData.dob} onChange={handleChange} required className="w-full bg-transparent border-0 border-b border-gray-200 pb-2 text-slate-800 font-medium focus:ring-0 focus:outline-none focus:border-[#8a1c1c] transition-colors" />
                  </div>
                  
                  <div className="flex flex-col group">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1 group-focus-within:text-[#8a1c1c] transition-colors">Mobile Number <span className="text-[#8a1c1c]">*</span></label>
                    <div className="flex items-center border-b border-gray-200 focus-within:border-[#8a1c1c] transition-colors pb-2">
                      <span className="text-slate-400 font-semibold pr-3 border-r border-gray-200 mr-3">+91</span>
                      <input type="tel" name="phoneNumber" value={formData.phoneNumber} onChange={handleChange} required maxLength="10" className="w-full bg-transparent border-0 text-slate-800 font-medium focus:ring-0 focus:outline-none p-0" placeholder="98765 43210" />
                    </div>
                  </div>

                  <div className="flex flex-col group">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1 group-focus-within:text-[#8a1c1c] transition-colors">Referral ID (Invited By)</label>
                    <input type="text" name="referralId" value={formData.referralId} onChange={handleChange} className="w-full bg-transparent border-0 border-b border-gray-200 pb-2 text-slate-800 font-mono font-medium focus:ring-0 focus:outline-none focus:border-[#8a1c1c] transition-colors uppercase" placeholder="e.g. TVK-PY-123456" />
                  </div>

                  <div className="flex flex-col group md:col-span-2">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1 group-focus-within:text-[#8a1c1c] transition-colors">Constituency Zone <span className="text-[#8a1c1c]">*</span></label>
                    <div className="relative">
                      <select name="zone" value={formData.zone} onChange={handleChange} required className="w-full bg-transparent border-0 border-b border-gray-200 pb-2 text-slate-800 font-medium focus:ring-0 focus:outline-none focus:border-[#8a1c1c] transition-colors appearance-none cursor-pointer">
                        <option value="" disabled>Select the operational region...</option>
                        {CONSTITUENCIES.map((zone, idx) => <option key={idx} value={zone}>{zone}</option>)}
                      </select>
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs">▼</div>
                    </div>
                  </div>
                </div>

                <hr className="border-gray-100 my-10" />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-10">
                  <div className="flex flex-col group">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1 group-focus-within:text-[#8a1c1c] transition-colors">Voter ID (EPIC) <span className="text-[#8a1c1c]">*</span></label>
                    <input type="text" name="voterId" value={formData.voterId} onChange={handleChange} required className="w-full bg-transparent border-0 border-b border-gray-200 pb-2 text-slate-800 font-mono font-medium uppercase focus:ring-0 focus:outline-none focus:border-[#8a1c1c] transition-colors" placeholder="PY/01/..." />
                  </div>

                  <div className="flex flex-col group">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1 group-focus-within:text-[#8a1c1c] transition-colors">Aadhaar Card Number</label>
                    <input type="text" name="aadhaarNumber" value={formData.aadhaarNumber} onChange={handleChange} maxLength="12" className="w-full bg-transparent border-0 border-b border-gray-200 pb-2 text-slate-800 font-mono tracking-[0.2em] font-medium focus:ring-0 focus:outline-none focus:border-[#8a1c1c] transition-colors" placeholder="1234 5678 9012" />
                  </div>
                  
                  <div className="flex flex-col group">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1 group-focus-within:text-[#8a1c1c] transition-colors">Family Ration Card</label>
                    <input type="text" name="familyCard" value={formData.familyCard} onChange={handleChange} className="w-full bg-transparent border-0 border-b border-gray-200 pb-2 text-slate-800 font-mono font-medium focus:ring-0 focus:outline-none focus:border-[#8a1c1c] transition-colors" placeholder="33XXXXXXXXXX" />
                  </div>

                  <div className="flex flex-col group">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1 group-focus-within:text-[#8a1c1c] transition-colors">PAN Number</label>
                    <input type="text" name="panNumber" value={formData.panNumber} onChange={handleChange} maxLength="10" className="w-full bg-transparent border-0 border-b border-gray-200 pb-2 text-slate-800 font-mono font-medium uppercase focus:ring-0 focus:outline-none focus:border-[#8a1c1c] transition-colors" placeholder="ABCDE1234F" />
                  </div>
                </div>
                
                <div className="pt-12 flex justify-end items-center gap-4">
                  <button type="submit" disabled={isSubmitting} className="bg-[#8a1c1c] hover:bg-[#6b1515] text-white font-semibold py-3.5 px-8 rounded-xl shadow-[0_8px_20px_rgba(138,28,28,0.25)] hover:shadow-[0_12px_25px_rgba(138,28,28,0.35)] transition-all active:scale-[0.98] flex items-center gap-3 disabled:opacity-70">
                    {isSubmitting ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <>Submit & Generate ID <span className="text-lg leading-none">→</span></>}
                  </button>
                </div>
              </form>
            </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default App;