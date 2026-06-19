import React, { useState, useRef } from 'react';
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
    Modal, 
    TextInput,
    LayoutAnimation
} from 'react-native';
import { 
    Calendar as CalendarIcon, 
    ChevronLeft, 
    ChevronRight, 
    Image as ImageIcon, 
    Scale, 
    BookOpen, 
    Droplet, 
    Activity, 
    X, 
    Plus 
} from 'lucide-react-native';
import { Button } from './NativeUI';

const { width } = Dimensions.get('window');

const NativeCalendar = ({ user, setUser }) => {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(null);

    const [isFullscreenPhoto, setIsFullscreenPhoto] = useState(false);
    const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

    const [showAddMemoryModal, setShowAddMemoryModal] = useState(false);
    const [modalMemoryNote, setModalMemoryNote] = useState('');
    const [modalSelectedDate, setModalSelectedDate] = useState(new Date());
    const [showMonthPicker, setShowMonthPicker] = useState(false);

    const scrollContainerRef = useRef(null);
    const [scrollOffset, setScrollOffset] = useState(0);

    const prevMonth = () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
    };

    const nextMonth = () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
    };

    const getDaysInMonth = (date) => {
        return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    };

    const getFirstDayOfMonth = (date) => {
        return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    };

    const daysInMonth = getDaysInMonth(currentMonth);
    const firstDay = getFirstDayOfMonth(currentMonth);
    const monthName = currentMonth.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });

    const getSafeDateKey = (date) => {
        if (!date) return '';
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    };

    const getDayData = (date) => {
        const dateKey = getSafeDateKey(date);
        const intake = user.dailyIntakeHistory?.[dateKey] || { water: 0, protein: 0 };
        const weightEntry = user.measurements?.find(m => m.date.startsWith(dateKey));
        const sideEffects = user.sideEffectsLogs?.find(l => l.date.startsWith(dateKey));
        const dose = user.doseHistory?.find(d => d.date.startsWith(dateKey));

        return {
            ...intake,
            weight: weightEntry?.weight,
            hasSymptoms: sideEffects?.symptoms?.length > 0,
            hasDose: !!dose,
            foodNoise: sideEffects?.foodNoise,
            note: sideEffects?.note
        };
    };

    const handleSaveMemory = () => {
        if (!modalMemoryNote.trim()) return;

        const newLog = {
            date: modalSelectedDate.toISOString(),
            foodNoise: 0, 
            symptoms: [],
            note: modalMemoryNote,
            isMemoryOnly: true
        };

        const updatedUser = {
            ...user,
            sideEffectsLogs: [newLog, ...(user.sideEffectsLogs || [])]
        };

        setUser(updatedUser);
        setModalMemoryNote('');
        setShowAddMemoryModal(false);
    };

    const generateDateRange = () => {
        const dates = [];
        const baseDate = selectedDate || new Date();
        for (let i = -7; i <= 7; i++) {
            const d = new Date(baseDate);
            d.setDate(d.getDate() + i);
            dates.push(d);
        }
        return dates;
    };

    const scrollDates = (direction) => {
        if (scrollContainerRef.current) {
            const nextOffset = direction === 'left' ? Math.max(0, scrollOffset - 120) : scrollOffset + 120;
            setScrollOffset(nextOffset);
            scrollContainerRef.current.scrollTo({ x: nextOffset, animated: true });
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                {/* Unified Main Calendar Card (Everything enclosed in a single white card) */}
                <View style={styles.mainCalendarCard}>
                    {/* Header Row */}
                    <View style={styles.headerTitleRow}>
                        <View style={styles.iconBox}><CalendarIcon size={24} color="#3B82F6" /></View>
                        <View>
                            <Text style={styles.title}>Seu Calendário</Text>
                            <Text style={styles.subtitle}>Jornada Mounjoy</Text>
                        </View>
                    </View>

                    {/* Photo & Weight Section */}
                    <View style={styles.photoWeightSection}>
                        {/* Gallery (2/3 width) */}
                        <View style={{ flex: 2, minWidth: 0 }}>
                            <View style={styles.sectionHeaderRow}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                    <ImageIcon size={12} color="#94A3B8" />
                                    <Text style={styles.sectionHeaderTitle}>Galeria</Text>
                                </View>
                                <View style={styles.galleryCountBadge}>
                                    <Text style={styles.galleryCountText}>{user.photos?.length || 0}</Text>
                                </View>
                            </View>

                            {user.photos && user.photos.length > 0 ? (
                                <View style={{ borderRadius: 16, overflow: 'hidden' }}>
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.galleryStrip}>
                                        {[...user.photos].reverse().map((photo, idx) => (
                                            <TouchableOpacity
                                                key={idx}
                                                onPress={() => {
                                                    setCurrentPhotoIndex(user.photos.length - 1 - idx);
                                                    setIsFullscreenPhoto(true);
                                                }}
                                                style={styles.galleryThumb}
                                            >
                                                <Image source={{ uri: typeof photo === 'string' ? photo : photo.url }} style={styles.galleryThumbImg} />
                                                <View style={styles.galleryThumbDate}>
                                                    <Text style={styles.galleryThumbDateText}>
                                                        {new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' }).format(new Date(photo.date || new Date())).replace('/', '-')}
                                                    </Text>
                                                </View>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                </View>
                            ) : (
                                <View style={styles.emptyGalleryBox}>
                                    <ImageIcon size={16} color="#CBD5E1" style={{ marginBottom: 4 }} />
                                    <Text style={styles.emptyGalleryText}>Sem fotos</Text>
                                </View>
                            )}
                        </View>

                        {/* Metrics Snapshot (1/3 width) */}
                        <View style={styles.metricsSnapshotBox}>
                            <Text style={styles.metricsSnapshotLabel}>Status do Dia</Text>
                            <Text style={styles.metricsSnapshotWeight}>
                                {selectedDate ? (getDayData(selectedDate).weight || '--') : (user.currentWeight || '--')}
                                <Text style={styles.metricsSnapshotWeightUnit}>kg</Text>
                            </Text>

                            <View style={styles.metricsIntakeSummary}>
                                <View style={styles.metricsIntakeRow}>
                                    <Text style={styles.waterValueText}>
                                        {selectedDate ? (getDayData(selectedDate).water?.toFixed(1) || '0.0') : '0.0'}L
                                    </Text>
                                    <Droplet size={10} color="#3B82F6" />
                                </View>
                                <View style={styles.metricsIntakeRow}>
                                    <Text style={styles.proteinValueText}>
                                        {selectedDate ? (getDayData(selectedDate).protein || '0') : '0'}g
                                    </Text>
                                    <Activity size={10} color="#F97316" />
                                </View>
                            </View>

                            <View style={styles.daySummaryBadge}>
                                <Text style={styles.daySummaryBadgeText}>
                                    {selectedDate ? `Dia ${selectedDate.getDate()}` : 'Resumo'}
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Calendar Widget */}
                    <View style={styles.calendarWidgetSection}>
                        <View style={styles.calendarHeader}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                                <Scale size={12} color="#94A3B8" />
                                <Text style={styles.calendarLabel}>Frequência de Pesagens</Text>
                            </View>
                            <View style={styles.monthNavRow}>
                                <TouchableOpacity onPress={prevMonth} style={styles.monthNavBtn}>
                                    <ChevronLeft size={16} color="#64748B" />
                                </TouchableOpacity>
                                <Text style={styles.monthNameText}>{monthName}</Text>
                                <TouchableOpacity onPress={nextMonth} style={styles.monthNavBtn}>
                                    <ChevronRight size={16} color="#64748B" />
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View style={styles.calendarWeekdaysGrid}>
                            {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => (
                                <Text key={i} style={styles.weekdayLabel}>{d}</Text>
                            ))}
                        </View>

                        <View style={styles.calendarDaysGrid}>
                            {[...Array(firstDay)].map((_, i) => (
                                <View key={`empty-${i}`} style={styles.dayCellEmpty} />
                            ))}
                            {[...Array(daysInMonth)].map((_, i) => {
                                const day = i + 1;
                                const dayDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
                                const dayData = getDayData(dayDate);
                                const hasLoggedWeight = !!dayData.weight;
                                const isSelected = selectedDate && selectedDate.toDateString() === dayDate.toDateString();
                                const isToday = day === new Date().getDate() && currentMonth.getMonth() === new Date().getMonth() && currentMonth.getFullYear() === new Date().getFullYear();

                                return (
                                    <TouchableOpacity
                                        key={day}
                                        onPress={() => {
                                            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                                            setSelectedDate(prev => prev && prev.getTime() === dayDate.getTime() ? null : dayDate);
                                        }}
                                        style={[
                                            styles.dayCell,
                                            isSelected 
                                                ? styles.dayCellSelected 
                                                : isToday 
                                                    ? styles.dayCellToday 
                                                    : hasLoggedWeight 
                                                        ? styles.dayCellLoggedWeight 
                                                        : styles.dayCellNormal
                                        ]}
                                    >
                                        <Text style={[
                                            styles.dayCellText,
                                            isSelected ? styles.dayCellTextSelected : (isToday ? styles.dayCellTextToday : (hasLoggedWeight ? styles.dayCellTextLoggedWeight : styles.dayCellTextNormal))
                                        ]}>
                                            {day}
                                        </Text>
                                        <View style={styles.dayCellDotRow}>
                                            {dayData.hasDose && <View style={styles.blueDot} />}
                                            {dayData.hasSymptoms && <View style={styles.redDot} />}
                                            {hasLoggedWeight && <View style={[styles.weightDot, isSelected && { backgroundColor: '#FFFFFF' }]} />}
                                        </View>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>

                    {/* Expanded Day Details Section */}
                    {selectedDate && (
                        <View style={styles.dayDetailsSection}>
                            <TouchableOpacity 
                                onPress={() => {
                                    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                                    setSelectedDate(null);
                                }} 
                                style={styles.closeDetailsBtn}
                            >
                                <X size={16} color="#94A3B8" />
                            </TouchableOpacity>
                            
                            <View style={{ marginBottom: 16 }}>
                                <Text style={styles.detailsDayTitle}>
                                    {new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).format(selectedDate)}
                                </Text>
                                <Text style={styles.detailsDaySub}>Resumo do Dia</Text>
                            </View>

                            <View style={styles.detailsGrid}>
                                <View style={styles.detailsGridRow}>
                                    <View style={styles.detailsItemBox}>
                                        <Text style={styles.detailsItemLabel}><Scale size={12} color="#94A3B8" /> Peso</Text>
                                        <Text style={styles.detailsItemValue}>
                                            {getDayData(selectedDate).weight ? `${getDayData(selectedDate).weight} kg` : "--"}
                                        </Text>
                                    </View>
                                    <View style={[styles.detailsItemBox, { backgroundColor: '#EFF6FF', borderColor: '#DBEAFE' }]}>
                                        <Text style={[styles.detailsItemLabel, { color: '#3B82F6' }]}><Droplet size={12} color="#3B82F6" /> Hidratação</Text>
                                        <Text style={[styles.detailsItemValue, { color: '#1E3A8A' }]}>
                                            {getDayData(selectedDate).water > 0 ? `${getDayData(selectedDate).water} L` : "--"}
                                        </Text>
                                    </View>
                                </View>

                                <View style={styles.detailsGridRow}>
                                    <View style={[styles.detailsItemBox, { backgroundColor: '#FFF7ED', borderColor: '#FFEDD5' }]}>
                                        <Text style={[styles.detailsItemLabel, { color: '#F97316' }]}><Activity size={12} color="#F97316" /> Proteína</Text>
                                        <Text style={[styles.detailsItemValue, { color: '#7C2D12' }]}>
                                            {getDayData(selectedDate).protein > 0 ? `${getDayData(selectedDate).protein} g` : "--"}
                                        </Text>
                                    </View>
                                    <View style={[
                                        styles.detailsItemBox,
                                        getDayData(selectedDate).foodNoise !== undefined 
                                            ? (getDayData(selectedDate).foodNoise <= 3 
                                                ? { backgroundColor: '#FFF7ED', borderColor: '#FFEDD5' } 
                                                : getDayData(selectedDate).foodNoise <= 7 
                                                    ? { backgroundColor: '#FEF3C7', borderColor: '#FDE68A' } 
                                                    : { backgroundColor: '#FEF2F2', borderColor: '#FEE2E2' })
                                            : { backgroundColor: '#F8FAFC', borderColor: '#F1F5F9' }
                                    ]}>
                                        <Text style={[
                                            styles.detailsItemLabel,
                                            getDayData(selectedDate).foodNoise !== undefined 
                                                ? (getDayData(selectedDate).foodNoise <= 3 
                                                    ? { color: '#EA580C' } 
                                                    : getDayData(selectedDate).foodNoise <= 7 
                                                        ? { color: '#D97706' } 
                                                        : { color: '#EF4444' })
                                                : { color: '#94A3B8' }
                                        ]}>
                                            <Activity size={12} color={getDayData(selectedDate).foodNoise !== undefined ? (getDayData(selectedDate).foodNoise <= 3 ? '#EA580C' : getDayData(selectedDate).foodNoise <= 7 ? '#D97706' : '#EF4444') : '#94A3B8'} /> Food Noise
                                        </Text>
                                        <Text style={[
                                            styles.detailsItemValue,
                                            getDayData(selectedDate).foodNoise !== undefined 
                                                ? (getDayData(selectedDate).foodNoise <= 3 
                                                    ? { color: '#7C2D12' } 
                                                    : getDayData(selectedDate).foodNoise <= 7 
                                                        ? { color: '#78350F' } 
                                                        : { color: '#7F1D1D' })
                                                : { color: '#1E293B' }
                                        ]}>
                                            {getDayData(selectedDate).foodNoise !== undefined ? `${getDayData(selectedDate).foodNoise}/10` : "--"}
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        </View>
                    )}
                </View>

                {/* Wellness Records Section */}
                <View style={styles.wellnessCard}>
                    <View style={styles.wellnessHeaderRow}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <BookOpen size={18} color="#64748B" />
                            <Text style={styles.wellnessTitle}>Registros de Bem-estar</Text>
                        </View>
                        <TouchableOpacity
                            onPress={() => {
                                setModalSelectedDate(selectedDate || new Date());
                                setShowAddMemoryModal(true);
                            }}
                            style={styles.addMemoryBtn}
                        >
                            <Plus size={20} color="#FFFFFF" strokeWidth={3} />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.recordsList}>
                        {(() => {
                            const logsToShow = selectedDate
                                ? (user.sideEffectsLogs || []).filter(l => l.date.startsWith(getSafeDateKey(selectedDate)))
                                : (user.sideEffectsLogs || []).slice(0, 10);

                            if (logsToShow.length > 0) {
                                return logsToShow.map((log, idx) => (
                                    <View key={idx} style={styles.recordItem}>
                                        <View style={styles.recordHeaderRow}>
                                            <View style={{ flex: 1, minWidth: 0 }}>
                                                <Text style={styles.recordDateText}>
                                                    {new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(log.date))}
                                                </Text>
                                                {log.foodNoise !== undefined && (
                                                    <View style={styles.recordFoodNoiseRow}>
                                                        <View style={[
                                                            styles.foodNoiseIndicatorDot,
                                                            { backgroundColor: log.foodNoise <= 3 ? '#3B82F6' : log.foodNoise <= 7 ? '#F59E0B' : '#EF4444' }
                                                        ]} />
                                                        <Text style={styles.recordFoodNoiseText}>Food Noise: {log.foodNoise}/10</Text>
                                                    </View>
                                                )}
                                            </View>

                                            <View style={{ alignItems: 'flex-end', flex: 1.5, gap: 4 }}>
                                                {log.symptoms?.length > 0 && (
                                                    <View style={{ flexDirection: 'row', gap: 4, marginBottom: 4 }}>
                                                        {log.symptoms.map(s => {
                                                            const emoji = { nausea: '🤢', vomito: '🤮', fadiga: '🥱', azia: '🔥', constipação: '🧱' }[s] || '🤒';
                                                            return <Text key={s} style={{ fontSize: 14 }}>{emoji}</Text>;
                                                        })}
                                                    </View>
                                                )}
                                                {log.note && (
                                                    <Text style={styles.recordNoteText} numberOfLines={3}>
                                                        {log.note}
                                                    </Text>
                                                )}
                                            </View>
                                        </View>

                                        {log.trigger && (
                                            <View style={styles.recordTriggerBadge}>
                                                <Text style={styles.recordTriggerText}>Gatilho: {log.trigger}</Text>
                                            </View>
                                        )}
                                    </View>
                                ));
                            } else {
                                return (
                                    <View style={styles.emptyRecordsBox}>
                                        <BookOpen size={32} color="#CBD5E1" style={{ marginBottom: 8 }} />
                                        <Text style={styles.emptyRecordsText}>
                                            {selectedDate ? 'Nenhum registro neste dia' : 'Nenhum registro encontrado'}
                                        </Text>
                                    </View>
                                );
                            }
                        })()}
                    </View>
                </View>
            </ScrollView>

            {/* Modal: Adicionar Memória */}
            <Modal visible={showAddMemoryModal} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>
                                {showMonthPicker ? "Escolher Data" : "Nova Memória"}
                            </Text>
                            <TouchableOpacity onPress={() => {
                                setShowAddMemoryModal(false);
                                setShowMonthPicker(false);
                            }}>
                                <Text style={styles.modalCloseText}>Fechar</Text>
                            </TouchableOpacity>
                        </View>

                        {!showMonthPicker ? (
                            <>
                                {/* Horizontal Date Selector + Month Picker Trigger */}
                                <View style={styles.modalDateSelectorContainer}>
                                    {/* Left Arrow */}
                                    <TouchableOpacity 
                                        onPress={() => scrollDates('left')}
                                        style={styles.modalArrowBtn}
                                    >
                                        <ChevronLeft size={16} color="#64748B" />
                                    </TouchableOpacity>

                                    <ScrollView 
                                        ref={scrollContainerRef}
                                        horizontal 
                                        showsHorizontalScrollIndicator={false} 
                                        contentContainerStyle={styles.modalDatesStrip}
                                        style={{ flex: 1 }}
                                        onScroll={(e) => setScrollOffset(e.nativeEvent.contentOffset.x)}
                                        scrollEventThrottle={16}
                                    >
                                        {generateDateRange().map((date, idx) => {
                                            const isSelected = modalSelectedDate.toDateString() === date.toDateString();
                                            return (
                                                <TouchableOpacity
                                                    key={idx}
                                                    onPress={() => setModalSelectedDate(date)}
                                                    style={[
                                                        styles.modalDateCard,
                                                        isSelected && styles.modalDateCardSelected
                                                    ]}
                                                >
                                                    <Text style={[styles.modalDateCardDayLabel, isSelected && { color: '#FFFFFF' }]}>
                                                        {new Intl.DateTimeFormat('pt-BR', { weekday: 'short' }).format(date).replace('.', '').toUpperCase()}
                                                    </Text>
                                                    <Text style={[styles.modalDateCardDayVal, isSelected && { color: '#FFFFFF' }]}>
                                                        {date.getDate()}
                                                    </Text>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </ScrollView>

                                    {/* Right Arrow */}
                                    <TouchableOpacity 
                                        onPress={() => scrollDates('right')}
                                        style={styles.modalArrowBtn}
                                    >
                                        <ChevronRight size={16} color="#64748B" />
                                    </TouchableOpacity>

                                    {/* Month Picker Trigger (Calendar Icon) */}
                                    <TouchableOpacity 
                                        onPress={() => setShowMonthPicker(true)}
                                        style={styles.modalMonthPickerTrigger}
                                    >
                                        <CalendarIcon size={18} color="#3B82F6" />
                                    </TouchableOpacity>
                                </View>

                                <View style={{ marginBottom: 20 }}>
                                    <Text style={styles.inputLabel}>O que você está pensando?</Text>
                                    <TextInput
                                        style={styles.modalTextArea}
                                        value={modalMemoryNote}
                                        onChangeText={setModalMemoryNote}
                                        placeholder="Escreva aqui sua memória..."
                                        multiline
                                        numberOfLines={4}
                                    />
                                </View>

                                <Button onClick={handleSaveMemory} style={{ width: '100%', marginBottom: 12 }}>
                                    Salvar Memória
                                </Button>
                            </>
                        ) : (
                            <View style={{ gap: 16 }}>
                                <View style={styles.modalMonthPickerCard}>
                                    <View style={styles.modalMonthPickerMonthHeader}>
                                        <Text style={styles.modalMonthPickerMonthText}>
                                            {modalSelectedDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}
                                        </Text>
                                    </View>
                                    
                                    <View style={styles.modalMonthPickerWeekdays}>
                                        {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map(d => (
                                            <Text key={d} style={styles.modalMonthPickerWeekdayText}>{d}</Text>
                                        ))}
                                    </View>
                                    
                                    <View style={styles.modalMonthPickerDaysGrid}>
                                        {[...Array(new Date(modalSelectedDate.getFullYear(), modalSelectedDate.getMonth(), 1).getDay())].map((_, i) => (
                                            <View key={`emp-${i}`} style={styles.modalMonthPickerDayEmpty} />
                                        ))}
                                        {[...Array(new Date(modalSelectedDate.getFullYear(), modalSelectedDate.getMonth() + 1, 0).getDate())].map((_, i) => {
                                            const day = i + 1;
                                            const date = new Date(modalSelectedDate.getFullYear(), modalSelectedDate.getMonth(), day);
                                            const isSelected = modalSelectedDate.toDateString() === date.toDateString();
                                            return (
                                                <TouchableOpacity
                                                    key={day}
                                                    onPress={() => setModalSelectedDate(date)}
                                                    style={[
                                                        styles.modalMonthPickerDayCell,
                                                        isSelected && styles.modalMonthPickerDayCellSelected
                                                    ]}
                                                >
                                                    <Text style={[
                                                        styles.modalMonthPickerDayText,
                                                        isSelected && { color: '#FFFFFF' }
                                                    ]}>
                                                        {day}
                                                    </Text>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </View>
                                </View>
                                
                                <Button onClick={() => setShowMonthPicker(false)} style={{ width: '100%', marginBottom: 12 }}>
                                    Confirmar Data
                                </Button>
                            </View>
                        )}
                    </View>
                </View>
            </Modal>

            {/* Photo Fullscreen Zoom Modal */}
            <Modal visible={isFullscreenPhoto} transparent animationType="fade">
                <TouchableOpacity 
                    activeOpacity={1}
                    onPress={() => setIsFullscreenPhoto(false)}
                    style={styles.fullscreenOverlay}
                >
                    <View style={styles.fullscreenContent}>
                        {user.photos && user.photos.length > 0 && (
                            <Image 
                                source={{ uri: typeof user.photos[currentPhotoIndex] === 'string' ? user.photos[currentPhotoIndex] : user.photos[currentPhotoIndex].url }} 
                                style={styles.fullscreenImg}
                                resizeMode="contain" 
                            />
                        )}
                        <TouchableOpacity 
                            style={styles.fullscreenCloseBtn}
                            onPress={() => setIsFullscreenPhoto(false)}
                        >
                            <X size={20} color="#FFFFFF" />
                        </TouchableOpacity>

                        <View style={styles.fullscreenFooter}>
                            {user.photos && user.photos.length > 0 && (
                                <Text style={styles.fullscreenDateText}>
                                    {new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(user.photos[currentPhotoIndex].date || new Date()))}
                                </Text>
                            )}

                            <View style={styles.fullscreenNavRow}>
                                {user.photos?.length > 1 ? (
                                    <TouchableOpacity 
                                        onPress={() => setCurrentPhotoIndex(prev => (prev - 1 + user.photos.length) % user.photos.length)}
                                        style={styles.fullscreenNavBtn}
                                    >
                                        <ChevronLeft size={24} color="#FFFFFF" />
                                    </TouchableOpacity>
                                ) : <View style={{ width: 44 }} />}

                                <View style={styles.fullscreenDotsRow}>
                                    {user.photos?.map((_, i) => (
                                        <View key={i} style={[styles.fullscreenDot, currentPhotoIndex === i && styles.fullscreenDotActive]} />
                                    ))}
                                </View>

                                {user.photos?.length > 1 ? (
                                    <TouchableOpacity 
                                        onPress={() => setCurrentPhotoIndex(prev => (prev + 1) % user.photos.length)}
                                        style={styles.fullscreenNavBtn}
                                    >
                                        <ChevronRight size={24} color="#FFFFFF" />
                                    </TouchableOpacity>
                                ) : <View style={{ width: 44 }} />}
                             </View>
                        </View>
                    </View>
                </TouchableOpacity>
            </Modal>
        </SafeAreaView>
    );
};

export default NativeCalendar;

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FAF7F2' },
    scroll: { padding: 20, paddingBottom: 120 },
    mainCalendarCard: { 
        backgroundColor: '#FFFFFF', 
        padding: 24, 
        borderRadius: 32, 
        borderWidth: 1, 
        borderColor: '#F1F5F9', 
        shadowColor: '#000', 
        shadowOffset: { width: 0, height: 4 }, 
        shadowOpacity: 0.02, 
        shadowRadius: 8, 
        elevation: 2, 
        marginBottom: 24,
        marginTop: Platform.OS === 'android' ? 24 : 8,
    },
    headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 24 },
    iconBox: { width: 48, height: 48, backgroundColor: '#EFF6FF', borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
    title: { fontSize: 20, fontFamily: 'Outfit_900Black', color: '#1E293B', letterSpacing: -0.5 },
    subtitle: { fontSize: 11, fontFamily: 'Outfit_700Bold', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.5 },

    // Photo & Weight Section
    photoWeightSection: { flexDirection: 'row', gap: 16, marginBottom: 28, alignItems: 'stretch' },
    sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    sectionHeaderTitle: { fontSize: 10, fontFamily: 'Outfit_900Black', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.5 },
    galleryCountBadge: { backgroundColor: '#FFF5F1', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
    galleryCountText: { fontSize: 9, fontFamily: 'Outfit_900Black', color: '#EA580C' },
    galleryStrip: { gap: 8 },
    galleryThumb: { width: 80, height: 80, borderRadius: 16, backgroundColor: '#F8FAFC', borderWidth: 2, borderColor: '#FFFFFF', overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1 },
    galleryThumbImg: { width: '100%', height: '100%' },
    galleryThumbDate: { position: 'absolute', bottom: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.4)', paddingHorizontal: 4, paddingVertical: 1, borderRadius: 4 },
    galleryThumbDateText: { fontSize: 7, fontFamily: 'Outfit_900Black', color: '#FFFFFF' },
    emptyGalleryBox: { height: 80, borderRadius: 16, borderStyle: 'dashed', borderWidth: 2, borderColor: '#CBD5E1', backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center' },
    emptyGalleryText: { fontSize: 10, fontFamily: 'Outfit_700Bold', color: '#94A3B8' },

    metricsSnapshotBox: { flex: 1, alignItems: 'flex-end', justifyContent: 'center', paddingRight: 4 },
    metricsSnapshotLabel: { fontSize: 9, fontFamily: 'Outfit_900Black', color: '#94A3B8', textTransform: 'uppercase', marginBottom: 2 },
    metricsSnapshotWeight: { fontSize: 28, fontFamily: 'Outfit_900Black', color: '#0F172A', letterSpacing: -0.5 },
    metricsSnapshotWeightUnit: { fontSize: 12, fontFamily: 'Outfit_700Bold', color: '#EA580C', marginLeft: 1 },
    metricsIntakeSummary: { gap: 2, marginVertical: 4, alignItems: 'flex-end' },
    metricsIntakeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    waterValueText: { fontSize: 9, fontFamily: 'Outfit_900Black', color: '#3B82F6' },
    proteinValueText: { fontSize: 9, fontFamily: 'Outfit_900Black', color: '#F97316' },
    daySummaryBadge: { backgroundColor: '#F1F5F9', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, marginTop: 4 },
    daySummaryBadgeText: { fontSize: 8, fontFamily: 'Outfit_900Black', color: '#94A3B8', textTransform: 'uppercase' },

    // Calendar Widget Section
    calendarWidgetSection: { marginBottom: 0 },
    calendarHeader: { flexDirection: 'column', gap: 4, marginBottom: 16 },
    calendarLabel: { fontSize: 10, fontFamily: 'Outfit_900Black', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.5 },
    monthNavRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    monthNavBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
    monthNameText: { fontSize: 14, fontFamily: 'Outfit_700Bold', color: '#0F172A', textTransform: 'capitalize' },
    calendarWeekdaysGrid: { flexDirection: 'row', gap: 8, marginBottom: 8 },
    weekdayLabel: { fontSize: 10, fontFamily: 'Outfit_900Black', color: '#CBD5E1', width: (width - 136) / 7, textAlign: 'center' },
    calendarDaysGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    dayCell: { width: (width - 136) / 7, height: 40, justifyContent: 'center', alignItems: 'center', borderRadius: 12, position: 'relative' },
    dayCellEmpty: { width: (width - 136) / 7, height: 40 },
    dayCellSelected: { backgroundColor: '#1E293B' },
    dayCellToday: { backgroundColor: '#3B82F6' },
    dayCellLoggedWeight: { backgroundColor: '#EFF6FF' },
    dayCellNormal: { backgroundColor: '#F8FAFC' },
    dayCellText: { fontSize: 13, fontFamily: 'Outfit_700Bold' },
    dayCellTextSelected: { color: '#FFFFFF' },
    dayCellTextToday: { color: '#FFFFFF' },
    dayCellTextLoggedWeight: { color: '#1D4ED8', fontFamily: 'Outfit_900Black' },
    dayCellTextNormal: { color: '#64748B' },
    dayCellDotRow: { flexDirection: 'row', gap: 2, position: 'absolute', bottom: 4, justifyContent: 'center', alignItems: 'center' },
    blueDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#3B82F6' },
    redDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#EF4444' },
    weightDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#3B82F6' },

    // Day Details Section
    dayDetailsSection: { paddingTop: 24, borderTopWidth: 1, borderColor: '#F1F5F9', marginTop: 24, position: 'relative' },
    closeDetailsBtn: { position: 'absolute', top: 20, right: 0, width: 28, height: 28, borderRadius: 14, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
    detailsDayTitle: { fontSize: 16, fontFamily: 'Outfit_900Black', color: '#0F172A', textTransform: 'capitalize' },
    detailsDaySub: { fontSize: 10, fontFamily: 'Outfit_700Bold', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.5 },
    detailsGrid: { gap: 10, marginTop: 12 },
    detailsGridRow: { flexDirection: 'row', gap: 10 },
    detailsItemBox: { flex: 1, backgroundColor: '#F8FAFC', padding: 12, borderRadius: 16, borderWidth: 1, borderColor: '#F1F5F9' },
    detailsItemLabel: { fontSize: 8, fontFamily: 'Outfit_900Black', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
    detailsItemValue: { fontSize: 16, fontFamily: 'Outfit_900Black', color: '#1E293B' },

    // Wellness Logs
    wellnessCard: { backgroundColor: '#FFFFFF', padding: 24, borderRadius: 32, borderWidth: 1, borderColor: '#F1F5F9', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.02, shadowRadius: 8, elevation: 2, marginBottom: 24 },
    wellnessHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    wellnessTitle: { fontSize: 14, fontFamily: 'Outfit_900Black', color: '#1E293B' },
    addMemoryBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#3B82F6', justifyContent: 'center', alignItems: 'center', shadowColor: '#3B82F6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 3 },
    recordsList: { gap: 12 },
    recordItem: { backgroundColor: '#F8FAFC', padding: 14, borderRadius: 20, borderWidth: 1, borderColor: '#F1F5F9' },
    recordHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
    recordDateText: { fontSize: 9, fontFamily: 'Outfit_900Black', color: '#94A3B8', textTransform: 'uppercase' },
    recordFoodNoiseRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
    foodNoiseIndicatorDot: { width: 6, height: 6, borderRadius: 3 },
    recordFoodNoiseText: { fontSize: 9, fontFamily: 'Outfit_700Bold', color: '#64748B' },
    recordNoteText: { fontSize: 12, fontFamily: 'Outfit_600SemiBold', color: '#475569', fontStyle: 'italic', lineHeight: 16, textAlign: 'right' },
    recordTriggerBadge: { alignSelf: 'flex-start', backgroundColor: '#FFF7ED', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginTop: 8 },
    recordTriggerText: { fontSize: 8, fontFamily: 'Outfit_900Black', color: '#EA580C', textTransform: 'uppercase' },
    emptyRecordsBox: { paddingVertical: 32, alignItems: 'center', opacity: 0.5 },
    emptyRecordsText: { fontSize: 9, fontFamily: 'Outfit_900Black', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.5 },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 40, borderTopRightRadius: 40, padding: 24, minHeight: 400 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 20, fontFamily: 'Outfit_700Bold', color: '#0F172A' },
    modalCloseText: { color: '#64748B', fontFamily: 'Outfit_700Bold', fontSize: 13, textTransform: 'uppercase' },
    modalDateSelectorContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, gap: 4 },
    modalArrowBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },
    modalDatesStrip: { gap: 8, paddingVertical: 2, paddingHorizontal: 4 },
    modalDateCard: { width: 40, height: 56, borderRadius: 12, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#F1F5F9' },
    modalDateCardSelected: { backgroundColor: '#3B82F6', borderColor: '#3B82F6', transform: [{ scale: 1.05 }] },
    modalDateCardDayLabel: { fontSize: 7, fontFamily: 'Outfit_900Black', color: '#94A3B8' },
    modalDateCardDayVal: { fontSize: 14, fontFamily: 'Outfit_900Black', color: '#334155' },
    modalMonthPickerTrigger: { width: 40, height: 56, borderRadius: 12, backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#DBEAFE', justifyContent: 'center', alignItems: 'center', marginLeft: 4 },
    
    // Month Picker Card
    modalMonthPickerCard: { backgroundColor: '#F8FAFC', borderRadius: 24, padding: 16, borderWidth: 1, borderColor: '#F1F5F9', marginBottom: 8 },
    modalMonthPickerMonthHeader: { marginBottom: 12, alignItems: 'center' },
    modalMonthPickerMonthText: { fontSize: 14, fontFamily: 'Outfit_900Black', color: '#1E293B', textTransform: 'uppercase', letterSpacing: 0.5 },
    modalMonthPickerWeekdays: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 8 },
    modalMonthPickerWeekdayText: { fontSize: 10, fontFamily: 'Outfit_900Black', color: '#CBD5E1', width: 32, textAlign: 'center' },
    modalMonthPickerDaysGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
    modalMonthPickerDayEmpty: { width: (width - 104) / 7, height: 36 },
    modalMonthPickerDayCell: { width: (width - 104) / 7, height: 36, justifyContent: 'center', alignItems: 'center', borderRadius: 10, marginBottom: 4 },
    modalMonthPickerDayCellSelected: { backgroundColor: '#3B82F6' },
    modalMonthPickerDayText: { fontSize: 12, fontFamily: 'Outfit_700Bold', color: '#475569' },

    inputLabel: { fontSize: 10, fontFamily: 'Outfit_900Black', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, marginLeft: 4 },
    modalTextArea: { backgroundColor: '#F8FAFC', borderRadius: 20, padding: 16, fontSize: 13, fontFamily: 'Outfit_600SemiBold', color: '#334155', textAlignVertical: 'top', height: 100, marginBottom: 16 },

    // Fullscreen Overlay
    fullscreenOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' },
    fullscreenContent: { width: '100%', height: '80%', position: 'relative', justifyContent: 'center', alignItems: 'center' },
    fullscreenImg: { width: '90%', height: '90%' },
    fullscreenCloseBtn: { position: 'absolute', top: 16, right: 16, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
    fullscreenFooter: { position: 'absolute', bottom: 16, left: 16, right: 16, alignItems: 'center', gap: 12 },
    fullscreenDateText: { color: '#FFFFFF', fontSize: 11, fontFamily: 'Outfit_900Black', textTransform: 'uppercase', letterSpacing: 1, backgroundColor: 'rgba(255,255,255,0.1)', paddingVertical: 4, paddingHorizontal: 12, borderRadius: 10 },
    fullscreenNavRow: { width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    fullscreenNavBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
    fullscreenDotsRow: { flexDirection: 'row', gap: 6 },
    fullscreenDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.3)' },
    fullscreenDotActive: { width: 16, backgroundColor: '#FFFFFF' }
});
