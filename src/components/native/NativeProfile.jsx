import React, { useState } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    ScrollView, 
    TouchableOpacity, 
    SafeAreaView, 
    Platform, 
    Image, 
    TextInput
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Button, Modal, Input, NumberStepper } from './NativeUI';
import { 
    User, 
    Shield, 
    Key, 
    AlertCircle, 
    ChevronRight, 
    LogOut, 
    Bell, 
    Camera, 
    Check, 
    TrendingUp,
    Ruler,
    PersonStanding,
    Syringe,
    Pill
} from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { unitsFor, weekdayName, formatNumber } from '../../i18n';
import { startWeightOf, photoUri } from '../../utils/journal';
import { useLog, getMedication } from './NativeLogCenter';
import { RemindersModal } from './NativeReminders';
import { SupplementsModal } from './NativeSupplements';

const MenuItem = ({ icon: Icon, label, subLabel, onPress, color = '#64748B', testID }) => (
    <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.7} testID={testID}>
        <View style={styles.menuItemLeft}>
            <View style={[styles.menuIconBox, { backgroundColor: color + '15' }]}>
                <Icon size={20} color={color} />
            </View>
            <View>
                <Text style={styles.menuLabel}>{label}</Text>
                {subLabel && <Text style={styles.menuSubLabel}>{subLabel}</Text>}
            </View>
        </View>
        <ChevronRight size={18} color="#CBD5E1" />
    </TouchableOpacity>
);

const NativeProfile = ({ user, setUser, onLogout, onDeleteAccount }) => {
    const { t } = useTranslation();
    const { openLog } = useLog();
    const units = unitsFor(user);
    const [showUnitsModal, setShowUnitsModal] = useState(false);
    const [showBodyModal, setShowBodyModal] = useState(false);
    const [bodyData, setBodyData] = useState({ height: '', startWeight: '', goalWeight: '' });
    const [showReminderModal, setShowReminderModal] = useState(false);
    const [showSupplementsModal, setShowSupplementsModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteStep, setDeleteStep] = useState(1);
    const [isDeleting, setIsDeleting] = useState(false);

    const handlePhotoPick = async () => {
        const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (permissionResult.granted === false) {
            alert(t('profile.photoPermission'));
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.7,
            base64: true,
        });

        if (!result.canceled && result.assets && result.assets[0].base64) {
            const base64Url = `data:${result.assets[0].mimeType || 'image/jpeg'};base64,${result.assets[0].base64}`;
            setUser({
                ...user,
                photoURL: base64Url
            });
        }
    };

    const updateGoal = (key, value) => {
        setUser({
            ...user,
            settings: {
                ...(user.settings || {}),
                [key]: value
            }
        });
    };

    const handleDeleteAccount = async () => {
        setIsDeleting(true);
        try {
            await (onDeleteAccount ? onDeleteAccount() : onLogout());
        } finally {
            setIsDeleting(false);
            setShowDeleteModal(false);
        }
    };

    // Height and weights from onboarding, in the user's units (stored metric:
    // height in metres, weights in kg).
    const decimalSep = formatNumber(1.5).includes(',') ? ',' : '.';
    const toField = (n, digits = 1) => (n ? Number(n).toFixed(digits).replace('.', decimalSep) : '');
    const fromField = (v) => parseFloat(String(v).replace(',', '.'));
    const heightM = parseFloat(user.height) || null;

    const openBodyModal = () => {
        const start = startWeightOf(user);
        const goal = parseFloat(user.goalWeight);
        setBodyData({
            height: heightM ? toField(units.length(heightM * 100), 0) : '',
            startWeight: start ? toField(units.weight(start)) : '',
            goalWeight: goal ? toField(units.weight(goal)) : '',
        });
        setShowBodyModal(true);
    };

    const saveBodyData = () => {
        const cm = units.lengthToCm(fromField(bodyData.height));
        const start = units.weightToKg(fromField(bodyData.startWeight));
        const goal = units.weightToKg(fromField(bodyData.goalWeight));
        setUser({
            ...user,
            ...(cm > 0 ? { height: (cm / 100).toFixed(3) } : {}),
            ...(start > 0 ? { startWeight: start.toFixed(2) } : {}),
            ...(goal > 0 ? { goalWeight: goal.toFixed(2) } : {}),
        });
        setShowBodyModal(false);
    };

    const setUnitSystem = (unitSystem) => {
        updateGoal('unitSystem', unitSystem);
        setShowUnitsModal(false);
    };

    const medication = getMedication(user);
    const currentMedicationDisplay = medication?.name || t('profile.protocolFallback');
    const waterGoal = user.settings?.waterGoal || 2.5;

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                
                {/* Profile Header */}
                <View style={styles.profileHeader}>
                    <View style={styles.avatarLargeContainer}>
                        <TouchableOpacity style={styles.avatarLarge} onPress={handlePhotoPick}>
                            {user.photoURL ? (
                                <Image source={{ uri: photoUri(user.photoURL) }} style={styles.avatarImage} />
                            ) : (
                                <Text style={styles.avatarTextLarge}>{user.name?.charAt(0).toUpperCase() || 'U'}</Text>
                            )}
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.cameraBadge} onPress={handlePhotoPick}>
                            <Camera size={16} color="#64748B" />
                        </TouchableOpacity>
                    </View>
                    <Text style={styles.profileName}>{user.name || t('profile.defaultName')}</Text>
                    {!!user.email && <Text style={styles.profileMeta}>{user.email}</Text>}
                </View>

                {/* Treatment */}
                <TouchableOpacity style={styles.treatmentCard} onPress={() => openLog('protocol')} activeOpacity={0.85} testID="profile-treatment-card">
                    <View style={styles.treatmentTopRow}>
                        <View style={styles.treatmentIcon}>
                            {medication?.route === 'oral' ? <Pill size={16} color="#FFFFFF" /> : <Syringe size={16} color="#FFFFFF" />}
                        </View>
                        <Text style={styles.treatmentKicker} numberOfLines={1}>{t('profile.treatmentTitle')}</Text>
                        <View style={styles.treatmentEdit}><Text style={styles.treatmentEditText}>{t('dashboard.change')}</Text></View>
                    </View>
                    <Text style={styles.treatmentName}>{currentMedicationDisplay} · {user.currentDose || 'N/A'}</Text>
                    <Text style={styles.treatmentSub}>
                        {medication?.frequency === 'daily'
                            ? t('profile.everyDay')
                            : user.injectionDay != null ? t('profile.everyWeekday', { day: weekdayName(user.injectionDay) }) : t('profile.weekly')}
                    </Text>
                </TouchableOpacity>

                {/* Daily goals: same order and colors as the Today screen */}
                <View style={styles.goalsCard}>
                    <View style={styles.goalsHeader}>
                        <TrendingUp size={18} color="#EA580C" />
                        <Text style={styles.goalsTitle}>{t('profile.goalsTitle')}</Text>
                    </View>
                    {[
                        { key: 'waterGoal', label: t('profile.waterGoal', { unit: units.volumeUnit }), color: '#3B82F6', value: units.formatVolumeValue(waterGoal), dec: () => Math.max(1, Math.round((waterGoal - 0.1) * 10) / 10), inc: () => Math.round((waterGoal + 0.1) * 10) / 10 },
                        { key: 'proteinGoal', label: t('profile.proteinGoal'), color: '#F97316', value: user.settings?.proteinGoal || 100, dec: () => Math.max(40, (user.settings?.proteinGoal || 100) - 5), inc: () => (user.settings?.proteinGoal || 100) + 5 },
                        { key: 'fiberGoal', label: t('profile.fiberGoal'), color: '#10B981', value: user.settings?.fiberGoal || 25, dec: () => Math.max(10, (user.settings?.fiberGoal || 25) - 1), inc: () => (user.settings?.fiberGoal || 25) + 1 },
                        { key: 'calorieGoal', label: t('profile.calorieGoal'), color: '#EF4444', value: user.settings?.calorieGoal || 1800, dec: () => Math.max(800, (user.settings?.calorieGoal || 1800) - 50), inc: () => (user.settings?.calorieGoal || 1800) + 50 },
                        { key: 'fatGoal', label: t('profile.fatGoal'), color: '#EAB308', value: user.settings?.fatGoal || 60, dec: () => Math.max(20, (user.settings?.fatGoal || 60) - 5), inc: () => (user.settings?.fatGoal || 60) + 5 },
                        { key: 'carbsGoal', label: t('profile.carbsGoal'), color: '#8B5CF6', value: user.settings?.carbsGoal || 150, dec: () => Math.max(30, (user.settings?.carbsGoal || 150) - 10), inc: () => (user.settings?.carbsGoal || 150) + 10 },
                    ].map((g, i) => (
                        <View key={g.key} style={[styles.goalLine, i > 0 && styles.goalLineDivider]}>
                            <View style={[styles.goalDot, { backgroundColor: g.color }]} />
                            <Text style={styles.goalLineLabel}>{g.label}</Text>
                            <View style={styles.goalControlRow}>
                                <TouchableOpacity onPress={() => updateGoal(g.key, g.dec())} style={styles.goalBtn}>
                                    <Text style={styles.goalBtnText}>−</Text>
                                </TouchableOpacity>
                                <Text style={styles.goalValue}>{g.value}</Text>
                                <TouchableOpacity onPress={() => updateGoal(g.key, g.inc())} style={styles.goalBtn}>
                                    <Text style={styles.goalBtnText}>+</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    ))}
                </View>

                {/* Settings list */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{t('profile.settingsTitle')}</Text>
                    <View style={styles.card}>
                        <MenuItem
                            icon={PersonStanding}
                            label={t('profile.bodyData')}
                            subLabel={heightM ? t('profile.bodyDataSub', { height: units.formatHeight(heightM), goal: user.goalWeight ? units.formatWeight(parseFloat(user.goalWeight)) : '--' }) : t('profile.bodyDataEmpty')}
                            onPress={openBodyModal}
                            color="#8B5CF6"
                            testID="profile-body-data"
                        />
                        <MenuItem icon={Ruler} label={t('units.title')} subLabel={`${t(`units.${units.system}`)} · ${t(`units.${units.system}Hint`)}`} onPress={() => setShowUnitsModal(true)} color="#10B981" />
                        <MenuItem icon={Bell} label={t('reminders.title')} subLabel={t('reminders.menuSub')} onPress={() => setShowReminderModal(true)} color="#F59E0B" testID="profile-reminders" />
                        <MenuItem icon={Pill} label={t('supplements.title')} subLabel={t('supplements.menuSub')} onPress={() => setShowSupplementsModal(true)} color="#0EA5E9" testID="profile-supplements" />
                    </View>
                </View>

                {/* Danger Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{t('profile.accountTitle')}</Text>
                    <View style={styles.card}>
                        <MenuItem icon={LogOut} label={t('profile.logout')} subLabel={t('profile.logoutSub')} onPress={onLogout} color="#EF4444" testID="profile-logout-button" />
                    </View>
                    <TouchableOpacity 
                        style={styles.deleteLink}
                        onPress={() => { setDeleteStep(1); setShowDeleteModal(true); }}
                    >
                        <Text style={styles.deleteLinkText}>{t('profile.deleteAccount')}</Text>
                    </TouchableOpacity>
                </View>

            </ScrollView>

            <RemindersModal visible={showReminderModal} onClose={() => setShowReminderModal(false)} user={user} setUser={setUser} />
            <SupplementsModal visible={showSupplementsModal} onClose={() => setShowSupplementsModal(false)} user={user} setUser={setUser} />



            {/* Modal: Confirmação de Exclusão */}
            <Modal visible={showDeleteModal} onClose={() => !isDeleting && setShowDeleteModal(false)} title={deleteStep === 1 ? t('profile.deleteWarningTitle') : t('profile.deleteLastChance')}>
                <View style={styles.deleteModalContent}>
                    <View style={styles.deleteAlertBox}>
                        <Text style={styles.deleteAlertTitle}>{t('profile.irreversible')}</Text>
                        <Text style={styles.deleteAlertDesc}>
                            {deleteStep === 1 
                                ? t('profile.deleteStep1')
                                : t('profile.deleteStep2')}
                        </Text>
                    </View>

                    <View style={{ gap: 12, width: '100%' }}>
                        {deleteStep === 1 ? (
                            <Button onClick={() => setDeleteStep(2)} style={{ backgroundColor: '#EF4444' }}>
                                {t('profile.understand')}
                            </Button>
                        ) : (
                            <Button onClick={handleDeleteAccount} disabled={isDeleting} style={{ backgroundColor: '#7F1D1D' }}>
                                {isDeleting ? t('profile.deleting') : t('profile.deleteNow')}
                            </Button>
                        )}
                        <TouchableOpacity onPress={() => setShowDeleteModal(false)} style={styles.cancelLink} disabled={isDeleting}>
                            <Text style={styles.cancelLinkText}>{t('profile.cancelBack')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Modal: Peso e altura */}
            <Modal visible={showBodyModal} onClose={() => setShowBodyModal(false)} title={t('profile.bodyData')}>
                <Text style={styles.modalIntroText}>{t('profile.bodyDataIntro')}</Text>
                <NumberStepper
                    label={t('profile.heightLabel', { unit: units.lengthUnit })}
                    value={bodyData.height}
                    onChangeText={(height) => setBodyData((b) => ({ ...b, height }))}
                    step={1}
                    decimals={0}
                    unit={units.lengthUnit}
                    testID="profile-height-input"
                />
                <NumberStepper
                    label={t('profile.startWeightLabel', { unit: units.weightUnit })}
                    value={bodyData.startWeight}
                    onChangeText={(startWeight) => setBodyData((b) => ({ ...b, startWeight }))}
                    step={units.imperial ? 1 : 0.5}
                    unit={units.weightUnit}
                    testID="profile-start-weight-input"
                />
                <NumberStepper
                    label={t('profile.goalWeightLabel', { unit: units.weightUnit })}
                    value={bodyData.goalWeight}
                    onChangeText={(goalWeight) => setBodyData((b) => ({ ...b, goalWeight }))}
                    step={units.imperial ? 1 : 0.5}
                    unit={units.weightUnit}
                    testID="profile-goal-weight-input"
                />
                <Text style={styles.reminderInfoTip}>{t('profile.bodyDataTip')}</Text>
                <Button onClick={saveBodyData} style={{ width: '100%', marginTop: 16 }} testID="profile-body-save">{t('profile.saveSettings')}</Button>
            </Modal>

            {/* Modal: Sistema de Medidas */}
            <Modal visible={showUnitsModal} onClose={() => setShowUnitsModal(false)} title={t('units.title')}>
                <Text style={styles.modalIntroText}>{t('profile.unitsIntro')}</Text>
                <View style={styles.unitGrid}>
                    {['metric', 'imperial'].map((id) => (
                        <TouchableOpacity
                            key={id}
                            onPress={() => setUnitSystem(id)}
                            style={[styles.unitCard, units.system === id && styles.unitCardActive]}
                            testID={`profile-unit-${id}`}
                        >
                            <Text style={[styles.unitCardLabel, units.system === id && styles.unitCardLabelActive]}>{t(`units.${id}`)}</Text>
                            <Text style={styles.unitCardHint}>{t(`units.${id}Hint`)}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </Modal>

        </SafeAreaView>
    );
};

export default NativeProfile;

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FAF7F2' },
    scroll: { padding: 24, paddingBottom: 120 },
    profileHeader: { alignItems: 'center', marginBottom: 24, marginTop: Platform.OS === 'android' ? 20 : 0 },
    avatarLargeContainer: {
        position: 'relative',
        width: 100, 
        height: 100,
        marginBottom: 16,
    },
    avatarLarge: { 
        width: '100%', 
        height: '100%', 
        borderRadius: 40, 
        backgroundColor: '#fff', 
        borderWidth: 1, 
        borderColor: '#E2E8F0', 
        justifyContent: 'center', 
        alignItems: 'center', 
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        overflow: 'hidden',
    },
    avatarImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    cameraBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 3,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    avatarTextLarge: { fontSize: 40, fontFamily: 'Outfit_900Black', color: '#EA580C' },
    profileName: { fontSize: 24, fontFamily: 'Outfit_700Bold', color: '#0F172A' },
    profileMeta: { fontSize: 13, fontFamily: 'Outfit_600SemiBold', color: '#94A3B8', marginTop: 4 },

    primaryActionCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 32,
        padding: 20,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        marginBottom: 20,
        elevation: 2,
    },
    primaryActionLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
    },
    primaryActionIconBox: {
        width: 48,
        height: 48,
        borderRadius: 16,
        backgroundColor: '#FFF7ED',
        justifyContent: 'center',
        alignItems: 'center',
    },
    primaryActionTitle: {
        fontSize: 16,
        fontFamily: 'Outfit_700Bold',
        color: '#0F172A',
    },
    primaryActionSub: {
        fontSize: 11,
        fontFamily: 'Outfit_600SemiBold',
        color: '#94A3B8',
        marginTop: 2,
    },

    // Goals Card
    treatmentCard: { backgroundColor: '#EA580C', borderRadius: 32, padding: 18, marginBottom: 20, shadowColor: '#EA580C', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 14, elevation: 4 },
    treatmentTopRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
    treatmentIcon: { width: 30, height: 30, borderRadius: 11, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
    treatmentKicker: { flex: 1, fontSize: 10, fontFamily: 'Outfit_900Black', color: '#FFE3D1', textTransform: 'uppercase', letterSpacing: 0.5 },
    treatmentName: { fontSize: 22, fontFamily: 'Outfit_900Black', color: '#FFFFFF' },
    treatmentSub: { fontSize: 12, fontFamily: 'Outfit_600SemiBold', color: 'rgba(255,255,255,0.85)', marginTop: 1 },
    treatmentEdit: { backgroundColor: '#FFFFFF', borderRadius: 12, paddingVertical: 6, paddingHorizontal: 10 },
    treatmentEditText: { fontSize: 11, fontFamily: 'Outfit_900Black', color: '#EA580C', textTransform: 'uppercase', letterSpacing: 0.5 },
    goalLine: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
    goalLineDivider: { borderTopWidth: 1, borderTopColor: '#F8FAFC' },
    goalDot: { width: 8, height: 8, borderRadius: 4 },
    goalLineLabel: { flex: 1, minWidth: 0, fontSize: 13, fontFamily: 'Outfit_700Bold', color: '#334155' },
    goalsCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 32,
        padding: 20,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        marginBottom: 24,
    },
    goalsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 16,
    },
    goalsTitle: {
        fontSize: 14,
        fontFamily: 'Outfit_700Bold',
        color: '#0F172A',
    },
    goalsGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 12,
    },
    goalRow: {
        flex: 1,
    },
    goalFullRow: {
        width: '100%',
    },
    goalLabel: {
        fontSize: 10,
        fontFamily: 'Outfit_900Black',
        color: '#94A3B8',
        textTransform: 'uppercase',
        marginBottom: 8,
    },
    goalControlRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flexShrink: 0,
        backgroundColor: '#F8FAFC',
        borderRadius: 16,
        padding: 4,
    },
    goalBtn: {
        width: 36,
        height: 36,
        borderRadius: 12,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    goalBtnText: {
        fontSize: 18,
        fontFamily: 'Outfit_700Bold',
        color: '#64748B',
    },
    goalValue: {
        width: 52,
        textAlign: 'center',
        fontSize: 14,
        fontFamily: 'Outfit_900Black',
        color: '#0F172A',
    },
    fiberDivider: {
        height: 1,
        backgroundColor: '#F1F5F9',
        marginVertical: 16,
    },

    section: { marginBottom: 24 },
    sectionTitle: { fontSize: 11, fontFamily: 'Outfit_900Black', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12, marginLeft: 12 },
    card: { 
        backgroundColor: '#FFFFFF', 
        borderRadius: 32, 
        paddingVertical: 10, 
        borderWidth: 1, 
        borderColor: '#F1F5F9',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.02,
        shadowRadius: 8,
        elevation: 2,
    },
    menuItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 20 },
    menuItemLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    menuIconBox: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    menuLabel: { fontSize: 15, fontFamily: 'Outfit_700Bold', color: '#0F172A' },
    menuSubLabel: { fontSize: 11, fontFamily: 'Outfit_600SemiBold', color: '#94A3B8', marginTop: 2 },

    deleteLink: {
        alignItems: 'center',
        marginTop: 16,
    },
    deleteLinkText: {
        fontSize: 11,
        fontFamily: 'Outfit_700Bold',
        color: '#CBD5E1',
        textDecorationLine: 'underline',
    },

    // Modal styles
    routeSelectorRow: {
        flexDirection: 'row',
        backgroundColor: '#F1F5F9',
        borderRadius: 16,
        padding: 4,
        marginBottom: 16,
    },
    routeBtn: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 12,
        alignItems: 'center',
    },
    routeBtnActive: {
        backgroundColor: '#FFFFFF',
        elevation: 1,
    },
    routeBtnText: {
        fontSize: 12,
        fontFamily: 'Outfit_700Bold',
        color: '#64748B',
    },
    routeBtnTextActive: {
        color: '#EA580C',
    },
    modalSubLabelText: {
        fontSize: 11,
        fontFamily: 'Outfit_900Black',
        color: '#94A3B8',
        textTransform: 'uppercase',
        marginTop: 16,
        marginBottom: 10,
    },
    medGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    medChip: {
        flex: 1,
        minWidth: '45%',
        paddingVertical: 12,
        borderRadius: 16,
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        alignItems: 'center',
    },
    medChipActive: {
        backgroundColor: '#EA580C',
        borderColor: '#EA580C',
    },
    medChipText: {
        fontSize: 13,
        fontFamily: 'Outfit_700Bold',
        color: '#475569',
    },
    medChipTextActive: {
        color: '#FFFFFF',
    },

    doseGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    doseChip: {
        flex: 1,
        minWidth: '28%',
        paddingVertical: 12,
        borderRadius: 16,
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        alignItems: 'center',
    },
    doseChipActive: {
        backgroundColor: '#EA580C',
        borderColor: '#EA580C',
    },
    doseChipText: {
        fontSize: 12,
        fontFamily: 'Outfit_700Bold',
        color: '#475569',
    },
    doseChipTextActive: {
        color: '#FFFFFF',
    },

    unitGrid: { flexDirection: 'row', gap: 12, marginTop: 8 },
    unitCard: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 24, borderWidth: 2, borderColor: '#F1F5F9', paddingVertical: 20, alignItems: 'center', gap: 4 },
    unitCardActive: { borderColor: '#EA580C', backgroundColor: '#FFF7ED' },
    unitCardLabel: { fontSize: 16, fontFamily: 'Outfit_700Bold', color: '#0F172A' },
    unitCardLabelActive: { color: '#EA580C' },
    unitCardHint: { fontSize: 12, fontFamily: 'Outfit_600SemiBold', color: '#94A3B8', letterSpacing: 0.5 },
    modalIntroText: {
        fontSize: 12,
        fontFamily: 'Outfit_600SemiBold',
        color: '#64748B',
        textAlign: 'center',
        marginBottom: 16,
    },
    measuresInputRow: {
        flexDirection: 'row',
    },

    reminderInfoTip: {
        fontSize: 10,
        fontFamily: 'Outfit_600SemiBold',
        color: '#94A3B8',
        fontStyle: 'italic',
        textAlign: 'center',
        marginTop: 8,
    },

    doseSummaryCard: {
        backgroundColor: '#F8FAFC',
        padding: 16,
        borderRadius: 20,
        alignItems: 'center',
        marginBottom: 16,
    },
    doseSummaryLabel: {
        fontSize: 10,
        fontFamily: 'Outfit_900Black',
        color: '#94A3B8',
        textTransform: 'uppercase',
    },
    doseSummaryValue: {
        fontSize: 22,
        fontFamily: 'Outfit_900Black',
        color: '#0F172A',
        marginTop: 4,
    },

    siteGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    siteChip: {
        width: '48%',
        paddingVertical: 12,
        borderRadius: 16,
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        alignItems: 'center',
    },
    siteChipActive: {
        backgroundColor: '#EA580C',
        borderColor: '#EA580C',
    },
    siteChipSuggested: {
        backgroundColor: '#E8F5E9',
        borderColor: '#C8E6C9',
    },
    siteChipText: {
        fontSize: 12,
        fontFamily: 'Outfit_700Bold',
        color: '#475569',
    },
    siteChipTextActive: {
        color: '#FFFFFF',
    },

    deleteModalContent: {
        alignItems: 'center',
        gap: 20,
    },
    deleteAlertBox: {
        backgroundColor: '#FEF2F2',
        borderRadius: 24,
        padding: 20,
        borderWidth: 1,
        borderColor: '#FEE2E2',
        alignItems: 'center',
    },
    deleteAlertTitle: {
        fontSize: 16,
        fontFamily: 'Outfit_900Black',
        color: '#EF4444',
        textTransform: 'uppercase',
        marginBottom: 8,
    },
    deleteAlertDesc: {
        fontSize: 13,
        fontFamily: 'Outfit_600SemiBold',
        color: '#7F1D1D',
        textAlign: 'center',
        lineHeight: 18,
    },
    cancelLink: {
        alignItems: 'center',
        paddingVertical: 8,
    },
    cancelLinkText: {
        fontSize: 12,
        fontFamily: 'Outfit_900Black',
        color: '#94A3B8',
        textTransform: 'uppercase',
    }
});
