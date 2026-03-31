/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Wallet, 
  ChevronLeft, 
  ArrowRight, 
  Crown, 
  CheckCircle, 
  Bell, 
  Lock, 
  LogOut, 
  Image as ImageIcon,
  User,
  History,
  Users,
  ShieldCheck,
  TrendingUp,
  Shield
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from "@google/genai";

// Types
type UserType = 'user' | 'admin';
type UserStatus = 'free' | 'premium';
type PaymentStatus = 'pending' | 'approved';

interface AppUser {
  name: string;
  user: string;
  pass: string;
  type: UserType;
  status: UserStatus;
}

interface Payment {
  userId: string;
  userName: string;
  status: PaymentStatus;
  img: string;
  date: string;
}

interface LoginLog {
  user: string;
  name: string;
  time: string;
}

type Screen = 
  | 'auth' 
  | 'register' 
  | 'login' 
  | 'user-dashboard-free' 
  | 'user-dashboard-premium' 
  | 'payment' 
  | 'admin-dashboard' 
  | 'prem-tax' 
  | 'prem-invest' 
  | 'prem-insure'
  | 'prem-ai';

export default function App() {
  // State
  const [users, setUsers] = useState<AppUser[]>(() => JSON.parse(localStorage.getItem('app_users') || '[]'));
  const [payments, setPayments] = useState<Payment[]>(() => JSON.parse(localStorage.getItem('app_payments') || '[]'));
  const [loginHistory, setLoginHistory] = useState<LoginLog[]>(() => JSON.parse(localStorage.getItem('app_history') || '[]'));
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [currentScreen, setCurrentScreen] = useState<Screen>('auth');
  
  // UI State
  const [monthlyIncome, setMonthlyIncome] = useState<string>('');
  const [taxResult, setTaxResult] = useState<{ annual: number; tax: number } | null>(null);
  const [riskLevel, setRiskLevel] = useState<'ต่ำ' | 'กลาง' | 'สูง' | null>(null);
  const [modalImg, setModalImg] = useState<string | null>(null);
  const [aiVerifying, setAiVerifying] = useState<string | null>(null);
  const [aiChat, setAiChat] = useState<{ role: 'user' | 'ai'; text: string }[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiInput, setAiInput] = useState('');

  // AI Assistant Logic
  const askAIAssistant = async () => {
    if (!aiInput.trim()) return;
    if (!process.env.GEMINI_API_KEY) {
      alert('กรุณาตั้งค่า GEMINI_API_KEY ในระบบ');
      return;
    }

    const userMsg = aiInput;
    setAiChat(prev => [...prev, { role: 'user', text: userMsg }]);
    setAiInput('');
    setAiLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const model = ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          {
            role: 'user',
            parts: [{ text: `You are a professional Thai tax advisor. User income: ${monthlyIncome} THB/month. Risk level: ${riskLevel || 'Not set'}. Question: ${userMsg}` }]
          }
        ],
        config: {
          systemInstruction: "You are a friendly and professional Thai tax and financial advisor named 'Smart Tax AI'. Provide concise, accurate, and helpful advice in Thai."
        }
      });

      const response = await model;
      setAiChat(prev => [...prev, { role: 'ai', text: response.text || 'ขออภัย ฉันไม่สามารถตอบได้ในขณะนี้' }]);
    } catch (error) {
      console.error('AI Assistant Error:', error);
      setAiChat(prev => [...prev, { role: 'ai', text: 'ขออภัย เกิดข้อผิดพลาดในการเชื่อมต่อกับ AI' }]);
    } finally {
      setAiLoading(false);
    }
  };

  // AI Verification Logic
  const verifySlipWithAI = async (payment: Payment) => {
    if (!process.env.GEMINI_API_KEY) {
      alert('กรุณาตั้งค่า GEMINI_API_KEY ในระบบ');
      return;
    }
    
    setAiVerifying(payment.userId);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const model = ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          {
            parts: [
              { text: "Analyze this bank transfer slip. Is it a valid Thai bank transfer slip? Check for: 1. Bank name (KBank, SCB, etc.) 2. Amount (should be around 159 THB) 3. Date/Time. Reply with 'VALID' or 'INVALID' followed by a brief reason in Thai." },
              {
                inlineData: {
                  mimeType: "image/png",
                  data: payment.img.split(',')[1]
                }
              }
            ]
          }
        ]
      });
      
      const response = await model;
      const result = response.text;
      alert(`ผลการตรวจสอบ AI:\n${result}`);
    } catch (error) {
      console.error('AI Verification Error:', error);
      alert('เกิดข้อผิดพลาดในการตรวจสอบด้วย AI');
    } finally {
      setAiVerifying(null);
    }
  };

  // Form States
  const [regForm, setRegForm] = useState({ name: '', user: '', pass: '', confirm: '' });
  const [loginForm, setLoginForm] = useState({ user: '', pass: '' });

  // Persistence
  useEffect(() => {
    localStorage.setItem('app_users', JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem('app_payments', JSON.stringify(payments));
  }, [payments]);

  useEffect(() => {
    localStorage.setItem('app_history', JSON.stringify(loginHistory));
  }, [loginHistory]);

  // Tax Logic
  const calculateThaiTax = (income: number) => {
    const expense = Math.min(income * 0.5, 100000);
    let net = income - expense - 60000;
    if (net <= 150000) return 0;
    let tax = 0;
    if (net > 5000000) { tax += (net - 5000000) * 0.35; net = 5000000; }
    if (net > 2000000) { tax += (net - 2000000) * 0.30; net = 2000000; }
    if (net > 1000000) { tax += (net - 1000000) * 0.25; net = 1000000; }
    if (net > 750000) { tax += (net - 750000) * 0.20; net = 750000; }
    if (net > 500000) { tax += (net - 500000) * 0.15; net = 500000; }
    if (net > 300000) { tax += (net - 300000) * 0.10; net = 300000; }
    if (net > 150000) { tax += (net - 150000) * 0.05; }
    return tax;
  };

  const handleCalculateTax = () => {
    const m = parseFloat(monthlyIncome);
    if (isNaN(m) || m < 0) return;
    const annual = m * 12;
    setTaxResult({ annual, tax: calculateThaiTax(annual) });
  };

  // Auth Logic
  const handleRegister = () => {
    if (!regForm.name || !regForm.user || regForm.pass.length < 8) {
      alert('กรุณากรอกข้อมูลให้ครบถ้วนและรหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร');
      return;
    }
    if (regForm.pass !== regForm.confirm) {
      alert('รหัสผ่านไม่ตรงกัน');
      return;
    }
    const role: UserType = regForm.user.toLowerCase().endsWith('_admin') ? 'admin' : 'user';
    const newUser: AppUser = { 
      name: regForm.name, 
      user: regForm.user, 
      pass: regForm.pass, 
      type: role, 
      status: 'free' 
    };
    setUsers([...users, newUser]);
    alert('สมัครสมาชิกสำเร็จ!');
    setCurrentScreen('login');
    setRegForm({ name: '', user: '', pass: '', confirm: '' });
  };

  const handleLogin = () => {
    const found = users.find(x => x.user === loginForm.user && x.pass === loginForm.pass);
    if (found) {
      setCurrentUser(found);
      const log: LoginLog = { 
        user: found.user, 
        name: found.name, 
        time: new Date().toLocaleString('th-TH') 
      };
      setLoginHistory([log, ...loginHistory]);
      
      if (found.type === 'admin') {
        setCurrentScreen('admin-dashboard');
      } else {
        setCurrentScreen(found.status === 'premium' ? 'user-dashboard-premium' : 'user-dashboard-free');
      }
      setLoginForm({ user: '', pass: '' });
    } else {
      alert('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
    }
  };

  const logout = () => {
    setCurrentUser(null);
    setCurrentScreen('auth');
    setTaxResult(null);
    setMonthlyIncome('');
    setRiskLevel(null);
  };

  // Payment Logic
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      const newPayment: Payment = {
        userId: currentUser!.user,
        userName: currentUser!.name,
        status: 'pending',
        img: base64,
        date: new Date().toLocaleString('th-TH')
      };
      setPayments([...payments, newPayment]);
      alert('ส่งหลักฐานการชำระเงินแล้ว กรุณารอการตรวจสอบจากแอดมิน');
      setCurrentScreen('user-dashboard-free');
    };
    reader.readAsDataURL(file);
  };

  const approvePayment = (userId: string) => {
    const updatedPayments = payments.map(p => 
      (p.userId === userId && p.status === 'pending') ? { ...p, status: 'approved' as PaymentStatus } : p
    );
    const updatedUsers = users.map(u => 
      u.user === userId ? { ...u, status: 'premium' as UserStatus } : u
    );
    setPayments(updatedPayments);
    setUsers(updatedUsers);
    alert('อนุมัติสมาชิกพรีเมียมแล้ว');
  };

  // Render Helpers
  const renderInvestmentPlan = () => {
    if (!riskLevel) return null;
    const m = parseFloat(monthlyIncome);
    const annual = isNaN(m) ? 0 : m * 12;
    
    let content = null;
    let investAmount = 0;
    
    if (riskLevel === 'ต่ำ') {
      investAmount = annual * 0.15; // Suggest 15% for low risk
      content = (
        <>
          <p className="flex justify-between"><span>💰 เงินฝากออมทรัพย์ (70%):</span> <span className="font-bold">฿{(investAmount * 0.7).toLocaleString()}</span></p>
          <p className="flex justify-between"><span>🏦 พันธบัตรรัฐบาล (20%):</span> <span className="font-bold">฿{(investAmount * 0.2).toLocaleString()}</span></p>
          <p className="flex justify-between"><span>📈 กองทุนรวมตลาดเงิน (10%):</span> <span className="font-bold">฿{(investAmount * 0.1).toLocaleString()}</span></p>
        </>
      );
    }
    if (riskLevel === 'กลาง') {
      investAmount = annual * 0.25; // Suggest 25% for medium risk
      content = (
        <>
          <p className="flex justify-between"><span>📈 กองทุนรวมผสม (50%):</span> <span className="font-bold">฿{(investAmount * 0.5).toLocaleString()}</span></p>
          <p className="flex justify-between"><span>🏙️ กองทุนอสังหาฯ (20%):</span> <span className="font-bold">฿{(investAmount * 0.2).toLocaleString()}</span></p>
          <p className="flex justify-between"><span>💰 พันธบัตร/เงินฝาก (30%):</span> <span className="font-bold">฿{(investAmount * 0.3).toLocaleString()}</span></p>
        </>
      );
    }
    if (riskLevel === 'สูง') {
      investAmount = annual * 0.40; // Suggest 40% for high risk
      content = (
        <>
          <p className="flex justify-between"><span>🚀 กองทุนรวมหุ้นต่างประเทศ (60%):</span> <span className="font-bold">฿{(investAmount * 0.6).toLocaleString()}</span></p>
          <p className="flex justify-between"><span>💎 สินทรัพย์ดิจิทัล (20%):</span> <span className="font-bold">฿{(investAmount * 0.2).toLocaleString()}</span></p>
          <p className="flex justify-between"><span>📈 หุ้นไทย (Dividend) (20%):</span> <span className="font-bold">฿{(investAmount * 0.2).toLocaleString()}</span></p>
        </>
      );
    }
    
    return (
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-amber-50/30 p-6 rounded-2xl border-2 border-dashed border-amber-200 text-left space-y-3 mt-6 shadow-inner"
      >
        <div className="text-center mb-4 pb-4 border-b border-amber-200/50">
          <p className="text-[10px] font-bold uppercase tracking-widest text-amber-600 mb-1">งบประมาณการลงทุนที่แนะนำต่อปี</p>
          <p className="text-3xl font-black text-amber-700">฿{investAmount.toLocaleString()}</p>
          <p className="text-[10px] opacity-60 italic mt-1">* คำนวณจากรายได้และระดับความเสี่ยง {riskLevel}</p>
        </div>
        <div className="text-xs space-y-2 opacity-90 italic text-amber-900 leading-relaxed">
          {content}
        </div>
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen bg-stone-50 font-['IBM Plex Sans Thai'] text-slate-900 p-4 flex justify-center items-center">
      <div className="w-full max-w-md relative">
        
        <AnimatePresence mode="wait">
          {/* 1. Auth Screen */}
          {currentScreen === 'auth' && (
            <motion.div 
              key="auth"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              className="space-y-6 text-center"
            >
              <div className="mb-8">
                <div className="inline-flex p-6 rounded-full bg-white shadow-xl mb-6 text-sky-500 border-4 border-sky-100">
                  <Wallet size={48} strokeWidth={2.5} />
                </div>
                <h1 className="text-4xl font-bold text-sky-600 italic tracking-tight font-['Kanit']">Smart Tax</h1>
                <p className="text-slate-500 text-sm mt-2 font-medium">วางแผนภาษีระดับพรีเมียม</p>
              </div>
              <button 
                onClick={() => setCurrentScreen('register')}
                className="w-full bg-sky-500 text-white p-4 rounded-2xl font-bold shadow-lg hover:bg-sky-600 transition-all active:scale-95 shadow-sky-200"
              >
                สมัครใช้งาน
              </button>
              <button 
                onClick={() => setCurrentScreen('login')}
                className="w-full bg-white text-sky-600 p-4 rounded-2xl font-bold border-2 border-sky-100 hover:bg-sky-50 transition-all active:scale-95"
              >
                เข้าสู่ระบบ
              </button>
            </motion.div>
          )}

          {/* 2. Register Screen */}
          {currentScreen === 'register' && (
            <motion.div 
              key="register"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="space-y-4 bg-white p-8 rounded-3xl shadow-2xl"
            >
              <h2 className="text-2xl font-bold text-sky-600 italic text-center mb-4 font-['Kanit']">ข้อมูลผู้สมัคร</h2>
              <input 
                type="text" 
                placeholder="ชื่อ-นามสกุล" 
                className="w-full p-4 bg-sky-50 rounded-xl border border-sky-100 focus:outline-none focus:ring-2 focus:ring-sky-400"
                value={regForm.name}
                onChange={e => setRegForm({...regForm, name: e.target.value})}
              />
              <input 
                type="text" 
                placeholder="ชื่อยูสเซอร์ (แอดมินลงท้าย _Admin)" 
                className="w-full p-4 bg-sky-50 rounded-xl border border-sky-100 focus:outline-none focus:ring-2 focus:ring-sky-400"
                value={regForm.user}
                onChange={e => setRegForm({...regForm, user: e.target.value})}
              />
              <input 
                type="password" 
                placeholder="พาสเวิร์ด 8 ตัวขึ้นไป" 
                className="w-full p-4 bg-sky-50 rounded-xl border border-sky-100 focus:outline-none focus:ring-2 focus:ring-sky-400"
                value={regForm.pass}
                onChange={e => setRegForm({...regForm, pass: e.target.value})}
              />
              <input 
                type="password" 
                placeholder="ยืนยันพาสเวิร์ด" 
                className="w-full p-4 bg-sky-50 rounded-xl border border-sky-100 focus:outline-none focus:ring-2 focus:ring-sky-400"
                value={regForm.confirm}
                onChange={e => setRegForm({...regForm, confirm: e.target.value})}
              />
              <button 
                onClick={handleRegister}
                className="w-full bg-sky-600 text-white p-4 rounded-xl font-bold shadow-lg hover:bg-sky-700 transition-all active:scale-95"
              >
                ยืนยันสมัคร
              </button>
              <button 
                onClick={() => setCurrentScreen('auth')}
                className="w-full text-xs text-gray-400 italic hover:text-gray-600"
              >
                ย้อนกลับ
              </button>
            </motion.div>
          )}

          {/* 3. Login Screen */}
          {currentScreen === 'login' && (
            <motion.div 
              key="login"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="space-y-4 bg-white p-8 rounded-3xl shadow-2xl text-center"
            >
              <h2 className="text-2xl font-bold text-sky-600 italic mb-4 font-['Kanit']">ล็อกอินเข้าแอป</h2>
              <input 
                type="text" 
                placeholder="ชื่อยูสเซอร์" 
                className="w-full p-4 bg-sky-50 rounded-xl border border-sky-100 focus:outline-none focus:ring-2 focus:ring-sky-400"
                value={loginForm.user}
                onChange={e => setLoginForm({...loginForm, user: e.target.value})}
              />
              <input 
                type="password" 
                placeholder="พาสเวิร์ด" 
                className="w-full p-4 bg-sky-50 rounded-xl border border-sky-100 focus:outline-none focus:ring-2 focus:ring-sky-400"
                value={loginForm.pass}
                onChange={e => setLoginForm({...loginForm, pass: e.target.value})}
              />
              <button 
                onClick={handleLogin}
                className="w-full bg-sky-600 text-white p-4 rounded-xl font-bold shadow-lg hover:bg-sky-700 transition-all active:scale-95"
              >
                เข้าสู่ระบบ
              </button>
              <button 
                onClick={() => setCurrentScreen('auth')}
                className="w-full text-xs text-gray-400 italic hover:text-gray-600"
              >
                ย้อนกลับ
              </button>
            </motion.div>
          )}

          {/* 4. User Dashboard (FREE) */}
          {currentScreen === 'user-dashboard-free' && currentUser && (
            <motion.div 
              key="free-dash"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-md border-l-8 border-sky-500">
                <div>
                  <p className="text-[10px] text-sky-600 font-bold uppercase italic tracking-widest">Standard Account</p>
                  <h2 className="text-lg font-bold text-slate-800 font-['Kanit']">{currentUser.name}</h2>
                </div>
                <button 
                  onClick={logout}
                  className="text-red-600 text-xs font-bold px-3 py-1.5 bg-red-50 rounded-xl italic hover:bg-red-100 transition-colors border border-red-100"
                >
                  <LogOut size={14} className="inline mr-1" /> ออก
                </button>
              </div>

              <div className="bg-white p-8 rounded-3xl shadow-xl border border-sky-50 text-center">
                <label className="text-sm font-bold text-slate-500 mb-4 block italic">ระบุรายได้เฉลี่ยต่อเดือน (บาท):</label>
                <div className="relative mb-6">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sky-600 font-bold">฿</span>
                  <input 
                    type="number" 
                    placeholder="เช่น 30000" 
                    className="w-full p-5 pl-10 bg-sky-50/30 rounded-2xl border-2 border-sky-100 text-3xl font-bold text-sky-700 text-center focus:outline-none focus:ring-4 focus:ring-sky-200 transition-all"
                    value={monthlyIncome}
                    onChange={e => setMonthlyIncome(e.target.value)}
                  />
                </div>
                <button 
                  onClick={handleCalculateTax}
                  className="w-full bg-sky-500 text-white p-5 rounded-2xl font-bold italic shadow-lg shadow-sky-200 hover:bg-sky-600 transition-all active:scale-95 text-lg"
                >
                  คำนวณภาษีรายปี
                </button>
                
                {taxResult && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="mt-8 space-y-4"
                  >
                    <div className="bg-stone-50 p-5 rounded-2xl border border-sky-100 shadow-inner">
                      <p className="text-[10px] text-sky-800/60 font-bold uppercase italic tracking-widest">รายได้รวมทั้งปี</p>
                      <p className="text-3xl font-black text-sky-700">฿{taxResult.annual.toLocaleString()}</p>
                    </div>
                    <div className="bg-gradient-to-br from-sky-500 to-sky-700 p-6 rounded-2xl text-white shadow-2xl border-2 border-sky-400/30">
                      <p className="text-[10px] opacity-80 font-bold uppercase italic tracking-widest">ภาษีที่ต้องจ่ายเบื้องต้น</p>
                      <p className="text-5xl font-black text-yellow-300 drop-shadow-md">฿{taxResult.tax.toLocaleString()}</p>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Premium Promo Card */}
              <div className="relative bg-[#00A0E9] border-4 border-white rounded-[40px] shadow-2xl p-10 overflow-hidden text-white font-['IBM Plex Sans Thai']">
                <div className="absolute top-0 left-0 w-full h-3 bg-[#ED1C24]"></div>
                <div className="flex justify-between items-center mb-8">
                  <h3 className="text-4xl font-black italic tracking-tighter font-['Kanit']">PREMIUM</h3>
                  <div className="w-16 h-16 bg-[#FFD700] rounded-full border-4 border-slate-800 flex items-center justify-center shadow-2xl">
                    <Bell size={32} className="text-slate-800" />
                  </div>
                </div>
                <p className="text-yellow-300 font-bold text-2xl mb-8 italic">ยกระดับแผนการเงิน! เพียง ฿159</p>
                <div className="space-y-4 text-base font-medium text-white/90 italic">
                  <p className="flex items-center"><CheckCircle size={20} className="mr-3 text-yellow-300" /> วิเคราะห์ภาษีแบบละเอียดรายปี</p>
                  <p className="flex items-center"><CheckCircle size={20} className="mr-3 text-yellow-300" /> แผนลงทุนลดหย่อน (SSF, RMF)</p>
                  <p className="flex items-center"><CheckCircle size={20} className="mr-3 text-yellow-300" /> AI ตอบคำถามภาษี 24 ชม.</p>
                </div>
                <button 
                  onClick={() => setCurrentScreen('payment')}
                  className="mt-10 w-full bg-[#ED1C24] text-white py-5 rounded-2xl text-2xl font-black shadow-2xl italic hover:bg-[#c1121b] transition-all active:scale-95 border-b-4 border-white"
                >
                  สมัครพรีเมียมตอนนี้!
                </button>
              </div>
            </motion.div>
          )}

          {/* 5. Premium Dashboard */}
          {currentScreen === 'user-dashboard-premium' && currentUser && (
            <motion.div 
              key="prem-dash"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="bg-white p-8 rounded-[30px] border-b-8 border-amber-500 shadow-2xl text-center border border-amber-50">
                <p className="text-amber-600 font-bold tracking-widest italic uppercase flex items-center justify-center gap-2 text-xs mb-2">
                  <Crown size={18} className="text-amber-500" /> Premium Member
                </p>
                <h2 className="text-3xl font-black text-slate-800 mt-1 font-['Kanit']">{currentUser.name}</h2>
                <button onClick={logout} className="text-xs text-slate-400 mt-4 underline italic hover:text-amber-600 font-medium">ออกจากระบบ</button>
              </div>

              {/* Premium Salary Input Card (Prominently at the top) */}
              <div className="bg-gradient-to-br from-amber-50 to-white rounded-[30px] p-8 shadow-xl border-2 border-amber-100 text-center">
                <div className="inline-flex p-3 rounded-full bg-amber-100 text-amber-700 mb-4">
                  <Wallet size={24} />
                </div>
                <h3 className="text-xl font-bold text-amber-800 mb-4 font-['Kanit'] italic">ระบุรายได้เพื่อวิเคราะห์เชิงลึก</h3>
                <div className="relative mb-6">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-amber-600 font-bold">฿</span>
                  <input 
                    type="number" 
                    placeholder="รายได้ต่อเดือน" 
                    className="w-full p-5 pl-10 bg-white rounded-2xl border-2 border-amber-200 text-3xl font-black text-amber-700 text-center focus:outline-none focus:ring-4 focus:ring-amber-100 transition-all shadow-inner"
                    value={monthlyIncome}
                    onChange={e => setMonthlyIncome(e.target.value)}
                  />
                </div>
                <button 
                  onClick={handleCalculateTax}
                  className="w-full bg-amber-600 text-white p-5 rounded-2xl font-bold italic shadow-lg shadow-amber-200 hover:bg-amber-700 transition-all active:scale-95 text-lg border-b-4 border-amber-800"
                >
                  คำนวณและวิเคราะห์ทันที
                </button>

                {taxResult && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-6 grid grid-cols-2 gap-4"
                  >
                    <div className="bg-white p-4 rounded-2xl border border-amber-100 shadow-sm">
                      <p className="text-[10px] text-amber-600 font-bold uppercase italic tracking-widest mb-1">รายได้รวมต่อปี</p>
                      <p className="text-xl font-black text-slate-800">฿{taxResult.annual.toLocaleString()}</p>
                    </div>
                    <div className="bg-amber-600 p-4 rounded-2xl text-white shadow-md border-b-4 border-amber-800">
                      <p className="text-[10px] opacity-80 font-bold uppercase italic tracking-widest mb-1">ภาษีเบื้องต้น</p>
                      <p className="text-xl font-black text-yellow-300">฿{taxResult.tax.toLocaleString()}</p>
                    </div>
                  </motion.div>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 font-['IBM Plex Sans Thai']">
                <button 
                  onClick={() => setCurrentScreen('prem-tax')}
                  className="bg-gradient-to-r from-amber-600 to-amber-700 text-white p-6 rounded-[25px] shadow-xl font-bold italic flex justify-between items-center px-10 hover:from-amber-700 hover:to-amber-800 transition-all active:scale-95 border-b-4 border-amber-800"
                >
                  <span className="flex items-center gap-4 text-lg"><ShieldCheck size={24} /> 1. วิเคราะห์ภาษีเชิงลึก</span> 
                  <ArrowRight size={20} className="opacity-50" />
                </button>
                <button 
                  onClick={() => setCurrentScreen('prem-invest')}
                  className="bg-white p-6 rounded-[25px] border-2 border-amber-100 text-amber-700 font-bold italic shadow-lg flex justify-between items-center px-10 hover:bg-amber-50 transition-all active:scale-95"
                >
                  <span className="flex items-center gap-4 text-lg"><TrendingUp size={24} /> 2. แผนลงทุนเฉพาะคุณ</span> 
                  <ArrowRight size={20} className="opacity-30" />
                </button>
                <button 
                  onClick={() => setCurrentScreen('prem-insure')}
                  className="bg-white p-6 rounded-[25px] border-2 border-amber-100 text-amber-700 font-bold italic shadow-lg flex justify-between items-center px-10 hover:bg-amber-50 transition-all active:scale-95"
                >
                  <span className="flex items-center gap-4 text-lg"><Shield size={24} /> 3. ประกันลดหย่อนภาษี</span> 
                  <ArrowRight size={20} className="opacity-30" />
                </button>
                <button 
                  onClick={() => setCurrentScreen('prem-ai')}
                  className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white p-6 rounded-[25px] shadow-xl font-bold italic flex justify-between items-center px-10 hover:from-indigo-700 hover:to-indigo-800 transition-all active:scale-95 border-b-4 border-indigo-800"
                >
                  <span className="flex items-center gap-4 text-lg"><Lock size={24} /> 4. AI ผู้ช่วยส่วนตัว (Beta)</span> 
                  <ArrowRight size={20} className="opacity-50" />
                </button>
              </div>
            </motion.div>
          )}

          {/* Premium Sub Screens */}
          {currentScreen === 'prem-tax' && (
            <motion.div key="prem-tax" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
              <button onClick={() => setCurrentScreen('user-dashboard-premium')} className="text-amber-700 font-bold italic text-sm flex items-center gap-1">
                <ChevronLeft size={16} /> ย้อนกลับ
              </button>

              <div className="bg-white rounded-[30px] p-8 shadow-2xl border border-amber-50">
                <h3 className="text-2xl font-black text-amber-700 mb-6 italic border-b-2 border-amber-100 pb-3 font-['Kanit']">ควรลดหย่อนอะไรบ้าง?</h3>
                <div className="space-y-6 text-sm italic">
                  <div className="bg-amber-50/50 p-5 rounded-2xl border border-amber-100">
                    <p className="font-bold text-amber-800 underline mb-3">ค่าลดหย่อนพื้นฐาน</p>
                    <p className="flex justify-between"><span>• ส่วนตัว:</span> <span className="font-bold text-amber-700">60,000.-</span></p>
                    <p className="flex justify-between"><span>• ประกันสังคม:</span> <span className="font-bold text-amber-700">สูงสุด 9,000.-</span></p>
                  </div>
                  <div className="bg-emerald-50/50 p-5 rounded-2xl border border-emerald-100">
                    <p className="font-bold text-emerald-800 underline mb-3">ลดได้สูงสุดตามสิทธิ์ (คำนวณจากรายได้คุณ)</p>
                    <p className="flex justify-between">
                      <span>• SSF (30%):</span> 
                      <span className="font-bold text-emerald-700">
                        {taxResult ? Math.min(taxResult.annual * 0.3, 200000).toLocaleString() : '200,000'}.-
                      </span>
                    </p>
                    <p className="flex justify-between">
                      <span>• RMF (30%):</span> 
                      <span className="font-bold text-emerald-700">
                        {taxResult ? Math.min(taxResult.annual * 0.3, 500000).toLocaleString() : '500,000'}.-
                      </span>
                    </p>
                    <p className="flex justify-between"><span>• ประกันสุขภาพ:</span> <span className="font-bold text-emerald-700">สูงสุด 25,000.-</span></p>
                  </div>
                  <div className="p-4 bg-amber-600 rounded-2xl text-white shadow-lg text-center">
                    <p className="text-[10px] font-bold uppercase tracking-widest opacity-80 mb-1">เป้าหมายลดหย่อนรวมสูงสุด</p>
                    <p className="text-2xl font-black">฿{taxResult ? Math.min(taxResult.annual * 0.3 + 60000 + 9000 + 25000, 500000 + 60000 + 9000 + 25000).toLocaleString() : '594,000'}</p>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-4 leading-relaxed text-center">* เมื่อรวมกลุ่มบำนาญ (SSF, RMF, ประกันบำนาญ) ต้องไม่เกิน 5 แสนบาท</p>
                </div>
              </div>
            </motion.div>
          )}

          {currentScreen === 'prem-invest' && (
            <motion.div key="prem-invest" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
              <button onClick={() => setCurrentScreen('user-dashboard-premium')} className="text-amber-700 font-bold italic text-sm flex items-center gap-1">
                <ChevronLeft size={16} /> ย้อนกลับ
              </button>
              <div className="bg-white rounded-[30px] p-8 shadow-2xl border border-amber-50">
                <h3 className="text-2xl font-black text-amber-700 mb-2 italic font-['Kanit']">แผนการลงทุนของคุณ</h3>
                <p className="text-xs text-slate-400 mb-6 italic">วิเคราะห์จากรายได้ต่อปี และระดับความเสี่ยง</p>
                <div className="flex gap-2 mb-8">
                  <button onClick={() => setRiskLevel('ต่ำ')} className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${riskLevel === 'ต่ำ' ? 'bg-emerald-600 text-white scale-105 shadow-lg' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}>เสี่ยงต่ำ</button>
                  <button onClick={() => setRiskLevel('กลาง')} className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${riskLevel === 'กลาง' ? 'bg-amber-500 text-white scale-105 shadow-lg' : 'bg-amber-50 text-amber-700 hover:bg-amber-100'}`}>เสี่ยงกลาง</button>
                  <button onClick={() => setRiskLevel('สูง')} className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${riskLevel === 'สูง' ? 'bg-rose-500 text-white scale-105 shadow-lg' : 'bg-rose-50 text-rose-700 hover:bg-rose-100'}`}>เสี่ยงสูง</button>
                </div>
                <div className="font-['IBM Plex Sans Thai']">
                  {renderInvestmentPlan()}
                </div>
              </div>
            </motion.div>
          )}

          {currentScreen === 'prem-insure' && (
            <motion.div key="prem-insure" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
              <button onClick={() => setCurrentScreen('user-dashboard-premium')} className="text-amber-700 font-bold italic text-sm flex items-center gap-1">
                <ChevronLeft size={16} /> ย้อนกลับ
              </button>
              <div className="bg-white rounded-[30px] p-8 shadow-2xl border border-amber-50">
                <h3 className="text-2xl font-black text-amber-700 mb-6 italic border-b-2 border-amber-100 pb-3 text-center font-['Kanit']">แนะนำการซื้อประกัน</h3>
                <div className="space-y-6">
                  <div className="text-center p-8 bg-amber-50 rounded-[30px] border border-amber-100 shadow-inner">
                    <p className="text-xs font-bold text-amber-600 italic mb-1 uppercase tracking-wider">เบี้ยประกันที่คุ้มค่าต่อปีของคุณ</p>
                    <p className="text-5xl font-black text-amber-700">
                      ฿{taxResult ? (taxResult.annual * 0.1).toLocaleString() : '0'}
                    </p>
                    <p className="text-[10px] opacity-60 mt-3 italic">* คำนวณจากกฎ 10% ของรายได้ต่อปี</p>
                  </div>
                  <div className="space-y-4 italic text-sm font-['IBM Plex Sans Thai']">
                    <div className="flex gap-4 p-4 bg-white rounded-2xl border border-amber-50 shadow-sm">
                      <CheckCircle size={24} className="text-amber-600 shrink-0" />
                      <div>
                        <p className="font-bold text-amber-800">ประกันชีวิตแบบสะสมทรัพย์</p>
                        <p className="opacity-70 text-xs mt-1">- เน้นลดหย่อนสูงสุด 100,000.- (คุ้มค่าที่สุด)</p>
                      </div>
                    </div>
                    <div className="flex gap-4 p-4 bg-white rounded-2xl border border-emerald-50 shadow-sm">
                      <CheckCircle size={24} className="text-emerald-600 shrink-0" />
                      <div>
                        <p className="font-bold text-emerald-800">ประกันสุขภาพ</p>
                        <p className="opacity-70 text-xs mt-1">- เน้นคุ้มครองตัวเอง ลดได้สูงสุด 25,000.-</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* 5.4 AI Assistant Screen */}
          {currentScreen === 'prem-ai' && (
            <motion.div 
              key="prem-ai"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              <div className="flex items-center gap-4 mb-8">
                <button onClick={() => setCurrentScreen('user-dashboard-premium')} className="bg-white p-3 rounded-2xl shadow-md text-amber-600 hover:bg-amber-50 transition-colors"><ChevronLeft size={24} /></button>
                <h2 className="text-2xl font-black text-indigo-700 italic font-['Kanit']">AI ผู้ช่วยส่วนตัว (Beta)</h2>
              </div>

              <div className="bg-white rounded-[40px] shadow-2xl overflow-hidden flex flex-col h-[500px] border border-indigo-50">
                <div className="bg-indigo-600 p-4 text-white text-center font-bold italic text-xs tracking-widest border-b-4 border-indigo-800">
                  SMART TAX AI ADVISOR
                </div>
                
                <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/50">
                  {aiChat.length === 0 && (
                    <div className="text-center py-10 opacity-40 italic text-sm">
                      <Lock size={40} className="mx-auto mb-4 opacity-20" />
                      <p>สวัสดีครับ! ผมคือ AI ผู้ช่วยวางแผนภาษี<br/>คุณสามารถสอบถามเรื่องภาษีหรือการลงทุนได้เลย</p>
                    </div>
                  )}
                  {aiChat.map((msg, idx) => (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      key={idx} 
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[80%] p-4 rounded-3xl text-sm font-medium shadow-sm ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white text-slate-800 border border-indigo-100 rounded-tl-none'}`}>
                        {msg.text}
                      </div>
                    </motion.div>
                  ))}
                  {aiLoading && (
                    <div className="flex justify-start">
                      <div className="bg-white p-4 rounded-3xl rounded-tl-none border border-indigo-100 shadow-sm">
                        <div className="flex gap-1">
                          <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"></div>
                          <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                          <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-4 bg-white border-t border-indigo-50 flex gap-2">
                  <input 
                    type="text" 
                    value={aiInput}
                    onChange={(e) => setAiInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && askAIAssistant()}
                    placeholder="พิมพ์คำถามของคุณที่นี่..."
                    className="flex-1 bg-slate-100 border-none rounded-2xl px-6 py-3 text-sm focus:ring-2 focus:ring-indigo-500 transition-all font-medium"
                  />
                  <button 
                    onClick={askAIAssistant}
                    disabled={aiLoading || !aiInput.trim()}
                    className="bg-indigo-600 text-white p-3 rounded-2xl shadow-lg hover:bg-indigo-700 transition-all active:scale-90 disabled:opacity-50"
                  >
                    <ArrowRight size={24} />
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* 6. Admin Dashboard */}
          {currentScreen === 'admin-dashboard' && currentUser && (
            <motion.div 
              key="admin-dash"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-6 w-full max-w-4xl mx-auto"
            >
              <div className="bg-amber-900 p-6 rounded-[30px] flex justify-between items-center shadow-2xl text-white border-b-4 border-amber-500">
                <h2 className="text-xl font-bold text-amber-400 italic flex items-center gap-2 font-['Kanit']">
                  <ShieldCheck size={24} /> SYSTEM ADMIN
                </h2>
                <button onClick={logout} className="bg-white/10 px-4 py-2 rounded-full text-[10px] font-bold hover:bg-white/20 transition-colors">LOGOUT</button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 font-['IBM Plex Sans Thai']">
                {/* Pending Slips */}
                <div className="bg-white p-8 rounded-[30px] text-slate-800 shadow-xl border border-amber-100">
                  <h3 className="font-bold text-amber-700 mb-6 text-sm italic underline flex items-center gap-2">
                    <ImageIcon size={16} /> รายการสลิปใหม่ (รออนุมัติ)
                  </h3>
                  <div className="space-y-4 text-xs max-h-60 overflow-y-auto pr-2">
                    {payments.filter(p => p.status === 'pending').length === 0 ? (
                      <p className="text-slate-400 italic text-center py-8">ไม่มีรายการรออนุมัติ</p>
                    ) : (
                      payments.filter(p => p.status === 'pending').map((p, idx) => (
                        <div key={idx} className="flex justify-between items-center bg-amber-50/50 p-4 rounded-2xl border border-amber-100">
                          <div>
                            <p className="font-bold text-amber-900">{p.userName}</p>
                            <span className="opacity-50 text-[10px]">{p.date}</span>
                          </div>
                          <div className="flex gap-2">
                            <button 
                              onClick={() => verifySlipWithAI(p)} 
                              disabled={aiVerifying === p.userId}
                              className={`px-4 py-2 rounded-xl font-bold transition-all shadow-sm ${aiVerifying === p.userId ? 'bg-slate-200 text-slate-400' : 'bg-amber-100 text-amber-700 hover:bg-amber-200'}`}
                            >
                              {aiVerifying === p.userId ? '...' : 'AI ตรวจ'}
                            </button>
                            <button onClick={() => setModalImg(p.img)} className="bg-amber-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-amber-700 transition-colors shadow-sm">สลิป</button>
                            <button onClick={() => approvePayment(p.userId)} className="bg-emerald-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-emerald-700 transition-colors shadow-sm">อนุมัติ</button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Approved History */}
                <div className="bg-white p-8 rounded-[30px] text-slate-800 shadow-xl border-t-8 border-emerald-500 border border-amber-50">
                  <h3 className="font-bold text-emerald-700 mb-6 text-sm italic underline flex items-center gap-2">
                    <History size={16} /> ประวัติการอนุมัติ
                  </h3>
                  <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                    {payments.filter(p => p.status === 'approved').length === 0 ? (
                      <p className="text-slate-400 italic text-center py-8">ไม่มีประวัติการอนุมัติ</p>
                    ) : (
                      payments.filter(p => p.status === 'approved').map((p, idx) => (
                        <div key={idx} className="flex justify-between items-center p-4 border-b border-slate-50 hover:bg-slate-50 transition-colors rounded-xl">
                          <span className="text-xs font-medium">{p.userName}</span>
                          <button onClick={() => setModalImg(p.img)} className="text-[10px] underline text-amber-600 font-bold hover:text-amber-700">ดูสลิปเก่า</button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* User List */}
                <div className="bg-white p-8 rounded-[30px] text-slate-800 shadow-xl border border-amber-100">
                  <h3 className="font-bold text-amber-700 mb-6 text-sm italic underline flex items-center gap-2">
                    <Users size={16} /> รายชื่อสมาชิก
                  </h3>
                  <div className="space-y-3 text-[11px] opacity-90 max-h-40 overflow-y-auto pr-2">
                    {users.map((u, idx) => (
                      <div key={idx} className="flex justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                        <span className="flex items-center gap-2 font-medium"><User size={12} className="text-amber-600" /> {u.name} (@{u.user})</span>
                        <span className={`px-3 py-1 rounded-full text-[9px] font-bold shadow-sm ${u.status === 'premium' ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-600'}`}>
                          {u.status.toUpperCase()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Login Logs */}
                <div className="bg-white p-8 rounded-[30px] text-slate-800 shadow-xl border border-amber-100">
                  <h3 className="font-bold text-amber-700 mb-6 text-sm italic underline flex items-center gap-2">
                    <History size={16} /> ประวัติการเข้าใช้งาน
                  </h3>
                  <div className="space-y-3 text-[10px] opacity-70 max-h-40 overflow-y-auto pr-2">
                    {loginHistory.map((h, idx) => (
                      <div key={idx} className="mb-1 p-3 border-b border-slate-50 flex justify-between items-center">
                        <span className="text-amber-800 font-bold">@{h.user}</span>
                        <span className="text-slate-400">{h.time}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* 7. Payment Screen */}
          {currentScreen === 'payment' && (
            <motion.div 
              key="payment"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-8 bg-white p-10 rounded-[40px] shadow-2xl text-center border border-amber-50"
            >
              <h2 className="text-3xl font-black text-amber-700 italic font-['Kanit']">ชำระเงินพรีเมียม ฿399</h2>
              <div className="relative inline-block group">
                <img 
                  src="https://picsum.photos/seed/qr/300/300" // Placeholder for QR
                  alt="QR Code"
                  className="w-64 mx-auto rounded-[40px] border-8 border-amber-50 shadow-2xl"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-amber-600/5 rounded-[40px] pointer-events-none"></div>
              </div>
              <div className="space-y-2 font-['IBM Plex Sans Thai']">
                <p className="text-sm font-bold text-amber-800 italic">ชื่อบัญชี: ภคพงษ์ ไกรชาติ</p>
                <p className="text-xs text-slate-400 italic">ธนาคารกสิกรไทย (ตัวอย่าง)</p>
              </div>
              
              <div className="mt-10 font-['IBM Plex Sans Thai']">
                <label className="block text-sm font-bold text-slate-700 mb-4 italic">อัปโหลดสลิปเพื่อยืนยัน:</label>
                <div className="relative">
                  <input 
                    type="file" 
                    id="slip-file" 
                    accept="image/*" 
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                  <label 
                    htmlFor="slip-file"
                    className="flex flex-col items-center justify-center w-full h-40 border-4 border-dashed border-amber-100 rounded-[30px] cursor-pointer hover:bg-amber-50 transition-all shadow-inner"
                  >
                    <ImageIcon size={40} className="text-amber-300 mb-3" />
                    <span className="text-sm text-amber-600 font-bold italic">คลิกเพื่อเลือกรูปภาพสลิป</span>
                  </label>
                </div>
              </div>

              <button 
                onClick={() => setCurrentScreen('user-dashboard-free')}
                className="w-full text-sm text-slate-400 italic underline hover:text-amber-600 mt-6 transition-colors"
              >
                ยกเลิกการทำรายการ
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Slip Modal */}
        <AnimatePresence>
          {modalImg && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setModalImg(null)}
              className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-6 backdrop-blur-sm"
            >
              <motion.div 
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.8 }}
                className="bg-white p-3 rounded-3xl max-w-sm w-full shadow-2xl"
              >
                <img src={modalImg} className="w-full rounded-2xl" alt="Slip" />
                <p className="text-center text-[10px] text-gray-500 font-bold p-4 italic">แตะเพื่อปิด</p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
