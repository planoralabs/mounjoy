import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity, TouchableWithoutFeedback, Image, Platform, LayoutAnimation, UIManager, TextInput, Keyboard } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Camera, Images, ArrowLeft, Plus, Minus, Trash2, AlertCircle, ChevronUp, CheckCircle2, Minimize2, Search, UtensilsCrossed, ChevronRight } from 'lucide-react-native';
import { Button } from './NativeUI';
import { FoodSearchModal } from './NativeFoodSearch';
import { userService } from '../../services/userService';
import { useTranslation } from 'react-i18next';
import i18n, { unitsFor, formatNumber, formatDate } from '../../i18n';
import { intakeKey, recordDateFor, isSameDay } from '../../utils/journal';
import { round1, nutritionFor, mealTotals } from '../../utils/nutrition';
import { findFoodForScan } from '../../services/FoodService';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

const triggerLayoutAnimation = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
};

// Macro source, in order of trust: our own food_items table (authoritative
// once seeded, see docs/historico/mobile_documentation.md 7.8) first; if no match, fall
// back to the per-100g estimate Gemini already returned alongside the
// identification (see 7.10) — only truly empty (manual items with no AI
// estimate and no DB match) shows nutrition: null / "sem dados".
const withNutrition = async (item) => {
    const match = await findFoodForScan(item.name, i18n.language).catch(() => null);

    // rate100g is kept on the item so grams can be edited later without
    // re-querying the DB or re-calling Gemini — recompute is just
    // rate100g * (grams / 100).
    const rate100g = match
        ? { ...match.rate100g, fiber: match.rate100g.fiber || item.fiberPer100g || 0 }
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

// A typed meal with nothing in it yet isn't kept: closing it cancels it.
const isEmptyManual = (job) => !!job?.manual && job.items.length === 0;

const nutritionForGrams = (item, grams) => (item.rate100g ? nutritionFor(item.rate100g, grams) : item.nutrition);

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
    // Day the meal belongs to (opened from a past day in the Journal); null = today.
    const [mealDate, setMealDate] = useState(null);
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
                    : e.reason === 'global_limit_reached'
                        ? t('mealScan.errors.globalLimit')
                        : t('mealScan.analyzeFailed');
            setJob((prev) => (prev && prev.startedAt === startedAt ? { ...prev, status: 'review', items: [], error } : prev));
        }
    };

    const setItems = (fn) => updateJob((prev) => ({ items: fn(prev.items) }));

    // Typed meal: straight to the review list, empty, with no photo.
    const startManual = () => {
        setPickError(null);
        setJob({ status: 'review', manual: true, photoUri: null, items: [], error: null, startedAt: Date.now() });
    };

    const confirm = async () => {
        if (!job || job.items.length === 0) return;
        const current = userRef.current;
        const totals = mealTotals(job.items);
        const loggedAt = recordDateFor(mealDate);
        const meal = {
            id: `meal-${Date.now()}`,
            logged_at: loggedAt,
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
                    loggedAt,
                    items: meal.items,
                    totalCalories: meal.total_calories, totalProtein: meal.total_protein,
                    totalCarbs: meal.total_carbs, totalFat: meal.total_fat, totalFiber: meal.total_fiber,
                });
            }
            const key = intakeKey(loggedAt);
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
            setMealDate(null);
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
        mealDate,
        // `date` = past day picked in the Journal. A scan already in progress
        // keeps the day it was started for.
        open: (date = null) => {
            if (!job) setMealDate(date && !isSameDay(date, new Date()) ? date : null);
            setVisible(true);
        },
        minimize: () => {
            if (isEmptyManual(job)) { setJob(null); setMealDate(null); }
            setVisible(false);
        },
        discard: () => { setJob(null); setMealDate(null); setPickError(null); setVisible(false); },
        // Search closed without adding anything: back to choosing photo or typing.
        cancelEmptyManual: () => setJob((prev) => (isEmptyManual(prev) ? null : prev)),
        pickAndAnalyze,
        setItems,
        confirm,
        startManual,
        setUser,
    };
};

/** Minimized analysis: photo, status and progress, above the tab bar. */
export const MealScanBanner = ({ scan }) => {
    const { t } = useTranslation();
    const { job, progress } = scan;
    if (!job || scan.visible || isEmptyManual(job)) return null;
    const ready = job.status !== 'analyzing';
    const failed = ready && (job.error || job.items.length === 0);
    return (
        <TouchableOpacity style={styles.banner} onPress={() => scan.open()} activeOpacity={0.9} testID="meal-scan-banner">
            {job.photoUri
                ? <Image source={{ uri: job.photoUri }} style={styles.bannerThumb} />
                : <View style={[styles.bannerThumb, styles.bannerIcon]}><UtensilsCrossed size={20} color="#EA580C" /></View>}
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
    const [showSearch, setShowSearch] = useState(false);
    const [totalWeightHint, setTotalWeightHint] = useState('');
    const [portionDrafts, setPortionDrafts] = useState({});
    // Before anything is started: null = choose photo or typing, 'photo' = camera/gallery.
    const [mode, setMode] = useState(null);

    useEffect(() => {
        if (scan.visible && !job) setMode(null);
    }, [scan.visible]);

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

    const addFood = (item) => {
        triggerLayoutAnimation();
        scan.setItems((prev) => [...prev, item]);
    };

    const startManual = () => {
        scan.startManual();
        setShowSearch(true);
    };

    const totals = mealTotals(items);
    const hasUnmatchedItems = items.some((item) => !item.nutrition);

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={job ? scan.minimize : mode ? () => setMode(null) : scan.discard} style={styles.headerBtn} testID="meal-scan-back">
                    <ArrowLeft size={20} color="#EA580C" />
                </TouchableOpacity>
                <View style={{ alignItems: 'center' }}>
                    <Text style={styles.headerTitle}>{job ? (job.manual ? t('foodSearch.mealTitle') : t('mealScan.title')) : mode === 'photo' ? t('mealScan.title') : t('foodSearch.mealTitle')}</Text>
                    {!!scan.mealDate && (
                        <Text style={styles.headerDay}>{t('log.forDay', { day: formatDate(scan.mealDate, { day: 'numeric', month: 'long' }) })}</Text>
                    )}
                </View>
                {job ? (
                    <TouchableOpacity onPress={scan.discard} style={styles.headerBtn} testID="meal-scan-discard">
                        <Trash2 size={18} color="#EF4444" />
                    </TouchableOpacity>
                ) : <View style={styles.headerBtn} />}
            </View>

            {status === 'idle' && !mode && (
                <View style={styles.centerContent}>
                    <Text style={styles.idleTitle}>{t('mealScan.chooseTitle')}</Text>
                    <Text style={[styles.idleSubtitle, { marginTop: 0, marginBottom: 24 }]}>{t('mealScan.chooseSub')}</Text>
                    <TouchableOpacity onPress={() => setMode('photo')} style={styles.typeBtn} activeOpacity={0.85} testID="meal-mode-photo">
                        <View style={styles.optionIcon}><Camera size={22} color="#EA580C" /></View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.typeTitle}>{t('mealScan.photoOption')}</Text>
                            <Text style={styles.typeSub}>{t('mealScan.photoOptionSub')}</Text>
                        </View>
                        <ChevronRight size={18} color="#CBD5E1" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={startManual} style={styles.typeBtn} activeOpacity={0.85} testID="meal-type-foods">
                        <View style={styles.optionIcon}><Search size={22} color="#EA580C" /></View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.typeTitle}>{t('foodSearch.typeTitle')}</Text>
                            <Text style={styles.typeSub}>{t('foodSearch.typeSub')}</Text>
                        </View>
                        <ChevronRight size={18} color="#CBD5E1" />
                    </TouchableOpacity>
                </View>
            )}

            {status === 'idle' && mode === 'photo' && (
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
                    {!!job.photoUri && <Image source={{ uri: job.photoUri }} style={styles.reviewPhoto} />}

                    {!!job.error && <Text style={styles.errorText}><AlertCircle size={14} color="#EF4444" /> {job.error}</Text>}

                    {items.length > 0 && (
                        <Text style={styles.sectionLabel}>{t(job.manual ? 'foodSearch.itemsTitle' : 'mealScan.itemsTitle', { count: items.length })}</Text>
                    )}
                    {items.length === 0 && (
                        <Text style={styles.emptyText}>{job.manual ? t('foodSearch.emptyMeal') : t('mealScan.noItems')}</Text>
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

                    <TouchableOpacity onPress={() => setShowSearch(true)} style={styles.addManualBtn} testID="meal-add-food">
                        <View style={styles.addManualIcon}><Plus size={14} color="#FFFFFF" strokeWidth={3} /></View>
                        <Text style={styles.addManualText}>{t('foodSearch.addFood')}</Text>
                    </TouchableOpacity>

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
                    {/* The one place the food data sources are credited (photo and typed meals both end here) */}
                    <Text style={styles.credits}>{t('foodSearch.credits')}</Text>
                </ScrollView>
            )}
            <FoodSearchModal visible={showSearch} onClose={() => { setShowSearch(false); scan.cancelEmptyManual(); }} onAdd={addFood} user={user} setUser={scan.setUser} />
        </SafeAreaView>
    );
};

export default NativeMealScan;

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FAF7F2' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: Platform.OS === 'android' ? 24 : 12, paddingBottom: 8 },
    headerBtn: { width: 40, height: 40, borderRadius: 16, backgroundColor: '#FFF7ED', justifyContent: 'center', alignItems: 'center' },
    headerTitle: { fontSize: 16, fontFamily: 'Outfit_700Bold', color: '#0F172A' },
    headerDay: { fontSize: 11, fontFamily: 'Outfit_700Bold', color: '#EA580C', marginTop: 2 },

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
    gramsStepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
    stepperBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#FFF7ED', justifyContent: 'center', alignItems: 'center' },
    gramsField: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 14, paddingHorizontal: 10, paddingVertical: 8, width: 84 },
    gramsInput: { flex: 1, minWidth: 0, fontSize: 14, fontFamily: 'Outfit_700Bold', color: '#0F172A', padding: 0, textAlign: 'center' },
    gramsSuffix: { fontSize: 12, fontFamily: 'Outfit_700Bold', color: '#94A3B8' },
    itemCalories: { fontSize: 15, fontFamily: 'Outfit_900Black', color: '#EA580C', flexShrink: 0 },
    itemNoData: { fontSize: 10, fontFamily: 'Outfit_600SemiBold', color: '#CBD5E1', flexShrink: 1, textAlign: 'right' },

    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    chip: { width: '45%', flexGrow: 1, borderRadius: 12, paddingVertical: 6, paddingHorizontal: 8, alignItems: 'center' },
    chipCompact: { paddingVertical: 4 },
    chipLabel: { fontSize: 9, fontFamily: 'Outfit_900Black', textTransform: 'uppercase', letterSpacing: 0.3 },
    chipValue: { fontSize: 14, fontFamily: 'Outfit_900Black', color: '#0F172A', marginTop: 1 },

    addManualBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, marginTop: 2, marginBottom: 16, borderRadius: 20, borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#FDBA74', backgroundColor: '#FFF7ED' },
    addManualIcon: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#EA580C', alignItems: 'center', justifyContent: 'center' },
    addManualText: { fontSize: 14, fontFamily: 'Outfit_900Black', color: '#EA580C' },

    hintText: { fontSize: 11, fontFamily: 'Outfit_600SemiBold', color: '#94A3B8', textAlign: 'center', marginBottom: 16, lineHeight: 16 },

    totalsCard: { backgroundColor: '#FFFFFF', borderRadius: 28, padding: 20, alignItems: 'center', marginBottom: 20, borderWidth: 2, borderColor: '#FED7AA', gap: 4 },
    totalsLabel: { fontSize: 11, fontFamily: 'Outfit_900Black', color: '#EA580C', textTransform: 'uppercase', letterSpacing: 1 },
    totalsCalories: { fontSize: 34, fontFamily: 'Outfit_900Black', color: '#0F172A' },
    totalsUnit: { fontSize: 16, color: '#94A3B8' },
    totalsItems: { fontSize: 12, fontFamily: 'Outfit_600SemiBold', color: '#94A3B8', marginBottom: 10 },

    confirmBtn: { width: '100%' },
    credits: { fontSize: 10, fontFamily: 'Outfit_600SemiBold', color: '#94A3B8', textAlign: 'center', marginTop: 14, lineHeight: 14 },

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
    bannerIcon: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF7ED' },
    typeBtn: { flexDirection: 'row', alignItems: 'center', gap: 14, width: '100%', marginTop: 12, padding: 16, borderRadius: 24, backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: '#FED7AA' },
    optionIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: '#FFF7ED', justifyContent: 'center', alignItems: 'center' },
    typeTitle: { fontSize: 15, fontFamily: 'Outfit_700Bold', color: '#0F172A' },
    typeSub: { fontSize: 11, fontFamily: 'Outfit_600SemiBold', color: '#64748B', marginTop: 2 },
    bannerTitle: { fontSize: 13, fontFamily: 'Outfit_900Black', color: '#0F172A' },
    bannerSub: { fontSize: 11, fontFamily: 'Outfit_600SemiBold', color: '#64748B', marginTop: 2 },
    bannerTrack: { height: 6, borderRadius: 3, backgroundColor: '#FFEDD5', overflow: 'hidden', marginTop: 6 },
    bannerFill: { height: '100%', borderRadius: 3, backgroundColor: '#EA580C' },
    bannerPct: { fontSize: 12, fontFamily: 'Outfit_900Black', color: '#EA580C' },
});
