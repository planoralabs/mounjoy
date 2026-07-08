import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView, Platform, ActivityIndicator, TouchableWithoutFeedback, Keyboard } from 'react-native';
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

const NativeMain = () => {
    const { currentUser, userData, logout } = useAuth();
    const [activeTab, setActiveTab] = useState('home');
    const [view, setView] = useState('landing');
    const [guestUser, setGuestUser] = useState(null);

    const user = userData || guestUser;

    const setUser = (newData) => {
        const updatedData = typeof newData === 'function' ? newData(user) : newData;
        if (currentUser) {
            userService.saveUserProfile(currentUser.uid, updatedData);
        } else {
            setGuestUser(updatedData);
        }
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
            settings: { proteinGoal: 100, waterGoal: 2.5, fiberGoal: 25 }
        };
        setGuestUser(newUser);
        setView('home');
    };

    useEffect(() => {
        if (currentUser) setView('home');
    }, [currentUser]);

    if (view === 'landing' && !currentUser) {
        return <NativeLandingPage onStart={() => setView('onboarding')} onLogin={() => setView('login')} />;
    }

    if (view === 'login' && !currentUser) {
        return <NativeLogin onBack={() => setView('landing')} />;
    }

    if (view === 'onboarding') {
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

    const renderContent = () => {
        switch (activeTab) {
            case 'home': return <NativeDashboard user={user} setUser={setUser} setActiveTab={setActiveTab} />;
            case 'logs': return <NativeLogs user={user} setUser={setUser} />;
            case 'calendar': return <NativeCalendar user={user} setUser={setUser} />;
            case 'stats': return <NativeEvolution user={user} />;
            case 'profile': return <NativeProfile user={user} setUser={setUser} onLogout={logout} />;
            default: return <NativeDashboard user={user} setUser={setUser} setActiveTab={setActiveTab} />;
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            {renderContent()}

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
