import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView, Platform, ActivityIndicator, TouchableWithoutFeedback, Keyboard } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { Home, BarChart3, Settings, CalendarDays, PenLine } from 'lucide-react-native';
import { useFonts, Outfit_400Regular, Outfit_600SemiBold, Outfit_700Bold, Outfit_900Black } from '@expo-google-fonts/outfit';

import { userService } from './src/services/userService';

import NativeLandingPage from './src/components/native/NativeLandingPage';
import NativeOnboarding from './src/components/native/NativeOnboarding';
import NativeLogin from './src/components/native/NativeLogin';
import NativeDashboard from './src/components/native/NativeDashboard';
import NativeCalendar from './src/components/native/NativeCalendar';
import NativeEvolution from './src/components/native/NativeEvolution';
import NativeProfile from './src/components/native/NativeProfile';
import NativeLogs from './src/components/native/NativeLogs';
import NativeMealScan from './src/components/native/NativeMealScan';

// Guest (not logged in) data lives only on the device until the user creates
// an account. AsyncStorage maps to localStorage on web, under this same key.
const GUEST_STORAGE_KEY = 'mounjoy_guest_user';

const NativeMain = () => {
    const { currentUser, userData, profileReady, logout } = useAuth();
    const [activeTab, setActiveTab] = useState('home');
    const [view, setView] = useState('landing');
    const [guestUser, setGuestUserState] = useState(null);
    const [guestLoaded, setGuestLoaded] = useState(false);
    const migratingRef = useRef(false);

    const setGuestUser = (data) => {
        setGuestUserState(data);
        const write = data
            ? AsyncStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(data))
            : AsyncStorage.removeItem(GUEST_STORAGE_KEY);
        write.catch((e) => console.error('Guest storage failed:', e));
    };

    useEffect(() => {
        AsyncStorage.getItem(GUEST_STORAGE_KEY)
            .then((saved) => {
                if (saved) {
                    setGuestUserState(JSON.parse(saved));
                    setView('home');
                }
            })
            .catch((e) => console.error('Guest storage read failed:', e))
            .finally(() => setGuestLoaded(true));
    }, []);

    // Migration bridge: when a guest creates an account (or logs into one that
    // has no profile yet), their on-device data becomes the cloud profile.
    useEffect(() => {
        if (!currentUser || !profileReady || userData || !guestUser || migratingRef.current) return;
        migratingRef.current = true;
        userService.saveUserProfile(currentUser.uid, {
            ...guestUser,
            uid: currentUser.uid,
            email: currentUser.email || guestUser.email || '',
            photoURL: guestUser.photoURL || '',
        })
            .then(() => setGuestUser(null))
            .catch((e) => console.error('Guest migration failed:', e))
            .finally(() => { migratingRef.current = false; });
    }, [currentUser, profileReady, userData, guestUser]);

    const user = userData || guestUser;
    // Logged in, profile fetched, nothing in the cloud and nothing to migrate:
    // a brand-new account that still needs to go through onboarding.
    const needsOnboarding = !!currentUser && profileReady && !userData && !guestUser;

    const setUser = (newData) => {
        const updatedData = typeof newData === 'function' ? newData(user) : newData;
        if (currentUser) {
            userService.saveUserProfile(currentUser.uid, updatedData);
        } else {
            setGuestUser(updatedData);
        }
    };

    const handleLogout = async () => {
        if (currentUser) {
            await logout();
        } else {
            setGuestUser(null);
        }
        setActiveTab('home');
        setView('landing');
    };

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
            measurements: [{ date: now, weight: parseFloat(data.startWeight) }],
            sideEffectsLogs: [],
            dailyIntakeHistory: {},
            settings: { proteinGoal: 100, waterGoal: 2.5, fiberGoal: 25, unitSystem: data.unitSystem || 'metric' }
        };
        if (currentUser) {
            userService.saveUserProfile(currentUser.uid, {
                ...newUser,
                uid: currentUser.uid,
                email: currentUser.email || '',
            });
        } else {
            setGuestUser(newUser);
        }
        setView('home');
    };

    useEffect(() => {
        if (currentUser) setView('home');
    }, [currentUser]);

    if (!guestLoaded) {
        return (
            <View style={styles.center}>
                <ActivityIndicator color="#EA580C" size="large" />
            </View>
        );
    }

    if (view === 'landing' && !currentUser) {
        return <NativeLandingPage onStart={() => setView('onboarding')} onLogin={() => setView('login')} />;
    }

    if ((view === 'login' || view === 'signup') && !currentUser) {
        // Came from the landing page → back goes there; came from the guest
        // "create account" prompt → back returns to the app.
        return (
            <NativeLogin
                initialMode={view}
                onBack={() => setView(guestUser ? 'home' : 'landing')}
            />
        );
    }

    if (view === 'onboarding' || needsOnboarding) {
        return <NativeOnboarding onComplete={handleOnboardingComplete} />;
    }

    if (!user) {
        return (
            <View style={styles.center}>
                <ActivityIndicator color="#EA580C" size="large" />
                <Text style={{ marginTop: 12, color: '#64748B' }}>Carregando perfil...</Text>
            </View>
        );
    }

    // Only guests get the "create account and save" prompt.
    const guestPrompt = currentUser ? null : () => setView('signup');

    const renderContent = () => {
        switch (activeTab) {
            case 'home': return <NativeDashboard user={user} setUser={setUser} setActiveTab={setActiveTab} onCreateAccount={guestPrompt} />;
            case 'mealScan': return <NativeMealScan user={user} setUser={setUser} onClose={() => setActiveTab('home')} />;
            case 'logs': return <NativeLogs user={user} setUser={setUser} />;
            case 'calendar': return <NativeCalendar user={user} setUser={setUser} />;
            case 'stats': return <NativeEvolution user={user} />;
            case 'profile': return <NativeProfile user={user} setUser={setUser} onLogout={handleLogout} />;
            default: return <NativeDashboard user={user} setUser={setUser} setActiveTab={setActiveTab} onCreateAccount={guestPrompt} />;
        }
    };

    return (
        <SafeAreaView style={styles.container} testID="main-app-screen">
            {renderContent()}

            {activeTab !== 'mealScan' && (
            <View style={styles.tabBar}>
                <TouchableOpacity style={styles.tabItem} onPress={() => setActiveTab('home')}>
                    <Home color={activeTab === 'home' ? '#EA580C' : '#94A3B8'} size={22} />
                    <Text style={[styles.tabText, activeTab === 'home' && styles.tabTextActive]}>Home</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.tabItem} onPress={() => setActiveTab('logs')}>
                    <PenLine color={activeTab === 'logs' ? '#EA580C' : '#94A3B8'} size={22} />
                    <Text style={[styles.tabText, activeTab === 'logs' && styles.tabTextActive]}>Diário</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.tabItem} onPress={() => setActiveTab('calendar')}>
                    <CalendarDays color={activeTab === 'calendar' ? '#EA580C' : '#94A3B8'} size={22} />
                    <Text style={[styles.tabText, activeTab === 'calendar' && styles.tabTextActive]}>Agenda</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.tabItem} onPress={() => setActiveTab('stats')}>
                    <BarChart3 color={activeTab === 'stats' ? '#EA580C' : '#94A3B8'} size={22} />
                    <Text style={[styles.tabText, activeTab === 'stats' && styles.tabTextActive]}>Dados</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.tabItem} onPress={() => setActiveTab('profile')}>
                    <Settings color={activeTab === 'profile' ? '#EA580C' : '#94A3B8'} size={22} />
                    <Text style={[styles.tabText, activeTab === 'profile' && styles.tabTextActive]}>Perfil</Text>
                </TouchableOpacity>
            </View>
            )}
        </SafeAreaView>
    );
};

export default function App() {
    const [fontsLoaded] = useFonts({
        Outfit_400Regular,
        Outfit_600SemiBold,
        Outfit_700Bold,
        Outfit_900Black,
    });

    if (!fontsLoaded) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FAF7F2' }}>
                <ActivityIndicator color="#EA580C" size="large" />
            </View>
        );
    }

    return (
        <AuthProvider>
            <NativeMain />
        </AuthProvider>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FAF7F2' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FAF7F2', padding: 20 },
    tabBar: {
        position: 'absolute',
        bottom: Platform.OS === 'ios' ? 32 : 24,
        left: 16,
        right: 16,
        height: 70,
        backgroundColor: '#FFFFFF',
        borderRadius: 35,
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#F1F5F9',
        elevation: 10,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 20,
    },
    tabItem: { alignItems: 'center', justifyContent: 'center' },
    tabText: { fontSize: 10, fontFamily: 'Outfit_700Bold', color: '#94A3B8', marginTop: 4 },
    tabTextActive: { color: '#EA580C' }
});
