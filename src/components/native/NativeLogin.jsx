import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, KeyboardAvoidingView, Platform, Alert, TouchableOpacity } from 'react-native';
import { Button, Input } from './NativeUI';
import { useAuth } from '../../contexts/AuthContext';
import { ShieldCheck, ChevronLeft } from 'lucide-react-native';

const NativeLogin = ({ onBack }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert('Erro', 'Por favor, preencha todos os campos.');
            return;
        }

        setLoading(true);
        try {
            await login(email, password);
        } catch (error) {
            Alert.alert('Erro no Login', 'Verifique suas credenciais.');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView 
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.content}
            >
                <TouchableOpacity onPress={onBack} style={styles.backBtn}>
                    <ChevronLeft size={24} color="#64748B" />
                    <Text style={styles.backText}>Voltar</Text>
                </TouchableOpacity>

                <View style={styles.header}>
                    <View style={styles.iconBox}>
                        <ShieldCheck size={40} color="#14B8A6" />
                    </View>
                    <Text style={styles.title}>Bem-vindo de volta</Text>
                    <Text style={styles.subtitle}>Acesse sua conta para continuar sua jornada.</Text>
                </View>

                <View style={styles.form}>
                    <Input 
                        label="E-mail" 
                        placeholder="seu@email.com" 
                        value={email} 
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                    />
                    <Input 
                        label="Senha" 
                        placeholder="••••••••" 
                        value={password} 
                        onChangeText={setPassword}
                        secureTextEntry
                    />
                    
                    <Button 
                        onClick={handleLogin} 
                        disabled={loading}
                        style={styles.loginBtn}
                    >
                        {loading ? 'Entrando...' : 'Entrar na Conta'}
                    </Button>

                    <TouchableOpacity style={styles.forgotBtn}>
                        <Text style={styles.forgotText}>Esqueceu sua senha?</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.footer}>
                    <Text style={styles.footerText}>Ainda não tem conta?</Text>
                    <TouchableOpacity onPress={onBack}>
                        <Text style={styles.signUpText}> Criar Perfil</Text>
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

export default NativeLogin;

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FAF7F2' },
    content: { flex: 1, padding: 24, justifyContent: 'center' },
    backBtn: { flexDirection: 'row', alignItems: 'center', position: 'absolute', top: 20, left: 24, gap: 4 },
    backText: { color: '#64748B', fontWeight: 'bold' },
    header: { alignItems: 'center', marginBottom: 40 },
    iconBox: { width: 80, height: 80, backgroundColor: '#F0FDFA', borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
    title: { fontSize: 28, fontWeight: 'bold', color: '#0F172A', marginBottom: 8 },
    subtitle: { fontSize: 16, color: '#64748B', textAlign: 'center' },
    form: { width: '100%' },
    loginBtn: { marginTop: 12, paddingVertical: 18 },
    forgotBtn: { alignSelf: 'center', marginTop: 24 },
    forgotText: { color: '#94A3B8', fontSize: 14, fontWeight: '600' },
    footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 40 },
    footerText: { color: '#64748B' },
    signUpText: { color: '#14B8A6', fontWeight: 'bold' }
});
