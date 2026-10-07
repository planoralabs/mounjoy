import React, { useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Pressable, Dimensions } from 'react-native';
import Svg, { Path, Circle, Line, Rect } from 'react-native-svg';
import { X } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { unitsFor, formatDate, formatNumber } from '../../i18n';
import { bodyLogs } from '../../utils/journal';
import { nutrientHistory, nutrientSummary, nutrientGoal } from '../../utils/nutrition';

// Progress → the "Measures" and "Nutrients" tabs of the evolution chart card
// (the "Weight" tab lives in NativeProgress).

const { width } = Dimensions.get('window');
// Screen minus the page padding (48) and the card padding (36).
const INNER_W = width - 84;

const AXIS_W = 34;
const PLOT_H = 190;
const PAD_T = 14;
const PAD_B = 10;
const LABEL_H = 22;
const POPOVER_W = 168;

// Catmull-Rom through the points, as cubic Béziers (a smooth line like the weight chart's).
const smoothPath = (pts) => pts.map((p, i) => {
    if (i === 0) return `M${p.x},${p.y}`;
    const p0 = pts[i - 2] || pts[i - 1];
    const p1 = pts[i - 1];
    const p3 = pts[i + 1] || p;
    return `C${p1.x + (p.x - p0.x) / 6},${p1.y + (p.y - p0.y) / 6} ${p.x - (p3.x - p1.x) / 6},${p.y - (p3.y - p1.y) / 6} ${p.x},${p.y}`;
}).join(' ');

/**
 * A chart that grows sideways with the records and scrolls like the weight one
 * (newest on the right, shown first). `points` = [{ date, values: { [series]: number | null } }];
 * a series simply skips the points it has no value for. Tapping a point / bar
 * opens one popover with every value of that day.
 */
const ScrollChart = ({ points, series, type = 'line', goal, renderPopover, testID }) => {
    const [viewW, setViewW] = useState(INNER_W - AXIS_W);
    const [selected, setSelected] = useState(null);
    const [popH, setPopH] = useState(80);
    const scrollRef = useRef(null);

    const isBar = type === 'bar';
    const all = points.flatMap((p) => series.map((s) => p.values[s.key])).filter((v) => v != null);
    if (goal) all.push(goal);
    let min = isBar ? 0 : Math.min(...all);
    let max = Math.max(...all);
    if (!isBar) {
        const pad = Math.max((max - min) * 0.15, 1);
        min -= pad;
        max += pad;
    } else {
        max *= 1.12;
    }
    const yOf = (v) => PAD_T + (1 - (v - min) / (max - min || 1)) * (PLOT_H - PAD_T - PAD_B);

    const minSlot = isBar ? 38 : 58;
    const slot = Math.max(minSlot, (viewW - 12) / Math.max(points.length, 1));
    const contentW = Math.max(viewW, points.length * slot + 12);
    const xOf = (i) => 6 + slot * (i + 0.5);
    const barW = Math.min(24, slot * 0.6);

    const ticks = [0, 1, 2, 3].map((i) => min + ((max - min) * (3 - i)) / 3);
    const tickDigits = max - min < 6 ? 1 : 0;

    const sel = selected != null ? points[selected] : null;
    const selTop = sel ? Math.min(...series.map((s) => sel.values[s.key]).filter((v) => v != null).map(yOf)) : 0;
    const above = selTop - popH - 12 >= 0;
    const popLeft = sel ? Math.max(4, Math.min(contentW - POPOVER_W - 4, xOf(selected) - POPOVER_W / 2)) : 0;

    return (
        <View style={{ flexDirection: 'row' }} testID={testID}>
            <View style={{ width: AXIS_W, height: PLOT_H }}>
                {ticks.map((v, i) => (
                    <Text key={i} style={[styles.tick, { top: yOf(v) - 7 }]}>{formatNumber(v, tickDigits)}</Text>
                ))}
            </View>
            <ScrollView
                ref={scrollRef}
                horizontal
                showsHorizontalScrollIndicator={false}
                onLayout={(e) => setViewW(e.nativeEvent.layout.width)}
                onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
            >
                <View style={{ width: contentW, height: PLOT_H + LABEL_H }}>
                    <Svg width={contentW} height={PLOT_H}>
                        {!!goal && (
                            <Line x1={0} x2={contentW} y1={yOf(goal)} y2={yOf(goal)} stroke="#64748B" strokeWidth={1.5} strokeDasharray="4 4" />
                        )}
                        {sel && <Line x1={xOf(selected)} x2={xOf(selected)} y1={PAD_T / 2} y2={PLOT_H - PAD_B / 2} stroke="#E2E8F0" strokeWidth={1.5} />}
                        {isBar
                            ? points.map((p, i) => series.map((s) => {
                                const v = p.values[s.key];
                                if (v == null) return null;
                                const y = yOf(v);
                                return (
                                    <Rect
                                        key={`${s.key}-${i}`}
                                        x={xOf(i) - barW / 2} y={y} width={barW} height={Math.max(3, PLOT_H - PAD_B - y)} rx={5}
                                        fill={s.color} opacity={s.dim?.(v) ? 0.45 : 1}
                                        stroke={selected === i ? '#0F172A' : 'none'} strokeWidth={2}
                                    />
                                );
                            }))
                            : series.map((s) => {
                                const pts = points.map((p, i) => (p.values[s.key] != null ? { x: xOf(i), y: yOf(p.values[s.key]), i } : null)).filter(Boolean);
                                return (
                                    <React.Fragment key={s.key}>
                                        {pts.length > 1 && <Path d={smoothPath(pts)} stroke={s.color} strokeWidth={3} fill="none" strokeLinecap="round" />}
                                        {pts.map((p) => (
                                            <Circle key={p.i} cx={p.x} cy={p.y} r={selected === p.i ? 7 : 5} fill={s.color} stroke="#FFFFFF" strokeWidth={2} />
                                        ))}
                                    </React.Fragment>
                                );
                            })}
                    </Svg>
                    {points.map((p, i) => (
                        <Text key={i} style={[styles.xLabel, { left: xOf(i) - 24, top: PLOT_H + 4 }]} numberOfLines={1}>
                            {formatDate(p.date, { day: '2-digit', month: '2-digit' })}
                        </Text>
                    ))}

                    {/* Tap targets: the whole column of each point */}
                    {sel && <Pressable style={StyleSheet.absoluteFill} onPress={() => setSelected(null)} />}
                    {points.map((_, i) => (
                        <Pressable
                            key={i}
                            onPress={() => setSelected(selected === i ? null : i)}
                            style={{ position: 'absolute', left: xOf(i) - slot / 2, top: 0, width: slot, height: PLOT_H }}
                            testID={testID ? `${testID}-point-${i}` : undefined}
                        />
                    ))}

                    {sel && (
                        <Pressable
                            onLayout={(e) => setPopH(e.nativeEvent.layout.height)}
                            style={[styles.popover, { left: popLeft, top: above ? selTop - popH - 12 : Math.min(selTop + 14, PLOT_H - popH) }]}
                        >
                            <TouchableOpacity style={styles.popClose} onPress={() => setSelected(null)}><X size={12} color="#94A3B8" /></TouchableOpacity>
                            <Text style={styles.popDate}>{formatDate(sel.date, { weekday: 'short', day: 'numeric', month: 'long' })}</Text>
                            {renderPopover(sel)}
                        </Pressable>
                    )}
                </View>
            </ScrollView>
        </View>
    );
};

const PopRow = ({ color, label, value }) => (
    <View style={styles.popRow}>
        <View style={[styles.popDot, { backgroundColor: color }]} />
        <Text style={styles.popText}>{label}: <Text style={styles.popBold}>{value}</Text></Text>
    </View>
);

const WAIST_COLOR = '#8B5CF6';
const HIP_COLOR = '#EC4899';

/** Waist and hip over time, plus the latest values and the change since the first. */
export const MeasuresChart = ({ user, onLog }) => {
    const { t } = useTranslation();
    const units = unitsFor(user);
    const logs = useMemo(() => bodyLogs(user), [user.measurements]);

    const firstOf = (k) => logs.find((m) => m[k] > 0)?.[k];
    const lastOf = (k) => [...logs].reverse().find((m) => m[k] > 0)?.[k];
    const fmtLen = (cm) => `${formatNumber(units.length(cm))} ${units.lengthUnit}`;
    const fmtLenDiff = (cm) => {
        const v = units.length(cm);
        return `${v > 0 ? '+' : ''}${formatNumber(v)} ${units.lengthUnit}`;
    };

    const series = [
        { key: 'waist', color: WAIST_COLOR, label: t('progress.waist') },
        { key: 'hip', color: HIP_COLOR, label: t('progress.hip') },
    ];
    // Each entry only shows the measures it has (waist only, hip only or both).
    const points = useMemo(() => logs.map((m) => ({
        date: new Date(m.date),
        raw: m,
        values: {
            waist: m.waist > 0 ? units.length(m.waist) : null,
            hip: m.hip > 0 ? units.length(m.hip) : null,
        },
    })), [logs, units.system]);
    const shown = series.filter((s) => points.some((p) => p.values[s.key] != null));

    return (
        <View style={{ gap: 14 }}>
            {points.length >= 2 ? (
                <>
                    <View style={styles.legendRow}>
                        {shown.map((s) => (
                            <View key={s.key} style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: s.color }]} /><Text style={styles.legendText}>{s.label}</Text></View>
                        ))}
                    </View>
                    <ScrollChart
                        points={points}
                        series={shown}
                        testID="measures-chart"
                        renderPopover={(p) => shown
                            .filter((s) => p.raw[s.key] > 0)
                            .map((s) => <PopRow key={s.key} color={s.color} label={s.label} value={fmtLen(p.raw[s.key])} />)}
                    />
                </>
            ) : (
                <TouchableOpacity onPress={onLog} style={styles.empty} activeOpacity={0.85} testID="measures-chart-empty">
                    <Text style={styles.emptyText}>{t('progress.measuresEmpty')}</Text>
                </TouchableOpacity>
            )}

            {logs.length > 0 && (
                <View style={styles.measureRow}>
                    {series.map((m) => {
                        const last = lastOf(m.key);
                        const first = firstOf(m.key);
                        return (
                            <View key={m.key} style={styles.measureBox}>
                                <Text style={[styles.measureLabel, { color: m.color }]}>{m.label}</Text>
                                <Text style={styles.measureValue}>{last ? fmtLen(last) : '--'}</Text>
                                {!!last && !!first && last !== first && (
                                    <Text style={[styles.measureDiff, { color: last < first ? '#10B981' : '#EF4444' }]}>
                                        {t('progress.sinceFirst', { value: fmtLenDiff(last - first) })}
                                    </Text>
                                )}
                            </View>
                        );
                    })}
                </View>
            )}
        </View>
    );
};

const NUTRIENTS = [
    { key: 'protein', color: '#F97316' },
    { key: 'calories', color: '#EF4444' },
    { key: 'carbs', color: '#8B5CF6' },
    { key: 'fat', color: '#EAB308' },
    { key: 'fiber', color: '#10B981' },
    { key: 'water', color: '#3B82F6' },
];

/** One nutrient at a time: a bar per recorded day (today included) against the goal. */
export const NutrientsChart = ({ user }) => {
    const { t } = useTranslation();
    const units = unitsFor(user);
    const [key, setKey] = useState('protein');

    const nutrient = NUTRIENTS.find((n) => n.key === key);
    const history = useMemo(() => nutrientHistory(user, key), [user.dailyIntakeHistory, key]);
    const goal = nutrientGoal(user, key);
    const { avg, met, recorded } = nutrientSummary(history, goal, key);
    // Water is stored in liters and shown in the user's unit.
    const shownValue = (v) => (key === 'water' ? units.volume(v) : v);
    const fmt = (v) => (key === 'water' ? units.formatVolume(v) : key === 'calories' ? `${formatNumber(v, 0)} kcal` : `${formatNumber(v)} g`);
    const isMet = (v) => (key === 'calories' ? v <= goal : v >= goal);

    const points = useMemo(() => history.map((d) => ({ date: d.date, raw: d.value, values: { v: shownValue(d.value) } })), [history, units.system]);
    const label = t(`nutrients.${key}`);

    return (
        <View style={{ gap: 14 }}>
            <View style={styles.chips}>
                {NUTRIENTS.map((n) => (
                    <TouchableOpacity
                        key={n.key}
                        onPress={() => setKey(n.key)}
                        style={[styles.chip, key === n.key && { backgroundColor: n.color, borderColor: n.color }]}
                        testID={`nutrient-chip-${n.key}`}
                    >
                        <Text style={[styles.chipText, key === n.key && styles.chipTextOn]}>{t(`nutrients.${n.key}`)}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            {recorded === 0 ? (
                <Text style={styles.emptyText}>{t('progress.nutrientsEmpty')}</Text>
            ) : (
                <>
                    <ScrollChart
                        key={key}
                        type="bar"
                        points={points}
                        goal={shownValue(goal)}
                        series={[{ key: 'v', color: nutrient.color, dim: (v) => !isMet(key === 'water' ? units.volumeToLiters(v) : v) }]}
                        testID="nutrients-chart"
                        renderPopover={(p) => (
                            <>
                                <PopRow color={nutrient.color} label={label} value={fmt(p.raw)} />
                                <Text style={styles.popGoal}>
                                    {t('progress.goalLine', { value: fmt(goal) })}{isMet(p.raw) ? ' ✓' : ''}
                                </Text>
                            </>
                        )}
                    />
                    <Text style={styles.summary}>
                        {[
                            t('progress.nutrientAvg', { value: fmt(avg) }),
                            t(key === 'calories' ? 'progress.nutrientWithin' : 'progress.nutrientMet', { count: met, total: recorded }),
                        ].join(' · ')}
                    </Text>
                </>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    legendRow: { flexDirection: 'row', gap: 16, justifyContent: 'center' },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    legendDot: { width: 10, height: 10, borderRadius: 5 },
    legendText: { fontSize: 12, fontFamily: 'Outfit_700Bold', color: '#475569' },
    empty: { backgroundColor: '#F8FAFC', borderRadius: 20, padding: 16, borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#CBD5E1' },
    emptyText: { fontSize: 12, fontFamily: 'Outfit_600SemiBold', color: '#94A3B8', textAlign: 'center', lineHeight: 17 },

    tick: { position: 'absolute', left: 0, right: 4, textAlign: 'right', fontSize: 10, fontFamily: 'Outfit_700Bold', color: '#94A3B8' },
    xLabel: { position: 'absolute', width: 48, textAlign: 'center', fontSize: 10, fontFamily: 'Outfit_700Bold', color: '#94A3B8' },
    popover: { position: 'absolute', width: POPOVER_W, backgroundColor: '#FFFFFF', borderRadius: 16, padding: 12, borderWidth: 1, borderColor: '#E2E8F0', elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 6, gap: 3, zIndex: 20 },
    popClose: { position: 'absolute', top: 6, right: 6, padding: 4, zIndex: 1 },
    popDate: { fontSize: 12, fontFamily: 'Outfit_900Black', color: '#64748B', marginBottom: 3, paddingRight: 14 },
    popRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    popDot: { width: 8, height: 8, borderRadius: 4 },
    popText: { fontSize: 12, fontFamily: 'Outfit_600SemiBold', color: '#475569' },
    popBold: { fontFamily: 'Outfit_700Bold', color: '#0F172A' },
    popGoal: { fontSize: 11, fontFamily: 'Outfit_600SemiBold', color: '#94A3B8', marginTop: 1 },

    measureRow: { flexDirection: 'row', gap: 12 },
    measureBox: { flex: 1, backgroundColor: '#F8FAFC', borderRadius: 20, padding: 14 },
    measureLabel: { fontSize: 9, fontFamily: 'Outfit_900Black', textTransform: 'uppercase', letterSpacing: 1 },
    measureValue: { fontSize: 20, fontFamily: 'Outfit_900Black', color: '#0F172A', marginTop: 2 },
    measureDiff: { fontSize: 10, fontFamily: 'Outfit_700Bold', marginTop: 2 },

    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    chip: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#FFFFFF' },
    chipText: { fontSize: 12, fontFamily: 'Outfit_700Bold', color: '#475569' },
    chipTextOn: { color: '#FFFFFF' },
    summary: { fontSize: 12, fontFamily: 'Outfit_700Bold', color: '#475569', textAlign: 'center' },
});
