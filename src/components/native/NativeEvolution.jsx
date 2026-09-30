import React, { useState, useMemo } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    ScrollView, 
    TouchableOpacity, 
    SafeAreaView, 
    Dimensions, 
    Platform, 
    Image,
    Pressable
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { 
    TrendingUp, 
    ChevronRight, 
    X, 
    Calendar,
    ChevronLeft
} from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { unitsFor, formatDate } from '../../i18n';
import { siteLabel } from '../../services/InjectionService';

const { width } = Dimensions.get('window');

const NativeEvolution = ({ user }) => {
    const { t } = useTranslation();
    const units = unitsFor(user);
    const [tooltip, setTooltip] = useState(null);

    const hasEnoughData = user.measurements && user.measurements.length >= 3;

    // Weight logs setup
    const baseWeightLogs = useMemo(() => {
        let logs = user.measurements && user.measurements.length > 0
            ? [...user.measurements].sort((a, b) => new Date(a.date) - new Date(b.date))
            : [];

        if (!hasEnoughData) {
            const now = new Date();
            const demoPoints = [
                { date: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString(), weight: 105.5, photoUrl: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=400&fit=crop' },
                { date: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString(), weight: 102.0, photoUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&fit=crop' },
                { date: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(), weight: 98.5, photoUrl: 'https://images.unsplash.com/photo-1518310383802-640c2de311b2?w=400&fit=crop' },
                { date: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(), weight: 95.0, photoUrl: 'https://images.unsplash.com/photo-1594824476967-48c8b964273f?auto=format&fit=crop&w=400&h=400&q=40' }
            ];
            return demoPoints;
        }
        return logs;
    }, [user.measurements, hasEnoughData]);

    const chartData = useMemo(() => ({
        labels: baseWeightLogs.map(l => formatDate(l.date, { day: '2-digit', month: '2-digit' })),
        datasets: [{
            data: baseWeightLogs.map(l => units.weight(l.weight)),
            color: (opacity = 1) => `rgba(234, 88, 12, ${opacity})`,
            strokeWidth: 3
        }]
    }), [baseWeightLogs, units.system]);

    const chartWidth = useMemo(() => {
        return Math.max(width - 32, baseWeightLogs.length * 65);
    }, [baseWeightLogs, width]);

    const getXForIndex = (index, totalPoints) => {
        const w = chartWidth - 40;
        const paddingLeft = 64;
        const paddingRight = 58.5;
        const scaleFactor = w / 298;
        const pLeft = paddingLeft * scaleFactor;
        const pRight = paddingRight * scaleFactor;
        
        if (totalPoints <= 1) return w / 2;
        return pLeft + (index * (w - pLeft - pRight)) / (totalPoints - 1);
    };

    const getYForValue = (value, logs) => {
        const values = logs.map(l => l.weight);
        const maxVal = Math.max(...values);
        const minVal = Math.min(...values);
        const range = maxVal - minVal;
        if (range === 0) return 98.5;
        
        const graphTop = 16;
        const graphBottom = 181;
        const graphHeight = graphBottom - graphTop;
        
        return graphBottom - ((value - minVal) / range) * graphHeight;
    };

    const handlePointClick = (index) => {
        const logs = baseWeightLogs;
        const log = logs[index];
        if (!log) return;

        setTooltip({
            x: getXForIndex(index, logs.length),
            y: getYForValue(log.weight, logs),
            value: log.weight,
            date: formatDate(log.date, { month: 'long' }),
            imc: (log.weight / (heightInMeters * heightInMeters)).toFixed(1)
        });
    };

    const heightInMeters = parseFloat(user.height) || 1.7;
    const currentWeight = parseFloat(user.currentWeight) || 80;
    const imc = (currentWeight / (heightInMeters * heightInMeters)).toFixed(1);

    const nextDoseDate = useMemo(() => {
        const lastDose = user.doseHistory?.[0];
        if (!lastDose) return null;
        return new Date(new Date(lastDose.date).getTime() + 7 * 24 * 60 * 60 * 1000);
    }, [user.doseHistory]);

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                <View style={styles.header}>
                    <Text style={styles.title}>{t('evolution.title')}</Text>
                </View>

                {/* Chart Section */}
                <View style={[styles.chartCard, { flexDirection: 'row' }]}>
                    {/* Fixed Y-Axis Labels */}
                    <View style={{ width: 36, overflow: 'hidden', height: 220 }}>
                        <LineChart
                            data={chartData}
                            width={width - 32}
                            height={220}
                            chartConfig={{
                                backgroundColor: '#ffffff',
                                backgroundGradientFrom: '#ffffff',
                                backgroundGradientTo: '#ffffff',
                                decimalPlaces: 1,
                                color: () => 'transparent',
                                labelColor: (opacity = 1) => `rgba(148, 163, 184, ${opacity})`,
                                propsForLabels: {
                                    fontFamily: 'Outfit_700Bold',
                                    fontSize: 10
                                },
                                style: { borderRadius: 32 },
                                gridColor: 'transparent',
                                propsForDots: { r: '0', strokeWidth: '0' }
                            }}
                            bezier
                            style={{ marginVertical: 8, borderRadius: 32, marginLeft: -20 }}
                            withInnerLines={false}
                            withOuterLines={false}
                            withShadow={false}
                            withDots={false}
                            withVerticalLabels={false}
                            withHorizontalLabels={true}
                        />
                    </View>

                    {/* Scrollable Chart Content */}
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ position: 'relative', paddingLeft: 0, paddingRight: 20 }}>
                        <LineChart
                            data={chartData}
                            width={chartWidth - 40}
                            height={220}
                            chartConfig={{
                                backgroundColor: '#ffffff',
                                backgroundGradientFrom: '#ffffff',
                                backgroundGradientTo: '#ffffff',
                                decimalPlaces: 1,
                                color: (opacity = 1) => `rgba(234, 88, 12, ${opacity})`,
                                labelColor: (opacity = 1) => `rgba(148, 163, 184, ${opacity})`,
                                propsForLabels: {
                                    fontFamily: 'Outfit_700Bold',
                                    fontSize: 10
                                },
                                style: { borderRadius: 32 },
                                propsForDots: { r: '6', strokeWidth: '2', stroke: '#EA580C' },
                                gridColor: 'rgba(241, 245, 249, 1)'
                            }}
                            bezier
                            style={{ marginVertical: 8, borderRadius: 32, marginLeft: -48 }}
                            withInnerLines={false}
                            withOuterLines={false}
                            withShadow={true}
                            withHorizontalLabels={false}
                            withVerticalLabels={true}
                            onDataPointClick={({ index }) => handlePointClick(index)}
                        />

                        {/* Column touch target overlays */}
                        {chartData.labels.map((_, index) => {
                            const totalPoints = chartData.labels.length;
                            const centerX = getXForIndex(index, totalPoints);
                            const leftPos = centerX - 25 - 48; // offset by -48 to match chart's marginLeft
                            return (
                                <Pressable
                                    key={index}
                                    style={{
                                        position: 'absolute',
                                        left: leftPos,
                                        top: 8,
                                        width: 50,
                                        height: 200,
                                        backgroundColor: 'transparent',
                                        zIndex: 15,
                                    }}
                                    onPress={() => handlePointClick(index)}
                                />
                            );
                        })}

                         {tooltip && (
                            <>
                                <Pressable 
                                    style={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        right: 0,
                                        bottom: 0,
                                        zIndex: 10,
                                    }}
                                    onPress={() => setTooltip(null)}
                                />
                                <Pressable 
                                    style={[styles.tooltipContainer, { left: Math.max(10, Math.min(chartWidth - 40 - 140, tooltip.x - 113)), top: Math.max(10, tooltip.y - 80), zIndex: 20 }]}
                                    onPress={() => {}} // intercept tap inside tooltip to prevent close
                                >
                                    <TouchableOpacity style={styles.tooltipClose} onPress={() => setTooltip(null)}>
                                        <X size={12} color="#94A3B8" />
                                    </TouchableOpacity>
                                    <Text style={styles.tooltipDate}>{tooltip.date}</Text>
                                    <Text style={styles.tooltipText}>
                                        {t('evolution.weightLabel')}{': '}
                                        <Text style={styles.tooltipBold}>{units.formatWeight(tooltip.value)}</Text>
                                    </Text>
                                    {!!tooltip.imc && (
                                        <Text style={styles.tooltipText}>{t('evolution.bmi')}: <Text style={styles.tooltipBold}>{tooltip.imc}</Text></Text>
                                    )}
                                </Pressable>
                            </>
                        )}
                    </ScrollView>
                </View>

                {/* Summary (Current BMI) */}
                <View style={styles.summaryGrid}>
                    <View style={styles.summaryCard}>
                        <View style={[styles.iconBox, { backgroundColor: '#EFF6FF' }]}>
                            <TrendingUp size={20} color="#2563EB" />
                        </View>
                        <Text style={styles.summaryLabel}>{t('evolution.currentBmi')}</Text>
                        <Text style={styles.summaryValue}>{imc}</Text>
                    </View>
                </View>

                {/* Dose History Section */}
                <View style={styles.doseHistoryCard}>
                    <View style={styles.doseHistoryHeader}>
                        <View style={styles.doseHistoryIconBox}>
                            <Calendar size={20} color="#EA580C" />
                        </View>
                        <View>
                            <Text style={styles.doseHistoryTitle}>{t('evolution.protocolTitle')}</Text>
                            <Text style={styles.doseHistorySub}>{t('evolution.recent', { medication: user.medicationId })}</Text>
                        </View>
                    </View>
                    
                    <View style={styles.doseHistoryList}>
                        {user.doseHistory && user.doseHistory.length > 0 ? (
                            user.doseHistory.slice(0, 3).map((dose, idx) => (
                                <View key={idx} style={styles.doseHistoryItem}>
                                    <View>
                                        <Text style={styles.doseHistoryDate}>
                                            {formatDate(dose.date, { day: '2-digit', month: 'short' })}
                                        </Text>
                                        <Text style={styles.doseHistoryArea}>{siteLabel(t, dose)}</Text>
                                    </View>
                                    <Text style={styles.doseHistoryVal}>{dose.dose}</Text>
                                </View>
                            ))
                        ) : (
                            <Text style={styles.emptyDoses}>{t('common.noDosesYet')}</Text>
                        )}

                        {nextDoseDate && (
                            <View style={styles.nextDoseBox}>
                                <Text style={styles.nextDoseLabel}>{t('evolution.nextDose')}</Text>
                                <Text style={styles.nextDoseDateText}>
                                    {formatDate(nextDoseDate, { day: '2-digit', month: 'short' })}
                                </Text>
                            </View>
                        )}
                    </View>
                </View>
                </ScrollView>
        </SafeAreaView>
    );
};

export default NativeEvolution;

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FAF7F2' },
    scroll: { padding: 24, paddingBottom: 120 },
    header: { marginBottom: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: Platform.OS === 'android' ? 20 : 0 },
    title: { fontSize: 24, fontFamily: 'Outfit_700Bold', color: '#0F172A' },

    chartCard: { 
        backgroundColor: '#fff', 
        borderRadius: 32, 
        padding: 12, 
        marginBottom: 24, 
        borderWidth: 1, 
        borderColor: '#F1F5F9', 
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.02,
        shadowRadius: 8,
    },



    summaryGrid: {
        flexDirection: 'row',
        gap: 16,
        marginBottom: 24,
    },
    summaryCard: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        borderRadius: 32,
        padding: 20,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        elevation: 1,
    },
    iconBox: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    summaryLabel: {
        fontSize: 10,
        fontFamily: 'Outfit_900Black',
        color: '#94A3B8',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 4,
    },
    summaryValue: {
        fontSize: 22,
        fontFamily: 'Outfit_700Bold',
        color: '#0F172A',
    },

    doseHistoryCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 32,
        padding: 24,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        position: 'relative',
        overflow: 'hidden',
    },
    doseHistoryHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 20,
    },
    doseHistoryIconBox: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: '#FFF7ED',
        justifyContent: 'center',
        alignItems: 'center',
    },
    doseHistoryTitle: {
        fontSize: 14,
        fontFamily: 'Outfit_900Black',
        color: '#0F172A',
    },
    doseHistorySub: {
        fontSize: 10,
        fontFamily: 'Outfit_700Bold',
        color: '#94A3B8',
        textTransform: 'uppercase',
    },
    doseHistoryList: {
        gap: 12,
    },
    doseHistoryItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#F8FAFC',
        paddingBottom: 10,
    },
    doseHistoryDate: {
        fontSize: 14,
        fontFamily: 'Outfit_700Bold',
        color: '#334155',
    },
    doseHistoryArea: {
        fontSize: 10,
        fontFamily: 'Outfit_900Black',
        color: '#94A3B8',
        textTransform: 'uppercase',
        marginTop: 2,
    },
    doseHistoryVal: {
        fontSize: 14,
        fontFamily: 'Outfit_900Black',
        color: '#EA580C',
    },
    emptyDoses: {
        fontSize: 12,
        fontFamily: 'Outfit_600SemiBold',
        color: '#94A3B8',
        fontStyle: 'italic',
    },
    nextDoseBox: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#FFF7ED',
        borderRadius: 16,
        padding: 12,
        marginTop: 4,
    },
    nextDoseLabel: {
        fontSize: 11,
        fontFamily: 'Outfit_700Bold',
        color: '#9A3412',
    },
    nextDoseDateText: {
        fontSize: 12,
        fontFamily: 'Outfit_900Black',
        color: '#EA580C',
    },


    tooltipContainer: {
        position: 'absolute',
        backgroundColor: '#FFFFFF',
        borderRadius: 18,
        padding: 16,
        width: 160,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
        zIndex: 20,
    },
    tooltipClose: {
        position: 'absolute',
        top: 8,
        right: 8,
        padding: 4,
    },
    tooltipDate: {
        fontSize: 12,
        fontFamily: 'Outfit_900Black',
        color: '#64748B',
        textTransform: 'capitalize',
        marginBottom: 6,
    },
    tooltipText: {
        fontSize: 12,
        fontFamily: 'Outfit_600SemiBold',
        color: '#475569',
        lineHeight: 18,
    },
    tooltipBold: {
        fontFamily: 'Outfit_700Bold',
        color: '#0F172A',
    },
    tooltipStatus: {
        fontSize: 11,
        fontFamily: 'Outfit_700Bold',
        marginTop: 6,
    }
});
