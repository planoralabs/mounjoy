import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity } from 'react-native';
import { Button, Input, Slider } from './NativeUI';
import { MOCK_MEDICATIONS } from '../../constants/medications';
import { Activity, ArrowRight, Check } from 'lucide-react-native';

const NativeOnboarding = ({ onComplete }) => {
    const [step, setStep] = useState(0);
    const [data, setData] = useState({
        name: '',
        height: '1.70',
        startWeight: '80.0',
        goalWeight: '70.0',
        medicationId: '',
        currentDose: '',
        injectionDay: 'Segunda-feira'
    });

    const [filterAdmin, setFilterAdmin] = useState('all');
    const [filterFocus, setFilterFocus] = useState('all');

    const handleChange = (field, value) => {
        setData({ ...data, [field]: value });
    };

    const nextStep = () => {
        if (step < steps.length - 1) setStep(step + 1);
        else onComplete(data);
    };
    const prevStep = () => setStep(step - 1);

    const isNextDisabled = () => {
        if (step === 1) return !data.name;
        if (step === 4) return !data.medicationId;
        if (step === 5) return !data.currentDose;
        return false;
    };

    const filteredMeds = MOCK_MEDICATIONS.filter(med => {
        const matchesAdmin =
            filterAdmin === 'all' ||
            (filterAdmin === 'weekly' && med.route === 'injectable' && med.frequency === 'weekly') ||
            (filterAdmin === 'daily_inj' && med.route === 'injectable' && med.frequency === 'daily') ||
            (filterAdmin === 'daily_oral' && med.route === 'oral');
        const matchesFocus = filterFocus === 'all' || med.focus === filterFocus;
        return matchesAdmin && matchesFocus;
    });

    const steps = [
        // Step 0: Welcome
        <View style={styles.stepContainer}>
            <View style={styles.welcomeIconBox}>
                <Activity size={48} color="#14B8A6" />
            </View>
            <Text style={styles.title}>Bem-vindo ao Mounjoy</Text>
            <Text style={styles.subtitle}>Seu companheiro diário na jornada de transformação e saúde metabólica.</Text>
        </View>,

        // Step 1: Name
        <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Sobre você</Text>
            <Input 
                label="Como podemos te chamar?" 
                placeholder="Seu nome" 
                value={data.name} 
                onChangeText={(v) => handleChange('name', v)} 
            />
        </View>,

        // Step 2: Physical Data
        <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Seus Dados</Text>
            <Slider
                label="Peso Atual"
                value={data.startWeight}
                onChange={(v) => handleChange('startWeight', v)}
                min={40}
                max={250}
                step={0.1}
                suffix="kg"
            />
            <Slider
                label="Altura"
                value={data.height}
                onChange={(v) => handleChange('height', v)}
                min={1.0}
                max={2.3}
                step={0.01}
                suffix="m"
            />
        </View>,

        // Step 3: Goal
        <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Sua Meta</Text>
            <Slider
                label="Meta de Peso"
                value={data.goalWeight}
                onChange={(v) => handleChange('goalWeight', v)}
                min={40}
                max={200}
                step={0.1}
                suffix="kg"
            />
        </View>,

        // Step 4: Medication
        <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Qual seu protocolo?</Text>
            <View style={styles.filterRow}>
                {['all', 'weekly', 'daily_inj', 'daily_oral'].map(f => (
                    <TouchableOpacity 
                        key={f} 
                        onPress={() => setFilterAdmin(f)}
                        style={[styles.filterChip, filterAdmin === f && styles.filterChipActive]}
                    >
                        <Text style={[styles.filterText, filterAdmin === f && styles.filterTextActive]}>{f === 'all' ? 'Todos' : f}</Text>
                    </TouchableOpacity>
                ))}
            </View>
            <ScrollView style={styles.medList}>
                {filteredMeds.map(med => (
                    <TouchableOpacity 
                        key={med.id} 
                        onPress={() => handleChange('medicationId', med.id)}
                        style={[styles.medCard, data.medicationId === med.id && styles.medCardActive]}
                    >
                        <View>
                            <Text style={styles.medBrand}>{med.brand}</Text>
                            <Text style={styles.medSubstance}>{med.substance}</Text>
                        </View>
                        {data.medicationId === med.id && <Check size={20} color="#14B8A6" />}
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>,

        // Step 5: Dosage
        <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Detalhes da Dose</Text>
            {data.medicationId && (
                <View style={styles.doseGrid}>
                    {MOCK_MEDICATIONS.find(m => m.id === data.medicationId).doses.map(dose => (
                        <TouchableOpacity 
                            key={dose} 
                            onPress={() => handleChange('currentDose', dose)}
                            style={[styles.doseChip, data.currentDose === dose && styles.doseChipActive]}
                        >
                            <Text style={[styles.doseText, data.currentDose === dose && styles.doseTextActive]}>{dose}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            )}
        </View>
    ];

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.progressContainer}>
                <View style={[styles.progressBar, { width: `${(step / (steps.length - 1)) * 100}%` }]} />
            </View>
            
            <View style={styles.content}>
                {steps[step]}
            </View>

            <View style={styles.footer}>
                {step > 0 && (
                    <Button variant="ghost" onClick={prevStep} style={{ flex: 1 }}>Voltar</Button>
                )}
                <Button 
                    variant="primary" 
                    onClick={nextStep} 
                    disabled={isNextDisabled()}
                    style={{ flex: 2 }}
                >
                    {step === steps.length - 1 ? 'Finalizar' : 'Próximo'}
                </Button>
            </View>
        </SafeAreaView>
    );
};

export default NativeOnboarding;

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FAF7F2' },
    progressContainer: { height: 4, backgroundColor: '#E2E8F0', width: '100%' },
    progressBar: { height: '100%', backgroundColor: '#14B8A6' },
    content: { flex: 1, padding: 24, justifyContent: 'center' },
    stepContainer: { flex: 1, width: '100%' },
    welcomeIconBox: { width: 96, height: 96, backgroundColor: '#F0FDFA', borderRadius: 48, justifyContent: 'center', alignItems: 'center', alignSelf: 'center', marginBottom: 32 },
    title: { fontSize: 28, fontWeight: 'bold', color: '#0F172A', textAlign: 'center', marginBottom: 12 },
    subtitle: { fontSize: 16, color: '#64748B', textAlign: 'center', lineHeight: 24 },
    stepTitle: { fontSize: 24, fontWeight: 'bold', color: '#0F172A', marginBottom: 32 },
    filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
    filterChip: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1, borderColor: '#E2E8F0' },
    filterChipActive: { backgroundColor: '#14B8A6', borderColor: '#14B8A6' },
    filterText: { fontSize: 12, color: '#64748B', fontWeight: 'bold' },
    filterTextActive: { color: '#FFFFFF' },
    medList: { flex: 1 },
    medCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: '#FFFFFF', borderRadius: 20, marginBottom: 12, borderWidth: 1, borderColor: '#F1F5F9' },
    medCardActive: { borderColor: '#14B8A6', backgroundColor: '#F0FDFA' },
    medBrand: { fontSize: 16, fontWeight: 'bold', color: '#0F172A' },
    medSubstance: { fontSize: 12, color: '#94A3B8' },
    doseGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    doseChip: { padding: 12, borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', width: '31%' },
    doseChipActive: { backgroundColor: '#14B8A6', borderColor: '#14B8A6' },
    doseText: { textAlign: 'center', fontSize: 12, fontWeight: 'bold', color: '#64748B' },
    doseTextActive: { color: '#FFFFFF' },
    footer: { flexDirection: 'row', padding: 24, gap: 12, backgroundColor: '#FAF7F2' }
});
