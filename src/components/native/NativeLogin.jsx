import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, KeyboardAvoidingView, Platform, TouchableOpacity, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { Button, Input } from './NativeUI';
import { useAuth } from '../../contexts/AuthContext';
import { ShieldCheck, ChevronLeft } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

// initialMode: 'login' | 'signup'
const NativeLogin = ({ onBack, initialMode = 'login' }) => {
    const { t } = useTranslation();
    const [isSignup, setIsSignup] = useState(initialMode === 'signup');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    // Shown inline: Alert.alert is a no-op on web.
    const [message, setMessage] = useState(null);
    const { login, signup } = useAuth();

    const toggleMode = () => {
        setIsSignup(!isSignup);
        setMessage(null);
    };

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
                // Supabase projects with e-mail confirmation return no session
                // until the link in the e-mail is clicked.
                if (!session) {
                    setMessage({ type: 'info', text: t('login.confirmEmail') });
                    setIsSignup(false);
                }
            } else {
                await login(email, password);
            }
        } catch (error) {
            setMessage({
                type: 'error',
                text: isSignup ? t('login.signupFailed') : t('login.loginFailed'),
            });
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <TouchableWithoutFeedback onPress={Platform.OS === 'web' ? undefined : Keyboard.dismiss} accessible={false}>
                <KeyboardAvoidingView 
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.content}
                >
                <TouchableOpacity onPress={onBack} style={styles.backBtn}>
                    <ChevronLeft size={24} color="#EA580C" />
                    <Text style={styles.backText}>{t('common.back')}</Text>
                </TouchableOpacity>

                <View style={styles.header}>
                    <View style={styles.iconBox}>
                        <ShieldCheck size={40} color="#EA580C" />
                    </View>
                    <Text style={styles.title}>{isSignup ? t('login.signupTitle') : t('login.loginTitle')}</Text>
                    <Text style={styles.subtitle}>
                        {isSignup ? t('login.signupSubtitle') : t('login.loginSubtitle')}
                    </Text>
                </View>

                <View style={styles.form}>
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

                    {message ? (
                        <Text style={[styles.message, message.type === 'error' && styles.messageError]}>{message.text}</Text>
                    ) : null}

                    <Button 
                        onClick={handleSubmit} 
                        disabled={loading}
                        style={styles.loginBtn}
                        testID="login-submit-button"
                    >
                        {loading
                            ? (isSignup ? t('login.creatingAccount') : t('login.loggingIn'))
                            : (isSignup ? t('login.createAccount') : t('login.logIn'))}
                    </Button>

                    {!isSignup ? (
                        <TouchableOpacity style={styles.forgotBtn}>
                            <Text style={styles.forgotText}>{t('login.forgotPassword')}</Text>
                        </TouchableOpacity>
                    ) : null}
                </View>

                <View style={styles.footer}>
                    <Text style={styles.footerText}>{isSignup ? t('login.haveAccount') : t('login.noAccount')}</Text>
                    <TouchableOpacity onPress={toggleMode} testID="login-toggle-mode">
                        <Text style={styles.signUpText}>{' '}{isSignup ? t('login.switchToLogin') : t('login.switchToSignup')}</Text>
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
            </TouchableWithoutFeedback>
        </SafeAreaView>
    );
};

export default NativeLogin;

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FAF7F2' },
    content: { flex: 1, padding: 24, justifyContent: 'center' },
    backBtn: { flexDirection: 'row', alignItems: 'center', position: 'absolute', top: 20, left: 24, gap: 4 },
    backText: { color: '#EA580C', fontFamily: 'Outfit_700Bold', fontSize: 14 },
    header: { alignItems: 'center', marginBottom: 40 },
    iconBox: { width: 80, height: 80, backgroundColor: '#FFF7ED', borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
    title: { fontSize: 28, fontFamily: 'Outfit_900Black', color: '#0F172A', marginBottom: 8 },
    subtitle: { fontSize: 16, fontFamily: 'Outfit_600SemiBold', color: '#64748B', textAlign: 'center', lineHeight: 22 },
    form: { width: '100%' },
    loginBtn: { marginTop: 12, paddingVertical: 18 },
    message: { marginTop: 4, marginBottom: 4, textAlign: 'center', fontSize: 13, fontFamily: 'Outfit_600SemiBold', color: '#0F766E' },
    messageError: { color: '#EF4444' },
    forgotBtn: { alignSelf: 'center', marginTop: 24 },
    forgotText: { color: '#94A3B8', fontSize: 14, fontFamily: 'Outfit_700Bold' },
    footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 40 },
    footerText: { color: '#64748B', fontFamily: 'Outfit_600SemiBold' },
    signUpText: { color: '#EA580C', fontFamily: 'Outfit_700Bold' }
});
