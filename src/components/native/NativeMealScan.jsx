import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity, TouchableWithoutFeedback, Image, ActivityIndicator, Platform, LayoutAnimation, UIManager, TextInput, Keyboard } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Camera, Images, ArrowLeft, X, Plus, Minus, Trash2, AlertCircle } from 'lucide-react-native';
import { Button, Input } from './NativeUI';
import { userService } from '../../services/userService';
import { useTranslation } from 'react-i18next';
import i18n, { unitsFor, formatNumber } from '../../i18n';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

const triggerLayoutAnimation = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
};

// Macro source, in order of trust: our own food_items table (authoritative
// once seeded, see mobile_documentation.md 7.8) first; if no match, fall
// back to the per-100g estimate Gemini already returned alongside the
// identification (see 7.10) — only truly empty (manual items with no AI
// estimate and no DB match) shows nutrition: null / "sem dados".
const withNutrition = async (item) => {
    const match = await userService.findFoodItemByName(item.name);
    const factor = item.estimatedGrams / 100;

    // rate100g is kept on the item so grams can be edited later without
    // re-querying the DB or re-calling Gemini — recompute is just
    // rate100g * (grams / 100).
    const rate100g = match
        ? { calories: match.calories_per_100g, protein: match.protein_per_100g, carbs: match.carbs_per_100g, fat: match.fat_per_100g }
        : (item.caloriesPer100g > 0
            ? { calories: item.caloriesPer100g, protein: item.proteinPer100g || 0, carbs: item.carbsPer100g || 0, fat: item.fatPer100g || 0 }
            : null);

    if (!rate100g) return { ...item, foodItemId: null, nutritionSource: null, rate100g: null, nutrition: null };

    return {
        ...item,
        foodItemId: match?.id || null,
        nutritionSource: match ? 'db' : 'ai',
        rate100g,
        nutrition: {
            calories: Math.round(rate100g.calories * factor),
            protein: Math.round(rate100g.protein * factor * 10) / 10,
            carbs: Math.round(rate100g.carbs * factor * 10) / 10,
            fat: Math.round(rate100g.fat * factor * 10) / 10,
        },
    };
};

const nutritionForGrams = (item, grams) => {
    if (!item.rate100g) return item.nutrition;
    const factor = grams / 100;
    return {
        calories: Math.round(item.rate100g.calories * factor),
        protein: Math.round(item.rate100g.protein * factor * 10) / 10,
        carbs: Math.round(item.rate100g.carbs * factor * 10) / 10,
        fat: Math.round(item.rate100g.fat * factor * 10) / 10,
    };
};

const NativeMealScan = ({ user, setUser, onClose }) => {
    const { t } = useTranslation();
    // Portions are always handled in grams internally; imperial users see and
    // type ounces.
    const units = unitsFor(user);
    const [photoUri, setPhotoUri] = useState(null);
    const [status, setStatus] = useState('idle'); // idle | analyzing | review | saving
    const [items, setItems] = useState([]);
    const [error, setError] = useState(null);
    const [manualName, setManualName] = useState('');
    const [manualGrams, setManualGrams] = useState('');
    const [showManualForm, setShowManualForm] = useState(false);
    const [totalWeightHint, setTotalWeightHint] = useState('');
    const [portionDrafts, setPortionDrafts] = useState({});

    const pickAndAnalyze = async (source) => {
        setError(null);
        const permission = source === 'camera'
            ? await ImagePicker.requestCameraPermissionsAsync()
            : await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (!permission.granted) {
            setError(source === 'camera' ? t('mealScan.permissionCamera') : t('mealScan.permissionPhotos'));
            return;
        }

        // No base64 from the picker itself — camera photos come out at full
        // sensor resolution (often 3000px+ wide), and quality here only
        // controls JPEG compression, not pixel dimensions. Sending that
        // straight to the Edge Function was the main source of the slow
        // "analisando..." wait (large base64 upload over mobile data).
        // Resize down first instead.
        const result = source === 'camera'
            ? await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1, 1] })
            : await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, aspect: [1, 1] });

        if (result.canceled || !result.assets?.[0]) return;

        const asset = result.assets[0];
        setPhotoUri(asset.uri);
        setStatus('analyzing');

        try {
            const t0 = Date.now();
            const resized = await ImageManipulator.manipulateAsync(
                asset.uri,
                [{ resize: { width: 1024 } }],
                { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG, base64: true },
            );
            const t1 = Date.now();
            console.log(`[meal-scan] resize: ${t1 - t0}ms, base64 length: ${resized.base64?.length}`);

            const weightHint = Math.min(5000, Math.max(0, Math.round(units.foodToGrams(parseFloat(totalWeightHint))) || 0)) || null;
            const detected = await userService.analyzeMealPhoto(resized.base64, 'image/jpeg', weightHint, i18n.language);
            console.log(`[meal-scan] analyze request: ${Date.now() - t1}ms, items: ${detected.length}`);
            const withMacros = await Promise.all(
                detected.map(async (d, i) => ({
                    id: `ai-${Date.now()}-${i}`,
                    ...(await withNutrition({ ...d, confirmedGrams: d.estimatedGrams, source: 'ai' })),
                }))
            );
            setItems(withMacros);
            setStatus('review');
        } catch (e) {
            console.error('Meal analysis failed:', e);
            setError(e.reason === 'too_frequent'
                ? t('mealScan.errors.tooFrequent')
                : e.reason === 'daily_limit_reached'
                    ? t('mealScan.errors.dailyLimit', { limit: e.limit || 20 })
                    : t('mealScan.analyzeFailed'));
            setItems([]);
            setStatus('review');
        }
    };

    // `value` is in the user's food unit (g or oz).
    const updateGrams = (id, value) => {
        setItems((prev) => prev.map((item) => {
            if (item.id !== id) return item;
            const newGrams = Math.min(5000, Math.max(0, Math.round(units.foodToGrams(parseFloat(value)) * 10) / 10 || 0));
            return { ...item, confirmedGrams: newGrams, nutrition: nutritionForGrams(item, newGrams) };
        }));
    };

    const stepGrams = (id, delta) => {
        setPortionDrafts(({ [id]: _, ...rest }) => rest);
        setItems((prev) => prev.map((item) => {
            if (item.id !== id) return item;
            const newGrams = Math.min(5000, Math.max(0, Math.round((item.confirmedGrams + delta) * 10) / 10));
            return { ...item, confirmedGrams: newGrams, nutrition: nutritionForGrams(item, newGrams) };
        }));
    };

    const removeItem = (id) => {
        triggerLayoutAnimation();
        setItems((prev) => prev.filter((item) => item.id !== id));
    };

    const addManualItem = async () => {
        const trimmedName = manualName.trim().slice(0, 100);
        const grams = Math.min(5000, Math.max(0, Math.round(units.foodToGrams(parseFloat(manualGrams))) || 0));
        if (!trimmedName || grams <= 0) return;
        triggerLayoutAnimation();
        const withMacros = await withNutrition({
            name: trimmedName, category: 'other', estimatedGrams: grams, confidence: 1,
        });
        setItems((prev) => [...prev, { id: `manual-${Date.now()}`, ...withMacros, confirmedGrams: grams, source: 'manual' }]);
        setManualName('');
        setManualGrams('');
        setShowManualForm(false);
    };

    const totals = items.reduce((acc, item) => {
        if (!item.nutrition) return acc;
        return {
            calories: acc.calories + item.nutrition.calories,
            protein: acc.protein + item.nutrition.protein,
            carbs: acc.carbs + item.nutrition.carbs,
            fat: acc.fat + item.nutrition.fat,
        };
    }, { calories: 0, protein: 0, carbs: 0, fat: 0 });

    const hasUnmatchedItems = items.some((item) => !item.nutrition);

    const confirmMeal = async () => {
        if (items.length === 0) return;
        setStatus('saving');
        try {
            // Guests have no row in `profiles`, so meal_logs (FK'd to it)
            // can't accept their entries yet — only persist history for
            // logged-in users. Guests still get the local protein bump
            // below. TEMPORARY until anonymous sign-in is wired up (see
            // mobile_documentation.md 7.9).
            if (user.uid) {
                await userService.saveMealLog(user.uid, {
                    items: items.map((item) => ({
                        name: item.name, category: item.category, grams: item.confirmedGrams,
                        source: item.source, nutrition: item.nutrition,
                    })),
                    totalCalories: totals.calories, totalProtein: totals.protein,
                    totalCarbs: totals.carbs, totalFat: totals.fat,
                });
            }

            if (totals.protein > 0) {
                const todayStr = new Date().toISOString().split('T')[0];
                const currentProtein = (user.dailyIntakeHistory?.[todayStr]?.protein) || 0;
                setUser({
                    ...user,
                    dailyIntakeHistory: {
                        ...(user.dailyIntakeHistory || {}),
                        [todayStr]: {
                            ...(user.dailyIntakeHistory?.[todayStr] || {}),
                            protein: parseFloat((currentProtein + totals.protein).toFixed(1)),
                        },
                    },
                });
            }

            onClose();
        } catch (e) {
            console.error('Failed to save meal log:', e);
            setError(t('mealScan.saveFailed'));
            setStatus('review');
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={onClose} style={styles.headerBtn}>
                    <ArrowLeft size={20} color="#EA580C" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t('mealScan.title')}</Text>
                <View style={styles.headerBtn} />
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

                    {!!error && <Text style={styles.errorText}><AlertCircle size={14} color="#EF4444" /> {error}</Text>}
                    <View style={styles.actionRow}>
                        <Button variant="primary" onClick={() => pickAndAnalyze('camera')} style={styles.actionBtn}>
                            <View style={styles.btnContent}><Camera size={18} color="#FFF" /><Text style={styles.btnContentText}>{t('mealScan.camera')}</Text></View>
                        </Button>
                        <Button variant="secondary" onClick={() => pickAndAnalyze('gallery')} style={styles.actionBtn}>
                            <View style={styles.btnContent}><Images size={18} color="#334155" /><Text style={[styles.btnContentText, { color: '#334155' }]}>{t('mealScan.gallery')}</Text></View>
                        </Button>
                    </View>
                </View>
                </TouchableWithoutFeedback>
            )}

            {status === 'analyzing' && (
                <View style={styles.centerContent}>
                    {!!photoUri && <Image source={{ uri: photoUri }} style={styles.analyzingPhoto} />}
                    <ActivityIndicator color="#EA580C" size="large" style={{ marginTop: 24 }} />
                    <Text style={styles.idleSubtitle}>{t('mealScan.analyzing')}</Text>
                </View>
            )}

            {(status === 'review' || status === 'saving') && (
                <ScrollView style={styles.reviewList} contentContainerStyle={{ paddingBottom: 24 }}>
                    {!!photoUri && <Image source={{ uri: photoUri }} style={styles.reviewPhoto} />}

                    {!!error && <Text style={styles.errorText}><AlertCircle size={14} color="#EF4444" /> {error}</Text>}

                    {items.length === 0 && (
                        <Text style={styles.emptyText}>{t('mealScan.noItems')}</Text>
                    )}

                    {items.map((item) => (
                        <View key={item.id} style={styles.itemCard}>
                            <View style={styles.itemCardHeader}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.itemName}>{item.name}</Text>
                                    <Text style={styles.itemCategory}>{t(`mealScan.categories.${item.category}`, { defaultValue: item.category })}</Text>
                                </View>
                                <TouchableOpacity onPress={() => removeItem(item.id)} style={styles.removeBtn}>
                                    <Trash2 size={16} color="#EF4444" />
                                </TouchableOpacity>
                            </View>
                            <View style={styles.itemCardBody}>
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
                                {item.nutrition ? (
                                    <Text style={styles.itemCalories}>{item.nutrition.calories} kcal</Text>
                                ) : (
                                    <Text style={styles.itemNoData} numberOfLines={1}>{t('mealScan.noNutrition')}</Text>
                                )}
                            </View>
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

                    {hasUnmatchedItems && (
                        <Text style={styles.hintText}>
                            {t('mealScan.unmatchedHint')}
                        </Text>
                    )}

                    <View style={styles.totalsCard}>
                        <Text style={styles.totalsLabel}>{t('mealScan.total')}</Text>
                        <Text style={styles.totalsCalories}>{Math.round(totals.calories)} kcal</Text>
                        <View style={styles.macroRow}>
                            <Text style={styles.macroText}>{t('mealScan.proteinMacro', { value: formatNumber(totals.protein) })}</Text>
                            <Text style={styles.macroText}>{t('mealScan.carbsMacro', { value: formatNumber(totals.carbs) })}</Text>
                            <Text style={styles.macroText}>{t('mealScan.fatMacro', { value: formatNumber(totals.fat) })}</Text>
                        </View>
                    </View>

                    <Button
                        variant="primary"
                        onClick={confirmMeal}
                        disabled={items.length === 0 || status === 'saving'}
                        style={styles.confirmBtn}
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

    analyzingPhoto: { width: 220, height: 220, borderRadius: 32 },

    reviewList: { flex: 1, paddingHorizontal: 20 },
    reviewPhoto: { width: '100%', height: 200, borderRadius: 24, marginTop: 8, marginBottom: 16 },
    emptyText: { fontSize: 13, fontFamily: 'Outfit_600SemiBold', color: '#94A3B8', textAlign: 'center', marginVertical: 16 },

    itemCard: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: '#F1F5F9' },
    itemCardHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
    itemName: { fontSize: 15, fontFamily: 'Outfit_700Bold', color: '#0F172A' },
    itemCategory: { fontSize: 11, fontFamily: 'Outfit_600SemiBold', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 2 },
    removeBtn: { width: 32, height: 32, borderRadius: 12, backgroundColor: '#FEF2F2', justifyContent: 'center', alignItems: 'center' },
    itemCardBody: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
    gramsStepper: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    stepperBtn: {
        width: 28,
        height: 28,
        borderRadius: 10,
        backgroundColor: '#FFF7ED',
        justifyContent: 'center',
        alignItems: 'center',
    },
    gramsField: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 14,
        paddingHorizontal: 10,
        paddingVertical: 8,
        width: 72,
    },
    gramsInput: { flex: 1, fontSize: 14, fontFamily: 'Outfit_700Bold', color: '#0F172A', padding: 0, textAlign: 'center' },
    gramsSuffix: { fontSize: 12, fontFamily: 'Outfit_700Bold', color: '#94A3B8' },
    itemCalories: { fontSize: 13, fontFamily: 'Outfit_700Bold', color: '#EA580C', flexShrink: 0 },
    itemNoData: { fontSize: 10, fontFamily: 'Outfit_600SemiBold', color: '#CBD5E1', flexShrink: 1, textAlign: 'right' },

    manualForm: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#F1F5F9' },
    addManualBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, marginBottom: 16 },
    addManualText: { fontSize: 13, fontFamily: 'Outfit_700Bold', color: '#EA580C' },

    hintText: { fontSize: 11, fontFamily: 'Outfit_600SemiBold', color: '#94A3B8', textAlign: 'center', marginBottom: 16, lineHeight: 16 },

    totalsCard: { backgroundColor: '#FFF7ED', borderRadius: 24, padding: 20, alignItems: 'center', marginBottom: 20 },
    totalsLabel: { fontSize: 11, fontFamily: 'Outfit_900Black', color: '#EA580C', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
    totalsCalories: { fontSize: 28, fontFamily: 'Outfit_900Black', color: '#0F172A' },
    macroRow: { flexDirection: 'row', gap: 16, marginTop: 8 },
    macroText: { fontSize: 12, fontFamily: 'Outfit_700Bold', color: '#64748B' },

    confirmBtn: { width: '100%' },
});
