import React from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, Platform, Dimensions, Image } from 'react-native';
import { Button } from './NativeUI';
import { Heart, ArrowRight, ShieldCheck, Zap, Activity, Info, CheckCircle2 } from 'lucide-react-native';

const { width } = Dimensions.get('window');

const FeatureCard = ({ icon: Icon, color, bg, title, message }) => (
    <View style={styles.featureCard}>
        <View style={[styles.iconBox, { backgroundColor: bg }]}>
            <Icon size={24} color={color} />
        </View>
        <Text style={styles.featureTitle}>{title}</Text>
        <Text style={styles.featureText}>{message}</Text>
    </View>
);

const NativeLandingPage = ({ onStart, onLogin }) => {
    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scroll}>
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.logoRow}>
                        <View style={styles.logoBox}><Text style={styles.logoText}>M</Text></View>
                        <Text style={styles.brandName}>Mounjoy</Text>
                    </View>
                    <Button 
                        variant="secondary" 
                        onClick={onLogin}
                        style={styles.loginBtn}
                        textStyle={styles.loginBtnText}
                    >
                        Entrar
                    </Button>
                </View>

                {/* Hero */}
                <View style={styles.hero}>
                    <View style={styles.badge}>
                        <Heart size={14} color="#EF4444" />
                        <Text style={styles.badgeText}>Sua Jornada Metabólica</Text>
                    </View>

                    <Text style={styles.heroTitle}>
                        Bem-estar Premium para sua <Text style={styles.highlight}>evolução.</Text>
                    </Text>

                    <Text style={styles.heroSubtitle}>
                        O suporte clinicamente orientado para emagrecimento com segurança e suporte profissional.
                    </Text>

                    <Button onClick={onStart} style={styles.ctaBtn} textStyle={styles.ctaBtnText}>
                        Começar meu Protocolo <ArrowRight size={20} color="#fff" />
                    </Button>
                </View>

                {/* Features */}
                <View style={styles.featuresSection}>
                    <Text style={styles.sectionTitle}>Ciência em cada detalhe</Text>
                    <View style={styles.featureUnderline} />
                    
                    <FeatureCard 
                        icon={ShieldCheck}
                        color="#EF4444"
                        bg="#FEF2F2"
                        title="Guarda-Costas de Saúde"
                        message="Monitoramos seu emagrecimento para prevenir perda muscular e o efeito platô."
                    />

                    <FeatureCard 
                        icon={Zap}
                        color="#14B8A6"
                        bg="#F0FDFA"
                        title="Gestão de Ciclo"
                        message="O Mounjoy conhece as dosagens reais e te avisa exatamente quando é sua próxima dose."
                    />

                    <FeatureCard 
                        icon={Activity}
                        color="#3B82F6"
                        bg="#EFF6FF"
                        title="Hábitos que Importam"
                        message="Cálculo dinâmico de hidratação e proteína para proteger seus rins e fígado."
                    />
                </View>

                {/* Footer simple */}
                <View style={styles.footer}>
                    <Text style={styles.footerText}>© 2026 Mounjoy. Premium Welfare.</Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

export default NativeLandingPage;

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FAF7F2' },
    scroll: { paddingBottom: 100 },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingVertical: 16,
    },
    logoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    logoBox: {
        width: 32,
        height: 32,
        backgroundColor: '#14B8A6',
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    logoText: { color: '#fff', fontWeight: 'bold', fontSize: 18 },
    brandName: { fontSize: 20, fontWeight: 'bold', color: '#0F172A' },
    loginBtn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 12 },
    loginBtnText: { fontSize: 14 },

    hero: { paddingHorizontal: 24, paddingVertical: 40, alignItems: 'center' },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        marginBottom: 24,
    },
    badgeText: { fontSize: 10, fontWeight: '900', color: '#64748B', textTransform: 'uppercase', letterSpacing: 1 },
    heroTitle: {
        fontSize: 34,
        fontWeight: '900',
        color: '#0F172A',
        textAlign: 'center',
        lineHeight: 40,
        marginBottom: 20,
    },
    highlight: { color: '#14B8A6' },
    heroSubtitle: {
        fontSize: 16,
        color: '#64748B',
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 40,
        paddingHorizontal: 10,
    },
    ctaBtn: { width: '100%', paddingVertical: 20 },
    ctaBtnText: { fontSize: 18 },

    featuresSection: { paddingHorizontal: 24, paddingVertical: 40 },
    sectionTitle: { fontSize: 24, fontWeight: 'bold', color: '#1E293B', textAlign: 'center' },
    featureUnderline: { width: 40, height: 4, backgroundColor: '#14B8A6', borderRadius: 2, alignSelf: 'center', marginTop: 8, marginBottom: 40 },
    featureCard: {
        backgroundColor: '#FFFFFF',
        padding: 24,
        borderRadius: 32,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    iconBox: { width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
    featureTitle: { fontSize: 18, fontWeight: 'bold', color: '#0F172A', marginBottom: 12 },
    featureText: { fontSize: 14, color: '#64748B', lineHeight: 22 },

    footer: { padding: 40, alignItems: 'center' },
    footerText: { color: '#94A3B8', fontSize: 12, fontWeight: '500' }
});
