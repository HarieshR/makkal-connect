import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { QRCodeCanvas } from 'qrcode.react';
import { jsPDF } from "jspdf";
import Admin from './Admin';

const CONSTITUENCIES = [
  "Manadipet", "Thirubhuvanai", "Oussudu", "Mangalam", "Villianur", "Ozhukarai", "Kadirgamam", 
  "Indira Nagar", "Thattanchavady", "Kamaraj Nagar", "Lawspet", "Kalapet", "Muthialpet", 
  "Raj Bhavan", "Oupalam", "Orleanpet", "Nellithope", "Mudaliarpet", "Ariankuppam", 
  "Manavely", "Embalam", "Nettapakkam", "Bahour", "Nedungadu", "Thirunallar", 
  "Karaikal North", "Karaikal South", "Neravy", "Mahe", "Yanam"
];

// --- 🌐 FULL LOCALIZATION DICTIONARY ---
const t = {
  en: { 
    enroll: "Enroll", portal: "Member Portal", admin: "HQ Admin", title: "Citizen Enrollment", loginTitle: "Member Login",
    photo: "Profile Photo *", name: "Full Name *", dob: "Date of Birth *", mobile: "Mobile Number *", pass: "Create Password *", zone: "Constituency Zone *", voter: "Voter ID (EPIC) *", ration: "Ration Card *", aadhaar: "Aadhaar Number", pan: "PAN Number", ref: "Referral ID", 
    reqOtp: "Send OTP Verification", verifyOtp: "Verify & Register", cancel: "Cancel & Edit Form",
    idCard: "ID Card", news: "Newsfeed", grievance: "Grievances", donate: "Donate",
    print: "Print / Save ID Card", share: "📱 Share Invite Link", push: "🔔 Enable Push Alerts", logout: "Sign Out",
    rankBadge: "Rank Badge", referrals: "Referrals", status: "Status",
    reportIssue: "Report AI-Assisted Issue", desc: "Describe your issue (e.g. Water pipe broken)", gps: "📍 Attach GPS Location", route: "Auto-Route to Department",
    myIssues: "My Submitted Issues", support: "Support the Movement", donateBtn: "Donate ₹1,000",
    badge0: "Thozhar", badge1: "Makkal Thondan", badge2: "Mandram Leader"
  },
  ta: { 
    enroll: "பதிவு செய்", portal: "உறுப்பினர் பக்கம்", admin: "தலைமையகம்", title: "குடிமக்கள் பதிவு", loginTitle: "உறுப்பினர் நுழைவு",
    photo: "புகைப்படம் *", name: "முழு பெயர் *", dob: "பிறந்த தேதி *", mobile: "கைபேசி எண் *", pass: "கடவுச்சொல் *", zone: "தொகுதி *", voter: "வாக்காளர் அட்டை *", ration: "குடும்ப அட்டை *", aadhaar: "ஆதார் எண்", pan: "பான் எண்", ref: "பரிந்துரை எண்", 
    reqOtp: "OTP அனுப்பு", verifyOtp: "சரிபார்த்து பதிவு செய்", cancel: "ரத்து செய்",
    idCard: "அடையாள அட்டை", news: "செய்திகள்", grievance: "புகார்கள்", donate: "நன்கொடை",
    print: "அட்டையை சேமிக்க", share: "📱 பகிர்வு இணைப்பு", push: "🔔 அறிவிப்புகளை இயக்கு", logout: "வெளியேறு",
    rankBadge: "பதவி", referrals: "பரிந்துரைகள்", status: "நிலைப்பாடு",
    reportIssue: "புகார் அளி (AI வழிகாட்டுதல்)", desc: "பிரச்சனையை விவரிக்கவும்...", gps: "📍 GPS இருப்பிடம்", route: "தலைமையகத்திற்கு அனுப்பு",
    myIssues: "எனது புகார்கள்", support: "இயக்கத்தை ஆதரிக்க", donateBtn: "நன்கொடை ₹1,000",
    badge0: "தோழர்", badge1: "மக்கள் தொண்டன்", badge2: "மன்ற தலைவர்"
  }
};

const App = () => {
  const [lang, setLang] = useState('en');
  const [activeTab, setActiveTab] = useState('registration');
  const [formData, setFormData] = useState({ fullName: '', dob: '', password: '', zone: '', voterId: '', familyCard: '', panNumber: '', aadhaarNumber: '', phoneNumber: '', referralId: '' });
  
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [status, setStatus] = useState({ type: '', message: '', data: null });
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [showOtp, setShowOtp] = useState(false);
  const [otpInput, setOtpInput] = useState('');
  const [otpTimer, setOtpTimer] = useState(30);

  const [portalLogin, setPortalLogin] = useState({ memberId: '', password: '' });
  const [portalUser, setPortalUser] = useState(null);
  const [portalData, setPortalData] = useState({ referrals: 0, rank: 0, pointsNeeded: 0, badge: 'Thozhar' });
  const [portalTab, setPortalTab] = useState('id'); 
  
  const [grievance, setGrievance] = useState({ description: '', lat: null, lng: null });
  const [myGrievances, setMyGrievances] = useState([]);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const refCode = urlParams.get('ref');
    if (refCode) setFormData(prev => ({ ...prev, referralId: refCode }));
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      const savedData = localStorage.getItem('offlineTVKData');
      if (savedData) setStatus({ type: 'success', message: 'Back online! Ready to sync offline registration.' });
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []);

  useEffect(() => {
    if (status.message && status.type !== 'success') {
      const timer = setTimeout(() => setStatus({ type: '', message: '', data: null }), 5000);
      return () => clearTimeout(timer);
    }
  }, [status]);

  useEffect(() => {
    let interval = null;
    if (showOtp && otpTimer > 0) interval = setInterval(() => setOtpTimer(prev => prev - 1), 1000);
    else if (otpTimer === 0) clearInterval(interval);
    return () => clearInterval(interval);
  }, [showOtp, otpTimer]);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
  const handlePortalChange = (e) => setPortalLogin({ ...portalLogin, [e.target.name]: e.target.value });
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) { setImageFile(file); setImagePreview(URL.createObjectURL(file)); }
  };

  const startVoice = (field) => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return alert("Voice typing not supported in this browser.");
    const recognition = new SpeechRecognition();
    recognition.lang = lang === 'ta' ? 'ta-IN' : 'en-IN';
    recognition.start();
    recognition.onresult = (event) => setFormData(prev => ({ ...prev, [field]: event.results[0][0].transcript }));
  };

  const requestOtp = async (e) => {
    e.preventDefault();
    if (!navigator.onLine) {
      localStorage.setItem('offlineTVKData', JSON.stringify(formData));
      return setStatus({ type: 'success', message: 'Offline Mode: Data saved. It will sync when internet returns.' });
    }
    if (!imageFile) return setStatus({ type: 'error', message: 'Profile photo is required.' });
    if (formData.phoneNumber.length !== 10) return setStatus({ type: 'error', message: 'Enter a valid 10-digit number.' });

    setIsSubmitting(true);
    setStatus({ type: 'loading', message: 'Checking database for duplicates...' });
    const { data: duplicates } = await supabase.from('citizens').select('full_name').eq('dob', formData.dob);
    if (duplicates?.some(d => d.full_name.toLowerCase().includes(formData.fullName.toLowerCase().split(' ')[0]))) {
      const proceed = window.confirm("⚠️ AI Warning: A member with a similar name and the exact same Date of Birth is already registered. Proceed anyway?");
      if (!proceed) { setIsSubmitting(false); return setStatus({ type: '', message: '' }); }
    }

    setStatus({ type: 'loading', message: 'Generating Secure Token...' });
    setTimeout(() => { 
      setIsSubmitting(false); setShowOtp(true); setOtpTimer(30); 
      setStatus({ type: 'success', message: 'Test OTP is 1234' }); 
    }, 1500);
  };

  const submitRegistration = async (e) => {
    e.preventDefault();
    if (otpInput !== '1234') return setStatus({ type: 'error', message: 'Invalid OTP. Try 1234.' });

    setIsSubmitting(true);
    setStatus({ type: 'loading', message: 'Securing data & generating ID...' });

    const zonePrefix = formData.zone.substring(0, 3).toUpperCase();
    const { count } = await supabase.from('citizens').select('*', { count: 'exact', head: true }).eq('zone', formData.zone);
    const generatedMemberId = `TVK-${zonePrefix}-${String((count || 0) + 1).padStart(4, '0')}`;

    const fileName = `public/${generatedMemberId}-${Date.now()}.jpg`;
    const { error: uploadError } = await supabase.storage.from('profile_pics').upload(fileName, imageFile, { contentType: imageFile.type, upsert: false });
    if (uploadError) { setIsSubmitting(false); return setStatus({ type: 'error', message: `Photo Error: ${uploadError.message}` }); }
    
    const profilePicUrl = supabase.storage.from('profile_pics').getPublicUrl(fileName).data.publicUrl;

    const newCitizen = {
      member_id: generatedMemberId, full_name: formData.fullName, dob: formData.dob, password: formData.password, zone: formData.zone, 
      voter_id: formData.voterId.toUpperCase(), family_card: formData.familyCard, pan_number: formData.panNumber || null, 
      aadhaar_number: formData.aadhaarNumber || null, phone_number: formData.phoneNumber, referral_id: formData.referralId || null,
      profile_pic_url: profilePicUrl, is_flagged: true
    };

    const { error } = await supabase.from('citizens').insert([newCitizen]);
    setIsSubmitting(false);

    if (error) {
      setStatus({ type: 'error', message: error.message.includes('voter_id') ? 'Voter ID is already registered.' : 'Database Error.' });
    } else {
      localStorage.removeItem('offlineTVKData');
      setShowOtp(false);
      setStatus({ type: 'success', message: 'Registration Complete! Account Pending Verification.', data: newCitizen });
      setFormData({ fullName: '', dob: '', password: '', zone: '', voterId: '', familyCard: '', panNumber: '', aadhaarNumber: '', phoneNumber: '', referralId: '' });
      setImageFile(null); setImagePreview(null); setOtpInput('');
    }
  };

  const handlePortalLogin = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    const { data, error } = await supabase.from('citizens').select('*').eq('member_id', portalLogin.memberId.toUpperCase()).eq('password', portalLogin.password).single();
    
    if (error || !data) {
      setStatus({ type: 'error', message: 'Invalid Member ID or Password.' });
    } else {
      const { data: allReferrals } = await supabase.from('citizens').select('referral_id').eq('zone', data.zone).not('referral_id', 'is', null);
      const counts = {};
      allReferrals.forEach(r => counts[r.referral_id] = (counts[r.referral_id] || 0) + 1);
      
      const sortedRecruiters = Object.entries(counts).sort((a, b) => b[1] - a[1]);
      const myRefs = counts[data.member_id] || 0;
      let myRank = sortedRecruiters.findIndex(r => r[0] === data.member_id) + 1;
      if (myRank === 0) myRank = sortedRecruiters.length + 1;
      
      const nextPerson = sortedRecruiters[myRank - 2];
      const pointsNeeded = nextPerson ? (nextPerson[1] - myRefs + 1) : 0;

      let badge = t[lang].badge0; if (myRefs >= 10) badge = t[lang].badge1; if (myRefs >= 50) badge = t[lang].badge2;
      
      setPortalUser(data);
      setPortalData({ referrals: myRefs, rank: myRank, pointsNeeded, badge });
      fetchMyGrievances(data.member_id);
      setStatus({ type: '', message: '' });
    }
    setIsSubmitting(false);
  };

  const submitGrievance = async (e) => {
    e.preventDefault();
    let dept = 'General Dept';
    const txt = grievance.description.toLowerCase();
    if (txt.includes('water') || txt.includes('pipe') || txt.includes('scarcity')) dept = 'Water & Sanitation';
    else if (txt.includes('road') || txt.includes('pothole') || txt.includes('street')) dept = 'Transport & Roads';
    else if (txt.includes('electric') || txt.includes('power')) dept = 'Electricity Board';

    const { data, error } = await supabase.from('grievances').insert([{ 
      member_id: portalUser.member_id, zone: portalUser.zone, department: dept, category: dept, description: grievance.description, lat: grievance.lat, lng: grievance.lng 
    }]).select();
    
    if (error) {
      alert("Error submitting grievance: " + error.message);
    } else {
      alert(`Grievance Auto-Routed to ${dept} Successfully.`);
      setGrievance({ description: '', lat: null, lng: null });
      if(data) setMyGrievances([data[0], ...myGrievances]);
    }
  };

  const fetchMyGrievances = async (m_id) => {
    const { data } = await supabase.from('grievances').select('*').eq('member_id', m_id).order('created_at', { ascending: false });
    setMyGrievances(data || []);
  };

  const handleDonation = () => {
    alert("Razorpay UI Triggered. Payment Successful!");
    const doc = new jsPDF();
    doc.setFontSize(22); doc.setTextColor("#8a1c1c"); doc.text("TAMIZHAGA VETTRI KAZHAGAM", 20, 20);
    doc.setFontSize(12); doc.setTextColor("#000000"); doc.text("Official 80G Tax Exemption Receipt", 20, 30);
    doc.text(`Receipt No: TVK-DON-${Date.now()}`, 20, 45); doc.text(`Donor Name: ${portalUser.full_name}`, 20, 55);
    doc.text(`Member ID: ${portalUser.member_id}`, 20, 65); doc.text(`PAN Number: ${portalUser.pan_number || 'Not Provided'}`, 20, 75);
    doc.text(`Amount Received: INR 1,000.00`, 20, 85); doc.text(`Date: ${new Date().toLocaleDateString()}`, 20, 95);
    doc.text("Thank you for your contribution to the movement.", 20, 115);
    doc.save(`TVK_Receipt_${portalUser.member_id}.pdf`);
  };

  const APP_URL = "https://tvk-makkal-connect.vercel.app/verify/";

  return (
    <div className="min-h-screen flex flex-col font-sans text-slate-800 bg-[#f8fafc]">
      
      {/* Toast */}
      {status.message && !status.data && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top-5 w-[90%] max-w-sm">
          <div className={`px-4 py-3 rounded-2xl shadow-2xl border text-white font-bold text-sm text-center ${status.type==='error'?'bg-red-500':status.type==='loading'?'bg-amber-500':'bg-emerald-500'}`}>
            {status.message}
          </div>
        </div>
      )}

      {/* Navigation (Mobile Friendly) */}
      <nav className="sticky top-0 z-40 bg-gradient-to-r from-[#5a0c0c] via-[#8a1c1c] to-[#5a0c0c] shadow-lg border-b border-[#a32a2a]">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="flex items-center justify-between w-full sm:w-auto">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full border-2 border-[#facc15] flex items-center justify-center"><span className="text-[#facc15] text-sm">🐘</span></div>
              <h1 className="text-lg font-bold text-[#facc15]">TVK Connect</h1>
            </div>
            <button onClick={() => setLang(lang === 'en' ? 'ta' : 'en')} className="sm:hidden text-white text-[10px] font-bold bg-white/10 px-3 py-1 rounded-full border border-white/20 whitespace-nowrap">{lang === 'en' ? 'தமிழ்' : 'English'}</button>
          </div>
          
          <div className="flex bg-[#3e0808] p-1 rounded-full border border-[#7a1313] w-full sm:w-auto overflow-x-auto hide-scrollbar">
            <button onClick={() => setActiveTab('registration')} className={`flex-1 sm:flex-none px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${activeTab === 'registration' ? 'bg-[#facc15] text-[#5a0c0c]' : 'text-[#facc15]'}`}>{t[lang].enroll}</button>
            <button onClick={() => setActiveTab('portal')} className={`flex-1 sm:flex-none px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${activeTab === 'portal' ? 'bg-[#facc15] text-[#5a0c0c]' : 'text-[#facc15]'}`}>{t[lang].portal}</button>
            <button onClick={() => setActiveTab('admin')} className={`flex-1 sm:flex-none px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${activeTab === 'admin' ? 'bg-[#facc15] text-[#5a0c0c]' : 'text-[#facc15]'}`}>{t[lang].admin}</button>
          </div>
          <button onClick={() => setLang(lang === 'en' ? 'ta' : 'en')} className="hidden sm:block text-white text-xs font-bold bg-white/10 px-3 py-1 rounded-full border border-white/20 whitespace-nowrap">{lang === 'en' ? 'தமிழ்' : 'English'}</button>
        </div>
      </nav>

      <main className="flex-grow max-w-5xl mx-auto px-4 mt-6 mb-20 w-full">
        {activeTab === 'admin' && <Admin />}

        {/* REGISTRATION TAB */}
        {activeTab === 'registration' && (
          <div className="max-w-4xl mx-auto animate-in fade-in">
            {status.data ? (
              <div className="flex flex-col items-center mt-6">
                <div className="bg-gradient-to-br from-[#8a1c1c] to-[#5a0c0c] p-6 rounded-[2rem] text-white shadow-2xl w-full max-w-sm border-4 border-[#facc15]">
                  <div className="flex justify-between items-start border-b border-white/20 pb-4 mb-4">
                    <div><h3 className="text-[10px] text-[#facc15] tracking-widest uppercase">{t[lang].idCard}</h3><h2 className="text-xl font-black mt-1">TVK CADRE</h2><p className="font-mono text-xs mt-2 bg-black/30 px-2 py-1 rounded inline-block">{status.data.member_id}</p></div>
                    <div className="bg-white p-1.5 rounded-xl"><QRCodeCanvas value={`${APP_URL}${status.data.member_id}`} size={60} /></div>
                  </div>
                  <div className="flex items-center gap-4 border-b border-white/20 pb-4 mb-4"><img src={status.data.profile_pic_url} className="w-14 h-14 rounded-xl border-2 border-white object-cover" alt="ID" /><div><p className="text-[10px] text-red-200 uppercase">{t[lang].name}</p><p className="font-bold">{status.data.full_name}</p></div></div>
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div><p className="text-[10px] text-red-200 uppercase">Zone</p><p className="font-bold truncate">{status.data.zone}</p></div>
                    <div><p className="text-[10px] text-red-200 uppercase">Voter ID</p><p className="font-bold font-mono">{status.data.voter_id}</p></div>
                  </div>
                </div>
                <button onClick={() => window.print()} className="mt-6 bg-white border font-bold py-3 px-8 rounded-full shadow-md text-sm">{t[lang].print}</button>
              </div>
            ) : (
              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden p-6 md:p-10">
                <h2 className="text-xl md:text-2xl font-bold text-slate-800">{t[lang].title}</h2><hr className="my-5 border-gray-100" />
                
                {showOtp ? (
                  <form onSubmit={submitRegistration} className="space-y-6 max-w-sm mx-auto text-center bg-gray-50 p-6 rounded-3xl border border-gray-200">
                    <div className="text-3xl mb-2">🔒</div><h3 className="font-bold text-lg">Security Verification</h3>
                    <p className="text-xs text-gray-500">OTP sent to +91 {formData.phoneNumber}</p>
                    <input type="text" value={otpInput} onChange={e=>setOtpInput(e.target.value)} maxLength="4" className="w-full border p-4 text-center text-2xl font-mono tracking-[1em] rounded-xl outline-none focus:border-[#8a1c1c] shadow-inner bg-white" placeholder="••••" required />
                    <div className="flex justify-between items-center text-[10px] font-bold px-2">
                      <span className={otpTimer > 0 ? 'text-amber-600' : 'text-slate-400'}>00:{otpTimer.toString().padStart(2, '0')}</span>
                      <button type="button" onClick={() => { setOtpTimer(30); alert('OTP Resent! Code: 1234'); }} disabled={otpTimer > 0} className={`hover:underline ${otpTimer > 0 ? 'text-gray-400' : 'text-blue-600'}`}>Resend OTP</button>
                    </div>
                    <button type="submit" disabled={isSubmitting} className="w-full bg-[#8a1c1c] text-white font-bold py-3.5 rounded-xl shadow-md text-sm">{isSubmitting ? 'Verifying...' : t[lang].verifyOtp}</button>
                    <button type="button" onClick={() => setShowOtp(false)} className="text-xs text-gray-400 font-bold hover:text-red-600">{t[lang].cancel}</button>
                  </form>
                ) : (
                  <form onSubmit={requestOtp} className="space-y-5">
                    <div className="mb-6 flex flex-col sm:flex-row items-center gap-4 bg-gray-50 p-4 rounded-2xl border border-dashed border-gray-300">
                      {imagePreview ? <img src={imagePreview} className="w-16 h-16 rounded-2xl object-cover border-2 border-white shadow-sm" alt="Preview" /> : <div className="w-16 h-16 rounded-2xl bg-white border border-gray-200 flex items-center justify-center text-2xl text-gray-400 shadow-sm">📸</div>}
                      <div className="w-full"><label className="text-[10px] font-bold text-slate-500 block mb-1 uppercase">{t[lang].photo}</label><input type="file" accept="image/*" onChange={handleImageChange} required className="w-full text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-4 file:rounded-full file:border-0 file:bg-red-50 file:text-[#8a1c1c] cursor-pointer" /></div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-y-5 gap-x-8">
                      <div className="flex flex-col"><label className="text-[10px] font-bold text-slate-400 uppercase mb-1">{t[lang].name}</label><div className="flex items-center border-b border-gray-300 focus-within:border-[#8a1c1c]"><input type="text" name="fullName" value={formData.fullName} onChange={handleChange} required className="w-full py-1.5 text-sm outline-none bg-transparent" /><button type="button" onClick={() => startVoice('fullName')} className="p-2 text-gray-400 text-sm">🎤</button></div></div>
                      <div className="flex flex-col"><label className="text-[10px] font-bold text-slate-400 uppercase mb-1">{t[lang].dob}</label><input type="date" name="dob" value={formData.dob} onChange={handleChange} required className="border-b border-gray-300 py-1.5 text-sm outline-none bg-transparent" /></div>
                      <div className="flex flex-col"><label className="text-[10px] font-bold text-slate-400 uppercase mb-1">{t[lang].mobile}</label><input type="tel" name="phoneNumber" value={formData.phoneNumber} onChange={handleChange} required maxLength="10" className="border-b border-gray-300 py-1.5 text-sm outline-none bg-transparent" /></div>
                      <div className="flex flex-col"><label className="text-[10px] font-bold text-slate-400 uppercase mb-1">{t[lang].pass}</label><input type="password" name="password" value={formData.password} onChange={handleChange} required className="border-b border-gray-300 py-1.5 text-sm outline-none bg-transparent" /></div>
                      <div className="flex flex-col"><label className="text-[10px] font-bold text-slate-400 uppercase mb-1">{t[lang].zone}</label><select name="zone" value={formData.zone} onChange={handleChange} required className="border-b border-gray-300 py-1.5 text-sm outline-none bg-transparent"><option value="">Select...</option>{CONSTITUENCIES.map(z => <option key={z} value={z}>{z}</option>)}</select></div>
                      <div className="flex flex-col"><label className="text-[10px] font-bold text-slate-400 uppercase mb-1">{t[lang].voter}</label><input type="text" name="voterId" value={formData.voterId} onChange={handleChange} required className="border-b border-gray-300 py-1.5 text-sm outline-none uppercase bg-transparent" /></div>
                      <div className="flex flex-col"><label className="text-[10px] font-bold text-slate-400 uppercase mb-1">{t[lang].ration}</label><input type="text" name="familyCard" value={formData.familyCard} onChange={handleChange} required className="border-b border-gray-300 py-1.5 text-sm outline-none uppercase bg-transparent" /></div>
                      <div className="flex flex-col"><label className="text-[10px] font-bold text-slate-400 uppercase mb-1">{t[lang].aadhaar}</label><input type="text" name="aadhaarNumber" value={formData.aadhaarNumber} onChange={handleChange} maxLength="12" className="border-b border-gray-300 py-1.5 text-sm outline-none bg-transparent" /></div>
                      <div className="flex flex-col"><label className="text-[11px] font-bold text-slate-400 uppercase mb-1">{t[lang].pan}</label><input type="text" name="panNumber" value={formData.panNumber} onChange={handleChange} maxLength="10" className="border-b border-gray-300 py-1.5 text-sm outline-none uppercase bg-transparent" /></div>
                      <div className="flex flex-col"><label className="text-[11px] font-bold text-slate-400 uppercase mb-1">{t[lang].ref}</label><input type="text" name="referralId" value={formData.referralId} onChange={handleChange} className="border-b border-gray-300 py-1.5 text-sm outline-none uppercase bg-transparent" placeholder="TVK-..." /></div>
                    </div>
                    <div className="pt-4 flex justify-end"><button type="submit" disabled={isSubmitting} className="w-full md:w-auto bg-[#8a1c1c] text-white font-bold py-3.5 px-8 rounded-xl shadow-md text-sm">{isSubmitting ? '...' : t[lang].reqOtp}</button></div>
                  </form>
                )}
              </div>
            )}
          </div>
        )}

        {/* PORTAL TAB */}
        {activeTab === 'portal' && (
          <div className="max-w-4xl mx-auto animate-in fade-in">
            {!portalUser ? (
              <form onSubmit={handlePortalLogin} className="max-w-sm mx-auto bg-white p-8 rounded-[2rem] shadow-sm border space-y-5 mt-6">
                <div className="text-center"><h2 className="text-xl font-bold">{t[lang].loginTitle}</h2></div>
                <div><label className="text-[10px] font-bold text-slate-400 uppercase">Member ID</label><input type="text" name="memberId" value={portalLogin.memberId} onChange={handlePortalChange} required className="w-full border-b py-2 uppercase outline-none text-sm focus:border-[#8a1c1c]" placeholder="TVK-..." /></div>
                <div><label className="text-[10px] font-bold text-slate-400 uppercase">{t[lang].pass}</label><input type="password" name="password" value={portalLogin.password} onChange={handlePortalChange} required className="w-full border-b py-2 outline-none text-sm focus:border-[#8a1c1c]" /></div>
                <button type="submit" disabled={isSubmitting} className="w-full bg-[#8a1c1c] text-white font-bold py-3.5 rounded-xl text-sm mt-2">{isSubmitting ? '...' : 'Secure Login'}</button>
              </form>
            ) : (
              <div className="flex flex-col md:flex-row gap-6 mt-4">
                
                {/* Gamification Sidebar */}
                <div className="w-full md:w-72 space-y-4 flex-shrink-0">
                  <div className="bg-white p-5 rounded-3xl shadow-sm border text-center">
                    <img src={portalUser.profile_pic_url} className="w-20 h-20 mx-auto rounded-full object-cover border-4 border-gray-100 mb-3" alt="profile"/>
                    <h3 className="font-bold text-base">{portalUser.full_name}</h3>
                    <p className="text-[10px] text-slate-400 mb-3 uppercase">{portalUser.zone}</p>
                    <div className="bg-gradient-to-r from-amber-200 to-[#facc15] py-1.5 px-4 rounded-xl shadow-sm mb-3"><p className="text-[9px] font-bold uppercase text-amber-900">{t[lang].rankBadge}</p><p className="font-black text-sm text-amber-950">{portalData.badge}</p></div>
                    <div className="bg-slate-50 border rounded-xl p-2.5 mb-2">
                       <p className="text-[11px] font-bold text-slate-500">🏆 Local Rank: #{portalData.rank}</p>
                       {portalData.pointsNeeded > 0 ? <p className="text-[9px] text-slate-400 mt-1">Need {portalData.pointsNeeded} more referrals to rank up!</p> : <p className="text-[9px] text-emerald-600 font-bold mt-1">You are #1 in this Zone!</p>}
                    </div>
                    <div className="mt-3 flex justify-between px-2 border-t pt-3">
                      <div className="text-center"><p className="text-xl font-black">{portalData.referrals}</p><p className="text-[9px] uppercase font-bold text-slate-400">{t[lang].referrals}</p></div>
                      <div className="text-center"><p className="text-xl font-black">{portalUser.is_flagged?'⏳':'✅'}</p><p className="text-[9px] uppercase font-bold text-slate-400">{t[lang].status}</p></div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-3">
                    <button onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(`Join TVK! Use my referral: *${portalUser.member_id}*. Link: https://tvk-makkal-connect.vercel.app/?ref=${portalUser.member_id}`)}`, '_blank')} className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-2xl shadow-sm text-xs">{t[lang].share}</button>
                    <div className="flex gap-3">
                      <button onClick={() => {if(Notification.requestPermission) Notification.requestPermission(); alert("Subscribed!")}} className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 rounded-2xl shadow-sm text-xs">{t[lang].push}</button>
                      <button onClick={() => setPortalUser(null)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-slate-600 font-bold py-3 rounded-2xl text-xs">{t[lang].logout}</button>
                    </div>
                  </div>
                </div>

                {/* Main Dashboard Area */}
                <div className="flex-1 bg-white rounded-3xl shadow-sm border overflow-hidden min-h-[400px] flex flex-col">
                  <div className="flex border-b overflow-x-auto hide-scrollbar bg-gray-50">
                    <button onClick={()=>setPortalTab('id')} className={`px-5 py-3.5 font-bold text-xs whitespace-nowrap transition-colors ${portalTab==='id'?'border-b-2 border-[#8a1c1c] text-[#8a1c1c] bg-white':'text-slate-500'}`}>{t[lang].idCard}</button>
                    <button onClick={()=>setPortalTab('news')} className={`px-5 py-3.5 font-bold text-xs whitespace-nowrap transition-colors ${portalTab==='news'?'border-b-2 border-[#8a1c1c] text-[#8a1c1c] bg-white':'text-slate-500'}`}>{t[lang].news}</button>
                    <button onClick={()=>setPortalTab('grievance')} className={`px-5 py-3.5 font-bold text-xs whitespace-nowrap transition-colors ${portalTab==='grievance'?'border-b-2 border-[#8a1c1c] text-[#8a1c1c] bg-white':'text-slate-500'}`}>{t[lang].grievance}</button>
                    <button onClick={()=>setPortalTab('donate')} className={`px-5 py-3.5 font-bold text-xs whitespace-nowrap transition-colors ${portalTab==='donate'?'border-b-2 border-[#8a1c1c] text-[#8a1c1c] bg-white':'text-slate-500'}`}>{t[lang].donate}</button>
                  </div>
                  
                  <div className="p-5 md:p-8 flex-1">
                    
                    {portalTab === 'id' && (
                      <div className="bg-gradient-to-br from-[#8a1c1c] to-[#5a0c0c] p-6 rounded-3xl text-white shadow-xl relative border-2 border-[#facc15] max-w-xs mx-auto flex flex-col items-center text-center mt-4">
                         <div className="bg-white p-2 rounded-xl mb-4"><QRCodeCanvas value={`${APP_URL}${portalUser.member_id}`} size={80} /></div>
                         <h2 className="text-xl font-black">TVK CADRE</h2>
                         <p className="font-mono text-sm text-[#facc15] mb-2">{portalUser.member_id}</p>
                         <p className="font-bold text-base">{portalUser.full_name}</p>
                         <div className={`mt-4 px-3 py-1 rounded text-[9px] font-black uppercase tracking-widest border ${portalUser.is_flagged ? 'bg-amber-500/20 text-amber-300 border-amber-400/50' : 'bg-emerald-500/20 text-emerald-300 border-emerald-400/50'}`}>
                           {portalUser.is_flagged ? 'Pending Verification' : 'Verified Cleared'}
                         </div>
                      </div>
                    )}

                    {portalTab === 'news' && (
                      <div className="space-y-4">
                        <div className="p-4 border border-blue-100 bg-blue-50 rounded-2xl">
                          <h4 className="font-bold text-blue-900 mb-1 text-sm">📢 Next Assembly Meetup</h4>
                          <p className="text-xs text-blue-800 leading-relaxed">State conference scheduled for next week in Villupuram. All Mandram Leaders are expected to attend.</p>
                        </div>
                      </div>
                    )}

                    {portalTab === 'grievance' && (
                      <div className="space-y-6">
                        <form onSubmit={submitGrievance} className="space-y-3 bg-gray-50 p-5 rounded-2xl border">
                          <h3 className="font-bold text-sm">{t[lang].reportIssue}</h3>
                          <textarea rows="3" required value={grievance.description} onChange={e=>setGrievance({...grievance, description: e.target.value})} className="w-full border p-3 rounded-xl outline-none text-xs focus:border-[#8a1c1c]" placeholder={t[lang].desc}></textarea>
                          <div className="flex flex-col sm:flex-row gap-3">
                            <button type="button" onClick={() => { navigator.geolocation.getCurrentPosition(p => setGrievance({ ...grievance, lat: p.coords.latitude, lng: p.coords.longitude })) }} className="flex-1 text-[11px] font-bold text-blue-600 bg-blue-50 px-4 py-3 rounded-xl border border-blue-100">{t[lang].gps} {grievance.lat && '✅'}</button>
                            <button type="submit" className="flex-1 bg-[#8a1c1c] text-white font-bold text-[11px] py-3 rounded-xl">{t[lang].route}</button>
                          </div>
                        </form>

                        <div>
                          <h3 className="font-bold text-sm mb-3">{t[lang].myIssues}</h3>
                          {myGrievances.length === 0 ? <p className="text-xs text-gray-400">No issues reported yet.</p> : myGrievances.map(g => (
                            <div key={g.id} className="border p-4 rounded-2xl mb-3 shadow-sm">
                              <div className="flex justify-between items-start mb-2">
                                <span className="text-[9px] bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded uppercase">{g.department}</span>
                                <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase ${g.status==='Open'?'bg-red-100 text-red-800':'bg-green-100 text-green-800'}`}>{g.status}</span>
                              </div>
                              <p className="text-xs text-gray-700 leading-relaxed">{g.description}</p>
                              {g.reply && <div className="mt-3 bg-green-50 border border-green-100 p-2.5 rounded-xl"><p className="text-[9px] font-bold text-green-800 uppercase mb-1">HQ Response</p><p className="text-xs text-green-900">{g.reply}</p></div>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {portalTab === 'donate' && (
                      <div className="text-center space-y-4 py-8">
                         <div className="text-5xl mb-2">🇮🇳</div>
                         <h3 className="text-lg font-bold">{t[lang].support}</h3>
                         <p className="text-xs text-gray-500 max-w-xs mx-auto">Make a secure digital donation. Verified cadres automatically receive an 80G Tax Exemption PDF receipt.</p>
                         <button onClick={handleDonation} className="bg-blue-600 text-white font-bold py-3.5 px-10 rounded-xl shadow-lg hover:bg-blue-700 w-full max-w-xs text-sm">{t[lang].donateBtn}</button>
                      </div>
                    )}
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