// @ts-nocheck
import React, { useState, useEffect } from 'react';
import {
    MessageCircle, Star, XCircle, CheckCircle, FileText, Book,
    Heart, Edit, RefreshCw, GraduationCap, ZoomIn, Eye, Info,
    Lock, LayoutDashboard, LogOut, PlusCircle,
    DollarSign, TrendingUp, User, ShoppingBag, ArrowRight,
    Users, Trash2, Key, Award, Search, Filter, BarChart3, PieChart,
    Download, ChevronDown, ChevronUp, Package, Trophy, Menu, Clock, Upload
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, deleteDoc, doc, updateDoc, setDoc, writeBatch } from 'firebase/firestore';

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
    const [previewsData, setPreviewsData] = useState([]);
    const [payoutsData, setPayoutsData] = useState([]);
    const [leadsData, setLeadsData] = useState([]);
    const [appSettings, setAppSettings] = useState({ favicon: 'https://react.dev/favicon.ico' });
    // Custom UI Alert & Confirm States (Solusi Iframe CSP)
    const [alertConfig, setAlertConfig] = useState({ isOpen: false, title: '', message: '', type: 'info' });
    const [confirmConfig, setConfirmConfig] = useState({ isOpen: false, title: '', message: '', onConfirm: null });

    const showAlert = (message, title = 'Notifikasi', type = 'info') => {
        setAlertConfig({ isOpen: true, title, message, type });
    };

    const showConfirm = (message, onConfirm, title = 'Konfirmasi Tindakan') => {
        setConfirmConfig({ isOpen: true, title, message, onConfirm });
    };

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

        // Listener: previewsData
        const previewsRef = collection(db, 'artifacts', appId, 'public', 'data', 'previewsData');
        const unsubscribePreviews = onSnapshot(previewsRef, (snapshot) => {
            const fetchedPreviews = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setPreviewsData(fetchedPreviews);
        }, (error) => console.error("Previews Firestore error:", error));

        // Listener: payoutsData
        const payoutsRef = collection(db, 'artifacts', appId, 'public', 'data', 'payoutsData');
        const unsubscribePayouts = onSnapshot(payoutsRef, (snapshot) => {
            const fetchedPayouts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            fetchedPayouts.sort((a, b) => new Date(b.payoutDate) - new Date(a.payoutDate));
            setPayoutsData(fetchedPayouts);
        }, (error) => console.error("Payouts Firestore error:", error));
        // Listener Baru: data leads kustomer
        const leadsRef = collection(db, 'artifacts', appId, 'public', 'data', 'leadsData');
        const unsubscribeLeads = onSnapshot(leadsRef, (snapshot) => {
            const fetchedLeads = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            fetchedLeads.sort((a, b) => new Date(b.date) - new Date(a.date));
            setLeadsData(fetchedLeads);
        }, (error) => console.error("Leads error:", error));

        // Listener Baru: pengaturan favicon aplikasi
        const settingsRef = collection(db, 'artifacts', appId, 'public', 'data', 'settingsData');
        const unsubscribeSettings = onSnapshot(settingsRef, (snapshot) => {
            if (!snapshot.empty) {
                const data = snapshot.docs[0].data();
                setAppSettings(data);

                // Mengubah favicon browser secara instan
                let link = document.querySelector("link[rel~='icon']");
                if (!link) {
                    link = document.createElement('link');
                    link.rel = 'icon';
                    document.head.appendChild(link);
                }
                link.href = data.favicon || 'https://react.dev/favicon.ico';
            }
        }, (error) => console.error("Settings error:", error));
        return () => {
            unsubscribeSales();
            unsubscribeUsers();
            unsubscribeCatalog();
            unsubscribeExpenses();
            unsubscribePreviews();
            unsubscribePayouts();
            unsubscribeLeads();
            unsubscribeSettings();
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
        if (!db) return showAlert("Sistem offline!", "Error", "error");
        try {
            await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'salesData'), {
                ...newSale,
                paymentStatus: 'unpaid'
            });
            showAlert("Closingan berhasil disimpan!", "Sukses", "success");
        }
        catch (error) { showAlert("Gagal menyimpan data!", "Error", "error"); }
    };

    const updateSale = async (saleId, updatedData) => {
        try {
            await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'salesData', saleId), updatedData);
            showAlert("Data Diperbarui!", "Sukses", "success");
        }
        catch (error) { showAlert("Gagal memperbarui!", "Error", "error"); }
    };

    const deleteSale = async (saleId) => {
        try {
            await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'salesData', saleId));
            showAlert("Transaksi berhasil dihapus!", "Sukses", "success");
        }
        catch (error) { showAlert("Gagal menghapus!", "Error", "error"); }
    };

    const addStaffUser = async (newUser) => {
        try { await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'usersData'), newUser); showAlert("Staff ditambahkan!", "Sukses", "success"); }
        catch (error) { showAlert("Gagal menambah staff!", "Error", "error"); }
    };

    const deleteStaffUser = async (userId) => {
        try {
            await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'usersData', userId));
            showAlert("Akun staff berhasil dihapus!", "Sukses", "success");
        }
        catch (error) { showAlert("Gagal menghapus!", "Error", "error"); }
    };

    const addProduct = async (newProduct) => {
        try { await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'catalogData'), newProduct); showAlert("Produk ditambahkan ke katalog!", "Sukses", "success"); }
        catch (error) { showAlert("Gagal menambah produk!", "Error", "error"); }
    };

    const updateProduct = async (prodId, updatedData) => {
        try { await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'catalogData', prodId), updatedData); showAlert("Katalog Diperbarui!", "Sukses", "success"); }
        catch (error) { showAlert("Gagal memperbarui katalog!", "Error", "error"); }
    };

    const deleteProduct = async (prodId) => {
        try {
            await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'catalogData', prodId));
            showAlert("Produk berhasil dihapus!", "Sukses", "success");
        }
        catch (error) { showAlert("Gagal menghapus produk!", "Error", "error"); }
    };

    const addExpense = async (newExpense) => {
        if (!db) return showAlert("Sistem offline!", "Error", "error");
        try { await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'expensesData'), newExpense); showAlert("Pengeluaran berhasil ditambahkan!", "Sukses", "success"); }
        catch (error) { showAlert("Gagal menyimpan pengeluaran!", "Error", "error"); }
    };

    const updateExpense = async (expenseId, updatedData) => {
        try { await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'expensesData', expenseId), updatedData); showAlert("Pengeluaran diperbarui!", "Sukses", "success"); }
        catch (error) { showAlert("Gagal memperbarui pengeluaran!", "Error", "error"); }
    };

    const deleteExpense = async (expenseId) => {
        try {
            await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'expensesData', expenseId));
            showAlert("Pengeluaran berhasil dihapus!", "Sukses", "success");
        }
        catch (error) { showAlert("Gagal menghapus pengeluaran!", "Error", "error"); }
    };

    const addLead = async (leadData) => {
        try { await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'leadsData'), leadData); }
        catch (error) { console.error(error); }
    };

    const updatePreview = async (slotId, updatedData) => {
        try {
            await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'previewsData', slotId), {
                ...updatedData,
                slot: slotId
            });
            showAlert(`Pratinjau ${slotId} berhasil diperbarui!`, 'Sukses', 'success');
        } catch (error) {
            showAlert("Gagal memperbarui pratinjau!", "Error", "error");
        }
    };

    const payStaffCommission = async (staffName, startDate, endDate, totalAmount, salesToUpdate) => {
        if (salesToUpdate.length === 0) {
            showAlert("Tidak ada komisi belum dibayar pada periode tersebut!", "Peringatan", "warning");
            return;
        }
        try {
            const payoutRef = await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'payoutsData'), {
                staffName,
                startDate,
                endDate,
                amount: totalAmount,
                payoutDate: new Date().toISOString().split('T')[0]
            });

            const updatePromises = salesToUpdate.map(sale =>
                updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'salesData', sale.id), {
                    paymentStatus: 'paid',
                    payoutId: payoutRef.id,
                    payoutDate: new Date().toISOString().split('T')[0]
                })
            );
            await Promise.all(updatePromises);
            showAlert(`Berhasil melunasi komisi ${staffName} sebesar Rp ${totalAmount.toLocaleString('id-ID')}!`, "Sukses", "success");
        } catch (error) {
            console.error("Payout error:", error);
            showAlert("Gagal memproses pembayaran komisi!", "Error", "error");
        }
    };

    const writeActivityLog = async (actionType, description, specificUser = null) => {
        if (!db) return;
        try {
            const userRef = specificUser || currentUser || { name: 'Guest/System', role: 'unknown', username: 'unknown', id: 'N/A' };
            await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'activityLogs'), {
                timestamp: new Date().toISOString(),
                userId: userRef.id || 'N/A',
                userName: userRef.name || userRef.username || 'Unknown',
                role: userRef.role || 'unknown',
                actionType,
                description
            });
        } catch (error) {
            console.error("Gagal mencatat log aktivitas:", error);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 text-gray-800">
            {currentView === 'landing' && (
                <LandingPage
                    setView={setCurrentView}
                    catalogData={catalogData}
                    addLead={addLead}
                    previewsData={previewsData}
                    showAlert={showAlert}
                />
            )}
            {currentView === 'login' && <LoginPage setView={setCurrentView} onLogin={handleLogin} usersData={usersData} writeActivityLog={writeActivityLog} />}
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
                    previewsData={previewsData}
                    payoutsData={payoutsData}
                    updatePreview={updatePreview}
                    payStaffCommission={payStaffCommission}
                    showAlert={showAlert}
                    showConfirm={showConfirm}
                    leadsData={leadsData}
                    appSettings={appSettings}
                    db={db}
                    appId={appId}
                    writeActivityLog={writeActivityLog}
                />
            )}

            {/* CUSTOM ALERT MODAL */}
            {alertConfig.isOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setAlertConfig(prev => ({ ...prev, isOpen: false }))}></div>
                    <div className="relative bg-white w-full max-w-sm rounded-2xl shadow-2xl p-6 z-10 animate-in zoom-in-95">
                        <div className="text-center space-y-3">
                            <div className="mx-auto w-12 h-12 flex items-center justify-center rounded-full bg-blue-50 text-blue-600">
                                {alertConfig.type === 'success' ? (
                                    <CheckCircle size={28} className="text-green-500" />
                                ) : alertConfig.type === 'error' ? (
                                    <XCircle size={28} className="text-red-500" />
                                ) : (
                                    <Info size={28} className="text-blue-500" />
                                )}
                            </div>
                            <h3 className="text-lg font-bold text-gray-900">{alertConfig.title}</h3>
                            <p className="text-sm text-gray-500">{alertConfig.message}</p>
                        </div>
                        <button
                            onClick={() => setAlertConfig(prev => ({ ...prev, isOpen: false }))}
                            className="mt-6 w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl text-sm transition"
                        >
                            OK
                        </button>
                    </div>
                </div>
            )}

            {/* CUSTOM CONFIRM MODAL */}
            {confirmConfig.isOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}></div>
                    <div className="relative bg-white w-full max-w-sm rounded-2xl shadow-2xl p-6 z-10 animate-in zoom-in-95">
                        <div className="text-center space-y-3">
                            <div className="mx-auto w-12 h-12 flex items-center justify-center rounded-full bg-amber-50 text-amber-600">
                                <Info size={28} />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900">{confirmConfig.title}</h3>
                            <p className="text-sm text-gray-500">{confirmConfig.message}</p>
                        </div>
                        <div className="mt-6 flex gap-3">
                            <button
                                onClick={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
                                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-750 font-bold py-2.5 rounded-xl text-sm transition"
                            >
                                Batal
                            </button>
                            <button
                                onClick={() => {
                                    if (confirmConfig.onConfirm) confirmConfig.onConfirm();
                                    setConfirmConfig(prev => ({ ...prev, isOpen: false }));
                                }}
                                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 rounded-xl text-sm transition"
                            >
                                Ya, Lanjutkan
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ---------------------- HALAMAN PUBLIK ----------------------

function LandingPage({ setView, catalogData, addLead, previewsData, showAlert }) {
    const [pdfModal, setPdfModal] = useState({ isOpen: false, url: '', title: '' });
    const [leadModal, setLeadModal] = useState(false);
    const [leadForm, setLeadForm] = useState({ name: '', phone: '' });
    const [openFaq, setOpenFaq] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('Semua');
    const [catalogPage, setCatalogPage] = useState(1);
    const itemsPerPage = 6;

    useEffect(() => {
        setCatalogPage(1);
    }, [searchQuery, categoryFilter]);

    const defaultCatalog = [
        { id: 1, name: "Modul Lengkap SD", jenjang: "SD/MI", desc: "Kelas 1-6 Lengkap Prota, Prosem, LKPD, ATP", price: 150000 },
        { id: 2, name: "Modul Lengkap SMP", jenjang: "SMP/MTs", desc: "Kelas 7-9 Lengkap dengan Rubrik Penilaian", price: 150000 }
    ];
    const dataToDisplay = catalogData.length > 0 ? catalogData : defaultCatalog;

    const filteredCatalog = dataToDisplay.filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || item.desc.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = categoryFilter === 'Semua' || (item.jenjang && item.jenjang.includes(categoryFilter));
        return matchesSearch && matchesCategory;
    });

    const totalCatalogPages = Math.ceil(filteredCatalog.length / itemsPerPage);
    const paginatedCatalog = filteredCatalog.slice((catalogPage - 1) * itemsPerPage, catalogPage * itemsPerPage);

    const getPreviewSlot = (slotKey) => {
        const found = previewsData.find(p => p.id === slotKey || p.slot === slotKey);
        if (found) return found;

        const defaults = {
            cover: {
                title: "Cover & Identitas",
                desc: "Desain rapi, terstruktur, tinggal ganti nama guru & sekolah.",
                url: "cover.pdf"
            },
            prota: {
                title: "Prota & Prosem",
                desc: "Otomatis menghitung pekan efektif & JP.",
                url: "prota.pdf"
            },
            isi: {
                title: "Modul Ajar & LKPD",
                desc: "Langkah pembelajaran terperinci.",
                url: "isi.pdf"
            }
        };
        return defaults[slotKey];
    };

    const slotCover = getPreviewSlot('cover');
    const slotProta = getPreviewSlot('prota');
    const slotIsi = getPreviewSlot('isi');

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
        showAlert("Terima kasih! Link sampel modul telah kami kirimkan ke WhatsApp Anda (Simulasi).", "Sukses", "success");
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
                    <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
                        <button onClick={() => redirectWA('Halo Admin, saya mau order Modul Deeplearning')}
                            className="cta-pulse w-full sm:w-auto bg-yellow-500 hover:bg-yellow-400 text-blue-900 font-bold py-4 px-8 rounded-full text-xl shadow-lg transition transform hover:scale-105 inline-flex items-center justify-center cursor-pointer border-none">
                            <MessageCircle size={24} className="mr-2" /> HUBUNGI KAMI SEKARANG
                        </button>
                        <button onClick={() => setLeadModal(true)}
                            className="w-full sm:w-auto bg-white/20 hover:bg-white/30 backdrop-blur text-white border border-white/40 font-bold py-4 px-8 rounded-full text-xl shadow-lg transition transform hover:scale-105 inline-flex items-center justify-center cursor-pointer">
                            <Download size={24} className="mr-2" /> Unduh Sampel Gratis
                        </button>
                    </div>
                </div>
            </header>

            <section className="py-12 px-4">
                <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-8 items-center">
                    <div className="bg-white p-6 rounded-2xl shadow-lg border-l-4 border-red-500">
                        <h3 className="text-xl font-bold text-red-600 mb-3 flex items-center"><XCircle size={20} className="mr-2" /> Masalah Guru Saat Ini:</h3>
                        <ul className="space-y-2 text-gray-600 font-medium">
                            <li>• Bingung menyusun modul sesuai CP 046?</li>
                            <li>• Takut tidak lulus validasi Supervisi dan UKIN PPG?</li>
                            <li>• Waktu habis hanya untuk administrasi?</li>
                            <li>• Kesulitan mencari referensi KMA 3302?</li>
                        </ul>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-lg border-l-4 border-green-500">
                        <h3 className="text-xl font-bold text-green-600 mb-3 flex items-center"><CheckCircle size={20} className="mr-2" /> Solusi Kami:</h3>
                        <ul className="space-y-2 text-gray-600 font-medium">
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
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

            <section className="py-16 px-4 bg-white">
                <div className="max-w-5xl mx-auto">
                    <div className="text-center mb-8">
                        <span className="text-blue-600 font-bold text-sm tracking-widest uppercase bg-blue-100 px-3 py-1 rounded-full">Katalog Produk</span>
                        <h2 className="text-3xl md:text-4xl font-extrabold text-gray-800 mt-3">Pilihan Paket Modul Ajar</h2>
                    </div>

                    <div className="mb-8 flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                        <div className="w-full md:w-1/3 flex items-center bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 focus-within:ring-2 focus-within:ring-blue-500 transition">
                            <Search size={18} className="text-gray-400 mr-2" />
                            <input
                                type="text"
                                placeholder="Cari modul..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="bg-transparent border-none w-full focus:outline-none text-gray-880 text-sm"
                            />
                        </div>
                        <div className="flex gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 hide-scrollbar">
                            {['Semua', 'SD', 'SMP', 'SMA'].map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => setCategoryFilter(cat)}
                                    className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all ${categoryFilter === cat ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Compact View Grid Optimization for Mobile Screen Scannability */}
                    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
                        {paginatedCatalog.length > 0 ? paginatedCatalog.map(item => (
                            <div key={item.id} className="bg-gray-50 rounded-2xl shadow-md border border-gray-100 overflow-hidden flex flex-col transition hover:shadow-xl">
                                <div className="bg-blue-900 p-2.5 sm:p-4 text-center border-b-4 border-yellow-500">
                                    <span className="inline-block bg-blue-800 text-blue-100 text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-full mb-1 sm:mb-2 uppercase">{item.jenjang}</span>
                                    <h3 className="text-sm sm:text-xl font-bold text-white line-clamp-1">{item.name}</h3>
                                </div>
                                <div className="p-3 sm:p-6 flex-grow flex flex-col justify-between">
                                    <p className="text-gray-600 text-[11px] sm:text-sm line-clamp-2 mb-4">{item.desc}</p>
                                    <div>
                                        <div className="border-t border-gray-100 pt-2.5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1">
                                            <span className="text-[10px] sm:text-sm text-gray-500">Harga:</span>
                                            <span className="text-sm sm:text-xl font-bold text-green-600">Rp {typeof item.price === 'number' ? item.price.toLocaleString('id-ID') : item.price}</span>
                                        </div>
                                        <button onClick={() => redirectWA(`Halo Admin, saya mau pesan ${item.name}`)} className="mt-3 w-full bg-blue-100 hover:bg-blue-200 text-blue-700 font-bold py-1.5 sm:py-2 rounded-xl transition text-[11px] sm:text-sm flex justify-center items-center gap-1.5">
                                            <ShoppingBag size={14} /> <span className="hidden sm:inline">Pesan Sekarang</span><span className="inline sm:hidden">Pesan</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )) : (
                            <div className="col-span-full py-12 text-center bg-gray-50 rounded-2xl border border-gray-100">
                                <Search size={48} className="mx-auto text-gray-300 mb-4" />
                                <h3 className="text-lg font-bold text-gray-700 mb-1">Produk Tidak Ditemukan</h3>
                                <p className="text-sm text-gray-500">Coba gunakan kata kunci atau filter jenjang yang lain.</p>
                            </div>
                        )}
                    </div>

                    {/* Pagination control */}
                    <div className="mt-8">
                        <Pagination currentPage={catalogPage} totalPages={totalCatalogPages} onPageChange={setCatalogPage} />
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
                        <div className="bg-white rounded-2xl shadow-md overflow-hidden transform hover:-translate-y-2 hover:shadow-xl transition duration-300 flex flex-col border border-gray-100">
                            <div className="h-52 bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center relative group cursor-pointer" onClick={() => openPdfModal(slotCover.url, slotCover.title)}>
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
                                <h4 className="font-bold text-gray-800 text-lg">{slotCover.title}</h4>
                                <p className="text-sm text-gray-500 mt-2 flex-grow">{slotCover.desc}</p>
                                <button onClick={() => openPdfModal(slotCover.url, slotCover.title)} className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-4 rounded-xl transition duration-300 flex items-center justify-center gap-2 text-sm shadow-md">
                                    <Eye size={16} /> Buka Preview
                                </button>
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl shadow-md overflow-hidden transform hover:-translate-y-2 hover:shadow-xl transition duration-300 flex flex-col border border-gray-100">
                            <div className="h-52 bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center relative group cursor-pointer" onClick={() => openPdfModal(slotProta.url, slotProta.title)}>
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
                                <h4 className="font-bold text-gray-800 text-lg">{slotProta.title}</h4>
                                <p className="text-sm text-gray-500 mt-2 flex-grow">{slotProta.desc}</p>
                                <button onClick={() => openPdfModal(slotProta.url, slotProta.title)} className="mt-4 w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 px-4 rounded-xl transition flex items-center justify-center gap-2 text-sm shadow-md">
                                    <Eye size={16} /> Buka Preview
                                </button>
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl shadow-md overflow-hidden transform hover:-translate-y-2 hover:shadow-xl transition duration-300 flex flex-col border border-gray-100">
                            <div className="h-52 bg-gradient-to-br from-yellow-50 to-amber-100 flex items-center justify-center relative group pointer-events-auto" onClick={() => openPdfModal(slotIsi.url, slotIsi.title)}>
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
                                <h4 className="font-bold text-gray-800 text-lg">{slotIsi.title}</h4>
                                <p className="text-sm text-gray-500 mt-2 flex-grow">{slotIsi.desc}</p>
                                <button onClick={() => openPdfModal(slotIsi.url, slotIsi.title)} className="mt-4 w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold py-2.5 px-4 rounded-xl transition flex items-center justify-center gap-2 text-sm shadow-md">
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

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        <div className="bg-gray-50 p-6 rounded-xl border border-gray-100 shadow-sm">
                            <div className="flex items-center mb-4">
                                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold mr-3">SR</div>
                                <div>
                                    <h5 className="font-bold text-sm">Bu Sri Rahayu</h5>
                                    <p className="text-xs text-gray-500">Guru SD - Jawa Tengah</p>
                                </div>
                            </div>
                            <p className="text-gray-600 text-sm italic">\"Alhamdulillah, modulnya sangat membantu. Saya lulus UKIN PPG Daljab kemarin. Terima kasih admin fast respon!\"</p>
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
                            <p className="text-gray-600 text-sm italic">\"Aminn. Alhamdulillah, Awalnya ragu karena online, ternyata file sudah sesuai CP nya lengkap. Supervisi pengawas jadi aman.\"</p>
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
                            <p className="text-gray-600 text-sm italic">\"Kurikulum berbasis cintanya Sudah sesuai Panduan Resmi. Siswa jadi lebih antusias. Recommended buat yg sibuk!\"</p>
                            <div className="text-yellow-400 text-xs mt-3 flex gap-0.5">
                                <Star size={12} fill="currentColor" /><Star size={12} fill="currentColor" /><Star size={12} fill="currentColor" /><Star size={12} fill="currentColor" /><Star size={12} fill="currentColor" />
                            </div>
                        </div>
                    </div>
                </div>
            </section>

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

            <div className="bg-gray-800 text-white py-12 text-center text-sm relative">
                <p>© 2026 Layanan Pembuatan Modul Ajar Profesional.</p>
                <p className="mt-2 text-gray-400">Siap bantu Guru Lulus Supervisi dan Mudah Mengajar Tanpa Pusing Administrasi.</p>

                <div className="mt-12 flex justify-center">
                    <button
                        onClick={() => setView('login')}
                        className="flex items-center gap-2 px-4 py-2 text-gray-500 hover:text-white transition-colors text-xs opacity-60 hover:opacity-100 rounded-lg hover:bg-gray-700 animate-pulse"
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
                                <XCircle size={20} />
                            </button>
                        </div>
                        <div className="flex-grow bg-gray-50 flex flex-col">
                            <div className="bg-amber-50 border-b border-amber-200 px-6 py-2.5 text-xs text-amber-800 flex items-center justify-between">
                                <span className="flex items-center gap-2">
                                    <Info size={14} className="text-amber-600" />
                                    <span>Tautan Dokumen: <a href={pdfModal.url} target="_blank" rel="noreferrer" className="underline font-bold text-blue-700">{pdfModal.url}</a></span>
                                </span>
                            </div>
                            <div className="flex-grow flex items-center justify-center text-gray-400 bg-gray-100 p-4 text-center">
                                <div className="max-w-md bg-white p-6 rounded-xl shadow-md border">
                                    <FileText size={64} className="mx-auto mb-4 text-red-500 animate-bounce" />
                                    <h4 className="text-gray-850 font-bold mb-2 text-base">Dokumen Siap Ditinjau</h4>
                                    <p className="text-xs text-gray-500 mb-6">Klik tombol di bawah untuk membuka berkas pratinjau lengkap di halaman baru.</p>
                                    <a href={pdfModal.url} target="_blank" rel="noreferrer" className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold py-2.5 px-6 rounded-lg transition shadow-md inline-block">
                                        Buka Tautan Pratinjau
                                    </a>
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

            {leadModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setLeadModal(false)}></div>
                    <div className="relative bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 z-10 animate-in zoom-in-95">
                        <button onClick={() => setLeadModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><XCircle size={20} /></button>
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-3"><Download size={32} /></div>
                            <h3 className="text-xl font-bold text-gray-850">Unduh Sampel Modul</h3>
                            <p className="text-sm text-gray-500 mt-1">Kami akan mengirimkan link Google Drive sampel modul langsung ke WhatsApp Anda.</p>
                        </div>
                        <form onSubmit={handleLeadSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">Nama Lengkap</label>
                                <input type="text" required value={leadForm.name} onChange={e => setLeadForm({ ...leadForm, name: e.target.value })} className="w-full border px-3 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white text-gray-850" placeholder="Bpk/Ibu Guru..." />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">Nomor WhatsApp Aktif</label>
                                <input type="text" required value={leadForm.phone} onChange={e => setLeadForm({ ...leadForm, phone: e.target.value })} className="w-full border px-3 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white text-gray-850" placeholder="08123456789" />
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

function LoginPage({ setView, onLogin, usersData, writeActivityLog }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const FALLBACK_ADMIN = {
        id: 'admin-fallback',
        name: 'Admin Sobat Guru',
        username: 'admin',
        password: 'admin123',
        role: 'admin'
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const matchedUser = usersData.find(u => u.username === username && u.password === password)
            || (username === FALLBACK_ADMIN.username && password === FALLBACK_ADMIN.password ? FALLBACK_ADMIN : null);
        if (matchedUser) {
            try { await writeActivityLog('LOGIN_SUCCESS', `User ${matchedUser.name} berhasil login.`, matchedUser); } catch (e) { }
            onLogin(matchedUser);
        } else {
            try {
                const tempUser = { name: `Attempt: ${username}`, role: 'unknown', username, id: 'N/A' };
                await writeActivityLog('LOGIN_FAILED', `Gagal login dengan username: ${username}`, tempUser);
            } catch (e) { }
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
                            <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} required className="w-full border-gray-300 border px-4 py-2 rounded-lg bg-white text-gray-855" placeholder="Masukkan username" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full border-gray-300 border px-4 py-2 rounded-lg bg-white text-gray-855" placeholder="••••••••" />
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

function Dashboard({
    user, onLogout, salesData, addSale, updateSale, deleteSale,
    usersData, addStaffUser, deleteStaffUser, catalogData,
    addProduct, updateProduct, deleteProduct, expensesData,
    addExpense, updateExpense, deleteExpense, previewsData,
    payoutsData, updatePreview, payStaffCommission, showAlert, showConfirm, leadsData, appSettings, db, appId, writeActivityLog
}) {
    const [activeTab, setActiveTab] = useState(user.role === 'staff' ? 'input' : 'overview');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

    return (
        <div className="flex h-screen bg-gray-100 overflow-hidden relative">

            {/* 1. MOBILE HEADER BAR */}
            <div className="bg-blue-900 text-white p-4 flex justify-between items-center md:hidden shadow-md fixed top-0 left-0 right-0 z-45">
                <div className="flex items-center gap-2">
                    <img src="https://upload.wikimedia.org/wikipedia/commons/9/9c/Logo_of_Ministry_of_Education_and_Culture_of_Republic_of_Indonesia.svg"
                        alt="Logo" className="h-8 w-auto" />
                    <span className="font-bold text-sm">Sobat Guru Digital</span>
                </div>
                <button onClick={toggleSidebar} className="p-1.5 hover:bg-blue-800 rounded-lg">
                    <Menu size={24} />
                </button>
            </div>

            {/* Backdrop Overlay untuk Sidebar Mobile */}
            {isSidebarOpen && (
                <div className="fixed inset-0 bg-black/50 z-40 md:hidden animate-fade-in" onClick={toggleSidebar}></div>
            )}

            {/* 2. SIDEBAR NAVIGATION */}
            <div className={`fixed md:static inset-y-0 left-0 bg-blue-900 text-white w-64 z-50 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 transition-transform duration-350 flex flex-col`}>
                <div className="p-6 text-center border-b border-blue-800">
                    <div className="w-16 h-16 bg-white/10 rounded-full mx-auto flex items-center justify-center mb-3"><User size={32} className="text-yellow-400" /></div>
                    <h3 className="font-bold text-lg truncate px-2">{user.name}</h3>
                    <span className="bg-blue-800 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider text-blue-200">{user.role} Role</span>
                </div>

                <nav className="flex-grow p-4 space-y-2 overflow-y-auto">
                    {user.role === 'admin' && (
                        <>
                            <div className="text-[10px] font-bold text-blue-400 uppercase tracking-wider mb-2 mt-2 px-2">Keuangan & Performa</div>
                            <SidebarBtn icon={<LayoutDashboard />} label="Overview Bisnis" active={activeTab === 'overview'} onClick={() => { setActiveTab('overview'); setIsSidebarOpen(false); }} />
                            <SidebarBtn icon={<DollarSign />} label="Laporan Finansial" active={activeTab === 'all_sales'} onClick={() => { setActiveTab('all_sales'); setIsSidebarOpen(false); }} />
                            <SidebarBtn icon={<Award />} label="Penggajian Komisi" active={activeTab === 'commission'} onClick={() => { setActiveTab('commission'); setIsSidebarOpen(false); }} />
                            <SidebarBtn icon={<Trophy />} label="Leaderboard Sales" active={activeTab === 'leaderboard'} onClick={() => { setActiveTab('leaderboard'); setIsSidebarOpen(false); }} />

                            <div className="text-[10px] font-bold text-blue-400 uppercase tracking-wider mb-2 mt-6 px-2">Manajemen Konten</div>
                            <SidebarBtn icon={<FileText />} label="Pratinjau Landing" active={activeTab === 'manage_previews'} onClick={() => { setActiveTab('manage_previews'); setIsSidebarOpen(false); }} />
                            <SidebarBtn icon={<Package />} label="Katalog Landing" active={activeTab === 'manage_catalog'} onClick={() => { setActiveTab('manage_catalog'); setIsSidebarOpen(false); }} />
                            <SidebarBtn icon={<Users />} label="Manajemen Staff" active={activeTab === 'manage_staff'} onClick={() => { setActiveTab('manage_staff'); setIsSidebarOpen(false); }} />
                            <SidebarBtn icon={<MessageCircle />} label="Pusat Leads (CRM)" active={activeTab === 'manage_leads'} onClick={() => { setActiveTab('manage_leads'); setIsSidebarOpen(false); }} />
                            <SidebarBtn icon={<Lock />} label="Favicon & Brand" active={activeTab === 'brand_settings'} onClick={() => { setActiveTab('brand_settings'); setIsSidebarOpen(false); }} />
                            <SidebarBtn icon={<Package />} label="Atur File Drive" active={activeTab === 'manage_admin_drive'} onClick={() => { setActiveTab('manage_admin_drive'); setIsSidebarOpen(false); }} />
                            <SidebarBtn icon={<Clock />} label="Log Akses Drive" active={activeTab === 'manage_admin_logs'} onClick={() => { setActiveTab('manage_admin_logs'); setIsSidebarOpen(false); }} />
                        </>
                    )}
                    {user.role === 'staff' && (
                        <>
                            <SidebarBtn icon={<PlusCircle />} label="Input Closingan" active={activeTab === 'input'} onClick={() => { setActiveTab('input'); setIsSidebarOpen(false); }} />
                            <SidebarBtn icon={<ShoppingBag />} label="Riwayat Penjualan" active={activeTab === 'my_sales'} onClick={() => { setActiveTab('my_sales'); setIsSidebarOpen(false); }} />
                            <SidebarBtn icon={<Award />} label="Laporan Komisi Saya" active={activeTab === 'my_commissions'} onClick={() => { setActiveTab('my_commissions'); setIsSidebarOpen(false); }} />
                            <SidebarBtn icon={<Book />} label="Unduh Sampel Perangkat" active={activeTab === 'resource_hub'} onClick={() => { setActiveTab('resource_hub'); setIsSidebarOpen(false); }} />
                            <SidebarBtn icon={<BarChart3 />} label="Buku Kas Penjualan" active={activeTab === 'my_ledger'} onClick={() => { setActiveTab('my_ledger'); setIsSidebarOpen(false); }} />
                        </>
                    )}
                </nav>
                <div className="p-4 border-t border-blue-800">
                    <button onClick={onLogout} className="w-full flex items-center justify-center gap-2 text-blue-200 hover:text-white hover:bg-red-500/20 px-4 py-2 rounded-lg transition"><LogOut size={16} /> Keluar</button>
                </div>
            </div>

            {/* 3. MAIN CONTENT VIEW */}
            <div className="flex-grow overflow-y-auto pt-16 md:pt-0">
                <main className="p-4 md:p-8">
                    {user.role === 'admin' && activeTab === 'overview' && (
                        <AdminOverview salesData={salesData} expensesData={expensesData} />
                    )}
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
                            showConfirm={showConfirm}
                        />
                    )}
                    {user.role === 'admin' && activeTab === 'commission' && (
                        <CommissionReport
                            salesData={salesData}
                            payoutsData={payoutsData}
                            usersData={usersData}
                            payStaffCommission={payStaffCommission}
                            showAlert={showAlert}
                            showConfirm={showConfirm}
                        />
                    )}
                    {user.role === 'admin' && activeTab === 'leaderboard' && <Leaderboard salesData={salesData} />}
                    {user.role === 'admin' && activeTab === 'manage_previews' && (
                        <ManagePreviews
                            previewsData={previewsData}
                            updatePreview={updatePreview}
                            showAlert={showAlert}
                        />
                    )}
                    {user.role === 'admin' && activeTab === 'manage_catalog' && <ManageCatalog catalogData={catalogData} addProduct={addProduct} updateProduct={updateProduct} deleteProduct={deleteProduct} showConfirm={showConfirm} db={db} appId={appId} writeActivityLog={writeActivityLog} showAlert={showAlert} />}
                    {user.role === 'admin' && activeTab === 'manage_staff' && <ManageStaff usersData={usersData} addStaffUser={addStaffUser} deleteStaffUser={deleteStaffUser} showConfirm={showConfirm} />}
                    {user.role === 'admin' && activeTab === 'manage_leads' && (
                        <ManageLeadsDashboard leadsData={leadsData} showAlert={showAlert} />
                    )}
                    {user.role === 'admin' && activeTab === 'brand_settings' && (
                        <ManageBrandSettings appSettings={appSettings} db={db} appId={appId} showAlert={showAlert} />
                    )}
                    {user.role === 'admin' && activeTab === 'manage_admin_drive' && (
                        <ManageAdminDrive db={db} appId={appId} showAlert={showAlert} showConfirm={showConfirm} />
                    )}
                    {user.role === 'admin' && activeTab === 'manage_admin_logs' && (
                        <ManageAdminLogs db={db} appId={appId} />
                    )}
                    {user.role === 'staff' && activeTab === 'resource_hub' && (
                        <StaffResourceHub db={db} appId={appId} user={user} showAlert={showAlert} />
                    )}
                    {user.role === 'staff' && activeTab === 'my_ledger' && (
                        <StaffSalesLedger mySalesData={salesData.filter(s => s.staffName === user.name)} />
                    )}
                    {user.role === 'staff' && activeTab === 'input' && <StaffInputForm addSale={addSale} userName={user.name} setTab={setActiveTab} catalogData={catalogData} writeActivityLog={writeActivityLog} appSettings={appSettings} />}
                    {user.role === 'staff' && activeTab === 'my_sales' && <SalesTable data={salesData.filter(s => s.staffName === user.name)} title="Riwayat Penjualan Saya" showFilters={false} isAdmin={false} />}
                    {user.role === 'staff' && activeTab === 'my_commissions' && (
                        <StaffCommissions staffName={user.name} salesData={salesData} payoutsData={payoutsData} />
                    )}
                </main>
            </div>
        </div>
    );
}

// ---------------------- SHARED SUB-COMPONENTS ----------------------

function SidebarBtn({ icon, label, active, onClick }) {
    return (
        <button onClick={onClick} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm ${active ? 'bg-blue-600 text-white shadow' : 'text-blue-200 hover:bg-blue-800 hover:text-white'}`}>
            {React.cloneElement(icon, { size: 18 })}
            <span className="font-medium">{label}</span>
        </button>
    );
}

function AdminOverview({ salesData, expensesData }) {
    const [startDate, setStartDate] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        return d.toISOString().split('T')[0];
    });
    const [endDate, setEndDate] = useState(() => {
        return new Date().toISOString().split('T')[0];
    });

    const [chartPeriod, setChartPeriod] = useState('daily');

    const filteredSales = salesData.filter(s => s.date >= startDate && s.date <= endDate);
    const filteredExpenses = expensesData.filter(e => e.date >= startDate && e.date <= endDate);

    const totalRevenue = filteredSales.reduce((acc, curr) => acc + curr.amount, 0);

    const staffDailySales = {};
    let totalCommissionCost = 0;
    let totalBonusCost = 0;

    filteredSales.forEach(sale => {
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
    const totalOperationalExpenses = filteredExpenses.reduce((acc, curr) => acc + curr.amount, 0);
    const totalExpenses = totalOperationalExpenses + totalCommissionExpenses;
    const totalNetProfit = totalRevenue - totalExpenses;

    const activeDatesList = [];
    const loopDate = new Date(startDate);
    const endLoopDate = new Date(endDate);
    let protectionCounter = 0;

    while (loopDate <= endLoopDate && protectionCounter < 45) {
        activeDatesList.push(loopDate.toISOString().split('T')[0]);
        loopDate.setDate(loopDate.getDate() + 1);
        protectionCounter++;
    }

    const dailyStats = activeDatesList.map(date => {
        const revenue = filteredSales.filter(s => s.date === date).reduce((acc, curr) => acc + curr.amount, 0);
        const opExpenses = filteredExpenses.filter(e => e.date === date).reduce((acc, curr) => acc + curr.amount, 0);

        const salesOnDay = filteredSales.filter(s => s.date === date);
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

    const activeMonthsList = [];
    const startM = new Date(startDate);
    const endM = new Date(endDate);
    let loopMonth = new Date(startM.getFullYear(), startM.getMonth(), 2);
    let protectionMonth = 0;

    while (loopMonth <= new Date(endM.getFullYear(), endM.getMonth() + 1, 1) && protectionMonth < 12) {
        const yStr = loopMonth.getFullYear();
        const mStr = String(loopMonth.getMonth() + 1).padStart(2, '0');
        const monthKey = `${yStr}-${mStr}`;
        if (!activeMonthsList.includes(monthKey)) {
            activeMonthsList.push(monthKey);
        }
        loopMonth.setMonth(loopMonth.getMonth() + 1);
        protectionMonth++;
    }

    const monthlyStats = activeMonthsList.map(month => {
        const revenue = filteredSales.filter(s => s.date.startsWith(month)).reduce((acc, curr) => acc + curr.amount, 0);
        const opExpenses = filteredExpenses.filter(e => e.date.startsWith(month)).reduce((acc, curr) => acc + curr.amount, 0);

        const salesInMonth = filteredSales.filter(s => s.date.startsWith(month));
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

    const productStats = {};
    filteredSales.forEach(sale => {
        const prod = sale.product || 'Modul Lainnya';
        if (!productStats[prod]) productStats[prod] = { count: 0, revenue: 0 };
        productStats[prod].count += 1;
        productStats[prod].revenue += sale.amount;
    });
    const bestSelling = Object.keys(productStats)
        .map(name => ({ name, ...productStats[name] }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

    const categoryStats = {
        'Komisi & Gaji': totalCommissionExpenses,
        'Operasional': 0,
        'Marketing': 0,
        'Lain-lain': 0
    };
    filteredExpenses.forEach(exp => {
        const cat = exp.category || 'Lain-lain';
        if (categoryStats[cat] !== undefined) {
            categoryStats[cat] += exp.amount;
        } else {
            categoryStats['Lain-lain'] += exp.amount;
        }
    });

    const getDailyChartPoints = () => {
        if (dailyStats.length === 0) return { pointsRev: '', pointsProf: '', maxVal: 100000, width: 800 };
        const maxVal = Math.max(...dailyStats.map(s => Math.max(s.revenue, s.profit)), 100000);
        const width = Math.max(800, dailyStats.length * 50);
        const height = 200;
        const padding = 20;

        const pointsRev = dailyStats.map((s, idx) => {
            const x = padding + (idx * (width - padding * 2)) / Math.max((dailyStats.length - 1), 1);
            const y = height - padding - (s.revenue * (height - padding * 2)) / maxVal;
            return `${x},${y}`;
        }).join(' ');

        const pointsProf = dailyStats.map((s, idx) => {
            const x = padding + (idx * (width - padding * 2)) / Math.max((dailyStats.length - 1), 1);
            const y = height - padding - (s.profit * (height - padding * 2)) / maxVal;
            return `${x},${y}`;
        }).join(' ');

        return { pointsRev, pointsProf, maxVal, width };
    };

    const dailyPoints = getDailyChartPoints();

    return (
        <div className="space-y-6 animate-in fade-in pt-4 md:pt-0">
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 border-b pb-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-800 tracking-tight text-blue-950">Overview Bisnis Owner</h1>
                    <p className="text-gray-500 text-sm mt-1">Pantau perolehan omzet, pengeluaran operasional, dan keuntungan bersih secara real-time.</p>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-white p-3 rounded-xl border w-full xl:w-auto shadow-sm">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-500 uppercase whitespace-nowrap">Periode:</span>
                        <input
                            type="date"
                            value={startDate}
                            onChange={e => setStartDate(e.target.value)}
                            className="border px-2.5 py-1 text-xs rounded-lg bg-gray-50 text-gray-855 font-bold focus:ring-2 focus:ring-blue-500"
                        />
                        <span className="text-xs text-gray-400">s/d</span>
                        <input
                            type="date"
                            value={endDate}
                            onChange={e => setEndDate(e.target.value)}
                            className="border px-2.5 py-1 text-xs rounded-lg bg-gray-50 text-gray-855 font-bold focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between hover:shadow-md transition animate-in">
                    <div className="space-y-2">
                        <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Total Omzet (Revenue)</p>
                        <h3 className="text-2xl font-black text-gray-800">Rp {totalRevenue.toLocaleString('id-ID')}</h3>
                        <p className="text-[11px] text-green-500 font-medium flex items-center gap-1">
                            <span className="bg-green-50 px-2 py-0.5 rounded-full">Bruto</span>
                            <span>Total penjualan terfilter</span>
                        </p>
                    </div>
                    <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shadow-inner"><DollarSign size={28} /></div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between hover:shadow-md transition w-full">
                    <div className="space-y-2 w-full">
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
                    <div className="w-14 h-14 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center shadow-inner self-start mt-2"><DollarSign size={28} className="rotate-180" /></div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between hover:shadow-md transition sm:col-span-2 lg:col-span-1">
                    <div className="space-y-2">
                        <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Keuntungan Bersih (Profit)</p>
                        <h3 className={`text-2xl font-black ${totalNetProfit >= 0 ? 'text-green-600' : 'text-rose-600'}`}>
                            Rp {totalNetProfit.toLocaleString('id-ID')}
                        </h3>
                        <p className="text-[11px] text-blue-500 font-medium flex items-center gap-1">
                            <span className="bg-blue-50 px-2 py-0.5 rounded-full">Netto</span>
                            <span>Sisa omzet dikurangi biaya</span>
                        </p>
                    </div>
                    <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shadow-inner"><TrendingUp size={28} /></div>
                </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                    <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                        <TrendingUp size={20} className="text-blue-500" />
                        <span>Tren Performa Keuangan {chartPeriod === 'daily' ? 'Harian' : 'Bulanan'}</span>
                    </h3>
                    <div className="bg-gray-100 border rounded-xl p-1 flex gap-1.5 self-stretch sm:self-auto">
                        <button
                            onClick={() => setChartPeriod('daily')}
                            className={`flex-1 sm:flex-none text-xs font-semibold py-1.5 px-3 rounded-lg transition-all ${chartPeriod === 'daily' ? 'bg-white text-blue-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
                        >
                            Harian
                        </button>
                        <button
                            onClick={() => setChartPeriod('monthly')}
                            className={`flex-1 sm:flex-none text-xs font-semibold py-1.5 px-3 rounded-lg transition-all ${chartPeriod === 'monthly' ? 'bg-white text-blue-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
                        >
                            Bulanan
                        </button>
                    </div>
                </div>

                {chartPeriod === 'daily' ? (
                    <div className="space-y-4">
                        <div className="flex flex-wrap gap-4 text-xs font-semibold justify-end">
                            <div className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 bg-blue-600 rounded-sm"></span> Omzet (Revenue)</div>
                            <div className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 bg-green-500 rounded-sm"></span> Laba Bersih (Profit)</div>
                        </div>

                        <div className="relative w-full h-64 border rounded-xl p-4 bg-gray-50 flex flex-col justify-between overflow-x-auto">
                            {dailyStats.length === 0 ? (
                                <div className="flex-grow flex items-center justify-center text-gray-400 text-sm">Belum ada data transaksi harian pada rentang tanggal ini.</div>
                            ) : (
                                <div className="w-full mx-auto flex-grow flex flex-col justify-between relative" style={{ minWidth: `${dailyPoints.width}px` }}>
                                    <svg viewBox={`0 0 ${dailyPoints.width} 200`} className="w-full h-44 overflow-visible">
                                        <line x1="20" y1="20" x2={dailyPoints.width - 20} y2="20" stroke="#e5e7eb" strokeDasharray="4" />
                                        <line x1="20" y1="100" x2={dailyPoints.width - 20} y2="100" stroke="#e5e7eb" strokeDasharray="4" />
                                        <line x1="20" y1="180" x2={dailyPoints.width - 20} y2="180" stroke="#e5e7eb" strokeDasharray="4" />

                                        <polyline
                                            fill="none"
                                            stroke="#2563eb"
                                            strokeWidth="3.5"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            points={dailyPoints.pointsRev}
                                        />

                                        <polyline
                                            fill="none"
                                            stroke="#10b981"
                                            strokeWidth="3.5"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            points={dailyPoints.pointsProf}
                                        />

                                        {dailyStats.map((s, idx) => {
                                            const width = dailyPoints.width;
                                            const height = 200;
                                            const padding = 20;
                                            const x = padding + (idx * (width - padding * 2)) / Math.max((dailyStats.length - 1), 1);
                                            const yRev = height - padding - (s.revenue * (height - padding * 2)) / dailyPoints.maxVal;
                                            const yProf = height - padding - (s.profit * (height - padding * 2)) / dailyPoints.maxVal;

                                            return (
                                                <g key={idx} className="group cursor-pointer">
                                                    <circle cx={x} cy={yRev} r="4.5" fill="#2563eb" stroke="#ffffff" strokeWidth="2" />
                                                    <circle cx={x} cy={yProf} r="4.5" fill="#10b981" stroke="#ffffff" strokeWidth="2" />
                                                </g>
                                            );
                                        })}
                                    </svg>

                                    <div className="flex justify-between px-[20px] text-[10px] text-gray-500 font-bold border-t pt-2 w-full">
                                        {dailyStats.map((s, idx) => {
                                            const [_, m, d] = s.date.split('-');
                                            return <span key={idx} className="w-12 text-center -ml-6">{d}/{m}</span>;
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4 animate-in fade-in duration-250">
                        <div className="flex flex-wrap gap-4 text-xs font-semibold justify-end">
                            <div className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 bg-blue-600 rounded-sm"></span> Omzet (Revenue)</div>
                            <div className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 bg-rose-500 rounded-sm"></span> Pengeluaran (Expenses)</div>
                            <div className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 bg-emerald-500 rounded-sm"></span> Laba Bersih (Profit)</div>
                        </div>

                        <div className="relative w-full h-64 border rounded-xl p-4 bg-gray-50 flex items-end justify-between overflow-x-auto gap-4">
                            {monthlyStats.length === 0 ? (
                                <div className="flex-grow flex items-center justify-center text-gray-400 text-sm">Belum ada data bulanan pada rentang tanggal ini.</div>
                            ) : (
                                monthlyStats.map((m, idx) => {
                                    const maxVal = Math.max(...monthlyStats.map(s => Math.max(s.revenue, s.expenses, s.profit)), 100000);
                                    const heightRev = (m.revenue / maxVal) * 140;
                                    const heightExp = (m.expenses / maxVal) * 140;
                                    const heightProf = (Math.max(m.profit, 0) / maxVal) * 140;

                                    return (
                                        <div key={idx} className="flex-1 min-w-[80px] flex flex-col items-center gap-2 group">
                                            <div className="w-full flex items-end justify-center gap-1.5 h-36 border-b pb-1">
                                                <div
                                                    style={{ height: `${Math.max(heightRev, 4)}px` }}
                                                    className="w-4 bg-blue-600 hover:bg-blue-700 transition rounded-t-sm shadow-sm relative"
                                                    title={`Omzet: Rp ${m.revenue.toLocaleString('id-ID')}`}
                                                ></div>
                                                <div
                                                    style={{ height: `${Math.max(heightExp, 4)}px` }}
                                                    className="w-4 bg-rose-500 hover:bg-rose-600 transition rounded-t-sm shadow-sm relative"
                                                    title={`Pengeluaran: Rp ${m.expenses.toLocaleString('id-ID')}`}
                                                ></div>
                                                <div
                                                    style={{ height: `${Math.max(heightProf, 4)}px` }}
                                                    className="w-4 bg-emerald-500 hover:bg-emerald-600 transition rounded-t-sm shadow-sm relative"
                                                    title={`Profit: Rp ${m.profit.toLocaleString('id-ID')}`}
                                                ></div>
                                            </div>
                                            <span className="text-[10px] text-gray-500 font-bold whitespace-nowrap">{m.label}</span>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col animate-in slide-in-from-bottom duration-300">
                    <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <BarChart3 size={20} className="text-blue-500" />
                        <span>Penjualan Paket Modul Terbaik (Terfilter)</span>
                    </h3>
                    <div className="flex-grow flex flex-col justify-center">
                        {bestSelling.length === 0 ? (
                            <p className="text-gray-400 text-sm text-center py-8">Belum ada modul terjual pada periode ini.</p>
                        ) : (
                            <div className="space-y-4">
                                {bestSelling.map((prod, idx) => (
                                    <div key={idx} className="flex items-center justify-between border-b last:border-0 pb-2 last:pb-0 font-medium">
                                        <div className="space-y-1">
                                            <span className="text-sm font-bold text-gray-800">{prod.name}</span>
                                            <p className="text-xs text-gray-400">{prod.count} Paket Terjual</p>
                                        </div>
                                        <span className="text-sm font-black text-green-600">Rp {prod.revenue.toLocaleString('id-ID')}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col animate-in slide-in-from-bottom duration-300">
                    <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <PieChart size={20} className="text-blue-500" />
                        <span>Alokasi Biaya Pengeluaran (Terfilter)</span>
                    </h3>
                    <div className="flex-grow flex flex-col justify-center space-y-4">
                        {totalExpenses === 0 ? (
                            <p className="text-gray-400 text-sm text-center py-8">Belum ada pengeluaran dicatat pada periode ini.</p>
                        ) : (
                            Object.keys(categoryStats).map((cat, idx) => {
                                const amount = categoryStats[cat];
                                const percentage = totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0;
                                const barColors = [
                                    'bg-purple-500',
                                    'bg-blue-500',
                                    'bg-rose-500',
                                    'bg-gray-400'
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
    deleteExpense,
    showConfirm
}) {
    const [subTab, setSubTab] = useState('sales');
    const [cashFlowPeriod, setCashFlowPeriod] = useState('daily');
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStaff, setFilterStaff] = useState('');
    const [monthFilter, setMonthFilter] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 25;

    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, filterStaff, monthFilter, subTab, cashFlowPeriod]);

    let filteredSales = data.filter(sale => {
        const matchSearch = sale.customer.toLowerCase().includes(searchQuery.toLowerCase());
        const matchStaff = filterStaff ? sale.staffName === filterStaff : true;
        const matchMonth = monthFilter ? sale.date.startsWith(monthFilter) : true;
        return matchSearch && matchStaff && matchMonth;
    }).sort((a, b) => new Date(b.date) - new Date(a.date));

    const totalPages = Math.ceil(filteredSales.length / itemsPerPage);
    const paginatedSales = filteredSales.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    // Sales filters
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


    // Expenses Filtering
    const filteredExpenses = expensesData.filter(exp => {
        let matchCategory = expenseCategoryFilter ? exp.category === expenseCategoryFilter : true;
        let matchSearch = expenseSearchQuery ? (exp.notes || '').toLowerCase().includes(expenseSearchQuery.toLowerCase()) : true;
        return matchCategory && matchSearch;
    });

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

    const allActiveMonths = Array.from(new Set([
        ...data.map(s => s.date.slice(0, 7)),
        ...expensesData.map(e => e.date.slice(0, 7))
    ])).sort((a, b) => new Date(b + '-02') - new Date(a + '-02'));

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

    const startEdit = (sale) => {
        setEditingId(sale.id);
        setEditForm({ date: sale.date, customer: sale.customer, product: sale.product, notes: sale.notes || '', amount: sale.amount });
    };

    const saveEdit = async (id) => {
        await updateSale(id, { ...editForm, amount: Number(editForm.amount) });
        setEditingId(null);
    };

    if (!isAdmin) {
        return (
            <div className="space-y-4 animate-in fade-in">
                <h1 className="text-xl font-bold text-gray-800">{title}</h1>
                <div className="bg-white rounded-xl shadow-sm border overflow-hidden">

                    <div className="overflow-x-auto hidden md:block animate-in">
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
                                {paginatedSales.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="text-center py-6 text-gray-400">Belum ada riwayat penjualan.</td>
                                    </tr>
                                ) : (
                                    paginatedSales.map(sale => (
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

                    <div className="block md:hidden space-y-3 p-3 bg-gray-50">
                        {paginatedSales.length === 0 ? (
                            <p className="text-center py-6 text-gray-400 text-xs">Belum ada riwayat penjualan.</p>
                        ) : (
                            paginatedSales.map(sale => (
                                <div key={sale.id} className="bg-white p-4 rounded-xl border shadow-sm space-y-2.5">
                                    <div className="flex justify-between items-center border-b pb-1.5">
                                        <span className="font-bold text-gray-855 text-sm">{sale.customer}</span>
                                        <span className="text-[10px] text-gray-400 font-semibold">{sale.date}</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-y-1 text-xs text-gray-600 font-medium">
                                        <span>Paket Modul:</span>
                                        <span className="text-right text-blue-600 font-bold">{sale.product}</span>

                                        <span>Nominal Closing:</span>
                                        <span className="text-right text-green-600 font-black">Rp {sale.amount.toLocaleString('id-ID')}</span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                    <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in">
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 border-b pb-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-800 tracking-tight text-blue-950">{title}</h1>
                    <p className="text-gray-500 text-sm mt-1">Kelola dan pantau seluruh arus keuangan masuk & keluar secara transparan.</p>
                </div>

                <div className="bg-gray-150 p-1.5 rounded-xl flex flex-wrap gap-1 w-full xl:w-auto shadow-inner">
                    <button
                        onClick={() => setSubTab('cash_flow')}
                        className={`flex-1 xl:flex-none text-xs font-bold py-2 px-4 rounded-lg transition-all ${subTab === 'cash_flow' ? 'bg-white text-blue-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
                    >
                        Buku Arus Kas
                    </button>
                    <button
                        onClick={() => setSubTab('sales')}
                        className={`flex-1 xl:flex-none text-xs font-bold py-2 px-4 rounded-lg transition-all ${subTab === 'sales' ? 'bg-white text-blue-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
                    >
                        Pemasukan (Sales)
                    </button>
                    <button
                        onClick={() => setSubTab('expenses')}
                        className={`flex-1 xl:flex-none text-xs font-bold py-2 px-4 rounded-lg transition-all ${subTab === 'expenses' ? 'bg-white text-blue-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
                    >
                        Pengeluaran (Operasional)
                    </button>
                </div>
            </div>

            {subTab === 'cash_flow' && (
                <div className="space-y-4 animate-in fade-in">
                    <div className="flex justify-between items-center bg-white p-4 rounded-xl border shadow-sm">
                        <span className="text-sm font-bold text-gray-700">Tampilan Periode Buku Kas:</span>
                        <div className="flex gap-1.5 bg-gray-100 p-1 rounded-lg">
                            <button
                                onClick={() => setCashFlowPeriod('daily')}
                                className={`text-xs font-semibold py-1.5 px-3 rounded-lg transition-all ${cashFlowPeriod === 'daily' ? 'bg-white text-gray-855 shadow-sm' : 'text-gray-500'}`}
                            >
                                Harian
                            </button>
                            <button
                                onClick={() => setChartPeriod('monthly')}
                                className={`text-xs font-semibold py-1.5 px-3 rounded-lg transition-all ${cashFlowPeriod === 'monthly' ? 'bg-white text-gray-855 shadow-sm' : 'text-gray-500'}`}
                            >
                                Bulanan
                            </button>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">

                        <div className="overflow-x-auto hidden md:block">
                            <table className="w-full text-left text-sm text-gray-600">
                                <thead className="bg-gray-50 border-b">
                                    <tr>
                                        <th className="px-6 py-3.5 font-bold text-gray-700">Waktu</th>
                                        <th className="px-6 py-3.5 font-bold text-gray-700 text-right">Pemasukan (Omzet)</th>
                                        <th className="px-6 py-3.5 font-bold text-gray-700 text-right">Pengeluaran (Total)</th>
                                        <th className="px-6 py-3.5 font-bold text-gray-700 text-right">Laba Bersih</th>
                                        <th className="px-6 py-3.5 font-bold text-gray-700 text-center">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(cashFlowPeriod === 'daily' ? dailyCashFlow : monthlyCashFlow).length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="text-center py-8 text-gray-400">Belum ada data kas keuangan.</td>
                                        </tr>
                                    ) : (
                                        (cashFlowPeriod === 'daily' ? dailyCashFlow : monthlyCashFlow).map((cf, idx) => (
                                            <tr key={idx} className="border-b hover:bg-gray-50/50">
                                                <td className="px-6 py-4 font-bold text-gray-800">{cashFlowPeriod === 'daily' ? cf.date : cf.label}</td>
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
                        </div>

                        <div className="block md:hidden space-y-3 p-3 bg-gray-50">
                            {(cashFlowPeriod === 'daily' ? dailyCashFlow : monthlyCashFlow).length === 0 ? (
                                <p className="text-center py-6 text-gray-400 text-xs">Belum ada data kas harian.</p>
                            ) : (
                                (cashFlowPeriod === 'daily' ? dailyCashFlow : monthlyCashFlow).map((cf, idx) => (
                                    <div key={idx} className="bg-white p-4 rounded-xl border shadow-sm space-y-2.5">
                                        <div className="flex justify-between items-center border-b pb-1.5">
                                            <span className="font-bold text-gray-800 text-sm">{cashFlowPeriod === 'daily' ? cf.date : cf.label}</span>
                                            <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${cf.profit >= 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                                {cf.profit >= 0 ? 'Untung' : 'Rugi'}
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-y-1 text-xs text-gray-600 font-medium">
                                            <span>Omzet Masuk:</span>
                                            <span className="text-right text-blue-600 font-bold">Rp {cf.revenue.toLocaleString('id-ID')}</span>

                                            <span>Total Keluar:</span>
                                            <span className="text-right text-rose-500 font-bold">Rp {cf.expenses.toLocaleString('id-ID')}</span>

                                            <span className="border-t pt-1 font-bold text-gray-800">Laba Bersih:</span>
                                            <span className={`text-right border-t pt-1 font-black ${cf.profit >= 0 ? 'text-green-600' : 'text-rose-600'}`}>Rp {cf.profit.toLocaleString('id-ID')}</span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                    </div>
                </div>
            )}

            {subTab === 'sales' && (
                <div className="space-y-4 animate-in fade-in">
                    <div className="bg-white p-4 rounded-xl border flex flex-col md:flex-row gap-4 items-center justify-between shadow-sm">
                        <div className="w-full md:w-1/3 flex items-center bg-gray-50 border rounded-lg px-3 py-2 bg-white">
                            <Search size={16} className="text-gray-400 mr-2" />
                            <input
                                type="text"
                                placeholder="Cari nama kustomer..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="bg-transparent border-none text-sm w-full focus:outline-none text-gray-855"
                            />
                        </div>

                        <div className="w-full md:w-auto flex gap-2">
                            <select
                                value={filterStaff}
                                onChange={e => setFilterStaff(e.target.value)}
                                className="w-full md:w-48 border px-3 py-2 rounded-lg text-sm bg-white font-medium"
                            >
                                <option value="">Semua Staff Sales</option>
                                {Array.from(new Set(data.map(s => s.staffName))).map((staff, i) => (
                                    <option key={i} value={staff}>{staff}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">

                        <div className="overflow-x-auto hidden md:block">
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
                                    {paginatedSales.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="text-center py-8 text-gray-400">Tidak ada transaksi penjualan yang cocok.</td>
                                        </tr>
                                    ) : (
                                        paginatedSales.map(sale => (
                                            <tr key={sale.id} className="border-b hover:bg-gray-50/50 animate-in">
                                                {editingId === sale.id ? (
                                                    <>
                                                        <td className="px-6 py-3"><input type="date" value={editForm.date} onChange={e => setEditForm({ ...editForm, date: e.target.value })} className="border px-2 py-1 rounded w-full text-sm bg-white" /></td>
                                                        <td className="px-6 py-3 text-sm font-bold text-gray-800">{sale.staffName}</td>
                                                        <td className="px-6 py-3"><input type="text" value={editForm.customer} onChange={e => setEditForm({ ...editForm, customer: e.target.value })} className="border px-2 py-1 rounded w-full text-sm bg-white text-gray-800" /></td>
                                                        <td className="px-6 py-3"><input type="text" value={editForm.product} onChange={e => setEditForm({ ...editForm, product: e.target.value })} className="border px-2 py-1 rounded w-full text-sm bg-white text-gray-800" /></td>
                                                        <td className="px-6 py-3"><input type="number" value={editForm.amount} onChange={e => setEditForm({ ...editForm, amount: e.target.value })} className="border px-2 py-1 rounded w-full text-sm text-right font-bold bg-white text-gray-800" /></td>
                                                        <td className="px-6 py-3 text-center space-x-2 whitespace-nowrap">
                                                            <button onClick={() => saveEdit(sale.id)} className="bg-blue-600 text-white font-bold px-3 py-1.5 rounded-lg text-xs hover:bg-blue-700 transition">Simpan</button>
                                                            <button onClick={() => setEditingId(null)} className="bg-gray-400 text-white font-bold px-3 py-1.5 rounded-lg text-xs hover:bg-gray-500 transition">Batal</button>
                                                        </td>
                                                    </>
                                                ) : (
                                                    <>
                                                        <td className="px-6 py-4 whitespace-nowrap font-medium">{sale.date}</td>
                                                        <td className="px-6 py-4 font-bold text-blue-900">{sale.staffName}</td>
                                                        <td className="px-6 py-4 text-gray-855">{sale.customer}</td>
                                                        <td className="px-6 py-4"><span className="bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full text-xs font-bold">{sale.product}</span></td>
                                                        <td className="px-6 py-4 text-right font-black text-green-600">Rp {sale.amount.toLocaleString('id-ID')}</td>
                                                        <td className="px-6 py-4 text-center space-x-3 whitespace-nowrap">
                                                            <button onClick={() => startEdit(sale)} className="text-blue-600 hover:text-blue-800 inline-block" title="Edit Transaksi"><Edit size={16} /></button>
                                                            <button onClick={() => showConfirm("Yakin hapus transaksi ini secara permanen?", () => deleteSale(sale.id))} className="text-red-500 hover:text-red-700 inline-block" title="Hapus Transaksi"><Trash2 size={16} /></button><button
                                                                onClick={() => {
                                                                    const invoiceText = `======================================\n         SOBAT GURU DIGITAL 2026\n======================================\nBUKTI PEMBAYARAN RESMI (NOTA SPJ)\nID TRANSAKSI : SGD-${sale.id.slice(0, 6).toUpperCase()}\nTanggal      : ${sale.date}\n\nDIBAYARKAN KEPADA:\nNama Guru    : ${sale.customer}\nMitra Kerja  : Sobat Guru Digital\n\nRINCIAN ITEM:\nNama Paket   : ${sale.product}\nFormat File  : Microsoft Word (Editable DOCX)\nTOTAL BIAYA  : Rp ${sale.amount.toLocaleString('id-ID')}\nSTATUS       : LUNAS & SAH\n======================================`;
                                                                    navigator.clipboard.writeText(invoiceText);
                                                                    alert(`Bukti transaksi SPJ untuk ${sale.customer} berhasil disalin ke clipboard!`);
                                                                }}
                                                                className="bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-bold py-1 px-2.5 rounded-lg transition mr-2"
                                                            >
                                                                Kuitansi SPJ
                                                            </button>
                                                        </td>
                                                    </>
                                                )}
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <div className="block md:hidden space-y-3 p-3 bg-gray-50">
                            {paginatedSales.length === 0 ? (
                                <p className="text-center py-6 text-gray-400 text-xs">Tidak ada transaksi penjualan yang cocok.</p>
                            ) : (
                                paginatedSales.map(sale => (
                                    <div key={sale.id} className="bg-white p-4 rounded-xl border shadow-sm space-y-2">
                                        {editingId === sale.id ? (
                                            <div className="space-y-3 animate-in slide-in-from-top-2">
                                                <input type="date" value={editForm.date} onChange={e => setEditForm({ ...editForm, date: e.target.value })} className="border px-3 py-1.5 rounded-lg w-full text-xs bg-white text-gray-800" />
                                                <input type="text" placeholder="Kustomer" value={editForm.customer} onChange={e => setEditForm({ ...editForm, customer: e.target.value })} className="border px-3 py-1.5 rounded-lg w-full text-xs bg-white text-gray-800" />
                                                <input type="text" placeholder="Produk" value={editForm.product} onChange={e => setEditForm({ ...editForm, product: e.target.value })} className="border px-3 py-1.5 rounded-lg w-full text-xs bg-white text-gray-800" />
                                                <input type="number" placeholder="Nominal" value={editForm.amount} onChange={e => setEditForm({ ...editForm, amount: e.target.value })} className="border px-3 py-1.5 rounded-lg w-full text-xs text-right font-bold bg-white text-gray-800" />
                                                <div className="flex gap-2">
                                                    <button onClick={() => saveEdit(sale.id)} className="flex-1 bg-blue-600 text-white font-bold py-1.5 rounded-lg text-xs">Simpan</button>
                                                    <button onClick={() => setEditingId(null)} className="flex-1 bg-gray-400 text-white font-bold py-1.5 rounded-lg text-xs">Batal</button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="space-y-2.5">
                                                <div className="flex justify-between items-center border-b pb-1.5">
                                                    <div>
                                                        <span className="text-xs font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded-full">{sale.staffName}</span>
                                                        <p className="text-[10px] text-gray-400 mt-1 font-semibold">{sale.date}</p>
                                                    </div>
                                                    <div className="space-x-3">
                                                        <button onClick={() => startEdit(sale)} className="text-blue-600 hover:text-blue-800" title="Edit"><Edit size={14} /></button>
                                                        <button onClick={() => showConfirm("Yakin hapus transaksi ini secara permanen?", () => deleteSale(sale.id))} className="text-red-500 hover:text-red-700" title="Hapus"><Trash2 size={14} /></button>
                                                        <div className="space-x-3">
                                                            <button
                                                                onClick={() => {
                                                                    const invoiceText = `======================================\n         SOBAT GURU DIGITAL 2026\n======================================\nBUKTI PEMBAYARAN RESMI (NOTA SPJ)\nID TRANSAKSI : SGD-${sale.id.slice(0, 6).toUpperCase()}\nTanggal      : ${sale.date}\n\nDIBAYARKAN KEPADA:\nNama Guru    : ${sale.customer}\nTOTAL BIAYA  : Rp ${sale.amount.toLocaleString('id-ID')}\nSTATUS       : LUNAS & SAH\n======================================`;
                                                                    navigator.clipboard.writeText(invoiceText);
                                                                    alert(`Bukti transaksi SPJ untuk ${sale.customer} berhasil disalin!`);
                                                                }}
                                                                className="bg-amber-500 text-white text-[9px] font-bold py-0.5 px-2 rounded-md transition mr-1"
                                                            >
                                                                SPJ
                                                            </button>
                                                            <button onClick={() => startEdit(sale)} className="text-blue-600 hover:text-blue-800" title="Edit"><Edit size={14} /></button>
                                                            <button onClick={() => showConfirm("Yakin hapus transaksi ini secara permanen?", () => deleteSale(sale.id))} className="text-red-500 hover:text-red-700" title="Hapus"><Trash2 size={14} /></button>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-y-1 text-xs font-medium text-gray-600">
                                                    <span>Kustomer:</span>
                                                    <span className="text-right text-gray-800 font-bold">{sale.customer}</span>

                                                    <span>Paket Modul:</span>
                                                    <span className="text-right text-blue-600 font-semibold">{sale.product}</span>

                                                    <span>Nominal Closing:</span>
                                                    <span className="text-right text-green-600 font-black">Rp {sale.amount.toLocaleString('id-ID')}</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                        <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
                    </div>
                </div>
            )}

            {subTab === 'expenses' && (
                <div className="space-y-6 animate-in fade-in">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

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
                                        className="w-full border px-3 py-2 rounded-lg text-sm bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:outline-none font-medium"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="block text-xs font-bold text-gray-600">Kategori Biaya</label>
                                    <select
                                        value={newExpenseForm.category}
                                        onChange={e => setNewExpenseForm({ ...newExpenseForm, category: e.target.value })}
                                        className="w-full border px-3 py-2 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none font-medium"
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
                                        className="w-full border px-3 py-2 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none text-gray-800"
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
                                        className="w-full border px-3 py-2 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none text-gray-800"
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

                        <div className="lg:col-span-2 space-y-4 bg-white p-6 rounded-2xl border">
                            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between pb-4 border-b">
                                <div className="w-full sm:w-1/2 flex items-center bg-gray-50 border rounded-lg px-3 py-1.5 focus-within:ring-2 focus-within:ring-blue-500 bg-white shadow-sm">
                                    <Search size={16} className="text-gray-400 mr-2" />
                                    <input
                                        type="text"
                                        placeholder="Cari keterangan pengeluaran..."
                                        value={expenseSearchQuery}
                                        onChange={e => setExpenseSearchQuery(e.target.value)}
                                        className="bg-transparent border-none text-sm w-full focus:outline-none text-gray-800"
                                    />
                                </div>

                                <select
                                    value={expenseCategoryFilter}
                                    onChange={e => setExpenseCategoryFilter(e.target.value)}
                                    className="w-full sm:w-44 border px-3 py-2 rounded-lg text-sm bg-white font-semibold"
                                >
                                    <option value="">Semua Kategori</option>
                                    <option value="Operasional">Operasional</option>
                                    <option value="Marketing">Marketing</option>
                                    <option value="Gaji">Gaji</option>
                                    <option value="Lain-lain">Lain-lain</option>
                                </select>
                            </div>

                            <div className="bg-white rounded-xl border overflow-hidden animate-in">

                                <div className="overflow-x-auto hidden md:block">
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
                                                                <td className="px-4 py-2"><input type="date" value={editExpenseForm.date} onChange={e => setEditExpenseForm({ ...editExpenseForm, date: e.target.value })} className="border px-2 py-1 rounded w-full text-xs bg-white text-gray-800" /></td>
                                                                <td className="px-4 py-2">
                                                                    <select value={editExpenseForm.category} onChange={e => setEditExpenseForm({ ...editExpenseForm, category: e.target.value })} className="border px-2 py-1 rounded w-full text-xs bg-white text-gray-855">
                                                                        <option value="Operasional">Operasional</option>
                                                                        <option value="Marketing">Marketing</option>
                                                                        <option value="Gaji">Gaji</option>
                                                                        <option value="Lain-lain">Lain-lain</option>
                                                                    </select>
                                                                </td>
                                                                <td className="px-4 py-2"><input type="text" value={editExpenseForm.notes} onChange={e => setEditExpenseForm({ ...editExpenseForm, notes: e.target.value })} className="border px-2 py-1 rounded w-full text-xs bg-white text-gray-800" /></td>
                                                                <td className="px-4 py-2"><input type="number" value={editExpenseForm.amount} onChange={e => setEditExpenseForm({ ...editExpenseForm, amount: e.target.value })} className="border px-2 py-1 rounded w-full text-xs text-right font-bold bg-white text-gray-800" /></td>
                                                                <td className="px-4 py-2 text-center space-x-1.5 whitespace-nowrap">
                                                                    <button onClick={() => saveEditExpense(exp.id)} className="bg-blue-600 text-white font-bold px-2 py-1 rounded text-xs hover:bg-blue-700">Simpan</button>
                                                                    <button onClick={() => setEditingExpenseId(null)} className="bg-gray-400 text-white font-bold px-2 py-1 rounded text-xs hover:bg-gray-500">Batal</button>
                                                                </td>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <td className="px-4 py-3 whitespace-nowrap font-medium">{exp.date}</td>
                                                                <td className="px-4 py-3">
                                                                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${exp.category === 'Marketing' ? 'bg-rose-50 text-rose-700' :
                                                                        exp.category === 'Gaji' ? 'bg-purple-50 text-purple-700' :
                                                                            exp.category === 'Operasional' ? 'bg-blue-50 text-blue-700' :
                                                                                'bg-gray-100 text-gray-700'
                                                                        }`}>
                                                                        {exp.category || 'Lain-lain'}
                                                                    </span>
                                                                </td>
                                                                <td className="px-4 py-3 text-gray-805 text-xs max-w-[200px] truncate" title={exp.notes}>{exp.notes || '-'}</td>
                                                                <td className="px-4 py-3 text-right font-bold text-red-600">Rp {exp.amount.toLocaleString('id-ID')}</td>
                                                                <td className="px-4 py-3 text-center space-x-2 whitespace-nowrap">
                                                                    <button onClick={() => startEditExpense(exp)} className="text-blue-600 hover:text-blue-800 inline-block" title="Edit Pengeluaran"><Edit size={14} /></button>
                                                                    <button onClick={() => showConfirm("Yakin hapus pengeluaran ini?", () => deleteExpense(exp.id))} className="text-red-500 hover:text-red-700 inline-block" title="Hapus Pengeluaran"><Trash2 size={14} /></button>
                                                                </td>
                                                            </>
                                                        )}
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                <div className="block md:hidden space-y-3 p-3 bg-gray-50">
                                    {filteredExpenses.length === 0 ? (
                                        <p className="text-center py-6 text-gray-400 text-xs">Belum ada pengeluaran operasional dicatat.</p>
                                    ) : (
                                        filteredExpenses.map(exp => (
                                            <div key={exp.id} className="bg-white p-4 rounded-xl border shadow-sm space-y-2">
                                                {editingExpenseId === exp.id ? (
                                                    <div className="space-y-3 animate-in slide-in-from-top-2">
                                                        <input type="date" value={editExpenseForm.date} onChange={e => setEditExpenseForm({ ...editExpenseForm, date: e.target.value })} className="border px-3 py-1.5 rounded-lg w-full text-xs bg-white text-gray-800" />
                                                        <select value={editExpenseForm.category} onChange={e => setEditExpenseForm({ ...editExpenseForm, category: e.target.value })} className="border px-3 py-1.5 rounded-lg w-full text-xs bg-white text-gray-800">
                                                            <option value="Operasional">Operasional</option>
                                                            <option value="Marketing">Marketing</option>
                                                            <option value="Gaji">Gaji</option>
                                                            <option value="Lain-lain">Lain-lain</option>
                                                        </select>
                                                        <input type="text" placeholder="Keterangan" value={editExpenseForm.notes} onChange={e => setEditExpenseForm({ ...editExpenseForm, notes: e.target.value })} className="border px-3 py-1.5 rounded-lg w-full text-xs bg-white text-gray-800" />
                                                        <input type="number" placeholder="Nominal" value={editExpenseForm.amount} onChange={e => setEditExpenseForm({ ...editExpenseForm, amount: e.target.value })} className="border px-3 py-1.5 rounded-lg w-full text-xs text-right font-bold bg-white text-gray-800" />
                                                        <div className="flex gap-2">
                                                            <button onClick={() => saveEditExpense(exp.id)} className="flex-1 bg-blue-600 text-white font-bold py-1.5 rounded-lg text-xs">Simpan</button>
                                                            <button onClick={() => setEditingExpenseId(null)} className="flex-1 bg-gray-400 text-white font-bold py-1.5 rounded-lg text-xs">Batal</button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="space-y-2.5">
                                                        <div className="flex justify-between items-center border-b pb-1.5">
                                                            <div>
                                                                <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${exp.category === 'Marketing' ? 'bg-rose-50 text-rose-700' :
                                                                    exp.category === 'Gaji' ? 'bg-purple-50 text-purple-700' :
                                                                        exp.category === 'Operasional' ? 'bg-blue-50 text-blue-700' :
                                                                            'bg-gray-100 text-gray-700'
                                                                    }`}>
                                                                    {exp.category || 'Lain-lain'}
                                                                </span>
                                                                <p className="text-[10px] text-gray-400 mt-1 font-semibold">{exp.date}</p>
                                                            </div>
                                                            <div className="space-x-3">
                                                                <button onClick={() => startEditExpense(exp)} className="text-blue-600 hover:text-blue-800" title="Edit"><Edit size={14} /></button>
                                                                <button onClick={() => showConfirm("Yakin hapus pengeluaran ini?", () => deleteExpense(exp.id))} className="text-red-500 hover:text-red-700" title="Hapus"><Trash2 size={14} /></button>
                                                            </div>
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-y-1 text-xs font-medium text-gray-600">
                                                            <span>Keterangan:</span>
                                                            <span className="text-right text-gray-800 font-bold truncate max-w-[150px] inline-block">{exp.notes || '-'}</span>

                                                            <span>Nominal Keluar:</span>
                                                            <span className="text-right text-red-600 font-black">Rp {exp.amount.toLocaleString('id-ID')}</span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ))
                                    )}
                                </div>

                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function ManagePreviews({ previewsData, updatePreview, showAlert }) {
    const slots = ['cover', 'prota', 'isi'];

    const getSlotForm = (slot) => {
        const current = previewsData.find(p => p.id === slot || p.slot === slot) || {};
        return {
            title: current.title || (slot === 'cover' ? 'Cover & Identitas' : slot === 'prota' ? 'Prota & Prosem' : 'Modul Ajar & LKPD'),
            desc: current.desc || (slot === 'cover' ? 'Desain rapi, terstruktur, tinggal ganti nama guru & sekolah.' : slot === 'prota' ? 'Otomatis menghitung pekan efektif & JP.' : 'Langkah pembelajaran terperinci.'),
            url: current.url || (slot === 'cover' ? 'cover.pdf' : slot === 'prota' ? 'prota.pdf' : 'isi.pdf')
        };
    };

    const [forms, setForms] = useState({
        cover: getSlotForm('cover'),
        prota: getSlotForm('prota'),
        isi: getSlotForm('isi')
    });

    useEffect(() => {
        setForms({
            cover: getSlotForm('cover'),
            prota: getSlotForm('prota'),
            isi: getSlotForm('isi')
        });
    }, [previewsData]);

    const handleChange = (slot, field, value) => {
        setForms(prev => ({
            ...prev,
            [slot]: {
                ...prev[slot],
                [field]: value
            }
        }));
    };

    const handleSave = async (slot) => {
        await updatePreview(slot, forms[slot]);
    };

    return (
        <div className="space-y-6 animate-in fade-in pt-4 md:pt-0">
            <div>
                <h1 className="text-3xl font-extrabold text-gray-800 tracking-tight text-blue-950">Manajemen Dokumen Pratinjau</h1>
                <p className="text-gray-500 text-sm mt-1">Atur judul, deskripsi, dan link berkas (PDF / Google Drive) contoh modul pendidik pada Landing Page.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {slots.map(slot => (
                    <div key={slot} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-150 flex flex-col justify-between animate-in">
                        <div className="space-y-4">
                            <div className="border-b pb-2 flex justify-between items-center">
                                <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                                    Slot {slot === 'cover' ? '1 (Cover)' : slot === 'prota' ? '2 (Prota)' : '3 (Isi)'}
                                </span>
                            </div>

                            <div className="space-y-3">
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1">Judul Pratinjau</label>
                                    <input
                                        type="text"
                                        value={forms[slot].title}
                                        onChange={e => handleChange(slot, 'title', e.target.value)}
                                        className="w-full border px-3 py-2 rounded-lg text-sm bg-white font-medium text-gray-855"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1">Deskripsi Singkat</label>
                                    <textarea
                                        rows={3}
                                        value={forms[slot].desc}
                                        onChange={e => handleChange(slot, 'desc', e.target.value)}
                                        className="w-full border px-3 py-2 rounded-lg text-sm bg-white font-medium text-gray-655"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1">URL / Link Google Drive</label>
                                    <input
                                        type="text"
                                        value={forms[slot].url}
                                        onChange={e => handleChange(slot, 'url', e.target.value)}
                                        className="w-full border px-3 py-2 rounded-lg text-xs bg-white font-bold text-blue-700"
                                    />
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={() => handleSave(slot)}
                            className="mt-6 w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl text-xs transition flex items-center justify-center gap-1.5"
                        >
                            <CheckCircle size={14} /> Simpan Slot {slot.toUpperCase()}
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}

function BulkImportCatalog({ db, appId, writeActivityLog, showAlert }) {
    const [previewData, setPreviewData] = useState([]);
    const [fileObj, setFileObj] = useState(null);
    const [isUploading, setIsUploading] = useState(false);

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setFileObj(file);
        const reader = new FileReader();
        reader.onload = (evt) => {
            const text = evt.target.result;
            const lines = text.split('\n').map(line => line.trim()).filter(line => line);
            if (lines.length <= 1) {
                showAlert('Format CSV kosong atau tidak valid!', 'Error', 'error');
                return;
            }

            const parsed = [];
            for (let i = 1; i < lines.length; i++) {
                const row = lines[i].split(',').map(s => s.replace(/(^"|"$)/g, '').trim());
                if (row.length >= 4) {
                    parsed.push({
                        name: row[0],
                        jenjang: row[1],
                        desc: row[2],
                        price: Number(row[3].replace(/[^0-9.-]+/g, "")) || 0
                    });
                }
            }
            setPreviewData(parsed);
        };
        reader.readAsText(file);
    };

    const handleUploadBatch = async () => {
        if (!previewData.length) return;
        setIsUploading(true);
        try {
            const chunks = [];
            for (let i = 0; i < previewData.length; i += 400) {
                chunks.push(previewData.slice(i, i + 400));
            }

            for (let chunk of chunks) {
                const batch = writeBatch(db);
                chunk.forEach(item => {
                    const docRef = doc(collection(db, 'artifacts', appId, 'public', 'data', 'catalogData'));
                    batch.set(docRef, item);
                });
                await batch.commit();
            }

            showAlert(`Sukses mengimport ${previewData.length} data katalog!`, 'Sukses', 'success');
            if (writeActivityLog) {
                await writeActivityLog('BULK_IMPORT', `Admin melakukan import massal ${previewData.length} data katalog`);
            }
            setPreviewData([]);
            setFileObj(null);
        } catch (error) {
            console.error(error);
            showAlert('Gagal mengimport data', 'Error', 'error');
        }
        setIsUploading(false);
    };

    return (
        <div className="bg-blue-50 p-6 rounded-xl border border-blue-100 shadow-sm mb-6">
            <h3 className="font-bold text-blue-900 mb-2 flex items-center gap-2"><Upload size={18} /> Import Massal Katalog (CSV)</h3>
            <p className="text-xs text-blue-700 mb-4">Format CSV harus memiliki header: Nama Paket, Jenjang, Deskripsi, Harga (dipisahkan koma).</p>
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                <input type="file" accept=".csv" onChange={handleFileUpload} className="text-sm bg-white border p-1 rounded" />
                {previewData.length > 0 && (
                    <button onClick={handleUploadBatch} disabled={isUploading} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg text-sm transition shadow-sm">
                        {isUploading ? 'Mengunggah...' : `Mulai Upload (${previewData.length} data)`}
                    </button>
                )}
            </div>
            {previewData.length > 0 && (
                <div className="mt-4 overflow-x-auto">
                    <p className="text-xs font-bold text-gray-700 mb-2">Preview (Maks 3 baris pertama):</p>
                    <table className="w-full text-left text-xs bg-white border min-w-[500px]">
                        <thead className="bg-gray-100 border-b">
                            <tr><th className="p-2">Nama Paket</th><th className="p-2">Jenjang</th><th className="p-2">Deskripsi</th><th className="p-2">Harga</th></tr>
                        </thead>
                        <tbody>
                            {previewData.slice(0, 3).map((item, idx) => (
                                <tr key={idx} className="border-b"><td className="p-2 font-bold">{item.name}</td><td className="p-2">{item.jenjang}</td><td className="p-2 truncate max-w-xs">{item.desc}</td><td className="p-2 text-green-600 font-bold">Rp {item.price.toLocaleString('id-ID')}</td></tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

function ManageCatalog({ catalogData, addProduct, updateProduct, deleteProduct, showConfirm, db, appId, writeActivityLog, showAlert }) {
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
        <div className="animate-in fade-in space-y-6 pt-4 md:pt-0">
            <h1 className="text-2xl font-bold text-gray-800 text-blue-950">Manajemen Katalog Landing Page</h1>
            <BulkImportCatalog db={db} appId={appId} writeActivityLog={writeActivityLog} showAlert={showAlert} />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border h-fit animate-in">
                    <h3 className="font-bold text-blue-900 border-b pb-2 mb-4">{editId ? 'Edit Produk' : 'Tambah Produk Baru'}</h3>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div><label className="text-xs font-bold text-gray-600">Nama Paket</label><input required type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full border px-3 py-1.5 rounded text-sm bg-white text-gray-800" /></div>
                        <div><label className="text-xs font-bold text-gray-600">Jenjang</label><select value={form.jenjang} onChange={e => setForm({ ...form, jenjang: e.target.value })} className="w-full border px-3 py-1.5 rounded text-sm bg-white text-gray-800"><option>SD/MI</option><option>SMP/MTs</option><option>SMA/MA</option><option>Umum/Custom</option></select></div>
                        <div><label className="text-xs font-bold text-gray-600">Deskripsi Singkat</label><textarea required rows="2" value={form.desc} onChange={e => setForm({ ...form, desc: e.target.value })} className="w-full border px-3 py-1.5 rounded text-sm bg-white text-gray-800"></textarea></div>
                        <div><label className="text-xs font-bold text-gray-600">Harga (Rp)</label><input required type="number" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} className="w-full border px-3 py-1.5 rounded text-sm bg-white text-gray-800" /></div>
                        <div className="flex gap-2">
                            <button type="submit" className="flex-1 bg-blue-600 text-white font-bold py-2 rounded text-sm">{editId ? 'Update' : 'Tambah'}</button>
                            {editId && <button type="button" onClick={() => { setEditId(null); setForm({ name: '', jenjang: 'SD/MI', desc: '', price: '' }) }} className="bg-gray-400 text-white px-3 py-2 rounded text-sm">Batal</button>}
                        </div>
                    </form>
                </div>
                <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {catalogData.map(item => (
                        <div key={item.id} className="bg-white p-4 rounded-xl shadow-sm border flex flex-col justify-between animate-in">
                            <div>
                                <div className="flex justify-between items-start mb-2">
                                    <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded">{item.jenjang}</span>
                                    <div className="space-x-2">
                                        <button onClick={() => { setEditId(item.id); setForm(item) }} className="text-blue-500 hover:bg-blue-50 p-1 rounded"><Edit size={14} /></button>
                                        <button onClick={() => showConfirm("Yakin hapus produk ini dari halaman depan?", () => deleteProduct(item.id))} className="text-red-500 hover:bg-red-50 p-1 rounded"><Trash2 size={14} /></button>
                                    </div>
                                </div>
                                <h4 className="font-bold text-gray-800">{item.name}</h4>
                                <p className="text-xs text-gray-500 mt-1 mb-3">{item.desc}</p>
                            </div>
                            <span className="font-bold text-green-600 border-t pt-2 block">Rp {item.price.toLocaleString('id-ID')}</span>
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
        <div className="animate-in fade-in space-y-6 max-w-2xl mx-auto pt-4 md:pt-0">
            <div className="text-center mb-8 animate-in">
                <Trophy size={48} className="mx-auto text-yellow-500 mb-2 animate-bounce" />
                <h1 className="text-2xl font-bold text-gray-800 text-blue-950">Papan Peringkat Sales</h1>
                <p className="text-gray-500">Peringkat berdasarkan akumulasi total omzet closing.</p>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
                {ranking.map((staff, idx) => (
                    <div key={idx} className={`flex items-center p-4 border-b last:border-0 ${idx === 0 ? 'bg-yellow-50' : idx === 1 ? 'bg-gray-50' : idx === 2 ? 'bg-orange-50' : 'bg-white'}`}>
                        <div className="w-10 font-bold text-gray-400 text-lg">#{idx + 1}</div>
                        <div className="flex-grow font-bold text-gray-800 flex items-center gap-2 text-sm sm:text-base">
                            {staff.name}
                            {idx === 0 && <span className="bg-yellow-400 text-white text-[10px] px-2 py-0.5 rounded-full uppercase font-bold">MVP</span>}
                        </div>
                        <div className="font-bold text-green-600 text-base sm:text-lg">Rp {staff.total.toLocaleString('id-ID')}</div>
                    </div>
                ))}
                {ranking.length === 0 && <div className="p-8 text-center text-gray-400 animate-in">Belum ada data penjualan.</div>}
            </div>
        </div>
    );
}

function CommissionReport({ salesData, payoutsData, usersData, payStaffCommission, showAlert, showConfirm }) {
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

    const staffList = usersData.filter(u => u.role === 'staff');
    const [selectedStaff, setSelectedStaff] = useState('');
    const [payStart, setPayStart] = useState(firstDay);
    const [payEnd, setPayEnd] = useState(lastDay);
    const [calcResult, setCalcResult] = useState(null);

    const calculateUnpaid = () => {
        if (!selectedStaff) {
            showAlert("Silakan pilih staff terlebih dahulu!", "Peringatan", "warning");
            return;
        }

        const staffSales = salesData.filter(s =>
            s.staffName === selectedStaff &&
            s.date >= payStart &&
            s.date <= payEnd
        );

        const unpaidSales = staffSales.filter(s => s.paymentStatus !== 'paid');

        const unpaidCommission = unpaidSales.reduce((acc, curr) => acc + (curr.amount * 0.10), 0);

        const dailyUnpaid = {};
        unpaidSales.forEach(sale => {
            if (!dailyUnpaid[sale.date]) dailyUnpaid[sale.date] = 0;
            dailyUnpaid[sale.date] += sale.amount;
        });

        let unpaidBonus = 0;
        let multipliers = 0;
        Object.values(dailyUnpaid).forEach(amount => {
            if (amount >= 1000000) {
                const mult = Math.floor(amount / 1000000);
                unpaidBonus += 50000 * mult;
                multipliers += mult;
            }
        });

        const totalPayable = unpaidCommission + unpaidBonus;

        setCalcResult({
            salesCount: unpaidSales.length,
            commission: unpaidCommission,
            bonus: unpaidBonus,
            multipliers,
            total: totalPayable,
            salesToUpdate: unpaidSales
        });
    };

    const executePayment = () => {
        if (!calcResult || calcResult.total === 0) {
            showAlert("Nominal pembayaran harus lebih besar dari Rp 0!", "Peringatan", "warning");
            return;
        }

        showConfirm(
            `Tandai komisi ${selectedStaff} periode ${payStart} s/d ${payEnd} sebesar Rp ${calcResult.total.toLocaleString('id-ID')} sebagai TELAH DIBAYAR?`,
            async () => {
                await payStaffCommission(selectedStaff, payStart, payEnd, calcResult.total, calcResult.salesToUpdate);
                setCalcResult(null);
            },
            "Konfirmasi Pembayaran Gaji"
        );
    };

    return (
        <div className="animate-in fade-in space-y-6 pt-4 md:pt-0">
            <div>
                <h1 className="text-3xl font-extrabold text-gray-800 tracking-tight text-blue-950">Gaji & Komisi Sales</h1>
                <p className="text-gray-500 text-sm mt-1">Rekap performa omzet dan rincian pelunasan gaji/bonus komisi staff pendidik.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-150 h-fit animate-in">
                    <h3 className="font-extrabold text-blue-950 text-base border-b pb-3 mb-4 flex items-center gap-2">
                        <PlusCircle size={20} className="text-blue-600" />
                        <span>Pencairan Gaji & Komisi</span>
                    </h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-600 mb-1">Pilih Staff Sales</label>
                            <select
                                value={selectedStaff}
                                onChange={e => { setSelectedStaff(e.target.value); setCalcResult(null); }}
                                className="w-full border px-3 py-2 rounded-lg text-sm bg-white text-gray-855 font-bold"
                            >
                                <option value="">-- Pilih Staff --</option>
                                {staffList.map((st, i) => (
                                    <option key={i} value={st.name}>{st.name}</option>
                                ))}
                                {staffList.length === 0 && Array.from(new Set(salesData.map(s => s.staffName))).map((st, i) => (
                                    <option key={i} value={st}>{st}</option>
                                ))}
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1">Tanggal Mulai</label>
                                <input
                                    type="date"
                                    value={payStart}
                                    onChange={e => { setPayStart(e.target.value); setCalcResult(null); }}
                                    className="w-full border px-3 py-2 rounded-lg text-xs bg-gray-50 text-gray-855 font-bold"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1">Tanggal Selesai</label>
                                <input
                                    type="date"
                                    value={payEnd}
                                    onChange={e => { setPayEnd(e.target.value); setCalcResult(null); }}
                                    className="w-full border px-3 py-2 rounded-lg text-xs bg-gray-50 text-gray-855 font-bold"
                                />
                            </div>
                        </div>

                        <button
                            onClick={calculateUnpaid}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl shadow-md transition text-xs flex items-center justify-center gap-2"
                        >
                            <RefreshCw size={14} /> Hitung & Tinjau Komisi
                        </button>

                        {calcResult && (
                            <div className="mt-4 p-4 bg-gray-50 border rounded-xl space-y-3 animate-in slide-in-from-top-2">
                                <h4 className="text-xs font-extrabold text-gray-700 uppercase tracking-wider border-b pb-1.5">Rincian Komisi</h4>
                                <div className="space-y-1.5 text-xs font-medium text-gray-600">
                                    <div className="flex justify-between">
                                        <span>Jumlah Closing:</span>
                                        <span className="font-bold text-gray-800">{calcResult.salesCount} Transaksi</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Komisi Dasar (10%):</span>
                                        <span className="font-bold text-gray-800">Rp {calcResult.commission.toLocaleString('id-ID')}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Bonus Kelipatan 1Jt:</span>
                                        <span className="font-bold text-gray-800">Rp {calcResult.bonus.toLocaleString('id-ID')} ({calcResult.multipliers}x)</span>
                                    </div>
                                    <div className="flex justify-between border-t pt-2 text-sm font-black text-gray-850">
                                        <span>Total Gaji:</span>
                                        <span className="text-green-600">Rp {calcResult.total.toLocaleString('id-ID')}</span>
                                    </div>
                                </div>

                                {calcResult.total > 0 ? (
                                    <button
                                        onClick={executePayment}
                                        className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-2.5 rounded-xl transition text-xs flex items-center justify-center gap-2 shadow-sm animate-pulse"
                                    >
                                        <CheckCircle size={14} /> Tandai Telah Dibayar
                                    </button>
                                ) : (
                                    <p className="text-[10px] text-gray-400 font-semibold text-center italic mt-2">Semua komisi periode ini sudah terbayar!</p>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <div className="lg:col-span-2 space-y-4 bg-white p-6 rounded-2xl border animate-in">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b">
                        <span className="text-sm font-extrabold text-blue-950">Rekap Gaji / Komisi Periode Penjualan</span>
                        <div className="flex gap-2 w-full sm:w-auto">
                            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="border px-3 py-1.5 rounded-lg text-xs bg-gray-50 flex-1 sm:flex-initial text-gray-855" />
                            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="border px-3 py-1.5 rounded-lg text-xs bg-gray-50 flex-1 sm:flex-initial text-gray-855" />
                        </div>
                    </div>

                    <div className="overflow-hidden rounded-xl border">

                        <table className="w-full text-left text-sm hidden md:table bg-white">
                            <thead className="bg-blue-900 text-white">
                                <tr>
                                    <th className="px-4 py-3.5 font-bold">Staff</th>
                                    <th className="px-4 py-3.5 text-right font-bold">Omzet</th>
                                    <th className="px-4 py-3.5 text-right font-bold">Komisi (10%)</th>
                                    <th className="px-4 py-3.5 text-right font-bold">Bonus (Kelipatan 1Jt)</th>
                                    <th className="px-4 py-3.5 text-right font-bold bg-blue-850">Total Cair</th>
                                </tr>
                            </thead>
                            <tbody>
                                {reportData.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="text-center py-8 text-gray-400">Tidak ada penjualan pada periode ini.</td>
                                    </tr>
                                ) : (
                                    reportData.map((d, i) => (
                                        <tr key={i} className="border-b hover:bg-gray-50/50">
                                            <td className="px-4 py-3 font-bold text-gray-800">{d.name}</td>
                                            <td className="px-4 py-3 text-right font-semibold whitespace-nowrap">Rp {d.total.toLocaleString('id-ID')}</td>
                                            <td className="px-4 py-3 text-right text-blue-600 font-semibold whitespace-nowrap">Rp {d.komisi.toLocaleString('id-ID')}</td>
                                            <td className="px-4 py-3 text-right text-amber-600 font-semibold whitespace-nowrap">Rp {d.bonus.toLocaleString('id-ID')} ({d.kelipatanTotal}x)</td>
                                            <td className="px-4 py-3 text-right font-extrabold text-green-600 bg-green-50/30 whitespace-nowrap">Rp {d.totalPayout.toLocaleString('id-ID')}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>

                        <div className="block md:hidden space-y-3 p-3 bg-gray-50">
                            {reportData.length === 0 ? (
                                <p className="text-center py-8 text-gray-400 text-xs">Tidak ada penjualan pada periode ini.</p>
                            ) : (
                                reportData.map((d, i) => (
                                    <div key={i} className="bg-white p-4 rounded-xl border shadow-sm space-y-2">
                                        <div className="flex justify-between items-center border-b pb-1.5">
                                            <span className="font-bold text-gray-800 text-sm">{d.name}</span>
                                            <span className="text-xs bg-green-50 text-green-700 font-extrabold px-2 py-0.5 rounded-full text-[10px]">Total: Rp {d.totalPayout.toLocaleString('id-ID')}</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-y-1 text-xs text-gray-600 font-medium">
                                            <span>Omzet Penjualan:</span>
                                            <span className="text-right font-bold text-gray-800">Rp {d.total.toLocaleString('id-ID')}</span>

                                            <span>Komisi Dasar (10%):</span>
                                            <span className="text-right text-blue-600 font-bold">Rp {d.komisi.toLocaleString('id-ID')}</span>

                                            <span>Bonus Kelipatan 1Jt:</span>
                                            <span className="text-right text-amber-600 font-bold">Rp {d.bonus.toLocaleString('id-ID')} ({d.kelipatanTotal}x)</span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
}

function ManageStaff({ usersData, addStaffUser, deleteStaffUser, showConfirm }) {
    const [form, setForm] = useState({ name: '', username: '', password: '', role: 'staff' });
    const staffList = usersData.filter(u => u.role === 'staff');

    const handleSubmit = (e) => {
        e.preventDefault();
        addStaffUser(form);
        setForm({ name: '', username: '', password: '', role: 'staff' });
    };

    return (
        <div className="animate-in fade-in space-y-6 pt-4 md:pt-0">
            <h1 className="text-2xl font-bold text-gray-800 text-blue-950">Manajemen Akun Staff</h1>
            <div className="grid md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl border h-fit shadow-sm animate-in">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <input required type="text" placeholder="Nama Lengkap" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full border px-3 py-2 rounded text-sm bg-white text-gray-800" />
                        <input required type="text" placeholder="Username" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} className="w-full border px-3 py-2 rounded text-sm bg-white text-gray-800" />
                        <input required type="text" placeholder="Password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} className="w-full border px-3 py-2 rounded text-sm bg-white text-gray-800" />
                        <button type="submit" className="w-full bg-blue-600 text-white font-bold py-2 rounded text-sm">Tambah Staff</button>
                    </form>
                </div>
                <div className="md:col-span-2 bg-white rounded-xl border overflow-hidden">

                    <div className="overflow-x-auto hidden md:block">
                        <table className="w-full text-left text-sm bg-white">
                            <thead className="bg-gray-50 border-b">
                                <tr>
                                    <th className="px-4 py-3">Nama</th>
                                    <th className="px-4 py-3">User / Pass</th>
                                    <th className="px-4 py-3">Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {staffList.map(s => (
                                    <tr key={s.id} className="border-b">
                                        <td className="px-4 py-3 font-bold">{s.name}</td>
                                        <td className="px-4 py-3 text-xs">{s.username} / {s.password}</td>
                                        <td className="px-4 py-3">
                                            <button onClick={() => showConfirm("Apakah Anda yakin ingin menghapus akun staff ini?", () => deleteStaffUser(s.id))} className="text-red-500"><Trash2 size={16} /></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="block md:hidden space-y-2 p-2 bg-gray-50">
                        {staffList.map(s => (
                            <div key={s.id} className="bg-white p-3 rounded-lg border flex justify-between items-center shadow-sm">
                                <div className="space-y-1">
                                    <span className="font-bold text-sm text-gray-800">{s.name}</span>
                                    <p className="text-[11px] text-gray-500 font-semibold">User: {s.username} | Pass: {s.password}</p>
                                </div>
                                <button onClick={() => showConfirm("Apakah Anda yakin ingin menghapus akun staff ini?", () => deleteStaffUser(s.id))} className="text-red-500 p-2 hover:bg-red-50 rounded transition">
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))}
                    </div>

                </div>
            </div>
        </div>
    );
}

// Overhauled Custom Multi-Dropdown & Negotiable Automated Pricing Form for WhatsApp Closing Flow
function StaffInputForm({ addSale, userName, setTab, catalogData, writeActivityLog, appSettings }) {
    const [form, setForm] = useState({
        date: new Date().toISOString().split('T')[0],
        customer: '',
        amount: '',
        notes: ''
    });

    const [items, setItems] = useState([
        { id: Date.now(), jenjang: 'SD - Kelas 1', mapel: 'Matematika', customText: '' }
    ]);

    const jenjangOptions = [
        'SD - Kelas 1', 'SD - Kelas 2', 'SD - Kelas 3', 'SD - Kelas 4', 'SD - Kelas 5', 'SD - Kelas 6',
        'SMP - Kelas 7', 'SMP - Kelas 8', 'SMP - Kelas 9',
        'SMA - Kelas 10', 'SMA - Kelas 11', 'SMA - Kelas 12',
        'Paket Lengkap SD', 'Paket Lengkap SMP', 'Paket Lengkap SMA',
        'Kustom / Lainnya'
    ];

    const daftarMapelDariAdmin = appSettings?.mapelList
        ? appSettings.mapelList.split(',').map(s => s.trim()).filter(s => s)
        : ['Matematika', 'Bahasa Indonesia', 'Bahasa Inggris', 'IPA', 'IPS', 'Pancasila / PKn', 'PAI (Agama)', 'PJOK', 'Seni Budaya', 'Tematik', 'Semua Mapel (Paket)'];

    const mapelOptions = daftarMapelDariAdmin.includes('Kustom / Tulis Manual')
        ? daftarMapelDariAdmin
        : [...daftarMapelDariAdmin, 'Kustom / Tulis Manual'];

    const dapatkanRekomendasiHarga = (item) => {
        if (item.jenjang.includes('Paket Lengkap')) return Number(appSettings?.priceLengkap) || 150000;
        if (item.jenjang.startsWith('SD')) return Number(appSettings?.priceSD) || 35000;
        if (item.jenjang.startsWith('SMP')) return Number(appSettings?.priceSMP) || 45000;
        if (item.jenjang.startsWith('SMA')) return Number(appSettings?.priceSMA) || 55000;
        return Number(appSettings?.priceKustom) || 50000;
    };
    // Sinkronisasi otomatis total nominal rekomendasi, tetapi staff tetap bisa edit sesuka hati (nego)
    useEffect(() => {
        const totalHargaDianjurkan = items.reduce((acc, curr) => acc + dapatkanRekomendasiHarga(curr), 0);
        setForm(prev => ({ ...prev, amount: totalHargaDianjurkan.toString() }));
    }, [items]);

    const tambahBarisItem = () => {
        setItems([...items, { id: Date.now() + Math.random(), jenjang: 'SD - Kelas 1', mapel: 'Matematika', customText: '' }]);
    };

    const hapusBarisItem = (id) => {
        if (items.length === 1) return;
        setItems(items.filter(item => item.id !== id));
    };

    const ubahDataBaris = (id, field, value) => {
        setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Memetakan struktur multi-item menjadi satu string rangkuman yang rapi di database
        const arrayDeskripsi = items.map(item => {
            if (item.jenjang === 'Kustom / Lainnya') {
                return `[Kustom: ${item.customText || 'Umum'}]`;
            }
            const partMapel = item.mapel === 'Kustom / Tulis Manual' ? 'Kustom' : item.mapel;
            return `[${item.jenjang} - ${partMapel}]`;
        });
        const hasilGabunganProduk = arrayDeskripsi.join(', ');

        const payloadClosingan = {
            date: form.date,
            customer: form.customer,
            product: hasilGabunganProduk,
            amount: Number(form.amount),
            notes: form.notes
        };

        addSale({ ...payloadClosingan, staffName: userName });
        if (writeActivityLog) {
            await writeActivityLog('INPUT_CLOSING', `Staff ${userName} mencatat transaksi random/multi-item WA: ${hasilGabunganProduk} senilai Rp ${form.amount}`);
        }

        setForm({ date: new Date().toISOString().split('T')[0], customer: '', amount: '', notes: '' });
        setItems([{ id: Date.now(), jenjang: 'SD - Kelas 1', mapel: 'Matematika', customText: '' }]);
        setTab('my_sales');
    };

    return (
        <div className="max-w-3xl mx-auto animate-in fade-in pt-4 md:pt-0">
            <div className="mb-4">
                <h1 className="text-2xl font-black text-gray-850">Lapor Closingan Fleksibel (WhatsApp Arus) 🎉</h1>
                <p className="text-xs text-gray-500 mt-1">Staf dapat menginput kombinasi kelas/mapel acak secara sekaligus sesuai kesepakatan chat WA kustomer.</p>
            </div>

            <form onSubmit={handleSubmit} className="bg-white p-5 sm:p-6 rounded-2xl border space-y-5 shadow-sm">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">Tanggal Transaksi</label>
                        <input required type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="w-full border px-3 py-2 rounded-xl bg-white text-sm text-gray-855 font-semibold" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">Nama Kustomer / Instansi Sekolah</label>
                        <input required type="text" placeholder="Masukkan nama guru / asal sekolah" value={form.customer} onChange={e => setForm({ ...form, customer: e.target.value })} className="w-full border px-3 py-2 rounded-xl bg-white text-sm text-gray-855" />
                    </div>
                </div>

                {/* AREA SELEKSI DAFTAR ITEM DILAKUKAN SECARA MULTI-BARIS */}
                <div className="space-y-3 bg-gray-50 p-4 rounded-xl border border-gray-200">
                    <div className="flex justify-between items-center border-b pb-2">
                        <span className="text-xs font-extrabold text-blue-900 uppercase tracking-wider">Rincian Paket Modul Yang Di-deal</span>
                        <button type="button" onClick={tambahBarisItem} className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-1 px-3 rounded-lg transition flex items-center gap-1 shadow-sm">
                            <PlusCircle size={14} /> Tambah Modul/Kelas
                        </button>
                    </div>

                    {items.map((item, index) => (
                        <div key={item.id} className="grid grid-cols-1 sm:grid-cols-12 gap-2 bg-white p-3 rounded-xl border shadow-sm items-center relative animate-in zoom-in-95">
                            <div className="sm:col-span-5 space-y-1">
                                <label className="text-[10px] font-bold text-gray-400 block sm:hidden">Jenjang / Kelas</label>
                                <select
                                    value={item.jenjang}
                                    onChange={e => ubahDataBaris(item.id, 'jenjang', e.target.value)}
                                    className="w-full border p-1.5 rounded-lg text-xs bg-white font-medium text-gray-800"
                                >
                                    {jenjangOptions.map((opt, i) => <option key={i} value={opt}>{opt}</option>)}
                                </select>
                            </div>

                            <div className="sm:col-span-5 space-y-1">
                                <label className="text-[10px] font-bold text-gray-400 block sm:hidden">Mata Pelajaran</label>
                                {item.jenjang === 'Kustom / Lainnya' ? (
                                    <input
                                        required
                                        type="text"
                                        placeholder="Ketik keterangan kustom..."
                                        value={item.customText}
                                        onChange={e => ubahDataBaris(item.id, 'customText', e.target.value)}
                                        className="w-full border p-1.5 rounded-lg text-xs bg-white text-gray-855"
                                    />
                                ) : (
                                    <select
                                        value={item.mapel}
                                        onChange={e => ubahDataBaris(item.id, 'mapel', e.target.value)}
                                        className="w-full border p-1.5 rounded-lg text-xs bg-white font-medium text-gray-800"
                                    >
                                        {mapelOptions.map((opt, i) => <option key={i} value={opt}>{opt}</option>)}
                                    </select>
                                )}
                            </div>

                            <div className="sm:col-span-2 flex justify-end items-center gap-2 pt-2 sm:pt-0 border-t sm:border-0 border-dashed border-gray-200">
                                <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-1 rounded">
                                    +Rp{dapatkanRekomendasiHarga(item).toLocaleString('id-ID')}
                                </span>
                                {items.length > 1 && (
                                    <button type="button" onClick={() => hapusBarisItem(item.id)} className="text-red-500 hover:text-red-700 p-1 hover:bg-red-50 rounded-lg transition" title="Hapus baris">
                                        <Trash2 size={16} />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {/* TOTAL HARGA ADAPUN TETAP BISA DIUBAH MANUAL APABILA ADA TAWAR MENAWAR DENGAN GURU */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">Harga Deal Closing Akhir (Rp) <span className="text-blue-600 font-normal">*Bisa diedit/nego manual</span></label>
                        <input required type="number" placeholder="Masukkan harga akhir deal kustomer" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} className="w-full border px-3 py-2.5 rounded-xl bg-white text-base text-gray-855 font-black focus:ring-2 focus:ring-blue-500 text-green-600 shadow-sm" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">Catatan Transaksi / Keterangan Tambahan</label>
                        <textarea placeholder="Contoh: Pembayaran via Rek BRI, pengiriman ke nomor WA utama guru" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="w-full border px-3 py-1.5 rounded-xl bg-white text-sm text-gray-855 focus:ring-2 focus:ring-blue-500" rows={2}></textarea>
                    </div>
                </div>

                <button type="submit" className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-xl text-lg transition shadow-md flex items-center justify-center gap-2 cursor-pointer border-0">
                    <CheckCircle size={20} /> Simpan Laporan Closingan
                </button>
            </form>
        </div>
    );
}

function StaffCommissions({ staffName, salesData, payoutsData }) {
    const mySales = salesData.filter(s => s.staffName === staffName);
    const myPayouts = payoutsData.filter(p => p.staffName === staffName);

    const totalPaid = myPayouts.reduce((acc, curr) => acc + curr.amount, 0);
    const unpaidSales = mySales.filter(s => s.paymentStatus !== 'paid');
    const unpaidCommissionAmount = unpaidSales.reduce((acc, curr) => acc + (acc.amount * 0.10), 0);

    const dailyUnpaidSales = {};
    unpaidSales.forEach(sale => {
        if (!dailyUnpaidSales[sale.date]) dailyUnpaidSales[sale.date] = 0;
        dailyUnpaidSales[sale.date] += sale.amount;
    });

    let unpaidBonusAmount = 0;
    Object.values(dailyUnpaidSales).forEach(amount => {
        if (amount >= 1000000) {
            unpaidBonusAmount += 50000 * Math.floor(amount / 1000000);
        }
    });

    const totalUnpaid = unpaidCommissionAmount + unpaidBonusAmount;

    return (
        <div className="space-y-6 animate-in fade-in pt-4 md:pt-0">
            <div>
                <h1 className="text-3xl font-extrabold text-gray-800 tracking-tight text-blue-950">Laporan Komisi Saya</h1>
                <p className="text-gray-500 text-sm mt-1">Pantau rincian komisi, bonus target harian, dan riwayat log pencairan gaji Anda.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-150 flex items-center justify-between">
                    <div className="space-y-2">
                        <p className="text-xs text-amber-500 font-bold uppercase tracking-wider">Komisi Belum Dibayar (Unpaid)</p>
                        <h3 className="text-2xl font-black text-gray-855">Rp {totalUnpaid.toLocaleString('id-ID')}</h3>
                        <div className="text-[11px] text-gray-500 font-medium space-y-0.5">
                            <div className="flex justify-between gap-4">
                                <span>Komisi Dasar (10%):</span>
                                <span className="font-bold text-gray-750">Rp {unpaidCommissionAmount.toLocaleString('id-ID')}</span>
                            </div>
                            <div className="flex justify-between gap-4">
                                <span>Bonus Harian:</span>
                                <span className="font-bold text-gray-750">Rp {unpaidBonusAmount.toLocaleString('id-ID')}</span>
                            </div>
                        </div>
                    </div>
                    <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center shadow-inner"><Clock size={28} /></div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-150 flex items-center justify-between">
                    <div className="space-y-2">
                        <p className="text-xs text-green-500 font-bold uppercase tracking-wider">Komisi Sudah Dibayar (Paid)</p>
                        <h3 className="text-2xl font-black text-gray-855">Rp {totalPaid.toLocaleString('id-ID')}</h3>
                        <p className="text-[11px] text-gray-500 font-medium flex items-center gap-1">
                            <span className="bg-green-50 text-green-700 px-2 py-0.5 rounded-full font-bold">Lunas</span>
                            <span>Telah ditransfer oleh Owner</span>
                        </p>
                    </div>
                    <div className="w-14 h-14 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center shadow-inner"><CheckCircle size={28} /></div>
                </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-150 space-y-4">
                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    <Award size={20} className="text-blue-500" />
                    <span>Riwayat Pencairan Gaji</span>
                </h3>

                <div className="overflow-hidden rounded-xl border">
                    <table className="w-full text-left text-sm hidden md:table bg-white">
                        <thead className="bg-blue-900 text-white">
                            <tr>
                                <th className="px-4 py-3.5 font-bold">Tanggal Cair</th>
                                <th className="px-4 py-3.5 font-bold">Periode Kerja</th>
                                <th className="px-4 py-3.5 text-right font-bold">Jumlah Pencairan</th>
                                <th className="px-4 py-3.5 text-center font-bold">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {myPayouts.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="text-center py-8 text-gray-400">Belum ada riwayat pencairan komisi.</td>
                                </tr>
                            ) : (
                                myPayouts.map((pay, i) => (
                                    <tr key={i} className="border-b hover:bg-gray-50/50">
                                        <td className="px-4 py-4 font-semibold text-gray-800">{pay.payoutDate}</td>
                                        <td className="px-4 py-4 text-gray-600">{pay.startDate} s/d {pay.endDate}</td>
                                        <td className="px-4 py-4 text-right font-bold text-green-600">Rp {pay.amount.toLocaleString('id-ID')}</td>
                                        <td className="px-4 py-4 text-center">
                                            <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-50 text-green-700">Telah Dibayar</span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>

                    <div className="block md:hidden space-y-3 p-3 bg-gray-50">
                        {myPayouts.length === 0 ? (
                            <p className="text-center py-6 text-gray-400 text-xs">Belum ada riwayat pencairan komisi.</p>
                        ) : (
                            myPayouts.map((pay, i) => (
                                <div key={i} className="bg-white p-4 rounded-xl border shadow-sm space-y-2.5">
                                    <div className="flex justify-between items-center border-b pb-1.5">
                                        <span className="font-bold text-gray-800 text-sm">Pencairan Gaji</span>
                                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-50 text-green-700">Lunas</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-y-1 text-xs text-gray-600 font-medium">
                                        <span>Tanggal Cair:</span>
                                        <span className="text-right text-gray-800 font-bold">{pay.payoutDate}</span>

                                        <span>Periode:</span>
                                        <span className="text-right text-gray-800">{pay.startDate} s/d {pay.endDate}</span>

                                        <span className="border-t pt-1 font-bold text-gray-800">Jumlah Cair:</span>
                                        <span className="text-right border-t pt-1 font-black text-green-600">Rp {pay.amount.toLocaleString('id-ID')}</span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-150 space-y-4">
                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    <Clock size={20} className="text-amber-500" />
                    <span>Daftar Transaksi Belum Dibayar (Pending)</span>
                </h3>

                <div className="overflow-hidden rounded-xl border">
                    <table className="w-full text-left text-sm hidden md:table bg-white">
                        <thead className="bg-amber-500 text-white">
                            <tr>
                                <th className="px-4 py-3.5 font-bold">Tanggal</th>
                                <th className="px-4 py-3.5 font-bold">Kustomer</th>
                                <th className="px-4 py-3.5 font-bold">Produk</th>
                                <th className="px-4 py-3.5 text-right font-bold">Nominal</th>
                                <th className="px-4 py-3.5 text-center font-bold">Estimasi Komisi (10%)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {unpaidSales.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="text-center py-8 text-gray-400">Semua closingan Anda telah dibayarkan! Keren! 🚀</td>
                                </tr>
                            ) : (
                                unpaidSales.map((sale, i) => (
                                    <tr key={i} className="border-b hover:bg-gray-50/50">
                                        <td className="px-4 py-4 text-gray-600">{sale.date}</td>
                                        <td className="px-4 py-4 font-bold text-gray-855">{sale.customer}</td>
                                        <td className="px-4 py-4"><span className="bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full text-xs font-bold">{sale.product}</span></td>
                                        <td className="px-4 py-4 text-right font-semibold">Rp {sale.amount.toLocaleString('id-ID')}</td>
                                        <td className="px-4 py-4 text-center font-black text-amber-600">Rp {(sale.amount * 0.10).toLocaleString('id-ID')}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>

                    <div className="block md:hidden space-y-3 p-3 bg-gray-50">
                        {unpaidSales.length === 0 ? (
                            <p className="text-center py-6 text-gray-400 text-xs">Semua closingan Anda telah dibayarkan! Keren! 🚀</p>
                        ) : (
                            unpaidSales.map((sale, i) => (
                                <div key={i} className="bg-white p-4 rounded-xl border shadow-sm space-y-2.5">
                                    <div className="flex justify-between items-center border-b pb-1.5">
                                        <span className="font-bold text-gray-800 text-sm">{sale.customer}</span>
                                        <span className="text-[10px] text-gray-500 font-medium">{sale.date}</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-y-1 text-xs text-gray-600 font-medium">
                                        <span>Produk:</span>
                                        <span className="text-right">
                                            <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full text-[10px] font-bold">{sale.product}</span>
                                        </span>

                                        <span>Nominal:</span>
                                        <span className="text-right text-gray-800 font-bold">Rp {sale.amount.toLocaleString('id-ID')}</span>

                                        <span className="border-t pt-1 font-bold text-amber-600">Est. Komisi (10%):</span>
                                        <span className="text-right border-t pt-1 font-black text-amber-600">Rp {(sale.amount * 0.10).toLocaleString('id-ID')}</span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ==================== DAFTAR TAMBAHAN KOMPONEN BARU SUB-SISTEM ====================

export function StaffResourceHub({ db, appId, user, showAlert }) {
    const [drives, setDrives] = React.useState([]);
    const [selectedDrive, setSelectedDrive] = React.useState(null);

    React.useEffect(() => {
        if (!db) return;
        const driveRef = collection(db, 'artifacts', appId, 'public', 'data', 'driveFilesData');
        const unsubscribe = onSnapshot(driveRef, (snapshot) => {
            const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setDrives(fetched);
            if (fetched.length > 0 && !selectedDrive) {
                setSelectedDrive(fetched[0]);
            }
        });
        return () => unsubscribe();
    }, [db]);

    const dapatkanLinkEmbed = (url) => {
        if (!url) return "";
        let folderId = "";
        if (url.includes('/folders/')) {
            folderId = url.split('/folders/')[1]?.split('?')[0];
        } else if (url.includes('id=')) {
            folderId = url.split('id=')[1]?.split('&')[0];
        } else {
            return url;
        }
        return `https://drive.google.com/embeddedfolderview?id=${folderId}#list`;
    };

    const handlePilihFolder = async (drive) => {
        setSelectedDrive(drive);
        try {
            await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'downloadLogs'), {
                staffName: user.name,
                username: user.username,
                fileName: `Membuka Drive: ${drive.name}`,
                fileId: drive.id,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error("Gagal mencatat log", error);
        }
    };

    return (
        <div className="space-y-4 animate-in fade-in h-[82vh] flex flex-col">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 border-b pb-3">
                <div>
                    <h2 className="text-xl font-black text-blue-950 flex items-center gap-2">
                        <Package size={22} className="text-blue-600" />
                        <span>Sobat Guru Live Explorer</span>
                    </h2>
                    <p className="text-gray-500 text-xs">Gunakan kolom pencarian di dalam kotak Google Drive di bawah untuk mencari file.</p>
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto">
                    <span className="text-xs font-bold text-gray-500 uppercase whitespace-nowrap">Pilih Kategori:</span>
                    <select
                        value={selectedDrive?.id || ''}
                        onChange={(e) => {
                            const cocok = drives.find(d => d.id === e.target.value);
                            if (cocok) handlePilihFolder(cocok);
                        }}
                        className="border px-3 py-1.5 rounded-xl text-xs bg-white font-bold text-blue-900 focus:ring-2 focus:ring-blue-500 w-full md:w-56"
                    >
                        {drives.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                        {drives.length === 0 && <option>Belum ada folder diinput Admin</option>}
                    </select>
                </div>
            </div>

            <div className="flex-grow w-full bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden relative min-h-[450px]">
                {selectedDrive ? (
                    <iframe
                        src={dapatkanLinkEmbed(selectedDrive.url)}
                        width="100%"
                        height="100%"
                        frameBorder="0"
                        className="w-full h-full"
                        allow="autoplay"
                        title="Google Drive Embed"
                    ></iframe>
                ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
                        <Search size={40} className="animate-pulse mb-2" />
                        <p className="text-sm font-medium">Memuat Google Cloud Server...</p>
                    </div>
                )}
            </div>

            {selectedDrive && (
                <div className="mt-3 flex flex-col sm:flex-row items-center justify-between bg-blue-50 p-3.5 rounded-xl border border-blue-200 gap-2 animate-in fade-in">
                    <span className="text-xs text-blue-800 font-medium flex items-center gap-1.5">
                        ⚠️ Mengalami kendala memuat folder di atas? Anda dapat membukanya langsung di Google Drive secara aman.
                    </span>
                    <a
                        href={selectedDrive.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-xl text-xs transition inline-flex items-center gap-1.5 whitespace-nowrap shadow-sm"
                    >
                        Buka Folder di Tab Baru &rarr;
                    </a>
                </div>
            )}
        </div>
    );
}

export function ManageAdminDrive({ db, appId, showAlert, showConfirm }) {
    const [driveData, setDriveData] = React.useState([]);
    const [form, setForm] = React.useState({ name: '', url: '', description: '' });
    const [editId, setEditId] = React.useState(null);

    React.useEffect(() => {
        if (!db) return;
        const driveRef = collection(db, 'artifacts', appId, 'public', 'data', 'driveFilesData');
        return onSnapshot(driveRef, (snapshot) => {
            setDriveData(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
    }, [db]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const driveRef = collection(db, 'artifacts', appId, 'public', 'data', 'driveFilesData');
            if (editId) {
                await updateDoc(doc(driveRef, editId), form);
                showAlert("Folder Drive berhasil diperbarui!", "Sukses", "success");
                setEditId(null);
            } else {
                await addDoc(driveRef, form);
                showAlert("Folder sukses ditempel ke aplikasi!", "Sukses", "success");
            }
            setForm({ name: '', url: '', description: '' });
        } catch (error) {
            showAlert("Gagal menyimpan data.", "Error", "error");
        }
    };

    const handleDelete = async (id) => {
        try {
            await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'driveFilesData', id));
            showAlert("Folder telah dicabut.", "Sukses", "success");
        } catch (error) {
            showAlert("Gagal menghapus.", "Error", "error");
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in">
            <div>
                <h1 className="text-2xl font-bold text-blue-950">Pengaturan Embed Google Drive</h1>
                <p className="text-sm text-gray-500">Cukup paste link folder Google Drive utama atau per jenjang di sini.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-white p-5 rounded-2xl border shadow-sm h-fit">
                    <h3 className="font-bold text-gray-800 border-b pb-2 mb-4">{editId ? 'Ubah Folder' : 'Embed Folder Baru'}</h3>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="text-xs font-bold text-gray-600 block mb-1">Nama Folder Tampilan</label>
                            <input required type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full border px-3 py-2 rounded-lg text-sm bg-white text-gray-800" placeholder="Contoh: Master Drive Semua Sampel" />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-600 block mb-1">Link Share Folder Google Drive</label>
                            <input required type="url" value={form.url} onChange={e => setForm({ ...form, url: e.target.value })} className="w-full border px-3 py-2 rounded-lg text-xs font-mono text-blue-700 bg-white" placeholder="https://drive.google.com/drive/folders/..." />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-600 block mb-1">Keterangan Tambahan</label>
                            <textarea rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full border px-3 py-2 rounded-lg text-sm bg-white text-gray-800" placeholder="Catatan internal..."></textarea>
                        </div>
                        <div className="flex gap-2 pt-2">
                            <button type="submit" className="flex-1 bg-blue-600 text-white font-bold py-2 rounded-xl text-sm hover:bg-blue-700 transition">{editId ? 'Simpan' : 'Embed Folder'}</button>
                            {editId && <button type="button" onClick={() => { setEditId(null); setForm({ name: '', url: '', description: '' }) }} className="bg-gray-400 text-white px-3 py-2 rounded-xl text-sm">Batal</button>}
                        </div>
                    </form>
                </div>

                <div className="lg:col-span-2 space-y-4">
                    <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
                        <table className="w-full text-left text-sm text-gray-600">
                            <thead className="bg-gray-50 border-b font-bold text-gray-700">
                                <tr>
                                    <th className="px-4 py-3">Nama Kategori Folder</th>
                                    <th className="px-4 py-3 text-center">Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {driveData.map(file => (
                                    <tr key={file.id} className="border-b hover:bg-gray-50/50">
                                        <td className="px-4 py-3 font-bold text-gray-800">{file.name}</td>
                                        <td className="px-4 py-3 text-center space-x-2.5 whitespace-nowrap">
                                            <button onClick={() => { setEditId(file.id); setForm(file); }} className="text-blue-600 hover:text-blue-800 inline-block"><Edit size={16} /></button>
                                            <button onClick={() => showConfirm("Cabut hak akses folder embed ini dari sales?", () => handleDelete(file.id))} className="text-red-500 hover:text-red-700 inline-block"><Trash2 size={16} /></button>
                                        </td>
                                    </tr>
                                ))}
                                {driveData.length === 0 && (
                                    <tr>
                                        <td colSpan={2} className="text-center py-6 text-gray-400">Belum ada folder Drive yang di-embed.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}

export function ManageAdminLogs({ db, appId }) {
    const [logs, setLogs] = React.useState([]);
    const [currentPage, setCurrentPage] = React.useState(1);
    const itemsPerPage = 25;

    React.useEffect(() => {
        if (!db) return;
        const logsRef = collection(db, 'artifacts', appId, 'public', 'data', 'downloadLogs');
        const unsubscribe = onSnapshot(logsRef, (snapshot) => {
            const fetchedLogs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            fetchedLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            setLogs(fetchedLogs);
        }, (err) => console.error(err));
        return () => unsubscribe();
    }, [db]);

    const totalPages = Math.ceil(logs.length / itemsPerPage);
    const paginatedLogs = logs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    return (
        <div className="space-y-6 animate-in fade-in">
            <div>
                <h1 className="text-2xl font-black text-blue-950 flex items-center gap-2">
                    <Clock size={24} className="text-amber-500" />
                    <span>Audit Log Akses Drive Sales</span>
                </h1>
                <p className="text-sm text-gray-500 mt-0.5">Memantau waktu tepat saat akun sales membuka kotak penyimpanan sampel.</p>
            </div>

            <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
                <table className="w-full text-left text-sm text-gray-600">
                    <thead className="bg-blue-900 text-white text-xs font-bold uppercase tracking-wider">
                        <tr>
                            <th className="px-6 py-4">Waktu Akses</th>
                            <th className="px-6 py-4">Nama Akun Sales</th>
                            <th className="px-6 py-4">Aktivitas Akses</th>
                            <th className="px-6 py-4 text-center">Status</th>
                        </tr>
                    </thead>
                    <tbody className="font-medium">
                        {paginatedLogs.map((log) => (
                            <tr key={log.id} className="border-b hover:bg-gray-50/70 transition">
                                <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500 font-mono">
                                    {new Date(log.timestamp).toLocaleString('id-ID')}
                                </td>
                                <td className="px-6 py-4 font-bold text-blue-900">
                                    {log.staffName} <span className="text-xs text-gray-400 font-normal">(@{log.username})</span>
                                </td>
                                <td className="px-6 py-4 text-gray-800 font-semibold" title={log.fileName}>
                                    {log.fileName}
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <span className="bg-green-50 text-green-700 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-green-200">
                                        Verified View
                                    </span>
                                </td>
                            </tr>
                        ))}
                        {paginatedLogs.length === 0 && (
                            <tr>
                                <td colSpan={4} className="text-center py-10 text-gray-400 font-medium">Belum ada riwayat aktivitas yang tercatat.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
        </div>
    );
}

export function StaffSalesLedger({ mySalesData }) {
    const totalClosing = mySalesData.length;
    const omzetBruto = mySalesData.reduce((acc, curr) => acc + curr.amount, 0);

    return (
        <div className="space-y-6 animate-in fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="bg-gradient-to-br from-blue-900 to-indigo-950 p-5 rounded-2xl text-white shadow-sm">
                    <p className="text-xs text-blue-200 font-medium uppercase tracking-wider">Total Transaksi Penjualan Anda</p>
                    <h4 className="text-2xl font-black mt-1">{totalClosing} Nota Terinput</h4>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-gray-150 shadow-sm">
                    <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Akumulasi Omzet Pribadi</p>
                    <h4 className="text-2xl font-black text-green-600 mt-1">Rp {omzetBruto.toLocaleString('id-ID')}</h4>
                </div>
            </div>

            <div className="bg-white rounded-xl border overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-gray-600">
                        <thead className="bg-gray-50 text-gray-700 font-bold border-b">
                            <tr>
                                <th className="px-4 py-3">Tanggal Nota</th>
                                <th className="px-4 py-3">Nama Kustomer / Sekolah</th>
                                <th className="px-4 py-3">Paket Pembelian</th>
                                <th className="px-4 py-3 text-right">Nilai Closing</th>
                            </tr>
                        </thead>
                        <tbody className="font-medium">
                            {mySalesData.map((s, idx) => (
                                <tr key={idx} className="border-b hover:bg-gray-50/50">
                                    <td className="px-4 py-3 whitespace-nowrap">{s.date}</td>
                                    <td className="px-4 py-3 text-gray-900 font-bold">{s.customer}</td>
                                    <td className="px-4 py-3">{s.product}</td>
                                    <td className="px-4 py-3 text-right text-green-600 font-bold">Rp {s.amount.toLocaleString('id-ID')}</td>
                                </tr>
                            ))}
                            {mySalesData.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="text-center py-6 text-gray-400">Belum ada riwayat closing yang tercatat.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

export function ManageLeadsDashboard({ leadsData, showAlert }) {
    const [currentPage, setCurrentPage] = React.useState(1);
    const itemsPerPage = 25;

    const triggerWhatsApp = (lead) => {
        const textMessage = `Halo Bpk/Ibu ${lead.name}, saya melihat Anda mengunduh contoh Perangkat Administrasi Modul Deeplearning di Sobat Guru Digital. Apakah ada materi jenjang tertentu yang sedang dibutuhkan saat ini?`;
        window.open(`https://api.whatsapp.com/send?phone=${lead.phone.replace(/^0/, '+62')}&text=${encodeURIComponent(textMessage)}`, '_blank');
        showAlert(`Menghubungi ${lead.name} via WhatsApp`, "CRM Sukses", "success");
    };

    const totalPages = Math.ceil(leadsData.length / itemsPerPage);
    const paginatedLeads = leadsData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    return (
        <div className="space-y-6 animate-in fade-in">
            <div>
                <h2 className="text-2xl font-bold text-blue-950">Pusat Data Leads (CRM)</h2>
                <p className="text-gray-500 text-sm">Follow up para pendaftar sampel gratis di halaman website untuk dikonversi menjadi closing penjualan.</p>
            </div>
            <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-gray-600">
                        <thead className="bg-gray-50 border-b text-xs font-bold uppercase text-gray-700">
                            <tr>
                                <th className="px-6 py-3">Tanggal Masuk</th>
                                <th className="px-6 py-3">Nama Pendidik</th>
                                <th className="px-6 py-3">Nomor WhatsApp</th>
                                <th className="px-6 py-3 text-center">Aksi Hubungi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedLeads.map((lead) => (
                                <tr key={lead.id} className="border-b hover:bg-gray-50/50">
                                    <td className="px-6 py-4 text-xs whitespace-nowrap">{lead.date?.slice(0, 10) || '-'}</td>
                                    <td className="px-6 py-4 font-bold text-gray-900">{lead.name}</td>
                                    <td className="px-6 py-4 font-mono text-gray-650 text-xs">{lead.phone}</td>
                                    <td className="px-6 py-4 text-center">
                                        <button onClick={() => triggerWhatsApp(lead)} className="bg-green-500 hover:bg-green-600 text-white font-bold py-1.5 px-4 rounded-xl text-xs transition">
                                            Chat WhatsApp
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {paginatedLeads.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="text-center py-8 text-gray-400">Belum ada data leads yang terekam masuk.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
        </div>
    );
}

export function ManageBrandSettings({ appSettings, db, appId, showAlert }) {
    const [faviconUrl, setFaviconUrl] = React.useState(appSettings.favicon || '');
    const [priceSD, setPriceSD] = React.useState(appSettings.priceSD || 35000);
    const [priceSMP, setPriceSMP] = React.useState(appSettings.priceSMP || 45000);
    const [priceSMA, setPriceSMA] = React.useState(appSettings.priceSMA || 55000);
    const [priceLengkap, setPriceLengkap] = React.useState(appSettings.priceLengkap || 150000);
    const [priceKustom, setPriceKustom] = React.useState(appSettings.priceKustom || 50000);
    const [mapelList, setMapelList] = React.useState(appSettings.mapelList || 'Matematika, Bahasa Indonesia, Bahasa Inggris, IPA, IPS, Pancasila / PKn, PAI (Agama), PJOK, Seni Budaya, Tematik, Semua Mapel (Paket)');

    React.useEffect(() => {
        if (appSettings) {
            setFaviconUrl(appSettings.favicon || '');
            setPriceSD(appSettings.priceSD || 35000);
            setPriceSMP(appSettings.priceSMP || 45000);
            setPriceSMA(appSettings.priceSMA || 55000);
            setPriceLengkap(appSettings.priceLengkap || 150000);
            setPriceKustom(appSettings.priceKustom || 50000);
            setMapelList(appSettings.mapelList || 'Matematika, Bahasa Indonesia, Bahasa Inggris, IPA, IPS, Pancasila / PKn, PAI (Agama), PJOK, Seni Budaya, Tematik, Semua Mapel (Paket)');
        }
    }, [appSettings]);

    const handleSaveConfig = async (e) => {
        e.preventDefault();
        try {
            const settingsCollection = collection(db, 'artifacts', appId, 'public', 'data', 'settingsData');
            await setDoc(doc(settingsCollection, 'global_config'), {
                favicon: faviconUrl,
                priceSD: Number(priceSD),
                priceSMP: Number(priceSMP),
                priceSMA: Number(priceSMA),
                priceLengkap: Number(priceLengkap),
                priceKustom: Number(priceKustom),
                mapelList: mapelList
            }, { merge: true });
            showAlert("Seluruh konfigurasi harga & daftar mata pelajaran berhasil disimpan!", "Sukses", "success");
        } catch (error) {
            showAlert("Gagal mengupdate konfigurasi!", "Error", "error");
        }
    };

    return (
        <div className="bg-white p-6 rounded-2xl border shadow-sm max-w-2xl animate-in fade-in space-y-6">
            <div className="border-b pb-3">
                <h3 className="font-extrabold text-blue-950 text-lg">Pengaturan Aplikasi & Atur Tarif</h3>
                <p className="text-gray-500 text-xs">Kelola branding, harga otomatis, serta daftar pilihan mata pelajaran form staf secara real-time.</p>
            </div>

            <form onSubmit={handleSaveConfig} className="space-y-5">
                {/* Branding */}
                <div className="space-y-2">
                    <h4 className="text-xs font-bold text-blue-900 uppercase tracking-wider">Aset & Branding</h4>
                    <div className="space-y-1">
                        <label className="block text-xs font-bold text-gray-700">Link URL Gambar Ikon Browser (.ico / .png)</label>
                        <input required type="url" value={faviconUrl} onChange={(e) => setFaviconUrl(e.target.value)} placeholder="https://linkwebsite.com/ikon.png" className="w-full border px-4 py-2 rounded-xl text-xs font-mono text-blue-700 bg-gray-50 focus:ring-2 focus:ring-blue-600 focus:outline-none" />
                    </div>
                </div>

                <hr className="border-gray-200" />

                {/* Atur Penyesuai Harga */}
                <div className="space-y-3">
                    <h4 className="text-xs font-bold text-blue-900 uppercase tracking-wider">Tarif Dasar Otomatis Form Staf (Rupiah)</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">Harga per Mapel SD</label>
                            <input required type="number" value={priceSD} onChange={(e) => setPriceSD(e.target.value)} className="w-full border px-3 py-2 rounded-lg text-sm bg-gray-50 text-gray-800 font-bold" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">Harga per Mapel SMP</label>
                            <input required type="number" value={priceSMP} onChange={(e) => setPriceSMP(e.target.value)} className="w-full border px-3 py-2 rounded-lg text-sm bg-gray-50 text-gray-800 font-bold" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">Harga per Mapel SMA</label>
                            <input required type="number" value={priceSMA} onChange={(e) => setPriceSMA(e.target.value)} className="w-full border px-3 py-2 rounded-lg text-sm bg-gray-50 text-gray-800 font-bold" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">Harga Paket Lengkap (SD/SMP/SMA)</label>
                            <input required type="number" value={priceLengkap} onChange={(e) => setPriceLengkap(e.target.value)} className="w-full border px-3 py-2 rounded-lg text-sm bg-gray-50 text-gray-800 font-bold" />
                        </div>
                        <div className="sm:col-span-2">
                            <label className="block text-xs font-semibold text-gray-700 mb-1">Harga Opsi Kustom / Lainnya</label>
                            <input required type="number" value={priceKustom} onChange={(e) => setPriceKustom(e.target.value)} className="w-full border px-3 py-2 rounded-lg text-sm bg-gray-50 text-gray-800 font-bold" />
                        </div>
                    </div>
                </div>

                <hr className="border-gray-200" />

                {/* BARU: Atur Daftar Mapel Dropdown */}
                <div className="space-y-2">
                    <h4 className="text-xs font-bold text-blue-900 uppercase tracking-wider">Kelola Pilihan Mata Pelajaran (Mapel)</h4>
                    <div className="space-y-1">
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Daftar Mata Pelajaran *(Pisahkan dengan tanda koma)</label>
                        <textarea
                            required
                            rows={3}
                            value={mapelList}
                            onChange={(e) => setMapelList(e.target.value)}
                            placeholder="Contoh: Matematika, Bahasa Indonesia, Sejarah, Geografi, Fisika, Kimia"
                            className="w-full border px-3 py-2 rounded-xl text-xs bg-gray-50 text-gray-800 font-medium focus:ring-2 focus:ring-blue-600 focus:outline-none"
                        />
                        <p className="text-[10px] text-gray-400 font-medium mt-1">Tip: Anda bisa menambah mapel baru seperti "Sejarah, Geografi, Antropologi" di atas. Cukup beri tanda koma `,` sebagai pemisah antar mapel.</p>
                    </div>
                </div>

                <div className="bg-blue-50 p-3 rounded-xl border border-blue-100 text-[10px] text-blue-800 font-medium">
                    Setiap perubahan mapel dan harga yang Anda simpan di panel ini akan langsung merubah tampilan aplikasi staf Anda detik itu juga secara real-time tanpa perlu restart server.
                </div>

                <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl text-sm shadow transition cursor-pointer border-0">
                    Simpan Perubahan Aplikasi & Mapel
                </button>
            </form>
        </div>
    );
}
// ---------------------- REUSABLE UI COMPONENTS ----------------------

function Pagination({ currentPage, totalPages, onPageChange }) {
    if (totalPages <= 1) return null;
    const pages = [];
    for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
    }
    return (
        <div className="flex justify-between items-center px-4 py-3 bg-white border-t border-gray-150 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
                <button
                    disabled={currentPage === 1}
                    onClick={() => onPageChange(currentPage - 1)}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-xs font-bold rounded-lg text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                    Sebelumnya
                </button>
                <button
                    disabled={currentPage === totalPages}
                    onClick={() => onPageChange(currentPage + 1)}
                    className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-xs font-bold rounded-lg text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                    Selanjutnya
                </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                    <p className="text-xs text-gray-500 font-medium">
                        Halaman <span className="font-bold text-gray-800">{currentPage}</span> dari <span className="font-bold text-gray-800">{totalPages}</span>
                    </p>
                </div>
                <div>
                    <nav className="relative z-0 inline-flex rounded-lg shadow-sm -space-x-px" aria-label="Pagination">
                        <button
                            disabled={currentPage === 1}
                            onClick={() => onPageChange(currentPage - 1)}
                            className="relative inline-flex items-center px-2 py-2 rounded-l-lg border border-gray-300 bg-white text-xs font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            &larr;
                        </button>
                        {pages.map((p) => (
                            <button
                                key={p}
                                onClick={() => onPageChange(p)}
                                className={`relative inline-flex items-center px-3.5 py-2 border text-xs font-bold transition-all ${p === currentPage
                                    ? 'z-10 bg-blue-600 border-blue-600 text-white'
                                    : 'bg-white border-gray-300 text-gray-550 hover:bg-gray-50'
                                    }`}
                            >
                                {p}
                            </button>
                        ))}
                        <button
                            disabled={currentPage === totalPages}
                            onClick={() => onPageChange(currentPage + 1)}
                            className="relative inline-flex items-center px-2 py-2 rounded-r-lg border border-gray-300 bg-white text-xs font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            &rarr;
                        </button>
                    </nav>
                </div>
            </div>
        </div>
    );
}
