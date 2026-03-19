import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, TextInput, Platform } from 'react-native';
import { Button, Input, Modal } from './NativeUI';
import { Info, AlertCircle, CheckCircle2, MessageSquare } from 'lucide-react-native';

const NativeLogs = ({ user, setUser }) => {
    const [foodNoise, setFoodNoise] = useState(3);
    const [note, setNote] = useState('');
    const [trigger, setTrigger] = useState('');
    const [selectedSymptoms, setSelectedSymptoms] = useState([]);
    const [isSaving, setIsSaving] = useState(false);

    const symptoms = [
        { id: 'nausea', emoji: '🤢', label: 'Náusea' },
        { id: 'vomito', emoji: '🤮', label: 'Vômito' },
        { id: 'fadiga', emoji: '🥱', label: 'Fadiga' },
        { id: 'azia', emoji: '🔥', label: 'Azia' },
        { id: 'constipação', emoji: '🧱', label: 'Constipação' },
    ];

    const toggleSymptom = (id) => {
        setSelectedSymptoms(prev =>
            prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
        );
    };

    const handleSave = async () => {
        setIsSaving(true);
        const now = new Date().toISOString();
        const newLog = {
            date: now,
            foodNoise: parseInt(foodNoise),
            symptoms: selectedSymptoms,
            trigger: trigger,
            note: note
        };

        const updatedUser = {
            ...user,
            sideEffectsLogs: [newLog, ...(user.sideEffectsLogs || [])]
        };

        await setUser(updatedUser);
        setNote('');
        setTrigger('');
        setSelectedSymptoms([]);
        setFoodNoise(3);
        setIsSaving(false);
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scroll}>
                <Text style={styles.title}>Diário de Hoje</Text>

                {/* Symptoms Section */}
                <View style={styles.card}>
                    <Text style={styles.cardLabel}>Sintomas do Dia</Text>
                    <View style={styles.symptomsGrid}>
                        {symptoms.map((s) => (
                            <TouchableOpacity 
                                key={s.id} 
                                onPress={() => toggleSymptom(s.id)}
                                style={[styles.symptomItem, selectedSymptoms.includes(s.id) && styles.symptomActive]}
                            >
                                <Text style={styles.emoji}>{s.emoji}</Text>
                                <Text style={[styles.symptomLabel, selectedSymptoms.includes(s.id) && styles.symptomLabelActive]}>{s.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Food Noise Slider Simulado */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <Text style={styles.cardLabel}>Food Noise</Text>
                        <View style={[styles.badge, { backgroundColor: foodNoise <= 3 ? '#14B8A6' : '#F59E0B' }]}>
                             <Text style={styles.badgeText}>{foodNoise <= 3 ? 'Silencioso' : 'Moderado'}</Text>
                        </View>
                    </View>
                    <View style={styles.sliderMock}>
                        {[0, 2, 4, 6, 8, 10].map(v => (
                            <TouchableOpacity 
                                key={v} 
                                onPress={() => setFoodNoise(v)}
                                style={[styles.sliderStep, foodNoise === v && styles.sliderStepActive]}
                            />
                        ))}
                    </View>
                    <View style={styles.sliderLabels}>
                        <Text style={styles.sliderSubText}>Silencioso</Text>
                        <Text style={styles.sliderSubText}>Intenso</Text>
                    </View>
                </View>

                {/* Daily Note */}
                <View style={styles.card}>
                    <Text style={styles.cardLabel}>Notas Rápidas</Text>
                    <TextInput 
                        style={styles.textArea}
                        multiline
                        numberOfLines={4}
                        placeholder="Como você se sente hoje?"
                        value={note}
                        onChangeText={setNote}
                    />
                </View>

                <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving ? 'Salvando...' : 'Salvar Registro'}
                </Button>

            </ScrollView>
        </SafeAreaView>
    );
};

export default NativeLogs;

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FAF7F2' },
    scroll: { padding: 24, paddingBottom: 110 },
    title: { fontSize: 24, fontWeight: 'bold', color: '#0F172A', marginBottom: 24, marginTop: Platform.OS === 'android' ? 20 : 0 },
    card: { backgroundColor: '#fff', borderRadius: 32, padding: 24, marginBottom: 16, borderWidth: 1, borderColor: '#F1F5F9' },
    cardLabel: { fontSize: 12, fontWeight: 'bold', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 },
    symptomsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    symptomItem: { width: '30%', padding: 12, borderRadius: 20, backgroundColor: '#F8FAFC', alignItems: 'center', borderWidth: 1, borderColor: '#F1F5F9' },
    symptomActive: { backgroundColor: '#F0FDFA', borderColor: '#14B8A6' },
    emoji: { fontSize: 24, marginBottom: 4 },
    symptomLabel: { fontSize: 10, fontWeight: 'bold', color: '#64748B' },
    symptomLabelActive: { color: '#14B8A6' },

    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100 },
    badgeText: { fontSize: 10, fontWeight: 'bold', color: '#fff' },
    sliderMock: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 10, marginBottom: 10 },
    sliderStep: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#E2E8F0' },
    sliderStepActive: { backgroundColor: '#14B8A6', transform: [{ scale: 1.5 }] },
    sliderLabels: { flexDirection: 'row', justifyContent: 'space-between' },
    sliderSubText: { fontSize: 10, color: '#94A3B8', fontWeight: 'bold' },

    textArea: { backgroundColor: '#F8FAFC', borderRadius: 20, padding: 16, height: 100, textAlignVertical: 'top', color: '#0F172A' }
});
