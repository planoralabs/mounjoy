import { useEffect, useRef, useState } from 'react';
import { AppState, Linking, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import i18n from '../i18n';
import { planReminders, reminderSettingsOf, anyReminderEnabled } from '../utils/reminders';
import { MOCK_MEDICATIONS } from '../constants/medications';

// Local notifications only: the phone itself fires them at the scheduled time,
// app closed or screen locked, with no server involved. Every sync replaces
// the whole schedule with a fresh plan (see utils/reminders.js).

export const notificationsSupported = Platform.OS === 'ios' || Platform.OS === 'android';

const CHANNELS = {
    dose: { name: 'doses', importance: 'HIGH' },
    weight: { name: 'weight', importance: 'DEFAULT' },
    protein: { name: 'nutrition', importance: 'DEFAULT' },
    water: { name: 'hydration', importance: 'DEFAULT' },
};
const channelFor = (kind) => CHANNELS[kind === 'doseLate' ? 'dose' : kind].name;

if (notificationsSupported) {
    Notifications.setNotificationHandler({
        handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
    });
}

/** 'granted' | 'denied' | 'undetermined' | 'unsupported' */
export const getPermissionStatus = async () => {
    if (!notificationsSupported) return 'unsupported';
    const { status } = await Notifications.getPermissionsAsync();
    return status;
};

export const requestPermission = async () => {
    if (!notificationsSupported) return 'unsupported';
    const current = await Notifications.getPermissionsAsync();
    // iOS only shows its prompt once; after a "no" only Settings can change it.
    if (current.status === 'granted' || (current.status === 'denied' && !current.canAskAgain)) return current.status;
    const { status } = await Notifications.requestPermissionsAsync();
    return status;
};

/** The app's page in the phone's settings, where notifications are turned back on. */
export const openNotificationSettings = () => Linking.openSettings();

const ensureChannels = async () => {
    if (Platform.OS !== 'android') return;
    const t = i18n.t.bind(i18n);
    await Promise.all(Object.values(CHANNELS).map(({ name, importance }) =>
        Notifications.setNotificationChannelAsync(name, {
            name: t(`reminders.channels.${name}`),
            importance: Notifications.AndroidImportance[importance],
            lightColor: '#EA580C',
        })));
};

const contentFor = (item, user) => {
    const t = i18n.t.bind(i18n);
    const med = MOCK_MEDICATIONS.find((m) => m.id === user?.medicationId);
    const params = { medication: med?.name || '', dose: user?.currentDose || '' };
    const key = item.kind === 'dose' && item.isOral ? 'doseOral' : item.kind;
    return { title: t(`reminders.notif.${key}.title`, params), body: t(`reminders.notif.${key}.body`, params) };
};

export const syncReminders = async (user) => {
    if (!notificationsSupported || !user) return;
    await Notifications.cancelAllScheduledNotificationsAsync();
    if (!anyReminderEnabled(reminderSettingsOf(user.settings))) return;
    if ((await getPermissionStatus()) !== 'granted') return;
    await ensureChannels();

    const med = MOCK_MEDICATIONS.find((m) => m.id === user.medicationId);
    const plan = planReminders(user, {
        intervalDays: med?.frequency === 'daily' ? 1 : 7,
        isOral: med?.route === 'oral',
    });
    for (const item of plan) {
        await Notifications.scheduleNotificationAsync({
            identifier: item.id,
            content: contentFor(item, user),
            trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: item.date, channelId: channelFor(item.kind) },
        });
    }
};

/**
 * Keeps the schedule in step with the record: re-plans (debounced) when the
 * user changes, and when the app returns to the foreground — a new day, or
 * notifications just re-enabled in Settings.
 */
export const useReminderSync = (user, enabled = true) => {
    const userRef = useRef(user);
    userRef.current = user;

    useEffect(() => {
        if (!notificationsSupported || !enabled || !user) return undefined;
        const id = setTimeout(() => syncReminders(userRef.current).catch((e) => console.warn('Reminder sync failed:', e)), 1500);
        return () => clearTimeout(id);
    }, [user, enabled]);

    useEffect(() => {
        if (!notificationsSupported || !enabled) return undefined;
        const sub = AppState.addEventListener('change', (state) => {
            if (state === 'active' && userRef.current) syncReminders(userRef.current).catch(() => {});
        });
        return () => sub.remove();
    }, [enabled]);
};

/** Current permission, refreshed whenever the app comes back from Settings. */
export const usePermissionStatus = () => {
    const [status, setStatus] = useState(notificationsSupported ? 'undetermined' : 'unsupported');
    const refresh = () => getPermissionStatus().then(setStatus).catch(() => {});
    useEffect(() => {
        refresh();
        const sub = AppState.addEventListener('change', (state) => { if (state === 'active') refresh(); });
        return () => sub.remove();
    }, []);
    return [status, setStatus];
};
