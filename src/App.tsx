// @ts-nocheck
import React, { useState, useEffect } from 'react';
import {
    MessageCircle, Star, XCircle, CheckCircle, FileText, Book,
    Heart, Edit, RefreshCw, GraduationCap, ZoomIn, Eye, Info,
    Lock, LayoutDashboard, LogOut, PlusCircle,
    DollarSign, TrendingUp, User, ShoppingBag, ArrowRight,
    Users, Trash2, Key, Award, Search, Filter, BarChart3, PieChart,
    Download, ChevronDown, ChevronUp, Package, Trophy
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, deleteDoc, doc, updateDoc } from 'firebase/firestore';

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
    const [catalogData, setCatalogData] = useState([]);
    const [expensesData, setExpensesData] = useState([]);

    // Menyimpan Session Cache Login
    useEffect(() => {
        const cachedUser = localStorage.getItem('sobatguru_session');
        if (cachedUser) {
            try {
                const parsedUser = JSON.parse(cachedUser);
                setCurrentUser(parsedUser);
                setCurrentView('dashboard');
            } catch (error) {
                localStorage.removeItem('sobatguru_session');
            }
        }
    }, []);

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
            const fetchedSales = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            fetchedSales.sort((a, b) => new Date(b.date) - new Date(a.date));
            setSalesData(fetchedSales);
        }, (error) => console.error("Firestore error:", error));

        const usersRef = collection(db, 'artifacts', appId, 'public', 'data', 'usersData');
        const unsubscribeUsers = onSnapshot(usersRef, (snapshot) => {
            const fetchedUsers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setUsersData(fetchedUsers);
        }, (error) => console.error("Firestore error:", error));

        const catalogRef = collection(db, 'artifacts', appId, 'public', 'data', 'catalogData');
        const unsubscribeCatalog = onSnapshot(catalogRef, (snapshot) => {
            const fetchedCatalog = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setCatalogData(fetchedCatalog);
        }, (error) => console.error("Firestore error:", error));

        const expensesRef = collection(db, 'artifacts', appId, 'public', 'data', 'expensesData');
        const unsubscribeExpenses = onSnapshot(expensesRef, (snapshot) => {
            const fetchedExpenses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            fetchedExpenses.sort((a, b) => new Date(b.date) - new Date(a.date));
            setExpensesData(fetchedExpenses);
        }, (error) => console.error("Firestore error:", error));

        return () => {
            unsubscribeSales();
            unsubscribeUsers();
            unsubscribeCatalog();
            unsubscribeExpenses();
        };
    }, [firebaseUser]);

    useEffect(() => {
        const style = document.createElement('style');
        style.innerHTML = `
      @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600;700&display=swap');
      body { font-family: 'Poppins', sans-serif; }
      .hero-bg { background: linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 58, 138, 0.9) 100%); position: relative; overflow: hidden; }
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
        localStorage.setItem('sobatguru_session', JSON.stringify(user));
        setCurrentView('dashboard');
    };

    const handleLogout = () => {
        setCurrentUser(null);
        localStorage.removeItem('sobatguru_session');
        setCurrentView('landing');
    };

    const addSale = async (newSale) => {
        if (!db) return alert("Sistem offline!");
        try { await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'salesData'), newSale); }
        catch (error) { alert("Gagal menyimpan data!"); }
    };
    const updateSale = async (saleId, updatedData) => {
        try { await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'salesData', saleId), updatedData); alert("Data Diperbarui!"); }
        catch (error) { alert("Gagal memperbarui!"); }
    };
    const deleteSale = async (saleId) => {
        if (window.confirm("Yakin hapus data ini permanen?")) {
            try { await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'salesData', saleId)); }
            catch (error) { alert("Gagal menghapus!"); }
        }
    };

    const addStaffUser = async (newUser) => {
        try { await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'usersData'), newUser); alert("Staff ditambahkan!"); }
        catch (error) { alert("Gagal menambah staff!"); }
    };
    const deleteStaffUser = async (userId) => {
        if (window.confirm("Yakin hapus staff ini?")) {
            try { await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'usersData', userId)); }
            catch (error) { alert("Gagal menghapus!"); }
        }
    };

    const addProduct = async (newProduct) => {
        try { await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'catalogData'), newProduct); alert("Produk ditambahkan ke katalog!"); }
        catch (error) { alert("Gagal menambah produk!"); }
    };
    const updateProduct = async (prodId, updatedData) => {
        try { await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'catalogData', prodId), updatedData); alert("Katalog Diperbarui!"); }
        catch (error) { alert("Gagal memperbarui katalog!"); }
    };
    const deleteProduct = async (prodId) => {
        if (window.confirm("Yakin hapus produk ini dari halaman depan?")) {
            try { await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'catalogData', prodId)); }
            catch (error) { alert("Gagal menghapus produk!"); }
        }
    };

    const addExpense = async (newExpense) => {
        if (!db) return alert("Sistem offline!");
        try { await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'expensesData'), newExpense); alert("Pengeluaran berhasil ditambahkan!"); }
        catch (error) { alert("Gagal menyimpan pengeluaran!"); }
    };
    const updateExpense = async (expenseId, updatedData) => {
        try { await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'expensesData', expenseId), updatedData); alert("Pengeluaran diperbarui!"); }
        catch (error) { alert("Gagal memperbarui pengeluaran!"); }
    };
    const deleteExpense = async (expenseId) => {
        if (window.confirm("Yakin hapus pengeluaran ini?")) {
            try { await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'expensesData', expenseId)); }
            catch (error) { alert("Gagal menghapus pengeluaran!"); }
        }
    };

    const addLead = async (leadData) => {
        try { await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'leadsData'), leadData); }
        catch (error) { console.error(error); }
    };

    return (
        <div className="min-h-screen bg-gray-50 text-gray-800">
            {currentView === 'landing' && <LandingPage setView={setCurrentView} catalogData={catalogData} addLead={addLead} />}
            {currentView === 'login' && <LoginPage setView={setCurrentView} onLogin={handleLogin} usersData={usersData} />}
            {currentView === 'dashboard' && currentUser && (
                <Dashboard
                    user={currentUser}
                    onLogout={handleLogout}
                    salesData={salesData}
                    addSale={addSale}
                    updateSale={updateSale}
                    deleteSale={deleteSale}
                    usersData={usersData}
                    addStaffUser={addStaffUser}
                    deleteStaffUser={deleteStaffUser}
                    catalogData={catalogData}
                    addProduct={addProduct}
                    updateProduct={updateProduct}
                    deleteProduct={deleteProduct}
                    expensesData={expensesData}
                    addExpense={addExpense}
                    updateExpense={updateExpense}
                    deleteExpense={deleteExpense}
                />
            )}
        </div>
    );
}

// ---------------------- HALAMAN PUBLIK ----------------------

function LandingPage({ setView, catalogData, addLead }) {
    // 100% MENYIMPAN STATE ASLI + TAMBAHAN MODAL LEAD DAN FAQ
    const [pdfModal, setPdfModal] = useState({ isOpen: false, url: '', title: '' });
    const [leadModal, setLeadModal] = useState(false);
    const [leadForm, setLeadForm] = useState({ name: '', phone: '' });
    const [openFaq, setOpenFaq] = useState(null);

    const redirectWA = (customMessage) => {
        const waNumbers = ['+6287781601968', '+6287822186229', '+6285724043082'];
        const message = customMessage || "Halo Admin, saya ingin bertanya tentang produknya...";
        const selectedNumber = waNumbers[Math.floor(Math.random() * waNumbers.length)];
        window.open(`https://api.whatsapp.com/send?phone=${selectedNumber}&text=${encodeURIComponent(message)}`, '_blank');
    };

    const openPdfModal = (url, title) => setPdfModal({ isOpen: true, url, title });
    const closePdfModal = () => setPdfModal({ isOpen: false, url: '', title: '' });

    const handleLeadSubmit = (e) => {
        e.preventDefault();
        addLead({ ...leadForm, date: new Date().toISOString() });
        setLeadModal(false);
        alert("Terima kasih! Link sampel modul telah kami kirimkan ke WhatsApp Anda (Simulasi).");
        setLeadForm({ name: '', phone: '' });
    };

    const faqs = [
        { q: "Apakah file modul ini bisa diedit?", a: "Ya, 100% bisa diedit! Format file yang kami berikan adalah Ms. Word (DOCX) sehingga Bapak/Ibu tinggal mengganti nama sekolah dan identitas guru." },
        { q: "Apakah sudah sesuai CP 046 dan KMA terbaru?", a: "Sangat sesuai. Modul kami selalu diupdate mengikuti rilis kurikulum dari Kemdikbudristek (CP 046) dan Kemenag (KMA 3302)." },
        { q: "Bagaimana cara pengiriman file-nya?", a: "Setelah konfirmasi pembayaran, link Google Drive berisi seluruh folder perangkat ajar akan langsung dikirimkan ke WhatsApp Bapak/Ibu dalam hitungan menit." }
    ];

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
                    {/* BAGIAN TOMBOL DIPERBARUI AGAR BISA UNDUH SAMPEL TANPA MENGUBAH DESAIN LAMA */}
                    <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
                        <button onClick={() => redirectWA('Halo Admin, saya mau order Modul Deeplearning')}
                            className="cta-pulse bg-yellow-500 hover:bg-yellow-400 text-blue-900 font-bold py-4 px-8 rounded-full text-xl shadow-lg transition transform hover:scale-105 inline-flex items-center cursor-pointer border-none">
                            <MessageCircle size={24} className="mr-2" /> HUBUNGI KAMI SEKARANG
                        </button>
                        <button onClick={() => setLeadModal(true)}
                            className="bg-white/20 hover:bg-white/30 backdrop-blur text-white border border-white/40 font-bold py-4 px-8 rounded-full text-xl shadow-lg transition transform hover:scale-105 inline-flex items-center cursor-pointer">
                            <Download size={24} className="mr-2" /> Unduh Sampel Gratis
                        </button>
                    </div>
                </div>
            </header>

            {/* SEKSI MASALAH GURU - 100% ASLI DARI PROMPT PERTAMA */}
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

            {/* SEKSI APA YANG ANDA DAPATKAN - 100% ASLI DARI PROMPT PERTAMA */}
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

            {/* SEKSI BARU: KATALOG PRODUK DINAMIS DARI ADMIN */}
            <section className="py-16 px-4 bg-white">
                <div className="max-w-5xl mx-auto">
                    <div className="text-center mb-12">
                        <span className="text-blue-600 font-bold text-sm tracking-widest uppercase bg-blue-100 px-3 py-1 rounded-full">Katalog Produk</span>
                        <h2 className="text-3xl md:text-4xl font-extrabold text-gray-800 mt-3">Pilihan Paket Modul Ajar</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {(catalogData.length > 0 ? catalogData : [
                            { id: 1, name: "Modul Lengkap SD", jenjang: "SD/MI", desc: "Kelas 1-6 Lengkap Prota, Prosem, LKPD, ATP", price: 150000 },
                            { id: 2, name: "Modul Lengkap SMP", jenjang: "SMP/MTs", desc: "Kelas 7-9 Lengkap dengan Rubrik Penilaian", price: 150000 }
                        ]).map(item => (
                            <div key={item.id} className="bg-gray-50 rounded-2xl shadow-md border border-gray-100 overflow-hidden flex flex-col transition hover:shadow-xl">
                                <div className="bg-blue-900 p-4 text-center border-b-4 border-yellow-500">
                                    <span className="inline-block bg-blue-800 text-blue-100 text-[10px] font-bold px-2 py-0.5 rounded-full mb-2 uppercase">{item.jenjang}</span>
                                    <h3 className="text-xl font-bold text-white">{item.name}</h3>
                                </div>
                                <div className="p-6 flex-grow flex flex-col">
                                    <p className="text-gray-600 text-sm flex-grow mb-6">{item.desc}</p>
                                    <div className="border-t border-gray-100 pt-4 flex justify-between items-center">
                                        <span className="text-sm text-gray-500">Harga:</span>
                                        <span className="text-xl font-bold text-green-600">Rp {Number(item.price).toLocaleString('id-ID')}</span>
                                    </div>
                                    <button onClick={() => redirectWA(`Halo Admin, saya mau pesan ${item.name}`)} className="mt-4 w-full bg-blue-100 hover:bg-blue-200 text-blue-700 font-bold py-2 rounded-xl transition text-sm flex justify-center items-center gap-2">
                                        <ShoppingBag size={16} /> Pesan Sekarang
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* SEKSI INTIP PDF - 100% ASLI DARI PROMPT PERTAMA */}
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

            {/* SEKSI TESTIMONI - 100% ASLI DARI PROMPT PERTAMA */}
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

            {/* SEKSI BARU: FAQ */}
            <section className="py-16 px-4 bg-blue-50 border-t border-blue-100">
                <div className="max-w-3xl mx-auto">
                    <h2 className="text-3xl font-bold text-center text-blue-900 mb-10">Pertanyaan Sering Diajukan (FAQ)</h2>
                    <div className="space-y-3">
                        {faqs.map((faq, idx) => (
                            <div key={idx} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                                <button onClick={() => setOpenFaq(openFaq === idx ? null : idx)} className="w-full px-6 py-4 text-left font-bold text-gray-800 flex justify-between items-center hover:bg-gray-50 focus:outline-none">
                                    <span>{faq.q}</span>
                                    {openFaq === idx ? <ChevronUp size={20} className="text-blue-500" /> : <ChevronDown size={20} className="text-gray-400" />}
                                </button>
                                {openFaq === idx && <div className="px-6 pb-4 pt-1 text-gray-600 text-sm animate-in slide-in-from-top-2">{faq.a}</div>}
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* FOOTER & TOMBOL WA ASLI DARI PROMPT PERTAMA */}
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

            {/* MODAL PDF - 100% ASLI DARI PROMPT PERTAMA */}
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
                                <XCircle size={20} />
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

            {/* MODAL BARU: LEAD MAGNET */}
            {leadModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setLeadModal(false)}></div>
                    <div className="relative bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 z-10 animate-in zoom-in-95">
                        <button onClick={() => setLeadModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><XCircle size={20} /></button>
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-3"><Download size={32} /></div>
                            <h3 className="text-xl font-bold text-gray-800">Unduh Sampel Modul</h3>
                            <p className="text-sm text-gray-500 mt-1">Kami akan mengirimkan link Google Drive sampel modul langsung ke WhatsApp Anda.</p>
                        </div>
                        <form onSubmit={handleLeadSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">Nama Lengkap</label>
                                <input type="text" required value={leadForm.name} onChange={e => setLeadForm({ ...leadForm, name: e.target.value })} className="w-full border px-3 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none" placeholder="Bpk/Ibu Guru..." />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">Nomor WhatsApp Aktif</label>
                                <input type="text" required value={leadForm.phone} onChange={e => setLeadForm({ ...leadForm, phone: e.target.value })} className="w-full border px-3 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none" placeholder="08123456789" />
                            </div>
                            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-md transition text-sm">Kirim Link ke WhatsApp Saya</button>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}

// ---------------------- HALAMAN LOGIN ----------------------

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
                    <h2 className="text-2xl font-bold text-white">Portal HRIS & Admin</h2>
                    <p className="text-blue-200 text-sm">Sobat Guru Digital</p>
                </div>
                <div className="p-8">
                    {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4 border border-red-200">{error}</div>}
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                            <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} required className="w-full border-gray-300 border px-4 py-2 rounded-lg" placeholder="Masukkan username" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full border-gray-300 border px-4 py-2 rounded-lg" placeholder="••••••••" />
                        </div>
                        <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg shadow-md transition flex justify-center items-center gap-2">
                            Masuk Dashboard <ArrowRight size={18} />
                        </button>
                    </form>
                </div>
            </div>
            <button onClick={() => setView('landing')} className="mt-6 text-gray-500 hover:text-blue-600 font-medium text-sm flex items-center gap-1">&larr; Kembali ke Website</button>
        </div>
    );
}

// ---------------------- DASHBOARD (INTERNAL) ----------------------

function Dashboard({ user, onLogout, salesData, addSale, updateSale, deleteSale, usersData, addStaffUser, deleteStaffUser, catalogData, addProduct, updateProduct, deleteProduct, expensesData, addExpense, updateExpense, deleteExpense }) {
    const [activeTab, setActiveTab] = useState(user.role === 'staff' ? 'input' : 'overview');

    return (
        <div className="flex h-screen bg-gray-100 overflow-hidden">
            <div className="w-64 bg-blue-900 text-white flex flex-col hidden md:flex">
                <div className="p-6 text-center border-b border-blue-800">
                    <div className="w-16 h-16 bg-white/10 rounded-full mx-auto flex items-center justify-center mb-3"><User size={32} className="text-yellow-400" /></div>
                    <h3 className="font-bold text-lg truncate px-2">{user.name}</h3>
                    <span className="bg-blue-800 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider text-blue-200">{user.role} Role</span>
                </div>

                <nav className="flex-grow p-4 space-y-2 overflow-y-auto">
                    {user.role === 'admin' && (
                        <>
                            <div className="text-[10px] font-bold text-blue-400 uppercase tracking-wider mb-2 mt-2 px-2">Keuangan & Performa</div>
                            <SidebarBtn icon={<LayoutDashboard />} label="Overview Bisnis" active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} />
                            <SidebarBtn icon={<DollarSign />} label="Laporan Finansial" active={activeTab === 'all_sales'} onClick={() => setActiveTab('all_sales')} />
                            <SidebarBtn icon={<Award />} label="Penggajian Komisi" active={activeTab === 'commission'} onClick={() => setActiveTab('commission')} />
                            <SidebarBtn icon={<Trophy />} label="Leaderboard Sales" active={activeTab === 'leaderboard'} onClick={() => setActiveTab('leaderboard')} />

                            <div className="text-[10px] font-bold text-blue-400 uppercase tracking-wider mb-2 mt-6 px-2">Manajemen Konten</div>
                            <SidebarBtn icon={<Package />} label="Katalog Landing Page" active={activeTab === 'manage_catalog'} onClick={() => setActiveTab('manage_catalog')} />
                            <SidebarBtn icon={<Users />} label="Manajemen Staff" active={activeTab === 'manage_staff'} onClick={() => setActiveTab('manage_staff')} />
                        </>
                    )}
                    {user.role === 'staff' && (
                        <>
                            <SidebarBtn icon={<PlusCircle />} label="Input Closingan" active={activeTab === 'input'} onClick={() => setActiveTab('input')} />
                            <SidebarBtn icon={<ShoppingBag />} label="Riwayat Penjualan" active={activeTab === 'my_sales'} onClick={() => setActiveTab('my_sales')} />
                        </>
                    )}
                </nav>
                <div className="p-4 border-t border-blue-800">
                    <button onClick={onLogout} className="w-full flex items-center justify-center gap-2 text-blue-200 hover:text-white hover:bg-red-500/20 px-4 py-2 rounded-lg transition"><LogOut size={16} /> Keluar</button>
                </div>
            </div>

            <div className="flex-grow overflow-y-auto">
                <main className="p-4 md:p-8">
                    {user.role === 'admin' && activeTab === 'overview' && <AdminOverview salesData={salesData} expensesData={expensesData} />}
                    {user.role === 'admin' && activeTab === 'all_sales' && (
                        <SalesTable
                            data={salesData}
                            title="Laporan Keuangan Interaktif"
                            showFilters={true}
                            isAdmin={true}
                            updateSale={updateSale}
                            deleteSale={deleteSale}
                            expensesData={expensesData}
                            addExpense={addExpense}
                            updateExpense={updateExpense}
                            deleteExpense={deleteExpense}
                        />
                    )}
                    {user.role === 'admin' && activeTab === 'commission' && <CommissionReport salesData={salesData} />}
                    {user.role === 'admin' && activeTab === 'leaderboard' && <Leaderboard salesData={salesData} />}
                    {user.role === 'admin' && activeTab === 'manage_catalog' && <ManageCatalog catalogData={catalogData} addProduct={addProduct} updateProduct={updateProduct} deleteProduct={deleteProduct} />}
                    {user.role === 'admin' && activeTab === 'manage_staff' && <ManageStaff usersData={usersData} addStaffUser={addStaffUser} deleteStaffUser={deleteStaffUser} />}

                    {user.role === 'staff' && activeTab === 'input' && <StaffInputForm addSale={addSale} userName={user.name} setTab={setActiveTab} catalogData={catalogData} />}
                    {user.role === 'staff' && activeTab === 'my_sales' && <SalesTable data={salesData.filter(s => s.staffName === user.name)} title="Riwayat Penjualan Saya" showFilters={false} isAdmin={false} />}
                </main>
            </div>
        </div>
    );
}

function SidebarBtn({ icon, label, active, onClick }) {
    return (
        <button onClick={onClick} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm ${active ? 'bg-blue-600 text-white shadow' : 'text-blue-200 hover:bg-blue-800 hover:text-white'}`}>
            {React.cloneElement(icon, { size: 18 })}
            <span className="font-medium">{label}</span>
        </button>
    );
}

// ---------------- ADMIN COMPONENTS ----------------

function AdminOverview({ salesData, expensesData }) {
    // 1. Calculate General Financial Figures
    const totalRevenue = salesData.reduce((acc, curr) => acc + curr.amount, 0);

    // Calculate staff commissions & bonuses for all sales
    const staffDailySales = {};
    let totalCommissionCost = 0;
    let totalBonusCost = 0;

    salesData.forEach(sale => {
        totalCommissionCost += sale.amount * 0.10;
        const dayKey = `${sale.staffName}_${sale.date}`;
        if (!staffDailySales[dayKey]) staffDailySales[dayKey] = 0;
        staffDailySales[dayKey] += sale.amount;
    });

    Object.values(staffDailySales).forEach(dailyAmount => {
        if (dailyAmount >= 1000000) {
            const multipliers = Math.floor(dailyAmount / 1000000);
            totalBonusCost += 50000 * multipliers;
        }
    });

    const totalCommissionExpenses = totalCommissionCost + totalBonusCost;
    const totalOperationalExpenses = expensesData.reduce((acc, curr) => acc + curr.amount, 0);
    const totalExpenses = totalOperationalExpenses + totalCommissionExpenses;
    const totalNetProfit = totalRevenue - totalExpenses;

    // 2. Daily Trends Calculations (Last 15 Days)
    const last15Days = [];
    for (let i = 14; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateString = d.toISOString().split('T')[0];
        last15Days.push(dateString);
    }

    const dailyStats = last15Days.map(date => {
        const revenue = salesData.filter(s => s.date === date).reduce((acc, curr) => acc + curr.amount, 0);
        const opExpenses = expensesData.filter(e => e.date === date).reduce((acc, curr) => acc + curr.amount, 0);

        const salesOnDay = salesData.filter(s => s.date === date);
        let dayCommission = 0;
        let dayBonus = 0;
        const staffSalesOnDay = {};
        salesOnDay.forEach(sale => {
            dayCommission += sale.amount * 0.10;
            if (!staffSalesOnDay[sale.staffName]) staffSalesOnDay[sale.staffName] = 0;
            staffSalesOnDay[sale.staffName] += sale.amount;
        });
        Object.values(staffSalesOnDay).forEach(amt => {
            if (amt >= 1000000) {
                dayBonus += 50000 * Math.floor(amt / 1000000);
            }
        });

        const expenses = opExpenses + dayCommission + dayBonus;
        const profit = revenue - expenses;
        return { date, revenue, expenses, profit };
    });

    // 3. Monthly Trends Calculations (Last 6 Months)
    const last6Months = [];
    for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const monthString = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        last6Months.push(monthString);
    }

    const monthlyStats = last6Months.map(month => {
        const revenue = salesData.filter(s => s.date.startsWith(month)).reduce((acc, curr) => acc + curr.amount, 0);
        const opExpenses = expensesData.filter(e => e.date.startsWith(month)).reduce((acc, curr) => acc + curr.amount, 0);

        const salesInMonth = salesData.filter(s => s.date.startsWith(month));
        let monthCommission = 0;
        let monthBonus = 0;
        const staffDailySalesInMonth = {};
        salesInMonth.forEach(sale => {
            monthCommission += sale.amount * 0.10;
            const dayKey = `${sale.staffName}_${sale.date}`;
            if (!staffDailySalesInMonth[dayKey]) staffDailySalesInMonth[dayKey] = 0;
            staffDailySalesInMonth[dayKey] += sale.amount;
        });
        Object.values(staffDailySalesInMonth).forEach(amt => {
            if (amt >= 1000000) {
                monthBonus += 50000 * Math.floor(amt / 1000000);
            }
        });

        const expenses = opExpenses + monthCommission + monthBonus;
        const profit = revenue - expenses;

        const [year, m] = month.split('-');
        const monthName = new Date(year, parseInt(m) - 1).toLocaleString('id-ID', { month: 'short' });

        return { month, label: `${monthName} ${year}`, revenue, expenses, profit };
    });

    // Toggle daily vs monthly chart view
    const [chartPeriod, setChartPeriod] = useState('daily'); // 'daily' | 'monthly'

    // Grouping by Best Selling Products
    const productStats = {};
    salesData.forEach(sale => {
        const prod = sale.product || 'Modul Lainnya';
        if (!productStats[prod]) productStats[prod] = { count: 0, revenue: 0 };
        productStats[prod].count += 1;
        productStats[prod].revenue += sale.amount;
    });
    const bestSelling = Object.keys(productStats)
        .map(name => ({ name, ...productStats[name] }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

    // Grouping Expenses by Category
    const categoryStats = {
        'Komisi & Gaji': totalCommissionExpenses,
        'Operasional': 0,
        'Marketing': 0,
        'Lain-lain': 0
    };
    expensesData.forEach(exp => {
        const cat = exp.category || 'Lain-lain';
        if (categoryStats[cat] !== undefined) {
            categoryStats[cat] += exp.amount;
        } else {
            categoryStats['Lain-lain'] += exp.amount;
        }
    });

    // Chart SVG calculations
    const getDailyChartPoints = () => {
        if (dailyStats.length === 0) return { rev: '', prof: '' };
        const maxVal = Math.max(...dailyStats.map(s => Math.max(s.revenue, s.profit)), 100000);
        const width = 800;
        const height = 200;
        const padding = 20;

        const pointsRev = dailyStats.map((s, idx) => {
            const x = padding + (idx * (width - padding * 2)) / (dailyStats.length - 1);
            const y = height - padding - (s.revenue * (height - padding * 2)) / maxVal;
            return `${x},${y}`;
        }).join(' ');

        const pointsProf = dailyStats.map((s, idx) => {
            const x = padding + (idx * (width - padding * 2)) / (dailyStats.length - 1);
            const y = height - padding - (s.profit * (height - padding * 2)) / maxVal;
            return `${x},${y}`;
        }).join(' ');

        return { pointsRev, pointsProf, maxVal };
    };

    const dailyPoints = getDailyChartPoints();

    return (
        <div className="space-y-6 animate-in fade-in">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-800 tracking-tight">Overview Bisnis Owner</h1>
                    <p className="text-gray-500 text-sm mt-1">Pantau perolehan omzet, pengeluaran operasional, dan keuntungan bersih real-time.</p>
                </div>
                <div className="bg-white border rounded-xl shadow-sm p-1.5 flex gap-1.5 self-stretch sm:self-auto">
                    <button
                        onClick={() => setChartPeriod('daily')}
                        className={`flex-1 sm:flex-none text-xs font-semibold py-2 px-4 rounded-lg transition-all ${chartPeriod === 'daily' ? 'bg-blue-600 text-white shadow' : 'text-gray-600 hover:bg-gray-50'}`}
                    >
                        Harian (15 Hari)
                    </button>
                    <button
                        onClick={() => setChartPeriod('monthly')}
                        className={`flex-1 sm:flex-none text-xs font-semibold py-2 px-4 rounded-lg transition-all ${chartPeriod === 'monthly' ? 'bg-blue-600 text-white shadow' : 'text-gray-600 hover:bg-gray-50'}`}
                    >
                        Bulanan (6 Bulan)
                    </button>
                </div>
            </div>

            {/* Core Financial Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Revenue Card */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between hover:shadow-md transition">
                    <div className="space-y-2">
                        <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Total Omzet (Revenue)</p>
                        <h3 className="text-2xl font-black text-gray-800">Rp {totalRevenue.toLocaleString('id-ID')}</h3>
                        <p className="text-[11px] text-green-500 font-medium flex items-center gap-1">
                            <span className="bg-green-50 px-2 py-0.5 rounded-full">Bruto</span>
                            <span>Total penjualan modul</span>
                        </p>
                    </div>
                    <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shadow-inner"><DollarSign size={28} /></div>
                </div>

                {/* Expenses Card */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between hover:shadow-md transition">
                    <div className="space-y-2">
                        <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Total Pengeluaran</p>
                        <h3 className="text-2xl font-black text-red-600">Rp {totalExpenses.toLocaleString('id-ID')}</h3>
                        <div className="text-[10px] text-gray-500 space-y-0.5 font-medium">
                            <div className="flex justify-between gap-4">
                                <span>Operasional & Ads:</span>
                                <span className="font-bold">Rp {totalOperationalExpenses.toLocaleString('id-ID')}</span>
                            </div>
                            <div className="flex justify-between gap-4">
                                <span>Komisi & Gaji Staff:</span>
                                <span className="font-bold">Rp {totalCommissionExpenses.toLocaleString('id-ID')}</span>
                            </div>
                        </div>
                    </div>
                    <div className="w-14 h-14 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center shadow-inner"><DollarSign size={28} className="rotate-180" /></div>
                </div>

                {/* Net Profit Card */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between hover:shadow-md transition">
                    <div className="space-y-2">
                        <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Keuntungan Bersih (Profit)</p>
                        <h3 className={`text-2xl font-black ${totalNetProfit >= 0 ? 'text-green-600' : 'text-rose-600'}`}>
                            Rp {totalNetProfit.toLocaleString('id-ID')}
                        </h3>
                        <p className="text-[11px] text-blue-500 font-medium flex items-center gap-1">
                            <span className="bg-blue-50 px-2 py-0.5 rounded-full">Netto</span>
                            <span>Omzet dikurangi pengeluaran</span>
                        </p>
                    </div>
                    <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shadow-inner"><TrendingUp size={28} /></div>
                </div>
            </div>

            {/* Visual Charts Section */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <TrendingUp size={20} className="text-blue-500" />
                    <span>Tren Performa Keuangan {chartPeriod === 'daily' ? 'Harian' : 'Bulanan'}</span>
                </h3>

                {chartPeriod === 'daily' ? (
                    /* DAILY CHART */
                    <div className="space-y-4">
                        <div className="flex flex-wrap gap-4 text-xs font-semibold justify-end">
                            <div className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 bg-blue-600 rounded-sm"></span> Omzet (Revenue)</div>
                            <div className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 bg-green-500 rounded-sm"></span> Keuntungan Bersih (Profit)</div>
                        </div>

                        <div className="relative w-full h-64 border rounded-xl p-4 bg-gray-50 flex flex-col justify-between overflow-x-auto">
                            {dailyStats.length === 0 ? (
                                <div className="flex-grow flex items-center justify-center text-gray-400 text-sm">Belum ada data transaksi harian.</div>
                            ) : (
                                <div className="w-[800px] mx-auto flex-grow flex flex-col justify-between relative">
                                    <svg viewBox="0 0 800 200" className="w-full h-44 overflow-visible">
                                        {/* Grid lines */}
                                        <line x1="20" y1="20" x2="780" y2="20" stroke="#e5e7eb" strokeDasharray="4" />
                                        <line x1="20" y1="100" x2="780" y2="100" stroke="#e5e7eb" strokeDasharray="4" />
                                        <line x1="20" y1="180" x2="780" y2="180" stroke="#e5e7eb" strokeDasharray="4" />

                                        {/* Revenue Line */}
                                        <polyline
                                            fill="none"
                                            stroke="#2563eb"
                                            strokeWidth="3.5"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            points={dailyPoints.pointsRev}
                                        />

                                        {/* Profit Line */}
                                        <polyline
                                            fill="none"
                                            stroke="#10b981"
                                            strokeWidth="3.5"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            points={dailyPoints.pointsProf}
                                        />

                                        {/* Nodes */}
                                        {dailyStats.map((s, idx) => {
                                            const width = 800;
                                            const height = 200;
                                            const padding = 20;
                                            const x = padding + (idx * (width - padding * 2)) / (dailyStats.length - 1);
                                            const yRev = height - padding - (s.revenue * (height - padding * 2)) / dailyPoints.maxVal;
                                            const yProf = height - padding - (s.profit * (height - padding * 2)) / dailyPoints.maxVal;

                                            return (
                                                <g key={idx} className="group cursor-pointer">
                                                    {/* Revenue node */}
                                                    <circle cx={x} cy={yRev} r="5" fill="#2563eb" stroke="#ffffff" strokeWidth="2" />
                                                    <circle cx={x} cy={yRev} r="8" fill="#2563eb" className="opacity-0 group-hover:opacity-20 transition" />

                                                    {/* Profit node */}
                                                    <circle cx={x} cy={yProf} r="5" fill="#10b981" stroke="#ffffff" strokeWidth="2" />
                                                    <circle cx={x} cy={yProf} r="8" fill="#10b981" className="opacity-0 group-hover:opacity-20 transition" />
                                                </g>
                                            );
                                        })}
                                    </svg>

                                    {/* Dates labels */}
                                    <div className="flex justify-between px-[20px] text-[10px] text-gray-500 font-bold border-t pt-2">
                                        {dailyStats.map((s, idx) => {
                                            const [_, m, d] = s.date.split('-');
                                            return <span key={idx} className="w-12 text-center">{d}/{m}</span>;
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    /* MONTHLY CHART */
                    <div className="space-y-4 animate-in fade-in duration-250">
                        <div className="flex flex-wrap gap-4 text-xs font-semibold justify-end">
                            <div className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 bg-blue-600 rounded-sm"></span> Omzet (Revenue)</div>
                            <div className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 bg-rose-500 rounded-sm"></span> Pengeluaran (Expenses)</div>
                            <div className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 bg-emerald-500 rounded-sm"></span> Laba Bersih (Profit)</div>
                        </div>

                        <div className="relative w-full h-64 border rounded-xl p-4 bg-gray-50 flex items-end justify-between overflow-x-auto gap-4">
                            {monthlyStats.length === 0 ? (
                                <div className="flex-grow flex items-center justify-center text-gray-400 text-sm">Belum ada data bulanan.</div>
                            ) : (
                                monthlyStats.map((m, idx) => {
                                    const maxVal = Math.max(...monthlyStats.map(s => Math.max(s.revenue, s.expenses, s.profit)), 100000);
                                    const heightRev = (m.revenue / maxVal) * 140;
                                    const heightExp = (m.expenses / maxVal) * 140;
                                    const heightProf = (Math.max(m.profit, 0) / maxVal) * 140;

                                    return (
                                        <div key={idx} className="flex-1 min-w-[80px] flex flex-col items-center gap-2 group">
                                            {/* Columns */}
                                            <div className="w-full flex items-end justify-center gap-1.5 h-36 border-b pb-1">
                                                {/* Revenue Bar */}
                                                <div
                                                    style={{ height: `${Math.max(heightRev, 4)}px` }}
                                                    className="w-4 bg-blue-600 hover:bg-blue-700 transition rounded-t-sm shadow-sm relative group-hover:scale-105"
                                                    title={`Omzet: Rp ${m.revenue.toLocaleString('id-ID')}`}
                                                ></div>
                                                {/* Expenses Bar */}
                                                <div
                                                    style={{ height: `${Math.max(heightExp, 4)}px` }}
                                                    className="w-4 bg-rose-500 hover:bg-rose-600 transition rounded-t-sm shadow-sm relative group-hover:scale-105"
                                                    title={`Pengeluaran: Rp ${m.expenses.toLocaleString('id-ID')}`}
                                                ></div>
                                                {/* Profit Bar */}
                                                <div
                                                    style={{ height: `${Math.max(heightProf, 4)}px` }}
                                                    className="w-4 bg-emerald-500 hover:bg-emerald-600 transition rounded-t-sm shadow-sm relative group-hover:scale-105"
                                                    title={`Profit: Rp ${m.profit.toLocaleString('id-ID')}`}
                                                ></div>
                                            </div>

                                            {/* Label */}
                                            <span className="text-[10px] text-gray-500 font-bold whitespace-nowrap">{m.label}</span>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Bottom 2-Column Analytics Widgets Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Product Performance Card */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col animate-in slide-in-from-bottom duration-300">
                    <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <BarChart3 size={20} className="text-blue-500" />
                        <span>Penjualan Paket Modul Terbaik</span>
                    </h3>
                    <div className="flex-grow flex flex-col justify-center">
                        {bestSelling.length === 0 ? (
                            <p className="text-gray-400 text-sm text-center py-8">Belum ada modul terjual.</p>
                        ) : (
                            <div className="space-y-4">
                                {bestSelling.map((prod, idx) => (
                                    <div key={idx} className="flex items-center justify-between border-b last:border-0 pb-2 last:pb-0">
                                        <div className="space-y-1">
                                            <span className="text-sm font-bold text-gray-800">{prod.name}</span>
                                            <p className="text-xs text-gray-400 font-medium">{prod.count} Paket Terjual</p>
                                        </div>
                                        <span className="text-sm font-black text-green-600">Rp {prod.revenue.toLocaleString('id-ID')}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Expenses Categorization Card */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col animate-in slide-in-from-bottom duration-300">
                    <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <PieChart size={20} className="text-blue-500" />
                        <span>Alokasi Biaya Pengeluaran</span>
                    </h3>
                    <div className="flex-grow flex flex-col justify-center space-y-4">
                        {totalExpenses === 0 ? (
                            <p className="text-gray-400 text-sm text-center py-8">Belum ada pengeluaran dicatat.</p>
                        ) : (
                            Object.keys(categoryStats).map((cat, idx) => {
                                const amount = categoryStats[cat];
                                const percentage = totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0;
                                const barColors = [
                                    'bg-purple-500', // Gaji
                                    'bg-blue-500',   // Operasional
                                    'bg-rose-500',   // Marketing
                                    'bg-gray-400'    // Lain-lain
                                ];

                                return (
                                    <div key={idx} className="space-y-1.5">
                                        <div className="flex justify-between text-xs font-bold text-gray-700">
                                            <span>{cat}</span>
                                            <span>Rp {amount.toLocaleString('id-ID')} ({percentage.toFixed(1)}%)</span>
                                        </div>
                                        <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                                            <div
                                                style={{ width: `${percentage}%` }}
                                                className={`h-full ${barColors[idx]} rounded-full`}
                                            ></div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function SalesTable({
    data,
    title,
    showFilters,
    isAdmin,
    updateSale,
    deleteSale,
    expensesData = [],
    addExpense,
    updateExpense,
    deleteExpense
}) {
    const [subTab, setSubTab] = useState('cash_flow'); // 'cash_flow' | 'sales' | 'expenses'
    const [cashFlowPeriod, setCashFlowPeriod] = useState('daily'); // 'daily' | 'monthly'

    // Sales filters
    const [filterStaff, setFilterStaff] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({ date: '', customer: '', product: '', notes: '', amount: 0 });

    // Expenses filters
    const [expenseCategoryFilter, setExpenseCategoryFilter] = useState('');
    const [expenseSearchQuery, setExpenseSearchQuery] = useState('');
    const [editingExpenseId, setEditingExpenseId] = useState(null);
    const [editExpenseForm, setEditExpenseForm] = useState({ date: '', category: 'Operasional', amount: 0, notes: '' });

    // Expense input form state
    const [newExpenseForm, setNewExpenseForm] = useState({
        date: new Date().toISOString().split('T')[0],
        category: 'Operasional',
        amount: '',
        notes: ''
    });

    const handleAddExpenseSubmit = (e) => {
        e.preventDefault();
        if (!addExpense) return;
        addExpense({
            date: newExpenseForm.date,
            category: newExpenseForm.category,
            amount: Number(newExpenseForm.amount),
            notes: newExpenseForm.notes
        });
        setNewExpenseForm({
            date: new Date().toISOString().split('T')[0],
            category: 'Operasional',
            amount: '',
            notes: ''
        });
    };

    const startEditExpense = (exp) => {
        setEditingExpenseId(exp.id);
        setEditExpenseForm({
            date: exp.date,
            category: exp.category || 'Operasional',
            amount: exp.amount,
            notes: exp.notes || ''
        });
    };

    const saveEditExpense = async (id) => {
        if (!updateExpense) return;
        await updateExpense(id, {
            ...editExpenseForm,
            amount: Number(editExpenseForm.amount)
        });
        setEditingExpenseId(null);
    };

    // Sales Filtering
    const filteredSales = data.filter(sale => {
        let matchStaff = filterStaff ? sale.staffName === filterStaff : true;
        let matchSearch = searchQuery ? sale.customer.toLowerCase().includes(searchQuery.toLowerCase()) : true;
        return matchStaff && matchSearch;
    });

    // Expenses Filtering
    const filteredExpenses = expensesData.filter(exp => {
        let matchCategory = expenseCategoryFilter ? exp.category === expenseCategoryFilter : true;
        let matchSearch = expenseSearchQuery ? (exp.notes || '').toLowerCase().includes(expenseSearchQuery.toLowerCase()) : true;
        return matchCategory && matchSearch;
    });

    // Calculate staff commissions & bonuses for all sales (needed for correct expense calculations)
    const getCommissionExpensesForDate = (dateString) => {
        const salesOnDay = data.filter(s => s.date === dateString);
        let commission = 0;
        let dayBonus = 0;
        const staffSales = {};
        salesOnDay.forEach(sale => {
            commission += sale.amount * 0.10;
            if (!staffSales[sale.staffName]) staffSales[sale.staffName] = 0;
            staffSales[sale.staffName] += sale.amount;
        });
        Object.values(staffSales).forEach(amt => {
            if (amt >= 1000000) {
                dayBonus += 50000 * Math.floor(amt / 1000000);
            }
        });
        return commission + dayBonus;
    };

    const getCommissionExpensesForMonth = (monthString) => {
        const salesInMonth = data.filter(s => s.date.startsWith(monthString));
        let commission = 0;
        let monthBonus = 0;
        const staffDailySales = {};
        salesInMonth.forEach(sale => {
            commission += sale.amount * 0.10;
            const dayKey = `${sale.staffName}_${sale.date}`;
            if (!staffDailySales[dayKey]) staffDailySales[dayKey] = 0;
            staffDailySales[dayKey] += sale.amount;
        });
        Object.values(staffDailySales).forEach(amt => {
            if (amt >= 1000000) {
                monthBonus += 50000 * Math.floor(amt / 1000000);
            }
        });
        return commission + monthBonus;
    };

    // Arus Kas - Daily Aggregation
    const allActiveDates = Array.from(new Set([
        ...data.map(s => s.date),
        ...expensesData.map(e => e.date)
    ])).sort((a, b) => new Date(b) - new Date(a));

    const dailyCashFlow = allActiveDates.map(date => {
        const revenue = data.filter(s => s.date === date).reduce((acc, curr) => acc + curr.amount, 0);
        const opExpenses = expensesData.filter(e => e.date === date).reduce((acc, curr) => acc + curr.amount, 0);
        const commissionExpenses = getCommissionExpensesForDate(date);
        const totalExp = opExpenses + commissionExpenses;
        const profit = revenue - totalExp;
        return { date, revenue, expenses: totalExp, profit };
    });

    // Arus Kas - Monthly Aggregation
    const allActiveMonths = Array.from(new Set([
        ...data.map(s => s.date.slice(0, 7)),
        ...expensesData.map(e => e.date.slice(0, 7))
    ])).sort((a, b) => new Date(b + '-02') - new Date(a + '-02')); // Sort months desc

    const monthlyCashFlow = allActiveMonths.map(month => {
        const revenue = data.filter(s => s.date.startsWith(month)).reduce((acc, curr) => acc + curr.amount, 0);
        const opExpenses = expensesData.filter(e => e.date.startsWith(month)).reduce((acc, curr) => acc + curr.amount, 0);
        const commissionExpenses = getCommissionExpensesForMonth(month);
        const totalExp = opExpenses + commissionExpenses;
        const profit = revenue - totalExp;

        const [year, m] = month.split('-');
        const monthName = new Date(year, parseInt(m) - 1).toLocaleString('id-ID', { month: 'long' });
        return { month, label: `${monthName} ${year}`, revenue, expenses: totalExp, profit };
    });

    // Sales Grid Inline Editing helpers
    const startEdit = (sale) => {
        setEditingId(sale.id);
        setEditForm({ date: sale.date, customer: sale.customer, product: sale.product, notes: sale.notes || '', amount: sale.amount });
    };

    const saveEdit = async (id) => {
        await updateSale(id, { ...editForm, amount: Number(editForm.amount) });
        setEditingId(null);
    };

    // If not Admin, just render a clean, read-only sales history table (for staff)
    if (!isAdmin) {
        return (
            <div className="space-y-4 animate-in fade-in">
                <h1 className="text-xl font-bold text-gray-800">{title}</h1>
                <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-gray-600">
                            <thead className="bg-gray-50 border-b">
                                <tr>
                                    <th className="px-4 py-3 font-semibold text-gray-700">Tanggal</th>
                                    <th className="px-4 py-3 font-semibold text-gray-700">Kustomer</th>
                                    <th className="px-4 py-3 font-semibold text-gray-700">Produk</th>
                                    <th className="px-4 py-3 font-semibold text-gray-700 text-right">Nominal</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredSales.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="text-center py-6 text-gray-400">Belum ada riwayat penjualan.</td>
                                    </tr>
                                ) : (
                                    filteredSales.map(sale => (
                                        <tr key={sale.id} className="border-b hover:bg-gray-50">
                                            <td className="px-4 py-3 whitespace-nowrap">{sale.date}</td>
                                            <td className="px-4 py-3 font-medium text-gray-800">{sale.customer}</td>
                                            <td className="px-4 py-3"><span className="bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full text-xs font-semibold">{sale.product}</span></td>
                                            <td className="px-4 py-3 text-right font-bold text-green-600">Rp {sale.amount.toLocaleString('id-ID')}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        );
    }

    // Otherwise, render full Owner Financial Portal (Multi-tabbed)
    return (
        <div className="space-y-6 animate-in fade-in">
            {/* Header and Sub-tabs selectors */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-800 tracking-tight">{title}</h1>
                    <p className="text-gray-500 text-sm mt-1">Kelola dan pantau seluruh transaksi masuk & keluar secara transparan.</p>
                </div>

                <div className="bg-gray-100 p-1 rounded-xl flex gap-1 self-stretch md:self-auto shadow-inner">
                    <button
                        onClick={() => setSubTab('cash_flow')}
                        className={`flex-1 md:flex-none text-xs font-bold py-2.5 px-4 rounded-lg transition-all ${subTab === 'cash_flow' ? 'bg-white text-blue-900 shadow' : 'text-gray-600 hover:text-gray-900'}`}
                    >
                        Buku Arus Kas
                    </button>
                    <button
                        onClick={() => setSubTab('sales')}
                        className={`flex-1 md:flex-none text-xs font-bold py-2.5 px-4 rounded-lg transition-all ${subTab === 'sales' ? 'bg-white text-blue-900 shadow' : 'text-gray-600 hover:text-gray-900'}`}
                    >
                        Pemasukan (Sales)
                    </button>
                    <button
                        onClick={() => setSubTab('expenses')}
                        className={`flex-1 md:flex-none text-xs font-bold py-2.5 px-4 rounded-lg transition-all ${subTab === 'expenses' ? 'bg-white text-blue-900 shadow' : 'text-gray-600 hover:text-gray-900'}`}
                    >
                        Pengeluaran (Operasional)
                    </button>
                </div>
            </div>

            {/* TAB CONTENT: CASH FLOW (ARUS KAS) */}
            {subTab === 'cash_flow' && (
                <div className="space-y-4 animate-in fade-in">
                    <div className="flex justify-between items-center bg-white p-4 rounded-xl border">
                        <span className="text-sm font-bold text-gray-700">Tampilan Periode Buku Kas:</span>
                        <div className="flex gap-2 bg-gray-150 p-1 rounded-lg">
                            <button
                                onClick={() => setCashFlowPeriod('daily')}
                                className={`text-xs font-semibold py-1 px-3 rounded ${cashFlowPeriod === 'daily' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'}`}
                            >
                                Harian
                            </button>
                            <button
                                onClick={() => setCashFlowPeriod('monthly')}
                                className={`text-xs font-semibold py-1 px-3 rounded ${cashFlowPeriod === 'monthly' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'}`}
                            >
                                Bulanan
                            </button>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
                        <div className="overflow-x-auto">
                            {cashFlowPeriod === 'daily' ? (
                                <table className="w-full text-left text-sm text-gray-600">
                                    <thead className="bg-gray-50 border-b">
                                        <tr>
                                            <th className="px-6 py-3.5 font-bold text-gray-700">Tanggal</th>
                                            <th className="px-6 py-3.5 font-bold text-gray-700 text-right">Pemasukan (Omzet)</th>
                                            <th className="px-6 py-3.5 font-bold text-gray-700 text-right">Pengeluaran (Total)</th>
                                            <th className="px-6 py-3.5 font-bold text-gray-700 text-right">Laba Bersih</th>
                                            <th className="px-6 py-3.5 font-bold text-gray-700 text-center">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {dailyCashFlow.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="text-center py-8 text-gray-400">Belum ada data kas harian.</td>
                                            </tr>
                                        ) : (
                                            dailyCashFlow.map((cf, idx) => (
                                                <tr key={idx} className="border-b hover:bg-gray-50/50">
                                                    <td className="px-6 py-4 font-bold text-gray-800">{cf.date}</td>
                                                    <td className="px-6 py-4 text-right font-semibold text-blue-600">Rp {cf.revenue.toLocaleString('id-ID')}</td>
                                                    <td className="px-6 py-4 text-right font-semibold text-rose-500">Rp {cf.expenses.toLocaleString('id-ID')}</td>
                                                    <td className={`px-6 py-4 text-right font-extrabold ${cf.profit >= 0 ? 'text-green-600' : 'text-rose-600'}`}>
                                                        Rp {cf.profit.toLocaleString('id-ID')}
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${cf.profit >= 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                                            {cf.profit >= 0 ? 'Untung' : 'Rugi'}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            ) : (
                                <table className="w-full text-left text-sm text-gray-600">
                                    <thead className="bg-gray-50 border-b">
                                        <tr>
                                            <th className="px-6 py-3.5 font-bold text-gray-700">Bulan</th>
                                            <th className="px-6 py-3.5 font-bold text-gray-700 text-right">Pemasukan (Omzet)</th>
                                            <th className="px-6 py-3.5 font-bold text-gray-700 text-right">Pengeluaran (Total)</th>
                                            <th className="px-6 py-3.5 font-bold text-gray-700 text-right">Laba Bersih</th>
                                            <th className="px-6 py-3.5 font-bold text-gray-700 text-center">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {monthlyCashFlow.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="text-center py-8 text-gray-400">Belum ada data kas bulanan.</td>
                                            </tr>
                                        ) : (
                                            monthlyCashFlow.map((cf, idx) => (
                                                <tr key={idx} className="border-b hover:bg-gray-50/50">
                                                    <td className="px-6 py-4 font-bold text-gray-800">{cf.label}</td>
                                                    <td className="px-6 py-4 text-right font-semibold text-blue-600">Rp {cf.revenue.toLocaleString('id-ID')}</td>
                                                    <td className="px-6 py-4 text-right font-semibold text-rose-500">Rp {cf.expenses.toLocaleString('id-ID')}</td>
                                                    <td className={`px-6 py-4 text-right font-extrabold ${cf.profit >= 0 ? 'text-green-600' : 'text-rose-600'}`}>
                                                        Rp {cf.profit.toLocaleString('id-ID')}
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${cf.profit >= 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                                            {cf.profit >= 0 ? 'Untung' : 'Rugi'}
                                                        </span>
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
            )}

            {/* TAB CONTENT: PEMASUKAN / SALES */}
            {subTab === 'sales' && (
                <div className="space-y-4 animate-in fade-in">
                    <div className="bg-white p-4 rounded-xl border flex flex-col md:flex-row gap-4 items-center justify-between">
                        <div className="w-full md:w-1/3 flex items-center bg-gray-50 border rounded-lg px-3 py-1.5 focus-within:ring-2 focus-within:ring-blue-500 bg-white">
                            <Search size={16} className="text-gray-400 mr-2" />
                            <input
                                type="text"
                                placeholder="Cari nama kustomer..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="bg-transparent border-none text-sm w-full focus:outline-none bg-white"
                            />
                        </div>

                        <div className="w-full md:w-auto flex gap-2 self-stretch md:self-auto bg-white">
                            <select
                                value={filterStaff}
                                onChange={e => setFilterStaff(e.target.value)}
                                className="w-full md:w-48 border px-3 py-2 rounded-lg text-sm bg-white"
                            >
                                <option value="">Semua Staff Sales</option>
                                {Array.from(new Set(data.map(s => s.staffName))).map((staff, i) => (
                                    <option key={i} value={staff}>{staff}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-gray-600">
                                <thead className="bg-gray-50 border-b">
                                    <tr>
                                        <th className="px-6 py-3.5 font-bold text-gray-700">Tanggal</th>
                                        <th className="px-6 py-3.5 font-bold text-gray-700">Staff Sales</th>
                                        <th className="px-6 py-3.5 font-bold text-gray-700">Kustomer</th>
                                        <th className="px-6 py-3.5 font-bold text-gray-700">Produk Modul</th>
                                        <th className="px-6 py-3.5 font-bold text-gray-700 text-right">Nominal</th>
                                        <th className="px-6 py-3.5 font-bold text-gray-700 text-center">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredSales.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="text-center py-8 text-gray-400">Tidak ada transaksi penjualan yang cocok.</td>
                                        </tr>
                                    ) : (
                                        filteredSales.map(sale => (
                                            <tr key={sale.id} className="border-b hover:bg-gray-50/50">
                                                {editingId === sale.id ? (
                                                    <>
                                                        <td className="px-6 py-3"><input type="date" value={editForm.date} onChange={e => setEditForm({ ...editForm, date: e.target.value })} className="border px-2 py-1 rounded w-full text-sm" /></td>
                                                        <td className="px-6 py-3 text-sm font-bold text-gray-800">{sale.staffName}</td>
                                                        <td className="px-6 py-3"><input type="text" value={editForm.customer} onChange={e => setEditForm({ ...editForm, customer: e.target.value })} className="border px-2 py-1 rounded w-full text-sm" /></td>
                                                        <td className="px-6 py-3"><input type="text" value={editForm.product} onChange={e => setEditForm({ ...editForm, product: e.target.value })} className="border px-2 py-1 rounded w-full text-sm" /></td>
                                                        <td className="px-6 py-3"><input type="number" value={editForm.amount} onChange={e => setEditForm({ ...editForm, amount: e.target.value })} className="border px-2 py-1 rounded w-full text-sm text-right font-bold" /></td>
                                                        <td className="px-6 py-3 text-center space-x-2 whitespace-nowrap">
                                                            <button onClick={() => saveEdit(sale.id)} className="bg-blue-600 text-white font-bold px-3 py-1.5 rounded-lg text-xs hover:bg-blue-700 transition">Simpan</button>
                                                            <button onClick={() => setEditingId(null)} className="bg-gray-400 text-white font-bold px-3 py-1.5 rounded-lg text-xs hover:bg-gray-500 transition">Batal</button>
                                                        </td>
                                                    </>
                                                ) : (
                                                    <>
                                                        <td className="px-6 py-4 whitespace-nowrap font-medium">{sale.date}</td>
                                                        <td className="px-6 py-4 font-bold text-blue-900">{sale.staffName}</td>
                                                        <td className="px-6 py-4 text-gray-800">{sale.customer}</td>
                                                        <td className="px-6 py-4"><span className="bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full text-xs font-semibold">{sale.product}</span></td>
                                                        <td className="px-6 py-4 text-right font-black text-green-600">Rp {sale.amount.toLocaleString('id-ID')}</td>
                                                        <td className="px-6 py-4 text-center space-x-3 whitespace-nowrap">
                                                            <button onClick={() => startEdit(sale)} className="text-blue-600 hover:text-blue-800 inline-block" title="Edit Transaksi"><Edit size={16} /></button>
                                                            <button onClick={() => deleteSale(sale.id)} className="text-red-500 hover:text-red-700 inline-block" title="Hapus Transaksi"><Trash2 size={16} /></button>
                                                        </td>
                                                    </>
                                                )}
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB CONTENT: OPERATIONAL EXPENSES (PENGELUARAN) */}
            {subTab === 'expenses' && (
                <div className="space-y-6 animate-in fade-in">
                    {/* Add Expense Form and Search Filters in a Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Record Expense Box */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-150 h-fit">
                            <h3 className="font-extrabold text-blue-950 text-base border-b pb-3 mb-4 flex items-center gap-2">
                                <PlusCircle size={20} className="text-blue-600" />
                                <span>Catat Pengeluaran Baru</span>
                            </h3>

                            <form onSubmit={handleAddExpenseSubmit} className="space-y-4">
                                <div className="space-y-1">
                                    <label className="block text-xs font-bold text-gray-600">Tanggal Pengeluaran</label>
                                    <input
                                        required
                                        type="date"
                                        value={newExpenseForm.date}
                                        onChange={e => setNewExpenseForm({ ...newExpenseForm, date: e.target.value })}
                                        className="w-full border px-3 py-2 rounded-lg text-sm bg-gray-50"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="block text-xs font-bold text-gray-600">Kategori Biaya</label>
                                    <select
                                        value={newExpenseForm.category}
                                        onChange={e => setNewExpenseForm({ ...newExpenseForm, category: e.target.value })}
                                        className="w-full border px-3 py-2 rounded-lg text-sm bg-white animate-in"
                                    >
                                        <option value="Operasional">Operasional</option>
                                        <option value="Marketing">Marketing</option>
                                        <option value="Gaji">Gaji</option>
                                        <option value="Lain-lain">Lain-lain</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="block text-xs font-bold text-gray-600">Nominal Pengeluaran (Rp)</label>
                                    <input
                                        required
                                        type="number"
                                        placeholder="Contoh: 200000"
                                        value={newExpenseForm.amount}
                                        onChange={e => setNewExpenseForm({ ...newExpenseForm, amount: e.target.value })}
                                        className="w-full border px-3 py-2 rounded-lg text-sm bg-white"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="block text-xs font-bold text-gray-600">Deskripsi / Keterangan</label>
                                    <textarea
                                        required
                                        rows={2}
                                        placeholder="Contoh: Biaya iklan Facebook Ads"
                                        value={newExpenseForm.notes}
                                        onChange={e => setNewExpenseForm({ ...newExpenseForm, notes: e.target.value })}
                                        className="w-full border px-3 py-2 rounded-lg text-sm bg-white"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl shadow-md transition text-sm flex items-center justify-center gap-2"
                                >
                                    <CheckCircle size={16} /> Simpan Pengeluaran
                                </button>
                            </form>
                        </div>

                        {/* List and search operational expenses */}
                        <div className="lg:col-span-2 space-y-4 bg-white p-6 rounded-2xl border">
                            <div className="bg-white rounded-xl flex flex-col sm:flex-row gap-4 items-center justify-between pb-4">
                                <div className="w-full sm:w-1/2 flex items-center bg-gray-50 border rounded-lg px-3 py-1.5 focus-within:ring-2 focus-within:ring-blue-500 bg-white">
                                    <Search size={16} className="text-gray-400 mr-2" />
                                    <input
                                        type="text"
                                        placeholder="Cari keterangan pengeluaran..."
                                        value={expenseSearchQuery}
                                        onChange={e => setExpenseSearchQuery(e.target.value)}
                                        className="bg-transparent border-none text-sm w-full focus:outline-none"
                                    />
                                </div>

                                <select
                                    value={expenseCategoryFilter}
                                    onChange={e => setExpenseCategoryFilter(e.target.value)}
                                    className="w-full sm:w-44 border px-3 py-2 rounded-lg text-sm bg-white"
                                >
                                    <option value="">Semua Kategori</option>
                                    <option value="Operasional">Operasional</option>
                                    <option value="Marketing">Marketing</option>
                                    <option value="Gaji">Gaji</option>
                                    <option value="Lain-lain">Lain-lain</option>
                                </select>
                            </div>

                            <div className="bg-white rounded-xl border overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm text-gray-600 bg-white">
                                        <thead className="bg-gray-50 border-b">
                                            <tr>
                                                <th className="px-4 py-3">Tanggal</th>
                                                <th className="px-4 py-3">Kategori</th>
                                                <th className="px-4 py-3">Keterangan</th>
                                                <th className="px-4 py-3 text-right">Nominal</th>
                                                <th className="px-4 py-3 text-center">Aksi</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredExpenses.length === 0 ? (
                                                <tr>
                                                    <td colSpan={5} className="text-center py-8 text-gray-400">Belum ada pengeluaran operasional dicatat.</td>
                                                </tr>
                                            ) : (
                                                filteredExpenses.map(exp => (
                                                    <tr key={exp.id} className="border-b hover:bg-gray-50/50">
                                                        {editingExpenseId === exp.id ? (
                                                            <>
                                                                <td className="px-4 py-2"><input type="date" value={editExpenseForm.date} onChange={e => setEditExpenseForm({ ...editExpenseForm, date: e.target.value })} className="border px-2 py-1 rounded w-full text-xs" /></td>
                                                                <td className="px-4 py-2">
                                                                    <select value={editExpenseForm.category} onChange={e => setEditExpenseForm({ ...editExpenseForm, category: e.target.value })} className="border px-2 py-1 rounded w-full text-xs bg-white">
                                                                        <option value="Operasional">Operasional</option>
                                                                        <option value="Marketing">Marketing</option>
                                                                        <option value="Gaji">Gaji</option>
                                                                        <option value="Lain-lain">Lain-lain</option>
                                                                    </select>
                                                                </td>
                                                                <td className="px-4 py-2"><input type="text" value={editExpenseForm.notes} onChange={e => setEditExpenseForm({ ...editExpenseForm, notes: e.target.value })} className="border px-2 py-1 rounded w-full text-xs" /></td>
                                                                <td className="px-4 py-2"><input type="number" value={editExpenseForm.amount} onChange={e => setEditExpenseForm({ ...editExpenseForm, amount: e.target.value })} className="border px-2 py-1 rounded w-full text-xs text-right font-bold" /></td>
                                                                <td className="px-4 py-2 text-center space-x-1.5 whitespace-nowrap">
                                                                    <button onClick={() => saveEditExpense(exp.id)} className="bg-blue-600 text-white font-bold px-2 py-1 rounded text-xs hover:bg-blue-700">Simpan</button>
                                                                    <button onClick={() => setEditingExpenseId(null)} className="bg-gray-400 text-white font-bold px-2 py-1 rounded text-xs hover:bg-gray-500">Batal</button>
                                                                </td>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <td className="px-4 py-3 whitespace-nowrap font-medium">{exp.date}</td>
                                                                <td className="px-4 py-3">
                                                                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${exp.category === 'Marketing' ? 'bg-rose-50 text-rose-700' :
                                                                            exp.category === 'Gaji' ? 'bg-purple-50 text-purple-700' :
                                                                                exp.category === 'Operasional' ? 'bg-blue-50 text-blue-700' :
                                                                                    'bg-gray-100 text-gray-700'
                                                                        }`}>
                                                                        {exp.category || 'Lain-lain'}
                                                                    </span>
                                                                </td>
                                                                <td className="px-4 py-3 text-gray-800 text-xs max-w-[200px] truncate" title={exp.notes}>{exp.notes || '-'}</td>
                                                                <td className="px-4 py-3 text-right font-bold text-red-600">Rp {exp.amount.toLocaleString('id-ID')}</td>
                                                                <td className="px-4 py-3 text-center space-x-2 whitespace-nowrap">
                                                                    <button onClick={() => startEditExpense(exp)} className="text-blue-600 hover:text-blue-800 inline-block animate-pulse-once" title="Edit Pengeluaran"><Edit size={14} /></button>
                                                                    <button onClick={() => deleteExpense(exp.id)} className="text-red-500 hover:text-red-700 inline-block" title="Hapus Pengeluaran"><Trash2 size={14} /></button>
                                                                </td>
                                                            </>
                                                        )}
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function ManageCatalog({ catalogData, addProduct, updateProduct, deleteProduct }) {
    const [form, setForm] = useState({ name: '', jenjang: 'SD/MI', desc: '', price: '' });
    const [editId, setEditId] = useState(null);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (editId) {
            updateProduct(editId, { ...form, price: Number(form.price) });
            setEditId(null);
        } else {
            addProduct({ ...form, price: Number(form.price) });
        }
        setForm({ name: '', jenjang: 'SD/MI', desc: '', price: '' });
    };

    return (
        <div className="animate-in fade-in space-y-6">
            <h1 className="text-2xl font-bold text-gray-800">Manajemen Katalog Landing Page</h1>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border h-fit">
                    <h3 className="font-bold text-blue-900 border-b pb-2 mb-4">{editId ? 'Edit Produk' : 'Tambah Produk Baru'}</h3>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div><label className="text-xs font-bold text-gray-600">Nama Paket</label><input required type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full border px-3 py-1.5 rounded text-sm" /></div>
                        <div><label className="text-xs font-bold text-gray-600">Jenjang</label><select value={form.jenjang} onChange={e => setForm({ ...form, jenjang: e.target.value })} className="w-full border px-3 py-1.5 rounded text-sm"><option>SD/MI</option><option>SMP/MTs</option><option>SMA/MA</option><option>Umum/Custom</option></select></div>
                        <div><label className="text-xs font-bold text-gray-600">Deskripsi Singkat</label><textarea required rows="2" value={form.desc} onChange={e => setForm({ ...form, desc: e.target.value })} className="w-full border px-3 py-1.5 rounded text-sm"></textarea></div>
                        <div><label className="text-xs font-bold text-gray-600">Harga (Rp)</label><input required type="number" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} className="w-full border px-3 py-1.5 rounded text-sm" /></div>
                        <div className="flex gap-2">
                            <button type="submit" className="flex-1 bg-blue-600 text-white font-bold py-2 rounded text-sm">{editId ? 'Update' : 'Tambah'}</button>
                            {editId && <button type="button" onClick={() => { setEditId(null); setForm({ name: '', jenjang: 'SD/MI', desc: '', price: '' }) }} className="bg-gray-400 text-white px-3 py-2 rounded text-sm">Batal</button>}
                        </div>
                    </form>
                </div>
                <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {catalogData.map(item => (
                        <div key={item.id} className="bg-white p-4 rounded-xl shadow-sm border flex flex-col">
                            <div className="flex justify-between items-start mb-2">
                                <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded">{item.jenjang}</span>
                                <div className="space-x-2">
                                    <button onClick={() => { setEditId(item.id); setForm(item) }} className="text-blue-500 hover:bg-blue-50 p-1 rounded"><Edit size={14} /></button>
                                    <button onClick={() => deleteProduct(item.id)} className="text-red-500 hover:bg-red-50 p-1 rounded"><Trash2 size={14} /></button>
                                </div>
                            </div>
                            <h4 className="font-bold text-gray-800">{item.name}</h4>
                            <p className="text-xs text-gray-500 flex-grow mt-1 mb-3">{item.desc}</p>
                            <span className="font-bold text-green-600 border-t pt-2">Rp {item.price.toLocaleString('id-ID')}</span>
                        </div>
                    ))}
                    {catalogData.length === 0 && <p className="text-gray-400 text-sm text-center py-8 w-full col-span-2">Belum ada produk di katalog. Landing page menggunakan data dummy sementara.</p>}
                </div>
            </div>
        </div>
    );
}

function Leaderboard({ salesData }) {
    const stats = {};
    salesData.forEach(sale => {
        if (!stats[sale.staffName]) stats[sale.staffName] = 0;
        stats[sale.staffName] += sale.amount;
    });

    const ranking = Object.keys(stats).map(name => ({ name, total: stats[name] })).sort((a, b) => b.total - a.total);

    return (
        <div className="animate-in fade-in space-y-6 max-w-2xl mx-auto">
            <div className="text-center mb-8">
                <Trophy size={48} className="mx-auto text-yellow-500 mb-2" />
                <h1 className="text-2xl font-bold text-gray-800">Papan Peringkat Sales</h1>
                <p className="text-gray-500">Peringkat berdasarkan akumulasi total omzet.</p>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
                {ranking.map((staff, idx) => (
                    <div key={idx} className={`flex items-center p-4 border-b last:border-0 ${idx === 0 ? 'bg-yellow-50' : idx === 1 ? 'bg-gray-50' : idx === 2 ? 'bg-orange-50' : 'bg-white'}`}>
                        <div className="w-10 font-bold text-gray-400 text-lg">#{idx + 1}</div>
                        <div className="flex-grow font-bold text-gray-800 flex items-center gap-2">
                            {staff.name}
                            {idx === 0 && <span className="bg-yellow-400 text-white text-[10px] px-2 py-0.5 rounded-full uppercase">MVP</span>}
                        </div>
                        <div className="font-bold text-green-600 text-lg">Rp {staff.total.toLocaleString('id-ID')}</div>
                    </div>
                ))}
                {ranking.length === 0 && <div className="p-8 text-center text-gray-400">Belum ada data penjualan.</div>}
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

    const filteredData = salesData.filter(s => s.date >= startDate && s.date <= endDate);
    const staffStats = {};

    filteredData.forEach(sale => {
        if (!staffStats[sale.staffName]) staffStats[sale.staffName] = { total: 0, perDay: {} };
        staffStats[sale.staffName].total += sale.amount;
        if (!staffStats[sale.staffName].perDay[sale.date]) staffStats[sale.staffName].perDay[sale.date] = 0;
        staffStats[sale.staffName].perDay[sale.date] += sale.amount;
    });

    const reportData = Object.keys(staffStats).map(name => {
        const komisi = staffStats[name].total * 0.10;
        let bonus = 0, kelipatanTotal = 0;
        Object.values(staffStats[name].perDay).forEach(omzet => {
            if (omzet >= 1000000) {
                const kelipatan = Math.floor(omzet / 1000000);
                bonus += 50000 * kelipatan;
                kelipatanTotal += kelipatan;
            }
        });
        return { name, total: staffStats[name].total, komisi, bonus, kelipatanTotal, totalPayout: komisi + bonus };
    });

    return (
        <div className="animate-in fade-in space-y-6">
            <h1 className="text-2xl font-bold text-gray-800">Laporan Komisi & Bonus</h1>
            <div className="bg-white p-4 rounded-xl border flex gap-4">
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="border px-3 py-1.5 rounded text-sm" />
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="border px-3 py-1.5 rounded text-sm" />
            </div>
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-blue-900 text-white">
                            <tr><th className="px-4 py-3">Staff</th><th className="px-4 py-3 text-right">Omzet</th><th className="px-4 py-3 text-right">Komisi (10%)</th><th className="px-4 py-3 text-right">Bonus (Kelipatan 1Jt)</th><th className="px-4 py-3 text-right bg-blue-800">Total Cair</th></tr>
                        </thead>
                        <tbody>
                            {reportData.map((d, i) => (
                                <tr key={i} className="border-b"><td className="px-4 py-3 font-bold">{d.name}</td><td className="px-4 py-3 text-right whitespace-nowrap">Rp {d.total.toLocaleString()}</td><td className="px-4 py-3 text-right text-blue-600 whitespace-nowrap">Rp {d.komisi.toLocaleString()}</td><td className="px-4 py-3 text-right text-amber-600 whitespace-nowrap">Rp {d.bonus.toLocaleString()} ({d.kelipatanTotal}x)</td><td className="px-4 py-3 text-right font-bold text-green-600 bg-green-50/30 whitespace-nowrap">Rp {d.totalPayout.toLocaleString()}</td></tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

function ManageStaff({ usersData, addStaffUser, deleteStaffUser }) {
    const [form, setForm] = useState({ name: '', username: '', password: '', role: 'staff' });
    const staffList = usersData.filter(u => u.role === 'staff');

    const handleSubmit = (e) => {
        e.preventDefault();
        addStaffUser(form);
        setForm({ name: '', username: '', password: '', role: 'staff' });
    };

    return (
        <div className="animate-in fade-in space-y-6">
            <h1 className="text-2xl font-bold text-gray-800">Manajemen Akun Staff</h1>
            <div className="grid md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl border h-fit">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <input required type="text" placeholder="Nama Lengkap" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full border px-3 py-2 rounded text-sm" />
                        <input required type="text" placeholder="Username" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} className="w-full border px-3 py-2 rounded text-sm" />
                        <input required type="text" placeholder="Password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} className="w-full border px-3 py-2 rounded text-sm" />
                        <button type="submit" className="w-full bg-blue-600 text-white font-bold py-2 rounded text-sm">Tambah Staff</button>
                    </form>
                </div>
                <div className="md:col-span-2 bg-white rounded-xl border overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm"><thead className="bg-gray-50 border-b"><tr><th className="px-4 py-3">Nama</th><th className="px-4 py-3">User/Pass</th><th className="px-4 py-3">Aksi</th></tr></thead>
                            <tbody>
                                {staffList.map(s => (
                                    <tr key={s.id} className="border-b"><td className="px-4 py-3 font-bold">{s.name}</td><td className="px-4 py-3 text-xs">{s.username} / {s.password}</td><td className="px-4 py-3"><button onClick={() => deleteStaffUser(s.id)} className="text-red-500"><Trash2 size={16} /></button></td></tr>
                                ))}
                            </tbody></table>
                    </div>
                </div>
            </div>
        </div>
    );
}

function StaffInputForm({ addSale, userName, setTab, catalogData }) {
    const defaultProduct = catalogData.length > 0 ? catalogData[0].name : 'Modul SD/MI';
    const [form, setForm] = useState({ date: new Date().toISOString().split('T')[0], customer: '', product: defaultProduct, amount: '', notes: '' });

    const handleSubmit = (e) => {
        e.preventDefault();
        addSale({ ...form, staffName: userName, amount: Number(form.amount) });
        alert('Tersimpan!');
        setForm({ ...form, customer: '', amount: '', notes: '' });
        setTab('my_sales');
    };

    const productOptions = catalogData.length > 0 ? catalogData.map(c => c.name) : ['Modul SD/MI', 'Modul SMP/MTs', 'Modul SMA/MA', 'Paket Custom'];

    return (
        <div className="max-w-2xl mx-auto animate-in fade-in">
            <h1 className="text-2xl font-bold mb-6">Lapor Closingan Hari Ini 🎉</h1>
            <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl border space-y-4">
                <input required type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="w-full border px-3 py-2 rounded" />
                <input required type="text" placeholder="Nama Kustomer / Instansi" value={form.customer} onChange={e => setForm({ ...form, customer: e.target.value })} className="w-full border px-3 py-2 rounded" />
                <select value={form.product} onChange={e => setForm({ ...form, product: e.target.value })} className="w-full border px-3 py-2 rounded bg-white">
                    {productOptions.map((opt, i) => <option key={i}>{opt}</option>)}
                </select>
                <input required type="number" placeholder="Nominal Rp" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} className="w-full border px-3 py-2 rounded" />
                <textarea placeholder="Catatan opsional..." value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="w-full border px-3 py-2 rounded"></textarea>
                <button type="submit" className="w-full bg-green-500 text-white font-bold py-3 rounded text-lg">Simpan Closingan</button>
            </form>
        </div>
    );
}
