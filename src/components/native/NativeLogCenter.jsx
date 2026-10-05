import React, { createContext, useContext, useMemo, useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, TextInput, LayoutAnimation, PanResponder } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Scale, Syringe, Pill, Camera, ImagePlus, Ruler, Smile, Info, AlertCircle, Trash2, RefreshCw } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Button, Modal, NumberStepper } from './NativeUI';
import NativeBodySelector from './NativeBodySelector';
import { MOCK_MEDICATIONS } from '../../constants/medications';
import { suggestNextInjection, getSiteById } from '../../services/InjectionService';
import { userService } from '../../services/userService';
import { unitsFor, formatDate, formatNumber, weekdayName, orderedWeekdays } from '../../i18n';
import { recordDateFor, latestWeight, sortedDoses, isSameDay, daysBetween, intakeKey } from '../../utils/journal';

// One place to record anything. Every screen (and the + button in the tab
// bar) calls openLog(kind, { date }) instead of owning its own copy of the
// weight / dose / protocol / symptom forms, so a record looks and behaves the
// same wherever it starts. `date` (from the Journal) files the record on that
// day; without it the record is "now".

const scalerImg = require('../../../assets/scaler.png');

const LogContext = createContext({ openLog: () => {} });
export const useLog = () => useContext(LogContext);

// Modals animate out in ~200 ms; opening the next one sooner can be dropped on iOS.
const SWAP_DELAY = 320;

export const getMedication = (user) => MOCK_MEDICATIONS.find((m) => m.id === user?.medicationId);
export const doseIntervalDays = (med) => (med?.frequency === 'daily' ? 1 : 7);

// ids are stored in sideEffectsLogs — keep them stable; labels are translated.
const SYMPTOMS = [
    { id: 'nausea', emoji: '🤢', key: 'symptoms.nausea' },
    { id: 'vomito', emoji: '🤮', key: 'symptoms.vomito' },
    { id: 'fadiga', emoji: '🥱', key: 'symptoms.fadiga' },
    { id: 'azia', emoji: '🔥', key: 'symptoms.azia' },
    { id: 'constipação', emoji: '🧱', key: 'symptoms.constipacao' },
];
export const symptomEmoji = (id) => SYMPTOMS.find((s) => s.id === id)?.emoji || '🤒';
export const symptomKey = (id) => SYMPTOMS.find((s) => s.id === id)?.key;

export const foodNoiseColor = (v) => (v <= 3 ? '#EA580C' : v <= 7 ? '#F97316' : '#EF4444');

const FoodNoiseSlider = ({ value, onChange }) => {
    const { t } = useTranslation();
    const percentage = Math.max(0, Math.min(100, (value / 10) * 100));
    const trackWidthRef = useRef(0);
    const initialValueRef = useRef(value);
    const isDraggingRef = useRef(false);
    const onChangeRef = useRef(onChange);
    useEffect(() => { onChangeRef.current = onChange; }, [onChange]);
    useEffect(() => { if (!isDraggingRef.current) initialValueRef.current = value; }, [value]);

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onStartShouldSetPanResponderCapture: () => true,
            onMoveShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponderCapture: () => true,
            onPanResponderTerminationRequest: () => false,
            onPanResponderGrant: (evt) => {
                isDraggingRef.current = true;
                const w = trackWidthRef.current;
                if (w > 0) {
                    const stepped = Math.max(0, Math.min(10, Math.round((evt.nativeEvent.locationX / w) * 10)));
                    initialValueRef.current = stepped;
                    onChangeRef.current(stepped);
                }
            },
            onPanResponderMove: (evt, gesture) => {
                const w = trackWidthRef.current;
                if (w > 0) {
                    onChangeRef.current(Math.max(0, Math.min(10, Math.round(initialValueRef.current + (gesture.dx / w) * 10))));
                }
            },
            onPanResponderRelease: () => { isDraggingRef.current = false; },
            onPanResponderTerminate: () => { isDraggingRef.current = false; },
        })
    ).current;

    const color = foodNoiseColor(value);
    return (
        <View style={styles.sliderContainer}>
            <View style={styles.sliderRow}>
                <View style={styles.sliderTrackWrapper} onLayout={(e) => { trackWidthRef.current = e.nativeEvent.layout.width; }} {...panResponder.panHandlers}>
                    <View style={styles.sliderTrackBg} pointerEvents="none" />
                    <View style={[styles.sliderTrackFill, { width: `${percentage}%`, backgroundColor: color }]} pointerEvents="none" />
                    <View style={[styles.sliderThumb, { left: `${percentage}%`, transform: [{ translateX: -12 }], borderColor: color }]} pointerEvents="none" />
                </View>
                <Text style={[styles.sliderValueText, { color }]}>{value}</Text>
            </View>
            <View style={styles.sliderLabelsRow}>
                <Text style={styles.sliderLabelText}>{t('logs.quiet')}</Text>
                <Text style={styles.sliderLabelText}>{t('logs.intense')}</Text>
            </View>
        </View>
    );
};

const ChipGrid = ({ items, selected, onSelect, columns = 2, testIDPrefix }) => (
    <View style={styles.chipGrid}>
        {items.map((item) => {
            const active = selected === item.id;
            return (
                <TouchableOpacity
                    key={item.id}
                    onPress={() => onSelect(item.id)}
                    style={[styles.chip, { minWidth: columns === 3 ? '28%' : '45%' }, active && styles.chipActive]}
                    testID={testIDPrefix ? `${testIDPrefix}-${item.id}` : undefined}
                >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>{item.label}</Text>
                </TouchableOpacity>
            );
        })}
    </View>
);

const NativeLogCenter = ({ user, setUser, onScanMeal, children }) => {
    const { t } = useTranslation();
    const units = unitsFor(user);
    const medication = getMedication(user);
    const isOral = medication?.route === 'oral';

    const [active, setActive] = useState(null); // 'menu' | 'weight' | 'dose' | 'protocol' | 'checkin' | 'measures'
    const [logDate, setLogDate] = useState(null);
    const swapTimer = useRef(null);

    // Form state
    const [newWeight, setNewWeight] = useState('');
    const [selectedSiteId, setSelectedSiteId] = useState(null);
    const [editDose, setEditDose] = useState(''); // dose chosen when editing a past application
    const [protocol, setProtocol] = useState({ med: '', dose: '', day: null, route: 'all' });
    const [checkIn, setCheckIn] = useState({ symptoms: [], trigger: '', foodNoise: 3, note: '', touchedNoise: false });
    const [showFoodNoiseInfo, setShowFoodNoiseInfo] = useState(false);
    const [measures, setMeasures] = useState({ waist: '', hip: '' });
    // Photo picked but not saved yet: shown for confirmation first.
    const [pendingPhoto, setPendingPhoto] = useState(null); // { url, date }
    // Journal entry being edited (weight / measures) or about to be deleted.
    const [target, setTarget] = useState(null);

    const injectionSuggestion = useMemo(() => suggestNextInjection(sortedDoses(user)), [user.doseHistory]);

    // Numbers shown in editable fields use the locale's decimal separator.
    const decimalSep = formatNumber(1.5).includes(',') ? ',' : '.';
    const toField = (n, digits = 1) => (n ? Number(n).toFixed(digits).replace('.', decimalSep) : '');
    const fromField = (v) => parseFloat(String(v).replace(',', '.'));

    const prepare = (kind, entry) => {
        setTarget(entry || null);
        if (kind === 'weight') {
            const w = entry ? entry.data.weight : latestWeight(user);
            setNewWeight(w ? toField(units.weight(w)) : '');
        } else if (kind === 'dose') {
            const id = entry?.data?.siteId || entry?.data?.site;
            setSelectedSiteId(id && getSiteById(id).id === id ? id : null);
            setEditDose(entry?.data?.dose || '');
        } else if (kind === 'protocol') {
            setProtocol({ med: user.medicationId || '', dose: user.currentDose || '', day: user.injectionDay ?? null, route: 'all' });
        } else if (kind === 'checkin') {
            setCheckIn({ symptoms: [], trigger: '', foodNoise: 3, note: '', touchedNoise: false });
        } else if (kind === 'measures') {
            const lastBody = entry ? entry.data : null;
            setMeasures({
                waist: lastBody?.waist ? toField(units.length(lastBody.waist)) : '',
                hip: lastBody?.hip ? toField(units.length(lastBody.hip)) : '',
            });
        }
    };

    const pickPhoto = async (date) => {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (permission.granted === false) {
            alert(t('dashboard.photoPermission'));
            return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [3, 4],
            quality: 0.7,
            base64: true,
        });
        if (!result.canceled && result.assets?.[0]?.base64) {
            setPendingPhoto({ url: `data:${result.assets[0].mimeType || 'image/jpeg'};base64,${result.assets[0].base64}`, date: recordDateFor(date) });
            setActive('photo');
        }
    };

    const savePhoto = () => {
        if (!pendingPhoto) return;
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setUser({ ...user, photos: [...(user.photos || []), pendingPhoto] });
        setPendingPhoto(null);
        close();
    };

    // opts: { date } files a new record on that day; { entry } edits or
    // deletes an existing Journal entry (kinds 'weight', 'measures', 'delete').
    const openLog = (kind, opts = {}) => {
        clearTimeout(swapTimer.current);
        const date = opts.date || null;
        const run = () => {
            setLogDate(date);
            if (kind === 'photo') { setActive(null); pickPhoto(date); return; }
            if (kind === 'meal') { setActive(null); onScanMeal && onScanMeal(); return; }
            prepare(kind, opts.entry);
            setActive(kind);
        };
        if (active) {
            setActive(null);
            swapTimer.current = setTimeout(run, SWAP_DELAY);
        } else {
            run();
        }
    };

    const close = () => setActive(null);

    // ---- Save handlers -------------------------------------------------

    // Weight and the current-weight fields always move together.
    const withMeasurements = (measurements) => {
        const next = { ...user, measurements };
        return { ...next, currentWeight: latestWeight(next) };
    };

    const saveWeight = () => {
        const kg = Math.round(units.weightToKg(fromField(newWeight)) * 100) / 100;
        if (!kg) return;
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        if (target) {
            setUser(withMeasurements((user.measurements || []).map((m) => (m.date === target.data.date && m.weight === target.data.weight ? { ...m, weight: kg } : m))));
            close();
            return;
        }
        const date = recordDateFor(logDate);
        const measurements = [...(user.measurements || []), { date, weight: kg }];
        const next = { ...user, measurements };
        const current = latestWeight(next);
        setUser({
            ...next,
            currentWeight: current,
            history: [...(user.history || []), kg],
            lastWeightDate: current === kg ? date : user.lastWeightDate,
        });
        close();
    };

    const lastDose = sortedDoses(user)[0];
    const daysSinceLastDose = lastDose ? daysBetween(lastDose.date, logDate || new Date()) : null;
    const showReducedInterval = !isOral && doseIntervalDays(medication) === 7 && daysSinceLastDose !== null && daysSinceLastDose >= 0 && daysSinceLastDose < 6;

    // Editing an application from the Journal uses that record's medication.
    const doseMed = target?.type === 'dose' ? (MOCK_MEDICATIONS.find((m) => m.id === target.data.medication) || medication) : medication;
    const doseIsOral = doseMed?.route === 'oral';

    const saveDose = () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        const siteId = selectedSiteId || injectionSuggestion.id;
        const site = getSiteById(siteId);
        if (target?.type === 'dose') {
            const placement = doseIsOral
                ? { siteId: null, site: 'oral', area: 'oral', side: null }
                : { siteId, site: siteId, area: site?.area || 'abdomen', side: site?.side || 'left' };
            setUser({
                ...user,
                doseHistory: (user.doseHistory || []).map((d) => (d.date === target.data.date ? { ...d, dose: editDose || d.dose, ...placement } : d)),
            });
            close();
            return;
        }
        const record = {
            date: recordDateFor(logDate),
            dose: user.currentDose,
            medication: user.medicationId,
            siteId: isOral ? null : siteId,
            site: isOral ? 'oral' : siteId,
            area: isOral ? 'oral' : site?.area || 'abdomen',
            side: isOral ? null : site?.side || 'left',
        };
        setUser({ ...user, doseHistory: [record, ...(user.doseHistory || [])] });
        close();
    };

    const protocolMed = MOCK_MEDICATIONS.find((m) => m.id === protocol.med);
    const saveProtocol = () => {
        if (!protocol.med || !protocol.dose) return;
        setUser({ ...user, medicationId: protocol.med, currentDose: protocol.dose, injectionDay: protocol.day });
        close();
    };

    const toggleSymptom = (id) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setCheckIn((prev) => ({
            ...prev,
            symptoms: prev.symptoms.includes(id) ? prev.symptoms.filter((s) => s !== id) : [...prev.symptoms, id],
        }));
    };
    const showTrigger = checkIn.symptoms.includes('nausea') || checkIn.symptoms.includes('vomito');
    const canSaveCheckIn = checkIn.symptoms.length > 0 || checkIn.touchedNoise || checkIn.note.trim().length > 0;

    const saveCheckIn = () => {
        if (!canSaveCheckIn) return;
        const onlyNote = checkIn.symptoms.length === 0 && !checkIn.touchedNoise;
        const log = onlyNote
            ? { date: recordDateFor(logDate), symptoms: [], note: checkIn.note.trim(), isMemoryOnly: true }
            : {
                date: recordDateFor(logDate),
                ...(checkIn.touchedNoise ? { foodNoise: checkIn.foodNoise } : {}),
                symptoms: checkIn.symptoms,
                trigger: showTrigger ? checkIn.trigger.trim() : '',
                note: checkIn.note.trim(),
            };
        setUser({ ...user, sideEffectsLogs: [log, ...(user.sideEffectsLogs || [])] });
        close();
    };

    const saveMeasures = () => {
        const waist = Math.round(units.lengthToCm(parseFloat(String(measures.waist).replace(',', '.'))) * 10) / 10 || 0;
        const hip = Math.round(units.lengthToCm(parseFloat(String(measures.hip).replace(',', '.'))) * 10) / 10 || 0;
        if (!waist && !hip) return;
        if (target) {
            setUser({ ...user, measurements: (user.measurements || []).map((m) => (m.date === target.data.date && (m.waist > 0 || m.hip > 0) ? { ...m, waist, hip } : m)) });
            close();
            return;
        }
        // Body measures are their own entry (weight 0) so they never show up
        // as a fake weigh-in on the weight chart.
        setUser({ ...user, measurements: [...(user.measurements || []), { date: recordDateFor(logDate), weight: 0, waist, hip }] });
        close();
    };

    // Removes one Journal entry. Older records can hold a weight and body
    // measures in the same measurement; removing one keeps the other.
    const deleteEntry = async () => {
        const entry = target;
        if (!entry) return;
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        const sameDate = (x) => x.date === entry.date;
        if (entry.type === 'weight' || entry.type === 'measures') {
            const isWeight = entry.type === 'weight';
            const measurements = (user.measurements || [])
                .map((m) => {
                    if (m !== entry.data && !(sameDate(m) && m.weight === entry.data.weight && m.waist === entry.data.waist)) return m;
                    const keepsOther = isWeight ? (m.waist > 0 || m.hip > 0) : m.weight > 0;
                    if (!keepsOther) return null;
                    return isWeight ? { ...m, weight: 0 } : { ...m, waist: 0, hip: 0 };
                })
                .filter(Boolean);
            setUser(withMeasurements(measurements));
        } else if (entry.type === 'dose') {
            setUser({ ...user, doseHistory: (user.doseHistory || []).filter((d) => !sameDate(d)) });
        } else if (entry.type === 'checkin' || entry.type === 'note') {
            setUser({ ...user, sideEffectsLogs: (user.sideEffectsLogs || []).filter((l) => !sameDate(l)) });
        } else if (entry.type === 'photo') {
            setUser({ ...user, photos: (user.photos || []).filter((_, i) => i !== entry.data.index) });
        } else if (entry.type === 'meal') {
            // A saved meal added its nutrients to that day's intake; take them back out.
            const m = entry.data;
            const isLocal = (user.meals || []).some((x) => x === m || x.id === m.id);
            if (!isLocal && user.uid && m.id) {
                try {
                    await userService.deleteMealLog(user.uid, m.id);
                } catch (e) {
                    console.error('Failed to delete meal:', e);
                    close();
                    return;
                }
            }
            const key = intakeKey(m.logged_at);
            const day = user.dailyIntakeHistory?.[key] || {};
            const minus = (field, value) => Math.max(0, Math.round(((day[field] || 0) - (value || 0)) * 10) / 10);
            setUser({
                ...user,
                meals: (user.meals || []).filter((x) => x !== m && x.id !== m.id),
                dailyIntakeHistory: {
                    ...(user.dailyIntakeHistory || {}),
                    [key]: {
                        ...day,
                        protein: minus('protein', m.total_protein),
                        fiber: minus('fiber', m.total_fiber),
                        fat: minus('fat', m.total_fat),
                        carbs: minus('carbs', m.total_carbs),
                        calories: minus('calories', m.total_calories),
                    },
                },
            });
        }
        close();
    };

    // ---- Menu ----------------------------------------------------------

    const logDay = logDate && !isSameDay(logDate, new Date()) ? logDate : null;
    const menuItems = [
        { kind: 'weight', icon: Scale, color: '#EA580C', bg: '#FFF7ED', label: t('log.weight'), sub: t('log.weightSub') },
        { kind: 'dose', icon: isOral ? Pill : Syringe, color: '#2563EB', bg: '#EFF6FF', label: isOral ? t('log.doseOral') : t('log.dose'), sub: medication ? `${medication.name} · ${user.currentDose}` : t('log.doseSub') },
        { kind: 'checkin', icon: Smile, color: '#EF4444', bg: '#FEF2F2', label: t('log.checkIn'), sub: t('log.checkInSub') },
        // A meal photo is analysed "now"; it only makes sense for today.
        ...(logDay ? [] : [{ kind: 'meal', icon: Camera, color: '#F59E0B', bg: '#FFFBEB', label: t('log.meal'), sub: t('log.mealSub') }]),
        { kind: 'photo', icon: ImagePlus, color: '#10B981', bg: '#ECFDF5', label: t('log.photo'), sub: t('log.photoSub') },
        { kind: 'measures', icon: Ruler, color: '#8B5CF6', bg: '#F5F3FF', label: t('log.measures'), sub: t('log.measuresSub') },
    ];

    const dayBadge = logDay ? (
        <View style={styles.dayBadge}>
            <Text style={styles.dayBadgeText}>{t('log.forDay', { day: formatDate(logDay, { day: 'numeric', month: 'long' }) })}</Text>
        </View>
    ) : null;

    return (
        <LogContext.Provider value={{ openLog }}>
            {children}

            {/* Menu: what do you want to record? */}
            <Modal visible={active === 'menu'} onClose={close} title={logDay ? t('log.menuTitleDay') : t('log.menuTitle')}>
                {dayBadge}
                <View style={styles.menuGrid}>
                    {menuItems.map((item) => (
                        <TouchableOpacity
                            key={item.kind}
                            style={styles.menuTile}
                            onPress={() => openLog(item.kind, { date: logDate })}
                            activeOpacity={0.8}
                            testID={`log-menu-${item.kind}`}
                        >
                            <View style={[styles.menuIcon, { backgroundColor: item.bg }]}>
                                <item.icon size={22} color={item.color} />
                            </View>
                            <Text style={styles.menuLabel}>{item.label}</Text>
                            <Text style={styles.menuSub} numberOfLines={2}>{item.sub}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </Modal>

            {/* Weight: the number comes first so it stays in view above the keyboard */}
            <Modal visible={active === 'weight'} onClose={close} title={target ? t('log.editWeightTitle') : t('dashboard.updateWeightTitle')}>
                {target ? (
                    <View style={styles.dayBadge}>
                        <Text style={styles.dayBadgeText}>{formatDate(target.date, { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}</Text>
                    </View>
                ) : dayBadge}
                <NumberStepper
                    label={t('dashboard.newWeight', { unit: units.weightUnit })}
                    value={newWeight}
                    onChangeText={setNewWeight}
                    step={units.imperial ? 1 : 0.5}
                    decimals={1}
                    min={0}
                    max={units.imperial ? 1100 : 500}
                    unit={units.weightUnit}
                    testID="weight-input"
                />
                {!target && (
                    <View style={styles.previousRow}>
                        <Image source={scalerImg} style={styles.previousImg} resizeMode="contain" />
                        <Text style={styles.previousText}>
                            {t('dashboard.previous')}: <Text style={styles.previousValue}>{latestWeight(user) ? units.formatWeight(latestWeight(user)) : '--'}</Text>
                        </Text>
                    </View>
                )}
                <Button onClick={saveWeight} style={styles.fullBtn} testID="weight-confirm-button">{t('dashboard.confirmWeight')}</Button>
            </Modal>

            {/* Dose */}
            <Modal visible={active === 'dose'} onClose={close} title={target?.type === 'dose' ? t('log.editDoseTitle') : t('dashboard.doseModalTitle')}>
                {target?.type === 'dose' ? (
                    <>
                        <View style={styles.dayBadge}>
                            <Text style={styles.dayBadgeText}>{formatDate(target.date, { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}</Text>
                        </View>
                        <Text style={styles.subLabelFirst}>{t('log.doseUsed', { medication: doseMed?.name || '' })}</Text>
                        <ChipGrid
                            columns={3}
                            items={(doseMed?.doses || [editDose]).map((d) => ({ id: d, label: d }))}
                            selected={editDose}
                            onSelect={setEditDose}
                            testIDPrefix="dose-edit"
                        />
                    </>
                ) : (<>
                {dayBadge}
                <View style={styles.statusCard}>
                    <View style={{ gap: 4, flex: 1 }}>
                        <Text style={styles.statusLabel}>{t('dashboard.medAndDose')}</Text>
                        <Text style={styles.statusValueSmall}>
                            {medication?.name || t('dashboard.protocolFallback')} <Text style={styles.statusDose}>{user.currentDose}</Text>
                        </Text>
                    </View>
                    <TouchableOpacity onPress={() => openLog('protocol')} style={styles.changeBtn}>
                        <Text style={styles.changeBtnText}>{t('dashboard.change')}</Text>
                    </TouchableOpacity>
                </View>

                </>)}

                {!target && showReducedInterval && (
                    <View style={styles.warningBox}>
                        <AlertCircle size={20} color="#EA580C" style={{ marginTop: 2 }} />
                        <View style={{ flex: 1 }}>
                            <Text style={styles.warningTitle}>{t('dashboard.reducedIntervalTitle')}</Text>
                            <Text style={styles.warningText}>{t('dashboard.reducedIntervalText', { count: daysSinceLastDose })}</Text>
                        </View>
                    </View>
                )}

                {!(target?.type === 'dose' ? doseIsOral : isOral) && (
                    <>
                        <Text style={styles.subLabel}>{t('dashboard.selectSite')}</Text>
                        <View style={{ marginVertical: 12, width: '100%' }}>
                            <NativeBodySelector
                                selectedSiteId={selectedSiteId || injectionSuggestion.id}
                                onSelect={setSelectedSiteId}
                                suggestedSiteId={injectionSuggestion.id}
                            />
                        </View>
                        <View style={styles.tipBox}>
                            <Text style={styles.tipText}>{t('dashboard.rotationTip')}</Text>
                        </View>
                    </>
                )}

                <Button onClick={saveDose} style={styles.fullBtn} testID="body-map-confirm-button">{target?.type === 'dose' ? t('common.save') : t('dashboard.confirmDose')}</Button>
            </Modal>

            {/* Protocol */}
            <Modal visible={active === 'protocol'} onClose={close} title={t('protocol.title')}>
                <View style={styles.routeSelectorRow}>
                    {[
                        { id: 'all', label: t('protocol.all') },
                        { id: 'injectable', label: t('protocol.injectable') },
                        { id: 'oral', label: t('protocol.oral') },
                    ].map((r) => (
                        <TouchableOpacity key={r.id} onPress={() => setProtocol((p) => ({ ...p, route: r.id }))} style={[styles.routeBtn, protocol.route === r.id && styles.routeBtnActive]}>
                            <Text style={[styles.routeBtnText, protocol.route === r.id && styles.routeBtnTextActive]}>{r.label}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <Text style={styles.subLabel}>{t('protocol.medication')}</Text>
                <ChipGrid
                    items={MOCK_MEDICATIONS.filter((m) => protocol.route === 'all' || m.route === protocol.route).map((m) => ({ id: m.id, label: m.name }))}
                    selected={protocol.med}
                    onSelect={(id) => {
                        const med = MOCK_MEDICATIONS.find((m) => m.id === id);
                        setProtocol((p) => ({ ...p, med: id, dose: med.doses.includes(p.dose) ? p.dose : med.doses[0] }));
                    }}
                />

                {!!protocolMed && (
                    <>
                        <Text style={styles.subLabel}>{t('protocol.dosage')}</Text>
                        <ChipGrid
                            columns={3}
                            items={protocolMed.doses.map((d) => ({ id: d, label: d }))}
                            selected={protocol.dose}
                            onSelect={(dose) => setProtocol((p) => ({ ...p, dose }))}
                        />
                        {protocolMed.frequency === 'weekly' && (
                            <>
                                <Text style={styles.subLabel}>{t('onboarding.doseDay')}</Text>
                                <View style={styles.weekdayRow}>
                                    {orderedWeekdays().map((day) => (
                                        <TouchableOpacity
                                            key={day}
                                            onPress={() => setProtocol((p) => ({ ...p, day }))}
                                            style={[styles.weekdayChip, protocol.day === day && styles.chipActive]}
                                        >
                                            <Text style={[styles.weekdayText, protocol.day === day && styles.chipTextActive]}>{weekdayName(day, 'short')}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </>
                        )}
                    </>
                )}

                <Button onClick={saveProtocol} disabled={!protocol.med || !protocol.dose} style={styles.fullBtn}>{t('protocol.save')}</Button>
            </Modal>

            {/* Check-in: symptoms, food noise, note */}
            <Modal visible={active === 'checkin'} onClose={close} title={t('log.checkInTitle')}>
                {dayBadge}
                <Text style={styles.subLabelFirst}>{t('logs.symptomsTitle')}</Text>
                <View style={styles.symptomsGrid}>
                    {SYMPTOMS.map((s) => {
                        const on = checkIn.symptoms.includes(s.id);
                        return (
                            <TouchableOpacity key={s.id} onPress={() => toggleSymptom(s.id)} style={[styles.symptomItem, on && styles.symptomActive]}>
                                <Text style={styles.emoji}>{s.emoji}</Text>
                                <Text style={[styles.symptomLabel, on && styles.symptomLabelActive]} numberOfLines={1}>{t(s.key)}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
                {showTrigger && (
                    <View style={styles.triggerField}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <AlertCircle size={14} color="#EA580C" />
                            <Text style={styles.triggerLabel}>{t('logs.triggerLabel')}</Text>
                        </View>
                        <TextInput
                            style={styles.triggerInput}
                            value={checkIn.trigger}
                            onChangeText={(trigger) => setCheckIn((p) => ({ ...p, trigger }))}
                            placeholder={t('logs.triggerPlaceholder')}
                            placeholderTextColor="#CBD5E1"
                        />
                    </View>
                )}

                <View style={styles.foodNoiseHeader}>
                    <Text style={styles.subLabelInline}>Food Noise</Text>
                    <TouchableOpacity onPress={() => setShowFoodNoiseInfo((v) => !v)} hitSlop={8}>
                        <Info size={16} color="#94A3B8" />
                    </TouchableOpacity>
                    {!checkIn.touchedNoise && <Text style={styles.optionalText}>{t('log.optional')}</Text>}
                </View>
                {showFoodNoiseInfo && (
                    <View style={styles.infoBox}>
                        <Text style={styles.infoText}>{t('logs.foodNoiseInfoIntro')}</Text>
                        <Text style={styles.infoText}><Text style={styles.infoStrong}>0-3 {t('logs.quiet')}: </Text>{t('logs.quietDesc')}</Text>
                        <Text style={styles.infoText}><Text style={styles.infoStrong}>4-7 {t('logs.moderate')}: </Text>{t('logs.moderateDesc')}</Text>
                        <Text style={styles.infoText}><Text style={styles.infoStrong}>8-10 {t('logs.high')}: </Text>{t('logs.highDesc')}</Text>
                    </View>
                )}
                <View style={!checkIn.touchedNoise && { opacity: 0.55 }}>
                    <FoodNoiseSlider value={checkIn.foodNoise} onChange={(foodNoise) => setCheckIn((p) => ({ ...p, foodNoise, touchedNoise: true }))} />
                </View>

                <Text style={styles.subLabel}>{t('log.noteLabel')}</Text>
                <TextInput
                    style={styles.textArea}
                    multiline
                    numberOfLines={4}
                    placeholder={t('logs.notePlaceholder')}
                    placeholderTextColor="#CBD5E1"
                    value={checkIn.note}
                    onChangeText={(note) => setCheckIn((p) => ({ ...p, note }))}
                />

                <Button onClick={saveCheckIn} disabled={!canSaveCheckIn} style={styles.fullBtn} testID="checkin-save-button">{t('logs.save')}</Button>
            </Modal>

            {/* Body measures */}
            <Modal visible={active === 'measures'} onClose={close} title={target ? t('log.editMeasuresTitle') : t('profile.measuresTitle')}>
                {dayBadge}
                {!target && <Text style={styles.introText}>{t('profile.measuresIntro')}</Text>}
                <NumberStepper
                    label={t('profile.waist', { unit: units.lengthUnit })}
                    value={measures.waist}
                    onChangeText={(waist) => setMeasures((m) => ({ ...m, waist }))}
                    step={units.imperial ? 0.5 : 1}
                    decimals={1}
                    unit={units.lengthUnit}
                    testID="measures-waist-input"
                />
                <NumberStepper
                    label={t('profile.hip', { unit: units.lengthUnit })}
                    value={measures.hip}
                    onChangeText={(hip) => setMeasures((m) => ({ ...m, hip }))}
                    step={units.imperial ? 0.5 : 1}
                    decimals={1}
                    unit={units.lengthUnit}
                    testID="measures-hip-input"
                />
                <Button onClick={saveMeasures} style={styles.fullBtn} testID="measures-save-button">{t('profile.saveMeasures')}</Button>
            </Modal>

            {/* Progress photo: confirm before saving */}
            <Modal visible={active === 'photo'} onClose={() => { setPendingPhoto(null); close(); }} title={t('log.photoPreviewTitle')}>
                {!!pendingPhoto && (
                    <>
                        <View style={styles.photoPreviewFrame}>
                            <Image source={{ uri: pendingPhoto.url }} style={styles.photoPreview} resizeMode="cover" />
                            <View style={styles.photoPreviewDate}>
                                <Text style={styles.photoPreviewDateText}>{(() => { const d = formatDate(pendingPhoto.date, { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' }); return d.charAt(0).toLocaleUpperCase() + d.slice(1); })()}</Text>
                            </View>
                        </View>
                        <Text style={styles.introText}>{t('log.photoPreviewHint')}</Text>
                        <View style={styles.photoActions}>
                            <TouchableOpacity onPress={() => pickPhoto(logDate)} style={styles.secondaryBtn} testID="photo-change-button">
                                <RefreshCw size={16} color="#64748B" />
                                <Text style={styles.secondaryBtnText}>{t('log.photoChange')}</Text>
                            </TouchableOpacity>
                            <Button onClick={savePhoto} style={{ flex: 1.4 }} testID="photo-save-button">{t('log.photoSave')}</Button>
                        </View>
                    </>
                )}
            </Modal>

            {/* Delete a Journal entry */}
            <Modal visible={active === 'delete'} onClose={close} title={t('journal.deleteTitle')}>
                <View style={styles.deleteBox}>
                    <Trash2 size={22} color="#EF4444" />
                    <Text style={styles.deleteText}>
                        {target ? t('journal.deleteText', { date: formatDate(target.date, { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }) }) : ''}
                    </Text>
                </View>
                <Button onClick={deleteEntry} style={[styles.fullBtn, { backgroundColor: '#EF4444', shadowColor: '#EF4444' }]} testID="delete-confirm-button">{t('journal.deleteConfirm')}</Button>
                <TouchableOpacity onPress={close} style={styles.cancelLink}>
                    <Text style={styles.cancelLinkText}>{t('common.cancel')}</Text>
                </TouchableOpacity>
            </Modal>
        </LogContext.Provider>
    );
};

export default NativeLogCenter;

const styles = StyleSheet.create({
    fullBtn: { width: '100%', marginTop: 16 },
    previousRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#F8FAFC', borderRadius: 18, padding: 10, marginTop: 4 },
    previousImg: { width: 36, height: 36 },
    previousText: { fontSize: 13, fontFamily: 'Outfit_600SemiBold', color: '#64748B' },
    previousValue: { fontFamily: 'Outfit_900Black', color: '#9A3412' },
    photoPreviewFrame: { width: '100%', aspectRatio: 3 / 4, maxHeight: 380, borderRadius: 28, overflow: 'hidden', backgroundColor: '#F1F5F9', alignSelf: 'center', marginBottom: 12 },
    photoPreview: { width: '100%', height: '100%' },
    photoPreviewDate: { position: 'absolute', left: 12, bottom: 12, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 12, paddingVertical: 6, paddingHorizontal: 10 },
    photoPreviewDateText: { fontSize: 12, fontFamily: 'Outfit_900Black', color: '#FFFFFF' },
    photoActions: { flexDirection: 'row', gap: 10, alignItems: 'center' },
    secondaryBtn: { flex: 1, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 20, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0' },
    secondaryBtnText: { fontSize: 14, fontFamily: 'Outfit_700Bold', color: '#64748B' },
    deleteBox: { flexDirection: 'row', gap: 12, alignItems: 'center', backgroundColor: '#FEF2F2', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: '#FEE2E2' },
    deleteText: { flex: 1, fontSize: 13, fontFamily: 'Outfit_600SemiBold', color: '#7F1D1D', lineHeight: 18 },
    cancelLink: { alignItems: 'center', paddingVertical: 14 },
    cancelLinkText: { fontSize: 12, fontFamily: 'Outfit_900Black', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1 },
    dayBadge: { alignSelf: 'flex-start', backgroundColor: '#EFF6FF', borderRadius: 10, paddingVertical: 4, paddingHorizontal: 10, marginBottom: 16 },
    dayBadgeText: { fontSize: 11, fontFamily: 'Outfit_900Black', color: '#2563EB', textTransform: 'uppercase', letterSpacing: 0.5 },

    menuGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    menuTile: { width: '47%', flexGrow: 1, backgroundColor: '#FFFFFF', borderRadius: 24, padding: 16, borderWidth: 1, borderColor: '#F1F5F9', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 6, elevation: 1 },
    menuIcon: { width: 44, height: 44, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
    menuLabel: { fontSize: 14, fontFamily: 'Outfit_900Black', color: '#0F172A' },
    menuSub: { fontSize: 11, fontFamily: 'Outfit_600SemiBold', color: '#94A3B8', marginTop: 2, lineHeight: 14 },

    statusCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFF7ED', borderRadius: 28, padding: 20, borderWidth: 1, borderColor: '#FFEDD5', marginBottom: 20 },
    statusLabel: { fontSize: 9, fontFamily: 'Outfit_900Black', color: '#EA580C', textTransform: 'uppercase', letterSpacing: 1 },
    statusValue: { fontSize: 28, fontFamily: 'Outfit_900Black', color: '#9A3412' },
    statusValueSmall: { fontSize: 20, fontFamily: 'Outfit_900Black', color: '#9A3412' },
    statusDose: { fontSize: 15, color: '#EA580C', fontFamily: 'Outfit_700Bold' },
    statusImg: { width: 72, height: 72 },
    changeBtn: { backgroundColor: '#EA580C', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
    changeBtnText: { fontSize: 11, fontFamily: 'Outfit_900Black', color: '#FFFFFF', textTransform: 'uppercase', letterSpacing: 0.5 },

    warningBox: { flexDirection: 'row', gap: 12, backgroundColor: '#FEF3C7', borderColor: '#FDE68A', borderWidth: 1, borderRadius: 24, padding: 16, marginBottom: 16 },
    warningTitle: { fontSize: 14, fontFamily: 'Outfit_700Bold', color: '#78350F', marginBottom: 2 },
    warningText: { fontSize: 11, fontFamily: 'Outfit_600SemiBold', color: '#78350F', lineHeight: 15 },
    tipBox: { backgroundColor: '#F8FAFC', borderRadius: 16, padding: 12, borderWidth: 1, borderColor: '#E2E8F0' },
    tipText: { fontSize: 11, fontFamily: 'Outfit_600SemiBold', color: '#64748B', fontStyle: 'italic', lineHeight: 15 },

    subLabelFirst: { fontSize: 11, fontFamily: 'Outfit_900Black', color: '#94A3B8', textTransform: 'uppercase', marginBottom: 10 },
    subLabel: { fontSize: 11, fontFamily: 'Outfit_900Black', color: '#94A3B8', textTransform: 'uppercase', marginTop: 20, marginBottom: 10 },
    subLabelInline: { fontSize: 11, fontFamily: 'Outfit_900Black', color: '#94A3B8', textTransform: 'uppercase' },
    introText: { fontSize: 13, fontFamily: 'Outfit_600SemiBold', color: '#64748B', lineHeight: 18, marginBottom: 16 },

    routeSelectorRow: { flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: 16, padding: 4 },
    routeBtn: { flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center' },
    routeBtnActive: { backgroundColor: '#FFFFFF', elevation: 1 },
    routeBtnText: { fontSize: 12, fontFamily: 'Outfit_700Bold', color: '#64748B' },
    routeBtnTextActive: { color: '#EA580C' },
    chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: { flex: 1, paddingVertical: 12, borderRadius: 16, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center' },
    chipActive: { backgroundColor: '#EA580C', borderColor: '#EA580C' },
    chipText: { fontSize: 13, fontFamily: 'Outfit_700Bold', color: '#475569' },
    chipTextActive: { color: '#FFFFFF' },
    weekdayRow: { flexDirection: 'row', gap: 6 },
    weekdayChip: { flex: 1, paddingVertical: 10, borderRadius: 12, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center' },
    weekdayText: { fontSize: 11, fontFamily: 'Outfit_700Bold', color: '#475569' },

    symptomsGrid: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
    symptomItem: { width: '18.5%', aspectRatio: 0.9, borderRadius: 16, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 3, elevation: 1 },
    symptomActive: { backgroundColor: '#FFF7ED', borderColor: '#EA580C', borderWidth: 2 },
    emoji: { fontSize: 22, marginBottom: 2 },
    symptomLabel: { fontSize: 8, fontFamily: 'Outfit_900Black', color: '#94A3B8', textTransform: 'uppercase', textAlign: 'center' },
    symptomLabelActive: { color: '#EA580C' },
    triggerField: { marginTop: 12, padding: 14, backgroundColor: '#FFF7ED', borderRadius: 20, borderWidth: 1, borderColor: '#FFEDD5' },
    triggerLabel: { fontSize: 10, fontFamily: 'Outfit_900Black', color: '#EA580C', textTransform: 'uppercase', letterSpacing: 0.5 },
    triggerInput: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 12, fontSize: 13, color: '#0F172A', fontFamily: 'Outfit_600SemiBold', marginTop: 8 },

    foodNoiseHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 20, marginBottom: 10 },
    optionalText: { fontSize: 10, fontFamily: 'Outfit_600SemiBold', color: '#CBD5E1', marginLeft: 'auto' },
    infoBox: { backgroundColor: '#F8FAFC', borderRadius: 16, padding: 12, gap: 6, marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0' },
    infoText: { fontSize: 11, fontFamily: 'Outfit_600SemiBold', color: '#475569', lineHeight: 15 },
    infoStrong: { fontFamily: 'Outfit_700Bold', color: '#0F172A' },
    sliderContainer: { width: '100%' },
    sliderRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 4 },
    sliderTrackWrapper: { flex: 1, height: 24, position: 'relative', justifyContent: 'center' },
    sliderTrackBg: { height: 8, backgroundColor: '#F1F5F9', borderRadius: 4 },
    sliderTrackFill: { height: 8, borderRadius: 4, position: 'absolute', left: 0 },
    sliderThumb: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#FFFFFF', borderWidth: 2, position: 'absolute', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 2 },
    sliderValueText: { fontSize: 24, fontFamily: 'Outfit_900Black', width: 40, textAlign: 'center' },
    sliderLabelsRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 2, marginRight: 56 },
    sliderLabelText: { fontSize: 10, fontFamily: 'Outfit_900Black', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.5 },
    textArea: { backgroundColor: '#F8FAFC', borderRadius: 20, padding: 16, height: 96, textAlignVertical: 'top', color: '#0F172A', fontFamily: 'Outfit_600SemiBold', fontSize: 13 },
});
