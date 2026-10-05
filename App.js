import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView, Platform, ActivityIndicator, AppState } from 'react-native';
import { useTranslation } from 'react-i18next';
import { syncWithDeviceLocale } from './src/i18n';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { Home, BookOpen, Plus, TrendingUp, User } from 'lucide-react-native';
import { useFonts, Outfit_400Regular, Outfit_600SemiBold, Outfit_700Bold, Outfit_900Black } from '@expo-google-fonts/outfit';

import { userService } from './src/services/userService';

import NativeWelcome from './src/components/native/NativeWelcome';
import NativeOnboarding from './src/components/native/NativeOnboarding';
import NativeToday from './src/components/native/NativeToday';
import NativeJournal from './src/components/native/NativeJournal';
import NativeProgress from './src/components/native/NativeProgress';
import NativeProfile from './src/components/native/NativeProfile';
import NativeMealScan, { useMealScan, MealScanBanner } from './src/components/native/NativeMealScan';
import NativeLogCenter, { useLog } from './src/components/native/NativeLogCenter';

// Until sign-in providers are configured, "Continue" on the welcome screen
// keeps the user's data on this device only (AsyncStorage; localStorage on
// web) under this key. Signing in to an account that has no profile yet
// uploads this local data (see the migration effect below).
const LOCAL_STORAGE_KEY = 'mounjoy_guest_user';

const TABS = [
    { id: 'today', icon: Home, label: 'tabs.today' },
    { id: 'journal', icon: BookOpen, label: 'tabs.journal' },
    { id: 'add' },
    { id: 'progress', icon: TrendingUp, label: 'tabs.progress' },
    { id: 'profile', icon: User, label: 'tabs.profile' },
];

const TabBar = ({ activeTab, onSelect }) => {
    const { t } = useTranslation();
    const { openLog } = useLog();
    return (
        <View style={styles.tabBar}>
            {TABS.map((tab) => {
                if (tab.id === 'add') {
                    return (
                        <TouchableOpacity key="add" style={styles.tabItem} onPress={() => openLog('menu')} activeOpacity={0.85} testID="tab-add-button">
                            <View style={styles.fab}>
                                <Plus color="#FFFFFF" size={26} strokeWidth={3} />
                            </View>
                        </TouchableOpacity>
                    );
                }
                const active = activeTab === tab.id;
                const Icon = tab.icon;
                return (
                    <TouchableOpacity key={tab.id} style={styles.tabItem} onPress={() => onSelect(tab.id)} testID={`tab-${tab.id}`}>
                        <Icon color={active ? '#EA580C' : '#94A3B8'} size={22} />
                        <Text style={[styles.tabText, active && styles.tabTextActive]}>{t(tab.label)}</Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
};

const NativeMain = () => {
    const { t } = useTranslation();
    const { currentUser, userData, profileReady, logout } = useAuth();
    const [activeTab, setActiveTab] = useState('today');
    const [view, setView] = useState('welcome'); // 'welcome' | 'onboarding' | 'app'
    const [localUser, setLocalUserState] = useState(null);
    const [localLoaded, setLocalLoaded] = useState(false);
    const migratingRef = useRef(false);

    const setLocalUser = (data) => {
        setLocalUserState(data);
        const write = data
            ? AsyncStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data))
            : AsyncStorage.removeItem(LOCAL_STORAGE_KEY);
        write.catch((e) => console.error('Local storage failed:', e));
    };

    useEffect(() => {
        AsyncStorage.getItem(LOCAL_STORAGE_KEY)
            .then((saved) => {
                if (saved) {
                    setLocalUserState(JSON.parse(saved));
                    setView('app');
                }
            })
            .catch((e) => console.error('Local storage read failed:', e))
            .finally(() => setLocalLoaded(true));
    }, []);

    // Signing in to an account with no profile yet: the data kept on this
    // device becomes the cloud profile.
    useEffect(() => {
        if (!currentUser || !profileReady || userData || !localUser || migratingRef.current) return;
        migratingRef.current = true;
        userService.saveUserProfile(currentUser.uid, {
            ...localUser,
            uid: currentUser.uid,
            email: currentUser.email || localUser.email || '',
            photoURL: localUser.photoURL || '',
        })
            .then(() => setLocalUser(null))
            .catch((e) => console.error('Local data migration failed:', e))
            .finally(() => { migratingRef.current = false; });
    }, [currentUser, profileReady, userData, localUser]);

    useEffect(() => {
        if (currentUser) setView('app');
    }, [currentUser]);

    const user = currentUser ? (userData || localUser) : localUser;
    // Signed in, profile fetched, nothing in the cloud and nothing to migrate:
    // a brand-new account that still needs onboarding.
    const needsOnboarding = !!currentUser && profileReady && !userData && !localUser;

    const setUser = (newData) => {
        const updatedData = typeof newData === 'function' ? newData(user) : newData;
        if (currentUser) {
            userService.saveUserProfile(currentUser.uid, updatedData);
        } else {
            setLocalUser(updatedData);
        }
    };

    // Meal photo analysis keeps running while its screen is minimized.
    const mealScan = useMealScan({ user, setUser });

    const handleContinue = () => setView(localUser ? 'app' : 'onboarding');

    const handleLogout = async () => {
        // Leaving the local session keeps its data on the device, so
        // "Continue" picks it back up. Only deleting the account erases it.
        if (currentUser) await logout();
        setActiveTab('today');
        setView('welcome');
    };

    const handleDeleteAccount = async () => {
        if (currentUser) {
            await logout();
        } else {
            setLocalUser(null);
        }
        setActiveTab('today');
        setView('welcome');
    };

    const handleOnboardingComplete = (data) => {
        const now = new Date().toISOString();
        const startWeight = parseFloat(data.startWeight);
        const newUser = {
            ...data,
            currentWeight: startWeight,
            history: [startWeight],
            startDate: now,
            lastWeightDate: now,
            doseHistory: [{
                date: now,
                dose: data.currentDose,
                medication: data.medicationId,
                site: 'not_recorded'
            }],
            measurements: [{ date: now, weight: startWeight }],
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
            setLocalUser(newUser);
        }
        setActiveTab('today');
        setView('app');
    };

    if (!localLoaded) {
        return (
            <View style={styles.center}>
                <ActivityIndicator color="#EA580C" size="large" />
            </View>
        );
    }

    if (view === 'welcome' && !currentUser) {
        return <NativeWelcome onContinue={handleContinue} />;
    }

    if ((view === 'onboarding' && !currentUser) || needsOnboarding) {
        return <NativeOnboarding onComplete={handleOnboardingComplete} />;
    }

    if (!user) {
        return (
            <View style={styles.center}>
                <ActivityIndicator color="#EA580C" size="large" />
                <Text style={{ marginTop: 12, color: '#64748B' }}>{t('app.loadingProfile')}</Text>
            </View>
        );
    }

    const renderContent = () => {
        switch (activeTab) {
            case 'journal': return <NativeJournal user={user} />;
            case 'progress': return <NativeProgress user={user} setUser={setUser} />;
            case 'profile': return <NativeProfile user={user} setUser={setUser} onLogout={handleLogout} onDeleteAccount={handleDeleteAccount} />;
            default: return <NativeToday user={user} setUser={setUser} setActiveTab={setActiveTab} />;
        }
    };

    return (
        <SafeAreaView style={styles.container} testID="main-app-screen">
            <NativeLogCenter user={user} setUser={setUser} onScanMeal={mealScan.open}>
                {mealScan.visible ? (
                    <NativeMealScan user={user} scan={mealScan} />
                ) : (
                    <>
                        {renderContent()}
                        <MealScanBanner scan={mealScan} />
                        <TabBar activeTab={activeTab} onSelect={setActiveTab} />
                    </>
                )}
            </NativeLogCenter>
        </SafeAreaView>
    );
};

export default function App() {
    // Language / region can change while the app is in the background (system
    // Settings, or the per-app language on iOS and Android 13+): re-read it
    // whenever the app comes back to the foreground.
    useEffect(() => {
        const sub = AppState.addEventListener('change', (state) => {
            if (state === 'active') syncWithDeviceLocale();
        });
        return () => sub.remove();
    }, []);

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
        paddingHorizontal: 6,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        elevation: 10,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 20,
    },
    tabItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    fab: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#EA580C',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: -30,
        borderWidth: 4,
        borderColor: '#FAF7F2',
        shadowColor: '#EA580C',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 10,
        elevation: 8,
    },
    tabText: { fontSize: 10, fontFamily: 'Outfit_700Bold', color: '#94A3B8', marginTop: 4 },
    tabTextActive: { color: '#EA580C' }
});
