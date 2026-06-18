import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, TextInput, Platform } from 'react-native';
import { Button, Input, Modal, Slider } from './NativeUI';
import { Info, AlertCircle, CheckCircle2, MessageSquare } from 'lucide-react-native';

const NativeLogs = ({ user, setUser }) => {
    const [foodNoise, setFoodNoise] = useState(3);
    const [note, setNote] = useState('');
    const [trigger, setTrigger] = useState('');
    const [selectedSymptoms, setSelectedSymptoms] = useState([]);
    const [isSaving, setIsSaving] = useState(false);
    const [showFoodNoiseInfo, setShowFoodNoiseInfo] = useState(false);
    const [showTriggerField, setShowTriggerField] = useState(false);

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
        if (id === 'nausea' || id === 'vomito') {
            setShowTriggerField(true);
        }
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
        setShowTriggerField(false);
        setIsSaving(false);
    };

    const getSliderColor = () => {
        if (foodNoise <= 3) return '#EA580C';
        if (foodNoise <= 7) return '#F59E0B';
        return '#EF4444';
    };

    const getSliderText = () => {
        if (foodNoise <= 3) return 'Silencioso';
        if (foodNoise <= 7) return 'Moderado';
        return 'Alto';
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
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

                    {showTriggerField && (
                        <View style={styles.triggerField}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                                <AlertCircle size={14} color="#EA580C" />
                                <Text style={styles.triggerLabel}>Identificar Gatilho</Text>
                            </View>
                            <TextInput 
                                style={styles.triggerInput}
                                value={trigger}
                                onChangeText={setTrigger}
                                placeholder="Ex: Doce, gordura, cheiro forte..."
                                placeholderTextColor="#CBD5E1"
                            />
                        </View>
                    )}
                </View>

                {/* Food Noise Slider */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Text style={styles.cardLabel}>Food Noise</Text>
                            <TouchableOpacity onPress={() => setShowFoodNoiseInfo(true)}>
                                <Info size={16} color="#94A3B8" />
                            </TouchableOpacity>
                        </View>
                        <View style={[styles.badge, { backgroundColor: getSliderColor() }]}>
                             <Text style={styles.badgeText}>{getSliderText()}</Text>
                        </View>
                    </View>
                    
                    <Slider
                        label=""
                        value={foodNoise}
                        onChange={(v) => setFoodNoise(Math.round(parseFloat(v)))}
                        min={0}
                        max={10}
                        step={1}
                        suffix=""
                    />
                </View>

                {/* Daily Note */}
                <View style={styles.card}>
                    <Text style={styles.cardLabel}>Notas Rápidas</Text>
                    <TextInput 
                        style={styles.textArea}
                        multiline
                        numberOfLines={4}
                        placeholder="Como você se sente hoje?"
                        placeholderTextColor="#CBD5E1"
                        value={note}
                        onChangeText={setNote}
                    />
                </View>

                <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving ? 'Salvando...' : 'Salvar Registro'}
                </Button>
            </ScrollView>

            {/* Modal: O que é Food Noise? */}
            <Modal visible={showFoodNoiseInfo} onClose={() => setShowFoodNoiseInfo(false)} title="O que é Food Noise?">
                <View style={{ gap: 12, marginVertical: 16 }}>
                    <Text style={styles.modalText}>
                        O "ruído alimentar" são aqueles pensamentos constantes e intrusivos sobre comida que podem dificultar o controle do peso.
                    </Text>
                    <View style={[styles.infoRowBadge, { backgroundColor: '#FFF7ED', borderColor: '#FFEDD5' }]}>
                        <Text style={[styles.infoRowBadgeVal, { color: '#EA580C' }]}>0-3</Text>
                        <Text style={styles.infoRowBadgeText}>
                            <Text style={{ fontFamily: 'Outfit_700Bold', color: '#9A3412' }}>Silencioso: </Text>
                            Você só pensa em comida quando está com fome física real.
                        </Text>
                    </View>
                    <View style={[styles.infoRowBadge, { backgroundColor: '#FEF3C7', borderColor: '#FDE68A' }]}>
                        <Text style={[styles.infoRowBadgeVal, { color: '#D97706' }]}>4-7</Text>
                        <Text style={styles.infoRowBadgeText}>
                            <Text style={{ fontFamily: 'Outfit_700Bold', color: '#78350F' }}>Moderado: </Text>
                            Pensamentos ocasionais sobre comida ou desejo por snacks específicos.
                        </Text>
                    </View>
                    <View style={[styles.infoRowBadge, { backgroundColor: '#FEF2F2', borderColor: '#FEE2E2' }]}>
                        <Text style={[styles.infoRowBadgeVal, { color: '#EF4444' }]}>8-10</Text>
                        <Text style={styles.infoRowBadgeText}>
                            <Text style={{ fontFamily: 'Outfit_700Bold', color: '#7F1D1D' }}>Alto: </Text>
                            Pensamentos constantes sobre a próxima refeição ou snacks.
                        </Text>
                    </View>
                </View>
                <Button onClick={() => setShowFoodNoiseInfo(false)} style={{ width: '100%', marginBottom: 12 }}>
                    Entendi
                </Button>
            </Modal>
        </SafeAreaView>
    );
};

export default NativeLogs;

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FAF7F2' },
    scroll: { padding: 24, paddingBottom: 110 },
    title: { fontSize: 24, fontFamily: 'Outfit_700Bold', color: '#0F172A', marginBottom: 24, marginTop: Platform.OS === 'android' ? 20 : 0 },
    card: { 
        backgroundColor: '#fff', 
        borderRadius: 32, 
        padding: 24, 
        marginBottom: 16, 
        borderWidth: 1, 
        borderColor: '#F1F5F9',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.02,
        shadowRadius: 8,
        elevation: 2,
    },
    cardLabel: { fontSize: 11, fontFamily: 'Outfit_900Black', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 },
    symptomsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    symptomItem: { width: '30%', padding: 12, borderRadius: 20, backgroundColor: '#F8FAFC', alignItems: 'center', borderWidth: 1, borderColor: '#F1F5F9' },
    symptomActive: { backgroundColor: '#FFF7ED', borderColor: '#EA580C' },
    emoji: { fontSize: 24, marginBottom: 4 },
    symptomLabel: { fontSize: 10, fontFamily: 'Outfit_700Bold', color: '#64748B' },
    symptomLabelActive: { color: '#EA580C' },

    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100 },
    badgeText: { fontSize: 10, fontFamily: 'Outfit_700Bold', color: '#fff' },
    sliderMock: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 10, marginBottom: 10 },
    sliderStep: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#E2E8F0' },
    sliderStepActive: { backgroundColor: '#EA580C', transform: [{ scale: 1.5 }] },
    sliderLabels: { flexDirection: 'row', justifyContent: 'space-between' },
    sliderSubText: { fontSize: 10, fontFamily: 'Outfit_700Bold', color: '#94A3B8' },

    textArea: { backgroundColor: '#F8FAFC', borderRadius: 20, padding: 16, height: 100, textAlignVertical: 'top', color: '#0F172A', fontFamily: 'Outfit_600SemiBold' }
});
