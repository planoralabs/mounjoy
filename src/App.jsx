import React, { useState, useEffect } from 'react';
import { Home, PenLine, BarChart3, Settings, CalendarDays, Info, Cloud } from 'lucide-react';
import Dashboard from './components/Dashboard';
import Logs from './components/Logs';
import Charts from './components/Charts';
import Profile from './components/Profile';
import CalendarView from './components/CalendarView';
import Onboarding from './components/Onboarding';
import LandingPage from './components/LandingPage';
import FunLandingPage from './components/FunLandingPage';
import { Modal, Button } from './components/ui/BaseComponents';

import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './components/Login';
import { userService } from './services/userService';

const NavItem = ({ icon: Icon, active, onClick }) => (
    <button
        onClick={onClick}
        className={`p-3 transition-all duration-300 ${active
            ? 'text-brand'
            : 'text-slate-400 hover:text-brand'
            }`}
    >
        <Icon size={26} strokeWidth={active ? 2.5 : 2} />
    </button>
);



const MainApp = ({ guestUser, setGuestUser, theme, setTheme }) => {
    const { currentUser, userData, logout } = useAuth();
    const [activeTab, setActiveTab] = useState('home');
    const [isMigrating, setIsMigrating] = useState(false);
    const [showLoginModal, setShowLoginModal] = useState(false);
    const [showGuestNotice, setShowGuestNotice] = useState(true); // 🎈 Auto-start for guests

    const isGuest = !currentUser && guestUser;

    const handleAvatarClick = () => {
        if (isGuest) {
            setShowGuestNotice(!showGuestNotice);
        } else {
            setActiveTab('profile');
        }
    };

    // 🛡️ Auto-close login modal on success
    useEffect(() => {
        if (currentUser && showLoginModal) {
            setShowLoginModal(false);
            setShowGuestNotice(false);
        }
    }, [currentUser, showLoginModal]);

    // Migration Bridge: LocalStorage -> Firestore
    useEffect(() => {
        const performMigration = async () => {
            if (currentUser && !userData && !isMigrating) {
                setIsMigrating(true);

                // Prioritize guest storage, then user-specific, then legacy
                const guestData = localStorage.getItem('mounjoy_guest_user');
                const userSpecificData = localStorage.getItem(`mounjoy_user_${currentUser.uid}`);
                const legacyData = localStorage.getItem('mounjoy_user2');
                const dataToMigrate = guestData || userSpecificData || legacyData;

                if (dataToMigrate) {
                    try {
                        const parsed = JSON.parse(dataToMigrate);

                        await userService.saveUserProfile(currentUser.uid, {
                            ...parsed,
                            uid: currentUser.uid,
                            email: currentUser.email || parsed.email || '',
                            photoURL: currentUser.photoURL || parsed.photoURL || ''
                        });

                        // Clean up
                        if (guestData) {
                            localStorage.removeItem('mounjoy_guest_user');
                            setGuestUser(null);
                        }
                        if (legacyData) localStorage.removeItem('mounjoy_user2');
                    } catch (e) {
                        console.error("Migration failed:", e);
                    }
                }
                setIsMigrating(false);
            }
        };

        performMigration();
    }, [currentUser, userData, isMigrating, setGuestUser]);

    const handleUpdateUser = async (newData) => {
        const currentUserData = userData || guestUser;
        const updatedData = typeof newData === 'function' ? newData(currentUserData) : newData;

        if (currentUser) {
            await userService.saveUserProfile(currentUser.uid, updatedData);
        } else {
            setGuestUser(updatedData);
            localStorage.setItem('mounjoy_guest_user', JSON.stringify(updatedData));
        }
    };

    const handleReset = async () => {
        if (currentUser) {
            await logout();
        } else {
            localStorage.removeItem('mounjoy_guest_user');
            setGuestUser(null);
        }
    };

    // Unified user object
    const user = userData || guestUser;

    if (!user) return null; // Should not happen with current routing

    const renderContent = () => {
        switch (activeTab) {
            case 'home': return <Dashboard user={user} setUser={handleUpdateUser} setActiveTab={setActiveTab} theme={theme} />;
            case 'logs': return <Logs user={user} setUser={handleUpdateUser} />;
            case 'calendar': return <CalendarView user={user} setUser={handleUpdateUser} setActiveTab={setActiveTab} />;
            case 'charts': return <Charts user={user} />;
            case 'profile': return <Profile user={user} onReset={handleReset} setUser={handleUpdateUser} theme={theme} setTheme={setTheme} />;
            default: return <Dashboard user={user} setUser={handleUpdateUser} setActiveTab={setActiveTab} />;
        }
    };

    const getWeekNumber = () => {
        const start = new Date(user.startDate);
        const now = new Date();
        const diffTime = Math.abs(now - start);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
        return Math.ceil(diffDays / 7);
    };

    const medicationName = user.medicationId ? (user.medicationId.charAt(0).toUpperCase() + user.medicationId.slice(1)) : 'Protocolo';

    return (
        <div className={`min-h-screen pb-24 selection:bg-brand-100 transition-colors duration-500 ${theme === 'fun' ? 'bg-[#fdf5eb]' : 'bg-[#f8fafc]'}`}>
            <header className="px-6 py-6 flex justify-between items-center bg-transparent max-w-md mx-auto">
                <div>
                    {theme === 'fun' ? (
                        <div className="flex items-center gap-2">
                           <img src="/logomount.png" alt="Mounjoy" className="h-6 w-auto" />
                           <h1 className="text-xl font-black text-orange-600 tracking-tight">Oi, {user.name}! 🎈</h1>
                        </div>
                    ) : (
                        <h1 className="text-2xl font-bold text-brand-900 tracking-tight">Olá, {user.name}</h1>
                    )}
                    <p className={`text-sm font-semibold font-outfit ${theme === 'fun' ? 'text-orange-400' : 'text-slate-500'}`}>
                        {theme === 'fun' ? "Você está arrasando na " : "Você está na "}
                        {getWeekNumber()}ª semana de {medicationName}
                    </p>
                </div>
                <div
                    className="relative w-12 h-12 bg-white rounded-2xl shadow-soft flex items-center justify-center border border-slate-100 cursor-pointer hover:shadow-lg transition-all"
                    onClick={handleAvatarClick}
                >
                    {user.photoURL ? (
                        <img src={user.photoURL} alt={user.name} className="w-full h-full object-cover" />
                    ) : (
                        <span className="text-brand-600 font-bold text-lg">{user.name?.charAt(0).toUpperCase() || '?'}</span>
                    )}

                    {/* 🛡️ Guest Dropdown Balloon (OWASP Pillar 02 / UX) */}
                    {showGuestNotice && isGuest && (
                        <>
                            {/* Backdrop: Dims the rest of the app */}
                            <div 
                                className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] z-[45]" 
                                onClick={(e) => { e.stopPropagation(); setShowGuestNotice(false); }}
                            />
                            
                            <div className="absolute top-16 right-0 w-[280px] bg-white rounded-[32px] shadow-[0_20px_60px_rgba(0,0,0,0.25)] border border-white p-8 z-[50] animate-in fade-in zoom-in-95 slide-in-from-top-4 duration-500">
                                {/* Triangle Pointer */}
                                <div className="absolute -top-2 right-4 w-4 h-4 bg-white rotate-45 border-t border-l border-white shadow-[-5px_-5px_10px_rgba(0,0,0,0.02)]"></div>
                                
                                <div className="flex flex-col items-center text-center gap-5">
                                    <div className="w-14 h-14 bg-brand-50 rounded-2xl flex items-center justify-center text-brand shadow-sm">
                                        <Cloud size={28} className="animate-bounce" />
                                    </div>
                                    <div className="space-y-1">
                                        <h4 className="text-base font-black text-slate-800 uppercase tracking-widest">Salve seu progresso</h4>
                                        <p className="text-xs font-semibold text-slate-400 leading-relaxed">Seus dados atuais não ficarão salvos. Registre-se para não perder nada!</p>
                                    </div>
                                    <Button 
                                        onClick={(e) => { e.stopPropagation(); setShowLoginModal(true); setShowGuestNotice(false); }}
                                        className="w-full py-4 text-sm font-black shadow-lg shadow-brand-500/20"
                                    >
                                        Criar Conta e Salvar
                                    </Button>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); setShowGuestNotice(false); }}
                                        className="text-xs font-bold text-slate-300 hover:text-slate-500 transition-colors uppercase tracking-widest pt-1"
                                    >
                                        Continuar como Visitante
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </header>

            {/* Modal de Login flutuante no dashboard (Opção Recomendada por Antigravity) */}
            <Modal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} title="Salvar sua Jornada">
                <div className="flex flex-col gap-4">
                    <p className="text-sm text-center text-slate-500 mb-2">Entre agora para migrar seu protocolo atual para uma conta segura e gratuita.</p>
                    <div className="max-h-[70vh] overflow-y-auto hide-scrollbar">
                        <Login onBack={() => setShowLoginModal(false)} showBack={false} />
                    </div>
                </div>
            </Modal>

            <main className="px-6 max-w-md mx-auto">
                {renderContent()}
            </main>

            <nav className="fixed bottom-6 left-5 right-5 h-16 bg-white/90 backdrop-blur-md rounded-full shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-white/50 flex justify-around items-center px-2 z-40 max-w-sm mx-auto">
                <NavItem icon={Home} active={activeTab === 'home'} onClick={() => setActiveTab('home')} />
                <NavItem icon={PenLine} active={activeTab === 'logs'} onClick={() => setActiveTab('logs')} />
                <NavItem icon={CalendarDays} active={activeTab === 'calendar'} onClick={() => setActiveTab('calendar')} />
                <NavItem icon={BarChart3} active={activeTab === 'charts'} onClick={() => setActiveTab('charts')} />
                <NavItem icon={Settings} active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} />
            </nav>
        </div>
    );
};

const AppContent = () => {
    const { currentUser, userData } = useAuth();
    const [startedOnboarding, setStartedOnboarding] = useState(false);
    const [showLogin, setShowLogin] = useState(false);
    const [theme, setTheme] = useState(() => localStorage.getItem('mounjoy_theme') || 'default');

    useEffect(() => {
        if (theme === 'default') {
            document.documentElement.removeAttribute('data-theme');
        } else {
            document.documentElement.setAttribute('data-theme', theme);
        }
        localStorage.setItem('mounjoy_theme', theme);
    }, [theme]);

    const { logout } = useAuth();
    
    // 🛡️ OWASP Pillar 07: Inactivity Logout
    // Se o usuário ficar inativo por 30 min, deslogamos ele.
    useEffect(() => {
        let timeout;
        const resetTimer = () => {
            if (timeout) clearTimeout(timeout);
            timeout = setTimeout(() => {
                logout();
            }, 30 * 60 * 1000); // 30 minutos
        };

        window.addEventListener('mousemove', resetTimer);
        window.addEventListener('keypress', resetTimer);
        resetTimer();

        return () => {
            window.removeEventListener('mousemove', resetTimer);
            window.removeEventListener('keypress', resetTimer);
            if (timeout) clearTimeout(timeout);
        };
    }, [logout]);

    const [guestUser, setGuestUser] = useState(() => {
        const saved = localStorage.getItem('mounjoy_guest_user');
        return saved ? JSON.parse(saved) : null;
    });

    const handleOnboardingComplete = (data) => {
        const now = new Date().toISOString();
        const newUser = {
            ...data,
            currentWeight: parseFloat(data.startWeight),
            history: [parseFloat(data.startWeight)],
            startDate: now,
            lastWeightDate: now,
            doseHistory: [{
                date: now,
                dose: data.currentDose,
                medication: data.medicationId,
                site: 'Não registrado'
            }],
            sideEffectsLogs: [],
            measurements: [],
            thoughtLogs: [],
            dailyIntakeHistory: {},
            isMaintenance: false,
            settings: {
                remindersEnabled: true,
                proteinGoal: 100,
                waterGoal: 2.5,
                reminderTime: '09:00'
            }
        };

        if (currentUser) {
            userService.saveUserProfile(currentUser.uid, {
                ...newUser,
                uid: currentUser.uid,
                email: currentUser.email,
                photoURL: currentUser.photoURL || ''
            });
        } else {
            setGuestUser(newUser);
            localStorage.setItem('mounjoy_guest_user', JSON.stringify(newUser));
        }
        setStartedOnboarding(false);
    };

    // Priority: 1. Cloud User Data, 2. Guest User Data
    const hasAnyUser = userData || guestUser;

    // If we have a user (logged in or guest), we show the main app
    // HOWEVER: If a user IS logged in but Firestore hasn't loaded yet (userData is null),
    // and they DON'T have guest data, we might show a loading state or the MainApp will handle it.
    // Given AuthProvider handles loading, if currentUser exists, userData will eventually follow.
    // If we have a user (logged in or guest) AND we have their data, we show the main app
    if ((currentUser || guestUser) && hasAnyUser) {
        return <MainApp guestUser={guestUser} setGuestUser={setGuestUser} theme={theme} setTheme={setTheme} />;
    }

    // If user clicked "Entrar", show the login screen
    if (showLogin) {
        return <Login onBack={() => setShowLogin(false)} />;
    }

    // If user clicked "Começar" on landing, show onboarding
    if (startedOnboarding) {
        return <Onboarding onComplete={handleOnboardingComplete} theme={theme} />;
    }

    // Default: Show the Landing Page (toggle between Standard and Fun)
    if (theme === 'fun') {
        return (
            <FunLandingPage
                onStart={() => setStartedOnboarding(true)}
                onLogin={() => setShowLogin(true)}
                onToggleTheme={() => setTheme('default')}
            />
        );
    }

    return (
        <LandingPage
            onStart={() => setStartedOnboarding(true)}
            onLogin={() => setShowLogin(true)}
            onToggleTheme={() => setTheme('fun')}
        />
    );
};

const App = () => {
    return (
        <AuthProvider>
            <AppContent />
        </AuthProvider>
    );
};

export default App;
