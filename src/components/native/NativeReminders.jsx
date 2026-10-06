import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Switch, LayoutAnimation } from 'react-native';
import { BellOff, Syringe, Pill, Droplet, Beef, Scale, Settings } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Modal, Button } from './NativeUI';
import { weekdayName, orderedWeekdays } from '../../i18n';
import { reminderSettingsOf, anyReminderEnabled, isValidTime, WATER_TIMES } from '../../utils/reminders';
import { usePermissionStatus, requestPermission, openNotificationSettings, notificationsSupported, syncReminders } from '../../services/NotificationService';
import { getMedication } from './NativeLogCenter';

const Toggle = ({ value, onValueChange, testID }) => (
    <Switch
        value={value}
        onValueChange={onValueChange}
        // Brand orange on every platform (web defaults to teal).
        thumbColor={value ? '#EA580C' : '#F8FAFC'}
        activeThumbColor="#EA580C"
        trackColor={{ false: '#E2E8F0', true: '#FED7AA' }}
        activeTrackColor="#FED7AA"
        ios_backgroundColor="#E2E8F0"
        testID={testID}
    />
);

const TimeField = ({ value, onChange, testID }) => {
    const { t } = useTranslation();
    const valid = isValidTime(value);
    return (
        <View>
            <View style={[styles.timeField, !valid && styles.timeFieldError]}>
                <Text style={styles.timeLabel}>{t('reminders.time')}</Text>
                <TextInput
                    value={value}
                    onChangeText={(v) => onChange(v.replace(/[^\d:]/g, '').slice(0, 5))}
                    placeholder="09:00"
                    placeholderTextColor="#CBD5E1"
                    keyboardType="numbers-and-punctuation"
                    style={styles.timeInput}
                    maxLength={5}
                    testID={testID}
                />
            </View>
            {!valid && <Text style={styles.errorText}>{t('reminders.invalidTime')}</Text>}
        </View>
    );
};

const Section = ({ icon: Icon, color, bg, title, sub, enabled, onToggle, children, testID }) => (
    <View style={[styles.section, enabled && styles.sectionOn]}>
        <View style={styles.sectionHead}>
            <View style={[styles.sectionIcon, { backgroundColor: bg }]}><Icon size={18} color={color} /></View>
            <View style={{ flex: 1 }}>
                <Text style={styles.sectionTitle}>{title}</Text>
                <Text style={styles.sectionSub}>{sub}</Text>
            </View>
            <Toggle value={enabled} onValueChange={onToggle} testID={testID} />
        </View>
        {enabled && children}
    </View>
);

export const RemindersModal = ({ visible, onClose, user, setUser }) => {
    const { t } = useTranslation();
    const [draft, setDraft] = useState(() => reminderSettingsOf(user.settings));
    const [permission, setPermission] = usePermissionStatus();
    const medication = getMedication(user);
    const isDaily = medication?.frequency === 'daily';

    useEffect(() => { if (visible) setDraft(reminderSettingsOf(user.settings)); }, [visible]);

    const patch = (kind, values) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setDraft((d) => ({ ...d, [kind]: { ...d[kind], ...values } }));
    };

    const allValid = ['dose', 'protein', 'weight'].every((k) => !draft[k].enabled || isValidTime(draft[k].time));

    const save = async () => {
        if (!allValid) return;
        const updated = {
            ...user,
            settings: {
                ...(user.settings || {}),
                reminders: draft,
                // Older dose-only fields, still stored on the profile row.
                remindersEnabled: draft.dose.enabled,
                reminderTime: draft.dose.time,
            },
        };
        setUser(updated);
        onClose();
        // Ask at the moment it makes sense: the user just turned reminders on.
        if (anyReminderEnabled(draft) && permission === 'undetermined') {
            const status = await requestPermission();
            setPermission(status);
            if (status === 'granted') syncReminders(updated).catch(() => {});
        }
    };

    return (
        <Modal visible={visible} onClose={onClose} title={t('reminders.title')}>
            {permission === 'denied' && (
                <View style={styles.denied} testID="reminders-denied">
                    <View style={styles.deniedHead}>
                        <BellOff size={18} color="#B45309" />
                        <Text style={styles.deniedTitle}>{t('reminders.deniedTitle')}</Text>
                    </View>
                    <Text style={styles.deniedText}>{t('reminders.deniedText')}</Text>
                    <TouchableOpacity onPress={openNotificationSettings} style={styles.deniedBtn} testID="reminders-open-settings">
                        <Settings size={15} color="#FFFFFF" />
                        <Text style={styles.deniedBtnText}>{t('reminders.openSettings')}</Text>
                    </TouchableOpacity>
                </View>
            )}
            {!notificationsSupported && <Text style={styles.webNote}>{t('reminders.webNote')}</Text>}

            <Text style={styles.intro}>{t('reminders.intro')}</Text>

            <View style={{ gap: 10 }}>
                <Section
                    icon={medication?.route === 'oral' ? Pill : Syringe} color="#2563EB" bg="#EFF6FF"
                    title={t('reminders.dose')} sub={isDaily ? t('reminders.doseSubDaily') : t('reminders.doseSubWeekly')}
                    enabled={draft.dose.enabled} onToggle={(v) => patch('dose', { enabled: v })} testID="reminder-dose"
                >
                    <TimeField value={draft.dose.time} onChange={(v) => patch('dose', { time: v })} testID="reminder-dose-time" />
                </Section>

                <Section
                    icon={Droplet} color="#3B82F6" bg="#EFF6FF"
                    title={t('reminders.water')} sub={t('reminders.waterSub', { times: WATER_TIMES.join(', ') })}
                    enabled={draft.water.enabled} onToggle={(v) => patch('water', { enabled: v })} testID="reminder-water"
                />

                <Section
                    icon={Beef} color="#F97316" bg="#FFF7ED"
                    title={t('reminders.protein')} sub={t('reminders.proteinSub')}
                    enabled={draft.protein.enabled} onToggle={(v) => patch('protein', { enabled: v })} testID="reminder-protein"
                >
                    <TimeField value={draft.protein.time} onChange={(v) => patch('protein', { time: v })} testID="reminder-protein-time" />
                </Section>

                <Section
                    icon={Scale} color="#EA580C" bg="#FFF7ED"
                    title={t('reminders.weight')} sub={t('reminders.weightSub')}
                    enabled={draft.weight.enabled} onToggle={(v) => patch('weight', { enabled: v })} testID="reminder-weight"
                >
                    <View style={styles.segment}>
                        {['daily', 'weekly'].map((f) => (
                            <TouchableOpacity key={f} onPress={() => patch('weight', { frequency: f })} style={[styles.segmentBtn, draft.weight.frequency === f && styles.segmentBtnOn]}>
                                <Text style={[styles.segmentText, draft.weight.frequency === f && styles.segmentTextOn]}>{t(`reminders.${f}`)}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                    {draft.weight.frequency === 'weekly' && (
                        <View style={styles.days}>
                            {orderedWeekdays().map((d) => (
                                <TouchableOpacity key={d} onPress={() => patch('weight', { day: d })} style={[styles.dayBtn, Number(draft.weight.day) === d && styles.dayBtnOn]}>
                                    <Text style={[styles.dayText, Number(draft.weight.day) === d && styles.dayTextOn]}>{weekdayName(d, 'narrow')}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
                    <TimeField value={draft.weight.time} onChange={(v) => patch('weight', { time: v })} testID="reminder-weight-time" />
                </Section>
            </View>

            <Text style={styles.limitNote}>{t('reminders.limitNote')}</Text>
            <Button onClick={save} disabled={!allValid} style={{ width: '100%', marginTop: 12 }} testID="reminders-save">{t('reminders.save')}</Button>
        </Modal>
    );
};

const styles = StyleSheet.create({
    intro: { fontSize: 12, fontFamily: 'Outfit_600SemiBold', color: '#64748B', textAlign: 'center', marginBottom: 16, lineHeight: 17 },
    webNote: { fontSize: 12, fontFamily: 'Outfit_600SemiBold', color: '#2563EB', backgroundColor: '#EFF6FF', borderRadius: 14, padding: 12, marginBottom: 12, textAlign: 'center' },
    limitNote: { fontSize: 11, fontFamily: 'Outfit_600SemiBold', color: '#94A3B8', textAlign: 'center', marginTop: 14 },
    denied: { backgroundColor: '#FFFBEB', borderWidth: 1, borderColor: '#FDE68A', borderRadius: 20, padding: 14, gap: 8, marginBottom: 16 },
    deniedHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    deniedTitle: { fontSize: 14, fontFamily: 'Outfit_900Black', color: '#92400E' },
    deniedText: { fontSize: 12, fontFamily: 'Outfit_600SemiBold', color: '#92400E', lineHeight: 17 },
    deniedBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#D97706', borderRadius: 14, paddingVertical: 11, marginTop: 2 },
    deniedBtnText: { fontSize: 13, fontFamily: 'Outfit_700Bold', color: '#FFFFFF' },
    section: { borderWidth: 1, borderColor: '#F1F5F9', backgroundColor: '#FFFFFF', borderRadius: 20, padding: 14, gap: 12 },
    sectionOn: { borderColor: '#FED7AA', backgroundColor: '#FFFBF7' },
    sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    sectionIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    sectionTitle: { fontSize: 14, fontFamily: 'Outfit_700Bold', color: '#0F172A' },
    sectionSub: { fontSize: 11, fontFamily: 'Outfit_600SemiBold', color: '#64748B', marginTop: 1, lineHeight: 15 },
    timeField: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10 },
    timeFieldError: { borderColor: '#FCA5A5' },
    timeLabel: { fontSize: 12, fontFamily: 'Outfit_700Bold', color: '#64748B' },
    timeInput: { fontSize: 16, fontFamily: 'Outfit_700Bold', color: '#0F172A', textAlign: 'right', minWidth: 70, padding: 0 },
    errorText: { fontSize: 11, fontFamily: 'Outfit_600SemiBold', color: '#DC2626', marginTop: 4 },
    segment: { flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: 12, padding: 3 },
    segmentBtn: { flex: 1, paddingVertical: 8, borderRadius: 9, alignItems: 'center' },
    segmentBtnOn: { backgroundColor: '#FFFFFF' },
    segmentText: { fontSize: 12, fontFamily: 'Outfit_700Bold', color: '#64748B' },
    segmentTextOn: { color: '#EA580C' },
    days: { flexDirection: 'row', justifyContent: 'space-between' },
    dayBtn: { width: 36, height: 36, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
    dayBtnOn: { backgroundColor: '#EA580C', borderColor: '#EA580C' },
    dayText: { fontSize: 12, fontFamily: 'Outfit_700Bold', color: '#64748B' },
    dayTextOn: { color: '#FFFFFF' },
});
