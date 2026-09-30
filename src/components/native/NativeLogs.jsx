import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, TextInput, Platform, PanResponder } from 'react-native';
import { Button, Modal } from './NativeUI';
import { Info, AlertCircle, UtensilsCrossed, Camera } from 'lucide-react-native';
import { userService } from '../../services/userService';
import { useTranslation } from 'react-i18next';
import { formatDate } from '../../i18n';

const FoodNoiseSlider = ({ value, onChange }) => {
    const { t } = useTranslation();
    const percentage = Math.max(0, Math.min(100, (value / 10) * 100));
    const [trackWidth, setTrackWidth] = useState(0);
    const trackWidthRef = useRef(0);
    const initialValueRef = useRef(value);
    const isDraggingRef = useRef(false);

    const propsRef = useRef({ onChange, value });
    useEffect(() => {
        propsRef.current = { onChange, value };
    }, [onChange, value]);

    useEffect(() => {
        if (!isDraggingRef.current) {
            initialValueRef.current = value;
        }
    }, [value]);

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onStartShouldSetPanResponderCapture: () => true,
            onMoveShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponderCapture: () => true,
            onPanResponderTerminationRequest: () => false,
            onPanResponderGrant: (evt, gestureState) => {
                isDraggingRef.current = true;
                const currentWidth = trackWidthRef.current;
                const { onChange: currentOnChange } = propsRef.current;
                if (currentWidth > 0) {
                    const locationX = evt.nativeEvent.locationX;
                    const pct = Math.max(0, Math.min(1, locationX / currentWidth));
                    const rawVal = pct * 10;
                    const stepped = Math.max(0, Math.min(10, Math.round(rawVal)));
                    initialValueRef.current = stepped;
                    currentOnChange(stepped);
                }
            },
            onPanResponderMove: (evt, gestureState) => {
                const currentWidth = trackWidthRef.current;
                const { onChange: currentOnChange } = propsRef.current;
                if (currentWidth > 0) {
                    const deltaPct = gestureState.dx / currentWidth;
                    const deltaVal = deltaPct * 10;
                    const rawVal = initialValueRef.current + deltaVal;
                    const stepped = Math.max(0, Math.min(10, Math.round(rawVal)));
                    currentOnChange(stepped);
                }
            },
            onPanResponderRelease: () => { isDraggingRef.current = false; },
            onPanResponderTerminate: () => { isDraggingRef.current = false; },
        })
    ).current;

    const handleLayout = (e) => {
        const w = e.nativeEvent.layout.width;
        setTrackWidth(w);
        trackWidthRef.current = w;
    };

    const getColor = () => {
        if (value <= 3) return '#EA580C';
        if (value <= 7) return '#F97316';
        return '#EF4444';
    };

    return (
        <View style={styles.sliderContainer}>
            <View style={styles.sliderRow}>
                <View 
                    style={styles.sliderTrackWrapper}
                    onLayout={handleLayout}
                    {...panResponder.panHandlers}
                >
                    <View style={styles.sliderTrackBg} pointerEvents="none" />
                    <View style={[styles.sliderTrackFill, { width: `${percentage}%`, backgroundColor: getColor() }]} pointerEvents="none" />
                    <View 
                        style={[
                            styles.sliderThumb, 
                            { 
                                left: `${percentage}%`,
                                transform: [{ translateX: -12 }],
                                borderColor: getColor()
                            }
                        ]} 
                        pointerEvents="none" 
                    />
                </View>
                <Text style={[styles.sliderValueText, { color: getColor() }]}>{value}</Text>
            </View>
            <View style={styles.sliderLabelsRow}>
                <Text style={styles.sliderLabelText}>{t('logs.quiet')}</Text>
                <Text style={styles.sliderLabelText}>{t('logs.intense')}</Text>
            </View>
        </View>
    );
};

const NativeLogs = ({ user, setUser, onScanMeal }) => {
    const { t } = useTranslation();
    const [foodNoise, setFoodNoise] = useState(3);
    const [note, setNote] = useState('');
    const [trigger, setTrigger] = useState('');
    const [selectedSymptoms, setSelectedSymptoms] = useState([]);
    const [isSaving, setIsSaving] = useState(false);
    const [showFoodNoiseInfo, setShowFoodNoiseInfo] = useState(false);
    const [showTriggerField, setShowTriggerField] = useState(false);
    const [mealLogs, setMealLogs] = useState([]);
    const [loadingMeals, setLoadingMeals] = useState(true);

    useEffect(() => {
        if (!user?.uid) { setLoadingMeals(false); return; }
        userService.getMealLogs(user.uid).then((logs) => {
            setMealLogs(logs);
            setLoadingMeals(false);
        });
    }, [user?.uid]);

    // ids are stored in sideEffectsLogs — keep them stable; labels are translated.
    const symptoms = [
        { id: 'nausea', emoji: '🤢', label: t('symptoms.nausea') },
        { id: 'vomito', emoji: '🤮', label: t('symptoms.vomito') },
        { id: 'fadiga', emoji: '🥱', label: t('symptoms.fadiga') },
        { id: 'azia', emoji: '🔥', label: t('symptoms.azia') },
        { id: 'constipação', emoji: '🧱', label: t('symptoms.constipacao') },
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
        if (foodNoise <= 7) return '#F97316';
        return '#EF4444';
    };

    const getSliderText = () => {
        if (foodNoise <= 3) return t('logs.quiet');
        if (foodNoise <= 7) return t('logs.moderate');
        return t('logs.high');
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                <Text style={styles.title}>{t('logs.title')}</Text>
                <Text style={styles.todayDate}>{(() => {
                    const today = formatDate(new Date(), { weekday: 'long', day: 'numeric', month: 'long' });
                    return today.charAt(0).toLocaleUpperCase() + today.slice(1);
                })()}</Text>

                {/* Meal History Section */}
                <View style={styles.card}>
                    <Text style={[styles.cardLabel, styles.cardLabelWithMargin]}>{t('logs.mealsTitle')}</Text>
                    {loadingMeals ? (
                        <Text style={styles.emptyMealsText}>{t('common.loading')}</Text>
                    ) : mealLogs.length === 0 ? (
                        <Text style={styles.emptyMealsText}>{t('logs.noMeals')}</Text>
                    ) : (
                        <View style={styles.mealList}>
                            {mealLogs.map((meal) => (
                                <View key={meal.id} style={styles.mealRow}>
                                    <View style={styles.mealIconWrap}>
                                        <UtensilsCrossed size={16} color="#EA580C" />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.mealDate}>
                                            {formatDate(meal.logged_at, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                        </Text>
                                        <Text style={styles.mealItemNames} numberOfLines={1}>
                                            {(meal.items || []).map((i) => i.name).join(', ') || t('logs.noItems')}
                                        </Text>
                                    </View>
                                    <View style={styles.mealMacros}>
                                        <Text style={styles.mealCalories}>{Math.round(meal.total_calories)} kcal</Text>
                                        <Text style={styles.mealMacroText}>{t('logs.macros', { p: meal.total_protein.toFixed(0), c: meal.total_carbs.toFixed(0), f: meal.total_fat.toFixed(0) })}</Text>
                                    </View>
                                </View>
                            ))}
                        </View>
                    )}
                    {onScanMeal ? (
                        <TouchableOpacity onPress={onScanMeal} style={styles.logMealBtn} activeOpacity={0.85} testID="logs-scan-meal-button">
                            <Camera size={16} color="#EA580C" />
                            <Text style={styles.logMealBtnText}>{t('logs.logMeal')}</Text>
                        </TouchableOpacity>
                    ) : null}
                </View>

                {/* Symptoms Section */}
                <View style={styles.card}>
                    <Text style={[styles.cardLabel, styles.cardLabelWithMargin]}>{t('logs.symptomsTitle')}</Text>
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
                                <Text style={styles.triggerLabel}>{t('logs.triggerLabel')}</Text>
                            </View>
                            <TextInput 
                                style={styles.triggerInput}
                                value={trigger}
                                onChangeText={setTrigger}
                                placeholder={t('logs.triggerPlaceholder')}
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
                    
                    <FoodNoiseSlider value={foodNoise} onChange={setFoodNoise} />
                </View>

                {/* Daily Note */}
                <View style={styles.card}>
                    <Text style={[styles.cardLabel, styles.cardLabelWithMargin]}>{t('logs.quickNote')}</Text>
                    <TextInput 
                        style={styles.textArea}
                        multiline
                        numberOfLines={4}
                        placeholder={t('logs.notePlaceholder')}
                        placeholderTextColor="#CBD5E1"
                        value={note}
                        onChangeText={setNote}
                    />
                </View>

                <Button 
                    onClick={handleSave} 
                    disabled={isSaving}
                    style={{ backgroundColor: '#0F172A', shadowColor: '#000', elevation: 4 }}
                >
                    {isSaving ? t('common.saving') : t('logs.save')}
                </Button>
            </ScrollView>

            {/* Modal: O que é Food Noise? */}
            <Modal visible={showFoodNoiseInfo} onClose={() => setShowFoodNoiseInfo(false)} title={t('logs.foodNoiseInfoTitle')}>
                <View style={{ gap: 12, marginVertical: 16 }}>
                    <Text style={styles.modalText}>
                        {t('logs.foodNoiseInfoIntro')}
                    </Text>
                    <View style={[styles.infoRowBadge, { backgroundColor: '#FFF7ED', borderColor: '#FFEDD5' }]}>
                        <Text style={[styles.infoRowBadgeVal, { color: '#EA580C' }]}>0-3</Text>
                        <Text style={styles.infoRowBadgeText}>
                            <Text style={{ fontFamily: 'Outfit_700Bold', color: '#9A3412' }}>{t('logs.quiet')}: </Text>
                            {t('logs.quietDesc')}
                        </Text>
                    </View>
                    <View style={[styles.infoRowBadge, { backgroundColor: '#FEF3C7', borderColor: '#FDE68A' }]}>
                        <Text style={[styles.infoRowBadgeVal, { color: '#D97706' }]}>4-7</Text>
                        <Text style={styles.infoRowBadgeText}>
                            <Text style={{ fontFamily: 'Outfit_700Bold', color: '#78350F' }}>{t('logs.moderate')}: </Text>
                            {t('logs.moderateDesc')}
                        </Text>
                    </View>
                    <View style={[styles.infoRowBadge, { backgroundColor: '#FEF2F2', borderColor: '#FEE2E2' }]}>
                        <Text style={[styles.infoRowBadgeVal, { color: '#EF4444' }]}>8-10</Text>
                        <Text style={styles.infoRowBadgeText}>
                            <Text style={{ fontFamily: 'Outfit_700Bold', color: '#7F1D1D' }}>{t('logs.high')}: </Text>
                            {t('logs.highDesc')}
                        </Text>
                    </View>
                </View>
                <Button onClick={() => setShowFoodNoiseInfo(false)} style={{ width: '100%', marginBottom: 12 }}>
                    {t('common.gotIt')}
                </Button>
            </Modal>
        </SafeAreaView>
    );
};

export default NativeLogs;

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FAF7F2' },
    scroll: { padding: 24, paddingBottom: 110 },
    title: { fontSize: 24, fontFamily: 'Outfit_900Black', color: '#0F172A', marginBottom: 4, marginTop: Platform.OS === 'android' ? 20 : 0 },
    todayDate: { fontSize: 14, fontFamily: 'Outfit_600SemiBold', color: '#EA580C', marginBottom: 20 },
    card: { 
        backgroundColor: '#FFFFFF', 
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
    cardLabel: { fontSize: 13, fontFamily: 'Outfit_700Bold', color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5 },
    cardLabelWithMargin: { marginBottom: 16 },
    symptomsGrid: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
    symptomItem: { width: '18%', aspectRatio: 1, borderRadius: 16, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 3, elevation: 1 },
    symptomActive: { backgroundColor: '#FFF7ED', borderColor: '#EA580C', borderWidth: 2 },
    emoji: { fontSize: 22, marginBottom: 2 },
    symptomLabel: { fontSize: 8, fontFamily: 'Outfit_900Black', color: '#94A3B8', textTransform: 'uppercase', textAlign: 'center' },
    symptomLabelActive: { color: '#EA580C' },

    emptyMealsText: { fontSize: 12, fontFamily: 'Outfit_600SemiBold', color: '#94A3B8', lineHeight: 18 },
    mealList: { gap: 12 },
    logMealBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 16, paddingVertical: 12, borderRadius: 16, backgroundColor: '#FFF7ED', borderWidth: 1, borderColor: '#FFEDD5' },
    logMealBtnText: { fontSize: 14, fontFamily: 'Outfit_700Bold', color: '#EA580C' },
    mealRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    mealIconWrap: { width: 36, height: 36, borderRadius: 14, backgroundColor: '#FFF7ED', justifyContent: 'center', alignItems: 'center' },
    mealDate: { fontSize: 11, fontFamily: 'Outfit_700Bold', color: '#0F172A' },
    mealItemNames: { fontSize: 11, fontFamily: 'Outfit_600SemiBold', color: '#94A3B8', marginTop: 2 },
    mealMacros: { alignItems: 'flex-end' },
    mealCalories: { fontSize: 13, fontFamily: 'Outfit_900Black', color: '#EA580C' },
    mealMacroText: { fontSize: 9, fontFamily: 'Outfit_600SemiBold', color: '#94A3B8', marginTop: 2 },

    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100 },
    badgeText: { fontSize: 10, fontFamily: 'Outfit_700Bold', color: '#fff' },

    // Custom Slider Styles
    sliderContainer: { width: '100%', marginBottom: 8 },
    sliderRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 8 },
    sliderTrackWrapper: { flex: 1, height: 24, position: 'relative', justifyContent: 'center' },
    sliderTrackBg: { height: 8, backgroundColor: '#F1F5F9', borderRadius: 4 },
    sliderTrackFill: { height: 8, borderRadius: 4, position: 'absolute', left: 0 },
    sliderThumb: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#FFFFFF', borderWidth: 2, position: 'absolute', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 2 },
    sliderValueText: { fontSize: 24, fontFamily: 'Outfit_900Black', width: 40, textAlign: 'center', tabularNums: true },
    sliderLabelsRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 2, marginTop: 4, marginRight: 56 },
    sliderLabelText: { fontSize: 10, fontFamily: 'Outfit_900Black', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.5 },

    // Note Area
    textArea: { backgroundColor: '#F8FAFC', borderRadius: 20, padding: 16, height: 100, textAlignVertical: 'top', color: '#0F172A', fontFamily: 'Outfit_600SemiBold', fontSize: 13 },

    // Trigger Field
    triggerField: { marginTop: 16, padding: 16, backgroundColor: '#FFF7ED', borderRadius: 20, borderWidth: 1, borderColor: '#FFEDD5' },
    triggerLabel: { fontSize: 10, fontFamily: 'Outfit_900Black', color: '#EA580C', textTransform: 'uppercase', letterSpacing: 0.5 },
    triggerInput: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 12, fontSize: 13, color: '#0F172A', fontFamily: 'Outfit_600SemiBold', marginTop: 8 },

    // Modal Info styles
    modalText: { fontSize: 13, fontFamily: 'Outfit_600SemiBold', color: '#475569', lineHeight: 18 },
    infoRowBadge: { flexDirection: 'row', gap: 12, padding: 12, borderRadius: 16, borderWidth: 1, alignItems: 'center' },
    infoRowBadgeVal: { fontSize: 14, fontFamily: 'Outfit_900Black', minWidth: 32 },
    infoRowBadgeText: { flex: 1, fontSize: 11, fontFamily: 'Outfit_600SemiBold', color: '#475569', lineHeight: 15 }
});
