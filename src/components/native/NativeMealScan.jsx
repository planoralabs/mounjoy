import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity, TouchableWithoutFeedback, Image, Platform, LayoutAnimation, UIManager, TextInput, Keyboard } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Camera, Images, ArrowLeft, Plus, Minus, Trash2, AlertCircle, ChevronUp, CheckCircle2, Minimize2 } from 'lucide-react-native';
import { Button, Input } from './NativeUI';
import { userService } from '../../services/userService';
import { useTranslation } from 'react-i18next';
import i18n, { unitsFor, formatNumber } from '../../i18n';
import { intakeKey } from '../../utils/journal';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

const triggerLayoutAnimation = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
};

const round1 = (n) => Math.round((n || 0) * 10) / 10;

// Macro source, in order of trust: our own food_items table (authoritative
// once seeded, see mobile_documentation.md 7.8) first; if no match, fall
// back to the per-100g estimate Gemini already returned alongside the
// identification (see 7.10) — only truly empty (manual items with no AI
// estimate and no DB match) shows nutrition: null / "sem dados".
const withNutrition = async (item) => {
    const match = await userService.findFoodItemByName(item.name);

    // rate100g is kept on the item so grams can be edited later without
    // re-querying the DB or re-calling Gemini — recompute is just
    // rate100g * (grams / 100).
    const rate100g = match
        ? { calories: match.calories_per_100g, protein: match.protein_per_100g, carbs: match.carbs_per_100g, fat: match.fat_per_100g, fiber: match.fiber_per_100g ?? item.fiberPer100g ?? 0 }
        : (item.caloriesPer100g > 0
            ? { calories: item.caloriesPer100g, protein: item.proteinPer100g || 0, carbs: item.carbsPer100g || 0, fat: item.fatPer100g || 0, fiber: item.fiberPer100g || 0 }
            : null);

    if (!rate100g) return { ...item, foodItemId: null, nutritionSource: null, rate100g: null, nutrition: null };

    return {
        ...item,
        foodItemId: match?.id || null,
        nutritionSource: match ? 'db' : 'ai',
        rate100g,
        nutrition: nutritionFor(rate100g, item.estimatedGrams),
    };
};

const nutritionFor = (rate100g, grams) => {
    const factor = grams / 100;
    return {
        calories: Math.round(rate100g.calories * factor),
        protein: round1(rate100g.protein * factor),
        carbs: round1(rate100g.carbs * factor),
        fat: round1(rate100g.fat * factor),
        fiber: round1((rate100g.fiber || 0) * factor),
    };
};

const nutritionForGrams = (item, grams) => (item.rate100g ? nutritionFor(item.rate100g, grams) : item.nutrition);

export const mealTotals = (items) => items.reduce((acc, item) => {
    const n = item.nutrition;
    if (!n) return acc;
    return {
        calories: acc.calories + (n.calories || 0),
        protein: acc.protein + (n.protein || 0),
        carbs: acc.carbs + (n.carbs || 0),
        fat: acc.fat + (n.fat || 0),
        fiber: acc.fiber + (n.fiber || 0),
    };
}, { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 });

// Typical wait for the analysis; the bar eases towards 92% over about this
// long and only fills when the result actually arrives.
const EXPECTED_MS = 9000;

/**
 * The meal scan lives above the screens (in App) so an analysis keeps
 * running when its screen is minimized: a banner above the tab bar shows
 * the photo and the progress, and tapping it reopens the result.
 */
export const useMealScan = ({ user, setUser }) => {
    const { t } = useTranslation();
    const units = unitsFor(user);
    const [visible, setVisible] = useState(false);
    const [job, setJob] = useState(null); // { status: 'analyzing' | 'review' | 'saving', photoUri, items, error, startedAt }
    const [pickError, setPickError] = useState(null);
    const [progress, setProgress] = useState(0);
    const userRef = useRef(user);
    userRef.current = user;

    useEffect(() => {
        if (job?.status !== 'analyzing') {
            setProgress(job ? 1 : 0);
            return undefined;
        }
        const tick = () => setProgress(Math.min(0.92, 1 - Math.exp(-(Date.now() - job.startedAt) / (EXPECTED_MS / 2.5))));
        tick();
        const id = setInterval(tick, 250);
        return () => clearInterval(id);
    }, [job?.status, job?.startedAt]);

    const updateJob = (patch) => setJob((prev) => (prev ? { ...prev, ...(typeof patch === 'function' ? patch(prev) : patch) } : prev));

    const pickAndAnalyze = async (source, totalWeightHint) => {
        setPickError(null);
        const permission = source === 'camera'
            ? await ImagePicker.requestCameraPermissionsAsync()
            : await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
            setPickError(source === 'camera' ? t('mealScan.permissionCamera') : t('mealScan.permissionPhotos'));
            return;
        }

        // No base64 from the picker itself — camera photos come out at full
        // sensor resolution (often 3000px+ wide), and quality here only
        // controls JPEG compression, not pixel dimensions. Resize first.
        const result = source === 'camera'
            ? await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1, 1] })
            : await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, aspect: [1, 1] });
        if (result.canceled || !result.assets?.[0]) return;

        const asset = result.assets[0];
        const startedAt = Date.now();
        setJob({ status: 'analyzing', photoUri: asset.uri, items: [], error: null, startedAt });

        try {
            const resized = await ImageManipulator.manipulateAsync(
                asset.uri,
                [{ resize: { width: 1024 } }],
                { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG, base64: true },
            );
            const weightHint = Math.min(5000, Math.max(0, Math.round(units.foodToGrams(parseFloat(totalWeightHint))) || 0)) || null;
            const detected = await userService.analyzeMealPhoto(resized.base64, 'image/jpeg', weightHint, i18n.language);
            const items = await Promise.all(
                detected.map(async (d, i) => ({
                    id: `ai-${startedAt}-${i}`,
                    ...(await withNutrition({ ...d, confirmedGrams: d.estimatedGrams, source: 'ai' })),
                }))
            );
            setJob((prev) => (prev && prev.startedAt === startedAt ? { ...prev, status: 'review', items } : prev));
        } catch (e) {
            console.error('Meal analysis failed:', e);
            const error = e.reason === 'too_frequent'
                ? t('mealScan.errors.tooFrequent')
                : e.reason === 'daily_limit_reached'
                    ? t('mealScan.errors.dailyLimit', { limit: e.limit || 20 })
                    : t('mealScan.analyzeFailed');
            setJob((prev) => (prev && prev.startedAt === startedAt ? { ...prev, status: 'review', items: [], error } : prev));
        }
    };

    const setItems = (fn) => updateJob((prev) => ({ items: fn(prev.items) }));

    const confirm = async () => {
        if (!job || job.items.length === 0) return;
        const current = userRef.current;
        const totals = mealTotals(job.items);
        const meal = {
            id: `meal-${Date.now()}`,
            logged_at: new Date().toISOString(),
            items: job.items.map((item) => ({
                name: item.name, category: item.category, grams: item.confirmedGrams,
                source: item.source, nutrition: item.nutrition,
            })),
            total_calories: Math.round(totals.calories),
            total_protein: round1(totals.protein),
            total_carbs: round1(totals.carbs),
            total_fat: round1(totals.fat),
            total_fiber: round1(totals.fiber),
        };
        updateJob({ status: 'saving', error: null });
        try {
            // Signed-in users keep meals in the meal_logs table; the local
            // ("Continue") session keeps them in its own record.
            if (current.uid) {
                await userService.saveMealLog(current.uid, {
                    items: meal.items,
                    totalCalories: meal.total_calories, totalProtein: meal.total_protein,
                    totalCarbs: meal.total_carbs, totalFat: meal.total_fat,
                });
            }
            const key = intakeKey(new Date());
            const day = current.dailyIntakeHistory?.[key] || {};
            setUser({
                ...current,
                ...(current.uid ? {} : { meals: [meal, ...(current.meals || [])] }),
                dailyIntakeHistory: {
                    ...(current.dailyIntakeHistory || {}),
                    [key]: {
                        ...day,
                        protein: round1((day.protein || 0) + totals.protein),
                        fiber: round1((day.fiber || 0) + totals.fiber),
                        fat: round1((day.fat || 0) + totals.fat),
                        carbs: round1((day.carbs || 0) + totals.carbs),
                        calories: Math.round((day.calories || 0) + totals.calories),
                    },
                },
            });
            setJob(null);
            setVisible(false);
        } catch (e) {
            console.error('Failed to save meal log:', e);
            updateJob({ status: 'review', error: t('mealScan.saveFailed') });
        }
    };

    return {
        visible,
        job,
        progress,
        pickError,
        open: () => setVisible(true),
        minimize: () => setVisible(false),
        discard: () => { setJob(null); setPickError(null); setVisible(false); },
        pickAndAnalyze,
        setItems,
        confirm,
    };
};

/** Minimized analysis: photo, status and progress, above the tab bar. */
export const MealScanBanner = ({ scan }) => {
    const { t } = useTranslation();
    const { job, progress } = scan;
    if (!job || scan.visible) return null;
    const ready = job.status !== 'analyzing';
    const failed = ready && (job.error || job.items.length === 0);
    return (
        <TouchableOpacity style={styles.banner} onPress={scan.open} activeOpacity={0.9} testID="meal-scan-banner">
            <Image source={{ uri: job.photoUri }} style={styles.bannerThumb} />
            <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.bannerTitle} numberOfLines={1}>
                    {!ready ? t('mealScan.bannerAnalyzing') : failed ? t('mealScan.bannerFailed') : t('mealScan.bannerReady')}
                </Text>
                {ready ? (
                    <Text style={styles.bannerSub} numberOfLines={1}>
                        {failed ? t('mealScan.bannerFailedSub') : t('mealScan.bannerReadySub', { count: job.items.length })}
                    </Text>
                ) : (
                    <View style={styles.bannerTrack}>
                        <View style={[styles.bannerFill, { width: `${Math.round(progress * 100)}%` }]} />
                    </View>
                )}
            </View>
            {ready
                ? (failed ? <AlertCircle size={22} color="#EF4444" /> : <CheckCircle2 size={22} color="#10B981" />)
                : <Text style={styles.bannerPct}>{Math.round(progress * 100)}%</Text>}
            <ChevronUp size={18} color="#94A3B8" />
        </TouchableOpacity>
    );
};

const MacroChips = ({ n, compact }) => {
    const { t } = useTranslation();
    const chips = [
        { key: 'protein', color: '#F97316', bg: '#FFF7ED' },
        { key: 'carbs', color: '#8B5CF6', bg: '#F5F3FF' },
        { key: 'fat', color: '#EAB308', bg: '#FEFCE8' },
        { key: 'fiber', color: '#10B981', bg: '#ECFDF5' },
    ];
    return (
        <View style={styles.chipRow}>
            {chips.map((c) => (
                <View key={c.key} style={[styles.chip, { backgroundColor: c.bg }, compact && styles.chipCompact]}>
                    <Text style={[styles.chipLabel, { color: c.color }]}>{t(`nutrients.${c.key}`)}</Text>
                    <Text style={[styles.chipValue, compact && { fontSize: 12 }]}>{formatNumber(n?.[c.key] || 0)} g</Text>
                </View>
            ))}
        </View>
    );
};

const NativeMealScan = ({ user, scan }) => {
    const { t } = useTranslation();
    // Portions are always handled in grams internally; imperial users see and
    // type ounces.
    const units = unitsFor(user);
    const { job, progress } = scan;
    const [manualName, setManualName] = useState('');
    const [manualGrams, setManualGrams] = useState('');
    const [showManualForm, setShowManualForm] = useState(false);
    const [totalWeightHint, setTotalWeightHint] = useState('');
    const [portionDrafts, setPortionDrafts] = useState({});

    const status = job ? job.status : 'idle';
    const items = job?.items || [];

    // `value` is in the user's food unit (g or oz).
    const updateGrams = (id, value) => {
        scan.setItems((prev) => prev.map((item) => {
            if (item.id !== id) return item;
            const newGrams = Math.min(5000, Math.max(0, Math.round(units.foodToGrams(parseFloat(value)) * 10) / 10 || 0));
            return { ...item, confirmedGrams: newGrams, nutrition: nutritionForGrams(item, newGrams) };
        }));
    };

    const stepGrams = (id, delta) => {
        setPortionDrafts(({ [id]: _, ...rest }) => rest);
        scan.setItems((prev) => prev.map((item) => {
            if (item.id !== id) return item;
            const newGrams = Math.min(5000, Math.max(0, Math.round((item.confirmedGrams + delta) * 10) / 10));
            return { ...item, confirmedGrams: newGrams, nutrition: nutritionForGrams(item, newGrams) };
        }));
    };

    const removeItem = (id) => {
        triggerLayoutAnimation();
        scan.setItems((prev) => prev.filter((item) => item.id !== id));
    };

    const addManualItem = async () => {
        const trimmedName = manualName.trim().slice(0, 100);
        const grams = Math.min(5000, Math.max(0, Math.round(units.foodToGrams(parseFloat(manualGrams))) || 0));
        if (!trimmedName || grams <= 0) return;
        triggerLayoutAnimation();
        const withMacros = await withNutrition({ name: trimmedName, category: 'other', estimatedGrams: grams, confidence: 1 });
        scan.setItems((prev) => [...prev, { id: `manual-${Date.now()}`, ...withMacros, confirmedGrams: grams, source: 'manual' }]);
        setManualName('');
        setManualGrams('');
        setShowManualForm(false);
    };

    const totals = mealTotals(items);
    const hasUnmatchedItems = items.some((item) => !item.nutrition);

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={job ? scan.minimize : scan.discard} style={styles.headerBtn} testID="meal-scan-back">
                    <ArrowLeft size={20} color="#EA580C" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t('mealScan.title')}</Text>
                {job ? (
                    <TouchableOpacity onPress={scan.discard} style={styles.headerBtn} testID="meal-scan-discard">
                        <Trash2 size={18} color="#EF4444" />
                    </TouchableOpacity>
                ) : <View style={styles.headerBtn} />}
            </View>

            {status === 'idle' && (
                <TouchableWithoutFeedback onPress={Platform.OS === 'web' ? undefined : Keyboard.dismiss} accessible={false}>
                    <View style={styles.centerContent}>
                        <View style={styles.placeholderIcon}>
                            <Camera size={40} color="#EA580C" />
                        </View>
                        <Text style={styles.idleTitle}>{t('mealScan.idleTitle')}</Text>
                        <Text style={styles.idleSubtitle}>{t('mealScan.idleSubtitle')}</Text>

                        <View style={styles.weightHintField}>
                            <Text style={styles.weightHintLabel}>{t('mealScan.weightHintLabel')}</Text>
                            <View style={styles.weightHintRow}>
                                <TextInput
                                    value={totalWeightHint}
                                    onChangeText={setTotalWeightHint}
                                    keyboardType="numeric"
                                    placeholder={t('common.example', { value: units.imperial ? 12 : 350 })}
                                    placeholderTextColor="#CBD5E1"
                                    style={styles.weightHintInput}
                                />
                                <Text style={styles.weightHintSuffix}>{units.foodUnit}</Text>
                            </View>
                            <Text style={styles.weightHintHint}>{t('mealScan.weightHintHint')}</Text>
                        </View>

                        {!!scan.pickError && <Text style={styles.errorText}><AlertCircle size={14} color="#EF4444" /> {scan.pickError}</Text>}
                        <View style={styles.actionRow}>
                            <Button variant="primary" onClick={() => scan.pickAndAnalyze('camera', totalWeightHint)} style={styles.actionBtn}>
                                <View style={styles.btnContent}><Camera size={18} color="#FFF" /><Text style={styles.btnContentText}>{t('mealScan.camera')}</Text></View>
                            </Button>
                            <Button variant="secondary" onClick={() => scan.pickAndAnalyze('gallery', totalWeightHint)} style={styles.actionBtn}>
                                <View style={styles.btnContent}><Images size={18} color="#334155" /><Text style={[styles.btnContentText, { color: '#334155' }]}>{t('mealScan.gallery')}</Text></View>
                            </Button>
                        </View>
                    </View>
                </TouchableWithoutFeedback>
            )}

            {status === 'analyzing' && (
                <View style={styles.centerContent}>
                    <Image source={{ uri: job.photoUri }} style={styles.analyzingPhoto} />
                    <Text style={styles.idleTitle}>{t('mealScan.analyzing')}</Text>
                    <View style={styles.progressTrack}>
                        <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` }]} />
                    </View>
                    <Text style={styles.idleSubtitle}>{t('mealScan.minimizeHint')}</Text>
                    <Button variant="secondary" onClick={scan.minimize} style={{ marginTop: 20, width: '100%' }} testID="meal-scan-minimize">
                        <View style={styles.btnContent}><Minimize2 size={18} color="#334155" /><Text style={[styles.btnContentText, { color: '#334155' }]}>{t('mealScan.minimize')}</Text></View>
                    </Button>
                </View>
            )}

            {(status === 'review' || status === 'saving') && (
                <ScrollView style={styles.reviewList} contentContainerStyle={{ paddingBottom: 24 }}>
                    <Image source={{ uri: job.photoUri }} style={styles.reviewPhoto} />

                    {!!job.error && <Text style={styles.errorText}><AlertCircle size={14} color="#EF4444" /> {job.error}</Text>}

                    {items.length > 0 && (
                        <Text style={styles.sectionLabel}>{t('mealScan.itemsTitle', { count: items.length })}</Text>
                    )}
                    {items.length === 0 && (
                        <Text style={styles.emptyText}>{t('mealScan.noItems')}</Text>
                    )}

                    {items.map((item) => (
                        <View key={item.id} style={styles.itemCard}>
                            <View style={styles.itemCardHeader}>
                                <View style={{ flex: 1, minWidth: 0 }}>
                                    <Text style={styles.itemName}>{item.name}</Text>
                                    <Text style={styles.itemCategory}>{t(`mealScan.categories.${item.category}`, { defaultValue: item.category })}</Text>
                                </View>
                                {item.nutrition
                                    ? <Text style={styles.itemCalories}>{item.nutrition.calories} kcal</Text>
                                    : <Text style={styles.itemNoData} numberOfLines={1}>{t('mealScan.noNutrition')}</Text>}
                                <TouchableOpacity onPress={() => removeItem(item.id)} style={styles.removeBtn}>
                                    <Trash2 size={16} color="#EF4444" />
                                </TouchableOpacity>
                            </View>
                            <View style={styles.gramsStepper}>
                                <TouchableOpacity onPress={() => stepGrams(item.id, -units.foodStepGrams)} style={styles.stepperBtn}>
                                    <Minus size={14} color="#EA580C" />
                                </TouchableOpacity>
                                <View style={styles.gramsField}>
                                    <TextInput
                                        value={portionDrafts[item.id] ?? String(units.food(item.confirmedGrams))}
                                        onChangeText={(v) => {
                                            // Keep the raw text while typing so "3." survives the oz → g → oz round trip.
                                            setPortionDrafts((prev) => ({ ...prev, [item.id]: v }));
                                            updateGrams(item.id, v);
                                        }}
                                        onBlur={() => setPortionDrafts(({ [item.id]: _, ...rest }) => rest)}
                                        keyboardType="numeric"
                                        placeholder="0"
                                        placeholderTextColor="#CBD5E1"
                                        style={styles.gramsInput}
                                    />
                                    <Text style={styles.gramsSuffix}>{units.foodUnit}</Text>
                                </View>
                                <TouchableOpacity onPress={() => stepGrams(item.id, units.foodStepGrams)} style={styles.stepperBtn}>
                                    <Plus size={14} color="#EA580C" />
                                </TouchableOpacity>
                            </View>
                            {item.nutrition && <MacroChips n={item.nutrition} compact />}
                        </View>
                    ))}

                    {showManualForm ? (
                        <View style={styles.manualForm}>
                            <Input label={t('mealScan.itemName')} value={manualName} onChangeText={setManualName} placeholder={t('mealScan.itemNamePlaceholder')} />
                            <Input label={t('mealScan.quantity', { unit: units.foodUnit })} value={manualGrams} onChangeText={setManualGrams} placeholder={units.imperial ? '3.5' : '100'} keyboardType="numeric" />
                            <View style={styles.actionRow}>
                                <Button variant="ghost" onClick={() => setShowManualForm(false)} style={styles.actionBtn}>{t('common.cancel')}</Button>
                                <Button variant="primary" onClick={addManualItem} style={styles.actionBtn}>{t('mealScan.add')}</Button>
                            </View>
                        </View>
                    ) : (
                        <TouchableOpacity onPress={() => setShowManualForm(true)} style={styles.addManualBtn}>
                            <Plus size={16} color="#EA580C" />
                            <Text style={styles.addManualText}>{t('mealScan.addManual')}</Text>
                        </TouchableOpacity>
                    )}

                    {hasUnmatchedItems && <Text style={styles.hintText}>{t('mealScan.unmatchedHint')}</Text>}

                    {items.length > 0 && (
                        <View style={styles.totalsCard}>
                            <Text style={styles.totalsLabel}>{t('mealScan.summaryTitle')}</Text>
                            <Text style={styles.totalsCalories}>{Math.round(totals.calories)} <Text style={styles.totalsUnit}>kcal</Text></Text>
                            <Text style={styles.totalsItems}>{t('mealScan.itemsCount', { count: items.length })}</Text>
                            <MacroChips n={totals} />
                        </View>
                    )}

                    <Button
                        variant="primary"
                        onClick={scan.confirm}
                        disabled={items.length === 0 || status === 'saving'}
                        style={styles.confirmBtn}
                        testID="meal-scan-confirm"
                    >
                        {status === 'saving' ? t('common.saving') : t('mealScan.confirm')}
                    </Button>
                </ScrollView>
            )}
        </SafeAreaView>
    );
};

export default NativeMealScan;

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FAF7F2' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: Platform.OS === 'android' ? 24 : 12, paddingBottom: 8 },
    headerBtn: { width: 40, height: 40, borderRadius: 16, backgroundColor: '#FFF7ED', justifyContent: 'center', alignItems: 'center' },
    headerTitle: { fontSize: 16, fontFamily: 'Outfit_700Bold', color: '#0F172A' },

    centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
    placeholderIcon: { width: 80, height: 80, borderRadius: 24, backgroundColor: '#FFF7ED', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
    idleTitle: { fontSize: 20, fontFamily: 'Outfit_700Bold', color: '#0F172A', textAlign: 'center', marginBottom: 8 },
    idleSubtitle: { fontSize: 14, fontFamily: 'Outfit_600SemiBold', color: '#64748B', textAlign: 'center', lineHeight: 20, marginTop: 8 },
    errorText: { fontSize: 12, fontFamily: 'Outfit_600SemiBold', color: '#EF4444', textAlign: 'center', marginTop: 12, marginBottom: 8 },

    weightHintField: { width: '100%', marginTop: 24 },
    weightHintLabel: { fontSize: 11, fontFamily: 'Outfit_900Black', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, textAlign: 'center' },
    weightHintRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
    weightHintInput: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 16, paddingVertical: 12, paddingHorizontal: 16, fontSize: 16, fontFamily: 'Outfit_700Bold', color: '#0F172A', width: 120, textAlign: 'center' },
    weightHintSuffix: { fontSize: 14, fontFamily: 'Outfit_700Bold', color: '#94A3B8' },
    weightHintHint: { fontSize: 12, fontFamily: 'Outfit_600SemiBold', color: '#64748B', textAlign: 'center', marginTop: 8 },

    actionRow: { flexDirection: 'row', gap: 12, marginTop: 24, width: '100%' },
    actionBtn: { flex: 1 },
    btnContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
    btnContentText: { fontFamily: 'Outfit_700Bold', color: '#FFFFFF', fontSize: 14 },

    analyzingPhoto: { width: 220, height: 220, borderRadius: 32, marginBottom: 20 },
    progressTrack: { width: '100%', height: 10, borderRadius: 5, backgroundColor: '#FFEDD5', overflow: 'hidden', marginTop: 8 },
    progressFill: { height: '100%', borderRadius: 5, backgroundColor: '#EA580C' },

    reviewList: { flex: 1, paddingHorizontal: 20 },
    reviewPhoto: { width: '100%', height: 200, borderRadius: 24, marginTop: 8, marginBottom: 16 },
    sectionLabel: { fontSize: 11, fontFamily: 'Outfit_900Black', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10, marginLeft: 4 },
    emptyText: { fontSize: 13, fontFamily: 'Outfit_600SemiBold', color: '#94A3B8', textAlign: 'center', marginVertical: 16 },

    itemCard: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: '#F1F5F9', gap: 12 },
    itemCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    itemName: { fontSize: 15, fontFamily: 'Outfit_700Bold', color: '#0F172A' },
    itemCategory: { fontSize: 11, fontFamily: 'Outfit_600SemiBold', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 2 },
    removeBtn: { width: 32, height: 32, borderRadius: 12, backgroundColor: '#FEF2F2', justifyContent: 'center', alignItems: 'center' },
    gramsStepper: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    stepperBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#FFF7ED', justifyContent: 'center', alignItems: 'center' },
    gramsField: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 14, paddingHorizontal: 10, paddingVertical: 8, width: 84 },
    gramsInput: { flex: 1, minWidth: 0, fontSize: 14, fontFamily: 'Outfit_700Bold', color: '#0F172A', padding: 0, textAlign: 'center' },
    gramsSuffix: { fontSize: 12, fontFamily: 'Outfit_700Bold', color: '#94A3B8' },
    itemCalories: { fontSize: 15, fontFamily: 'Outfit_900Black', color: '#EA580C', flexShrink: 0 },
    itemNoData: { fontSize: 10, fontFamily: 'Outfit_600SemiBold', color: '#CBD5E1', flexShrink: 1, textAlign: 'right' },

    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    chip: { flexGrow: 1, minWidth: '22%', borderRadius: 12, paddingVertical: 6, paddingHorizontal: 8, alignItems: 'center' },
    chipCompact: { paddingVertical: 4 },
    chipLabel: { fontSize: 9, fontFamily: 'Outfit_900Black', textTransform: 'uppercase', letterSpacing: 0.3 },
    chipValue: { fontSize: 14, fontFamily: 'Outfit_900Black', color: '#0F172A', marginTop: 1 },

    manualForm: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#F1F5F9' },
    addManualBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, marginBottom: 8 },
    addManualText: { fontSize: 13, fontFamily: 'Outfit_700Bold', color: '#EA580C' },

    hintText: { fontSize: 11, fontFamily: 'Outfit_600SemiBold', color: '#94A3B8', textAlign: 'center', marginBottom: 16, lineHeight: 16 },

    totalsCard: { backgroundColor: '#FFFFFF', borderRadius: 28, padding: 20, alignItems: 'center', marginBottom: 20, borderWidth: 2, borderColor: '#FED7AA', gap: 4 },
    totalsLabel: { fontSize: 11, fontFamily: 'Outfit_900Black', color: '#EA580C', textTransform: 'uppercase', letterSpacing: 1 },
    totalsCalories: { fontSize: 34, fontFamily: 'Outfit_900Black', color: '#0F172A' },
    totalsUnit: { fontSize: 16, color: '#94A3B8' },
    totalsItems: { fontSize: 12, fontFamily: 'Outfit_600SemiBold', color: '#94A3B8', marginBottom: 10 },

    confirmBtn: { width: '100%' },

    banner: {
        position: 'absolute',
        left: 16,
        right: 16,
        bottom: (Platform.OS === 'ios' ? 32 : 24) + 70 + 10,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        padding: 10,
        paddingRight: 14,
        borderWidth: 1,
        borderColor: '#FED7AA',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.12,
        shadowRadius: 14,
        elevation: 9,
    },
    bannerThumb: { width: 46, height: 46, borderRadius: 14, backgroundColor: '#F1F5F9' },
    bannerTitle: { fontSize: 13, fontFamily: 'Outfit_900Black', color: '#0F172A' },
    bannerSub: { fontSize: 11, fontFamily: 'Outfit_600SemiBold', color: '#64748B', marginTop: 2 },
    bannerTrack: { height: 6, borderRadius: 3, backgroundColor: '#FFEDD5', overflow: 'hidden', marginTop: 6 },
    bannerFill: { height: '100%', borderRadius: 3, backgroundColor: '#EA580C' },
    bannerPct: { fontSize: 12, fontFamily: 'Outfit_900Black', color: '#EA580C' },
});
