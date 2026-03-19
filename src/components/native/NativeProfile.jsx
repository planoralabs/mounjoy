import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Platform, Image } from 'react-native';
import { User, Settings, Shield, Bell, HelpCircle, LogOut, ChevronRight, Calculator } from 'lucide-react-native';
import { Button } from './NativeUI';

const NativeProfile = ({ user, onLogout }) => {
    const MenuItem = ({ icon: Icon, label, subLabel, onPress, color = "#64748B" }) => (
        <TouchableOpacity onPress={onPress} style={styles.menuItem}>
            <View style={[styles.menuIcon, { backgroundColor: color + '15' }]}>
                <Icon size={20} color={color} />
            </View>
            <View style={styles.menuText}>
                <Text style={styles.menuLabel}>{label}</Text>
                {subLabel && <Text style={styles.menuSubLabel}>{subLabel}</Text>}
            </View>
            <ChevronRight size={18} color="#CBD5E1" />
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scroll}>
                <View style={styles.profileHeader}>
                    <View style={styles.avatarLarge}>
                        <Text style={styles.avatarTextLarge}>{user.name?.charAt(0) || '?'}</Text>
                    </View>
                    <Text style={styles.profileName}>{user.name || 'Usuário'}</Text>
                    <Text style={styles.profileMeta}>{user.email || 'Modo Visitante'}</Text>
                    <View style={styles.badge}>
                        <Text style={styles.badgeText}>Membro Ativo</Text>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Conta</Text>
                    <View style={styles.card}>
                        <MenuItem icon={User} label="Editar Perfil" subLabel="Dados pessoais, altura, peso inicial" onPress={() => {}} color="#14B8A6" />
                        <MenuItem icon={Calculator} label="Protocolo" subLabel="Medicamento, dose, frequência" onPress={() => {}} color="#3B82F6" />
                        <MenuItem icon={Bell} label="Notificações" subLabel="Lembretes de dose e pesagem" onPress={() => {}} color="#F59E0B" />
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Aplicativo</Text>
                    <View style={styles.card}>
                        <MenuItem icon={Shield} label="Privacidade" onPress={() => {}} />
                        <MenuItem icon={HelpCircle} label="Ajuda & Suporte" onPress={() => {}} />
                        <MenuItem icon={Settings} label="Avançado" onPress={() => {}} />
                    </View>
                </View>

                <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
                    <LogOut size={20} color="#EF4444" />
                    <Text style={styles.logoutText}>Sair da Conta</Text>
                </TouchableOpacity>

                <Text style={styles.versionText}>Mounjoy Nativo v1.0.0</Text>
            </ScrollView>
        </SafeAreaView>
    );
};

export default NativeProfile;

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FAF7F2' },
    scroll: { padding: 24, paddingBottom: 110 },
    profileHeader: { alignItems: 'center', marginBottom: 32, marginTop: Platform.OS === 'android' ? 20 : 0 },
    avatarLarge: { width: 100, height: 100, borderRadius: 40, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E2E8F0', justifyContent: 'center', alignItems: 'center', elevation: 4 },
    avatarTextLarge: { fontSize: 40, fontWeight: 'bold', color: '#14B8A6' },
    profileName: { fontSize: 24, fontWeight: 'bold', color: '#0F172A', marginTop: 16 },
    profileMeta: { fontSize: 14, color: '#94A3B8', marginTop: 4 },
    badge: { backgroundColor: '#F0FDFA', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 100, borderWeight: 1, borderColor: '#CCFBF1', marginTop: 12 },
    badgeText: { fontSize: 10, fontWeight: 'bold', color: '#14B8A6', textTransform: 'uppercase' },

    section: { marginBottom: 24 },
    sectionTitle: { fontSize: 13, fontWeight: '900', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12, marginLeft: 12 },
    card: { backgroundColor: '#fff', borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: '#F1F5F9' },
    menuItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#F8FAFC' },
    menuIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
    menuText: { flex: 1 },
    menuLabel: { fontSize: 15, fontWeight: 'bold', color: '#1E293B' },
    menuSubLabel: { fontSize: 12, color: '#94A3B8' },

    logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 20, gap: 12 },
    logoutText: { color: '#EF4444', fontWeight: 'bold', fontSize: 16 },
    versionText: { textAlign: 'center', color: '#CBD5E1', fontSize: 11, fontWeight: 'bold', marginTop: 12 }
});
