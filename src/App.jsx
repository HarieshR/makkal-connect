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

const t = {
  en: { enroll: "Enroll", portal: "Member Portal", admin: "HQ Admin", photo: "Profile Photo", name: "Full Name", dob: "Date of Birth", mobile: "Mobile Number", pass: "Set Password", zone: "Zone", voter: "Voter ID", submit: "Verify & Register" },
  ta: { enroll: "பதிவு செய்", portal: "உறுப்பினர்", admin: "தலைமையகம்", photo: "புகைப்படம்", name: "முழு பெயர்", dob: "பிறந்த தேதி", mobile: "கைபேசி", pass: "கடவுச்சொல்", zone: "தொகுதி", voter: "வாக்காளர் எண்", submit: "சரிபார்த்து பதிவு செய்" }
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

  // Portal State
  const [portalLogin, setPortalLogin] = useState({ memberId: '', password: '' });
  const [portalUser, setPortalUser] = useState(null);
  const [portalData, setPortalData] = useState({ referrals: 0, rank: 0, pointsNeeded: 0, badge: 'Thozhar' });
  const [portalTab, setPortalTab] = useState('id'); // id, news, grievance, donate
  
  const [grievance, setGrievance] = useState({ description: '', lat: null, lng: null });
  const [myGrievances, setMyGrievances] = useState([]);

  // Auto-fill Referral ID
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const refCode = urlParams.get('ref');
    if (refCode) setFormData(prev => ({ ...prev, referralId: refCode }));
  }, []);

  // Offline Sync Listener
  useEffect(() => {
    const handleOnline = () => {
      const savedData = localStorage.getItem('offlineTVKData');
      if (savedData) setStatus({ type: 'success', message: 'Back online! Ready to sync offline registration.' });
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []);

  // Toast Auto-Hide
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
    if (file) { setImageFile(file); setImagePreview(URL.createObjectURL(file)); }
  };

  // Voice Assistant
  const startVoice = (field) => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return alert("Voice typing not supported in this browser.");
    const recognition = new SpeechRecognition();
    recognition.lang = lang === 'ta' ? 'ta-IN' : 'en-IN';
    recognition.start();
    recognition.onresult = (event) => setFormData(prev => ({ ...prev, [field]: event.results[0][0].transcript }));
  };

  // Pre-Submit OTP
  const requestOtp = async (e) => {
    e.preventDefault();
    if (!navigator.onLine) {
      localStorage.setItem('offlineTVKData', JSON.stringify(formData));
      return setStatus({ type: 'success', message: 'Offline Mode: Data saved. It will sync when internet returns.' });
    }
    if (!imageFile) return setStatus({ type: 'error', message: 'Profile photo is required.' });
    if (formData.phoneNumber.length !== 10) return setStatus({ type: 'error', message: 'Enter a valid 10-digit number.' });

    // Fuzzy Deduplication
    setIsSubmitting(true);
    setStatus({ type: 'loading', message: 'Checking database for duplicates...' });
    const { data: duplicates } = await supabase.from('citizens').select('full_name').eq('dob', formData.dob);
    if (duplicates?.some(d => d.full_name.toLowerCase().includes(formData.fullName.toLowerCase().split(' ')[0]))) {
      const proceed = window.confirm("⚠️ AI Warning: A member with a similar name and the exact same Date of Birth is already registered. Proceed anyway?");
      if (!proceed) { setIsSubmitting(false); return setStatus({ type: '', message: '' }); }
    }

    setStatus({ type: 'loading', message: 'Sending OTP to +91 ' + formData.phoneNumber });
    setTimeout(() => { setIsSubmitting(false); setShowOtp(true); setStatus({ type: 'success', message: 'Test OTP is 1234' }); }, 1500);
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

      let badge = "Thozhar"; if (myRefs >= 10) badge = "Makkal Thondan"; if (myRefs >= 50) badge = "Mandram Leader";
      
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

    const { data } = await supabase.from('grievances').insert([{ 
      member_id: portalUser.member_id, zone: portalUser.zone, department: dept, category: dept, description: grievance.description, lat: grievance.lat, lng: grievance.lng 
    }]).select();
    
    alert(`Grievance Auto-Routed to ${dept} Successfully.`);
    setGrievance({ description: '', lat: null, lng: null });
    if(data) setMyGrievances([data[0], ...myGrievances]);
  };

  const fetchMyGrievances = async (m_id) => {
    const { data } = await supabase.from('grievances').select('*').eq('member_id', m_id).order('created_at', { ascending: false });
    setMyGrievances(data || []);
  };

  const handleDonation = () => {
    alert("Razorpay UI Triggered. Payment Successful!");
    const doc = new jsPDF();
    doc.setFontSize(22); doc.setTextColor("#8a1c1c"); doc.text("TAMIZHAGA VETTRI KAZHAGAM", 20, 20);
    doc.setFontSize(12); doc.setTextColor("#000000");
    doc.text("Official 80G Tax Exemption Receipt", 20, 30);
    doc.text(`Receipt No: TVK-DON-${Date.now()}`, 20, 45);
    doc.text(`Donor Name: ${portalUser.full_name}`, 20, 55);
    doc.text(`Member ID: ${portalUser.member_id}`, 20, 65);
    doc.text(`PAN Number: ${portalUser.pan_number || 'Not Provided (80G invalid without PAN)'}`, 20, 75);
    doc.text(`Amount Received: INR 1,000.00`, 20, 85);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 20, 95);
    doc.text("Thank you for your contribution to the movement.", 20, 115);
    doc.save(`TVK_Receipt_${portalUser.member_id}.pdf`);
  };

  const APP_URL = "https://tvk-makkal-connect.vercel.app/verify/";

  return (
    <div className="min-h-screen flex flex-col font-sans text-slate-800 bg-[#f8fafc]">
      {status.message && !status.data && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top-5">
          <div className={`px-6 py-4 rounded-full shadow-2xl border text-white font-bold text-sm ${status.type==='error'?'bg-red-500':status.type==='loading'?'bg-amber-500':'bg-emerald-500'}`}>
            {status.message}
          </div>
        </div>
      )}

      <nav className="sticky top-0 z-40 bg-gradient-to-r from-[#5a0c0c] via-[#8a1c1c] to-[#5a0c0c] shadow-lg border-b border-[#a32a2a]">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-full border-2 border-[#facc15] flex items-center justify-center"><span className="text-[#facc15]">🐘</span></div><h1 className="text-xl font-bold text-[#facc15]">TVK Connect</h1></div>
          <div className="flex bg-[#3e0808] p-1 rounded-full border border-[#7a1313] gap-1 overflow-x-auto">
            <button onClick={() => setActiveTab('registration')} className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap ${activeTab === 'registration' ? 'bg-[#facc15] text-[#5a0c0c]' : 'text-[#facc15]'}`}>{t[lang].enroll}</button>
            <button onClick={() => setActiveTab('portal')} className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap ${activeTab === 'portal' ? 'bg-[#facc15] text-[#5a0c0c]' : 'text-[#facc15]'}`}>{t[lang].portal}</button>
            <button onClick={() => setActiveTab('admin')} className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap ${activeTab === 'admin' ? 'bg-[#facc15] text-[#5a0c0c]' : 'text-[#facc15]'}`}>{t[lang].admin}</button>
          </div>
          <button onClick={() => setLang(lang === 'en' ? 'ta' : 'en')} className="text-white text-xs font-bold bg-white/10 px-3 py-1 rounded-full border border-white/20 whitespace-nowrap">{lang === 'en' ? 'தமிழ்' : 'English'}</button>
        </div>
      </nav>

      <main className="flex-grow max-w-5xl mx-auto px-4 mt-8 mb-20 w-full">
        {activeTab === 'admin' && <Admin />}

        {activeTab === 'registration' && (
          <div className="max-w-4xl mx-auto animate-in fade-in">
            {status.data ? (
              <div className="flex flex-col items-center mt-10">
                <div className="bg-gradient-to-br from-[#8a1c1c] to-[#5a0c0c] p-8 rounded-[2rem] text-white shadow-2xl w-full max-w-md border-4 border-[#facc15]">
                  <div className="flex justify-between items-start border-b border-white/20 pb-4 mb-4">
                    <div><h3 className="text-xs text-[#facc15] tracking-widest">Digital ID Card</h3><h2 className="text-2xl font-black mt-1">TVK CADRE</h2><p className="font-mono text-sm mt-2 bg-black/30 px-3 py-1 rounded inline-block">{status.data.member_id}</p></div>
                    <div className="bg-white p-2 rounded-xl"><QRCodeCanvas value={`${APP_URL}${status.data.member_id}`} size={64} /></div>
                  </div>
                  <div className="flex items-center gap-4 border-b border-white/20 pb-4 mb-4"><img src={status.data.profile_pic_url} className="w-16 h-16 rounded-xl border-2 border-white object-cover" alt="ID" /><div><p className="text-[10px] text-red-200 uppercase">{t[lang].name}</p><p className="font-bold text-lg">{status.data.full_name}</p></div></div>
                </div>
                <button onClick={() => window.print()} className="mt-6 bg-white border font-bold py-3 px-8 rounded-full shadow-md">Print / Save ID Card</button>
              </div>
            ) : (
              <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden p-8 md:p-12">
                <h2 className="text-2xl font-bold text-slate-800">Citizen Enrollment</h2><hr className="my-6 border-gray-100" />
                
                {showOtp ? (
                  <form onSubmit={submitRegistration} className="space-y-6 max-w-sm mx-auto text-center">
                    <h3 className="font-bold text-xl">Enter Security OTP</h3>
                    <p className="text-sm text-gray-500">Sent to +91 {formData.phoneNumber}</p>
                    <input type="text" value={otpInput} onChange={e=>setOtpInput(e.target.value)} maxLength="4" className="w-full border p-4 text-center text-2xl font-mono tracking-[1em] rounded-xl outline-none focus:border-[#8a1c1c]" placeholder="••••" required />
                    <button type="submit" disabled={isSubmitting} className="w-full bg-[#8a1c1c] text-white font-bold py-3 rounded-xl shadow-md">{isSubmitting ? 'Verifying...' : 'Verify & Register'}</button>
                    <button type="button" onClick={() => setShowOtp(false)} className="text-xs text-gray-400 font-bold hover:text-red-600 transition-colors">Cancel</button>
                  </form>
                ) : (
                  <form onSubmit={requestOtp} className="space-y-6">
                    <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                      {imagePreview ? <img src={imagePreview} className="w-20 h-20 rounded-2xl object-cover border-4 border-gray-100 shadow-sm" alt="Preview" /> : <div className="w-20 h-20 rounded-2xl bg-gray-50 border-2 border-dashed border-gray-300 flex items-center justify-center text-3xl shadow-sm text-gray-400">📸</div>}
                      <div><label className="text-xs font-bold text-slate-400 block mb-2">{t[lang].photo} *</label><input type="file" accept="image/*" onChange={handleImageChange} required className="text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-red-50 file:text-[#8a1c1c] cursor-pointer" /></div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="flex flex-col"><label className="text-[11px] font-bold text-slate-400 uppercase mb-1">{t[lang].name} *</label><div className="flex items-center border-b border-gray-300 focus-within:border-[#8a1c1c]"><input type="text" name="fullName" value={formData.fullName} onChange={handleChange} required className="w-full py-2 outline-none" /><button type="button" onClick={() => startVoice('fullName')} className="p-2 text-gray-400" title="Voice Type">🎤</button></div></div>
                      <div className="flex flex-col"><label className="text-[11px] font-bold text-slate-400 uppercase mb-1">{t[lang].dob} *</label><input type="date" name="dob" value={formData.dob} onChange={handleChange} required className="border-b border-gray-300 py-2 outline-none" /></div>
                      <div className="flex flex-col"><label className="text-[11px] font-bold text-slate-400 uppercase mb-1">{t[lang].mobile} *</label><input type="tel" name="phoneNumber" value={formData.phoneNumber} onChange={handleChange} required maxLength="10" className="border-b border-gray-300 py-2 outline-none" /></div>
                      <div className="flex flex-col"><label className="text-[11px] font-bold text-slate-400 uppercase mb-1">{t[lang].pass} *</label><input type="password" name="password" value={formData.password} onChange={handleChange} required className="border-b border-gray-300 py-2 outline-none" /></div>
                      <div className="flex flex-col"><label className="text-[11px] font-bold text-slate-400 uppercase mb-1">{t[lang].zone} *</label><select name="zone" value={formData.zone} onChange={handleChange} required className="border-b border-gray-300 py-2 outline-none"><option value="">Select...</option>{CONSTITUENCIES.map(z => <option key={z} value={z}>{z}</option>)}</select></div>
                      <div className="flex flex-col"><label className="text-[11px] font-bold text-slate-400 uppercase mb-1">{t[lang].voter} *</label><input type="text" name="voterId" value={formData.voterId} onChange={handleChange} required className="border-b border-gray-300 py-2 outline-none uppercase" /></div>
                      <div className="flex flex-col"><label className="text-[11px] font-bold text-slate-400 uppercase mb-1">Ration Card *</label><input type="text" name="familyCard" value={formData.familyCard} onChange={handleChange} required className="border-b border-gray-300 py-2 outline-none uppercase" /></div>
                      <div className="flex flex-col"><label className="text-[11px] font-bold text-slate-400 uppercase mb-1">Referral ID</label><input type="text" name="referralId" value={formData.referralId} onChange={handleChange} className="border-b border-gray-300 py-2 outline-none uppercase" /></div>
                    </div>
                    <div className="pt-6 flex justify-end"><button type="submit" disabled={isSubmitting} className="bg-[#8a1c1c] text-white font-bold py-3 px-8 rounded-xl shadow-md disabled:opacity-50">{isSubmitting ? 'Processing...' : 'Send OTP Verification'}</button></div>
                  </form>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'portal' && (
          <div className="max-w-4xl mx-auto animate-in fade-in">
            {!portalUser ? (
              <form onSubmit={handlePortalLogin} className="max-w-sm mx-auto bg-white p-8 rounded-[2rem] shadow-sm border space-y-6 mt-10">
                <div className="text-center"><h2 className="text-2xl font-bold">Member Login</h2></div>
                <div><label className="text-xs font-bold text-slate-400">Member ID</label><input type="text" name="memberId" value={portalLogin.memberId} onChange={handlePortalChange} required className="w-full border-b py-2 uppercase outline-none focus:border-[#8a1c1c]" /></div>
                <div><label className="text-xs font-bold text-slate-400">Password</label><input type="password" name="password" value={portalLogin.password} onChange={handlePortalChange} required className="w-full border-b py-2 outline-none focus:border-[#8a1c1c]" /></div>
                <button type="submit" disabled={isSubmitting} className="w-full bg-[#8a1c1c] text-white font-bold py-3 rounded-xl">{isSubmitting ? 'Verifying...' : 'Login'}</button>
              </form>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                <div className="col-span-1 space-y-4">
                  <div className="bg-white p-6 rounded-3xl shadow-sm border text-center">
                    <img src={portalUser.profile_pic_url} className="w-24 h-24 mx-auto rounded-full object-cover border-4 border-gray-100 mb-4" alt="profile"/>
                    <h3 className="font-bold text-lg">{portalUser.full_name}</h3>
                    <p className="text-xs text-slate-400 mb-2">Zone: {portalUser.zone}</p>
                    <div className="bg-gradient-to-r from-amber-200 to-[#facc15] py-2 px-4 rounded-xl shadow-sm mb-4"><p className="text-[10px] font-bold uppercase text-amber-900">Rank Badge</p><p className="font-black text-amber-950">{portalData.badge}</p></div>
                    <div className="bg-slate-50 border rounded-xl p-3 mb-2">
                       <p className="text-xs font-bold text-slate-500">🏆 Local Rank: #{portalData.rank}</p>
                       {portalData.pointsNeeded > 0 ? <p className="text-[10px] text-slate-400 mt-1">Need {portalData.pointsNeeded} more referrals to rank up!</p> : <p className="text-[10px] text-emerald-600 font-bold mt-1">You are #1 in this Zone!</p>}
                    </div>
                  </div>
                  <button onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(`Join TVK! Use my referral: *${portalUser.member_id}*. Link: https://tvk-makkal-connect.vercel.app/?ref=${portalUser.member_id}`)}`, '_blank')} className="w-full bg-green-500 text-white font-bold py-3 rounded-xl shadow-md">📱 Share Invite Link</button>
                  <button onClick={() => {if(Notification.requestPermission) Notification.requestPermission(); alert("Web Push Subscribed!")}} className="w-full bg-blue-500 text-white font-bold py-3 rounded-xl shadow-md">🔔 Enable Push Alerts</button>
                  <button onClick={() => setPortalUser(null)} className="w-full bg-gray-100 text-slate-600 font-bold py-3 rounded-xl">Sign Out</button>
                </div>

                <div className="col-span-1 md:col-span-2">
                  <div className="bg-white rounded-3xl shadow-sm border overflow-hidden min-h-[400px]">
                    <div className="flex border-b overflow-x-auto">
                      <button onClick={()=>setPortalTab('id')} className={`px-5 py-4 font-bold text-sm whitespace-nowrap ${portalTab==='id'?'border-b-2 border-[#8a1c1c] text-[#8a1c1c]':'text-slate-400'}`}>ID Card</button>
                      <button onClick={()=>setPortalTab('news')} className={`px-5 py-4 font-bold text-sm whitespace-nowrap ${portalTab==='news'?'border-b-2 border-[#8a1c1c] text-[#8a1c1c]':'text-slate-400'}`}>Newsfeed</button>
                      <button onClick={()=>setPortalTab('grievance')} className={`px-5 py-4 font-bold text-sm whitespace-nowrap ${portalTab==='grievance'?'border-b-2 border-[#8a1c1c] text-[#8a1c1c]':'text-slate-400'}`}>Grievances</button>
                      <button onClick={()=>setPortalTab('donate')} className={`px-5 py-4 font-bold text-sm whitespace-nowrap ${portalTab==='donate'?'border-b-2 border-[#8a1c1c] text-[#8a1c1c]':'text-slate-400'}`}>Donate</button>
                    </div>
                    
                    <div className="p-8">
                      {portalTab === 'id' && (
                        <div className="bg-gradient-to-br from-[#8a1c1c] to-[#5a0c0c] p-6 rounded-2xl text-white shadow-xl relative border-2 border-[#facc15] max-w-sm mx-auto flex flex-col items-center text-center">
                           <div className="bg-white p-2 rounded-xl mb-4"><QRCodeCanvas value={`${APP_URL}${portalUser.member_id}`} size={90} /></div>
                           <h2 className="text-2xl font-black">TVK CADRE</h2>
                           <p className="font-mono text-sm text-[#facc15] mb-2">{portalUser.member_id}</p>
                           <p className="font-bold text-lg">{portalUser.full_name}</p>
                           <div className={`mt-4 px-3 py-1 rounded text-[10px] font-black uppercase tracking-widest border ${portalUser.is_flagged ? 'bg-amber-500/20 text-amber-300 border-amber-400/50' : 'bg-emerald-500/20 text-emerald-300 border-emerald-400/50'}`}>
                             {portalUser.is_flagged ? 'Pending Verification' : 'Verified Cleared'}
                           </div>
                        </div>
                      )}

                      {portalTab === 'news' && (
                        <div className="space-y-4">
                          <div className="p-4 border border-blue-100 bg-blue-50 rounded-xl">
                            <h4 className="font-bold text-blue-900 mb-1">📢 Next Assembly Meetup</h4>
                            <p className="text-sm text-blue-800">State conference scheduled for next week in Villupuram. All Mandram Leaders are expected to attend.</p>
                          </div>
                        </div>
                      )}

                      {portalTab === 'grievance' && (
                        <div className="space-y-8">
                          <form onSubmit={submitGrievance} className="space-y-4 bg-gray-50 p-6 rounded-2xl border">
                            <h3 className="font-bold">Report AI-Assisted Issue</h3>
                            <textarea rows="3" required value={grievance.description} onChange={e=>setGrievance({...grievance, description: e.target.value})} className="w-full border p-3 rounded-xl outline-none" placeholder="Describe your issue..."></textarea>
                            <button type="button" onClick={() => { navigator.geolocation.getCurrentPosition(p => setGrievance({ ...grievance, lat: p.coords.latitude, lng: p.coords.longitude })) }} className="text-xs font-bold text-blue-600 bg-blue-50 px-4 py-2 rounded-lg border border-blue-100">📍 Attach GPS {grievance.lat && '✅'}</button>
                            <button type="submit" className="w-full bg-[#8a1c1c] text-white font-bold py-3 rounded-xl">Auto-Route to Department</button>
                          </form>
                          <div>
                            <h3 className="font-bold mb-4">My Submitted Issues</h3>
                            {myGrievances.map(g => (
                              <div key={g.id} className="border p-4 rounded-xl mb-3 shadow-sm">
                                <div className="flex justify-between items-start mb-2">
                                  <span className="text-[10px] bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded">{g.department}</span>
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${g.status==='Open'?'bg-red-100 text-red-800':'bg-green-100 text-green-800'}`}>{g.status}</span>
                                </div>
                                <p className="text-sm">{g.description}</p>
                                {g.reply && <div className="mt-3 bg-green-50 border border-green-100 p-3 rounded-lg"><p className="text-[10px] font-bold text-green-800 uppercase mb-1">HQ Response</p><p className="text-sm text-green-900">{g.reply}</p></div>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {portalTab === 'donate' && (
                        <div className="text-center space-y-6">
                           <div className="text-5xl">🇮🇳</div><h3 className="text-xl font-bold">Support the Movement</h3>
                           <button onClick={handleDonation} className="bg-blue-600 text-white font-bold py-4 px-12 rounded-xl shadow-lg hover:bg-blue-700 w-full max-w-sm">Donate ₹1,000</button>
                        </div>
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