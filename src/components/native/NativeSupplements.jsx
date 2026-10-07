import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, LayoutAnimation } from 'react-native';
import { Pill, Check, Plus, Minus, Trash2, Dumbbell, Settings2 } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Modal, Button } from './NativeUI';
import { formatDate, formatNumber } from '../../i18n';
import { isSameDay, recordDateFor, supplementSummaryOn } from '../../utils/journal';
import {
    SUPPLEMENT_CATALOG, WHEY_ID, DEFAULT_WHEY_NUTRIENTS, FREQUENCIES,
    supplementName, trackedSupplements, dueSupplementsOn, withFrequency, wheyOf, logsOn, lastTakenInPeriod, toggleTaken, changeWhey, changeSupplement,
} from '../../utils/supplements';

// Supplements: the user picks what they take (Profile, or from the Today card)
// and checks it off on Today. Whey also adds its nutrients to the day's goals.

const parseNum = (v) => {
    const n = parseFloat(String(v).replace(',', '.'));
    return isNaN(n) || n < 0 ? 0 : n;
};

const FrequencyPicker = ({ value, onChange }) => {
    const { t } = useTranslation();
    return (
        <View style={styles.freqRow}>
            {FREQUENCIES.map((f) => (
                <TouchableOpacity key={f} onPress={() => onChange(f)} style={[styles.freqBtn, value === f && styles.freqBtnActive]}>
                    <Text style={[styles.freqText, value === f && styles.freqTextActive]}>{t(`supplements.frequency.${f}`)}</Text>
                </TouchableOpacity>
            ))}
        </View>
    );
};

// Any Sunday: the weekday buttons start there, like Date#getDay().
const SUNDAY = new Date(2026, 9, 4);
const weekdayDate = (i) => new Date(SUNDAY.getFullYear(), SUNDAY.getMonth(), SUNDAY.getDate() + i);

/** Weekly → which weekday, monthly → which day of the month it shows up on Today. */
const SchedulePicker = ({ item, name, onChange }) => {
    const { t } = useTranslation();
    if (item.frequency === 'daily' || item.day == null) return null;
    const weekly = item.frequency === 'weekly';
    const stepDay = (delta) => onChange(((item.day - 1 + delta + 31) % 31) + 1);
    return (
        <View style={{ gap: 6 }}>
            <Text style={styles.scheduleHint}>{t(weekly ? 'supplements.askWeekday' : 'supplements.askMonthDay', { name })}</Text>
            {weekly ? (
                <View style={styles.freqRow}>
                    {[0, 1, 2, 3, 4, 5, 6].map((d) => (
                        <TouchableOpacity key={d} onPress={() => onChange(d)} style={[styles.freqBtn, item.day === d && styles.freqBtnActive]} testID={`supplement-weekday-${item.id}-${d}`}>
                            <Text style={[styles.freqText, item.day === d && styles.freqTextActive]}>{formatDate(weekdayDate(d), { weekday: 'narrow' })}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            ) : (
                <View style={styles.monthRow}>
                    <TouchableOpacity onPress={() => stepDay(-1)} style={styles.stepBtn} testID={`supplement-monthday-minus-${item.id}`}>
                        <Minus size={16} color="#64748B" />
                    </TouchableOpacity>
                    <Text style={styles.monthDay}>{item.day}</Text>
                    <TouchableOpacity onPress={() => stepDay(1)} style={[styles.stepBtn, styles.stepBtnBlue]} testID={`supplement-monthday-plus-${item.id}`}>
                        <Plus size={16} color="#FFFFFF" strokeWidth={3} />
                    </TouchableOpacity>
                </View>
            )}
            {!weekly && item.day > 28 && <Text style={styles.scheduleNote}>{t('supplements.shortMonthNote')}</Text>}
        </View>
    );
};

const CheckBox = ({ on }) => (
    <View style={[styles.checkbox, on && styles.checkboxOn]}>{on && <Check size={13} color="#FFFFFF" strokeWidth={3} />}</View>
);

export const SupplementsModal = ({ visible, onClose, user, setUser }) => {
    const { t } = useTranslation();
    const [draft, setDraft] = useState([]);
    const [otherName, setOtherName] = useState('');
    const [wheyFields, setWheyFields] = useState({});

    useEffect(() => {
        if (!visible) return;
        const list = user.supplements || [];
        setDraft(list);
        setOtherName('');
        const n = list.find((s) => s.id === WHEY_ID)?.nutrients || DEFAULT_WHEY_NUTRIENTS;
        setWheyFields(Object.fromEntries(Object.entries(n).map(([k, v]) => [k, formatNumber(v)])));
    }, [visible]);

    const animate = () => LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const find = (id) => draft.find((s) => s.id === id);
    const toggle = (item) => {
        animate();
        setDraft((d) => (d.some((s) => s.id === item.id) ? d.filter((s) => s.id !== item.id) : [...d, withFrequency({ id: item.id }, item.frequency || 'daily')]));
    };
    const setFrequency = (id, frequency) => { animate(); setDraft((d) => d.map((s) => (s.id === id ? withFrequency(s, frequency) : s))); };
    const setDay = (id, day) => setDraft((d) => d.map((s) => (s.id === id ? { ...s, day } : s)));
    const addOther = () => {
        const name = otherName.trim();
        if (!name) return;
        animate();
        setDraft((d) => [...d, { id: `custom-${Date.now()}`, custom: true, name, frequency: 'daily' }]);
        setOtherName('');
    };
    const removeCustom = (id) => { animate(); setDraft((d) => d.filter((s) => s.id !== id)); };

    const save = () => {
        const nutrients = Object.fromEntries(Object.keys(DEFAULT_WHEY_NUTRIENTS).map((k) => [k, parseNum(wheyFields[k])]));
        setUser({ ...user, supplements: draft.map((s) => (s.id === WHEY_ID ? { ...s, nutrients } : s)) });
        onClose();
    };

    const Row = ({ item, label, onRemove }) => {
        const active = find(item.id);
        return (
            <View style={[styles.row, active && styles.rowActive]}>
                <TouchableOpacity onPress={() => (onRemove ? null : toggle(item))} activeOpacity={onRemove ? 1 : 0.7} style={styles.rowHead} testID={`supplement-${item.id}`}>
                    {!onRemove && <CheckBox on={!!active} />}
                    <Text style={styles.rowLabel} numberOfLines={1}>{label}</Text>
                    {onRemove && (
                        <TouchableOpacity onPress={onRemove} hitSlop={8} testID={`supplement-remove-${item.id}`}>
                            <Trash2 size={16} color="#EF4444" />
                        </TouchableOpacity>
                    )}
                </TouchableOpacity>
                {active && <FrequencyPicker value={active.frequency} onChange={(f) => setFrequency(item.id, f)} />}
                {active && <SchedulePicker item={active} name={label} onChange={(day) => setDay(item.id, day)} />}
            </View>
        );
    };

    const whey = find(WHEY_ID);
    const customs = draft.filter((s) => s.custom);

    return (
        <Modal visible={visible} onClose={onClose} title={t('supplements.title')}>
            <Text style={styles.intro}>{t('supplements.intro')}</Text>

            <View style={{ gap: 8 }}>
                {SUPPLEMENT_CATALOG.map((item) => <Row key={item.id} item={item} label={t(`supplements.names.${item.id}`)} />)}

                {/* Whey: counts toward the day's goals */}
                <View style={[styles.row, whey && styles.rowActive]}>
                    <TouchableOpacity onPress={() => toggle({ id: WHEY_ID })} style={styles.rowHead} testID="supplement-whey">
                        <CheckBox on={!!whey} />
                        <View style={{ flex: 1 }}>
                            <Text style={styles.rowLabel}>{t('supplements.names.whey')}</Text>
                            <Text style={styles.rowSub}>{t('supplements.wheySub')}</Text>
                        </View>
                    </TouchableOpacity>
                    {whey && (
                        <View style={{ gap: 6 }}>
                            <Text style={styles.fieldTitle}>{t('supplements.perDose')}</Text>
                            <View style={styles.nutrientGrid}>
                                {[['protein', 'g'], ['calories', 'kcal'], ['carbs', 'g'], ['fat', 'g']].map(([k, unit]) => (
                                    <View key={k} style={styles.nutrientField}>
                                        <Text style={styles.nutrientLabel}>{t(`nutrients.${k}`)}</Text>
                                        <View style={styles.nutrientInputRow}>
                                            <TextInput
                                                value={wheyFields[k] ?? ''}
                                                onChangeText={(v) => setWheyFields((w) => ({ ...w, [k]: v }))}
                                                keyboardType="decimal-pad"
                                                style={styles.nutrientInput}
                                                testID={`whey-${k}`}
                                            />
                                            <Text style={styles.nutrientUnit}>{unit}</Text>
                                        </View>
                                    </View>
                                ))}
                            </View>
                        </View>
                    )}
                </View>

                {customs.map((s) => <Row key={s.id} item={s} label={s.name} onRemove={() => removeCustom(s.id)} />)}

                {/* "Other" always closes the list */}
                <View style={styles.otherRow}>
                    <TextInput
                        value={otherName}
                        onChangeText={setOtherName}
                        placeholder={`${t('supplements.other')}: ${t('supplements.otherPlaceholder')}`}
                        placeholderTextColor="#94A3B8"
                        style={styles.otherInput}
                        onSubmitEditing={addOther}
                        returnKeyType="done"
                        maxLength={40}
                        testID="supplement-other-input"
                    />
                    <TouchableOpacity onPress={addOther} style={[styles.otherAdd, !otherName.trim() && { opacity: 0.4 }]} testID="supplement-other-add">
                        <Plus size={16} color="#FFFFFF" strokeWidth={3} />
                    </TouchableOpacity>
                </View>
            </View>

            <Text style={styles.disclaimer}>{t('supplements.disclaimer')}</Text>
            <Button onClick={save} style={{ width: '100%', marginTop: 16 }} testID="supplements-save">{t('profile.saveSettings')}</Button>
        </Modal>
    );
};

/**
 * Journal → edit: how many of each supplement were taken on `day`. Lists what
 * the user has set up plus anything logged that day (even if since removed).
 */
export const SupplementsDayEditor = ({ visible, onClose, user, setUser, day }) => {
    const { t } = useTranslation();
    if (!day) return null;
    const configured = user.supplements || [];
    const logged = supplementSummaryOn(user, day).filter((g) => !configured.some((s) => s.id === g.id));
    const items = [...configured, ...logged.map((g) => ({ id: g.id, name: g.name }))];
    const when = new Date(recordDateFor(day));
    const nameOf = (s) => (s.id === WHEY_ID || SUPPLEMENT_CATALOG.some((c) => c.id === s.id) ? t(`supplements.names.${s.id}`) : s.name);

    return (
        <Modal visible={visible} onClose={onClose} title={t('supplements.editTitle', { date: formatDate(day, { day: 'numeric', month: 'long' }) })}>
            <Text style={styles.intro}>{t('supplements.editHint')}</Text>
            <View style={{ gap: 8 }}>
                {items.map((s) => {
                    const count = logsOn(user, day, s.id).length;
                    return (
                        <View key={s.id} style={[styles.row, styles.editRow, count > 0 && styles.rowActive]}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.rowLabel} numberOfLines={1}>{nameOf(s)}</Text>
                                {s.id === WHEY_ID && <Text style={styles.rowSub}>{t('supplements.wheySub')}</Text>}
                            </View>
                            <TouchableOpacity onPress={() => setUser(changeSupplement(user, s, -1, t, when))} style={styles.stepBtn} disabled={!count} testID={`day-supplement-minus-${s.id}`}>
                                <Minus size={16} color={count ? '#64748B' : '#CBD5E1'} />
                            </TouchableOpacity>
                            <Text style={styles.editCount}>{count}</Text>
                            <TouchableOpacity onPress={() => setUser(changeSupplement(user, s, 1, t, when))} style={[styles.stepBtn, styles.stepBtnBlue]} testID={`day-supplement-plus-${s.id}`}>
                                <Plus size={16} color="#FFFFFF" strokeWidth={3} />
                            </TouchableOpacity>
                        </View>
                    );
                })}
            </View>
            <Button onClick={onClose} style={{ width: '100%', marginTop: 16 }} testID="day-supplements-done">{t('supplements.done')}</Button>
        </Modal>
    );
};

/** Today screen: check-offs for vitamins and the like, plus whey servings. */
export const SupplementsCard = ({ user, setUser, onConfigure }) => {
    const { t } = useTranslation();
    const now = new Date();
    const tracked = trackedSupplements(user);
    const whey = wheyOf(user);

    if (!tracked.length && !whey) {
        return (
            <TouchableOpacity onPress={onConfigure} style={[styles.card, styles.emptyCard]} activeOpacity={0.85} testID="supplements-empty">
                <View style={styles.cardIcon}><Pill size={18} color="#0EA5E9" /></View>
                <View style={{ flex: 1 }}>
                    <Text style={styles.emptyTitle}>{t('supplements.emptyTitle')}</Text>
                    <Text style={styles.emptyText}>{t('supplements.emptyText')}</Text>
                </View>
                <Plus size={18} color="#0EA5E9" />
            </TouchableOpacity>
        );
    }

    // Weekly/monthly ones only show on their set day
    const due = dueSupplementsOn(user, now);
    const wheyToday = logsOn(user, now, WHEY_ID).length;
    const animate = () => LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

    return (
        <View style={styles.card} testID="supplements-card">
            <View style={styles.cardHeader}>
                <View style={styles.cardIcon}><Pill size={18} color="#0EA5E9" /></View>
                <Text style={styles.cardTitle}>{t('supplements.cardTitle')}</Text>
                <TouchableOpacity onPress={onConfigure} hitSlop={8} testID="supplements-configure">
                    <Settings2 size={18} color="#94A3B8" />
                </TouchableOpacity>
            </View>

            {tracked.length > 0 && !due.length && !whey && <Text style={styles.noneToday}>{t('supplements.noneToday')}</Text>}

            {due.length > 0 && (
                <View style={styles.chips}>
                    {due.map((s) => {
                        const last = lastTakenInPeriod(user, s, now);
                        const earlier = last && !isSameDay(last, now);
                        return (
                            <TouchableOpacity
                                key={s.id}
                                onPress={() => { animate(); setUser(toggleTaken(user, s, t, now)); }}
                                style={[styles.chip, last && styles.chipOn]}
                                activeOpacity={0.8}
                                testID={`supplement-chip-${s.id}`}
                            >
                                <CheckBox on={!!last} />
                                <View>
                                    <Text style={[styles.chipText, last && styles.chipTextOn]} numberOfLines={1}>{supplementName(t, s)}</Text>
                                    {earlier && <Text style={styles.chipSub}>{t('supplements.takenOn', { date: formatDate(last, { weekday: 'short', day: 'numeric' }) })}</Text>}
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            )}

            {whey && (
                <View style={styles.wheyRow}>
                    <View style={styles.wheyIcon}><Dumbbell size={16} color="#F97316" /></View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.wheyTitle}>{t('supplements.names.whey')}</Text>
                        <Text style={styles.wheySub}>
                            {wheyToday ? t('supplements.wheyDoses', { count: wheyToday }) : t('supplements.wheyNone')} · {t('supplements.wheyAdds', { protein: formatNumber((whey.nutrients || DEFAULT_WHEY_NUTRIENTS).protein) })}
                        </Text>
                    </View>
                    <TouchableOpacity onPress={() => setUser(changeWhey(user, -1, t, now))} style={styles.stepBtn} disabled={!wheyToday} testID="whey-minus">
                        <Minus size={16} color={wheyToday ? '#64748B' : '#CBD5E1'} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setUser(changeWhey(user, 1, t, now))} style={[styles.stepBtn, styles.stepBtnAdd]} testID="whey-plus">
                        <Plus size={18} color="#FFFFFF" strokeWidth={3} />
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    intro: { fontSize: 12, fontFamily: 'Outfit_600SemiBold', color: '#64748B', textAlign: 'center', marginBottom: 16, lineHeight: 17 },
    disclaimer: { fontSize: 11, fontFamily: 'Outfit_600SemiBold', color: '#94A3B8', lineHeight: 16, marginTop: 16, textAlign: 'center' },
    row: { borderWidth: 1, borderColor: '#F1F5F9', backgroundColor: '#FFFFFF', borderRadius: 18, padding: 12, gap: 10 },
    rowActive: { borderColor: '#BAE6FD', backgroundColor: '#F0F9FF' },
    rowHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    rowLabel: { flex: 1, fontSize: 14, fontFamily: 'Outfit_700Bold', color: '#0F172A' },
    rowSub: { fontSize: 11, fontFamily: 'Outfit_600SemiBold', color: '#64748B', marginTop: 1 },
    checkbox: { width: 22, height: 22, borderRadius: 7, borderWidth: 1.5, borderColor: '#CBD5E1', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
    checkboxOn: { backgroundColor: '#0EA5E9', borderColor: '#0EA5E9' },
    freqRow: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: 12, padding: 3, borderWidth: 1, borderColor: '#E0F2FE' },
    freqBtn: { flex: 1, paddingVertical: 7, borderRadius: 9, alignItems: 'center' },
    freqBtnActive: { backgroundColor: '#0EA5E9' },
    freqText: { fontSize: 11, fontFamily: 'Outfit_700Bold', color: '#64748B' },
    freqTextActive: { color: '#FFFFFF' },
    scheduleHint: { fontSize: 11, fontFamily: 'Outfit_700Bold', color: '#0369A1' },
    scheduleNote: { fontSize: 10, fontFamily: 'Outfit_600SemiBold', color: '#64748B' },
    monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
    monthDay: { minWidth: 28, textAlign: 'center', fontSize: 18, fontFamily: 'Outfit_900Black', color: '#0F172A' },
    fieldTitle: { fontSize: 10, fontFamily: 'Outfit_900Black', color: '#0369A1', textTransform: 'uppercase', letterSpacing: 0.5 },
    nutrientGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    nutrientField: { width: '47%', flexGrow: 1, backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#E0F2FE', paddingVertical: 8, paddingHorizontal: 10 },
    nutrientLabel: { fontSize: 10, fontFamily: 'Outfit_700Bold', color: '#64748B' },
    nutrientInputRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    nutrientInput: { flex: 1, minWidth: 0, fontSize: 16, fontFamily: 'Outfit_700Bold', color: '#0F172A', padding: 0 },
    nutrientUnit: { fontSize: 11, fontFamily: 'Outfit_700Bold', color: '#94A3B8' },
    otherRow: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#CBD5E1', borderRadius: 18, paddingLeft: 14, paddingRight: 6, paddingVertical: 6 },
    otherInput: { flex: 1, minWidth: 0, fontSize: 14, fontFamily: 'Outfit_600SemiBold', color: '#0F172A', paddingVertical: 6 },
    otherAdd: { width: 34, height: 34, borderRadius: 12, backgroundColor: '#0EA5E9', alignItems: 'center', justifyContent: 'center' },

    card: { backgroundColor: '#FFFFFF', borderRadius: 28, padding: 16, borderWidth: 1, borderColor: '#F1F5F9', marginBottom: 24, gap: 12 },
    emptyCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderStyle: 'dashed', borderWidth: 1.5, borderColor: '#BAE6FD' },
    emptyTitle: { fontSize: 14, fontFamily: 'Outfit_700Bold', color: '#0F172A' },
    emptyText: { fontSize: 11, fontFamily: 'Outfit_600SemiBold', color: '#64748B', marginTop: 2 },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    cardIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: '#F0F9FF', alignItems: 'center', justifyContent: 'center' },
    cardTitle: { flex: 1, fontSize: 15, fontFamily: 'Outfit_900Black', color: '#0F172A' },
    noneToday: { fontSize: 12, fontFamily: 'Outfit_600SemiBold', color: '#94A3B8' },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 14, borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#F8FAFC', paddingVertical: 8, paddingHorizontal: 10, maxWidth: '100%' },
    chipOn: { borderColor: '#BAE6FD', backgroundColor: '#F0F9FF' },
    chipText: { fontSize: 13, fontFamily: 'Outfit_700Bold', color: '#334155' },
    chipTextOn: { color: '#0369A1' },
    chipSub: { fontSize: 10, fontFamily: 'Outfit_600SemiBold', color: '#0EA5E9' },
    wheyRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 12 },
    wheyIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#FFF7ED', alignItems: 'center', justifyContent: 'center' },
    wheyTitle: { fontSize: 14, fontFamily: 'Outfit_700Bold', color: '#0F172A' },
    wheySub: { fontSize: 11, fontFamily: 'Outfit_600SemiBold', color: '#64748B', marginTop: 1 },
    stepBtn: { width: 36, height: 36, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#F8FAFC', alignItems: 'center', justifyContent: 'center' },
    stepBtnAdd: { backgroundColor: '#F97316', borderColor: '#F97316' },
    stepBtnBlue: { backgroundColor: '#0EA5E9', borderColor: '#0EA5E9' },
    editRow: { flexDirection: 'row', alignItems: 'center' },
    editCount: { minWidth: 22, textAlign: 'center', fontSize: 16, fontFamily: 'Outfit_900Black', color: '#0F172A' },
});
