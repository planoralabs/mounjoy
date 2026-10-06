import React, { useState, useMemo, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TouchableWithoutFeedback, SafeAreaView, Platform, Image, LayoutAnimation, Animated } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop, ClipPath, Rect } from 'react-native-svg';
import { ChevronLeft, ChevronRight, Plus, Minus, Info, TrendingUp, Zap, Camera, Check, MapPin, Flame, Wheat, Droplet, Pencil } from 'lucide-react-native';
import { Modal, NumberStepper, Button } from './NativeUI';
import { useTranslation } from 'react-i18next';
import { ReminderService } from '../../services/ReminderService';
import { suggestNextInjection } from '../../services/InjectionService';
import { unitsFor, formatDate, formatNumber } from '../../i18n';
import { useLog, getMedication, doseIntervalDays } from './NativeLogCenter';
import { SupplementsCard, SupplementsModal } from './NativeSupplements';
import { intakeKey, isSameDay, daysBetween, latestWeight, startWeightOf, sortedDoses, weightLogs, photoUri, sortedPhotos } from '../../utils/journal';

const waterImg = require('../../../assets/water.png');
const proteinImg = require('../../../assets/protein.png');
const fiberImg = require('../../../assets/fiber.png');
const mascotAchieveImg = require('../../../assets/mascotachieve.png');
const mascotFeedImg = require('../../../assets/mascotfeed.png');
const mascotFoodNoiseImg = require('../../../assets/mascotfoodnoise.png');
const mascotStrongImg = require('../../../assets/mascotstrong.png');
const mascotHydratedImg = require('../../../assets/mascothydrated.png');
const mascotZenImg = require('../../../assets/mascotzen.png');

const ConfettiParticle = ({ delay, color }) => {
    const p = useMemo(() => {
        const angle = Math.random() * Math.PI * 2;
        const distance = 40 + Math.random() * 70;
        return {
            tx: Math.cos(angle) * distance,
            ty: Math.sin(angle) * distance,
            rotate: `${Math.random() * 360}deg`,
            size: Math.random() > 0.5 ? 5 : 7,
            opacity: Math.random() > 0.5 ? 1 : 0.6,
        };
    }, []);
    const anim = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        Animated.sequence([Animated.delay(delay), Animated.timing(anim, { toValue: 1, duration: 1200, useNativeDriver: true })]).start();
    }, []);
    return (
        <Animated.View
            style={{
                position: 'absolute', left: 32, top: '50%', width: p.size, height: p.size, borderRadius: p.size / 2,
                backgroundColor: color, opacity: anim.interpolate({ inputRange: [0, 0.7, 1], outputRange: [p.opacity, p.opacity, 0] }),
                marginLeft: -p.size / 2, marginTop: -p.size / 2,
                transform: [
                    { translateX: anim.interpolate({ inputRange: [0, 1], outputRange: [0, p.tx] }) },
                    { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [0, p.ty] }) },
                    { scale: anim.interpolate({ inputRange: [0, 0.7, 1], outputRange: [0, 1, 0.4] }) },
                    { rotate: p.rotate },
                ],
            }}
        />
    );
};

const Confetti = ({ color }) => {
    const particles = useMemo(() => Array.from({ length: 24 }, (_, i) => ({ id: i, delay: Math.random() * 150 })), []);
    return (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
            {particles.map((p) => <ConfettiParticle key={p.id} delay={p.delay} color={color} />)}
        </View>
    );
};

const SvgDroplet = ({ fillLevel }) => (
    <Svg viewBox="0 0 24 24" style={{ width: '100%', height: '100%' }}>
        <Defs>
            <LinearGradient id="carvedGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <Stop offset="0%" stopColor="#9a3412" />
                <Stop offset="100%" stopColor="#ea580c" />
            </LinearGradient>
            <LinearGradient id="liquidGlow" x1="0%" y1="0%" x2="0%" y2="100%">
                <Stop offset="0%" stopColor="#fde047" />
                <Stop offset="100%" stopColor="#f59e0b" />
            </LinearGradient>
            <ClipPath id="dropClip">
                <Rect x={0} y={24 - (24 * fillLevel / 100)} width={24} height={24} />
            </ClipPath>
        </Defs>
        <Path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" fill="url(#carvedGradient)" />
        <Path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" fill="url(#liquidGlow)" clipPath="url(#dropClip)" />
        <Path d="M12 4c.5 1 1 2 2 4M9 12a3 3 0 0 0 6 0" stroke="white" strokeOpacity={0.15} fill="none" strokeLinecap="round" />
    </Svg>
);

// One daily goal (water, protein or fiber). All three sit stacked in the same
// card so the whole day is visible at a glance; tapping + still gets the
// mascot cheer, and crossing the goal still throws confetti.
const NutrientRow = ({ label, value, goalText, pct, color, tint, img, icon: Icon, mascot, onAdd, onRemove, onEdit, testID }) => {
    const done = pct >= 100;
    const [cheer, setCheer] = useState(false);
    const [confetti, setConfetti] = useState(false);
    const pop = useRef(new Animated.Value(0)).current;
    const hideTimer = useRef(null);
    const prevDone = useRef(done);

    useEffect(() => {
        if (done && !prevDone.current) {
            setConfetti(true);
            setTimeout(() => setConfetti(false), 1600);
        }
        prevDone.current = done;
    }, [done]);

    useEffect(() => () => clearTimeout(hideTimer.current), []);

    const handleAdd = () => {
        onAdd();
        clearTimeout(hideTimer.current);
        setCheer(true);
        pop.setValue(0);
        Animated.spring(pop, { toValue: 1, friction: 4, tension: 120, useNativeDriver: true }).start();
        hideTimer.current = setTimeout(() => {
            Animated.timing(pop, { toValue: 0, duration: 250, useNativeDriver: true }).start(() => setCheer(false));
        }, 1500);
    };

    return (
        <View style={[styles.nutrientRow, done && { backgroundColor: tint, borderColor: tint }]}>
            {confetti && <Confetti color={color} />}
            <View style={styles.nutrientIconBox}>
                {cheer ? (
                    <Animated.Image
                        source={mascot}
                        style={[styles.nutrientMascot, { opacity: pop, transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) }] }]}
                        resizeMode="contain"
                    />
                ) : (
                    Icon ? <Icon size={28} color={color} /> : <Image source={img} style={styles.nutrientIcon} resizeMode="contain" />
                )}
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
                <View style={styles.nutrientHeader}>
                    <Text style={styles.nutrientLabel} numberOfLines={1}>{label}</Text>
                    {done && <View style={[styles.nutrientDone, { backgroundColor: color }]}><Check size={10} color="#FFFFFF" strokeWidth={3} /></View>}
                </View>
                {/* Value and goal wrap onto two lines on narrow phones instead of being cut off */}
                <TouchableOpacity onPress={onEdit} activeOpacity={0.6} style={styles.nutrientValueRow} testID={testID ? testID.replace('increment', 'edit') : undefined}>
                    <Text style={[styles.nutrientValueBig, { color: done ? color : '#0F172A' }]} numberOfLines={1}>{value}</Text>
                    <Text style={styles.nutrientGoal}>/ {goalText}</Text>
                    <Pencil size={11} color="#CBD5E1" />
                </TouchableOpacity>
                <View style={[styles.nutrientTrack, { backgroundColor: done ? 'rgba(255,255,255,0.7)' : '#F1F5F9' }]}>
                    <View style={[styles.nutrientFill, { backgroundColor: color, width: `${Math.min(100, pct)}%` }]} />
                </View>
            </View>
            <View style={styles.nutrientActions}>
                <TouchableOpacity onPress={onRemove} style={styles.nutrientMinus} hitSlop={6}>
                    <Minus size={16} color="#64748B" />
                </TouchableOpacity>
                <TouchableOpacity onPress={handleAdd} style={[styles.nutrientPlus, { backgroundColor: color }]} testID={testID}>
                    <Plus size={18} color="#FFFFFF" strokeWidth={3} />
                </TouchableOpacity>
            </View>
        </View>
    );
};

const NativeToday = ({ user, setUser, setActiveTab }) => {
    const { t } = useTranslation();
    const { openLog } = useLog();
    const units = unitsFor(user);
    // Dev-only: shifts "today" to preview the dose cycle (banners, countdown).
    const [simulatedDays, setSimulatedDays] = useState(0);
    const [btnPressed, setBtnPressed] = useState(false);

    const today = useMemo(() => {
        const d = new Date();
        d.setDate(d.getDate() + simulatedDays);
        return d;
    }, [simulatedDays]);

    const medication = getMedication(user);
    const isOral = medication?.route === 'oral';
    const isWeekly = doseIntervalDays(medication) === 7;
    const doses = useMemo(() => sortedDoses(user), [user.doseHistory]);
    const lastDose = doses[0];
    const doneToday = !!lastDose && isSameDay(lastDose.date, today);
    const daysSinceDose = lastDose ? daysBetween(lastDose.date, today) : null;

    const reminder = ReminderService.calculateNextDose(doses, doseIntervalDays(medication), today);
    const timeRemaining = reminder.status === 'first_dose' ? t('dashboard.today') : ReminderService.formatTimeRemaining(reminder.daysRemaining, reminder.status, t);
    const doseTitle = doneToday
        ? t('today.doseDone')
        : (['due_today', 'overdue', 'first_dose'].includes(reminder.status) || reminder.daysRemaining === 1 ? timeRemaining : t('dashboard.inTime', { time: timeRemaining }));
    const doseDue = ['due_today', 'overdue', 'first_dose'].includes(reminder.status) && !doneToday;

    const cycleKey = daysSinceDose === null
        ? 'dashboard.cycle.noDose'
        : daysSinceDose <= 2 ? 'dashboard.cycle.peak' : daysSinceDose >= 6 ? 'dashboard.cycle.low' : 'dashboard.cycle.stable';
    const fillLevel = doneToday ? 100 : Math.max(8, Math.min(100, ((7 - (daysSinceDose ?? 7)) / 7) * 100));
    const injectionSuggestion = useMemo(() => suggestNextInjection(doses), [doses]);

    const weekNumber = useMemo(() => {
        if (!user.startDate) return 1;
        return Math.max(1, Math.ceil((today - new Date(user.startDate)) / (7 * 24 * 60 * 60 * 1000)));
    }, [user.startDate, today]);

    // Intake
    const key = intakeKey(today);
    const intake = user.dailyIntakeHistory?.[key] || {};
    const goals = {
        water: user.settings?.waterGoal || 2.5,
        protein: user.settings?.proteinGoal || 100,
        fiber: user.settings?.fiberGoal || 25,
        calories: user.settings?.calorieGoal || 1800,
        fat: user.settings?.fatGoal || 60,
        carbs: user.settings?.carbsGoal || 150,
    };
    const pct = (type) => ((intake[type] || 0) / goals[type]) * 100;

    const nutrientRows = [
        { key: 'water', goalText: units.formatVolume(goals.water), step: 0.2, color: '#3B82F6', tint: '#EFF6FF', img: waterImg, mascot: mascotHydratedImg },
        { key: 'protein', goalText: `${goals.protein} g`, step: 5, color: '#F97316', tint: '#FFF7ED', img: proteinImg, mascot: mascotFeedImg },
        { key: 'fiber', goalText: `${goals.fiber} g`, step: 5, color: '#10B981', tint: '#ECFDF5', img: fiberImg, mascot: mascotFeedImg },
        { key: 'carbs', goalText: `${goals.carbs} g`, step: 5, color: '#8B5CF6', tint: '#F5F3FF', icon: Wheat, mascot: mascotFeedImg },
        { key: 'fat', goalText: `${goals.fat} g`, step: 5, color: '#EAB308', tint: '#FEFCE8', icon: Droplet, mascot: mascotFeedImg },
        { key: 'calories', goalText: `${goals.calories} kcal`, step: 50, color: '#EF4444', tint: '#FEF2F2', icon: Flame, mascot: mascotFeedImg },
    ];

    // Tapping a value lets the user type today's amount directly.
    const [editing, setEditing] = useState(null); // nutrient key
    const [showSupplements, setShowSupplements] = useState(false);
    const todayPhoto = useMemo(() => sortedPhotos(user).filter((p) => p.date && isSameDay(p.date, today)).pop() || null, [user.photos, today]);
    const [editValue, setEditValue] = useState('');
    const decimalSep = formatNumber(1.5).includes(',') ? ',' : '.';
    const openEdit = (type) => {
        const v = type === 'water' ? units.volume(intake.water || 0) : (intake[type] || 0);
        setEditValue(String(v).replace('.', decimalSep));
        setEditing(type);
    };
    const saveEdit = () => {
        const n = parseFloat(String(editValue).replace(',', '.'));
        if (!isNaN(n) && n >= 0) {
            const stored = editing === 'water' ? units.volumeToLiters(n) : n;
            setUser({
                ...user,
                dailyIntakeHistory: {
                    ...(user.dailyIntakeHistory || {}),
                    [key]: { ...intake, [editing]: editing === 'calories' ? Math.round(stored) : parseFloat(stored.toFixed(1)) },
                },
            });
        }
        setEditing(null);
    };
    const editRow = nutrientRows.find((r) => r.key === editing);

    const updateIntake = (type, amount) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        const next = Math.max(0, (intake[type] || 0) + amount);
        setUser({
            ...user,
            dailyIntakeHistory: {
                ...(user.dailyIntakeHistory || {}),
                [key]: { ...intake, [type]: parseFloat(next.toFixed(1)) },
            },
        });
    };

    // Weight
    const current = latestWeight(user);
    const start = startWeightOf(user);
    const goal = parseFloat(user.goalWeight) || null;
    const lost = start && current ? start - current : 0;
    const goalProgress = goal && start && start !== goal ? Math.max(0, Math.min(100, ((start - current) / (start - goal)) * 100)) : null;
    const toGoal = goal && current ? current - goal : null;
    const weeklyRate = lost / Math.max(1, weekNumber);

    const logs = weightLogs(user);
    const isPlateau = logs.length >= 3 && logs.slice(-3).every((l) => l.weight === logs[logs.length - 1].weight);
    // Low protein only matters once the day is well under way.
    const isLowProtein = today.getHours() >= 14 && pct('protein') < 40;

    const dailyTip = useMemo(() => {
        const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / (24 * 60 * 60 * 1000));
        const tips = t('dashboard.tips', { returnObjects: true });
        return Array.isArray(tips) ? tips[dayOfYear % tips.length] : null;
    }, [today, t]);

    const dateLine = (() => {
        const s = formatDate(today, { weekday: 'long', day: 'numeric', month: 'long' });
        return s.charAt(0).toLocaleUpperCase() + s.slice(1);
    })();

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View style={styles.header}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.dateLine}>{dateLine}</Text>
                        <Text style={styles.greeting}>{user.name ? t('dashboard.greeting', { name: user.name }) : t('dashboard.greetingNoName')}</Text>
                        <Text style={styles.subtitle}>{t('today.subtitle', { week: weekNumber, medication: medication?.name || t('dashboard.protocolFallback') })}</Text>
                    </View>
                    <TouchableOpacity style={styles.avatar} onPress={() => setActiveTab('profile')}>
                        {user.photoURL
                            ? <Image source={{ uri: photoUri(user.photoURL) }} style={styles.avatarImg} />
                            : <Text style={styles.avatarText}>{user.name?.charAt(0).toUpperCase() || '?'}</Text>}
                    </TouchableOpacity>
                </View>

                {/* One contextual banner at most */}
                {isWeekly && doseDue ? (
                    <View style={styles.doseBanner}>
                        <Image source={mascotZenImg} style={styles.doseBannerMascot} resizeMode="contain" />
                        <View style={styles.doseBannerTextContainer}>
                            <Text style={styles.doseBannerTagline}>{t('dashboard.doseDayTagline')}</Text>
                            <Text style={styles.bannerTitle}>{t('dashboard.doseDayTitle')}</Text>
                            <Text style={styles.bannerDesc}>{t('dashboard.doseDayDesc')}</Text>
                        </View>
                    </View>
                ) : isWeekly && daysSinceDose !== null && daysSinceDose >= 5 ? (
                    <View style={styles.foodNoiseBanner}>
                        <View style={styles.bannerMascotBgWrapper}>
                            <Image source={mascotStrongImg} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
                        </View>
                        <View style={styles.bannerHeaderRow}>
                            <View style={styles.bannerIconBox}>
                                <Image source={mascotFoodNoiseImg} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.bannerTagline}>{t('dashboard.foodNoiseTagline')}</Text>
                                <Text style={styles.bannerTitle}>{t('dashboard.foodNoiseTitle')}</Text>
                                <Text style={styles.bannerDesc}>{t('dashboard.foodNoiseDesc')}</Text>
                            </View>
                        </View>
                    </View>
                ) : null}

                {/* Next dose */}
                <View style={styles.card}>
                    <View style={styles.injectionMascotBg}>
                        <Image source={mascotStrongImg} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
                    </View>
                    <View style={styles.injectionRow}>
                        <View style={{ flex: 1 }}>
                            <View style={styles.injectionHeaderRow}>
                                <Text style={styles.cardKicker}>{doneToday ? t('dashboard.finished') : t('dashboard.nextDose')}</Text>
                                <View style={styles.weekBadge}><Text style={styles.weekBadgeText}>{t('dashboard.week', { week: weekNumber })}</Text></View>
                            </View>
                            <Text style={styles.injectionBigTitle} numberOfLines={2} adjustsFontSizeToFit>{doseTitle}</Text>
                            <TouchableOpacity onPress={() => openLog('protocol')} style={styles.protocolLine} activeOpacity={0.7}>
                                <Text style={styles.protocolName}>{medication?.name || t('dashboard.protocolFallback')}</Text>
                                <View style={styles.dosePill}><Text style={styles.dosePillText}>{user.currentDose}</Text></View>
                            </TouchableOpacity>
                        </View>

                        <TouchableWithoutFeedback
                            onPressIn={() => setBtnPressed(true)}
                            onPressOut={() => setBtnPressed(false)}
                            onPress={() => openLog('dose')}
                        >
                            <View style={styles.physicalBtnContainer} testID="injection-open-button">
                                <View style={styles.physicalBtnBase} />
                                <View style={[styles.physicalBtnFace, btnPressed && styles.physicalBtnFacePressed]}>
                                    <View style={{ width: 36, height: 36 }}><SvgDroplet fillLevel={fillLevel} /></View>
                                    <Text style={styles.physicalBtnText}>{doneToday ? t('dashboard.successShort') : isOral ? t('log.doseOral') : t('dashboard.logDose')}</Text>
                                </View>
                            </View>
                        </TouchableWithoutFeedback>
                    </View>

                    <View style={styles.suggestedRow}>
                        {!isOral && !doneToday && (
                            <View style={styles.suggestedSiteCard}>
                                <Text style={styles.miniLabel}>{t('dashboard.suggestedSite')}</Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                    <MapPin size={12} color="#EA580C" />
                                    <Text style={styles.suggestedSiteText}>{t(`sitesShort.${injectionSuggestion.id}`)}</Text>
                                </View>
                            </View>
                        )}
                        <View style={styles.cycleTipCard}>
                            <Text style={[styles.miniLabel, { color: '#EA580C' }]}>{t('dashboard.cycleTip')}</Text>
                            <Text style={styles.cycleTipText}>{t(cycleKey)}</Text>
                        </View>
                    </View>
                </View>

                {/* Today's goals */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>{t('today.goalsTitle')}</Text>
                    <TouchableOpacity onPress={() => setActiveTab('profile')}>
                        <Text style={styles.sectionLink}>{t('today.editGoals')}</Text>
                    </TouchableOpacity>
                </View>
                <View style={[styles.card, styles.goalsCard]}>
                    {nutrientRows.map((r) => (
                        <NutrientRow
                            key={r.key}
                            label={t(`nutrients.${r.key}`)}
                            value={r.key === 'water' ? units.formatVolumeValue(intake.water || 0) : formatNumber(intake[r.key] || 0, r.key === 'calories' ? 0 : 1)}
                            goalText={r.goalText}
                            pct={pct(r.key)}
                            color={r.color} tint={r.tint}
                            img={r.img} icon={r.icon} mascot={r.mascot}
                            onAdd={() => updateIntake(r.key, r.step)}
                            onRemove={() => updateIntake(r.key, -r.step)}
                            onEdit={() => openEdit(r.key)}
                            testID={`${r.key}-increment-button`}
                        />
                    ))}

                    <TouchableOpacity onPress={() => openLog('meal')} style={styles.mealScanBtn} activeOpacity={0.85} testID="today-scan-meal-button">
                        <View style={styles.mealScanIcon}><Camera size={18} color="#EA580C" /></View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.mealScanTitle}>{t('dashboard.mealScanTitle')}</Text>
                            <Text style={styles.mealScanSubtitle}>{t('today.mealScanSubtitle')}</Text>
                        </View>
                        <ChevronRight size={18} color="#CBD5E1" />
                    </TouchableOpacity>
                </View>

                {/* Supplements: counted here, never in the goals above (whey excepted) */}
                <SupplementsCard user={user} setUser={setUser} onConfigure={() => setShowSupplements(true)} />

                {/* Today's progress photo */}
                <TouchableOpacity onPress={() => openLog('photo')} style={styles.photoCard} activeOpacity={0.85} testID="today-photo-button">
                    {todayPhoto ? (
                        <Image source={{ uri: photoUri(todayPhoto) }} style={styles.photoThumb} />
                    ) : (
                        <View style={styles.photoIcon}><Camera size={20} color="#10B981" /></View>
                    )}
                    <View style={{ flex: 1 }}>
                        <Text style={styles.photoTitle}>{t('today.photoTitle')}</Text>
                        <Text style={styles.photoSub}>{todayPhoto ? t('today.photoDone') : t('today.photoSub')}</Text>
                    </View>
                    {todayPhoto ? <Check size={18} color="#10B981" strokeWidth={3} /> : <Plus size={18} color="#10B981" strokeWidth={3} />}
                </TouchableOpacity>

                {/* Weight */}
                <TouchableOpacity activeOpacity={0.9} onPress={() => setActiveTab('progress')} style={styles.weightCard}>
                    <View style={styles.weightMascotBg}>
                        <Image source={mascotAchieveImg} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
                    </View>
                    <View style={styles.weightHeaderRow}>
                        <Text style={styles.weightKicker}>{t('today.weightTitle')}</Text>
                        <TouchableOpacity onPress={() => openLog('weight')} style={styles.weightPlusBtn} testID="today-weight-button">
                            <Plus size={14} color="#FFFFFF" strokeWidth={3} />
                            <Text style={styles.weightPlusText}>{t('today.logWeight')}</Text>
                        </TouchableOpacity>
                    </View>
                    <View style={styles.weightMetricRow}>
                        <Text style={styles.weightBigValue}>{current ? units.formatWeightValue(current) : '--'}</Text>
                        <Text style={styles.weightSuffix}>{units.weightUnit}</Text>
                        {lost !== 0 && (
                            <View style={styles.weightDeltaPill}>
                                <Text style={styles.weightDeltaText}>{units.formatWeightDiff(-lost)}</Text>
                            </View>
                        )}
                    </View>
                    {goalProgress !== null ? (
                        <View style={{ gap: 6 }}>
                            <View style={styles.weightTrack}>
                                <View style={[styles.weightFill, { width: `${goalProgress}%` }]} />
                            </View>
                            <View style={styles.weightFooterRow}>
                                <Text style={styles.weightFooterText}>
                                    {toGoal > 0 ? t('today.toGoal', { value: units.formatWeight(toGoal) }) : t('today.goalReached')}
                                </Text>
                                <Text style={styles.weightFooterText}>{t('dashboard.rate', { value: units.formatWeight(weeklyRate, 2) })}</Text>
                            </View>
                        </View>
                    ) : (
                        <Text style={styles.weightFooterText}>{t('dashboard.rate', { value: units.formatWeight(weeklyRate, 2) })}</Text>
                    )}
                </TouchableOpacity>

                {/* Smart alerts */}
                {(isPlateau || isLowProtein) && (
                    <View style={{ gap: 10, marginBottom: 16 }}>
                        {isPlateau && (
                            <View style={[styles.alert, { backgroundColor: '#FEF3C7', borderColor: '#FDE68A' }]}>
                                <View style={[styles.alertIcon, { backgroundColor: '#FFFBEB' }]}><TrendingUp size={20} color="#D97706" /></View>
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.alertTitle, { color: '#78350F' }]}>{t('dashboard.plateauTitle')}</Text>
                                    <Text style={[styles.alertDesc, { color: '#78350F' }]}>{t('dashboard.plateauDesc')}</Text>
                                </View>
                            </View>
                        )}
                        {isLowProtein && (
                            <View style={[styles.alert, { backgroundColor: '#FFF7ED', borderColor: '#FFEDD5' }]}>
                                <View style={[styles.alertIcon, { backgroundColor: '#FFE5D9' }]}><Zap size={20} color="#EA580C" /></View>
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.alertTitle, { color: '#EA580C' }]}>{t('dashboard.lowHungerTitle')}</Text>
                                    <Text style={[styles.alertDesc, { color: '#EA580C' }]}>{t('dashboard.lowHungerDesc')}</Text>
                                </View>
                            </View>
                        )}
                    </View>
                )}

                {/* Tip of the day */}
                {dailyTip && (
                    <View style={styles.tipCard}>
                        <Info size={20} color="#3B82F6" style={{ marginTop: 2 }} />
                        <View style={{ flex: 1 }}>
                            <Text style={styles.tipTitle}>{t('dashboard.tipOfDay')}</Text>
                            <Text style={styles.tipDesc}>{dailyTip}</Text>
                        </View>
                    </View>
                )}

                {__DEV__ && (
                    <View style={styles.simulatorControls}>
                        <TouchableOpacity onPress={() => setSimulatedDays((d) => d - 1)} style={styles.simulatorBtn}>
                            <ChevronLeft size={18} color="#94A3B8" />
                        </TouchableOpacity>
                        <View style={{ alignItems: 'center' }}>
                            <Text style={styles.simulatorLabel}>{t('dashboard.simulator')}</Text>
                            <Text style={styles.simulatorVal}>
                                {simulatedDays === 0 ? t('dashboard.realTime') : t('dashboard.simulatedDays', { count: Math.abs(simulatedDays), value: `${simulatedDays > 0 ? '+' : ''}${simulatedDays}` })}
                            </Text>
                        </View>
                        <TouchableOpacity onPress={() => setSimulatedDays((d) => d + 1)} style={styles.simulatorBtn}>
                            <ChevronRight size={18} color="#94A3B8" />
                        </TouchableOpacity>
                    </View>
                )}
            </ScrollView>

            <Modal visible={!!editing} onClose={() => setEditing(null)} title={editRow ? t('today.editIntakeTitle', { nutrient: t(`nutrients.${editRow.key}`) }) : ''}>
                {!!editRow && (
                    <>
                        <NumberStepper
                            label={t('today.editIntakeLabel')}
                            value={editValue}
                            onChangeText={setEditValue}
                            step={editRow.key === 'water' ? (units.imperial ? 8 : 0.2) : editRow.step}
                            decimals={editRow.key === 'calories' || (editRow.key === 'water' && units.imperial) ? 0 : 1}
                            unit={editRow.key === 'water' ? units.volumeUnit : editRow.key === 'calories' ? 'kcal' : 'g'}
                            testID="intake-edit-input"
                        />
                        <Text style={styles.editHint}>{t('today.editIntakeHint', { goal: editRow.goalText })}</Text>
                        <Button onClick={saveEdit} style={{ width: '100%', marginTop: 16 }} testID="intake-edit-save">{t('common.save')}</Button>
                    </>
                )}
            </Modal>
            <SupplementsModal visible={showSupplements} onClose={() => setShowSupplements(false)} user={user} setUser={setUser} />
        </SafeAreaView>
    );
};

export default NativeToday;

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FAF7F2' },
    scroll: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 130 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, marginTop: Platform.OS === 'android' ? 20 : 0, gap: 12 },
    dateLine: { fontSize: 11, fontFamily: 'Outfit_900Black', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 },
    greeting: { fontSize: 24, fontFamily: 'Outfit_900Black', color: '#EA580C' },
    subtitle: { fontSize: 13, fontFamily: 'Outfit_600SemiBold', color: '#EA580C', opacity: 0.8 },
    avatar: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 3 },
    avatarImg: { width: '100%', height: '100%' },
    avatarText: { fontSize: 18, fontFamily: 'Outfit_700Bold', color: '#EA580C' },

    // Banners
    foodNoiseBanner: { backgroundColor: '#F97316', borderRadius: 40, padding: 24, shadowColor: '#F97316', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.15, shadowRadius: 15, elevation: 4, overflow: 'hidden', marginBottom: 20 },
    bannerMascotBgWrapper: { position: 'absolute', right: -16, bottom: -16, width: 128, height: 128, opacity: 0.2 },
    bannerHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    bannerIconBox: { width: 64, height: 64, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20, padding: 8 },
    bannerTagline: { fontSize: 10, fontFamily: 'Outfit_900Black', color: '#FFE3D1', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 },
    bannerTitle: { fontSize: 20, fontFamily: 'Outfit_900Black', color: '#FFFFFF', marginBottom: 2 },
    bannerDesc: { fontSize: 12, fontFamily: 'Outfit_600SemiBold', color: 'rgba(255,255,255,0.9)', lineHeight: 16 },
    doseBanner: { backgroundColor: '#2563EB', borderRadius: 40, padding: 24, shadowColor: '#2563EB', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.15, shadowRadius: 15, elevation: 4, overflow: 'hidden', flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    doseBannerMascot: { width: 96, height: 108, position: 'absolute', bottom: -12, left: -12 },
    doseBannerTextContainer: { flex: 1, paddingLeft: 80, paddingVertical: 4 },
    doseBannerTagline: { fontSize: 10, fontFamily: 'Outfit_900Black', color: '#DBEAFE', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 },

    // Shared card
    card: { backgroundColor: '#FFFFFF', padding: 20, borderRadius: 36, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.03, shadowRadius: 15, elevation: 3, borderWidth: 1, borderColor: '#F1F5F9', overflow: 'hidden', marginBottom: 24 },
    cardKicker: { fontSize: 10, fontFamily: 'Outfit_900Black', color: '#EA580C', textTransform: 'uppercase', letterSpacing: 2 },
    miniLabel: { fontSize: 9, fontFamily: 'Outfit_900Black', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 12, paddingHorizontal: 4 },
    sectionTitle: { fontSize: 18, fontFamily: 'Outfit_700Bold', color: '#0F172A' },
    sectionLink: { fontSize: 12, fontFamily: 'Outfit_700Bold', color: '#EA580C' },

    // Next dose card
    injectionMascotBg: { position: 'absolute', right: -32, top: -32, width: 140, height: 140, opacity: 0.03, transform: [{ rotate: '12deg' }] },
    injectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 16 },
    injectionHeaderRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: 6 },
    weekBadge: { backgroundColor: '#F8FAFC', paddingVertical: 2, paddingHorizontal: 8, borderRadius: 8 },
    weekBadgeText: { fontSize: 9, fontFamily: 'Outfit_900Black', color: '#64748B', textTransform: 'uppercase' },
    injectionBigTitle: { fontSize: 26, fontFamily: 'Outfit_900Black', color: '#0F172A', letterSpacing: -0.5 },
    protocolLine: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, alignSelf: 'flex-start' },
    protocolName: { fontSize: 14, fontFamily: 'Outfit_900Black', color: '#334155' },
    dosePill: { backgroundColor: '#EA580C', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
    dosePillText: { fontSize: 11, fontFamily: 'Outfit_900Black', color: '#FFFFFF' },
    physicalBtnContainer: { width: 88, height: 92 },
    physicalBtnBase: { width: 88, height: 88, borderRadius: 30, backgroundColor: '#EA580C', position: 'absolute', top: 4, left: 0 },
    physicalBtnFace: { width: 88, height: 88, borderRadius: 30, backgroundColor: '#F97316', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.3)', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 6, elevation: 3, position: 'absolute', top: 0, left: 0 },
    physicalBtnFacePressed: { top: 4, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, elevation: 1 },
    physicalBtnText: { fontSize: 8, fontFamily: 'Outfit_900Black', color: '#FFFFFF', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 2, textAlign: 'center', paddingHorizontal: 4 },
    suggestedRow: { flexDirection: 'row', gap: 12 },
    suggestedSiteCard: { flex: 1, backgroundColor: '#FFFFFF', borderStyle: 'dashed', borderWidth: 2, borderColor: '#CBD5E1', borderRadius: 20, padding: 12 },
    suggestedSiteText: { fontSize: 12, fontFamily: 'Outfit_900Black', color: '#334155' },
    cycleTipCard: { flex: 1.3, backgroundColor: '#FFF7ED', borderRadius: 20, padding: 12, borderWidth: 1, borderColor: '#FFEDD5' },
    cycleTipText: { fontSize: 11, fontFamily: 'Outfit_700Bold', color: '#EA580C', lineHeight: 14 },

    // Goals
    goalsCard: { padding: 12, gap: 8 },
    photoCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#FFFFFF', borderRadius: 28, padding: 14, borderWidth: 1, borderColor: '#D1FAE5', marginBottom: 24 },
    photoIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: '#ECFDF5', alignItems: 'center', justifyContent: 'center' },
    photoThumb: { width: 48, height: 48, borderRadius: 16, backgroundColor: '#F1F5F9' },
    photoTitle: { fontSize: 15, fontFamily: 'Outfit_900Black', color: '#0F172A' },
    photoSub: { fontSize: 11, fontFamily: 'Outfit_600SemiBold', color: '#64748B', marginTop: 2 },
    nutrientRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 26, borderWidth: 1, borderColor: 'transparent', overflow: 'hidden' },
    nutrientIconBox: { width: 50, height: 50, borderRadius: 18, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center' },
    nutrientIcon: { width: 40, height: 40 },
    nutrientMascot: { width: 56, height: 56 },
    nutrientHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    nutrientLabel: { flexShrink: 1, fontSize: 11, fontFamily: 'Outfit_900Black', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5 },
    nutrientDone: { width: 16, height: 16, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
    nutrientValue: { marginTop: 1 },
    nutrientValueBig: { fontSize: 20, fontFamily: 'Outfit_900Black' },
    nutrientValueRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', columnGap: 4, alignSelf: 'flex-start' },
    editHint: { fontSize: 12, fontFamily: 'Outfit_600SemiBold', color: '#94A3B8', textAlign: 'center', marginTop: 4 },
    nutrientGoal: { fontSize: 12, fontFamily: 'Outfit_700Bold', color: '#94A3B8' },
    nutrientTrack: { height: 6, borderRadius: 3, overflow: 'hidden', marginTop: 6 },
    nutrientFill: { height: '100%', borderRadius: 3 },
    nutrientActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    nutrientMinus: { width: 30, height: 30, borderRadius: 12, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', justifyContent: 'center', alignItems: 'center' },
    nutrientPlus: { width: 42, height: 42, borderRadius: 16, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
    mealScanBtn: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#FFF7ED', borderRadius: 24, padding: 12, marginTop: 4, borderWidth: 1, borderColor: '#FFEDD5' },
    mealScanIcon: { width: 40, height: 40, borderRadius: 14, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center' },
    mealScanTitle: { fontSize: 14, fontFamily: 'Outfit_700Bold', color: '#9A3412' },
    mealScanSubtitle: { fontSize: 11, fontFamily: 'Outfit_600SemiBold', color: '#C2410C', opacity: 0.8, marginTop: 1 },

    // Weight
    weightCard: { backgroundColor: '#F97316', borderRadius: 36, padding: 20, marginBottom: 24, overflow: 'hidden', gap: 12, shadowColor: '#F97316', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.15, shadowRadius: 15, elevation: 4 },
    weightMascotBg: { position: 'absolute', right: -20, bottom: -20, width: 130, height: 130, opacity: 0.15 },
    weightHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    weightKicker: { fontSize: 10, fontFamily: 'Outfit_900Black', color: '#FFE3D1', textTransform: 'uppercase', letterSpacing: 2 },
    weightPlusBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, height: 32, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.22)' },
    weightPlusText: { fontSize: 11, fontFamily: 'Outfit_900Black', color: '#FFFFFF', textTransform: 'uppercase', letterSpacing: 0.5 },
    weightMetricRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 4 },
    weightBigValue: { fontSize: 44, fontFamily: 'Outfit_900Black', color: '#FFFFFF', lineHeight: 46 },
    weightSuffix: { fontSize: 14, fontFamily: 'Outfit_600SemiBold', color: 'rgba(255,255,255,0.85)', marginBottom: 8 },
    weightDeltaPill: { marginLeft: 8, marginBottom: 8, backgroundColor: 'rgba(255,255,255,0.22)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
    weightDeltaText: { fontSize: 11, fontFamily: 'Outfit_900Black', color: '#FFFFFF' },
    weightTrack: { height: 8, backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 4, overflow: 'hidden' },
    weightFill: { height: '100%', backgroundColor: '#FFFFFF', borderRadius: 4 },
    weightFooterRow: { flexDirection: 'row', justifyContent: 'space-between' },
    weightFooterText: { fontSize: 11, fontFamily: 'Outfit_700Bold', color: '#FFE3D1' },

    // Alerts & tip
    alert: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 24, padding: 16 },
    alertIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
    alertTitle: { fontSize: 10, fontFamily: 'Outfit_900Black', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 },
    alertDesc: { fontSize: 11, fontFamily: 'Outfit_600SemiBold', lineHeight: 15 },
    tipCard: { backgroundColor: '#EFF6FF', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: '#DBEAFE', flexDirection: 'row', gap: 12, marginBottom: 20 },
    tipTitle: { fontSize: 14, fontFamily: 'Outfit_700Bold', color: '#1E3A8A', marginBottom: 4 },
    tipDesc: { fontSize: 12, fontFamily: 'Outfit_600SemiBold', color: '#1E3A8A', opacity: 0.8, lineHeight: 16 },

    // Dev simulator
    simulatorControls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, paddingVertical: 10, paddingHorizontal: 16, backgroundColor: 'rgba(241, 245, 249, 0.5)', borderRadius: 20, borderWidth: 1, borderColor: '#F1F5F9', borderStyle: 'dashed' },
    simulatorBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
    simulatorLabel: { fontSize: 9, fontFamily: 'Outfit_900Black', color: '#CBD5E1', textTransform: 'uppercase', letterSpacing: 1 },
    simulatorVal: { fontSize: 12, fontFamily: 'Outfit_700Bold', color: '#64748B' },
});
