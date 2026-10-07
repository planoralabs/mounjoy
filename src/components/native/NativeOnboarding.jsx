import React, { useState, useMemo, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity, Image, Dimensions, Platform, LayoutAnimation, UIManager, TouchableWithoutFeedback, Keyboard, Animated } from 'react-native';
import { Button, Input, Slider } from './NativeUI';
import { MOCK_MEDICATIONS } from '../../constants/medications';
import { ArrowLeft, Check } from 'lucide-react-native';
import { useTranslation, Trans } from 'react-i18next';
import { getDeviceUnitSystem, weekdayName, orderedWeekdays } from '../../i18n';
import { kgToLb, lbToKg, cmToIn, inToCm, createUnits } from '../../utils/units';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width } = Dimensions.get('window');

const mascotImg = require('../../../assets/mascot.png');
const mascotWeightImg = require('../../../assets/mascotweight.png');
const mascotStretchImg = require('../../../assets/mascotstretch1.png');

const AnimatedPreviewCard = ({ children, style }) => {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(24)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 600,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 600,
                useNativeDriver: true,
            })
        ]).start();
    }, []);

    return (
        <Animated.View style={[style, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            {children}
        </Animated.View>
    );
};

// Canonical storage stays metric (kg, m) regardless of the user's chosen
// display unit, so the rest of the app (dashboards, charts, backend) never
// needs to know which unit the user picked at onboarding. Imperial input is
// stored with extra decimals so it converts back to the same lb / in.
const mToIn = (m) => cmToIn(m * 100);
const inToM = (inches) => inToCm(inches) / 100;

const NativeOnboarding = ({ onComplete }) => {
    const { t } = useTranslation();
    const [step, setStep] = useState(0);
    const [data, setData] = useState(() => ({
        name: '',
        // 'metric' | 'imperial' — pre-selected from the device's measurement
        // system (see docs/historico/mobile_documentation.md 7.6); the user can still switch.
        unitSystem: getDeviceUnitSystem(),
        height: '1.70',
        startWeight: '80.0',
        goalWeight: '70.0',
        medicationId: '',
        currentDose: '',
        injectionDay: null // 0 = Sunday … 6 = Saturday
    }));
    const isImperial = data.unitSystem === 'imperial';
    const units = createUnits(data.unitSystem);

    const [filterAdmin, setFilterAdmin] = useState('all');
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
        if (step === 5) return !data.medicationId;
        if (step === 6) return !data.currentDose || data.injectionDay == null;
        return false;
    };

    const selectedMed = MOCK_MEDICATIONS.find(m => m.id === data.medicationId);

    const filteredMeds = MOCK_MEDICATIONS.filter(med => {
        const matchesAdmin =
            filterAdmin === 'all' ||
            (filterAdmin === 'weekly' && med.route === 'injectable' && med.frequency === 'weekly') ||
            (filterAdmin === 'daily_inj' && med.route === 'injectable' && med.frequency === 'daily') ||
            (filterAdmin === 'daily_oral' && med.route === 'oral');
        return matchesAdmin;
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
            <Text style={styles.title}>{t('onboarding.welcomeTitle')}</Text>
            <Text style={styles.subtitle}>{t('onboarding.welcomeSubtitle')}</Text>
        </View>,

        // Step 1: Name
        <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>{t('onboarding.aboutYou')}</Text>
            <Input
                label={t('onboarding.nameLabel')}
                placeholder={t('onboarding.namePlaceholder')}
                value={data.name} 
                onChangeText={(v) => handleChange('name', v)}
                testID="onboarding-name-input"
            />
        </View>,

        // Step 2: Units
        <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>{t('units.title')}</Text>
            <Text style={styles.subtitle}>{t('onboarding.unitsSubtitle')}</Text>
            <View style={styles.unitGrid}>
                {[
                    { id: 'metric', label: t('units.metric'), hint: t('units.metricHint') },
                    { id: 'imperial', label: t('units.imperial'), hint: t('units.imperialHint') },
                ].map((opt) => (
                    <TouchableOpacity
                        key={opt.id}
                        onPress={() => { triggerLayoutAnimation(); handleChange('unitSystem', opt.id); }}
                        style={[styles.unitCard, data.unitSystem === opt.id && styles.unitCardActive]}
                        testID={`onboarding-unit-${opt.id}`}
                    >
                        <Text style={[styles.unitCardLabel, data.unitSystem === opt.id && styles.unitCardLabelActive]}>{opt.label}</Text>
                        <Text style={[styles.unitCardHint, data.unitSystem === opt.id && styles.unitCardHintActive]}>{opt.hint}</Text>
                    </TouchableOpacity>
                ))}
            </View>
            <Text style={styles.unitsDeviceHint}>{t('onboarding.unitsDeviceHint')}</Text>
        </View>,

        // Step 3: Physical Data
        <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>{t('onboarding.dataTitle')}</Text>
            <Slider
                label={t('onboarding.currentWeight')}
                value={isImperial ? kgToLb(parseFloat(data.startWeight)).toFixed(1) : data.startWeight}
                onChange={(v) => handleChange('startWeight', isImperial ? lbToKg(parseFloat(v)).toFixed(2) : parseFloat(v).toFixed(1))}
                min={isImperial ? 88 : 40}
                max={isImperial ? 550 : 250}
                step={isImperial ? 0.5 : 0.1}
                suffix={units.weightUnit}
            />
            <Slider
                label={t('onboarding.height')}
                value={isImperial ? mToIn(parseFloat(data.height)).toFixed(0) : data.height}
                onChange={(v) => handleChange('height', isImperial ? inToM(parseFloat(v)).toFixed(3) : parseFloat(v).toFixed(2))}
                min={isImperial ? 39 : 1.0}
                max={isImperial ? 91 : 2.3}
                step={isImperial ? 1 : 0.01}
                suffix={isImperial ? 'in' : 'm'}
                displayValue={isImperial ? units.formatHeight(parseFloat(data.height)) : undefined}
            />
        </View>,

        // Step 4: Goal
        <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>{t('onboarding.goalTitle')}</Text>
            <Slider
                label={t('onboarding.goalWeight')}
                value={isImperial ? kgToLb(parseFloat(data.goalWeight)).toFixed(1) : data.goalWeight}
                onChange={(v) => handleChange('goalWeight', isImperial ? lbToKg(parseFloat(v)).toFixed(2) : parseFloat(v).toFixed(1))}
                min={isImperial ? 88 : 40}
                max={isImperial ? 440 : 200}
                step={isImperial ? 0.5 : 0.1}
                suffix={units.weightUnit}
            />
            <Image source={mascotWeightImg} style={styles.weightMascot} resizeMode="contain" />
        </View>,

        // Step 4: Medication Selection (Substances & Brands)
        <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>{t('onboarding.protocolTitle')}</Text>

            {/* Filters Row - Only visible when not focused on a single substance */}
            {!selectedSubstance ? (
                <View style={styles.filtersBlock}>
                    <Text style={styles.filterGroupLabel}>{t('onboarding.routeLabel')}</Text>
                    <View style={styles.filterRow}>
                        {[
                            { id: 'all', label: t('onboarding.filterAll') },
                            { id: 'weekly', label: t('onboarding.filterWeekly') },
                            { id: 'daily_inj', label: t('onboarding.filterDailyInj') },
                            { id: 'daily_oral', label: t('onboarding.filterPill') }
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
                </View>
            ) : null}

            {/* List/Grid of Substances */}
            <ScrollView style={styles.medList} showsVerticalScrollIndicator={false}>
                {!!selectedSubstance ? (
                    <TouchableOpacity onPress={() => { triggerLayoutAnimation(); setSelectedSubstance(null); }} style={styles.backToSubstancesBtn}>
                        <ArrowLeft size={16} color="#EA580C" />
                        <Text style={styles.backToSubstancesText}>{t('onboarding.seeAllSubstances')}</Text>
                    </TouchableOpacity>
                ) : null}

                <View style={selectedSubstance ? styles.singleSubstanceWrapper : styles.substancesGrid}>
                    {Object.entries(medsBySubstance).map(([substance, meds]) => {
                        const isFocused = selectedSubstance === substance;
                        const hasSelection = meds.some(m => m.id === data.medicationId);
                        const selectedBrand = meds.find(m => m.id === data.medicationId)?.brand;

                        if (selectedSubstance && !isFocused) return null;

                        if (isFocused) {
                            return (
                                <View key={substance} style={styles.substanceCardFocused}>
                                    <Text style={styles.substanceTitleFocused}>{t(`substances.${substance}`)}</Text>
                                    <View style={styles.brandsList}>
                                        {meds.map((med) => {
                                            const isSelected = data.medicationId === med.id;

                                            return (
                                                <TouchableOpacity
                                                    key={med.id}
                                                    testID={`onboarding-medication-${med.id}`}
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
                                    testID={`onboarding-substance-${substance}`}
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
                                    <Text style={styles.substanceTitle}>{t(`substances.${substance}`)}</Text>
                                    {!!selectedBrand ? (
                                        <Text style={styles.substanceSelectedBrandText}>{selectedBrand}</Text>
                                    ) : null}
                                </TouchableOpacity>
                            );
                        }
                    })}
                </View>
            </ScrollView>
        </View>,

        // Step 5: Dosage & Injection Day
        <ScrollView style={styles.stepScrollContainer} showsVerticalScrollIndicator={false}>
            <Text style={styles.stepTitle}>{t('onboarding.doseTitle')}</Text>

            {!!data.medicationId ? (
                <View style={styles.sectionContainer}>
                    <Text style={styles.sectionLabel}>{t('onboarding.currentDose')}</Text>
                    <View style={styles.doseGrid}>
                        {MOCK_MEDICATIONS.find(m => m.id === data.medicationId).doses.map(dose => (
                            <TouchableOpacity 
                                key={dose}
                                testID={`onboarding-dose-${dose}`}
                                onPress={() => handleChange('currentDose', dose)}
                                style={[styles.doseChip, data.currentDose === dose && styles.doseChipActive]}
                            >
                                <Text style={[styles.doseText, data.currentDose === dose && styles.doseTextActive]}>{dose}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            ) : null}

            <View style={styles.sectionContainer}>
                <Text style={styles.sectionLabel}>{t('onboarding.doseDay')}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.daysScroll}>
                    {orderedWeekdays().map(day => (
                        <TouchableOpacity
                            key={day}
                            testID={`onboarding-day-${day}`}
                            onPress={() => handleChange('injectionDay', day)}
                            style={[styles.dayChip, data.injectionDay === day && styles.dayChipActive]}
                        >
                            <Text style={[styles.dayText, data.injectionDay === day && styles.dayTextActive]}>{weekdayName(day, 'short')}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {/* Protocol Summary Preview Card */}
            {!!data.currentDose && data.injectionDay != null && !!selectedMed ? (
                <AnimatedPreviewCard style={styles.previewCard}>
                    <Text style={styles.previewText}>
                        <Trans
                            i18nKey="onboarding.summary"
                            values={{ brand: selectedMed.brand, dose: data.currentDose, day: weekdayName(data.injectionDay) }}
                            components={{ b: <Text style={styles.previewHighlight} /> }}
                        />
                    </Text>
                    <Image source={mascotStretchImg} style={styles.previewMascot} resizeMode="contain" />
                </AnimatedPreviewCard>
            ) : null}
        </ScrollView>
    ];

    return (
        <TouchableWithoutFeedback onPress={Platform.OS === 'web' ? undefined : Keyboard.dismiss} accessible={false}>
            <SafeAreaView style={styles.container} testID="onboarding-screen">
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
                    {(step === 5 && !!data.medicationId && !!selectedMed) ? (
                        <View style={styles.selectionPreview}>
                            <Text style={styles.selectionPreviewLabel}>{t('onboarding.selected')}</Text>
                            <View style={styles.selectionPreviewRow}>
                                <Text style={styles.selectionPreviewBrand}>{selectedMed.brand}</Text>
                                <Text style={styles.selectionPreviewSeparator}>|</Text>
                                <Text style={styles.selectionPreviewSubstance}>{t(`substances.${selectedMed.substance}`)}</Text>
                            </View>
                        </View>
                    ) : null}
                    <Button 
                        variant="primary" 
                        onClick={nextStep} 
                        disabled={isNextDisabled()}
                        style={styles.actionBtn}
                        testID="onboarding-next-button"
                    >
                        {step === 0 ? t('onboarding.start') : step === steps.length - 1 ? t('onboarding.finish') : t('common.next')}
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

    // Step 2: Units
    unitGrid: { flexDirection: 'row', gap: 12, marginTop: 24 },
    unitCard: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        borderWidth: 2,
        borderColor: '#F1F5F9',
        paddingVertical: 24,
        alignItems: 'center',
        gap: 4,
    },
    unitCardActive: { borderColor: '#EA580C', backgroundColor: '#FFF7ED' },
    unitCardLabel: { fontSize: 16, fontFamily: 'Outfit_700Bold', color: '#0F172A' },
    unitCardLabelActive: { color: '#EA580C' },
    unitCardHint: { fontSize: 12, fontFamily: 'Outfit_600SemiBold', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.5 },
    unitCardHintActive: { color: '#EA580C' },
    unitsDeviceHint: { fontSize: 12, fontFamily: 'Outfit_600SemiBold', color: '#94A3B8', textAlign: 'center', marginTop: 16 },

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
        fontFamily: 'Outfit_900Black',
        color: '#EA580C',
        fontStyle: 'italic',
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
