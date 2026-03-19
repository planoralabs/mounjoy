import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Dimensions } from 'react-native';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Droplet, Activity, Scale, BookOpen } from 'lucide-react-native';

const { width } = Dimensions.get('window');

const NativeCalendar = ({ user, setUser }) => {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(null);

    const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
    const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));

    const getDaysInMonth = (date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    const getFirstDayOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();

    const daysInMonth = getDaysInMonth(currentMonth);
    const firstDay = getFirstDayOfMonth(currentMonth);
    const monthName = currentMonth.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });

    const getDayData = (date) => {
        const dateKey = date.toISOString().split('T')[0];
        const intake = user.dailyIntakeHistory?.[dateKey] || { water: 0, protein: 0 };
        const weightEntry = user.measurements?.find(m => m.date.startsWith(dateKey));
        const dose = user.doseHistory?.find(d => d.date.startsWith(dateKey));

        return {
            ...intake,
            weight: weightEntry?.weight,
            hasDose: !!dose
        };
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scroll}>
                <View style={styles.header}>
                    <View style={styles.headerTitleRow}>
                        <View style={styles.iconBox}><CalendarIcon size={24} color="#6366F1" /></View>
                        <View>
                            <Text style={styles.title}>Seu Calendário</Text>
                            <Text style={styles.subtitle}>Acompanhe sua consistência</Text>
                        </View>
                    </View>
                </View>

                {/* Calendar Widget */}
                <View style={styles.calendarCard}>
                    <View style={styles.calendarHeader}>
                        <TouchableOpacity onPress={prevMonth} style={styles.navBtn}>
                            <ChevronLeft size={20} color="#64748B" />
                        </TouchableOpacity>
                        <Text style={styles.monthName}>{monthName}</Text>
                        <TouchableOpacity onPress={nextMonth} style={styles.navBtn}>
                            <ChevronRight size={20} color="#64748B" />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.daysGridHeader}>
                        {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map(d => (
                            <Text key={d} style={styles.dayLabel}>{d}</Text>
                        ))}
                    </View>

                    <View style={styles.daysGrid}>
                        {[...Array(firstDay)].map((_, i) => (
                            <View key={`empty-${i}`} style={styles.dayCellEmpty} />
                        ))}
                        {[...Array(daysInMonth)].map((_, i) => {
                            const day = i + 1;
                            const dayDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
                            const data = getDayData(dayDate);
                            const isSelected = selectedDate?.getTime() === dayDate.getTime();
                            const isToday = day === new Date().getDate() && currentMonth.getMonth() === new Date().getMonth();

                            return (
                                <TouchableOpacity 
                                    key={day} 
                                    onPress={() => setSelectedDate(isSelected ? null : dayDate)}
                                    style={[
                                        styles.dayCell, 
                                        isSelected && styles.dayCellSelected,
                                        isToday && !isSelected && styles.dayCellToday
                                    ]}
                                >
                                    <Text style={[styles.dayText, isSelected && styles.dayTextSelected]}>{day}</Text>
                                    <View style={styles.dotRow}>
                                        {data.hasDose && <View style={[styles.dot, { backgroundColor: '#3B82F6' }]} />}
                                        {data.weight && <View style={[styles.dot, { backgroundColor: '#14B8A6' }]} />}
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>

                {/* Day Details */}
                {selectedDate && (
                    <View style={styles.detailsCard}>
                        <Text style={styles.detailsTitle}>
                            {selectedDate.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                        </Text>
                        <View style={styles.detailsGrid}>
                            <View style={styles.detailItem}>
                                <Scale size={16} color="#94A3B8" />
                                <Text style={styles.detailLabel}>Peso</Text>
                                <Text style={styles.detailValue}>{getDayData(selectedDate).weight || '--'} kg</Text>
                            </View>
                            <View style={styles.detailItem}>
                                <Droplet size={16} color="#3B82F6" />
                                <Text style={styles.detailLabel}>Água</Text>
                                <Text style={styles.detailValue}>{getDayData(selectedDate).water || 0} L</Text>
                            </View>
                            <View style={styles.detailItem}>
                                <Activity size={16} color="#F59E0B" />
                                <Text style={styles.detailLabel}>Proteína</Text>
                                <Text style={styles.detailValue}>{getDayData(selectedDate).protein || 0} g</Text>
                            </View>
                            <View style={styles.detailItem}>
                                <BookOpen size={16} color="#64748B" />
                                <Text style={styles.detailLabel}>Status</Text>
                                <Text style={styles.detailValue}>{getDayData(selectedDate).hasDose ? 'Dose OK' : '--'}</Text>
                            </View>
                        </View>
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
};

export default NativeCalendar;

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FAF7F2' },
    scroll: { padding: 24, paddingBottom: 100 },
    header: { marginBottom: 24 },
    headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    iconBox: { width: 48, height: 48, backgroundColor: '#EEF2FF', borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
    title: { fontSize: 22, fontWeight: 'bold', color: '#0F172A' },
    subtitle: { fontSize: 13, color: '#64748B' },
    
    calendarCard: { backgroundColor: '#fff', padding: 20, borderRadius: 32, borderWidth: 1, borderColor: '#F1F5F9', elevation: 2 },
    calendarHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    monthName: { fontSize: 16, fontWeight: 'bold', color: '#0F172A', textTransform: 'capitalize' },
    navBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center' },
    
    daysGridHeader: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 10 },
    dayLabel: { fontSize: 10, fontWeight: '900', color: '#94A3B8', width: 40, textAlign: 'center' },
    
    daysGrid: { flexDirection: 'row', flexWrap: 'wrap' },
    dayCell: { width: (width - 88) / 7, height: 44, justifyContent: 'center', alignItems: 'center', borderRadius: 12, marginBottom: 4 },
    dayCellEmpty: { width: (width - 88) / 7, height: 44 },
    dayCellSelected: { backgroundColor: '#0F172A' },
    dayCellToday: { backgroundColor: '#F1F5F9' },
    dayText: { fontSize: 14, fontWeight: 'bold', color: '#475569' },
    dayTextSelected: { color: '#FFFFFF' },
    dotRow: { flexDirection: 'row', gap: 2, marginTop: 2, position: 'absolute', bottom: 4 },
    dot: { width: 4, height: 4, borderRadius: 2 },

    detailsCard: { marginTop: 24, padding: 24, backgroundColor: '#fff', borderRadius: 32, borderWidth: 1, borderColor: '#F1F5F9' },
    detailsTitle: { fontSize: 18, fontWeight: 'bold', color: '#0F172A', marginBottom: 20, textTransform: 'capitalize' },
    detailsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    detailItem: { width: '47%', padding: 16, backgroundColor: '#F8FAFC', borderRadius: 20, gap: 4 },
    detailLabel: { fontSize: 10, fontWeight: 'bold', color: '#94A3B8', textTransform: 'uppercase' },
    detailValue: { fontSize: 16, fontWeight: 'bold', color: '#0F172A' }
});
