import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Dimensions, Platform, Image, Pressable } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { X, Plus, Check, Columns2, Syringe, Pill, Ruler, Scale, Target, Activity, TrendingDown, Info } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { unitsFor, formatDate, formatNumber } from '../../i18n';
import { siteLabel } from '../../services/InjectionService';
import { ReminderService } from '../../services/ReminderService';
import { useLog, getMedication, doseIntervalDays } from './NativeLogCenter';
import { Modal } from './NativeUI';
import NativePhotoViewer from './NativePhotoViewer';
import NativePhotoCompare from './NativePhotoCompare';
import { weightLogs, bodyLogs, latestWeight, startWeightOf, sortedDoses, sortedPhotos, weightNear, photoUri } from '../../utils/journal';

const { width } = Dimensions.get('window');
// Small phones: section actions show only the + icon so titles keep their room.
const compactActions = width < 360;
const mascotMirrorImg = require('../../../assets/mascotmirror.png');

// Progress = "how far have I come": weight trend, photos (with the before &
// after comparator), body measures and the dose history, in that order.

const DEMO_POINTS = [105.5, 102.0, 98.5, 95.0];

// WHO adult BMI ranges; `max` is exclusive.
const BMI_BANDS = [
    { key: 'bmiUnder', min: 0, max: 18.5, color: '#3B82F6' },
    { key: 'bmiNormal', min: 18.5, max: 25, color: '#10B981' },
    { key: 'bmiOver', min: 25, max: 30, color: '#F59E0B' },
    { key: 'bmiObese1', min: 30, max: 35, color: '#F97316' },
    { key: 'bmiObese2', min: 35, max: 40, color: '#EF4444' },
    { key: 'bmiObese3', min: 40, max: Infinity, color: '#B91C1C' },
];
const bmiBandOf = (bmi) => (bmi ? BMI_BANDS.find((b) => bmi >= b.min && bmi < b.max) : null);

const SectionHeader = ({ icon: Icon, color, bg, title, subtitle, actionLabel, onAction, testID }) => (
    <View style={styles.sectionHeader}>
        <View style={[styles.sectionIcon, { backgroundColor: bg }]}><Icon size={18} color={color} /></View>
        <View style={{ flex: 1 }}>
            <Text style={styles.sectionTitle} numberOfLines={1}>{title}</Text>
            {!!subtitle && <Text style={styles.sectionSub}>{subtitle}</Text>}
        </View>
        {!!onAction && (
            <TouchableOpacity onPress={onAction} style={styles.sectionAction} testID={testID}>
                <Plus size={14} color="#EA580C" strokeWidth={3} />
                {!compactActions && <Text style={styles.sectionActionText}>{actionLabel}</Text>}
            </TouchableOpacity>
        )}
    </View>
);

const NativeProgress = ({ user, setUser }) => {
    const { t } = useTranslation();
    const { openLog } = useLog();
    const units = unitsFor(user);
    const [tooltip, setTooltip] = useState(null);
    const [viewerIndex, setViewerIndex] = useState(null);
    const [compareMode, setCompareMode] = useState(false);
    const [picked, setPicked] = useState([]); // photo.index values
    const [showCompare, setShowCompare] = useState(false);

    // ---- Weight ----------------------------------------------------------
    const realLogs = useMemo(() => weightLogs(user), [user.measurements]);
    const isDemo = realLogs.length < 2;
    const chartLogs = useMemo(() => {
        if (!isDemo) return realLogs;
        const now = Date.now();
        return DEMO_POINTS.map((w, i) => ({ date: new Date(now - (90 - i * 28) * 24 * 60 * 60 * 1000).toISOString(), weight: w }));
    }, [realLogs, isDemo]);

    const current = latestWeight(user);
    const start = startWeightOf(user);
    const goal = parseFloat(user.goalWeight) || null;
    const lost = start && current ? start - current : 0;
    const heightM = parseFloat(user.height) || null;
    const bmi = heightM && current ? current / (heightM * heightM) : null;
    const bmiBand = bmiBandOf(bmi);
    const [showBmiInfo, setShowBmiInfo] = useState(false);

    const chartData = useMemo(() => ({
        labels: chartLogs.map((l) => formatDate(l.date, { day: '2-digit', month: '2-digit' })),
        datasets: [{ data: chartLogs.map((l) => units.weight(l.weight)), color: (o = 1) => `rgba(234, 88, 12, ${o})`, strokeWidth: 3 }],
    }), [chartLogs, units.system]);

    const chartWidth = Math.max(width - 48, chartLogs.length * 65);

    const getXForIndex = (index, total) => {
        const w = chartWidth - 40;
        const k = w / 298;
        const pLeft = 64 * k;
        const pRight = 58.5 * k;
        if (total <= 1) return w / 2;
        return pLeft + (index * (w - pLeft - pRight)) / (total - 1);
    };
    const getYForValue = (value) => {
        const values = chartLogs.map((l) => l.weight);
        const max = Math.max(...values);
        const min = Math.min(...values);
        if (max === min) return 98.5;
        return 181 - ((value - min) / (max - min)) * 165;
    };
    const handlePointClick = (index) => {
        const log = chartLogs[index];
        if (!log) return;
        setTooltip({
            x: getXForIndex(index, chartLogs.length),
            y: getYForValue(log.weight),
            value: log.weight,
            date: formatDate(log.date, { day: 'numeric', month: 'long' }),
            bmi: heightM ? (log.weight / (heightM * heightM)).toFixed(1) : null,
        });
    };

    // ---- Photos ------------------------------------------------------------
    const photos = useMemo(() => sortedPhotos(user), [user.photos]);
    const newestFirst = useMemo(() => [...photos].reverse(), [photos]);
    const pickedPhotos = photos.filter((p) => picked.includes(p.index));

    const togglePick = (photo) => {
        setPicked((prev) => (prev.includes(photo.index)
            ? prev.filter((i) => i !== photo.index)
            : prev.length < 4 ? [...prev, photo.index] : prev));
    };
    const deletePhoto = (photo) => {
        const remaining = (user.photos || []).filter((_, i) => i !== photo.index);
        setUser({ ...user, photos: remaining });
        setPicked([]);
        setViewerIndex(remaining.length ? Math.min(viewerIndex, remaining.length - 1) : null);
    };

    // ---- Body measures -------------------------------------------------------
    const body = useMemo(() => bodyLogs(user), [user.measurements]);
    const lastBody = body[body.length - 1];
    const firstWaist = body.find((m) => m.waist > 0)?.waist;
    const firstHip = body.find((m) => m.hip > 0)?.hip;
    const lastWaist = [...body].reverse().find((m) => m.waist > 0)?.waist;
    const lastHip = [...body].reverse().find((m) => m.hip > 0)?.hip;
    const fmtLen = (cm) => `${formatNumber(units.length(cm))} ${units.lengthUnit}`;
    const fmtLenDiff = (cm) => {
        const v = units.length(cm);
        return `${v > 0 ? '+' : ''}${formatNumber(v)} ${units.lengthUnit}`;
    };

    // ---- Doses -------------------------------------------------------------
    const medication = getMedication(user);
    const doses = useMemo(() => sortedDoses(user), [user.doseHistory]);
    const reminder = ReminderService.calculateNextDose(doses, doseIntervalDays(medication));

    const stats = [
        { icon: Scale, color: '#EA580C', bg: '#FFF7ED', label: t('progress.current'), value: current ? units.formatWeight(current) : '--' },
        { icon: TrendingDown, color: '#10B981', bg: '#ECFDF5', label: t('progress.lost'), value: start && current ? units.formatWeightDiff(-lost) : '--' },
        { icon: Target, color: '#8B5CF6', bg: '#F5F3FF', label: t('progress.goal'), value: goal ? units.formatWeight(goal) : '--', sub: goal && current && current > goal ? t('progress.toGo', { value: units.formatWeight(current - goal) }) : null },
        { icon: Activity, color: '#2563EB', bg: '#EFF6FF', label: t('evolution.bmi'), value: bmi ? formatNumber(bmi) : '--', sub: bmiBand ? t(`progress.${bmiBand.key}`) : null, subColor: bmiBand?.color, onInfo: () => setShowBmiInfo(true) },
    ];

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                <View style={styles.header}>
                    <Text style={styles.title}>{t('progress.title')}</Text>
                    <Text style={styles.subtitle}>{t('progress.subtitle')}</Text>
                </View>

                {/* Key numbers */}
                <View style={styles.statsGrid}>
                    {stats.map((s) => {
                        const Card = s.onInfo ? TouchableOpacity : View;
                        return (
                            <Card
                                key={s.label}
                                style={styles.statCard}
                                {...(s.onInfo ? { onPress: s.onInfo, activeOpacity: 0.85, accessibilityRole: 'button', accessibilityLabel: t('progress.bmiInfoA11y') } : {})}
                            >
                                {!!s.onInfo && <View style={styles.statInfo}><Info size={14} color="#94A3B8" /></View>}
                                <View style={[styles.statIcon, { backgroundColor: s.bg }]}><s.icon size={16} color={s.color} /></View>
                                <Text style={styles.statLabel}>{s.label}</Text>
                                <Text style={styles.statValue}>{s.value}</Text>
                                {!!s.sub && <Text style={[styles.statSub, s.subColor && { color: s.subColor }]}>{s.sub}</Text>}
                            </Card>
                        );
                    })}
                </View>

                {/* Weight chart */}
                <View style={styles.card}>
                    <SectionHeader
                        icon={Scale} color="#EA580C" bg="#FFF7ED"
                        title={t('progress.weightTitle')}
                        subtitle={isDemo ? t('progress.demoHint') : t('progress.weighIns', { count: realLogs.length })}
                        actionLabel={t('progress.log')}
                        onAction={() => openLog('weight')}
                        testID="progress-weight-button"
                    />
                    {isDemo && <View style={styles.demoBadge}><Text style={styles.demoBadgeText}>{t('progress.demo')}</Text></View>}
                    <View style={[{ flexDirection: 'row' }, isDemo && { opacity: 0.45 }]}>
                        <View style={{ width: 36, overflow: 'hidden', height: 220 }}>
                            <LineChart
                                data={chartData}
                                width={width - 48}
                                height={220}
                                chartConfig={{
                                    backgroundColor: '#ffffff', backgroundGradientFrom: '#ffffff', backgroundGradientTo: '#ffffff',
                                    decimalPlaces: 1, color: () => 'transparent',
                                    labelColor: (o = 1) => `rgba(148, 163, 184, ${o})`,
                                    propsForLabels: { fontFamily: 'Outfit_700Bold', fontSize: 10 },
                                    gridColor: 'transparent', propsForDots: { r: '0', strokeWidth: '0' },
                                }}
                                bezier
                                style={{ marginVertical: 8, marginLeft: -20 }}
                                withInnerLines={false} withOuterLines={false} withShadow={false} withDots={false}
                                withVerticalLabels={false} withHorizontalLabels
                            />
                        </View>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 20 }}>
                            <LineChart
                                data={chartData}
                                width={chartWidth - 40}
                                height={220}
                                chartConfig={{
                                    backgroundColor: '#ffffff', backgroundGradientFrom: '#ffffff', backgroundGradientTo: '#ffffff',
                                    decimalPlaces: 1, color: (o = 1) => `rgba(234, 88, 12, ${o})`,
                                    labelColor: (o = 1) => `rgba(148, 163, 184, ${o})`,
                                    propsForLabels: { fontFamily: 'Outfit_700Bold', fontSize: 10 },
                                    propsForDots: { r: '6', strokeWidth: '2', stroke: '#EA580C' },
                                }}
                                bezier
                                style={{ marginVertical: 8, marginLeft: -48 }}
                                withInnerLines={false} withOuterLines={false} withShadow withHorizontalLabels={false} withVerticalLabels
                                onDataPointClick={({ index }) => !isDemo && handlePointClick(index)}
                            />
                            {!isDemo && chartData.labels.map((_, index) => (
                                <Pressable
                                    key={index}
                                    style={{ position: 'absolute', left: getXForIndex(index, chartLogs.length) - 25 - 48, top: 8, width: 50, height: 200, zIndex: 15 }}
                                    onPress={() => handlePointClick(index)}
                                />
                            ))}
                            {tooltip && (
                                <>
                                    <Pressable style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10 }} onPress={() => setTooltip(null)} />
                                    <Pressable style={[styles.tooltip, { left: Math.max(10, Math.min(chartWidth - 40 - 160, tooltip.x - 113)), top: Math.max(10, tooltip.y - 80) }]}>
                                        <TouchableOpacity style={styles.tooltipClose} onPress={() => setTooltip(null)}><X size={12} color="#94A3B8" /></TouchableOpacity>
                                        <Text style={styles.tooltipDate}>{tooltip.date}</Text>
                                        <Text style={styles.tooltipText}>{t('evolution.weightLabel')}: <Text style={styles.tooltipBold}>{units.formatWeight(tooltip.value)}</Text></Text>
                                        {!!tooltip.bmi && <Text style={styles.tooltipText}>{t('evolution.bmi')}: <Text style={styles.tooltipBold}>{tooltip.bmi}</Text></Text>}
                                    </Pressable>
                                </>
                            )}
                        </ScrollView>
                    </View>
                </View>

                {/* Photos */}
                <View style={styles.card}>
                    <SectionHeader
                        icon={Columns2} color="#10B981" bg="#ECFDF5"
                        title={t('progress.photosTitle')}
                        subtitle={compareMode ? t('progress.pickHint', { count: picked.length }) : photos.length ? t('progress.photosCount', { count: photos.length }) : null}
                        actionLabel={t('progress.add')}
                        onAction={compareMode ? null : () => openLog('photo')}
                        testID="progress-photo-button"
                    />
                    {photos.length > 0 ? (
                        <>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photoStrip}>
                                {newestFirst.map((photo) => {
                                    const order = picked.indexOf(photo.index);
                                    const w = weightNear(user, photo.date);
                                    return (
                                        <TouchableOpacity
                                            key={`${photo.index}`}
                                            onPress={() => (compareMode ? togglePick(photo) : setViewerIndex(photos.indexOf(photo)))}
                                            style={[styles.thumb, order >= 0 && styles.thumbPicked]}
                                            activeOpacity={0.85}
                                        >
                                            <Image source={{ uri: photoUri(photo) }} style={styles.thumbImg} />
                                            <View style={styles.thumbFooter}>
                                                <Text style={styles.thumbText}>{photo.date ? formatDate(photo.date, { day: '2-digit', month: 'short' }) : ''}</Text>
                                                {!!w && <Text style={styles.thumbText}>{units.formatWeight(w)}</Text>}
                                            </View>
                                            {compareMode && (
                                                <View style={[styles.pickBadge, order >= 0 && styles.pickBadgeOn]}>
                                                    {order >= 0 ? <Text style={styles.pickBadgeText}>{order + 1}</Text> : null}
                                                </View>
                                            )}
                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>
                            {photos.length >= 2 && (compareMode ? (
                                <View style={styles.compareActions}>
                                    <TouchableOpacity onPress={() => { setCompareMode(false); setPicked([]); }} style={styles.ghostBtn}>
                                        <Text style={styles.ghostBtnText}>{t('common.cancel')}</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        onPress={() => setShowCompare(true)}
                                        disabled={picked.length < 2}
                                        style={[styles.primaryBtn, picked.length < 2 && { opacity: 0.4 }]}
                                    >
                                        <Check size={16} color="#FFFFFF" strokeWidth={3} />
                                        <Text style={styles.primaryBtnText}>{t('progress.compareNow')}</Text>
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <TouchableOpacity onPress={() => setCompareMode(true)} style={styles.compareBtn} testID="progress-compare-button">
                                    <Columns2 size={16} color="#EA580C" />
                                    <Text style={styles.compareBtnText}>{t('progress.compare')}</Text>
                                </TouchableOpacity>
                            ))}
                        </>
                    ) : (
                        <TouchableOpacity onPress={() => openLog('photo')} style={styles.photoEmpty} activeOpacity={0.85}>
                            <Image source={mascotMirrorImg} style={styles.photoEmptyMascot} resizeMode="contain" />
                            <View style={{ flex: 1 }}>
                                <Text style={styles.photoEmptyTitle}>{t('progress.photosEmptyTitle')}</Text>
                                <Text style={styles.photoEmptyText}>{t('progress.photosEmptyText')}</Text>
                            </View>
                        </TouchableOpacity>
                    )}
                </View>

                {/* Body measures */}
                <View style={styles.card}>
                    <SectionHeader
                        icon={Ruler} color="#8B5CF6" bg="#F5F3FF"
                        title={t('progress.measuresTitle')}
                        subtitle={lastBody ? t('progress.lastOn', { date: formatDate(lastBody.date, { day: '2-digit', month: 'short' }) }) : t('profile.measuresIntro')}
                        actionLabel={t('progress.log')}
                        onAction={() => openLog('measures')}
                    />
                    {lastBody ? (
                        <View style={styles.measureRow}>
                            {[
                                { label: t('progress.waist'), last: lastWaist, first: firstWaist },
                                { label: t('progress.hip'), last: lastHip, first: firstHip },
                            ].map((m) => (
                                <View key={m.label} style={styles.measureBox}>
                                    <Text style={styles.measureLabel}>{m.label}</Text>
                                    <Text style={styles.measureValue}>{m.last ? fmtLen(m.last) : '--'}</Text>
                                    {!!m.last && !!m.first && m.last !== m.first && (
                                        <Text style={[styles.measureDiff, { color: m.last < m.first ? '#10B981' : '#EF4444' }]}>
                                            {t('progress.sinceFirst', { value: fmtLenDiff(m.last - m.first) })}
                                        </Text>
                                    )}
                                </View>
                            ))}
                        </View>
                    ) : null}
                </View>

                {/* Doses */}
                <View style={styles.card}>
                    <SectionHeader
                        icon={medication?.route === 'oral' ? Pill : Syringe} color="#2563EB" bg="#EFF6FF"
                        title={t('progress.dosesTitle')}
                        actionLabel={t('progress.log')}
                        onAction={() => openLog('dose')}
                    />
                    <View style={{ gap: 10 }}>
                        {doses.length > 0 ? doses.slice(0, 5).map((dose, idx) => {
                            // Each record keeps the medication it was logged with, so a
                            // protocol change doesn't rewrite the history.
                            const doseMed = getMedication({ medicationId: dose.medication });
                            return (
                                <View key={`${dose.date}-${idx}`} style={styles.doseItem}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.doseDate}>{formatDate(dose.date, { day: '2-digit', month: 'short' })}</Text>
                                        <Text style={styles.doseSite}>{siteLabel(t, dose)}</Text>
                                    </View>
                                    <View style={{ alignItems: 'flex-end' }}>
                                        {!!doseMed && <Text style={styles.doseMed} numberOfLines={1}>{doseMed.name}</Text>}
                                        <Text style={styles.doseVal}>{dose.dose}</Text>
                                    </View>
                                </View>
                            );
                        }) : (
                            <Text style={styles.emptyText}>{t('common.noDosesYet')}</Text>
                        )}
                        {doses.length > 0 && (
                            <View style={styles.nextDoseBox}>
                                <Text style={styles.nextDoseLabel}>{t('evolution.nextDose')}</Text>
                                <Text style={styles.nextDoseDate}>{formatDate(reminder.nextDoseDate, { weekday: 'short', day: '2-digit', month: 'short' })}</Text>
                            </View>
                        )}
                    </View>
                </View>
            </ScrollView>

            <Modal visible={showBmiInfo} onClose={() => setShowBmiInfo(false)} title={t('progress.bmiInfoTitle')}>
                <Text style={styles.bmiIntro}>{t('progress.bmiInfoIntro')}</Text>
                <View style={styles.bmiList}>
                    {BMI_BANDS.map((b) => {
                        const active = bmiBand?.key === b.key;
                        const range = b.min === 0
                            ? `< ${formatNumber(b.max)}`
                            : b.max === Infinity ? `≥ ${formatNumber(b.min)}` : `${formatNumber(b.min)} – ${formatNumber(b.max - 0.1)}`;
                        return (
                            <View key={b.key} style={[styles.bmiRow, active && { borderColor: b.color, backgroundColor: `${b.color}14` }]}>
                                <View style={[styles.bmiDot, { backgroundColor: b.color }]} />
                                <Text style={[styles.bmiName, active && { color: '#0F172A' }]}>{t(`progress.${b.key}`)}</Text>
                                {active && (
                                    <View style={[styles.bmiYou, { backgroundColor: b.color }]}>
                                        <Text style={styles.bmiYouText}>{t('progress.bmiYou')} · {formatNumber(bmi)}</Text>
                                    </View>
                                )}
                                <Text style={styles.bmiRange}>{range}</Text>
                            </View>
                        );
                    })}
                </View>
                <Text style={styles.bmiNote}>{t('progress.bmiNote')}</Text>
            </Modal>
            <NativePhotoViewer
                photos={photos}
                index={viewerIndex}
                onIndexChange={setViewerIndex}
                onClose={() => setViewerIndex(null)}
                onDelete={deletePhoto}
                caption={(p) => { const w = weightNear(user, p.date); return w ? units.formatWeight(w) : ''; }}
            />
            <NativePhotoCompare
                visible={showCompare}
                photos={pickedPhotos}
                weightFor={(p) => weightNear(user, p.date)}
                formatWeight={(kg) => units.formatWeight(kg)}
                formatDiff={(kg) => units.formatWeightDiff(kg)}
                onClose={() => setShowCompare(false)}
            />
        </SafeAreaView>
    );
};

export default NativeProgress;

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FAF7F2' },
    scroll: { padding: 24, paddingBottom: 130 },
    header: { marginBottom: 20, marginTop: Platform.OS === 'android' ? 20 : 0 },
    title: { fontSize: 24, fontFamily: 'Outfit_900Black', color: '#0F172A' },
    subtitle: { fontSize: 13, fontFamily: 'Outfit_600SemiBold', color: '#EA580C', marginTop: 2 },

    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20 },
    statCard: { width: '47%', flexGrow: 1, backgroundColor: '#FFFFFF', borderRadius: 28, padding: 16, borderWidth: 1, borderColor: '#F1F5F9', elevation: 1 },
    statIcon: { width: 32, height: 32, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
    statLabel: { fontSize: 9, fontFamily: 'Outfit_900Black', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 },
    statValue: { fontSize: 20, fontFamily: 'Outfit_900Black', color: '#0F172A' },
    statSub: { fontSize: 10, fontFamily: 'Outfit_700Bold', color: '#8B5CF6', marginTop: 2 },

    card: { backgroundColor: '#FFFFFF', borderRadius: 32, padding: 18, marginBottom: 20, borderWidth: 1, borderColor: '#F1F5F9', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.02, shadowRadius: 8, overflow: 'hidden' },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
    sectionIcon: { width: 38, height: 38, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
    sectionTitle: { fontSize: 15, fontFamily: 'Outfit_900Black', color: '#0F172A' },
    sectionSub: { fontSize: 11, fontFamily: 'Outfit_600SemiBold', color: '#94A3B8', marginTop: 1 },
    sectionAction: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FFF7ED', borderRadius: 12, paddingVertical: 7, paddingHorizontal: 10, borderWidth: 1, borderColor: '#FFEDD5' },
    sectionActionText: { fontSize: 11, fontFamily: 'Outfit_900Black', color: '#EA580C' },
    demoBadge: { position: 'absolute', top: 120, alignSelf: 'center', zIndex: 20, backgroundColor: '#0F172A', borderRadius: 12, paddingVertical: 6, paddingHorizontal: 12 },
    demoBadgeText: { fontSize: 11, fontFamily: 'Outfit_900Black', color: '#FFFFFF', textTransform: 'uppercase', letterSpacing: 1 },

    tooltip: { position: 'absolute', backgroundColor: '#FFFFFF', borderRadius: 18, padding: 14, width: 160, borderWidth: 1, borderColor: '#E2E8F0', elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 6, zIndex: 20 },
    tooltipClose: { position: 'absolute', top: 8, right: 8, padding: 4 },
    tooltipDate: { fontSize: 12, fontFamily: 'Outfit_900Black', color: '#64748B', marginBottom: 6 },
    tooltipText: { fontSize: 12, fontFamily: 'Outfit_600SemiBold', color: '#475569', lineHeight: 18 },
    tooltipBold: { fontFamily: 'Outfit_700Bold', color: '#0F172A' },

    photoStrip: { gap: 10, paddingRight: 4 },
    thumb: { width: 104, height: 140, borderRadius: 20, overflow: 'hidden', backgroundColor: '#F1F5F9', borderWidth: 2, borderColor: 'transparent' },
    thumbPicked: { borderColor: '#EA580C' },
    thumbImg: { width: '100%', height: '100%' },
    thumbFooter: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.45)', paddingVertical: 4, paddingHorizontal: 6 },
    thumbText: { fontSize: 9, fontFamily: 'Outfit_900Black', color: '#FFFFFF', textTransform: 'uppercase' },
    pickBadge: { position: 'absolute', top: 6, right: 6, width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#FFFFFF', backgroundColor: 'rgba(0,0,0,0.25)', justifyContent: 'center', alignItems: 'center' },
    pickBadgeOn: { backgroundColor: '#EA580C' },
    pickBadgeText: { fontSize: 11, fontFamily: 'Outfit_900Black', color: '#FFFFFF' },
    compareBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 14, paddingVertical: 12, borderRadius: 16, backgroundColor: '#FFF7ED', borderWidth: 1, borderColor: '#FFEDD5' },
    compareBtnText: { fontSize: 13, fontFamily: 'Outfit_900Black', color: '#EA580C' },
    compareActions: { flexDirection: 'row', gap: 10, marginTop: 14 },
    ghostBtn: { flex: 1, paddingVertical: 12, borderRadius: 16, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center' },
    ghostBtnText: { fontSize: 13, fontFamily: 'Outfit_700Bold', color: '#64748B' },
    primaryBtn: { flex: 2, flexDirection: 'row', gap: 6, paddingVertical: 12, borderRadius: 16, backgroundColor: '#EA580C', alignItems: 'center', justifyContent: 'center' },
    primaryBtnText: { fontSize: 13, fontFamily: 'Outfit_900Black', color: '#FFFFFF' },
    photoEmpty: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#F8FAFC', borderRadius: 24, padding: 12, borderWidth: 2, borderStyle: 'dashed', borderColor: '#CBD5E1' },
    photoEmptyMascot: { width: 72, height: 72 },
    photoEmptyTitle: { fontSize: 14, fontFamily: 'Outfit_900Black', color: '#334155' },
    photoEmptyText: { fontSize: 11, fontFamily: 'Outfit_600SemiBold', color: '#94A3B8', marginTop: 2, lineHeight: 15 },

    measureRow: { flexDirection: 'row', gap: 12 },
    measureBox: { flex: 1, backgroundColor: '#F5F3FF', borderRadius: 20, padding: 14 },
    measureLabel: { fontSize: 9, fontFamily: 'Outfit_900Black', color: '#8B5CF6', textTransform: 'uppercase', letterSpacing: 1 },
    measureValue: { fontSize: 20, fontFamily: 'Outfit_900Black', color: '#4C1D95', marginTop: 2 },
    measureDiff: { fontSize: 10, fontFamily: 'Outfit_700Bold', marginTop: 2 },

    doseItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#F8FAFC', paddingBottom: 10 },
    doseDate: { fontSize: 14, fontFamily: 'Outfit_700Bold', color: '#334155' },
    doseSite: { fontSize: 10, fontFamily: 'Outfit_900Black', color: '#94A3B8', textTransform: 'uppercase', marginTop: 2 },
    doseVal: { fontSize: 14, fontFamily: 'Outfit_900Black', color: '#EA580C' },
    doseMed: { fontSize: 10, fontFamily: 'Outfit_700Bold', color: '#64748B', marginBottom: 1 },
    statInfo: { position: 'absolute', top: 14, right: 14 },
    bmiIntro: { fontSize: 13, fontFamily: 'Outfit_600SemiBold', color: '#64748B', lineHeight: 19, marginBottom: 16 },
    bmiList: { gap: 8 },
    bmiRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 16, borderWidth: 1, borderColor: '#F1F5F9', backgroundColor: '#FFFFFF' },
    bmiDot: { width: 10, height: 10, borderRadius: 5 },
    bmiName: { flex: 1, fontSize: 13, fontFamily: 'Outfit_700Bold', color: '#475569' },
    bmiYou: { borderRadius: 10, paddingVertical: 3, paddingHorizontal: 8 },
    bmiYouText: { fontSize: 10, fontFamily: 'Outfit_900Black', color: '#FFFFFF' },
    bmiRange: { minWidth: 72, textAlign: 'right', fontSize: 12, fontFamily: 'Outfit_700Bold', color: '#94A3B8' },
    bmiNote: { fontSize: 11, fontFamily: 'Outfit_600SemiBold', color: '#94A3B8', lineHeight: 16, marginTop: 16, marginBottom: 8 },
    emptyText: { fontSize: 12, fontFamily: 'Outfit_600SemiBold', color: '#94A3B8', fontStyle: 'italic' },
    nextDoseBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#EFF6FF', borderRadius: 16, padding: 12 },
    nextDoseLabel: { fontSize: 11, fontFamily: 'Outfit_700Bold', color: '#1E3A8A' },
    nextDoseDate: { fontSize: 12, fontFamily: 'Outfit_900Black', color: '#2563EB' },
});
