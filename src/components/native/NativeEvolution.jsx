import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Dimensions, Platform } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { TrendingUp, Scale, Activity, Camera, ChevronRight, Plus } from 'lucide-react-native';

const { width } = Dimensions.get('window');

const NativeEvolution = ({ user }) => {
    const [view, setView] = useState('weight');

    // Filter and Sort Data
    const weightLogs = useMemo(() => {
        let logs = (user.measurements && user.measurements.length > 0)
            ? [...user.measurements].sort((a, b) => new Date(a.date) - new Date(b.date))
            : [];
            
        // Mock data if too few points
        if (logs.length < 3) {
            const now = new Date();
            return [
                { date: new Date(now.getTime() - 60*24*60*60*1000).toISOString(), weight: (user.startWeight || 100) + 5 },
                { date: new Date(now.getTime() - 30*24*60*60*1000).toISOString(), weight: (user.startWeight || 100) + 2 },
                { date: now.toISOString(), weight: user.currentWeight || 100 }
            ];
        }
        return logs.slice(-7); // Last 7 points
    }, [user]);

    const chartData = {
        labels: weightLogs.map(l => new Date(l.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })),
        datasets: [{
            data: weightLogs.map(l => l.weight),
            color: (opacity = 1) => `rgba(20, 184, 166, ${opacity})`,
            strokeWidth: 3
        }]
    };

    const imc = (user.currentWeight / ((user.height || 1.7) ** 2)).toFixed(1);
    const weightDiff = (weightLogs[weightLogs.length - 1].weight - weightLogs[0].weight).toFixed(1);

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scroll}>
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
                <View style={styles.chartCard}>
                    <LineChart
                        data={chartData}
                        width={width - 48}
                        height={220}
                        chartConfig={{
                            backgroundColor: '#ffffff',
                            backgroundGradientFrom: '#ffffff',
                            backgroundGradientTo: '#ffffff',
                            decimalPlaces: 1,
                            color: (opacity = 1) => `rgba(20, 184, 166, ${opacity})`,
                            labelColor: (opacity = 1) => `rgba(148, 163, 184, ${opacity})`,
                            style: { borderRadius: 16 },
                            propsForDots: { r: '6', strokeWidth: '2', stroke: '#14B8A6' },
                            gridColor: 'rgba(241, 245, 249, 1)'
                        }}
                        bezier
                        style={{ marginVertical: 8, borderRadius: 16 }}
                        withInnerLines={false}
                        withOuterLines={false}
                        withShadow={false}
                    />
                </View>

                {/* Summary Grid */}
                <View style={styles.grid}>
                    <View style={styles.statCard}>
                        <View style={[styles.iconBox, { backgroundColor: '#F0FDFA' }]}><TrendingUp size={20} color="#14B8A6" /></View>
                        <Text style={styles.statLabel}>Total Perdido</Text>
                        <Text style={[styles.statValue, { color: parseFloat(weightDiff) <= 0 ? '#059669' : '#DC2626' }]}>
                            {weightDiff > 0 ? '+' : ''}{weightDiff}kg
                        </Text>
                    </View>
                    <View style={styles.statCard}>
                        <View style={[styles.iconBox, { backgroundColor: '#EFF6FF' }]}><Activity size={20} color="#3B82F6" /></View>
                        <Text style={styles.statLabel}>IMC Atual</Text>
                        <Text style={styles.statValue}>{imc}</Text>
                    </View>
                </View>

                {/* Comparison Card Simulado */}
                <View style={styles.compareSection}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Comparativo Visual</Text>
                        <TouchableOpacity>
                            <Text style={styles.viewMore}>Ver Galeria</Text>
                        </TouchableOpacity>
                    </View>
                    <View style={styles.compareRow}>
                        <View style={styles.comparePhoto}>
                            <View style={styles.photoPlaceholder}><Camera size={32} color="#94A3B8" /></View>
                            <Text style={styles.photoLabel}>Início</Text>
                        </View>
                        <View style={styles.comparePhoto}>
                            <View style={styles.photoPlaceholder}><Camera size={32} color="#94A3B8" /></View>
                            <Text style={styles.photoLabel}>Hoje</Text>
                        </View>
                    </View>
                </View>

            </ScrollView>
        </SafeAreaView>
    );
};

export default NativeEvolution;

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FAF7F2' },
    scroll: { padding: 24, paddingBottom: 100 },
    header: { marginBottom: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: Platform.OS === 'android' ? 20 : 0 },
    title: { fontSize: 24, fontWeight: 'bold', color: '#0F172A' },
    tabContainer: { flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: 12, padding: 4 },
    tab: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
    tabActive: { backgroundColor: '#fff', elevation: 2 },
    tabText: { fontSize: 10, fontWeight: 'bold', color: '#64748B' },
    tabTextActive: { color: '#14B8A6' },

    chartCard: { backgroundColor: '#fff', borderRadius: 32, padding: 12, marginBottom: 24, borderWidth: 1, borderColor: '#F1F5F9', elevation: 2 },

    grid: { flexDirection: 'row', gap: 16, marginBottom: 32 },
    statCard: { flex: 1, backgroundColor: '#fff', padding: 20, borderRadius: 24, borderWidth: 1, borderColor: '#F1F5F9' },
    iconBox: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
    statLabel: { fontSize: 10, fontWeight: 'bold', color: '#94A3B8', textTransform: 'uppercase', marginBottom: 4 },
    statValue: { fontSize: 22, fontWeight: 'bold', color: '#0F172A' },

    compareSection: { marginTop: 8 },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#0F172A' },
    viewMore: { fontSize: 12, color: '#14B8A6', fontWeight: 'bold' },
    compareRow: { flexDirection: 'row', gap: 12 },
    comparePhoto: { flex: 1, alignItems: 'center' },
    photoPlaceholder: { width: '100%', aspectRatio: 3/4, backgroundColor: '#F1F5F9', borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
    photoLabel: { marginTop: 8, fontSize: 12, fontWeight: 'bold', color: '#64748B' }
});
