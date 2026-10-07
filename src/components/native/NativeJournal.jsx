import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Platform, Image, LayoutAnimation, Dimensions } from 'react-native';
import { ChevronLeft, ChevronRight, Plus, Syringe, Pill, Scale, Ruler, Smile, PenLine, Image as ImageIcon, UtensilsCrossed, CalendarDays, CalendarRange, CalendarCheck, Pencil, Trash2 } from 'lucide-react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import { userService } from '../../services/userService';
import { siteLabel } from '../../services/InjectionService';
import { unitsFor, formatDate, formatNumber, weekdayName, orderedWeekdays, getWeekStart } from '../../i18n';
import { useLog, symptomEmoji, symptomKey, foodNoiseColor } from './NativeLogCenter';
import NativePhotoViewer from './NativePhotoViewer';
import { MOCK_MEDICATIONS } from '../../constants/medications';
import { SUPPLEMENT_CATALOG, WHEY_ID } from '../../utils/supplements';
import { nutrientGoal } from '../../utils/nutrition';
import { entriesForDay, markersForDay, MARKER_COLORS, intakeKey, isSameDay, startOfDay, photoUri, noteOf } from '../../utils/journal';

const emptyMascot = require('../../../assets/remember.png');

// The Journal answers one question: "what happened on this day?". A week strip
// (expandable to the month) picks the day; below it, every record of that day
// — doses, weigh-ins, measures, check-ins, notes, photos and meals — in one
// timeline, newest first. Records are added from here for that same day.

const ENTRY_STYLE = {
    dose: { color: MARKER_COLORS.dose, bg: '#EFF6FF' },
    weight: { color: MARKER_COLORS.weight, bg: '#FFF7ED' },
    measures: { color: '#8B5CF6', bg: '#F5F3FF' },
    checkin: { color: MARKER_COLORS.checkin, bg: '#FEF2F2' },
    note: { color: '#64748B', bg: '#F1F5F9' },
    photo: { color: MARKER_COLORS.photo, bg: '#ECFDF5' },
    photos: { color: MARKER_COLORS.photo, bg: '#ECFDF5' },
    meal: { color: MARKER_COLORS.meal, bg: '#FFFBEB' },
    supplements: { color: MARKER_COLORS.supplements, bg: '#F0F9FF' },
};

// How much of the day's goal was reached (full ring = goal met).
const GoalRing = ({ pct, color, size = 38, stroke = 4 }) => {
    const r = (size - stroke) / 2;
    const c = 2 * Math.PI * r;
    const done = Math.max(0, Math.min(1, pct));
    return (
        <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
            <Svg width={size} height={size} style={{ position: 'absolute' }}>
                <Circle cx={size / 2} cy={size / 2} r={r} stroke="#F1F5F9" strokeWidth={stroke} fill="none" />
                {done > 0 && (
                    <Circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none" strokeLinecap="round" strokeDasharray={`${c * done} ${c}`} rotation={-90} origin={`${size / 2}, ${size / 2}`} />
                )}
            </Svg>
            <Text style={[styles.ringText, pct >= 1 && { color }]}>{Math.round(pct * 100)}%</Text>
        </View>
    );
};

const NativeJournal = ({ user }) => {
    const { t } = useTranslation();
    const { openLog } = useLog();
    const units = unitsFor(user);
    const weekStart = getWeekStart();
    const today = startOfDay(new Date());

    const [selected, setSelected] = useState(today);
    const [mode, setMode] = useState('week'); // 'week' | 'month'
    const [monthCursor, setMonthCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
    const [meals, setMeals] = useState([]);
    const [viewer, setViewer] = useState(null); // { photos, index }
    const [openMeals, setOpenMeals] = useState({}); // meal id → item list expanded
    const [showNutrients, setShowNutrients] = useState(false);
    // Photo grid cells get pixel sizes from the measured width: percentage
    // widths + aspectRatio render inconsistently on iOS / Android.
    // Until measured: screen minus page padding (48), timeline rail (48) and card padding + border (30).
    const [gridWidth, setGridWidth] = useState(Dimensions.get('window').width - 126);

    useEffect(() => {
        if (!user?.uid) return;
        userService.getMealLogs(user.uid, 100).then((logs) => setMeals(logs || [])).catch(() => {});
    // Refetched when the record changes (e.g. a meal was added or removed).
    }, [user?.uid, user?.dailyIntakeHistory]);

    const animate = () => LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

    const selectDay = (d) => {
        animate();
        setSelected(startOfDay(d));
        setMonthCursor(new Date(d.getFullYear(), d.getMonth(), 1));
    };

    const weekDays = useMemo(() => {
        const offset = (selected.getDay() - weekStart + 7) % 7;
        return Array.from({ length: 7 }, (_, i) => new Date(selected.getFullYear(), selected.getMonth(), selected.getDate() - offset + i));
    }, [selected, weekStart]);

    const monthWeeks = useMemo(() => {
        const first = monthCursor;
        const lead = (first.getDay() - weekStart + 7) % 7;
        const daysInMonth = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
        const slots = [
            ...Array.from({ length: lead }, () => null),
            ...Array.from({ length: daysInMonth }, (_, i) => new Date(first.getFullYear(), first.getMonth(), i + 1)),
        ];
        while (slots.length % 7) slots.push(null);
        return Array.from({ length: slots.length / 7 }, (_, i) => slots.slice(i * 7, i * 7 + 7));
    }, [monthCursor, weekStart]);

    const step = (dir) => {
        animate();
        if (mode === 'week') {
            const d = new Date(selected);
            d.setDate(d.getDate() + dir * 7);
            setSelected(d);
            setMonthCursor(new Date(d.getFullYear(), d.getMonth(), 1));
        } else {
            setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() + dir, 1));
        }
    };

    const headerMonth = mode === 'week' ? selected : monthCursor;
    const monthLabel = (() => {
        const s = formatDate(headerMonth, { month: 'long', year: 'numeric' });
        return s.charAt(0).toLocaleUpperCase() + s.slice(1);
    })();

    // Local ("Continue") meals live in the user record; account meals come
    // from the meal_logs table.
    const allMeals = useMemo(() => [...(user.meals || []), ...meals], [user.meals, meals]);
    const entries = useMemo(() => entriesForDay(user, selected, allMeals), [user, selected, allMeals]);
    const intake = user.dailyIntakeHistory?.[intakeKey(selected)] || {};
    const isToday = isSameDay(selected, today);
    const isFuture = selected > today;
    const dayPhotos = entries.filter((e) => e.type === 'photo').map((e) => e.data).reverse();
    // All photos of the day become one timeline item (a grid), placed where
    // the most recent one would be.
    const timeline = useMemo(() => {
        const items = [];
        let grouped = false;
        for (const e of entries) {
            if (e.type !== 'photo') { items.push(e); continue; }
            if (!grouped) { items.push({ type: 'photos', date: e.date, data: dayPhotos }); grouped = true; }
        }
        return items;
    }, [entries]);

    const dayTitle = (() => {
        const s = formatDate(selected, { weekday: 'long', day: 'numeric', month: 'long' });
        return s.charAt(0).toLocaleUpperCase() + s.slice(1);
    })();

    const DayCell = ({ date, compact }) => {
        if (!date) return <View style={compact ? styles.monthCell : styles.weekCell} />;
        const isSel = isSameDay(date, selected);
        const isTod = isSameDay(date, today);
        const markers = markersForDay(user, date, allMeals);
        return (
            <TouchableOpacity
                onPress={() => selectDay(date)}
                style={[compact ? styles.monthCell : styles.weekCell, isSel ? styles.cellSelected : isTod ? styles.cellToday : null]}
                testID={`journal-day-${date.getDate()}`}
            >
                {!compact && <Text style={[styles.cellWeekday, isSel && styles.cellTextSelected]}>{weekdayName(date.getDay(), 'narrow')}</Text>}
                <Text style={[styles.cellNumber, compact && { fontSize: 13 }, isSel ? styles.cellTextSelected : isTod ? styles.cellTextToday : null]}>{date.getDate()}</Text>
                <View style={styles.dotRow}>
                    {markers.slice(0, 4).map((m) => (
                        <View key={m} style={[styles.dot, { backgroundColor: isSel ? '#FFFFFF' : MARKER_COLORS[m] }]} />
                    ))}
                </View>
            </TouchableOpacity>
        );
    };

    const renderEntry = (entry, idx) => {
        const s = ENTRY_STYLE[entry.type];
        const time = formatDate(entry.date, { hour: '2-digit', minute: '2-digit' });
        let Icon = PenLine;
        let title = '';
        let body = null;

        if (entry.type === 'dose') {
            const med = MOCK_MEDICATIONS.find((m) => m.id === entry.data.medication);
            Icon = med?.route === 'oral' ? Pill : Syringe;
            title = t('journal.entry.dose', { medication: med?.name || entry.data.medication || '', dose: entry.data.dose || '' });
            body = <Text style={styles.entryText}>{siteLabel(t, entry.data)}</Text>;
        } else if (entry.type === 'weight') {
            Icon = Scale;
            title = t('journal.entry.weight');
            body = <Text style={styles.entryBig}>{units.formatWeight(entry.data.weight)}</Text>;
        } else if (entry.type === 'measures') {
            Icon = Ruler;
            title = t('journal.entry.measures');
            const parts = [];
            if (entry.data.waist > 0) parts.push(`${t('progress.waist')} ${formatNumber(units.length(entry.data.waist))} ${units.lengthUnit}`);
            if (entry.data.hip > 0) parts.push(`${t('progress.hip')} ${formatNumber(units.length(entry.data.hip))} ${units.lengthUnit}`);
            body = <Text style={styles.entryText}>{parts.join('  ·  ')}</Text>;
        } else if (entry.type === 'checkin') {
            Icon = Smile;
            title = t('journal.entry.checkIn');
            const log = entry.data;
            body = (
                <View style={{ gap: 6 }}>
                    {log.symptoms?.length > 0 && (
                        <View style={styles.symptomRow}>
                            {log.symptoms.map((id) => (
                                <View key={id} style={styles.symptomPill}>
                                    <Text style={styles.symptomPillText}>{symptomEmoji(id)} {symptomKey(id) ? t(symptomKey(id)) : id}</Text>
                                </View>
                            ))}
                        </View>
                    )}
                    {log.foodNoise !== undefined && (
                        <View style={styles.noiseRow}>
                            <View style={[styles.noiseDot, { backgroundColor: foodNoiseColor(log.foodNoise) }]} />
                            <Text style={styles.entryText}>{t('logs.foodNoise')}: <Text style={styles.entryStrong}>{log.foodNoise}/10</Text></Text>
                        </View>
                    )}
                    {!!log.trigger && <Text style={styles.entryText}>{t('calendar.trigger', { trigger: log.trigger })}</Text>}
                    {!!noteOf(log) && <Text style={styles.entryNote}>“{noteOf(log)}”</Text>}
                </View>
            );
        } else if (entry.type === 'supplements') {
            Icon = Pill;
            title = t('journal.entry.supplements');
            // Catalog items follow the app language; custom ones keep the name typed.
            const nameOf = (g) => (g.id === WHEY_ID || SUPPLEMENT_CATALOG.some((c) => c.id === g.id) ? t(`supplements.names.${g.id}`) : g.name);
            body = (
                <View style={styles.symptomRow}>
                    {entry.data.map((g) => (
                        <View key={g.id} style={[styles.symptomPill, { backgroundColor: '#F0F9FF' }]}>
                            <Text style={[styles.symptomPillText, { color: '#0369A1' }]}>{nameOf(g)}{g.count > 1 ? ` ×${g.count}` : ''}</Text>
                        </View>
                    ))}
                </View>
            );
        } else if (entry.type === 'note') {
            Icon = PenLine;
            title = t('journal.entry.note');
            body = <Text style={styles.entryNote}>{noteOf(entry.data)}</Text>;
        } else if (entry.type === 'photos') {
            Icon = ImageIcon;
            title = entry.data.length > 1 ? t('journal.entry.photos', { count: entry.data.length }) : t('journal.entry.photo');
            const columns = entry.data.length > 4 ? 3 : 2;
            body = (
                <View style={styles.photoGrid} onLayout={(e) => setGridWidth(e.nativeEvent.layout.width)}>
                    {entry.data.map((photo, i) => (
                        <View key={`${photo.index}`} style={[styles.photoCell, { width: (gridWidth - 8 * (columns - 1)) / columns, height: ((gridWidth - 8 * (columns - 1)) / columns) * 4 / 3 }]}>
                            <TouchableOpacity onPress={() => setViewer({ photos: dayPhotos, index: i })} activeOpacity={0.85} style={StyleSheet.absoluteFill}>
                                <Image source={{ uri: photoUri(photo) }} style={styles.photoCellImg} />
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => openLog('delete', { entry: { type: 'photo', date: photo.date, data: photo } })}
                                style={styles.photoDeleteBtn}
                                hitSlop={6}
                                testID="journal-photo-delete"
                            >
                                <Trash2 size={13} color="#FFFFFF" />
                            </TouchableOpacity>
                            <View style={styles.photoTime}>
                                <Text style={styles.photoTimeText}>{formatDate(photo.date, { hour: '2-digit', minute: '2-digit' })}</Text>
                            </View>
                        </View>
                    ))}
                </View>
            );
        } else if (entry.type === 'meal') {
            Icon = UtensilsCrossed;
            const m = entry.data;
            title = t('journal.entry.meal', { kcal: Math.round(m.total_calories || 0) });
            const mealItems = m.items || [];
            const fiber = m.total_fiber ?? mealItems.reduce((sum, i) => sum + (i.nutrition?.fiber || 0), 0);
            const mealId = m.id || m.logged_at;
            const expanded = !!openMeals[mealId];
            body = (
                <View style={{ gap: 8 }}>
                    <TouchableOpacity
                        onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setOpenMeals((o) => ({ ...o, [mealId]: !o[mealId] })); }}
                        style={styles.mealSummaryRow}
                        testID="journal-meal-toggle"
                    >
                        <Text style={[styles.entryText, { flex: 1, minWidth: 0 }]} numberOfLines={expanded ? undefined : 1}>
                            <Text style={styles.entryStrong}>{t('mealScan.itemsCount', { count: mealItems.length })}</Text>
                            {mealItems.length ? ` · ${mealItems.map((i) => i.name).join(', ')}` : ''}
                        </Text>
                        <View style={styles.mealToggleBtn}><Text style={styles.mealToggleIcon}>{expanded ? '▲' : '▼'}</Text></View>
                    </TouchableOpacity>
                    <View style={styles.mealChips}>
                        {[
                            { label: t('nutrients.protein'), value: m.total_protein, color: '#F97316' },
                            { label: t('nutrients.carbs'), value: m.total_carbs, color: '#8B5CF6' },
                            { label: t('nutrients.fat'), value: m.total_fat, color: '#EAB308' },
                            { label: t('nutrients.fiber'), value: fiber, color: '#10B981' },
                        ].map((c) => (
                            <View key={c.label} style={styles.mealChip}>
                                <Text style={[styles.mealChipLabel, { color: c.color }]}>{c.label}</Text>
                                <Text style={styles.mealChipValue}>{formatNumber(c.value || 0)} g</Text>
                            </View>
                        ))}
                    </View>
                    {expanded && mealItems.map((item, i) => (
                        <View key={`${item.name}-${i}`} style={styles.mealItemRow}>
                            <View style={{ flex: 1, minWidth: 0 }}>
                                <Text style={styles.mealItemName} numberOfLines={1}>{item.name}</Text>
                                <Text style={styles.entryMuted}>
                                    {formatNumber(units.food(item.grams || 0))} {units.foodUnit}
                                    {item.nutrition ? ` · ${t('nutrients.protein')} ${formatNumber(item.nutrition.protein || 0)} g · ${t('nutrients.fat')} ${formatNumber(item.nutrition.fat || 0)} g · ${t('nutrients.fiber')} ${formatNumber(item.nutrition.fiber || 0)} g` : ''}
                                </Text>
                            </View>
                            <Text style={styles.mealItemKcal}>{item.nutrition ? `${Math.round(item.nutrition.calories || 0)} kcal` : '--'}</Text>
                        </View>
                    ))}
                </View>
            );
        }

        return (
            <View key={`${entry.type}-${entry.date}-${idx}`} style={styles.entryRow}>
                <View style={styles.entryRail}>
                    <View style={[styles.entryIcon, { backgroundColor: s.bg }]}><Icon size={16} color={s.color} /></View>
                    {idx < timeline.length - 1 && <View style={styles.entryLine} />}
                </View>
                <View style={styles.entryCard}>
                    <View style={styles.entryHeader}>
                        <Text style={styles.entryTitle} numberOfLines={1}>{title}</Text>
                        {entry.type !== 'photos' && <Text style={styles.entryTime}>{time}</Text>}
                        {['weight', 'measures', 'dose', 'supplements'].includes(entry.type) && (
                            <TouchableOpacity onPress={() => openLog(entry.type, { entry })} style={styles.entryAction} hitSlop={6} testID={`journal-edit-${entry.type}`}>
                                <Pencil size={13} color="#64748B" />
                            </TouchableOpacity>
                        )}
                        {['weight', 'measures', 'dose', 'checkin', 'note', 'meal', 'supplements'].includes(entry.type) && (
                            <TouchableOpacity onPress={() => openLog('delete', { entry })} style={styles.entryAction} hitSlop={6} testID={`journal-delete-${entry.type}`}>
                                <Trash2 size={13} color="#EF4444" />
                            </TouchableOpacity>
                        )}
                    </View>
                    {body}
                </View>
            </View>
        );
    };

    // Every nutrient of the day against its goal (opened under the summary)
    const goals = user.settings || {};
    const details = [
        { key: 'calories', value: intake.calories, goal: goals.calorieGoal, unit: 'kcal', digits: 0, color: '#EF4444' },
        { key: 'protein', value: intake.protein, goal: goals.proteinGoal, unit: 'g', color: '#F97316' },
        { key: 'carbs', value: intake.carbs, goal: goals.carbsGoal, unit: 'g', color: '#8B5CF6' },
        { key: 'fat', value: intake.fat, goal: goals.fatGoal, unit: 'g', color: '#EAB308' },
        { key: 'fiber', value: intake.fiber, goal: goals.fiberGoal, unit: 'g', color: '#10B981' },
        { key: 'water', value: intake.water, goal: goals.waterGoal, color: '#3B82F6' },
    ];
    const formatDetail = (d, v) => (d.key === 'water' ? units.formatVolume(v) : `${formatNumber(v, d.digits ?? 1)} ${d.unit}`);

    const summary = [
        { key: 'water', label: t('nutrients.water'), value: intake.water ? units.formatVolume(intake.water) : null, color: '#3B82F6' },
        { key: 'protein', label: t('nutrients.protein'), value: intake.protein ? `${formatNumber(intake.protein)} g` : null, color: '#F97316' },
        { key: 'fiber', label: t('nutrients.fiber'), value: intake.fiber ? `${formatNumber(intake.fiber)} g` : null, color: '#10B981' },
        { key: 'calories', label: t('nutrients.calories'), value: intake.calories ? `${formatNumber(intake.calories, 0)} kcal` : null, color: '#EF4444' },
    ];

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                <View style={styles.header}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.title}>{t('journal.title')}</Text>
                        <Text style={styles.subtitle}>{t('journal.subtitle')}</Text>
                    </View>
                </View>

                {/* Calendar */}
                <View style={styles.calendarCard}>
                    <View style={styles.calendarNav}>
                        <TouchableOpacity onPress={() => step(-1)} style={styles.navBtn}><ChevronLeft size={16} color="#64748B" /></TouchableOpacity>
                        <Text style={styles.monthText}>{monthLabel}</Text>
                        <TouchableOpacity onPress={() => step(1)} style={styles.navBtn}><ChevronRight size={16} color="#64748B" /></TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => { animate(); setMode(mode === 'week' ? 'month' : 'week'); setMonthCursor(new Date(selected.getFullYear(), selected.getMonth(), 1)); }}
                            style={styles.modeBtn}
                            testID="journal-mode-toggle"
                        >
                            {mode === 'week' ? <CalendarDays size={14} color="#EA580C" /> : <CalendarRange size={14} color="#EA580C" />}
                            <Text style={styles.modeBtnText}>{mode === 'week' ? t('journal.month') : t('journal.week')}</Text>
                        </TouchableOpacity>
                    </View>

                    {mode === 'week' ? (
                        <View style={styles.weekRow}>
                            {weekDays.map((d) => <DayCell key={d.toDateString()} date={d} />)}
                        </View>
                    ) : (
                        <View>
                            <View style={styles.weekRow}>
                                {orderedWeekdays().map((d) => <Text key={d} style={styles.monthWeekday}>{weekdayName(d, 'narrow')}</Text>)}
                            </View>
                            {monthWeeks.map((week, i) => (
                                <View key={i} style={styles.weekRow}>
                                    {week.map((d, j) => <DayCell key={d ? d.toDateString() : `e${i}-${j}`} date={d} compact />)}
                                </View>
                            ))}
                        </View>
                    )}

                    {/* Back to today, whenever another day or month is on screen */}
                    {(!isToday || (mode === 'month' && !isSameDay(monthCursor, new Date(today.getFullYear(), today.getMonth(), 1)))) && (
                        <TouchableOpacity onPress={() => selectDay(today)} style={styles.todayBtn} testID="journal-go-today">
                            <CalendarCheck size={14} color="#EA580C" />
                            <Text style={styles.todayBtnText}>{t('journal.goToday')}</Text>
                        </TouchableOpacity>
                    )}

                    <View style={styles.legendRow}>
                        {['dose', 'weight', 'checkin', 'meal', 'photo', 'supplements'].map((k) => (
                            <View key={k} style={styles.legendItem}>
                                <View style={[styles.dot, { backgroundColor: MARKER_COLORS[k] }]} />
                                <Text style={styles.legendText}>{t(`journal.legend.${k}`)}</Text>
                            </View>
                        ))}
                    </View>
                </View>

                {/* Selected day */}
                <View style={styles.dayHeader}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.dayTitle}>{dayTitle}</Text>
                        {isToday && <Text style={styles.dayToday}>{t('journal.today')}</Text>}
                    </View>
                    {!isFuture && (
                        <TouchableOpacity onPress={() => openLog('menu', { date: selected })} style={styles.addBtn} testID="journal-add-button">
                            <Plus size={16} color="#FFFFFF" strokeWidth={3} />
                            <Text style={styles.addBtnText}>{t('journal.add')}</Text>
                        </TouchableOpacity>
                    )}
                </View>

                <View style={styles.summaryRow}>
                    {summary.map((s) => (
                        <View key={s.key} style={styles.summaryChip}>
                            <View style={{ flex: 1, minWidth: 0 }}>
                                <Text style={[styles.summaryLabel, { color: s.color }]}>{s.label}</Text>
                                <Text style={styles.summaryValue} numberOfLines={1}>{s.value || '--'}</Text>
                            </View>
                            <GoalRing pct={(intake[s.key] || 0) / nutrientGoal(user, s.key)} color={s.color} />
                        </View>
                    ))}
                </View>
                <TouchableOpacity
                    onPress={() => { animate(); setShowNutrients((v) => !v); }}
                    style={styles.nutrientsToggle}
                    testID="journal-nutrients-toggle"
                >
                    <Text style={styles.nutrientsToggleText}>{showNutrients ? t('journal.nutrientsHide') : t('journal.nutrientsShow')}</Text>
                    <Text style={styles.mealToggle}>{showNutrients ? '▲' : '▼'}</Text>
                </TouchableOpacity>
                {showNutrients && (
                    <View style={styles.nutrientsCard} testID="journal-nutrients">
                        {details.map((d) => {
                            const pct = d.goal ? Math.min(1, (d.value || 0) / d.goal) : 0;
                            return (
                                <View key={d.key} style={styles.nutrientRow}>
                                    <View style={styles.nutrientHead}>
                                        <Text style={styles.nutrientName}>{t(`nutrients.${d.key}`)}</Text>
                                        <Text style={styles.nutrientValue}>
                                            {d.value ? formatDetail(d, d.value) : '--'}
                                            {d.goal ? <Text style={styles.nutrientGoal}>{` / ${formatDetail(d, d.goal)}`}</Text> : null}
                                        </Text>
                                    </View>
                                    {!!d.goal && (
                                        <View style={styles.nutrientTrack}>
                                            <View style={[styles.nutrientFill, { width: `${pct * 100}%`, backgroundColor: d.color }]} />
                                        </View>
                                    )}
                                </View>
                            );
                        })}
                    </View>
                )}

                {entries.length > 0 ? (
                    <View style={styles.timeline}>{timeline.map(renderEntry)}</View>
                ) : (
                    <View style={styles.emptyBox}>
                        <Image source={emptyMascot} style={styles.emptyMascot} resizeMode="contain" />
                        <Text style={styles.emptyTitle}>{isFuture ? t('journal.futureTitle') : t('journal.emptyTitle')}</Text>
                        <Text style={styles.emptyText}>{isFuture ? t('journal.futureText') : t('journal.emptyText')}</Text>
                    </View>
                )}
            </ScrollView>

            <NativePhotoViewer
                photos={viewer?.photos || []}
                index={viewer ? viewer.index : null}
                onIndexChange={(index) => setViewer((v) => ({ ...v, index }))}
                onClose={() => setViewer(null)}
            />
        </SafeAreaView>
    );
};

export default NativeJournal;

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FAF7F2' },
    scroll: { padding: 24, paddingBottom: 130 },
    header: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, marginTop: Platform.OS === 'android' ? 20 : 0, gap: 12 },
    title: { fontSize: 24, fontFamily: 'Outfit_900Black', color: '#0F172A' },
    subtitle: { fontSize: 13, fontFamily: 'Outfit_600SemiBold', color: '#EA580C', marginTop: 2 },
    todayBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'center', backgroundColor: '#FFF7ED', borderRadius: 12, paddingVertical: 8, paddingHorizontal: 14, borderWidth: 1, borderColor: '#FFEDD5', marginTop: 8 },
    todayBtnText: { fontSize: 11, fontFamily: 'Outfit_900Black', color: '#EA580C', textTransform: 'uppercase', letterSpacing: 0.5 },

    calendarCard: { backgroundColor: '#FFFFFF', borderRadius: 32, padding: 16, borderWidth: 1, borderColor: '#F1F5F9', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.02, shadowRadius: 8, elevation: 2, marginBottom: 24 },
    calendarNav: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
    navBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },
    monthText: { flex: 1, textAlign: 'center', fontSize: 15, fontFamily: 'Outfit_900Black', color: '#0F172A' },
    modeBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FFF7ED', borderRadius: 12, paddingVertical: 7, paddingHorizontal: 10, marginLeft: 4 },
    modeBtnText: { fontSize: 10, fontFamily: 'Outfit_900Black', color: '#EA580C', textTransform: 'uppercase', letterSpacing: 0.5 },
    weekRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 4, marginBottom: 4 },
    weekCell: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 16, gap: 2 },
    monthCell: { flex: 1, alignItems: 'center', paddingVertical: 6, borderRadius: 12, gap: 2, minHeight: 40 },
    monthWeekday: { flex: 1, textAlign: 'center', fontSize: 10, fontFamily: 'Outfit_900Black', color: '#CBD5E1', marginBottom: 4 },
    cellSelected: { backgroundColor: '#EA580C' },
    cellToday: { backgroundColor: '#FFF7ED' },
    cellWeekday: { fontSize: 10, fontFamily: 'Outfit_900Black', color: '#94A3B8' },
    cellNumber: { fontSize: 16, fontFamily: 'Outfit_900Black', color: '#334155' },
    cellTextSelected: { color: '#FFFFFF' },
    cellTextToday: { color: '#EA580C' },
    dotRow: { flexDirection: 'row', gap: 2, height: 5 },
    dot: { width: 5, height: 5, borderRadius: 2.5 },
    legendRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F8FAFC' },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    legendText: { fontSize: 10, fontFamily: 'Outfit_700Bold', color: '#94A3B8' },

    dayHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12, paddingHorizontal: 4 },
    dayTitle: { fontSize: 18, fontFamily: 'Outfit_700Bold', color: '#0F172A' },
    dayToday: { fontSize: 10, fontFamily: 'Outfit_900Black', color: '#EA580C', textTransform: 'uppercase', letterSpacing: 1, marginTop: 2 },
    addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#EA580C', borderRadius: 14, paddingVertical: 9, paddingHorizontal: 14, shadowColor: '#EA580C', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 3 },
    addBtnText: { fontSize: 12, fontFamily: 'Outfit_900Black', color: '#FFFFFF' },

    summaryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
    nutrientsToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8, marginBottom: 12 },
    nutrientsToggleText: { fontSize: 12, fontFamily: 'Outfit_700Bold', color: '#64748B' },
    nutrientsCard: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 16, borderWidth: 1, borderColor: '#F1F5F9', gap: 14, marginBottom: 20 },
    nutrientRow: { gap: 6 },
    nutrientHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 },
    nutrientName: { fontSize: 13, fontFamily: 'Outfit_700Bold', color: '#334155' },
    nutrientValue: { fontSize: 14, fontFamily: 'Outfit_900Black', color: '#0F172A' },
    nutrientGoal: { fontSize: 12, fontFamily: 'Outfit_600SemiBold', color: '#94A3B8' },
    nutrientTrack: { height: 6, borderRadius: 3, backgroundColor: '#F1F5F9', overflow: 'hidden' },
    nutrientFill: { height: 6, borderRadius: 3 },
    summaryChip: { width: '47%', flexGrow: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FFFFFF', borderRadius: 18, paddingVertical: 10, paddingLeft: 12, paddingRight: 10, borderWidth: 1, borderColor: '#F1F5F9' },
    ringText: { fontSize: 9, fontFamily: 'Outfit_900Black', color: '#64748B' },
    summaryLabel: { fontSize: 9, fontFamily: 'Outfit_900Black', textTransform: 'uppercase', letterSpacing: 0.5 },
    summaryValue: { fontSize: 15, fontFamily: 'Outfit_900Black', color: '#0F172A', marginTop: 2 },

    timeline: { gap: 0 },
    entryRow: { flexDirection: 'row', gap: 12 },
    entryRail: { alignItems: 'center', width: 36 },
    entryIcon: { width: 36, height: 36, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
    entryLine: { flex: 1, width: 2, backgroundColor: '#F1F5F9', marginVertical: 4 },
    entryCard: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 24, padding: 14, borderWidth: 1, borderColor: '#F1F5F9', marginBottom: 12, gap: 6 },
    entryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
    mealSummaryRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    mealToggleBtn: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    mealToggleIcon: { fontSize: 9, color: '#64748B' },
    mealToggle: { fontSize: 10, color: '#94A3B8', marginTop: 3 },
    mealChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    mealChip: { width: '45%', flexGrow: 1, backgroundColor: '#F8FAFC', borderRadius: 10, paddingVertical: 4, paddingHorizontal: 6, alignItems: 'center' },
    mealChipLabel: { fontSize: 8, fontFamily: 'Outfit_900Black', textTransform: 'uppercase', letterSpacing: 0.3 },
    mealChipValue: { fontSize: 12, fontFamily: 'Outfit_900Black', color: '#0F172A' },
    mealItemRow: { flexDirection: 'row', alignItems: 'center', gap: 8, borderTopWidth: 1, borderTopColor: '#F8FAFC', paddingTop: 6 },
    mealItemName: { fontSize: 12, fontFamily: 'Outfit_700Bold', color: '#334155' },
    mealItemKcal: { fontSize: 12, fontFamily: 'Outfit_900Black', color: '#F59E0B' },
    entryAction: { width: 26, height: 26, borderRadius: 9, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },
    photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    photoCell: { borderRadius: 16, overflow: 'hidden', backgroundColor: '#F1F5F9' },
    photoCellImg: { width: '100%', height: '100%', resizeMode: 'cover' },
    photoDeleteBtn: { position: 'absolute', top: 6, right: 6, width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(239,68,68,0.9)', justifyContent: 'center', alignItems: 'center' },
    photoTime: { position: 'absolute', left: 6, bottom: 6, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 8, paddingVertical: 2, paddingHorizontal: 6 },
    photoTimeText: { fontSize: 9, fontFamily: 'Outfit_900Black', color: '#FFFFFF' },
    entryTitle: { flex: 1, fontSize: 13, fontFamily: 'Outfit_900Black', color: '#0F172A' },
    entryTime: { fontSize: 10, fontFamily: 'Outfit_700Bold', color: '#94A3B8' },
    entryText: { fontSize: 12, fontFamily: 'Outfit_600SemiBold', color: '#475569', lineHeight: 16 },
    entryStrong: { fontFamily: 'Outfit_900Black', color: '#0F172A' },
    entryMuted: { fontSize: 10, fontFamily: 'Outfit_600SemiBold', color: '#94A3B8' },
    entryBig: { fontSize: 20, fontFamily: 'Outfit_900Black', color: '#EA580C' },
    entryNote: { fontSize: 12, fontFamily: 'Outfit_600SemiBold', color: '#334155', fontStyle: 'italic', lineHeight: 17 },
    entryPhoto: { width: 96, height: 128, borderRadius: 16, backgroundColor: '#F1F5F9' },
    symptomRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    symptomPill: { backgroundColor: '#FEF2F2', borderRadius: 10, paddingVertical: 3, paddingHorizontal: 8 },
    symptomPillText: { fontSize: 11, fontFamily: 'Outfit_700Bold', color: '#B91C1C' },
    noiseRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    noiseDot: { width: 8, height: 8, borderRadius: 4 },

    emptyBox: { alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 32, padding: 24, borderWidth: 1, borderColor: '#F1F5F9', borderStyle: 'dashed' },
    emptyMascot: { width: 110, height: 110, marginBottom: 8 },
    emptyTitle: { fontSize: 15, fontFamily: 'Outfit_900Black', color: '#334155' },
    emptyText: { fontSize: 12, fontFamily: 'Outfit_600SemiBold', color: '#94A3B8', textAlign: 'center', marginTop: 4, lineHeight: 17 },
});
