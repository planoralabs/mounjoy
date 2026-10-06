import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Platform } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Search, ScanBarcode, Plus, Minus, ChevronRight, ArrowLeft, Clock, PencilLine, X } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Modal, Button } from './NativeUI';
import { unitsFor, formatNumber } from '../../i18n';
import { nutritionFor } from '../../utils/nutrition';
import { searchFoods, loadRecentFoods, rememberFood, lookupBarcode, customFoodToItem } from '../../services/FoodService';

// Manual meal log: search the reference base (TACO / USDA), the user's own
// foods or a barcode (Open Food Facts), pick the amount eaten and add the item
// to the meal being reviewed. Nutrients are computed from the per-100 g values.

const SOURCE_LABEL = { taco: 'TACO', usda: 'USDA', openfoodfacts: 'Open Food Facts', custom: null };
const barcodeSupported = Platform.OS === 'ios' || Platform.OS === 'android';

const parseNum = (v) => {
    const n = parseFloat(String(v).replace(',', '.'));
    return Number.isFinite(n) && n >= 0 ? n : 0;
};

const MacroLine = ({ n }) => {
    const { t } = useTranslation();
    return (
        <View style={styles.macroLine}>
            {[['protein', '#F97316'], ['carbs', '#8B5CF6'], ['fat', '#EAB308'], ['fiber', '#10B981']].map(([k, color]) => (
                <View key={k} style={styles.macroCell}>
                    <Text style={[styles.macroLabel, { color }]}>{t(`nutrients.${k}`)}</Text>
                    <Text style={styles.macroValue}>{formatNumber(n[k] || 0)} g</Text>
                </View>
            ))}
        </View>
    );
};

const FoodRow = ({ food, sub, onPress, testID }) => {
    const { t } = useTranslation();
    const source = food.source === 'custom' ? t('foodSearch.myFood') : SOURCE_LABEL[food.source];
    return (
        <TouchableOpacity onPress={onPress} style={styles.foodRow} activeOpacity={0.7} testID={testID}>
            <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.foodName} numberOfLines={2}>{food.name}</Text>
                <Text style={styles.foodSub}>
                    {sub || t('foodSearch.per100', { kcal: Math.round(food.rate100g.calories) })}{source ? ` · ${source}` : ''}
                </Text>
            </View>
            <ChevronRight size={16} color="#CBD5E1" />
        </TouchableOpacity>
    );
};

export const FoodSearchModal = ({ visible, onClose, onAdd, user, setUser }) => {
    const { t, i18n } = useTranslation();
    const units = unitsFor(user);
    const [step, setStep] = useState('search'); // search | amount | create | scan
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [recent, setRecent] = useState([]);
    const [food, setFood] = useState(null);
    const [amount, setAmount] = useState('');
    const [notFoundCode, setNotFoundCode] = useState(null);
    const [form, setForm] = useState({ name: '', calories: '', protein: '', carbs: '', fat: '', fiber: '' });
    const [permission, requestPermission] = useCameraPermissions();
    const scanLock = useRef(false);

    useEffect(() => {
        if (!visible) return;
        setStep('search');
        setQuery('');
        setResults([]);
        setError(null);
        loadRecentFoods().then(setRecent);
    }, [visible]);

    // Debounced search as the user types.
    useEffect(() => {
        if (step !== 'search') return undefined;
        const q = query.trim();
        if (q.length < 2) { setResults([]); setLoading(false); return undefined; }
        setLoading(true);
        const id = setTimeout(() => {
            searchFoods(q, { language: i18n.language, customFoods: user.customFoods })
                .then((list) => { setResults(list); setError(null); })
                .catch(() => setError(t('foodSearch.searchFailed')))
                .finally(() => setLoading(false));
        }, 280);
        return () => clearTimeout(id);
    }, [query, step, user.customFoods]);

    const pick = (f, grams = 100) => {
        setFood(f);
        setAmount(String(units.food(grams)));
        setStep('amount');
    };

    const grams = Math.min(5000, Math.round(units.foodToGrams(parseNum(amount)) * 10) / 10);
    const preview = food ? nutritionFor(food.rate100g, grams) : null;

    const add = async () => {
        if (!food || grams <= 0) return;
        onAdd({
            id: `manual-${Date.now()}`,
            name: food.name,
            category: food.category || 'other',
            confidence: 1,
            source: 'manual',
            foodItemId: food.source === 'taco' || food.source === 'usda' ? food.id : null,
            nutritionSource: food.source,
            rate100g: food.rate100g,
            estimatedGrams: grams,
            confirmedGrams: grams,
            nutrition: nutritionFor(food.rate100g, grams),
        });
        setRecent(await rememberFood(food, grams));
        setQuery('');
        setStep('search');
        onClose();
    };

    const openCreate = (name = '', code = null) => {
        setNotFoundCode(code);
        setForm({ name, calories: '', protein: '', carbs: '', fat: '', fiber: '' });
        setStep('create');
    };

    const formValid = form.name.trim().length > 0 && form.calories !== '';
    const saveCustom = () => {
        if (!formValid) return;
        const custom = {
            id: `${Date.now()}`,
            name: form.name.trim().slice(0, 80),
            calories: parseNum(form.calories),
            protein: parseNum(form.protein),
            carbs: parseNum(form.carbs),
            fat: parseNum(form.fat),
            fiber: parseNum(form.fiber),
            ...(notFoundCode ? { barcode: notFoundCode } : {}),
        };
        setUser({ ...user, customFoods: [...(user.customFoods || []), custom] });
        pick(customFoodToItem(custom));
    };

    const startScan = async () => {
        if (!permission?.granted) {
            const res = await requestPermission();
            if (!res.granted) { setError(t('mealScan.permissionCamera')); return; }
        }
        scanLock.current = false;
        setError(null);
        setStep('scan');
    };

    const onBarcode = async ({ data }) => {
        if (scanLock.current || !data) return;
        scanLock.current = true;
        // A product the user created earlier for this barcode wins.
        const own = (user.customFoods || []).find((f) => f.barcode === data);
        if (own) { pick(customFoodToItem(own)); return; }
        setStep('lookup');
        try {
            const found = await lookupBarcode(data, i18n.language);
            if (found) pick(found);
            else openCreate('', data);
        } catch {
            setError(t('foodSearch.searchFailed'));
            setStep('search');
        }
    };

    const quick = units.imperial ? [1, 2, 4, 8] : [50, 100, 150, 200];
    const title = step === 'create' ? t('foodSearch.createTitle') : step === 'amount' ? t('foodSearch.amountTitle') : t('foodSearch.title');

    return (
        <Modal visible={visible} onClose={onClose} title={title}>
            {step === 'search' && (
                <View style={{ gap: 12 }}>
                    <View style={styles.searchRow}>
                        <View style={styles.searchBox}>
                            <Search size={16} color="#94A3B8" />
                            <TextInput
                                value={query}
                                onChangeText={setQuery}
                                placeholder={t('foodSearch.placeholder')}
                                placeholderTextColor="#94A3B8"
                                style={styles.searchInput}
                                autoFocus
                                autoCorrect={false}
                                returnKeyType="search"
                                testID="food-search-input"
                            />
                            {!!query && <TouchableOpacity onPress={() => setQuery('')} hitSlop={8}><X size={16} color="#94A3B8" /></TouchableOpacity>}
                        </View>
                        {barcodeSupported && (
                            <TouchableOpacity onPress={startScan} style={styles.barcodeBtn} testID="food-barcode-button">
                                <ScanBarcode size={20} color="#FFFFFF" />
                            </TouchableOpacity>
                        )}
                    </View>
                    {!!error && <Text style={styles.error}>{error}</Text>}

                    {query.trim().length < 2 ? (
                        recent.length > 0 && (
                            <View>
                                <View style={styles.sectionHead}><Clock size={13} color="#64748B" /><Text style={styles.sectionTitle}>{t('foodSearch.recent')}</Text></View>
                                {recent.map((f) => (
                                    <FoodRow key={f.key} food={f} sub={`${formatNumber(units.food(f.grams))} ${units.foodUnit} · ${Math.round(nutritionFor(f.rate100g, f.grams).calories)} kcal`} onPress={() => pick(f, f.grams)} />
                                ))}
                            </View>
                        )
                    ) : loading ? (
                        <ActivityIndicator color="#EA580C" style={{ marginVertical: 20 }} />
                    ) : error ? null : results.length === 0 ? (
                        <Text style={styles.empty}>{t('foodSearch.noResults', { query: query.trim() })}</Text>
                    ) : (
                        <View>{results.map((f, i) => <FoodRow key={f.key} food={f} onPress={() => pick(f)} testID={`food-result-${i}`} />)}</View>
                    )}

                    <TouchableOpacity onPress={() => openCreate(query.trim())} style={styles.createRow} testID="food-create-button">
                        <PencilLine size={16} color="#EA580C" />
                        <Text style={styles.createText}>{t('foodSearch.create')}</Text>
                    </TouchableOpacity>
                    <Text style={styles.credits}>{t('foodSearch.credits')}</Text>
                </View>
            )}

            {(step === 'scan' || step === 'lookup') && (
                <View style={{ gap: 12 }}>
                    <View style={styles.cameraFrame}>
                        {step === 'scan' ? (
                            <CameraView
                                style={StyleSheet.absoluteFill}
                                facing="back"
                                barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'] }}
                                onBarcodeScanned={onBarcode}
                            />
                        ) : (
                            <ActivityIndicator color="#FFFFFF" size="large" />
                        )}
                        <View pointerEvents="none" style={styles.scanGuide} />
                    </View>
                    <Text style={styles.hint}>{step === 'scan' ? t('foodSearch.scanHint') : t('foodSearch.looking')}</Text>
                    <Button variant="secondary" onClick={() => setStep('search')} style={{ width: '100%' }}>{t('common.cancel')}</Button>
                </View>
            )}

            {step === 'amount' && food && (
                <View style={{ gap: 14 }}>
                    <View style={styles.amountHead}>
                        <Text style={styles.amountName}>{food.name}</Text>
                        <Text style={styles.foodSub}>{t('foodSearch.per100', { kcal: Math.round(food.rate100g.calories) })}</Text>
                    </View>
                    <View style={styles.amountRow}>
                        <TouchableOpacity onPress={() => setAmount(String(Math.max(0, units.food(grams - units.foodStepGrams))))} style={styles.stepBtn}><Minus size={16} color="#EA580C" /></TouchableOpacity>
                        <View style={styles.amountField}>
                            <TextInput value={amount} onChangeText={setAmount} keyboardType="decimal-pad" style={styles.amountInput} testID="food-amount-input" />
                            <Text style={styles.amountUnit}>{units.foodUnit}</Text>
                        </View>
                        <TouchableOpacity onPress={() => setAmount(String(units.food(grams + units.foodStepGrams)))} style={styles.stepBtn}><Plus size={16} color="#EA580C" /></TouchableOpacity>
                    </View>
                    <View style={styles.quickRow}>
                        {quick.map((v) => (
                            <TouchableOpacity key={v} onPress={() => setAmount(String(v))} style={[styles.quickChip, parseNum(amount) === v && styles.quickChipOn]}>
                                <Text style={[styles.quickText, parseNum(amount) === v && styles.quickTextOn]}>{v} {units.foodUnit}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                    {preview && (
                        <View style={styles.previewCard}>
                            <Text style={styles.previewKcal}>{preview.calories} <Text style={styles.previewUnit}>kcal</Text></Text>
                            <MacroLine n={preview} />
                        </View>
                    )}
                    <View style={styles.actions}>
                        <TouchableOpacity onPress={() => setStep('search')} style={styles.backBtn}><ArrowLeft size={18} color="#64748B" /></TouchableOpacity>
                        <Button onClick={add} disabled={grams <= 0} style={{ flex: 1 }} testID="food-add-button">{t('foodSearch.add')}</Button>
                    </View>
                </View>
            )}

            {step === 'create' && (
                <View style={{ gap: 10 }}>
                    {!!notFoundCode && <Text style={styles.notFound}>{t('foodSearch.notFound', { code: notFoundCode })}</Text>}
                    <View style={styles.formField}>
                        <Text style={styles.formLabel}>{t('foodSearch.name')}</Text>
                        <TextInput value={form.name} onChangeText={(v) => setForm((f) => ({ ...f, name: v }))} style={styles.formInput} placeholder={t('foodSearch.namePlaceholder')} placeholderTextColor="#CBD5E1" testID="food-create-name" />
                    </View>
                    <Text style={styles.formHint}>{t('foodSearch.labelHint')}</Text>
                    <View style={styles.formGrid}>
                        {[['calories', 'kcal'], ['protein', 'g'], ['carbs', 'g'], ['fat', 'g'], ['fiber', 'g']].map(([k, unit]) => (
                            <View key={k} style={[styles.formField, styles.formHalf]}>
                                <Text style={styles.formLabel}>{t(`nutrients.${k}`)} ({unit})</Text>
                                <TextInput value={form[k]} onChangeText={(v) => setForm((f) => ({ ...f, [k]: v }))} keyboardType="decimal-pad" style={styles.formInput} placeholder="0" placeholderTextColor="#CBD5E1" testID={`food-create-${k}`} />
                            </View>
                        ))}
                    </View>
                    <View style={styles.actions}>
                        <TouchableOpacity onPress={() => setStep('search')} style={styles.backBtn}><ArrowLeft size={18} color="#64748B" /></TouchableOpacity>
                        <Button onClick={saveCustom} disabled={!formValid} style={{ flex: 1 }} testID="food-create-save">{t('foodSearch.createSave')}</Button>
                    </View>
                </View>
            )}
        </Modal>
    );
};

const styles = StyleSheet.create({
    searchRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
    searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 16, paddingHorizontal: 12 },
    searchInput: { flex: 1, minWidth: 0, fontSize: 15, fontFamily: 'Outfit_600SemiBold', color: '#0F172A', paddingVertical: 12 },
    barcodeBtn: { width: 46, height: 46, borderRadius: 16, backgroundColor: '#EA580C', alignItems: 'center', justifyContent: 'center' },
    sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
    sectionTitle: { fontSize: 11, fontFamily: 'Outfit_900Black', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5 },
    foodRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
    foodName: { fontSize: 14, fontFamily: 'Outfit_700Bold', color: '#0F172A' },
    foodSub: { fontSize: 11, fontFamily: 'Outfit_600SemiBold', color: '#94A3B8', marginTop: 2 },
    empty: { fontSize: 13, fontFamily: 'Outfit_600SemiBold', color: '#64748B', textAlign: 'center', marginVertical: 12 },
    error: { fontSize: 12, fontFamily: 'Outfit_600SemiBold', color: '#DC2626' },
    createRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 16, borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#FED7AA' },
    createText: { fontSize: 14, fontFamily: 'Outfit_700Bold', color: '#EA580C' },
    credits: { fontSize: 10, fontFamily: 'Outfit_600SemiBold', color: '#CBD5E1', textAlign: 'center' },
    cameraFrame: { width: '100%', aspectRatio: 4 / 3, borderRadius: 24, overflow: 'hidden', backgroundColor: '#0F172A', alignItems: 'center', justifyContent: 'center' },
    scanGuide: { position: 'absolute', left: '12%', right: '12%', top: '35%', bottom: '35%', borderWidth: 2, borderColor: 'rgba(255,255,255,0.85)', borderRadius: 14 },
    hint: { fontSize: 12, fontFamily: 'Outfit_600SemiBold', color: '#64748B', textAlign: 'center' },
    amountHead: { backgroundColor: '#F8FAFC', borderRadius: 18, padding: 14 },
    amountName: { fontSize: 16, fontFamily: 'Outfit_700Bold', color: '#0F172A' },
    amountRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    stepBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#FFF7ED', borderWidth: 1, borderColor: '#FFEDD5', alignItems: 'center', justifyContent: 'center' },
    amountField: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 14, paddingVertical: 8 },
    amountInput: { minWidth: 60, textAlign: 'center', fontSize: 22, fontFamily: 'Outfit_900Black', color: '#0F172A', padding: 0 },
    amountUnit: { fontSize: 14, fontFamily: 'Outfit_700Bold', color: '#94A3B8' },
    quickRow: { flexDirection: 'row', gap: 8 },
    quickChip: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 12, backgroundColor: '#F1F5F9' },
    quickChipOn: { backgroundColor: '#EA580C' },
    quickText: { fontSize: 12, fontFamily: 'Outfit_700Bold', color: '#475569' },
    quickTextOn: { color: '#FFFFFF' },
    previewCard: { borderRadius: 18, borderWidth: 1, borderColor: '#F1F5F9', padding: 14, gap: 10 },
    previewKcal: { fontSize: 24, fontFamily: 'Outfit_900Black', color: '#0F172A' },
    previewUnit: { fontSize: 13, fontFamily: 'Outfit_700Bold', color: '#94A3B8' },
    macroLine: { flexDirection: 'row', gap: 6 },
    macroCell: { flex: 1, backgroundColor: '#F8FAFC', borderRadius: 10, paddingVertical: 6, alignItems: 'center' },
    macroLabel: { fontSize: 9, fontFamily: 'Outfit_900Black', textTransform: 'uppercase' },
    macroValue: { fontSize: 12, fontFamily: 'Outfit_700Bold', color: '#0F172A', marginTop: 1 },
    actions: { flexDirection: 'row', gap: 10, alignItems: 'center', marginTop: 4 },
    backBtn: { width: 52, height: 52, borderRadius: 18, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
    notFound: { fontSize: 12, fontFamily: 'Outfit_600SemiBold', color: '#92400E', backgroundColor: '#FFFBEB', borderRadius: 14, padding: 12, lineHeight: 17 },
    formField: { gap: 4 },
    formHalf: { width: '48%', flexGrow: 1 },
    formGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    formLabel: { fontSize: 11, fontFamily: 'Outfit_700Bold', color: '#64748B' },
    formInput: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, fontFamily: 'Outfit_700Bold', color: '#0F172A' },
    formHint: { fontSize: 11, fontFamily: 'Outfit_600SemiBold', color: '#94A3B8' },
});
