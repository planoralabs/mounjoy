import React from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, Platform, Dimensions, Image, TouchableOpacity } from 'react-native';
import { Button } from './NativeUI';
import { Heart, ArrowRight, ShieldCheck, Zap, Activity, Star } from 'lucide-react-native';

const { width } = Dimensions.get('window');

const logoImg = require('../../../assets/logomount.png');
const scaladeImg = require('../../../assets/scalade.png');
const mascotImg = require('../../../assets/mascot.png');
const mascotResultsImg = require('../../../assets/mascotresults.png');
const mascotZenImg = require('../../../assets/mascotzen.png');
const footerImg = require('../../../assets/footer.png');

const NativeLandingPage = ({ onStart, onLogin }) => {
    const brands = ['Mounjaro', 'Ozempic', 'Zepbound', 'Wegovy', 'Saxenda', 'Victoza', 'Trulicity', 'Rybelsus'];

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scroll}>
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.logoRow}>
                        <Image source={logoImg} style={styles.logoImage} resizeMode="contain" />
                        <Text style={styles.brandName}>Mounjoy</Text>
                    </View>
                    <TouchableOpacity onPress={onLogin} style={styles.loginBtn}>
                        <Text style={styles.loginBtnText}>Entrar</Text>
                    </TouchableOpacity>
                </View>

                {/* Hero */}
                <View style={styles.hero}>
                    <View style={styles.badge}>
                        <Heart size={14} color="#EF4444" fill="#EF4444" />
                        <Text style={styles.badgeText}>Sua Jornada Metabólica</Text>
                    </View>

                    <Text style={styles.heroTitle}>
                        Sua jornada{"\n"}
                        <Text style={styles.highlight}>GLP-1</Text> nunca foi{"\n"}
                        tão leve! 🎈
                    </Text>

                    <Text style={styles.heroSubtitle}>
                        O aliado perfeito para sua jornada com Mounjaro, Ozempic ou qualquer outro protocolo de emagrecimento.
                    </Text>

                    <Button onClick={onStart} style={styles.ctaBtn} textStyle={styles.ctaBtnText}>
                        Começar grátis hoje! <ArrowRight size={20} color="#fff" />
                    </Button>

                    <Image source={scaladeImg} style={styles.heroImage} resizeMode="contain" />
                </View>

                {/* Features Blue Box Container */}
                <View style={styles.blueBoxSection}>
                    <View style={styles.blueBox}>
                        <Text style={styles.blueBoxTitle}>Funcionalidades</Text>
                        
                        {/* Card 1: Controle Total */}
                        <View style={styles.nativeCard}>
                            <Text style={styles.nativeCardTitle}>Controle Total</Text>
                            <Text style={styles.nativeCardText}>Nunca perca o dia da picada. Avisamos tudo sobre suas canetas e doses.</Text>
                            <View style={styles.cardMascotContainer}>
                                <Image source={mascotImg} style={styles.cardMascot} resizeMode="contain" />
                            </View>
                        </View>

                        {/* Card 2: Veja sua Evolução */}
                        <View style={styles.nativeCard}>
                            <Text style={styles.nativeCardTitle}>Veja sua Evolução</Text>
                            <Text style={styles.nativeCardText}>Compare seu "antes e depois" e compartilhe seu progresso!</Text>
                            <View style={styles.cardMascotContainer}>
                                <Image source={mascotResultsImg} style={styles.cardMascot} resizeMode="contain" />
                            </View>
                        </View>

                        {/* Card 3: Mantenha-se Saudável */}
                        <View style={styles.nativeCard}>
                            <Text style={styles.nativeCardTitle}>Mantenha-se Saudável</Text>
                            <Text style={styles.nativeCardText}>Dicas de hidratação e proteínas para você se sentir bem todos os dias.</Text>
                            <View style={styles.cardMascotContainer}>
                                <Image source={mascotZenImg} style={styles.cardMascot} resizeMode="contain" />
                            </View>
                        </View>
                    </View>
                </View>

                {/* Compatible Protocols Ticker Scroll */}
                <View style={styles.tickerSection}>
                    <Text style={styles.tickerSectionTitle}>Compatibilidade total</Text>
                    <Text style={styles.tickerSectionSubtitle}>Funciona com todos os protocolos</Text>
                    
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tickerScroll}>
                        {brands.map((brand, i) => (
                            <View key={i} style={styles.tickerBadge}>
                                <Text style={styles.tickerText}>{brand}</Text>
                            </View>
                        ))}
                    </ScrollView>
                </View>

                {/* Testimonial Section */}
                <View style={styles.testimonialSection}>
                    <View style={styles.avatarBorder}>
                        <View style={styles.avatarPlaceholder}>
                            <Text style={styles.avatarEmoji}>🤩</Text>
                        </View>
                    </View>
                    <View style={styles.testimonialBubble}>
                        <Text style={styles.testimonialText}>
                            "Com o Mounjoy sinto que tenho o controle total da minha jornada. O app transformou o acompanhamento do meu tratamento em algo leve e até prazeroso de fazer todos os dias."
                        </Text>
                    </View>
                </View>

                {/* Ready to start CTA Footer */}
                <View style={styles.ctaFooter}>
                    <View style={styles.ctaFooterCard}>
                        <Text style={styles.ctaFooterTitle}>Pronto para entrar nessa jornada?</Text>
                        <Text style={styles.ctaFooterSubtitle}>Baixe o Mounjoy agora e comece a se sentir incrível.</Text>
                        <Button
                            onClick={onStart}
                            style={styles.ctaFooterBtn}
                            textStyle={styles.ctaFooterBtnText}
                        >
                            Quero meu Mounjoy!
                        </Button>
                        <View style={styles.ctaFooterMascotContainer}>
                            <Image source={footerImg} style={styles.ctaFooterMascot} resizeMode="contain" />
                        </View>
                    </View>
                </View>

                {/* Playful Footer */}
                <View style={styles.footer}>
                    <Image source={logoImg} style={styles.footerLogo} resizeMode="contain" />
                    <Text style={styles.footerText}>
                        © 2026 Mounjoy. Feito com ❤️ e muita diversão.
                    </Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

export default NativeLandingPage;

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FAF7F2' },
    scroll: { paddingBottom: 60 },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingVertical: 16,
    },
    logoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    logoImage: {
        width: 36,
        height: 36,
    },
    brandName: { fontSize: 22, fontFamily: 'Outfit_700Bold', color: '#0F172A' },
    loginBtn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 12, backgroundColor: 'transparent' },
    loginBtnText: { fontSize: 14, fontFamily: 'Outfit_700Bold', color: '#64748B', textTransform: 'uppercase', letterSpacing: 1 },

    hero: { paddingHorizontal: 24, paddingVertical: 20, alignItems: 'center' },
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
        marginBottom: 20,
    },
    badgeText: { fontSize: 10, fontFamily: 'Outfit_900Black', color: '#64748B', textTransform: 'uppercase', letterSpacing: 1 },
    heroTitle: {
        fontSize: 36,
        fontFamily: 'Outfit_900Black',
        color: '#093466',
        textAlign: 'center',
        lineHeight: 42,
        marginBottom: 16,
    },
    highlight: { color: '#EA580C' },
    heroSubtitle: {
        fontSize: 16,
        fontFamily: 'Outfit_600SemiBold',
        color: '#64748B',
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 30,
        paddingHorizontal: 10,
    },
    heroImage: {
        width: width - 48,
        height: 260,
        marginTop: 30,
    },
    ctaBtn: { width: '100%', paddingVertical: 20, backgroundColor: '#EA580C', shadowColor: '#EA580C', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 20, elevation: 8 },
    ctaBtnText: { fontSize: 18, fontFamily: 'Outfit_700Bold' },

    // Blue Box
    blueBoxSection: { paddingHorizontal: 16, marginVertical: 32 },
    blueBox: {
        backgroundColor: '#093466',
        borderRadius: 40,
        paddingVertical: 32,
        paddingHorizontal: 16,
        alignItems: 'center',
    },
    blueBoxTitle: { fontSize: 12, fontFamily: 'Outfit_900Black', color: '#FFF', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 24, opacity: 0.8 },
    nativeCard: {
        backgroundColor: '#FFFFFF',
        width: '100%',
        padding: 24,
        borderRadius: 32,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    nativeCardTitle: { fontSize: 20, fontFamily: 'Outfit_700Bold', color: '#0F172A', marginBottom: 8 },
    nativeCardText: { fontSize: 13, fontFamily: 'Outfit_600SemiBold', color: '#64748B', lineHeight: 18, marginBottom: 16 },
    cardMascotContainer: {
        backgroundColor: '#F8FAFC',
        height: 180,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    cardMascot: {
        width: 140,
        height: 140,
    },

    // Ticker
    tickerSection: { backgroundColor: '#EA580C', paddingVertical: 32, marginVertical: 20, alignItems: 'center' },
    tickerSectionTitle: { fontSize: 10, fontFamily: 'Outfit_900Black', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 6 },
    tickerSectionSubtitle: { fontSize: 18, fontFamily: 'Outfit_700Bold', color: '#FFFFFF', marginBottom: 20 },
    tickerScroll: { paddingHorizontal: 16, gap: 12 },
    tickerBadge: {
        backgroundColor: 'rgba(255,255,255,0.15)',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    tickerText: { fontSize: 16, fontFamily: 'Outfit_900Black', color: '#FFFFFF', fontStyle: 'italic' },

    // Testimonial
    testimonialSection: { paddingHorizontal: 24, py: 40, alignItems: 'center', gap: 16, marginVertical: 32 },
    avatarBorder: {
        width: 80,
        height: 80,
        borderRadius: 40,
        borderWidth: 4,
        borderColor: '#FDBA74',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FFF7ED',
    },
    avatarPlaceholder: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
    avatarEmoji: { fontSize: 36 },
    testimonialBubble: {
        backgroundColor: '#FDBA74',
        borderRadius: 32,
        padding: 24,
        width: '100%',
    },
    testimonialText: { fontSize: 15, fontFamily: 'Outfit_700Bold', color: '#FFFFFF', fontStyle: 'italic', lineHeight: 22, textAlign: 'center' },

    // CTA Footer
    ctaFooter: { paddingHorizontal: 16, marginVertical: 20 },
    ctaFooterCard: {
        backgroundColor: '#093466',
        borderRadius: 40,
        padding: 24,
        alignItems: 'center',
        overflow: 'hidden',
    },
    ctaFooterTitle: { fontSize: 26, fontFamily: 'Outfit_900Black', color: '#FFFFFF', textAlign: 'center', marginBottom: 12 },
    ctaFooterSubtitle: { fontSize: 15, fontFamily: 'Outfit_600SemiBold', color: 'rgba(255,255,255,0.8)', textAlign: 'center', marginBottom: 24 },
    ctaFooterBtn: { width: '100%', paddingVertical: 16, backgroundColor: '#EA580C' },
    ctaFooterBtnText: { fontSize: 16, fontFamily: 'Outfit_700Bold' },
    ctaFooterMascotContainer: {
        marginTop: 20,
        width: '100%',
        height: 180,
        alignItems: 'center',
        justifyContent: 'center',
    },
    ctaFooterMascot: {
        width: 200,
        height: 200,
    },

    // Footer
    footer: { paddingVertical: 40, alignItems: 'center', gap: 16 },
    footerLogo: { width: 36, height: 36, opacity: 0.3 },
    footerText: { color: '#94A3B8', fontSize: 11, fontFamily: 'Outfit_700Bold', textTransform: 'uppercase', letterSpacing: 1 }
});
