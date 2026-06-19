import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity, Image, Dimensions, Platform, LayoutAnimation, UIManager, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { Button, Input, Slider } from './NativeUI';
import { MOCK_MEDICATIONS } from '../../constants/medications';
import { ArrowLeft, Check } from 'lucide-react-native';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width } = Dimensions.get('window');

const mascotImg = require('../../../assets/mascot.png');
const mascotWeightImg = require('../../../assets/mascotweight.png');
const mascotStretchImg = require('../../../assets/mascotstretch1.png');

const NativeOnboarding = ({ onComplete }) => {
    const [step, setStep] = useState(0);
    const [data, setData] = useState({
        name: '',
        height: '1.70',
        startWeight: '80.0',
        goalWeight: '70.0',
        medicationId: '',
        currentDose: '',
        injectionDay: ''
    });

    const [filterAdmin, setFilterAdmin] = useState('all');
    const [filterFocus, setFilterFocus] = useState('all');
    const [selectedSubstance, setSelectedSubstance] = useState(null);

    const triggerLayoutAnimation = () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    };

    const handleChange = (field, value) => {
        setData({ ...data, [field]: value });
    };

    const nextStep = () => {
        triggerLayoutAnimation();
        if (step < steps.length - 1) setStep(step + 1);
        else onComplete(data);
    };
    const prevStep = () => {
        triggerLayoutAnimation();
        setStep(step - 1);
    };

    const isNextDisabled = () => {
        if (step === 1) return !data.name;
        if (step === 4) return !data.medicationId;
        if (step === 5) return !data.currentDose || !data.injectionDay;
        return false;
    };

    const selectedMed = MOCK_MEDICATIONS.find(m => m.id === data.medicationId);

    const filteredMeds = MOCK_MEDICATIONS.filter(med => {
        const matchesAdmin =
            filterAdmin === 'all' ||
            (filterAdmin === 'weekly' && med.route === 'injectable' && med.frequency === 'weekly') ||
            (filterAdmin === 'daily_inj' && med.route === 'injectable' && med.frequency === 'daily') ||
            (filterAdmin === 'daily_oral' && med.route === 'oral');
        const matchesFocus = filterFocus === 'all' || med.focus === filterFocus;
        return matchesAdmin && matchesFocus;
    });

    // Group meds by substance
    const medsBySubstance = useMemo(() => {
        return filteredMeds.reduce((acc, med) => {
            (acc[med.substance] = acc[med.substance] || []).push(med);
            return acc;
        }, {});
    }, [filteredMeds]);

    const steps = [
        // Step 0: Welcome
        <View style={styles.stepContainer}>
            <Image source={mascotImg} style={styles.welcomeMascot} resizeMode="contain" />
            <Text style={styles.title}>Olá, vamos começar?</Text>
            <Text style={styles.subtitle}>Vou te ajudar a ficar incrível e acompanhar cada passo da sua evolução!</Text>
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
            <Image source={mascotWeightImg} style={styles.weightMascot} resizeMode="contain" />
        </View>,

        // Step 4: Medication Selection (Substances & Brands)
        <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Qual seu protocolo?</Text>
            
            {/* Filters Row - Only visible when not focused on a single substance */}
            {!selectedSubstance && (
                <View style={styles.filtersBlock}>
                    <Text style={styles.filterGroupLabel}>Via de Administração</Text>
                    <View style={styles.filterRow}>
                        {[
                            { id: 'all', label: 'Todos' },
                            { id: 'weekly', label: 'Semanal' },
                            { id: 'daily_inj', label: 'Inj. Diário' },
                            { id: 'daily_oral', label: 'Comprimido' }
                        ].map(f => (
                            <TouchableOpacity 
                                key={f.id} 
                                onPress={() => { triggerLayoutAnimation(); setFilterAdmin(f.id); }}
                                style={[styles.filterChip, filterAdmin === f.id && styles.filterChipActive]}
                            >
                                <Text style={[styles.filterText, filterAdmin === f.id && styles.filterTextActive]}>{f.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <Text style={styles.filterGroupLabel}>Objetivo Principal</Text>
                    <View style={styles.filterRow}>
                        {[
                            { id: 'all', label: 'Todos' },
                            { id: 'weight', label: 'Peso' },
                            { id: 'diabetes', label: 'Glicose' }
                        ].map(f => (
                            <TouchableOpacity 
                                key={f.id} 
                                onPress={() => { triggerLayoutAnimation(); setFilterFocus(f.id); }}
                                style={[styles.filterChip, filterFocus === f.id && styles.filterChipActive]}
                            >
                                <Text style={[styles.filterText, filterFocus === f.id && styles.filterTextActive]}>{f.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            )}

            {/* List/Grid of Substances */}
            <ScrollView style={styles.medList} showsVerticalScrollIndicator={false}>
                {selectedSubstance && (
                    <TouchableOpacity onPress={() => { triggerLayoutAnimation(); setSelectedSubstance(null); }} style={styles.backToSubstancesBtn}>
                        <ArrowLeft size={16} color="#EA580C" />
                        <Text style={styles.backToSubstancesText}>Ver todas as substâncias</Text>
                    </TouchableOpacity>
                )}

                <View style={selectedSubstance ? styles.singleSubstanceWrapper : styles.substancesGrid}>
                    {Object.entries(medsBySubstance).map(([substance, meds]) => {
                        const isFocused = selectedSubstance === substance;
                        const hasSelection = meds.some(m => m.id === data.medicationId);
                        const selectedBrand = meds.find(m => m.id === data.medicationId)?.brand;

                        if (selectedSubstance && !isFocused) return null;

                        if (isFocused) {
                            return (
                                <View key={substance} style={styles.substanceCardFocused}>
                                    <Text style={styles.substanceTitleFocused}>{substance}</Text>
                                    <View style={styles.brandsList}>
                                        {meds.map((med) => {
                                            const isSelected = data.medicationId === med.id;

                                            return (
                                                <TouchableOpacity
                                                    key={med.id}
                                                    onPress={() => {
                                                        triggerLayoutAnimation();
                                                        handleChange('medicationId', med.id);
                                                        setSelectedSubstance(null);
                                                    }}
                                                    style={[
                                                        styles.brandButton,
                                                        isSelected ? styles.brandButtonActive : null
                                                    ]}
                                                >
                                                    <Text style={[styles.brandButtonText, isSelected && styles.brandButtonTextActive]}>
                                                        {med.brand}
                                                    </Text>
                                                    {isSelected && (
                                                        <View style={styles.brandCheckIndicator}>
                                                            <Check size={12} color="#FFFFFF" strokeWidth={3} />
                                                        </View>
                                                    )}
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </View>
                                </View>
                            );
                        } else {
                            return (
                                <TouchableOpacity 
                                    key={substance}
                                    activeOpacity={0.9}
                                    onPress={() => {
                                        triggerLayoutAnimation();
                                        setSelectedSubstance(substance);
                                    }}
                                    style={[
                                        styles.substanceCard,
                                        hasSelection ? styles.substanceCardSelected : null
                                    ]}
                                >
                                    <Text style={styles.substanceTitle}>{substance}</Text>
                                    {selectedBrand && (
                                        <Text style={styles.substanceSelectedBrandText}>{selectedBrand}</Text>
                                    )}
                                </TouchableOpacity>
                            );
                        }
                    })}
                </View>
            </ScrollView>
        </View>,

        // Step 5: Dosage & Injection Day
        <ScrollView style={styles.stepScrollContainer} showsVerticalScrollIndicator={false}>
            <Text style={styles.stepTitle}>Detalhes da Dose</Text>
            
            {data.medicationId && (
                <View style={styles.sectionContainer}>
                    <Text style={styles.sectionLabel}>Dosagem Atual</Text>
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
                </View>
            )}

            <View style={styles.sectionContainer}>
                <Text style={styles.sectionLabel}>Dia da Aplicação / Consumo</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.daysScroll}>
                    {['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'].map(day => (
                        <TouchableOpacity
                            key={day}
                            onPress={() => handleChange('injectionDay', day)}
                            style={[styles.dayChip, data.injectionDay === day && styles.dayChipActive]}
                        >
                            <Text style={[styles.dayText, data.injectionDay === day && styles.dayTextActive]}>{day.slice(0, 3)}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {/* Protocol Summary Preview Card */}
            {data.currentDose && data.injectionDay && selectedMed && (
                <View style={styles.previewCard}>
                    <Text style={styles.previewText}>
                        Tudo pronto! Seu plano com <Text style={styles.previewHighlight}>{selectedMed.brand}</Text> está montado, na dose de <Text style={styles.previewHighlight}>{data.currentDose}</Text>, começando na próxima {data.injectionDay}. Vamos nessa!
                    </Text>
                    <Image source={mascotStretchImg} style={styles.previewMascot} resizeMode="contain" />
                </View>
            )}
        </ScrollView>
    ];

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
            <SafeAreaView style={styles.container}>
                <View style={styles.headerNav}>
                    {step > 0 && (
                        <TouchableOpacity onPress={prevStep} style={styles.backBtn}>
                            <ArrowLeft size={20} color="#EA580C" />
                        </TouchableOpacity>
                    )}
                    <View style={[styles.progressContainer, { height: 16 - (step / (steps.length - 1)) * 14 }]}>
                        <View style={[styles.progressBar, { width: `${(step / (steps.length - 1)) * 100}%` }]} />
                    </View>
                </View>
                
                <View style={styles.content}>
                    {steps[step]}
                </View>

                <View style={styles.footer}>
                    {step === 4 && data.medicationId && selectedMed && (
                        <View style={styles.selectionPreview}>
                            <Text style={styles.selectionPreviewLabel}>Selecionado</Text>
                            <View style={styles.selectionPreviewRow}>
                                <Text style={styles.selectionPreviewBrand}>{selectedMed.brand}</Text>
                                <Text style={styles.selectionPreviewSeparator}>|</Text>
                                <Text style={styles.selectionPreviewSubstance}>{selectedMed.substance}</Text>
                            </View>
                        </View>
                    )}
                    <Button 
                        variant="primary" 
                        onClick={nextStep} 
                        disabled={isNextDisabled()}
                        style={styles.actionBtn}
                    >
                        {step === 0 ? 'Começar configuração' : step === steps.length - 1 ? 'Finalizar' : 'Próximo'}
                    </Button>
                </View>
            </SafeAreaView>
        </TouchableWithoutFeedback>
    );
};

export default NativeOnboarding;

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FAF7F2' },
    headerNav: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingTop: Platform.OS === 'android' ? 24 : 12, gap: 12 },
    backBtn: { width: 40, height: 40, borderRadius: 16, backgroundColor: '#FFF7ED', justifyContent: 'center', alignItems: 'center' },
    progressContainer: { flex: 1, backgroundColor: '#E2E8F0', borderRadius: 8, overflow: 'hidden' },
    progressBar: { height: '100%', backgroundColor: '#EA580C', borderRadius: 8 },
    
    content: { flex: 1, paddingHorizontal: 24, paddingTop: 20 },
    stepContainer: { flex: 1, width: '100%', justifyContent: 'center' },
    stepScrollContainer: { flex: 1, width: '100%' },

    // Step 0: Welcome
    welcomeMascot: { width: 200, height: 200, alignSelf: 'center', marginBottom: 24 },
    title: { fontSize: 28, fontFamily: 'Outfit_900Black', color: '#EA580C', textAlign: 'center', marginBottom: 12 },
    subtitle: { fontSize: 16, fontFamily: 'Outfit_600SemiBold', color: '#64748B', textAlign: 'center', lineHeight: 24, paddingHorizontal: 16 },

    // Common Step Headers
    stepTitle: { fontSize: 24, fontFamily: 'Outfit_700Bold', color: '#0F172A', marginBottom: 20 },

    // Step 3: Goal
    weightMascot: { width: 180, height: 180, alignSelf: 'center', marginTop: 24 },

    // Step 4: Medication Select
    filtersBlock: { marginBottom: 16 },
    filterGroupLabel: { fontSize: 10, fontFamily: 'Outfit_900Black', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
    filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 16 },
    filterChip: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#FFF' },
    filterChipActive: { backgroundColor: '#EA580C', borderColor: '#EA580C' },
    filterText: { fontSize: 11, fontFamily: 'Outfit_700Bold', color: '#64748B' },
    filterTextActive: { color: '#FFFFFF' },
    medList: { flex: 1, marginTop: 4 },
    
    backToSubstancesBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
    backToSubstancesText: { fontSize: 13, fontFamily: 'Outfit_700Bold', color: '#EA580C' },

    substancesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'space-between' },
    singleSubstanceWrapper: { width: '100%', alignItems: 'center' },

    substanceCard: {
        backgroundColor: '#FFFFFF',
        width: '48%',
        padding: 16,
        borderRadius: 24,
        marginBottom: 10,
        borderWidth: 2,
        borderColor: '#FFFFFF',
        minHeight: 100,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.02,
        shadowRadius: 4,
        elevation: 1,
    },
    substanceCardFocused: {
        width: 210,
        alignSelf: 'center',
        borderColor: '#EA580C',
        backgroundColor: '#FFF7ED',
        padding: 24,
        alignItems: 'stretch',
        borderRadius: 32,
        borderWidth: 2,
        marginVertical: 16,
        shadowColor: '#EA580C',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    substanceCardSelected: {
        borderColor: '#FFEDD5',
        backgroundColor: '#FFFBF7',
    },
    substanceTitle: { fontSize: 18, fontFamily: 'Outfit_900Black', color: '#431407', textAlign: 'center', lineHeight: 22 },
    substanceTitleFocused: { fontSize: 22, fontFamily: 'Outfit_900Black', color: '#431407', marginBottom: 16, textAlign: 'center' },
    substanceSelectedBrandText: { fontSize: 11, fontFamily: 'Outfit_900Black', color: '#EA580C', marginTop: 6, textTransform: 'uppercase', letterSpacing: 0.5 },

    brandsList: { gap: 10 },
    brandButton: {
        backgroundColor: '#FFFFFF',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    brandButtonActive: {
        borderColor: '#EA580C',
        backgroundColor: '#FFF7ED',
    },
    brandButtonText: { fontSize: 14, fontFamily: 'Outfit_700Bold', color: '#475569', textAlign: 'center' },
    brandButtonTextActive: { color: '#EA580C' },
    brandCheckIndicator: {
        position: 'absolute',
        right: 12,
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: '#EA580C',
        justifyContent: 'center',
        alignItems: 'center',
    },

    // Step 5: Dosage details
    sectionContainer: { marginBottom: 24 },
    sectionLabel: { fontSize: 11, fontFamily: 'Outfit_900Black', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 },
    doseGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    doseChip: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#FFF', flex: 1, minWidth: '28%' },
    doseChipActive: { backgroundColor: '#EA580C', borderColor: '#EA580C' },
    doseText: { textAlign: 'center', fontSize: 13, fontFamily: 'Outfit_700Bold', color: '#64748B' },
    doseTextActive: { color: '#FFFFFF' },

    daysScroll: { gap: 8, paddingBottom: 8 },
    dayChip: { width: 50, height: 50, borderRadius: 25, borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center' },
    dayChipActive: { backgroundColor: '#0F172A', borderColor: '#0F172A' },
    dayText: { fontSize: 12, fontFamily: 'Outfit_700Bold', color: '#94A3B8' },
    dayTextActive: { color: '#FFFFFF' },

    // Preview Protocol Card
    previewCard: { backgroundColor: '#FFF7ED', borderRadius: 32, padding: 20, borderWidth: 1, borderColor: '#FFEDD5', marginTop: 12, alignItems: 'center' },
    previewText: { fontSize: 14, fontFamily: 'Outfit_600SemiBold', color: '#9A3412', lineHeight: 22, textAlign: 'center' },
    previewHighlight: { fontFamily: 'Outfit_700Bold', color: '#EA580C' },
    previewMascot: { width: 140, height: 140, marginTop: 16 },

    // Footer
    footer: { padding: 24, backgroundColor: '#FAF7F2' },
    actionBtn: { width: '100%' },

    selectionPreview: {
        alignItems: 'center',
        marginBottom: 16,
    },
    selectionPreviewLabel: {
        fontSize: 10,
        fontFamily: 'Outfit_900Black',
        color: '#94A3B8',
        textTransform: 'uppercase',
        letterSpacing: 2,
        marginBottom: 4,
    },
    selectionPreviewRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    selectionPreviewBrand: {
        fontSize: 20,
        color: '#EA580C',
        fontStyle: 'italic',
        fontWeight: '900',
    },
    selectionPreviewSeparator: {
        fontSize: 16,
        color: '#CBD5E1',
    },
    selectionPreviewSubstance: {
        fontSize: 14,
        fontFamily: 'Outfit_700Bold',
        color: '#64748B',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
});
