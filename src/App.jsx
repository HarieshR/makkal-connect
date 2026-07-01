import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { QRCodeCanvas } from 'qrcode.react';
import Admin from './Admin';

const CONSTITUENCIES = [
  "Manadipet", "Thirubhuvanai", "Oussudu", "Mangalam", "Villianur", "Ozhukarai", "Kadirgamam", 
  "Indira Nagar", "Thattanchavady", "Kamaraj Nagar", "Lawspet", "Kalapet", "Muthialpet", 
  "Raj Bhavan", "Oupalam", "Orleanpet", "Nellithope", "Mudaliarpet", "Ariankuppam", 
  "Manavely", "Embalam", "Nettapakkam", "Bahour", "Nedungadu", "Thirunallar", 
  "Karaikal North", "Karaikal South", "Neravy", "Mahe", "Yanam"
];

// --- 🌐 DICTIONARY FOR LOCALIZATION ---
const t = {
  en: {
    enroll: "Enroll", portal: "Member Portal", admin: "HQ Admin", title: "Citizen Enrollment",
    photo: "Profile Photo (Selfie/Upload)", name: "Full Name", dob: "Date of Birth",
    mobile: "Mobile Number", zone: "Constituency Zone", ref: "Referral ID (Optional)",
    voter: "Voter ID (EPIC)", aadhaar: "Aadhaar Number", ration: "Ration Card", pan: "PAN Number",
    submit: "Send OTP Verification", verifyOtp: "Verify & Generate ID",
    idCard: "Digital ID Card", print: "Print / Save ID Card", news: "HQ Live Updates",
    grievance: "Report Issue", leaderboard: "Top Recruiters", share: "📱 Share Invite Link",
    issueDesc: "Describe Issue...", location: "📍 Fetch GPS Location", submitIssue: "Submit to HQ"
  },
  ta: {
    enroll: "பதிவு செய்", portal: "உறுப்பினர் பக்கம்", admin: "தலைமையகம்", title: "குடிமக்கள் பதிவு",
    photo: "புகைப்படம்", name: "முழு பெயர்", dob: "பிறந்த தேதி",
    mobile: "கைபேசி எண்", zone: "தொகுதி", ref: "பரிந்துரை எண் (விருப்பம்)",
    voter: "வாக்காளர் அட்டை", aadhaar: "ஆதார் எண்", ration: "குடும்ப அட்டை", pan: "பான் எண்",
    submit: "OTP அனுப்பு", verifyOtp: "சரிபார்த்து அட்டை பெறுக",
    idCard: "டிஜிட்டல் அடையாள அட்டை", print: "அட்டையை சேமிக்க", news: "நேரலை செய்திகள்",
    grievance: "புகார் அளி", leaderboard: "சிறந்த தொடர்பாளர்கள்", share: "📱 பகிர்வு இணைப்பு",
    issueDesc: "பிரச்சனையை விவரிக்கவும்...", location: "📍 GPS இருப்பிடம்", submitIssue: "தலைமையகத்திற்கு அனுப்பு"
  }
};

const App = () => {
  const [lang, setLang] = useState('en');
  const [activeTab, setActiveTab] = useState('registration');
  const [formData, setFormData] = useState({ fullName: '', dob: '', zone: '', voterId: '', familyCard: '', panNumber: '', aadhaarNumber: '', phoneNumber: '', referralId: '' });
  
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [status, setStatus] = useState({ type: '', message: '', data: null });
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // OTP State
  const [showOtp, setShowOtp] = useState(false);
  const [otpInput, setOtpInput] = useState('');

  // Portal State
  const [portalLogin, setPortalLogin] = useState({ memberId: '', phone: '' });
  const [portalUser, setPortalUser] = useState(null);
  const [portalData, setPortalData] = useState({ referrals: 0, badge: 'Thozhar' });
  const [portalTab, setPortalTab] = useState('id'); // 'id', 'grievance', 'news'
  
  // Grievance State
  const [grievance, setGrievance] = useState({ category: 'Water Scarcity', description: '', lat: null, lng: null });

  // Auto-fill Referral ID from URL (e.g. ?ref=TVK-123)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const refCode = urlParams.get('ref');
    if (refCode) setFormData(prev => ({ ...prev, referralId: refCode }));
  }, []);

  // Toast Auto-hide
  useEffect(() => {
    if (status.message && status.type !== 'success') {
      const timer = setTimeout(() => setStatus({ type: '', message: '', data: null }), 5000);
      return () => clearTimeout(timer);
    }
  }, [status]);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) { setImageFile(file); setImagePreview(URL.createObjectURL(file)); }
  };

  // --- 🎙️ VOICE ASSISTANT ---
  const startVoice = (field) => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return alert("Voice typing not supported in this browser.");
    const recognition = new SpeechRecognition();
    recognition.lang = lang === 'ta' ? 'ta-IN' : 'en-IN';
    recognition.start();
    recognition.onresult = (event) => {
      setFormData(prev => ({ ...prev, [field]: event.results[0][0].transcript }));
    };
  };

  // --- 🔒 REGISTRATION & OTP FLOW ---
  const requestOtp = (e) => {
    e.preventDefault();
    if (!imageFile) return setStatus({ type: 'error', message: 'Profile photo is required.' });
    if (formData.phoneNumber.length !== 10) return setStatus({ type: 'error', message: 'Enter a valid 10-digit number.' });
    
    setIsSubmitting(true);
    setStatus({ type: 'loading', message: 'Sending OTP to +91 ' + formData.phoneNumber });
    
    // Simulate SMS API Delay
    setTimeout(() => {
      setIsSubmitting(false);
      setShowOtp(true);
      setStatus({ type: 'success', message: 'Test OTP is 1234' });
    }, 1500);
  };

  const submitFinalRegistration = async (e) => {
    e.preventDefault();
    if (otpInput !== '1234') return setStatus({ type: 'error', message: 'Invalid OTP. Try 1234.' });

    setIsSubmitting(true);
    setStatus({ type: 'loading', message: 'Securing data & generating ID...' });

    const zonePrefix = formData.zone.substring(0, 3).toUpperCase();
    const { count } = await supabase.from('citizens').select('*', { count: 'exact', head: true }).eq('zone', formData.zone);
    const generatedMemberId = `TVK-${zonePrefix}-${String((count || 0) + 1).padStart(4, '0')}`;

    const fileExt = imageFile.name.split('.').pop();
    const fileName = `public/${generatedMemberId}.${fileExt}`;
    const { error: uploadError } = await supabase.storage.from('profile_pics').upload(fileName, imageFile, { contentType: imageFile.type, upsert: true });
    
    if (uploadError) { setIsSubmitting(false); return setStatus({ type: 'error', message: `Photo Error: ${uploadError.message}` }); }
    const profilePicUrl = supabase.storage.from('profile_pics').getPublicUrl(fileName).data.publicUrl;

    const newCitizen = {
      member_id: generatedMemberId, full_name: formData.fullName, dob: formData.dob, zone: formData.zone, 
      voter_id: formData.voterId.toUpperCase(), family_card: formData.familyCard || null, 
      pan_number: formData.panNumber ? formData.panNumber.toUpperCase() : null, aadhaar_number: formData.aadhaarNumber || null, 
      phone_number: formData.phoneNumber, referral_id: formData.referralId ? formData.referralId.toUpperCase() : null,
      profile_pic_url: profilePicUrl, is_flagged: true
    };

    const { error } = await supabase.from('citizens').insert([newCitizen]);
    setIsSubmitting(false);

    if (error) {
      setStatus({ type: 'error', message: error.message.includes('voter_id') ? 'Voter ID is already registered.' : 'Database Error.' });
    } else {
      setShowOtp(false);
      setStatus({ type: 'success', message: 'Registration Complete!', data: newCitizen });
      setFormData({ fullName: '', dob: '', zone: '', voterId: '', familyCard: '', panNumber: '', aadhaarNumber: '', phoneNumber: '', referralId: '' });
      setImageFile(null); setImagePreview(null); setOtpInput('');
    }
  };

  // --- 👥 PORTAL LOGIC ---
  const handlePortalLogin = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const { data, error } = await supabase.from('citizens').select('*').eq('member_id', portalLogin.memberId.toUpperCase()).eq('phone_number', portalLogin.phone).single();
    
    if (error || !data) {
      setStatus({ type: 'error', message: 'Invalid Credentials.' });
    } else {
      const { count } = await supabase.from('citizens').select('*', { count: 'exact', head: true }).eq('referral_id', data.member_id);
      let badge = t[lang].badge0;
      if (count >= 10 && count < 50) badge = t[lang].badge1;
      if (count >= 50) badge = t[lang].badge2;
      
      setPortalUser(data);
      setPortalData({ referrals: count || 0, badge });
      setStatus({ type: '', message: '' });
    }
    setIsSubmitting(false);
  };

  const getGPS = () => {
    if (!navigator.geolocation) return alert("Geolocation not supported");
    navigator.geolocation.getCurrentPosition((pos) => setGrievance({ ...grievance, lat: pos.coords.latitude, lng: pos.coords.longitude }));
  };

  const submitGrievance = async (e) => {
    e.preventDefault();
    await supabase.from('grievances').insert([{ member_id: portalUser.member_id, zone: portalUser.zone, category: grievance.category, description: grievance.description, lat: grievance.lat, lng: grievance.lng }]);
    alert("Grievance Submitted Successfully to HQ.");
    setGrievance({ category: 'Water Scarcity', description: '', lat: null, lng: null });
  };

  const shareWhatsApp = () => {
    const text = `Join Tamizhaga Vettri Kazhagam! Register using my referral ID: *${portalUser.member_id}*. Link: https://tvk-makkal-connect.vercel.app/?ref=${portalUser.member_id}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="min-h-screen flex flex-col font-sans text-slate-800 bg-[#f8fafc]">
      
      {status.message && !status.data && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top-5">
          <div className={`px-6 py-4 rounded-full shadow-2xl border text-white font-bold text-sm ${status.type === 'error' ? 'bg-red-500 border-red-400' : status.type === 'success' ? 'bg-emerald-500 border-emerald-400' : 'bg-amber-500 border-amber-400'}`}>
            {status.message}
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className="sticky top-0 z-40 bg-gradient-to-r from-[#5a0c0c] via-[#8a1c1c] to-[#5a0c0c] shadow-lg border-b border-[#a32a2a]">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full border-2 border-[#facc15] flex items-center justify-center"><span className="text-[#facc15]">🐘</span></div>
            <h1 className="text-xl font-bold text-[#facc15]">TVK Connect</h1>
          </div>
          <div className="flex bg-[#3e0808] p-1 rounded-full border border-[#7a1313] gap-1">
            <button onClick={() => setActiveTab('registration')} className={`px-4 py-1.5 rounded-full text-xs font-bold ${activeTab === 'registration' ? 'bg-[#facc15] text-[#5a0c0c]' : 'text-[#facc15]'}`}>{t[lang].enroll}</button>
            <button onClick={() => setActiveTab('portal')} className={`px-4 py-1.5 rounded-full text-xs font-bold ${activeTab === 'portal' ? 'bg-[#facc15] text-[#5a0c0c]' : 'text-[#facc15]'}`}>{t[lang].portal}</button>
            <button onClick={() => setActiveTab('admin')} className={`px-4 py-1.5 rounded-full text-xs font-bold ${activeTab === 'admin' ? 'bg-[#facc15] text-[#5a0c0c]' : 'text-[#facc15]'}`}>{t[lang].admin}</button>
          </div>
          <button onClick={() => setLang(lang === 'en' ? 'ta' : 'en')} className="text-white text-xs font-bold bg-white/10 px-3 py-1 rounded-full border border-white/20">
            {lang === 'en' ? 'தமிழ்' : 'English'}
          </button>
        </div>
      </nav>

      <main className="flex-grow max-w-5xl mx-auto px-4 mt-8 mb-20 w-full">
        {activeTab === 'admin' && <Admin />}

        {/* --- REGISTRATION TAB --- */}
        {activeTab === 'registration' && (
          <div className="max-w-4xl mx-auto animate-in fade-in">
            {status.data ? (
              <div className="flex flex-col items-center mt-10">
                <div className="bg-gradient-to-br from-[#8a1c1c] to-[#5a0c0c] p-8 rounded-[2rem] text-white shadow-2xl w-full max-w-md border-4 border-[#facc15] relative">
                  <div className="flex justify-between items-start border-b border-white/20 pb-4 mb-4">
                    <div>
                      <h3 className="text-xs text-[#facc15] tracking-widest">{t[lang].idCard}</h3>
                      <h2 className="text-2xl font-black mt-1">TVK CADRE</h2>
                      <p className="font-mono text-sm mt-2 bg-black/30 px-3 py-1 rounded inline-block">{status.data.member_id}</p>
                    </div>
                    {/* --- 📱 QR CODE INJECTION --- */}
                    <div className="bg-white p-2 rounded-xl shadow-inner">
                      <QRCodeCanvas value={status.data.member_id} size={64} bgColor={"#ffffff"} fgColor={"#8a1c1c"} />
                    </div>
                  </div>
                  <div className="flex items-center gap-4 border-b border-white/20 pb-4 mb-4">
                     <img src={status.data.profile_pic_url} className="w-16 h-16 rounded-xl border-2 border-white object-cover" alt="ID" />
                     <div><p className="text-[10px] text-red-200 uppercase">{t[lang].name}</p><p className="font-bold text-lg">{status.data.full_name}</p></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><p className="text-[10px] text-red-200 uppercase">{t[lang].zone}</p><p className="font-bold">{status.data.zone}</p></div>
                    <div><p className="text-[10px] text-red-200 uppercase">{t[lang].voter}</p><p className="font-bold font-mono">{status.data.voter_id}</p></div>
                  </div>
                </div>
                <button onClick={() => window.print()} className="mt-6 bg-white border font-bold py-3 px-8 rounded-full shadow-md hover:text-[#8a1c1c]">{t[lang].print}</button>
              </div>
            ) : (
              <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden p-8">
                <h2 className="text-2xl font-bold text-slate-800">{t[lang].title}</h2>
                <hr className="my-6 border-gray-100" />
                
                {showOtp ? (
                  <form onSubmit={submitFinalRegistration} className="space-y-6 max-w-sm mx-auto text-center">
                    <h3 className="font-bold text-xl">Enter Security OTP</h3>
                    <p className="text-sm text-gray-500">Sent to +91 {formData.phoneNumber}</p>
                    <input type="text" value={otpInput} onChange={e=>setOtpInput(e.target.value)} maxLength="4" className="w-full border p-4 text-center text-2xl font-mono tracking-[1em] rounded-xl outline-none focus:border-[#8a1c1c]" placeholder="••••" required />
                    <button type="submit" disabled={isSubmitting} className="w-full bg-[#8a1c1c] text-white font-bold py-3 rounded-xl shadow-md disabled:opacity-50">
                      {isSubmitting ? 'Verifying...' : t[lang].verifyOtp}
                    </button>
                    <button type="button" onClick={() => setShowOtp(false)} className="text-xs text-gray-400 font-bold">Cancel</button>
                  </form>
                ) : (
                  <form onSubmit={requestOtp} className="space-y-6">
                    <div className="flex flex-col">
                      <label className="text-xs font-bold text-slate-400 mb-2">{t[lang].photo} *</label>
                      <input type="file" accept="image/*" onChange={handleImageChange} className="text-sm" required />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="flex flex-col">
                        <label className="text-[11px] font-bold text-slate-400 uppercase mb-1">{t[lang].name} *</label>
                        <div className="flex items-center border-b border-gray-300 focus-within:border-[#8a1c1c]">
                          <input type="text" name="fullName" value={formData.fullName} onChange={handleChange} required className="w-full py-2 outline-none" />
                          <button type="button" onClick={() => startVoice('fullName')} className="p-2 text-gray-400 hover:text-red-600 transition-colors" title="Voice Type">🎤</button>
                        </div>
                      </div>
                      <div className="flex flex-col"><label className="text-[11px] font-bold text-slate-400 uppercase mb-1">{t[lang].dob} *</label><input type="date" name="dob" value={formData.dob} onChange={handleChange} required className="border-b border-gray-300 py-2 outline-none focus:border-[#8a1c1c]" /></div>
                      <div className="flex flex-col"><label className="text-[11px] font-bold text-slate-400 uppercase mb-1">{t[lang].mobile} *</label><input type="tel" name="phoneNumber" value={formData.phoneNumber} onChange={handleChange} required maxLength="10" className="border-b border-gray-300 py-2 outline-none focus:border-[#8a1c1c]" /></div>
                      <div className="flex flex-col">
                        <label className="text-[11px] font-bold text-slate-400 uppercase mb-1">{t[lang].zone} *</label>
                        <select name="zone" value={formData.zone} onChange={handleChange} required className="border-b border-gray-300 py-2 outline-none focus:border-[#8a1c1c]">
                          <option value="">Select...</option>{CONSTITUENCIES.map(z => <option key={z} value={z}>{z}</option>)}
                        </select>
                      </div>
                      <div className="flex flex-col"><label className="text-[11px] font-bold text-slate-400 uppercase mb-1">{t[lang].voter} *</label><input type="text" name="voterId" value={formData.voterId} onChange={handleChange} required className="border-b border-gray-300 py-2 outline-none focus:border-[#8a1c1c] uppercase" /></div>
                      <div className="flex flex-col"><label className="text-[11px] font-bold text-slate-400 uppercase mb-1">{t[lang].ref}</label><input type="text" name="referralId" value={formData.referralId} onChange={handleChange} className="border-b border-gray-300 py-2 outline-none focus:border-[#8a1c1c] uppercase" /></div>
                    </div>
                    <div className="pt-6 flex justify-end">
                      <button type="submit" disabled={isSubmitting} className="bg-[#8a1c1c] text-white font-bold py-3 px-8 rounded-xl shadow-md disabled:opacity-50">
                        {isSubmitting ? 'Processing...' : t[lang].submit}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>
        )}

        {/* --- MEMBER PORTAL --- */}
        {activeTab === 'portal' && (
          <div className="max-w-4xl mx-auto animate-in fade-in">
            {!portalUser ? (
              <form onSubmit={handlePortalLogin} className="max-w-sm mx-auto bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100 space-y-6 mt-10">
                <div className="text-center"><h2 className="text-2xl font-bold">{t[lang].portal}</h2></div>
                <div><label className="text-xs font-bold text-slate-400">Member ID</label><input type="text" name="memberId" value={portalLogin.memberId} onChange={handlePortalChange} required className="w-full border-b border-gray-300 py-2 uppercase outline-none focus:border-[#8a1c1c]" placeholder="TVK-..." /></div>
                <div><label className="text-xs font-bold text-slate-400">Mobile</label><input type="tel" name="phone" value={portalLogin.phone} onChange={handlePortalChange} required className="w-full border-b border-gray-300 py-2 outline-none focus:border-[#8a1c1c]" /></div>
                <button type="submit" disabled={isSubmitting} className="w-full bg-[#8a1c1c] text-white font-bold py-3 rounded-xl">{isSubmitting ? '...' : 'Login'}</button>
              </form>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                {/* Gamification Sidebar */}
                <div className="col-span-1 space-y-4">
                  <div className="bg-white p-6 rounded-3xl shadow-sm border text-center">
                    <img src={portalUser.profile_pic_url} className="w-24 h-24 mx-auto rounded-full object-cover border-4 border-gray-100 mb-4" alt="profile"/>
                    <h3 className="font-bold text-lg">{portalUser.full_name}</h3>
                    <div className="mt-4 bg-gradient-to-r from-amber-200 to-[#facc15] py-2 px-4 rounded-xl shadow-sm">
                      <p className="text-[10px] font-bold uppercase text-amber-900">Rank Badge</p>
                      <p className="font-black text-amber-950">{portalData.badge}</p>
                    </div>
                    <div className="mt-4 flex justify-between px-4 border-t pt-4">
                      <div className="text-center"><p className="text-2xl font-black">{portalData.referrals}</p><p className="text-[10px] uppercase font-bold text-slate-400">Referrals</p></div>
                      <div className="text-center"><p className="text-2xl font-black">{portalUser.is_flagged?'⏳':'✅'}</p><p className="text-[10px] uppercase font-bold text-slate-400">Status</p></div>
                    </div>
                  </div>
                  <button onClick={shareWhatsApp} className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-xl shadow-md">
                    {t[lang].share}
                  </button>
                  <button onClick={() => setPortalUser(null)} className="w-full bg-gray-100 text-slate-600 font-bold py-3 rounded-xl">Sign Out</button>
                </div>

                {/* Main Content */}
                <div className="col-span-1 md:col-span-2">
                  <div className="bg-white rounded-3xl shadow-sm border overflow-hidden min-h-[400px]">
                    <div className="flex border-b overflow-x-auto">
                      <button onClick={()=>setPortalTab('id')} className={`px-6 py-4 font-bold text-sm whitespace-nowrap ${portalTab==='id'?'border-b-2 border-[#8a1c1c] text-[#8a1c1c]':'text-slate-400'}`}>{t[lang].idCard}</button>
                      <button onClick={()=>setPortalTab('news')} className={`px-6 py-4 font-bold text-sm whitespace-nowrap ${portalTab==='news'?'border-b-2 border-[#8a1c1c] text-[#8a1c1c]':'text-slate-400'}`}>{t[lang].news}</button>
                      <button onClick={()=>setPortalTab('grievance')} className={`px-6 py-4 font-bold text-sm whitespace-nowrap ${portalTab==='grievance'?'border-b-2 border-[#8a1c1c] text-[#8a1c1c]':'text-slate-400'}`}>{t[lang].grievance}</button>
                    </div>
                    
                    <div className="p-8">
                      {portalTab === 'id' && (
                        <div className="bg-gradient-to-br from-[#8a1c1c] to-[#5a0c0c] p-6 rounded-2xl text-white shadow-xl relative border-2 border-[#facc15] max-w-sm mx-auto flex gap-4 items-center">
                           <div className="bg-white p-2 rounded-xl"><QRCodeCanvas value={portalUser.member_id} size={70} /></div>
                           <div>
                             <h2 className="text-xl font-black">TVK CADRE</h2>
                             <p className="font-mono text-sm text-[#facc15]">{portalUser.member_id}</p>
                             <p className="font-bold text-sm mt-2">{portalUser.full_name}</p>
                           </div>
                        </div>
                      )}

                      {portalTab === 'news' && (
                        <div className="space-y-4">
                          <div className="p-4 border border-blue-100 bg-blue-50 rounded-xl">
                            <h4 className="font-bold text-blue-900 mb-1">📢 Next Assembly Meetup</h4>
                            <p className="text-sm text-blue-800">State conference scheduled for next week in Villupuram. All Mandram Leaders are expected to attend.</p>
                          </div>
                          <div className="p-4 border border-gray-100 rounded-xl">
                            <h4 className="font-bold mb-1">🏅 Leaderboard: {portalUser.zone}</h4>
                            <p className="text-sm text-gray-500 mb-2">Top recruiters in your area this month:</p>
                            <ol className="list-decimal pl-5 text-sm font-bold text-[#8a1c1c]">
                              <li>TVK-WHI-0012 (142 members)</li>
                              <li>TVK-WHI-0004 (89 members)</li>
                              <li>TVK-WHI-0045 (31 members)</li>
                            </ol>
                          </div>
                        </div>
                      )}

                      {portalTab === 'grievance' && (
                        <form onSubmit={submitGrievance} className="space-y-4">
                          <select value={grievance.category} onChange={e=>setGrievance({...grievance, category: e.target.value})} className="w-full border p-3 rounded-xl bg-gray-50 outline-none">
                            <option>Water Scarcity</option><option>Road Damage</option><option>Electricity</option><option>Corruption</option>
                          </select>
                          <textarea rows="4" required value={grievance.description} onChange={e=>setGrievance({...grievance, description: e.target.value})} className="w-full border p-3 rounded-xl bg-gray-50 outline-none" placeholder={t[lang].issueDesc}></textarea>
                          <button type="button" onClick={getGPS} className="text-xs font-bold text-blue-600 bg-blue-50 px-4 py-2 rounded-lg">{t[lang].location} {grievance.lat && '✅'}</button>
                          <button type="submit" className="w-full bg-[#8a1c1c] text-white font-bold py-3 rounded-xl">{t[lang].submitIssue}</button>
                        </form>
                      )}
                    </div>
                  </div>
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