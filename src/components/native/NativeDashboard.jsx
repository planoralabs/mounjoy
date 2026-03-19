import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Platform } from 'react-native';
import { Button, StatCard, Modal, Input } from './NativeUI';
import { MOCK_MEDICATIONS } from '../../constants/medications';
import { ReminderService } from '../../services/ReminderService';
import { Droplet, Thermometer, Zap, TrendingUp, Syringe, Calendar, Plus } from 'lucide-react-native';

const NativeDashboard = ({ user, setUser }) => {
    const medication = MOCK_MEDICATIONS.find(m => m.id === user.medicationId);
    const [showWeightModal, setShowWeightModal] = useState(false);
    const [newWeight, setNewWeight] = useState('');

    const today = new Date().toISOString().split('T')[0];
    const dailyData = (user.dailyIntakeHistory && user.dailyIntakeHistory[today]) || { water: 0, protein: 0 };
    
    const reminder = ReminderService.calculateNextDose(user.doseHistory || []);
    const timeRemaining = ReminderService.formatTimeRemaining(reminder.daysRemaining, reminder.status);

    const updateWeight = () => {
        if (!newWeight) return;
        const weightValue = parseFloat(newWeight);
        const now = new Date().toISOString();

        setUser({
            ...user,
            currentWeight: weightValue,
            history: [...(user.history || []), weightValue],
            lastWeightDate: now
        });
        setShowWeightModal(false);
        setNewWeight('');
    };

    const updateIntake = (type, amount) => {
        const currentAmount = dailyData[type] || 0;
        const newAmount = Math.max(0, currentAmount + amount);

        setUser({
            ...user,
            dailyIntakeHistory: {
                ...(user.dailyIntakeHistory || {}),
                [today]: {
                    ...(user.dailyIntakeHistory?.[today] || {}),
                    [type]: parseFloat(newAmount.toFixed(1))
                }
            }
        });
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scroll}>
                {/* Header Section */}
                <View style={styles.header}>
                    <View>
                        <Text style={styles.greeting}>Olá, {user.name || 'Usuário'}</Text>
                        <Text style={styles.subtitle}>Sua jornada hoje</Text>
                    </View>
                    <View style={styles.avatar}><Text style={styles.avatarText}>{user.name?.charAt(0) || '?'}</Text></View>
                </View>

                {/* Dose Widget */}
                <View style={[styles.doseWidget, { backgroundColor: medication?.color || '#14B8A6' }]}>
                    <View style={styles.doseInfo}>
                        <Text style={styles.doseWait}>{timeRemaining}</Text>
                        <Text style={styles.doseLabel}>Próxima Dose de {medication?.brand || 'GLP-1'}</Text>
                    </View>
                    <TouchableOpacity style={styles.doseBtn}><Syringe color="#fff" size={24} /></TouchableOpacity>
                </View>

                {/* Main Stats */}
                <View style={styles.weightCard}>
                    <View>
                        <Text style={styles.cardLabel}>PESO ATUAL</Text>
                        <Text style={styles.weightValue}>{user.currentWeight || '--'} <Text style={styles.kg}>kg</Text></Text>
                    </View>
                    <Button 
                        variant="secondary" 
                        onClick={() => setShowWeightModal(true)}
                        style={styles.addWeightBtn}
                    ><Plus size={20} color="#14B8A6" /></Button>
                </View>

                {/* Grid Stats */}
                <View style={styles.grid}>
                    <StatCard 
                        label="Água" 
                        value={`${dailyData.water || 0}L`} 
                        icon={Droplet} 
                        color="#3B82F6"
                        subValue={`Meta: ${user.settings?.waterGoal || 2.5}L`}
                        onPress={() => updateIntake('water', 0.2)}
                    />
                    <StatCard 
                        label="Proteína" 
                        value={`${dailyData.protein || 0}g`} 
                        icon={Zap} 
                        color="#F59E0B"
                        subValue={`Meta: ${user.settings?.proteinGoal || 100}g`}
                        onPress={() => updateIntake('protein', 10)}
                    />
                </View>

                {/* Health Tips Section */}
                <View style={styles.tipsSection}>
                   <Text style={styles.tipsTitle}>Dica de hoje</Text>
                   <View style={styles.tipCard}>
                       <Text style={styles.tipText}>Priorize proteínas em todas as refeições para evitar a perda de massa muscular durante o tratamento.</Text>
                   </View>
                </View>

            </ScrollView>

            {/* Modals */}
            <Modal visible={showWeightModal} onClose={() => setShowWeightModal(false)} title="Registrar Peso">
                <Input 
                    label="Novo Peso (kg)" 
                    placeholder="Ex: 80.5" 
                    value={newWeight} 
                    onChangeText={setNewWeight}
                    keyboardType="numeric"
                />
                <Button onClick={updateWeight}>Confirmar Registro</Button>
            </Modal>
        </SafeAreaView>
    );
};

export default NativeDashboard;

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FAF7F2' },
    scroll: { padding: 24, paddingBottom: 120 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32, marginTop: Platform.OS === 'android' ? 20 : 0 },
    greeting: { fontSize: 24, fontWeight: 'bold', color: '#0F172A' },
    subtitle: { fontSize: 14, color: '#64748B' },
    avatar: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#fff', borderWeight: 1, borderColor: '#E2E8F0', justifyContent: 'center', alignItems: 'center', elevation: 2 },
    avatarText: { fontSize: 18, fontWeight: 'bold', color: '#14B8A6' },
    
    doseWidget: { borderRadius: 32, padding: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
    doseWait: { fontSize: 32, fontWeight: '900', color: '#fff' },
    doseLabel: { fontSize: 12, fontWeight: 'bold', color: 'rgba(255,255,255,0.8)', marginTop: 4 },
    doseBtn: { width: 56, height: 56, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20, justifyContent: 'center', alignItems: 'center' },

    weightCard: { backgroundColor: '#fff', padding: 24, borderRadius: 32, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, borderWidth: 1, borderColor: '#F1F5F9' },
    cardLabel: { fontSize: 10, fontWeight: '900', color: '#94A3B8', letterSpacing: 1 },
    weightValue: { fontSize: 40, fontWeight: '900', color: '#0F172A' },
    kg: { fontSize: 16, color: '#94A3B8' },
    addWeightBtn: { paddingHorizontal: 16, paddingVertical: 12 },

    grid: { flexDirection: 'row', gap: 12, marginBottom: 32 },
    
    tipsSection: { marginTop: 10 },
    tipsTitle: { fontSize: 18, fontWeight: 'bold', color: '#0F172A', marginBottom: 16 },
    tipCard: { backgroundColor: '#F0FDFA', padding: 20, borderRadius: 24, borderLeftWidth: 4, borderLeftColor: '#14B8A6' },
    tipText: { color: '#0F766E', lineHeight: 22, fontWeight: '500' }
});
