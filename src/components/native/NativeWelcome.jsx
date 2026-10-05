import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, KeyboardAvoidingView, Platform, TouchableOpacity, Image, Dimensions } from 'react-native';
import { Heart, ArrowRight } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Button, Input } from './NativeUI';
import { useAuth } from '../../contexts/AuthContext';

const { width } = Dimensions.get('window');
const logoImg = require('../../../assets/logomount.png');
const scaladeImg = require('../../../assets/scalade.png');

// First screen of the app: brand hero + sign in / create account. Everyone
// signs in here before onboarding. Until auth providers are configured,
// "Continue" goes straight in with the data kept on this device.
const NativeWelcome = ({ onContinue }) => {
    const { t } = useTranslation();
    const { login, signup } = useAuth();
    const [isSignup, setIsSignup] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    // Shown inline: Alert.alert is a no-op on web.
    const [message, setMessage] = useState(null);

    const handleSubmit = async () => {
        if (!email || !password) {
            setMessage({ type: 'error', text: t('login.fillAll') });
            return;
        }
        if (isSignup && password.length < 6) {
            setMessage({ type: 'error', text: t('login.passwordTooShort') });
            return;
        }
        setLoading(true);
        setMessage(null);
        try {
            if (isSignup) {
                const { session } = await signup(email, password);
                // Projects with e-mail confirmation return no session until
                // the link in the e-mail is clicked.
                if (!session) {
                    setMessage({ type: 'info', text: t('login.confirmEmail') });
                    setIsSignup(false);
                }
            } else {
                await login(email, password);
            }
        } catch (error) {
            setMessage({ type: 'error', text: isSignup ? t('login.signupFailed') : t('login.loginFailed') });
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container} testID="welcome-screen">
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                    <View style={styles.logoRow}>
                        <Image source={logoImg} style={styles.logoImage} resizeMode="contain" />
                        <Text style={styles.brandName}>Mounjoy</Text>
                    </View>

                    <View style={styles.hero}>
                        <View style={styles.badge}>
                            <Heart size={14} color="#EF4444" fill="#EF4444" />
                            <Text style={styles.badgeText}>{t('landing.badge')}</Text>
                        </View>
                        <Text style={styles.heroTitle}>
                            {t('landing.heroBefore')}
                            <Text style={styles.highlight}>GLP-1</Text>
                            {t('landing.heroAfter')}
                        </Text>
                        <Text style={styles.heroSubtitle}>{t('landing.heroSubtitle')}</Text>
                        <Image source={scaladeImg} style={styles.heroImage} resizeMode="contain" />
                    </View>

                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>{isSignup ? t('login.signupTitle') : t('login.loginTitle')}</Text>
                        <Text style={styles.cardSubtitle}>{isSignup ? t('login.signupSubtitle') : t('login.loginSubtitle')}</Text>

                        <Input
                            label={t('login.email')}
                            placeholder={t('login.emailPlaceholder')}
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            testID="login-email-input"
                        />
                        <Input
                            label={t('login.password')}
                            placeholder="••••••••"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                            testID="login-password-input"
                        />

                        {message ? <Text style={[styles.message, message.type === 'error' && styles.messageError]}>{message.text}</Text> : null}

                        <Button onClick={handleSubmit} disabled={loading} style={styles.submitBtn} testID="login-submit-button">
                            {loading
                                ? (isSignup ? t('login.creatingAccount') : t('login.loggingIn'))
                                : (isSignup ? t('login.createAccount') : t('login.logIn'))}
                        </Button>

                        <View style={styles.switchRow}>
                            <Text style={styles.switchText}>{isSignup ? t('login.haveAccount') : t('login.noAccount')}</Text>
                            <TouchableOpacity onPress={() => { setIsSignup(!isSignup); setMessage(null); }} testID="login-toggle-mode">
                                <Text style={styles.switchLink}>{' '}{isSignup ? t('login.switchToLogin') : t('login.switchToSignup')}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={styles.dividerRow}>
                        <View style={styles.dividerLine} />
                        <Text style={styles.dividerText}>{t('welcome.or')}</Text>
                        <View style={styles.dividerLine} />
                    </View>

                    <TouchableOpacity onPress={onContinue} style={styles.continueBtn} activeOpacity={0.85} testID="welcome-continue-button">
                        <Text style={styles.continueText}>{t('welcome.continue')}</Text>
                        <ArrowRight size={18} color="#EA580C" />
                    </TouchableOpacity>
                    <Text style={styles.continueHint}>{t('welcome.continueHint')}</Text>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

export default NativeWelcome;

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FAF7F2' },
    scroll: { padding: 24, paddingBottom: 48 },
    logoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: Platform.OS === 'android' ? 20 : 0 },
    logoImage: { width: 36, height: 36 },
    brandName: { fontSize: 22, fontFamily: 'Outfit_700Bold', color: '#0F172A' },

    hero: { alignItems: 'center', paddingTop: 24 },
    badge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FFFFFF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: '#F1F5F9', marginBottom: 16 },
    badgeText: { fontSize: 10, fontFamily: 'Outfit_900Black', color: '#64748B', textTransform: 'uppercase', letterSpacing: 1 },
    heroTitle: { fontSize: 32, fontFamily: 'Outfit_900Black', color: '#093466', textAlign: 'center', lineHeight: 38, marginBottom: 12 },
    highlight: { color: '#EA580C' },
    heroSubtitle: { fontSize: 15, fontFamily: 'Outfit_600SemiBold', color: '#64748B', textAlign: 'center', lineHeight: 22, paddingHorizontal: 8 },
    heroImage: { width: Math.min(width - 48, 360), height: 190, marginTop: 12 },

    card: { backgroundColor: '#FFFFFF', borderRadius: 36, padding: 22, marginTop: 8, borderWidth: 1, borderColor: '#F1F5F9', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.04, shadowRadius: 15, elevation: 3 },
    cardTitle: { fontSize: 22, fontFamily: 'Outfit_900Black', color: '#0F172A' },
    cardSubtitle: { fontSize: 13, fontFamily: 'Outfit_600SemiBold', color: '#64748B', marginTop: 4, marginBottom: 18, lineHeight: 18 },
    submitBtn: { marginTop: 8, paddingVertical: 18 },
    message: { marginBottom: 4, textAlign: 'center', fontSize: 13, fontFamily: 'Outfit_600SemiBold', color: '#0F766E' },
    messageError: { color: '#EF4444' },
    switchRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 18 },
    switchText: { color: '#64748B', fontFamily: 'Outfit_600SemiBold' },
    switchLink: { color: '#EA580C', fontFamily: 'Outfit_700Bold' },

    dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 20 },
    dividerLine: { flex: 1, height: 1, backgroundColor: '#E2E8F0' },
    dividerText: { fontSize: 11, fontFamily: 'Outfit_900Black', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1 },
    continueBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 18, borderRadius: 20, backgroundColor: '#FFF7ED', borderWidth: 2, borderColor: '#FED7AA' },
    continueText: { fontSize: 16, fontFamily: 'Outfit_700Bold', color: '#EA580C' },
    continueHint: { fontSize: 11, fontFamily: 'Outfit_600SemiBold', color: '#94A3B8', textAlign: 'center', marginTop: 10, lineHeight: 15 },
});
