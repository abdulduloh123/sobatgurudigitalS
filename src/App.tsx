// @ts-nocheck
import React, { useState, useEffect } from 'react';
import {
    MessageCircle, Star, XCircle, CheckCircle, FileText, Book,
    Heart, Edit, RefreshCw, GraduationCap, ZoomIn, Eye, Info,
    Lock, LayoutDashboard, LogOut, PlusCircle,
    DollarSign, TrendingUp, User, ShoppingBag, ArrowRight,
    Users, Trash2, Key, Award
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, deleteDoc, doc } from 'firebase/firestore';

// 1. Inisialisasi Cloud Database Resmi Sobat Guru Digital
const firebaseConfig = {
  apiKey: "AIzaSyDoPPfpC_2Ftry_czzchHCSBabhuBbFwVY",
  authDomain: "sobatguru-digital.firebaseapp.com",
  projectId: "sobatguru-digital",
  storageBucket: "sobatguru-digital.firebasestorage.app",
  messagingSenderId: "1070589838471",
  appId: "1:1070589838471:web:238f0eac698a0454096422",
  measurementId: "G-1MD4HLCZFD"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = firebaseConfig.projectId; 

export default function App() {
    const [currentView, setCurrentView] = useState('landing');
    const [currentUser, setCurrentUser] = useState(null);
    const [firebaseUser, setFirebaseUser] = useState(null);

    const [salesData, setSalesData] = useState([]);
    const [usersData, setUsersData] = useState([]);

    useEffect(() => {
        if (!auth) return;
        const initAuth = async () => {
            try {
                if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
                    await signInWithCustomToken(auth, __initial_auth_token);
                } else {
                    await signInAnonymously(auth);
                }
            } catch (error) {
                console.error("Auth error:", error);
            }
        };
        initAuth();
        const unsubscribe = onAuthStateChanged(auth, setFirebaseUser);
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (!firebaseUser || !db) return;

        const salesRef = collection(db, 'artifacts', appId, 'public', 'data', 'salesData');
        const unsubscribeSales = onSnapshot(salesRef, (snapshot) => {
            const fetchedSales = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            fetchedSales.sort((a, b) => new Date(b.date) - new Date(a.date));
            setSalesData(fetchedSales);
        }, (error) => console.error("Firestore error:", error));

        const usersRef = collection(db, 'artifacts', appId, 'public', 'data', 'usersData');
        const unsubscribeUsers = onSnapshot(usersRef, (snapshot) => {
            const fetchedUsers = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setUsersData(fetchedUsers);
        }, (error) => console.error("Firestore error:", error));

        return () => {
            unsubscribeSales();
            unsubscribeUsers();
        };
    }, [firebaseUser]);

    useEffect(() => {
        const style = document.createElement('style');
        style.innerHTML = `
      @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600;700&display=swap');
      body { font-family: 'Poppins', sans-serif; }
      .hero-bg {
          background: linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 58, 138, 0.9) 100%);
          position: relative;
          overflow: hidden;
      }
      .gold-text { color: #fbbf24; }
      .cta-pulse { animation: pulse-animation 2s infinite; }
      @keyframes pulse-animation {
          0% { box-shadow: 0 0 0 0 rgba(251, 191, 36, 0.7); }
          70% { box-shadow: 0 0 0 10px rgba(251, 191, 36, 0); }
          100% { box-shadow: 0 0 0 0 rgba(251, 191, 36, 0); }
      }
    `;
        document.head.appendChild(style);
        return () => document.head.removeChild(style);
    }, []);

    const handleLogin = (user) => {
        setCurrentUser(user);
        setCurrentView('dashboard');
    };

    const handleLogout = () => {
        setCurrentUser(null);
        setCurrentView('landing');
    };

    const addSale = async (newSale) => {
        if (!firebaseUser || !db) {
            alert("Sistem database belum siap atau offline!");
            return;
        }
        try {
            const { id, ...saleDataToSave } = newSale;
            const salesRef = collection(db, 'artifacts', appId, 'public', 'data', 'salesData');
            await addDoc(salesRef, saleDataToSave);
        } catch (error) {
            console.error("Error menambah data: ", error);
            alert("Gagal menyimpan data ke awan!");
        }
    };

    const addStaffUser = async (newUser) => {
        if (!firebaseUser || !db) return alert("Sistem database belum siap!");
        try {
            const usersRef = collection(db, 'artifacts', appId, 'public', 'data', 'usersData');
            await addDoc(usersRef, newUser);
            alert("Staff berhasil ditambahkan!");
        } catch (error) {
            console.error("Error menambah staff: ", error);
            alert("Gagal menyimpan staff ke awan!");
        }
    };

    const deleteStaffUser = async (userId) => {
        if (!firebaseUser || !db) return;
        if (window.confirm("Yakin ingin menghapus akun staff ini?")) {
            try {
                const userDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'usersData', userId);
                await deleteDoc(userDocRef);
            } catch (error) {
                console.error("Error menghapus staff: ", error);
                alert("Gagal menghapus staff!");
            }
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 text-gray-800">
            {currentView === 'landing' && <LandingPage setView={setCurrentView} />}
            {currentView === 'login' && <LoginPage setView={setCurrentView} onLogin={handleLogin} usersData={usersData} />}
            {currentView === 'dashboard' && currentUser && (
                <Dashboard
                    user={currentUser}
                    onLogout={handleLogout}
                    salesData={salesData}
                    addSale={addSale}
                    usersData={usersData}
                    addStaffUser={addStaffUser}
                    deleteStaffUser={deleteStaffUser}
                />
            )}
        </div>
    );
}

function LandingPage({ setView }) {
    const [pdfModal, setPdfModal] = useState({ isOpen: false, url: '', title: '' });

    const redirectWA = (customMessage) => {
        const waNumbers = ['+6287781601968', '+6287822186229', '+6285724043082'];
        const message = customMessage || "Halo Admin, saya ingin bertanya tentang produknya...";
        const selectedNumber = waNumbers[Math.floor(Math.random() * waNumbers.length)];
        window.open(`https://api.whatsapp.com/send?phone=${selectedNumber}&text=${encodeURIComponent(message)}`, '_blank');
    };

    const openPdfModal = (url, title) => setPdfModal({ isOpen: true, url, title });
    const closePdfModal = () => setPdfModal({ isOpen: false, url: '', title: '' });

    return (
        <>
            <nav className="bg-white shadow-md py-2 px-4 fixed w-full top-0 z-50">
                <div className="max-w-4xl mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <img src="https://upload.wikimedia.org/wikipedia/commons/9/9c/Logo_of_Ministry_of_Education_and_Culture_of_Republic_of_Indonesia.svg"
                            alt="Logo Kemendikbud" className="h-12 w-auto" />
                        <div className="flex flex-col">
                            <span className="text-[10px] text-gray-500 font-semibold tracking-wider uppercase">Mitra Pendidik</span>
                            <span className="font-bold text-blue-900 text-lg leading-tight">Sobat Guru Digital 2026</span>
                        </div>
                    </div>
                    <button onClick={() => redirectWA('Halo Admin, saya tertarik dengan Modul Ajar Deeplearning')}
                        className="bg-green-500 hover:bg-green-600 text-white text-sm font-bold py-2 px-4 rounded-full transition duration-300 flex items-center shadow-sm">
                        <MessageCircle size={16} className="mr-1" /> Pesan
                    </button>
                </div>
            </nav>

            <header className="hero-bg text-white pt-28 pb-16 px-4 text-center rounded-b-[3rem] shadow-xl">
                <div className="absolute inset-0 z-0">
                    <img src="https://pict.sindonews.net/webp/732/pena/news/2023/09/29/212/1212991/guru-indonesia-menurut-tempat-mengajar-mayoritas-sd-dan-smp-wbp.webp"
                        alt="Background" className="w-full h-full object-cover opacity-10 mix-blend-overlay" />
                </div>
                <div className="max-w-3xl mx-auto relative z-10">
                    <div className="inline-block bg-yellow-500 text-blue-900 font-bold px-3 py-1 rounded-full text-xs mb-4 uppercase tracking-wide shadow-md">
                        Solusi Administrasi Guru Anti Capek!!!
                    </div>
                    <h1 className="text-3xl md:text-5xl font-extrabold mb-4 leading-tight drop-shadow-lg">
                        Modul Ajar <span className="gold-text">DEEPLEARNING</span><br />Terlengkap & Terbaru
                    </h1>
                    <p className="text-blue-100 text-lg mb-8 drop-shadow-md">
                        Untuk Jenjang SD, SMP, SMA & Madrasah. Sesuai CP Terbaru (046 & KMA 3302).
                    </p>
                    <div className="flex justify-center items-center gap-2 mb-8 bg-white/10 p-3 rounded-lg backdrop-blur-sm inline-flex border border-white/20">
                        <div className="flex text-yellow-400">
                            <Star size={16} fill="currentColor" /><Star size={16} fill="currentColor" /><Star size={16} fill="currentColor" /><Star size={16} fill="currentColor" /><Star size={16} fill="currentColor" />
                        </div>
                        <span className="text-sm font-medium">Dipercaya 7.400+ Guru Indonesia</span>
                    </div>
                    <br />
                    <button onClick={() => redirectWA('Halo Admin, saya mau order Modul Deeplearning')}
                        className="cta-pulse bg-yellow-500 hover:bg-yellow-400 text-blue-900 font-bold py-4 px-8 rounded-full text-xl shadow-lg transition transform hover:scale-105 inline-flex items-center cursor-pointer border-none">
                        <MessageCircle size={24} className="mr-2" /> HUBUNGI KAMI SEKARANG
                    </button>
                </div>
            </header>

            <section className="py-12 px-4">
                <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-8 items-center">
                    <div className="bg-white p-6 rounded-2xl shadow-lg border-l-4 border-red-500">
                        <h3 className="text-xl font-bold text-red-600 mb-3 flex items-center"><XCircle size={20} className="mr-2" /> Masalah Guru Saat Ini:</h3>
                        <ul className="space-y-2 text-gray-600">
                            <li>• Bingung menyusun modul sesuai CP 046?</li>
                            <li>• Takut tidak lulus validasi Supervisi dan UKIN PPG?</li>
                            <li>• Waktu habis hanya untuk administrasi?</li>
                            <li>• Kesulitan mencari referensi KMA 3302?</li>
                        </ul>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-lg border-l-4 border-green-500">
                        <h3 className="text-xl font-bold text-green-600 mb-3 flex items-center"><CheckCircle size={20} className="mr-2" /> Solusi Kami:</h3>
                        <ul className="space-y-2 text-gray-600">
                            <li>• <strong>Modul Siap Pakai</strong> tinggal edit identitas.</li>
                            <li>• Disusun oleh ahli kurikulum berpengalaman.</li>
                            <li>• <strong>Lengkap!</strong> Prota, Prosem, LKPD, ATP.</li>
                            <li>• <strong>Garansi Revisi</strong> jika ada ketidaksesuaian.</li>
                        </ul>
                    </div>
                </div>
            </section>

            <section className="bg-blue-50 py-16 px-4">
                <div className="max-w-5xl mx-auto text-center">
                    <h2 className="text-3xl font-bold text-blue-900 mb-10">Apa yang Anda Dapatkan?</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[
                            { icon: <FileText size={24} />, title: 'Paket Lengkap', desc: 'Termasuk Prota, Prosem, LKPD, ATP, dan Modul Ajar terstruktur.' },
                            { icon: <Book size={24} />, title: 'CP & KMA Terbaru', desc: 'Mengacu pada CP 046 dan KMA 3302. Relevan untuk PPG 2025.' },
                            { icon: <Heart size={24} />, title: 'Kurikulum Berbasis Cinta', desc: 'Pendekatan humanis yang memudahkan siswa memahami materi.' },
                            { icon: <Edit size={24} />, title: 'Bisa Request Materi', desc: 'Sesuaikan dengan kebutuhan spesifik di sekolah/madrasah Anda.' },
                            { icon: <RefreshCw size={24} />, title: 'Bisa Revisi', desc: 'Kami menjamin kualitas. Ada harga, ada kualitas terbaik.' },
                            { icon: <GraduationCap size={24} />, title: 'Semua Jenjang', desc: 'Tersedia untuk SD, SMP, SMA dan Madrasah (MI, MTs, MA).' }
                        ].map((item, idx) => (
                            <div key={idx} className="bg-white p-6 rounded-xl shadow-md hover:shadow-xl transition">
                                <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                    {item.icon}
                                </div>
                                <h3 className="font-bold text-lg mb-2">{item.title}</h3>
                                <p className="text-sm text-gray-600">{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section className="py-16 px-4 bg-gray-100">
                <div className="max-w-5xl mx-auto">
                    <div className="text-center mb-12">
                        <span className="text-blue-600 font-bold text-sm tracking-widest uppercase bg-blue-100 px-3 py-1 rounded-full">Transparan & Terpercaya</span>
                        <h2 className="text-3xl md:text-4xl font-extrabold text-gray-800 mt-3">Intip Kerapian Modul Kami</h2>
                        <p className="text-gray-600 mt-3 max-w-xl mx-auto">Kami berikan preview dokumen asli dalam format PDF agar Bapak/Ibu yakin dengan kerapian dan kualitas premium modul kami.</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="bg-white rounded-2xl shadow-md overflow-hidden transform hover:-translate-y-2 hover:shadow-xl transition duration-300 flex flex-col border border-gray-100">
                            <div className="h-52 bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center relative group cursor-pointer" onClick={() => openPdfModal('cover.pdf', 'Preview Cover & Identitas')}>
                                <div className="w-24 h-32 bg-white shadow-lg rounded-md border border-gray-200 flex flex-col items-center justify-center p-3 transition duration-300 group-hover:scale-105">
                                    <div className="w-full h-3 bg-blue-500 rounded-sm mb-3"></div>
                                    <div className="w-full h-1.5 bg-gray-200 rounded-sm mb-2"></div>
                                    <div className="w-full h-1.5 bg-gray-200 rounded-sm mb-2"></div>
                                    <div className="w-3/4 h-1.5 bg-gray-200 rounded-sm"></div>
                                </div>
                                <div className="absolute inset-0 bg-blue-900/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                                    <span className="bg-white text-blue-900 font-bold text-xs py-2 px-4 rounded-full shadow-lg flex items-center gap-1.5 transform translate-y-3 group-hover:translate-y-0 transition duration-300">
                                        <ZoomIn size={14} /> Intip Cover
                                    </span>
                                </div>
                                <span className="absolute top-3 left-3 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow flex items-center gap-1">
                                    <FileText size={10} /> PDF
                                </span>
                            </div>
                            <div className="p-6 flex flex-col flex-grow text-center">
                                <h4 className="font-bold text-gray-800 text-lg">Cover & Identitas</h4>
                                <p className="text-sm text-gray-500 mt-2 flex-grow">Desain rapi, terstruktur, tinggal ganti nama guru & sekolah.</p>
                                <button onClick={() => openPdfModal('cover.pdf', 'Preview Cover & Identitas')} className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-4 rounded-xl transition duration-300 flex items-center justify-center gap-2 text-sm shadow-md">
                                    <Eye size={16} /> Buka Preview
                                </button>
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl shadow-md overflow-hidden transform hover:-translate-y-2 hover:shadow-xl transition duration-300 flex flex-col border border-gray-100">
                            <div className="h-52 bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center relative group cursor-pointer" onClick={() => openPdfModal('prota.pdf', 'Preview Prota & Prosem')}>
                                <div className="w-24 h-32 bg-white shadow-lg rounded-md border border-gray-200 p-3 transition duration-300 group-hover:scale-105">
                                    <div className="w-1/2 h-3 bg-emerald-500 rounded-sm mb-3"></div>
                                    <div className="w-full h-12 bg-gray-50 border border-gray-150 rounded mb-2 grid grid-cols-3 gap-1 p-1">
                                        {[...Array(6)].map((_, i) => <div key={i} className="bg-gray-200/80 rounded-sm"></div>)}
                                    </div>
                                </div>
                                <div className="absolute inset-0 bg-emerald-900/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                                    <span className="bg-white text-emerald-900 font-bold text-xs py-2 px-4 rounded-full shadow-lg flex items-center gap-1.5">
                                        <ZoomIn size={14} /> Intip Prota
                                    </span>
                                </div>
                            </div>
                            <div className="p-6 flex flex-col flex-grow text-center">
                                <h4 className="font-bold text-gray-800 text-lg">Prota & Prosem</h4>
                                <p className="text-sm text-gray-500 mt-2 flex-grow">Otomatis menghitung pekan efektif & JP.</p>
                                <button onClick={() => openPdfModal('prota.pdf', 'Preview Prota & Prosem')} className="mt-4 w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 px-4 rounded-xl transition flex items-center justify-center gap-2 text-sm shadow-md">
                                    <Eye size={16} /> Buka Preview
                                </button>
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl shadow-md overflow-hidden transform hover:-translate-y-2 hover:shadow-xl transition duration-300 flex flex-col border border-gray-100">
                            <div className="h-52 bg-gradient-to-br from-yellow-50 to-amber-100 flex items-center justify-center relative group cursor-pointer" onClick={() => openPdfModal('isi.pdf', 'Preview Modul & LKPD')}>
                                <div className="w-24 h-32 bg-white shadow-lg rounded-md border border-gray-200 p-3 transition duration-300 group-hover:scale-105">
                                    <div className="w-full h-3 bg-amber-500 rounded-sm mb-3"></div>
                                    <div className="w-full h-8 bg-amber-50/50 border border-dashed border-amber-200 flex items-center justify-center text-[7px] text-amber-600 font-bold">MODUL & LKPD</div>
                                </div>
                                <div className="absolute inset-0 bg-amber-900/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                                    <span className="bg-white text-amber-900 font-bold text-xs py-2 px-4 rounded-full shadow-lg flex items-center gap-1.5">
                                        <ZoomIn size={14} /> Intip Isi Modul
                                    </span>
                                </div>
                            </div>
                            <div className="p-6 flex flex-col flex-grow text-center">
                                <h4 className="font-bold text-gray-800 text-lg">Modul Ajar & LKPD</h4>
                                <p className="text-sm text-gray-500 mt-2 flex-grow">Langkah pembelajaran terperinci.</p>
                                <button onClick={() => openPdfModal('isi.pdf', 'Preview Modul & LKPD')} className="mt-4 w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold py-2.5 px-4 rounded-xl transition flex items-center justify-center gap-2 text-sm shadow-md">
                                    <Eye size={16} /> Buka Preview
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="py-16 px-4 bg-white">
                <div className="max-w-4xl mx-auto">
                    <div className="text-center mb-10">
                        <h2 className="text-3xl font-bold text-gray-800">Apa Kata Mereka?</h2>
                        <div className="h-1 w-20 bg-yellow-500 mx-auto mt-2 rounded"></div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <div className="bg-gray-50 p-6 rounded-xl border border-gray-100 shadow-sm">
                            <div className="flex items-center mb-4">
                                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold mr-3">SR</div>
                                <div>
                                    <h5 className="font-bold text-sm">Bu Sri Rahayu</h5>
                                    <p className="text-xs text-gray-500">Guru SD - Jawa Tengah</p>
                                </div>
                            </div>
                            <p className="text-gray-600 text-sm italic">"Alhamdulillah, modulnya sangat membantu. Saya lulus UKIN PPG Daljab kemarin. Terima kasih admin fast respon!"</p>
                            <div className="text-yellow-400 text-xs mt-3 flex gap-0.5">
                                <Star size={12} fill="currentColor" /><Star size={12} fill="currentColor" /><Star size={12} fill="currentColor" /><Star size={12} fill="currentColor" /><Star size={12} fill="currentColor" />
                            </div>
                        </div>

                        <div className="bg-gray-50 p-6 rounded-xl border border-gray-100 shadow-sm">
                            <div className="flex items-center mb-4">
                                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600 font-bold mr-3">AH</div>
                                <div>
                                    <h5 className="font-bold text-sm">Pak Ahmad H.</h5>
                                    <p className="text-xs text-gray-500">Guru PAI - MTs</p>
                                </div>
                            </div>
                            <p className="text-gray-600 text-sm italic">"Aminn. Alhamdulillah, Awalnya ragu karena online, ternyata file sudah sesuai CP nya lengkap. Supervisi pengawas jadi aman."</p>
                            <div className="text-yellow-400 text-xs mt-3 flex gap-0.5">
                                <Star size={12} fill="currentColor" /><Star size={12} fill="currentColor" /><Star size={12} fill="currentColor" /><Star size={12} fill="currentColor" /><Star size={12} fill="currentColor" />
                            </div>
                        </div>

                        <div className="bg-gray-50 p-6 rounded-xl border border-gray-100 shadow-sm">
                            <div className="flex items-center mb-4">
                                <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-bold mr-3">DN</div>
                                <div>
                                    <h5 className="font-bold text-sm">Bu Diana</h5>
                                    <p className="text-xs text-gray-500">Guru Bahasa Inggris - SMA</p>
                                </div>
                            </div>
                            <p className="text-gray-600 text-sm italic">"Kurikulum berbasis cintanya Sudah sesuai Panduan Resmi. Siswa jadi lebih antusias. Recommended buat yg sibuk!"</p>
                            <div className="text-yellow-400 text-xs mt-3 flex gap-0.5">
                                <Star size={12} fill="currentColor" /><Star size={12} fill="currentColor" /><Star size={12} fill="currentColor" /><Star size={12} fill="currentColor" /><Star size={12} fill="currentColor" />
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <div className="bg-gray-800 text-white py-12 text-center text-sm relative">
                <p>© 2026 Layanan Pembuatan Modul Ajar Profesional.</p>
                <p className="mt-2 text-gray-400">Siap bantu Guru Lulus Supervisi dan Mudah Mengajar Tanpa Pusing Administrasi.</p>

                <div className="mt-12 flex justify-center">
                    <button
                        onClick={() => setView('login')}
                        className="flex items-center gap-2 px-4 py-2 text-gray-500 hover:text-white transition-colors text-xs opacity-60 hover:opacity-100 rounded-lg hover:bg-gray-700"
                    >
                        <Lock size={12} /> Portal Staff & Admin
                    </button>
                </div>
            </div>

            <button onClick={() => redirectWA('Halo, saya tertarik pesan Modul Deeplearning')}
                className="fixed bottom-6 right-6 bg-green-500 hover:bg-green-600 text-white p-4 rounded-full shadow-2xl flex items-center justify-center w-16 h-16 transition transform hover:scale-110 z-40 animate-bounce cursor-pointer border-none">
                <MessageCircle size={32} />
            </button>

            {pdfModal.isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={closePdfModal}></div>
                    <div className="relative bg-white w-full max-w-5xl h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-300">
                        <div className="bg-gradient-to-r from-blue-900 to-indigo-950 text-white px-6 py-4 flex items-center justify-between shadow-md">
                            <div className="flex items-center gap-3">
                                <div className="bg-red-500 p-2 rounded-lg"><FileText size={20} /></div>
                                <div>
                                    <h3 className="font-bold text-lg">{pdfModal.title}</h3>
                                </div>
                            </div>
                            <button onClick={closePdfModal} className="hover:bg-white/20 p-2 rounded-full transition">
                                XCircle size={20} />
                            </button>
                        </div>
                        <div className="flex-grow bg-gray-50 flex flex-col">
                            <div className="bg-amber-50 border-b border-amber-200 px-6 py-2.5 text-xs text-amber-800 flex items-center justify-between">
                                <span className="flex items-center gap-2">
                                    <Info size={14} className="text-amber-600" />
                                    <span>Preview dokumen: <strong>{pdfModal.url}</strong></span>
                                </span>
                            </div>
                            <div className="flex-grow flex items-center justify-center text-gray-400 bg-gray-100">
                                <div className="text-center">
                                    <FileText size={64} className="mx-auto mb-4 opacity-50" />
                                    <p>Memuat {pdfModal.url} ... (Simulasi)</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-gray-100 px-6 py-4 text-right">
                            <button onClick={closePdfModal} className="bg-gray-800 hover:bg-gray-700 text-white font-bold py-2 px-6 rounded-xl text-sm shadow-md">
                                Tutup
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

function LoginPage({ setView, onLogin, usersData }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();

        const matchedUser = usersData.find(u => u.username === username && u.password === password);
        if (matchedUser) {
            onLogin(matchedUser);
            return;
        }

        if (username === 'admin' && password === 'admin123') {
            onLogin({ role: 'admin', name: 'Bapak Owner', username: 'admin' });
        } else if (username === 'staff' && password === 'staff123') {
            onLogin({ role: 'staff', name: 'Siti (Staff Default)', username: 'staff' });
        } else {
            setError('Username atau Password salah!');
        }
    };

    return (
        <div className="min-h-screen bg-slate-100 flex flex-col justify-center items-center p-4">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden">
                <div className="bg-blue-900 p-6 text-center">
                    <Lock size={40} className="text-yellow-400 mx-auto mb-3" />
                    <h2 className="text-2xl font-bold text-white">Portal HRIS Internal</h2>
                    <p className="text-blue-200 text-sm">Sobat Guru Digital 2026</p>
                </div>
                <div className="p-8">
                    {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4 border border-red-200">{error}</div>}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                            <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} required
                                className="w-full border-gray-300 border px-4 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                placeholder="Masukkan username" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
                                className="w-full border-gray-300 border px-4 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                placeholder="••••••••" />
                        </div>
                        <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg shadow-md transition duration-200 flex justify-center items-center gap-2">
                            Masuk Dashboard <ArrowRight size={18} />
                        </button>
                    </form>

                    <div className="mt-8 pt-6 border-t border-gray-100 text-xs text-gray-500">
                        <p className="font-semibold mb-2">Info Demo Login:</p>
                        <p>Owner : <code>admin</code> / <code>admin123</code></p>
                        <p>Staff : <code>staff</code> / <code>staff123</code></p>
                    </div>
                </div>
            </div>
            <button onClick={() => setView('landing')} className="mt-6 text-gray-500 hover:text-blue-600 font-medium text-sm flex items-center gap-1">
                &larr; Kembali ke Website Utama
            </button>
        </div>
    );
}

function Dashboard({ user, onLogout, salesData, addSale, usersData, addStaffUser, deleteStaffUser }) {
    const [activeTab, setActiveTab] = useState(user.role === 'staff' ? 'input' : 'overview');

    return (
        <div className="flex h-screen bg-gray-100 overflow-hidden">
            <div className="w-64 bg-blue-900 text-white flex flex-col hidden md:flex">
                <div className="p-6 text-center border-b border-blue-800">
                    <div className="w-16 h-16 bg-white/10 rounded-full mx-auto flex items-center justify-center mb-3">
                        <User size={32} className="text-yellow-400" />
                    </div>
                    <h3 className="font-bold text-lg">{user.name}</h3>
                    <span className="bg-blue-800 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider text-blue-200">
                        {user.role} Role
                    </span>
                </div>

                <nav className="flex-grow p-4 space-y-2">
                    {user.role === 'admin' && (
                        <>
                            <SidebarBtn icon={<LayoutDashboard />} label="Overview Bisnis" active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} />
                            <SidebarBtn icon={<DollarSign />} label="Semua Penjualan" active={activeTab === 'all_sales'} onClick={() => setActiveTab('all_sales')} />
                            <SidebarBtn icon={<Award />} label="Laporan Komisi" active={activeTab === 'commission'} onClick={() => setActiveTab('commission')} />
                            <SidebarBtn icon={<Users />} label="Manajemen Staff" active={activeTab === 'manage_staff'} onClick={() => setActiveTab('manage_staff')} />
                        </>
                    )}
                    {user.role === 'staff' && (
                        <>
                            <SidebarBtn icon={<PlusCircle />} label="Input Closingan" active={activeTab === 'input'} onClick={() => setActiveTab('input')} />
                            <SidebarBtn icon={<ShoppingBag />} label="Riwayat Penjualan Saya" active={activeTab === 'my_sales'} onClick={() => setActiveTab('my_sales')} />
                        </>
                    )}
                </nav>

                <div className="p-4 border-t border-blue-800">
                    <button onClick={onLogout} className="w-full flex items-center gap-3 text-blue-200 hover:text-white hover:bg-red-500/20 px-4 py-2 rounded-lg transition">
                        <LogOut size={18} /> Keluar
                    </button>
                </div>
            </div>

            <div className="flex-grow overflow-y-auto">
                <header className="bg-white shadow-sm px-8 py-4 flex justify-between items-center md:hidden">
                    <h2 className="font-bold text-blue-900 text-lg">HRIS Portal</h2>
                    <button onClick={onLogout} className="text-red-500 text-sm font-bold flex items-center gap-1"><LogOut size={16} /> Keluar</button>
                </header>

                <main className="p-8">
                    {user.role === 'admin' && activeTab === 'overview' && <AdminOverview salesData={salesData} />}
                    {user.role === 'admin' && activeTab === 'all_sales' && <SalesTable data={salesData} title="Semua Data Penjualan (Company)" showFilters={true} />}
                    {user.role === 'admin' && activeTab === 'commission' && <CommissionReport salesData={salesData} />}
                    {user.role === 'admin' && activeTab === 'manage_staff' && <ManageStaff usersData={usersData} addStaffUser={addStaffUser} deleteStaffUser={deleteStaffUser} />}

                    {user.role === 'staff' && activeTab === 'input' && <StaffInputForm addSale={addSale} userName={user.name} setTab={setActiveTab} />}
                    {user.role === 'staff' && activeTab === 'my_sales' && <SalesTable data={salesData.filter(s => s.staffName === user.name)} title="Riwayat Penjualan Saya" />}
                </main>
            </div>
        </div>
    );
}

function SidebarBtn({ icon, label, active, onClick }) {
    return (
        <button onClick={onClick} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${active ? 'bg-blue-600 text-white shadow-md' : 'text-blue-200 hover:bg-blue-800 hover:text-white'}`}>
            {React.cloneElement(icon, { size: 20 })}
            <span className="font-medium">{label}</span>
        </button>
    );
}

function AdminOverview({ salesData }) {
    const totalRevenue = salesData.reduce((acc, curr) => acc + curr.amount, 0);
    const totalSales = salesData.length;

    return (
        <div className="space-y-6 animate-in fade-in">
            <div>
                <h1 className="text-2xl font-bold text-gray-800">Dashboard Owner</h1>
                <p className="text-gray-500">Ringkasan performa penjualan tim Anda.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                    <div className="w-14 h-14 bg-green-100 text-green-600 rounded-full flex items-center justify-center"><DollarSign size={28} /></div>
                    <div>
                        <p className="text-sm text-gray-500 font-medium">Total Pendapatan</p>
                        <h3 className="text-2xl font-bold text-gray-800">Rp {totalRevenue.toLocaleString('id-ID')}</h3>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                    <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center"><TrendingUp size={28} /></div>
                    <div>
                        <p className="text-sm text-gray-500 font-medium">Total Closing</p>
                        <h3 className="text-2xl font-bold text-gray-800">{totalSales} Modul</h3>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                    <div className="w-14 h-14 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center"><User size={28} /></div>
                    <div>
                        <p className="text-sm text-gray-500 font-medium">Tim Aktif</p>
                        <h3 className="text-2xl font-bold text-gray-800">1 Staff</h3>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Penjualan Terakhir</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-gray-600">
                        <thead className="bg-gray-50 border-b border-gray-200 text-gray-700">
                            <tr>
                                <th className="px-4 py-3">Tanggal</th>
                                <th className="px-4 py-3">Staff</th>
                                <th className="px-4 py-3">Kustomer</th>
                                <th className="px-4 py-3 text-right">Nominal</th>
                            </tr>
                        </thead>
                        <tbody>
                            {salesData.slice(0, 5).map((sale, i) => (
                                <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                                    <td className="px-4 py-3">{sale.date}</td>
                                    <td className="px-4 py-3 font-medium">{sale.staffName}</td>
                                    <td className="px-4 py-3">{sale.customer}</td>
                                    <td className="px-4 py-3 text-right font-bold text-green-600">Rp {sale.amount.toLocaleString('id-ID')}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

function StaffInputForm({ addSale, userName, setTab }) {
    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        customer: '',
        product: 'Modul SD',
        amount: '',
        notes: ''
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        addSale({
            id: Date.now(),
            staffName: userName,
            date: formData.date,
            customer: formData.customer,
            product: formData.product,
            amount: Number(formData.amount),
            notes: formData.notes
        });
        alert('Data Closing berhasil ditambahkan!');
        setFormData({ ...formData, customer: '', amount: '', notes: '' }); 
        setTab('my_sales');
    };

    return (
        <div className="max-w-2xl mx-auto animate-in fade-in">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-800">Lapor Closingan Hari Ini 🎉</h1>
                <p className="text-gray-500">Tetap semangat! Masukkan data penjualan kamu dengan teliti.</p>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal</label>
                            <input type="date" required value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })}
                                className="w-full border-gray-300 border px-4 py-2 rounded-lg bg-gray-50" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Nama Kustomer / Guru</label>
                            <input type="text" required value={formData.customer} onChange={e => setFormData({ ...formData, customer: e.target.value })}
                                className="w-full border-gray-300 border px-4 py-2 rounded-lg" placeholder="Contoh: Bapak Budi (SDN 1)" />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Paket Modul</label>
                            <select value={formData.product} onChange={e => setFormData({ ...formData, product: e.target.value })} className="w-full border-gray-300 border px-4 py-2 rounded-lg bg-white">
                                <option value="Modul SD">Modul SD</option>
                                <option value="Modul SMP">Modul SMP</option>
                                <option value="Modul SMA">Modul SMA</option>
                                <option value="Modul MI/MTs">Modul Madrasah</option>
                                <option value="Paket Lengkap Custom">Paket Lengkap Custom</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Nominal Transfer (Rp)</label>
                            <input type="number" required value={formData.amount} onChange={e => setFormData({ ...formData, amount: e.target.value })}
                                className="w-full border-gray-300 border px-4 py-2 rounded-lg" placeholder="150000" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Catatan Tambahan</label>
                        <textarea rows="3" value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })}
                            className="w-full border-gray-300 border px-4 py-2 rounded-lg" placeholder="Contoh: Via transfer Mandiri, butuh revisi cover."></textarea>
                    </div>

                    <button type="submit" className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-xl shadow-md transition duration-200 flex justify-center items-center gap-2 text-lg">
                        <CheckCircle size={20} /> Simpan Data Penjualan
                    </button>
                </form>
            </div>
        </div>
    );
}

function SalesTable({ data, title, showFilters }) {
    const [filterStaff, setFilterStaff] = useState('');
    const [filterDateFrom, setFilterDateFrom] = useState('');
    const [filterDateTo, setFilterDateTo] = useState('');

    const staffList = [...new Set(data.map(item => item.staffName))];

    const filteredData = data.filter(sale => {
        let matchStaff = true;
        let matchDateFrom = true;
        let matchDateTo = true;

        if (filterStaff) matchStaff = sale.staffName === filterStaff;
        if (filterDateFrom) matchDateFrom = new Date(sale.date) >= new Date(filterDateFrom);
        if (filterDateTo) matchDateTo = new Date(sale.date) <= new Date(filterDateTo);

        return matchStaff && matchDateFrom && matchDateTo;
    });

    const totalFilteredAmount = filteredData.reduce((sum, item) => sum + item.amount, 0);

    return (
        <div className="animate-in fade-in">
            <h1 className="text-2xl font-bold text-gray-800 mb-6">{title}</h1>

            {showFilters && (
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Filter Staff</label>
                        <select value={filterStaff} onChange={e => setFilterStaff(e.target.value)} className="w-full border-gray-300 border px-3 py-2 rounded-lg text-sm">
                            <option value="">Semua Staff</option>
                            {staffList.map((staff, i) => <option key={i} value={staff}>{staff}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Dari Tanggal</label>
                        <input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} className="w-full border-gray-300 border px-3 py-2 rounded-lg text-sm" />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Sampai Tanggal</label>
                        <input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} className="w-full border-gray-300 border px-3 py-2 rounded-lg text-sm" />
                    </div>
                </div>
            )}

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                {showFilters && (
                    <div className="px-6 py-4 bg-blue-50 border-b border-gray-100 flex justify-between items-center">
                        <span className="text-sm font-semibold text-blue-900">Total Penjualan (Berdasarkan Filter):</span>
                        <span className="text-lg font-bold text-green-600">Rp {totalFilteredAmount.toLocaleString('id-ID')}</span>
                    </div>
                )}

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-gray-600">
                        <thead className="bg-gray-50 border-b border-gray-200 text-gray-700">
                            <tr>
                                <th className="px-6 py-4">Tanggal</th>
                                {showFilters && <th className="px-6 py-4">Staff</th>}
                                <th className="px-6 py-4">Kustomer</th>
                                <th className="px-6 py-4">Produk</th>
                                <th className="px-6 py-4">Catatan</th>
                                <th className="px-6 py-4 text-right">Nominal</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredData.length === 0 ? (
                                <tr><td colSpan={showFilters ? "6" : "5"} className="text-center py-8 text-gray-400">Belum ada data penjualan yang sesuai.</td></tr>
                            ) : filteredData.map((sale) => (
                                <tr key={sale.id} className="border-b border-gray-50 hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap">{sale.date}</td>
                                    {showFilters && <td className="px-6 py-4 font-medium text-blue-600">{sale.staffName}</td>}
                                    <td className="px-6 py-4 font-medium text-gray-800">{sale.customer}</td>
                                    <td className="px-6 py-4"><span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-md text-xs font-semibold">{sale.product}</span></td>
                                    <td className="px-6 py-4 text-gray-500 text-xs max-w-xs truncate">{sale.notes || '-'}</td>
                                    <td className="px-6 py-4 text-right font-bold text-green-600 whitespace-nowrap">Rp {sale.amount.toLocaleString('id-ID')}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

function ManageStaff({ usersData, addStaffUser, deleteStaffUser }) {
    const [formData, setFormData] = useState({ name: '', username: '', password: '', role: 'staff' });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (usersData.some(u => u.username === formData.username)) {
            alert('Username ini sudah dipakai oleh staff lain!');
            return;
        }
        if (formData.username === 'admin') {
            alert('Username admin tidak boleh dipakai!');
            return;
        }
        addStaffUser(formData);
        setFormData({ name: '', username: '', password: '', role: 'staff' }); 
    };

    const staffList = usersData.filter(u => u.role === 'staff');

    return (
        <div className="animate-in fade-in space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-800">Manajemen Akses Staff</h1>
                <p className="text-gray-500">Buat dan atur akun login untuk tim sales Anda.</p>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 xl:col-span-1 h-fit">
                    <h3 className="font-bold text-lg mb-4 text-blue-900 border-b pb-2 flex items-center gap-2"><Key size={18} /> Buat Akun Baru</h3>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Nama Lengkap</label>
                            <input type="text" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full border-gray-300 border px-3 py-2 rounded-lg text-sm" placeholder="Contoh: Rina Amalia" />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Username (Untuk Login)</label>
                            <input type="text" required value={formData.username} onChange={e => setFormData({ ...formData, username: e.target.value.toLowerCase().replace(/\s/g, '') })} className="w-full border-gray-300 border px-3 py-2 rounded-lg text-sm" placeholder="Contoh: rina123" />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Password</label>
                            <input type="text" required value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} className="w-full border-gray-300 border px-3 py-2 rounded-lg text-sm" placeholder="••••••••" />
                        </div>
                        <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-lg shadow-md transition duration-200 flex justify-center items-center gap-2 text-sm mt-2">
                            <PlusCircle size={16} /> Tambah Akun Staff
                        </button>
                    </form>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 xl:col-span-2">
                    <h3 className="font-bold text-lg mb-4 text-blue-900 border-b pb-2 flex items-center gap-2"><Users size={18} /> Daftar Akun Tim Sales</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-gray-600">
                            <thead className="bg-gray-50 border-b border-gray-200 text-gray-700">
                                <tr>
                                    <th className="px-4 py-3">Nama Lengkap</th>
                                    <th className="px-4 py-3">Username</th>
                                    <th className="px-4 py-3">Password</th>
                                    <th className="px-4 py-3 text-center">Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {staffList.length === 0 ? (
                                    <tr><td colSpan="4" className="text-center py-8 text-gray-400">Belum ada akun staff yang ditambahkan. Silakan buat di form sebelah kiri.</td></tr>
                                ) : staffList.map((staff) => (
                                    <tr key={staff.id} className="border-b border-gray-50 hover:bg-gray-50">
                                        <td className="px-4 py-3 font-medium text-gray-800">{staff.name}</td>
                                        <td className="px-4 py-3"><span className="bg-gray-100 px-2 py-1 rounded text-xs font-semibold">{staff.username}</span></td>
                                        <td className="px-4 py-3"><span className="bg-red-50 text-red-600 px-2 py-1 rounded text-xs font-mono">{staff.password}</span></td>
                                        <td className="px-4 py-3 text-center">
                                            <button onClick={() => deleteStaffUser(staff.id)} className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition" title="Hapus Staff">
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}

function CommissionReport({ salesData }) {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];

    const [startDate, setStartDate] = useState(firstDay);
    const [endDate, setEndDate] = useState(lastDay);

    const filteredData = salesData.filter(sale => sale.date >= startDate && sale.date <= endDate);

    const staffStats = {};
    filteredData.forEach(sale => {
        if (!staffStats[sale.staffName]) {
            staffStats[sale.staffName] = { totalSales: 0, salesPerDay: {} };
        }
        staffStats[sale.staffName].totalSales += sale.amount;

        if (!staffStats[sale.staffName].salesPerDay[sale.date]) {
            staffStats[sale.staffName].salesPerDay[sale.date] = 0;
        }
        staffStats[sale.staffName].salesPerDay[sale.date] += sale.amount;
    });

    const reportData = Object.keys(staffStats).map(staffName => {
        const stats = staffStats[staffName];
        const komisi = stats.totalSales * 0.10; 

        let bonus = 0;
        let daysReached = 0;

        Object.keys(stats.salesPerDay).forEach(date => {
            if (stats.salesPerDay[date] >= 1000000) {
                bonus += 50000; 
                daysReached += 1;
            }
        });

        return {
            staffName,
            totalSales: stats.totalSales,
            komisi,
            bonus,
            daysReached,
            totalPayout: komisi + bonus
        };
    });

    reportData.sort((a, b) => b.totalPayout - a.totalPayout);

    const grandTotalPayout = reportData.reduce((acc, curr) => acc + curr.totalPayout, 0);

    return (
        <div className="animate-in fade-in space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-800">Laporan Komisi & Bonus</h1>
                <p className="text-gray-500">Otomatis menghitung komisi 10% dan bonus harian (Rp 50rb per omzet ≥ 1Jt/hari).</p>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-wrap gap-4 items-end">
                <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Dari Tanggal</label>
                    <input type="date" value={startDate} onChange={e => setStartDate(setStartDate)} className="w-full border-gray-300 border px-3 py-2 rounded-lg text-sm" />
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Sampai Tanggal</label>
                    <input type="date" value={endDate} onChange={e => setEndDate(setEndDate)} className="w-full border-gray-300 border px-3 py-2 rounded-lg text-sm" />
                </div>
                <div className="ml-auto bg-green-50 px-4 py-2 rounded-lg border border-green-100">
                    <span className="text-xs text-green-700 font-semibold block">Estimasi Total Payout:</span>
                    <span className="text-xl font-bold text-green-600">Rp {grandTotalPayout.toLocaleString('id-ID')}</span>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-gray-600">
                        <thead className="bg-blue-900 text-white border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-4 font-semibold">Nama Staff</th>
                                <th className="px-6 py-4 font-semibold text-right">Total Omzet</th>
                                <th className="px-6 py-4 font-semibold text-right">Komisi (10%)</th>
                                <th className="px-6 py-4 font-semibold text-center">Tembus Target (Hari)</th>
                                <th className="px-6 py-4 font-semibold text-right">Bonus (50rb/hari)</th>
                                <th className="px-6 py-4 font-semibold text-right bg-blue-800">Total Dibayarkan</th>
                            </tr>
                        </thead>
                        <tbody>
                            {reportData.length === 0 ? (
                                <tr><td colSpan="6" className="text-center py-8 text-gray-400">Belum ada data penjualan pada rentang tanggal ini.</td></tr>
                            ) : reportData.map((data, index) => (
                                <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                                    <td className="px-6 py-4 font-bold text-gray-800">{data.staffName}</td>
                                    <td className="px-6 py-4 text-right">Rp {data.totalSales.toLocaleString('id-ID')}</td>
                                    <td className="px-6 py-4 text-right text-blue-600 font-medium">Rp {data.komisi.toLocaleString('id-ID')}</td>
                                    <td className="px-6 py-4 text-center">
                                        <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded-full text-xs font-bold">{data.daysReached}x</span>
                                    </td>
                                    <td className="px-6 py-4 text-right text-amber-600 font-medium">Rp {data.bonus.toLocaleString('id-ID')}</td>
                                    <td className="px-6 py-4 text-right font-bold text-green-600 bg-green-50/30">Rp {data.totalPayout.toLocaleString('id-ID')}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
