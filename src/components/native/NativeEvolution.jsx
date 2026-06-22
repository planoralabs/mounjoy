import React, { useState, useMemo, useEffect } from 'react';
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
    Modal
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { 
    TrendingUp, 
    Scale, 
    Activity, 
    Camera, 
    ChevronRight, 
    X, 
    Maximize2, 
    Calendar,
    ChevronLeft
} from 'lucide-react-native';

const { width } = Dimensions.get('window');

const NativeEvolution = ({ user }) => {
    const [view, setView] = useState('weight'); // 'weight' or 'glucose'
    const [selectedDates, setSelectedDates] = useState([]);
    const [showFullComparison, setShowFullComparison] = useState(false);
    const [tooltip, setTooltip] = useState(null);

    useEffect(() => {
        setTooltip(null);
    }, [view]);

    // Glucose Mock History
    const glucoseHistory = [98, 105, 92, 110, 89, 94, 91];

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

    const chartData = useMemo(() => {
        const logs = view === 'weight' ? baseWeightLogs : baseWeightLogs.slice(-7); // Keep weight logs full, glucose sliced or full
        if (view === 'weight') {
            return {
                labels: logs.map(l => new Date(l.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })),
                datasets: [{
                    data: logs.map(l => l.weight),
                    color: (opacity = 1) => `rgba(234, 88, 12, ${opacity})`,
                    strokeWidth: 3
                }]
            };
        } else {
            return {
                labels: ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4', 'Sem 5', 'Sem 6', 'Sem 7'],
                datasets: [{
                    data: glucoseHistory,
                    color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
                    strokeWidth: 3
                }]
            };
        }
    }, [baseWeightLogs, view]);

    const chartWidth = useMemo(() => {
        const pointCount = view === 'weight' ? baseWeightLogs.length : 7;
        return Math.max(width - 32, pointCount * 65);
    }, [baseWeightLogs, view, width]);

    const toggleDate = (date) => {
        if (selectedDates.includes(date)) {
            setSelectedDates(selectedDates.filter(d => d !== date));
        } else if (selectedDates.length < 4) {
            setSelectedDates([...selectedDates, date]);
        }
    };

    const findPhotoForDate = (measurementDate) => {
        const log = baseWeightLogs.find(l => l.date === measurementDate);
        if (log && log.photoUrl) return { url: log.photoUrl };

        if (!user.photos || user.photos.length === 0) return null;
        const mDate = new Date(measurementDate);
        let closest = null;
        let minDiff = Infinity;
        user.photos.forEach(photo => {
            const pDate = new Date(photo.date);
            const diff = Math.abs(pDate - mDate);
            if (diff < minDiff && diff < (48 * 60 * 60 * 1000)) {
                minDiff = diff;
                closest = photo;
            }
        });
        return closest;
    };

    const heightInMeters = parseFloat(user.height) || 1.7;
    const currentWeight = parseFloat(user.currentWeight) || 80;
    const imc = (currentWeight / (heightInMeters * heightInMeters)).toFixed(1);

    const sortedSelectedDates = useMemo(() => {
        return [...selectedDates].sort((a, b) => new Date(a) - new Date(b));
    }, [selectedDates]);

    const totalDiff = useMemo(() => {
        if (sortedSelectedDates.length < 2) return null;
        const l1 = baseWeightLogs.find(l => l.date === sortedSelectedDates[0]);
        const l2 = baseWeightLogs.find(l => l.date === sortedSelectedDates[sortedSelectedDates.length - 1]);
        if (!l1 || !l2) return null;
        return (l2.weight - l1.weight).toFixed(1);
    }, [sortedSelectedDates, baseWeightLogs]);

    const nextDoseDate = useMemo(() => {
        const lastDose = user.doseHistory?.[0];
        if (!lastDose) return null;
        return new Date(new Date(lastDose.date).getTime() + 7 * 24 * 60 * 60 * 1000);
    }, [user.doseHistory]);

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                <View style={styles.header}>
                    <Text style={styles.title}>Sua Evolução</Text>
                    <View style={styles.tabContainer}>
                        <TouchableOpacity onPress={() => setView('weight')} style={[styles.tab, view === 'weight' && styles.tabActive]}>
                            <Text style={[styles.tabText, view === 'weight' && styles.tabTextActive]}>PESO</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setView('glucose')} style={[styles.tab, view === 'glucose' && styles.tabActive]}>
                            <Text style={[styles.tabText, view === 'glucose' && styles.tabTextActive]}>GLICEMIA</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Chart Section */}
                <View style={[styles.chartCard, { flexDirection: 'row', padding: 8 }]}>
                    {/* Fixed Y-Axis Labels */}
                    <View style={{ width: 40, overflow: 'hidden', height: 220 }}>
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
                            style={{ marginVertical: 8, borderRadius: 32, marginLeft: -10 }}
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
                            width={chartWidth - 45}
                            height={220}
                            chartConfig={{
                                backgroundColor: '#ffffff',
                                backgroundGradientFrom: '#ffffff',
                                backgroundGradientTo: '#ffffff',
                                decimalPlaces: 1,
                                color: (opacity = 1) => view === 'weight' ? `rgba(234, 88, 12, ${opacity})` : `rgba(16, 185, 129, ${opacity})`,
                                labelColor: (opacity = 1) => `rgba(148, 163, 184, ${opacity})`,
                                propsForLabels: {
                                    fontFamily: 'Outfit_700Bold',
                                    fontSize: 10
                                },
                                style: { borderRadius: 32 },
                                propsForDots: { r: '6', strokeWidth: '2', stroke: view === 'weight' ? '#EA580C' : '#10B981' },
                                gridColor: 'rgba(241, 245, 249, 1)'
                            }}
                            bezier
                            style={{ marginVertical: 8, borderRadius: 32 }}
                            withInnerLines={false}
                            withOuterLines={false}
                            withShadow={true}
                            withHorizontalLabels={false}
                            withVerticalLabels={true}
                            onDataPointClick={({ value, index, x, y }) => {
                                if (view === 'weight') {
                                    const logs = baseWeightLogs;
                                    const log = logs[index];
                                    if (!log) return;
                                    const logDate = new Date(log.date);
                                    const formattedDate = logDate.toLocaleDateString('pt-BR', { month: 'short' }) + '.';
                                    const pointImc = (log.weight / (heightInMeters * heightInMeters)).toFixed(1);
                                    
                                    const prevLogIndex = baseWeightLogs.findIndex(l => l.date === log.date) - 1;
                                    let status = "Estável";
                                    if (prevLogIndex >= 0) {
                                        const prevWeight = baseWeightLogs[prevLogIndex].weight;
                                        status = log.weight < prevWeight ? "Em evolução" : (log.weight === prevWeight ? "Estável" : "Em alerta");
                                    }

                                    setTooltip({
                                        x,
                                        y,
                                        value,
                                        date: formattedDate,
                                        imc: pointImc,
                                        status
                                    });
                                } else {
                                    setTooltip({
                                        x,
                                        y,
                                        value,
                                        date: `Sem ${index + 1}`,
                                        imc: null,
                                        status: null
                                    });
                                }
                            }}
                        />
                        {tooltip && (
                            <View style={[styles.tooltipContainer, { left: Math.max(10, Math.min(chartWidth - 45 - 140, tooltip.x - 65)), top: Math.max(10, tooltip.y - 80) }]}>
                                <TouchableOpacity style={styles.tooltipClose} onPress={() => setTooltip(null)}>
                                    <X size={12} color="#94A3B8" />
                                </TouchableOpacity>
                                <Text style={styles.tooltipDate}>{tooltip.date}</Text>
                                <Text style={styles.tooltipText}>
                                    {view === 'weight' ? 'Peso: ' : 'Glicemia: '}
                                    <Text style={styles.tooltipBold}>{tooltip.value}{view === 'weight' ? 'kg' : ' mg/dL'}</Text>
                                </Text>
                                {view === 'weight' && tooltip.imc && (
                                    <Text style={styles.tooltipText}>IMC: <Text style={styles.tooltipBold}>{tooltip.imc}</Text></Text>
                                )}
                            </View>
                        )}
                    </ScrollView>
                </View>

                {/* Evolution Comparison Section */}
                <View style={styles.glassPanel}>
                    <View style={styles.compareHeaderCol}>
                        <View style={styles.compareTitleRow}>
                            <Scale size={16} color="#EA580C" />
                            <Text style={styles.compareTitleText}>Comparador Visual</Text>
                        </View>
                        <Text style={styles.compareSubTitleText}>Selecione até 4 registros para comparar</Text>
                    </View>

                    {/* Horizontal Date Picker */}
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.datePickerScroll}>
                        {baseWeightLogs.slice().reverse().map((log, idx) => {
                            const isSelected = selectedDates.includes(log.date);
                            const d = new Date(log.date);
                            const isMaxReached = !isSelected && selectedDates.length >= 4;
                            return (
                                <TouchableOpacity
                                    key={idx}
                                    onPress={() => toggleDate(log.date)}
                                    disabled={isMaxReached}
                                    style={[
                                        styles.dateChip,
                                        isSelected ? styles.dateChipActive : null,
                                        isMaxReached ? { opacity: 0.4 } : null
                                    ]}
                                >
                                    <Text style={[styles.dateChipDay, isSelected && { color: '#FFFFFF' }]}>
                                        {d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                                    </Text>
                                    <Text style={[styles.dateChipWeight, isSelected && { color: '#FFFFFF' }]}>
                                        {log.weight}kg
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>

                    {/* Comparison Cards Grid */}
                    {selectedDates.length > 0 ? (
                        <View style={styles.gridOuter}>
                            <View style={styles.compareGrid}>
                                {sortedSelectedDates.map((dateStr, idx) => {
                                    const log = baseWeightLogs.find(l => l.date === dateStr);
                                    if (!log) return null;
                                    const photo = findPhotoForDate(dateStr);
                                    
                                    const prevLog = idx > 0 ? baseWeightLogs.find(l => l.date === sortedSelectedDates[idx - 1]) : null;
                                    const diff = (prevLog && log) ? (log.weight - prevLog.weight).toFixed(1) : null;

                                    return (
                                        <View 
                                            key={dateStr} 
                                            style={[
                                                styles.compareGridCard,
                                                selectedDates.length === 1 ? { width: '100%' } : selectedDates.length === 3 ? { width: '31%' } : { width: '48%' }
                                            ]}
                                        >
                                            <View style={styles.compareGridPhotoFrame}>
                                                {photo ? (
                                                    <Image source={{ uri: photo.url }} style={styles.compareGridPhoto} resizeMode="cover" />
                                                ) : (
                                                    <View style={styles.compareGridPhotoPlaceholder}>
                                                        <Camera size={24} color="#94A3B8" />
                                                    </View>
                                                )}
                                                <TouchableOpacity 
                                                    style={styles.compareGridRemoveBtn}
                                                    onPress={() => toggleDate(dateStr)}
                                                >
                                                    <X size={10} color="#EF4444" strokeWidth={3} />
                                                </TouchableOpacity>
                                                <View style={styles.compareGridDateOverlay}>
                                                    <Text style={styles.compareGridDateOverlayText}>
                                                        {new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                                                    </Text>
                                                </View>
                                            </View>

                                            <View style={styles.compareGridMeta}>
                                                <View style={styles.compareGridWeightRow}>
                                                    <Text style={styles.compareGridWeightBig}>{log.weight}</Text>
                                                    <Text style={styles.compareGridWeightUnit}>kg</Text>
                                                </View>
                                                {diff !== null && (
                                                    <View style={[
                                                        styles.compareGridDiffBadge,
                                                        parseFloat(diff) <= 0 ? styles.compareGridDiffBadgeNeg : styles.compareGridDiffBadgePos
                                                    ]}>
                                                        <Text style={[
                                                            styles.compareGridDiffText,
                                                            parseFloat(diff) <= 0 ? { color: '#EA580C' } : { color: '#EF4444' }
                                                        ]}>
                                                            {parseFloat(diff) <= 0 ? '' : '+'}{diff}kg
                                                        </Text>
                                                    </View>
                                                )}
                                            </View>
                                        </View>
                                    );
                                })}
                            </View>

                            {selectedDates.length >= 2 && (
                                <TouchableOpacity 
                                    style={styles.expandBtn}
                                    onPress={() => setShowFullComparison(true)}
                                >
                                    <Maximize2 size={16} color="#EA580C" />
                                    <Text style={styles.expandBtnText}>Expandir Comparativo</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    ) : (
                        <View style={styles.emptyCompare}>
                            <View style={styles.emptyCompareIcon}>
                                <TrendingUp size={24} color="#EA580C" />
                            </View>
                            <Text style={styles.emptyCompareText}>Escolha registros acima{"\n"}para iniciar o comparativo</Text>
                        </View>
                    )}
                </View>

                {/* Summary Grid (Average Glycemia & Current BMI) */}
                <View style={styles.summaryGrid}>
                    <View style={styles.summaryCard}>
                        <View style={[styles.iconBox, { backgroundColor: '#F0FDF4' }]}>
                            <Activity size={20} color="#16A34A" />
                        </View>
                        <Text style={styles.summaryLabel}>Glicemia Média</Text>
                        <Text style={styles.summaryValue}>92 <Text style={styles.summaryUnit}>mg/dL</Text></Text>
                    </View>

                    <View style={styles.summaryCard}>
                        <View style={[styles.iconBox, { backgroundColor: '#EFF6FF' }]}>
                            <TrendingUp size={20} color="#2563EB" />
                        </View>
                        <Text style={styles.summaryLabel}>IMC Atual</Text>
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
                            <Text style={styles.doseHistoryTitle}>Controle de Protocolo</Text>
                            <Text style={styles.doseHistorySub}>{user.medicationId} • Recentes</Text>
                        </View>
                    </View>
                    
                    <View style={styles.doseHistoryList}>
                        {user.doseHistory && user.doseHistory.length > 0 ? (
                            user.doseHistory.slice(0, 3).map((dose, idx) => (
                                <View key={idx} style={styles.doseHistoryItem}>
                                    <View>
                                        <Text style={styles.doseHistoryDate}>
                                            {new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(new Date(dose.date))}
                                        </Text>
                                        <Text style={styles.doseHistoryArea}>{dose.area || 'Não registrado'}</Text>
                                    </View>
                                    <Text style={styles.doseHistoryVal}>{dose.dose}</Text>
                                </View>
                            ))
                        ) : (
                            <Text style={styles.emptyDoses}>Nenhuma dose registrada ainda.</Text>
                        )}

                        {nextDoseDate && (
                            <View style={styles.nextDoseBox}>
                                <Text style={styles.nextDoseLabel}>Próxima Dose Sugerida</Text>
                                <Text style={styles.nextDoseDateText}>
                                    {new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(nextDoseDate)}
                                </Text>
                            </View>
                        )}
                    </View>
                </View>
            </ScrollView>

            {/* Fullscreen Comparador Modal */}
            <Modal visible={showFullComparison} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    {/* Header */}
                    <View style={styles.modalHeader}>
                        <TouchableOpacity 
                            onPress={() => setShowFullComparison(false)}
                            style={styles.modalCloseBtn}
                        >
                            <X size={20} color="#FFFFFF" />
                        </TouchableOpacity>
                        
                        <View style={{ alignItems: 'center' }}>
                            <Text style={styles.modalTitle}>Evolução</Text>
                            <Text style={styles.modalSubTitle}>Ajuste & Compartilhe</Text>
                        </View>
                        
                        <View style={{ width: 40 }} />
                    </View>

                    {/* Photos Grid */}
                    <View style={styles.modalGridContainer}>
                        <View style={[
                            styles.modalGrid,
                            sortedSelectedDates.length === 3 ? { flexDirection: 'column' } : { flexDirection: 'row', flexWrap: 'wrap' }
                        ]}>
                            {sortedSelectedDates.map((dateStr, idx) => {
                                const log = baseWeightLogs.find(l => l.date === dateStr);
                                const photo = findPhotoForDate(dateStr);
                                
                                return (
                                    <View 
                                        key={idx} 
                                        style={[
                                            styles.modalPhotoBox,
                                            sortedSelectedDates.length === 2 ? { width: '50%', height: '100%' } :
                                            sortedSelectedDates.length === 3 ? { height: '33.3%', width: '100%' } :
                                            { width: '50%', height: '50%' }
                                        ]}
                                    >
                                        {photo ? (
                                            <Image source={{ uri: photo.url }} style={styles.modalFullImage} resizeMode="cover" />
                                        ) : (
                                            <View style={styles.modalImagePlaceholder}>
                                                <Camera size={32} color="#475569" />
                                            </View>
                                        )}
                                        
                                        {/* Bottom info overlay */}
                                        <View style={styles.modalPhotoOverlay}>
                                            <Text style={styles.modalPhotoWeight}>{log?.weight}kg</Text>
                                            <Text style={styles.modalPhotoDate}>
                                                {new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: '2-digit' })}
                                            </Text>
                                        </View>
                                    </View>
                                );
                            })}
                        </View>

                        {/* Centered overall loss badge */}
                        {totalDiff !== null && (
                            <View style={styles.modalTotalDiffBadge}>
                                <Text style={styles.modalTotalDiffText}>{totalDiff > 0 ? '+' : ''}{totalDiff}kg</Text>
                            </View>
                        )}
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
};

export default NativeEvolution;

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FAF7F2' },
    scroll: { padding: 24, paddingBottom: 120 },
    header: { marginBottom: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: Platform.OS === 'android' ? 20 : 0 },
    title: { fontSize: 24, fontFamily: 'Outfit_700Bold', color: '#0F172A' },
    tabContainer: { flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: 12, padding: 4 },
    tab: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
    tabActive: { backgroundColor: '#fff', elevation: 2 },
    tabText: { fontSize: 10, fontFamily: 'Outfit_700Bold', color: '#64748B' },
    tabTextActive: { color: '#EA580C' },

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

    glassPanel: {
        backgroundColor: '#FFFFFF',
        borderRadius: 40,
        padding: 20,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        marginBottom: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.02,
        shadowRadius: 8,
        elevation: 2,
    },
    compareHeaderCol: {
        marginBottom: 16,
    },
    compareTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 4,
    },
    compareTitleText: {
        fontSize: 13,
        fontFamily: 'Outfit_900Black',
        color: '#0F172A',
        textTransform: 'uppercase',
        letterSpacing: 2,
    },
    compareSubTitleText: {
        fontSize: 10,
        fontFamily: 'Outfit_700Bold',
        color: '#94A3B8',
        textTransform: 'uppercase',
    },

    datePickerScroll: {
        gap: 8,
        paddingBottom: 12,
        marginBottom: 16,
    },
    dateChip: {
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        gap: 2,
    },
    dateChipActive: {
        backgroundColor: '#EA580C',
        borderColor: '#EA580C',
    },
    dateChipDay: {
        fontSize: 10,
        fontFamily: 'Outfit_600SemiBold',
        color: '#64748B',
    },
    dateChipWeight: {
        fontSize: 12,
        fontFamily: 'Outfit_900Black',
        color: '#0F172A',
    },

    gridOuter: {
        width: '100%',
    },
    compareGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    compareGridCard: {
        marginBottom: 8,
    },
    compareGridPhotoFrame: {
        aspectRatio: 3/4,
        borderRadius: 24,
        backgroundColor: '#F1F5F9',
        overflow: 'hidden',
        position: 'relative',
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    compareGridPhoto: {
        width: '100%',
        height: '100%',
    },
    compareGridPhotoPlaceholder: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    compareGridRemoveBtn: {
        position: 'absolute',
        top: 8,
        right: 8,
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 2,
    },
    compareGridDateOverlay: {
        position: 'absolute',
        bottom: 8,
        left: 8,
        right: 8,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        paddingVertical: 2,
        borderRadius: 8,
        alignItems: 'center',
    },
    compareGridDateOverlayText: {
        color: '#FFFFFF',
        fontSize: 9,
        fontFamily: 'Outfit_700Bold',
    },
    compareGridMeta: {
        alignItems: 'center',
        marginTop: 6,
    },
    compareGridWeightRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
    },
    compareGridWeightBig: {
        fontSize: 18,
        fontFamily: 'Outfit_900Black',
        color: '#0F172A',
    },
    compareGridWeightUnit: {
        fontSize: 10,
        fontFamily: 'Outfit_700Bold',
        color: '#94A3B8',
        marginLeft: 1,
    },
    compareGridDiffBadge: {
        marginTop: 4,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 12,
    },
    compareGridDiffBadgeNeg: {
        backgroundColor: '#FFF7ED',
    },
    compareGridDiffBadgePos: {
        backgroundColor: '#FEF2F2',
    },
    compareGridDiffText: {
        fontSize: 9,
        fontFamily: 'Outfit_900Black',
    },

    expandBtn: {
        width: '100%',
        paddingVertical: 16,
        borderRadius: 24,
        backgroundColor: '#FFF7ED',
        borderWidth: 1,
        borderColor: '#FFEDD5',
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
    },
    expandBtnText: {
        fontSize: 12,
        fontFamily: 'Outfit_900Black',
        color: '#EA580C',
        textTransform: 'uppercase',
    },

    emptyCompare: {
        paddingVertical: 32,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#F1F5F9',
        borderStyle: 'dashed',
        borderRadius: 32,
        backgroundColor: '#FAF8F5',
    },
    emptyCompareIcon: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
        elevation: 1,
    },
    emptyCompareText: {
        fontSize: 11,
        fontFamily: 'Outfit_900Black',
        color: '#94A3B8',
        textTransform: 'uppercase',
        letterSpacing: 1.5,
        textAlign: 'center',
        lineHeight: 16,
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
    summaryUnit: {
        fontSize: 12,
        fontFamily: 'Outfit_600SemiBold',
        color: '#94A3B8',
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

    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: '#090D16',
        paddingTop: Platform.OS === 'ios' ? 44 : 20,
    },
    modalHeader: {
        height: 64,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    modalCloseBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalTitle: {
        fontSize: 18,
        fontFamily: 'Outfit_900Black',
        color: '#FFFFFF',
        textTransform: 'uppercase',
        letterSpacing: 2,
    },
    modalSubTitle: {
        fontSize: 8,
        fontFamily: 'Outfit_900Black',
        color: '#EA580C',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    modalGridContainer: {
        flex: 1,
        position: 'relative',
    },
    modalGrid: {
        width: '100%',
        height: '100%',
    },
    modalPhotoBox: {
        position: 'relative',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
        backgroundColor: '#0F172A',
    },
    modalFullImage: {
        width: '100%',
        height: '100%',
    },
    modalImagePlaceholder: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalPhotoOverlay: {
        position: 'absolute',
        bottom: 20,
        left: 20,
        right: 20,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        paddingVertical: 10,
        borderRadius: 16,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    modalPhotoWeight: {
        color: '#FFFFFF',
        fontSize: 24,
        fontFamily: 'Outfit_900Black',
    },
    modalPhotoDate: {
        color: 'rgba(255, 255, 255, 0.5)',
        fontSize: 10,
        fontFamily: 'Outfit_700Bold',
        textTransform: 'uppercase',
        marginTop: 2,
    },
    modalTotalDiffBadge: {
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: [{ translateX: -40 }, { translateY: -20 }],
        backgroundColor: '#EA580C',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        elevation: 5,
        shadowColor: '#000',
        shadowOpacity: 0.3,
        shadowRadius: 10,
    },
    modalTotalDiffText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontFamily: 'Outfit_900Black',
    },
    tooltipContainer: {
        position: 'absolute',
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 12,
        width: 130,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
        zIndex: 10,
    },
    tooltipClose: {
        position: 'absolute',
        top: 6,
        right: 6,
        padding: 4,
    },
    tooltipDate: {
        fontSize: 10,
        fontFamily: 'Outfit_900Black',
        color: '#64748B',
        textTransform: 'capitalize',
        marginBottom: 4,
    },
    tooltipText: {
        fontSize: 10,
        fontFamily: 'Outfit_600SemiBold',
        color: '#475569',
    },
    tooltipBold: {
        fontFamily: 'Outfit_700Bold',
        color: '#0F172A',
    },
    tooltipStatus: {
        fontSize: 9,
        fontFamily: 'Outfit_700Bold',
        marginTop: 4,
    }
});
