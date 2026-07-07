import React, { useState, useRef, useEffect } from 'react';
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
    LayoutAnimation,
    PanResponder,
    Animated
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
    Plus,
    Camera,
    Maximize2,
    Share2,
    ZoomIn,
    ZoomOut,
    RefreshCw,
    Columns2,
    Rows2
} from 'lucide-react-native';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { Button, Modal as NativeModal } from './NativeUI';

const AdjustableGridImage = ({ uri, dateStr, adjustment, onAdjustmentChange, onActiveStart, onActiveEnd }) => {
    const [containerSize, setContainerSize] = useState(null);
    const [imageRatio, setImageRatio] = useState(1);

    useEffect(() => {
        if (uri) {
            Image.getSize(uri, (w, h) => {
                if (w && h) {
                    setImageRatio(w / h);
                }
            }, (err) => console.log('Error getting image size:', err));
        }
    }, [uri]);

    const coverScale = React.useMemo(() => {
        if (!containerSize || !imageRatio) return 1;
        const containerRatio = containerSize.width / containerSize.height;
        if (containerRatio > imageRatio) {
            return containerRatio / imageRatio;
        } else {
            return imageRatio / containerRatio;
        }
    }, [containerSize, imageRatio]);

    const activeScale = adjustment?.scale || 1;
    const visualScale = coverScale * activeScale;

    const pan = useRef(new Animated.ValueXY({ x: adjustment?.x || 0, y: adjustment?.y || 0 })).current;
    const scale = useRef(new Animated.Value(visualScale)).current;
    
    const valRef = useRef({ x: adjustment?.x || 0, y: adjustment?.y || 0, scale: activeScale });
    
    useEffect(() => {
        valRef.current = {
            x: adjustment?.x || 0,
            y: adjustment?.y || 0,
            scale: activeScale
        };
        pan.setValue({ x: adjustment?.x || 0, y: adjustment?.y || 0 });
        scale.setValue(visualScale);
    }, [adjustment, coverScale]);

    const startDist = useRef(0);
    const startScale = useRef(1);
    const isPinching = useRef(false);

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderGrant: (evt, gestureState) => {
                if (onActiveStart) onActiveStart();
                isPinching.current = false; // Reset on new gesture session
                const { touches } = evt.nativeEvent;
                if (touches.length === 2) {
                    isPinching.current = true;
                    const dx = touches[0].pageX - touches[1].pageX;
                    const dy = touches[0].pageY - touches[1].pageY;
                    startDist.current = Math.sqrt(dx * dx + dy * dy);
                    startScale.current = valRef.current.scale;
                } else {
                    startDist.current = 0;
                    pan.setOffset({
                        x: valRef.current.x,
                        y: valRef.current.y
                    });
                    pan.setValue({ x: 0, y: 0 });
                }
            },
            onPanResponderMove: (evt, gestureState) => {
                const { touches } = evt.nativeEvent;
                if (touches.length === 2) {
                    isPinching.current = true;
                    const dx = touches[0].pageX - touches[1].pageX;
                    const dy = touches[0].pageY - touches[1].pageY;
                    const currentDist = Math.sqrt(dx * dx + dy * dy);
                    
                    if (startDist.current === 0) {
                        startDist.current = currentDist;
                        startScale.current = valRef.current.scale;
                    } else {
                        // Apply sensitivity multiplier to make pinch-zoom responsive to small gestures
                        const delta = (currentDist / startDist.current) - 1;
                        const sensitivity = 1.8;
                        const newScale = Math.max(0.3, Math.min(6, startScale.current * (1 + delta * sensitivity)));
                        scale.setValue(coverScale * newScale);
                        valRef.current.scale = newScale;
                    }
                } else if (touches.length === 1) {
                    // Only move the photo if the user is NOT currently in a pinch gesture session
                    if (!isPinching.current) {
                        startDist.current = 0;
                        pan.setValue({ x: gestureState.dx, y: gestureState.dy });
                    }
                }
            },
            onPanResponderRelease: (evt, gestureState) => {
                if (onActiveEnd) onActiveEnd();
                startDist.current = 0;
                pan.flattenOffset();
                const newX = pan.x._value;
                const newY = pan.y._value;
                onAdjustmentChange(dateStr, {
                    x: newX,
                    y: newY,
                    scale: valRef.current.scale
                });
                isPinching.current = false;
            },
            onPanResponderTerminate: () => {
                if (onActiveEnd) onActiveEnd();
                startDist.current = 0;
                isPinching.current = false;
            }
        })
    ).current;

    return (
        <View 
            style={{ flex: 1, overflow: 'hidden', position: 'relative', backgroundColor: '#090D16' }} 
            onLayout={(e) => {
                const { width, height } = e.nativeEvent.layout;
                setContainerSize({ width, height });
            }}
            {...panResponder.panHandlers}
        >
            <Animated.Image 
                source={{ uri }} 
                style={{
                    width: '100%',
                    height: '100%',
                    transform: [
                        { translateX: pan.x },
                        { translateY: pan.y },
                        { scale: scale }
                    ]
                }} 
                resizeMode="contain"
            />
        </View>
    );
};

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

    // Visual Comparator States
    const [selectedDates, setSelectedDates] = useState([]);
    const [showFullComparison, setShowFullComparison] = useState(false);
    const [photoAdjustments, setPhotoAdjustments] = useState({});
    const [isSharing, setIsSharing] = useState(false);
    const [activePhoto, setActivePhoto] = useState(null);
    const [twoPhotosLayout, setTwoPhotosLayout] = useState('side-by-side'); // 'side-by-side' or 'stacked'

    const gridRef = useRef();

    const handleAdjustmentChange = (dateStr, adj) => {
        setPhotoAdjustments(prev => ({
            ...prev,
            [dateStr]: adj
        }));
    };

    const handleShare = async () => {
        if (isSharing) return;
        setIsSharing(true);
        try {
            const uri = await captureRef(gridRef, {
                format: 'png',
                quality: 0.95,
            });
            await Sharing.shareAsync(uri, {
                mimeType: 'image/png',
                dialogTitle: 'Compartilhar Evolução',
                UTI: 'public.png'
            });
        } catch (error) {
            console.error('Error sharing image: ', error);
        } finally {
            setIsSharing(false);
        }
    };

    const hasEnoughData = user.measurements && user.measurements.length >= 3;

    // Weight logs setup
    const baseWeightLogs = React.useMemo(() => {
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

    useEffect(() => {
        // Sync selectedDates with baseWeightLogs to remove stale or demo dates
        setSelectedDates(prev => prev.filter(dateStr => baseWeightLogs.some(log => log.date === dateStr)));
    }, [baseWeightLogs]);

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

    const sortedSelectedDates = React.useMemo(() => {
        return [...selectedDates].sort((a, b) => new Date(a) - new Date(b));
    }, [selectedDates]);

    const totalDiff = React.useMemo(() => {
        if (sortedSelectedDates.length < 2) return null;
        const l1 = baseWeightLogs.find(l => l.date === sortedSelectedDates[0]);
        const l2 = baseWeightLogs.find(l => l.date === sortedSelectedDates[sortedSelectedDates.length - 1]);
        if (!l1 || !l2) return null;
        return (l2.weight - l1.weight).toFixed(1);
    }, [sortedSelectedDates, baseWeightLogs]);

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

                        {(() => {
                            const totalSlots = [];
                            for (let i = 0; i < firstDay; i++) {
                                totalSlots.push({ type: 'empty', id: `empty-${i}` });
                            }
                            for (let i = 1; i <= daysInMonth; i++) {
                                totalSlots.push({ type: 'day', day: i });
                            }
                            while (totalSlots.length % 7 !== 0) {
                                totalSlots.push({ type: 'empty', id: `empty-end-${totalSlots.length}` });
                            }
                            const weeks = [];
                            for (let i = 0; i < totalSlots.length; i += 7) {
                                weeks.push(totalSlots.slice(i, i + 7));
                            }
                            return weeks.map((week, weekIdx) => (
                                <View key={weekIdx} style={styles.calendarWeekRow}>
                                    {week.map((slot) => {
                                        if (slot.type === 'empty') {
                                            return <View key={slot.id} style={styles.dayCellEmpty} />;
                                        }
                                        const day = slot.day;
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
                            ));
                        })()}
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
                                <Scale size={24} color="#EA580C" />
                            </View>
                            <Text style={styles.emptyCompareText}>Escolha registros acima{"\n"}para iniciar o comparativo</Text>
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
            <NativeModal 
                visible={showAddMemoryModal} 
                onClose={() => {
                    setShowAddMemoryModal(false);
                    setShowMonthPicker(false);
                }} 
                title={showMonthPicker ? "Escolher Data" : "Nova Memória"}
            >
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
                            
                            {(() => {
                                const modalFirstDay = new Date(modalSelectedDate.getFullYear(), modalSelectedDate.getMonth(), 1).getDay();
                                const modalDaysInMonth = new Date(modalSelectedDate.getFullYear(), modalSelectedDate.getMonth() + 1, 0).getDate();
                                const modalSlots = [];
                                for (let i = 0; i < modalFirstDay; i++) {
                                    modalSlots.push({ type: 'empty', id: `empty-${i}` });
                                }
                                for (let i = 1; i <= modalDaysInMonth; i++) {
                                    modalSlots.push({ type: 'day', day: i });
                                }
                                while (modalSlots.length % 7 !== 0) {
                                    modalSlots.push({ type: 'empty', id: `empty-end-${modalSlots.length}` });
                                }
                                const modalWeeks = [];
                                for (let i = 0; i < modalSlots.length; i += 7) {
                                    modalWeeks.push(modalSlots.slice(i, i + 7));
                                }
                                return modalWeeks.map((week, weekIdx) => (
                                    <View key={weekIdx} style={styles.modalMonthPickerWeekRow}>
                                        {week.map((slot) => {
                                            if (slot.type === 'empty') {
                                                return <View key={slot.id} style={styles.modalMonthPickerDayEmpty} />;
                                            }
                                            const day = slot.day;
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
                                ));
                            })()}
                        </View>
                        
                        <Button onClick={() => setShowMonthPicker(false)} style={{ width: '100%', marginBottom: 12 }}>
                            Confirmar Data
                        </Button>
                    </View>
                )}
            </NativeModal>

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
                        
                        <View style={{ flexDirection: 'row', gap: 10 }}>
                            {!isSharing && sortedSelectedDates.length === 2 && (
                                <TouchableOpacity 
                                    onPress={() => setTwoPhotosLayout(prev => prev === 'side-by-side' ? 'stacked' : 'side-by-side')}
                                    style={styles.modalCloseBtn}
                                >
                                    {twoPhotosLayout === 'side-by-side' ? (
                                        <Rows2 size={20} color="#FFFFFF" />
                                    ) : (
                                        <Columns2 size={20} color="#FFFFFF" />
                                    )}
                                </TouchableOpacity>
                            )}

                            <TouchableOpacity 
                                onPress={handleShare}
                                style={styles.modalCloseBtn}
                                disabled={isSharing}
                            >
                                {isSharing ? (
                                    <Activity size={20} color="#EA580C" />
                                ) : (
                                    <Share2 size={20} color="#FFFFFF" />
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
 
                    {/* Photos Grid */}
                    <View style={styles.modalGridContainer}>
                        <View 
                            ref={gridRef} 
                            collapsable={false}
                            style={[
                                styles.modalGrid,
                                (sortedSelectedDates.length === 3 || (sortedSelectedDates.length === 2 && twoPhotosLayout === 'stacked')) 
                                    ? { flexDirection: 'column' } 
                                    : { flexDirection: 'row', flexWrap: 'wrap' }
                            ]}
                        >
                            {sortedSelectedDates.map((dateStr, idx) => {
                                const log = baseWeightLogs.find(l => l.date === dateStr);
                                const photo = findPhotoForDate(dateStr);
                                
                                return (
                                    <View 
                                        key={idx} 
                                        style={[
                                            styles.modalPhotoBox,
                                            sortedSelectedDates.length === 2 
                                                ? (twoPhotosLayout === 'stacked' ? { width: '100%', height: '50%' } : { width: '50%', height: '100%' })
                                                : sortedSelectedDates.length === 3 
                                                    ? { height: '33.33%', width: '100%' } 
                                                    : { width: '50%', height: '50%' }
                                        ]}
                                    >
                                        {photo ? (
                                            <AdjustableGridImage 
                                                uri={photo.url} 
                                                dateStr={dateStr}
                                                adjustment={photoAdjustments[dateStr]}
                                                onAdjustmentChange={handleAdjustmentChange}
                                                onActiveStart={() => setActivePhoto(dateStr)}
                                                onActiveEnd={() => setActivePhoto(null)}
                                            />
                                        ) : (
                                            <View style={styles.modalImagePlaceholder}>
                                                <Camera size={32} color="#475569" />
                                            </View>
                                        )}
                                        
                                        {!isSharing && activePhoto === dateStr && (
                                            <View 
                                                style={{
                                                    position: 'absolute',
                                                    top: 0,
                                                    left: 0,
                                                    right: 0,
                                                    bottom: 0,
                                                    borderWidth: 2.5,
                                                    borderColor: 'rgba(234, 88, 12, 0.6)',
                                                    zIndex: 50,
                                                    pointerEvents: 'none'
                                                }}
                                            />
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

                            {/* Centered overall loss badge */}
                            {totalDiff !== null && (
                                <View style={[
                                    styles.modalTotalDiffBadge,
                                    sortedSelectedDates.length === 3 ? { top: '66.66%' } : { top: '50%' }
                                ]}>
                                    <Text style={styles.modalTotalDiffText}>{totalDiff > 0 ? '+' : ''}{totalDiff}kg</Text>
                                </View>
                            )}
                        </View>
                    </View>
                </View>
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
    calendarWeekdaysGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    weekdayLabel: { fontSize: 10, fontFamily: 'Outfit_900Black', color: '#CBD5E1', width: '12.5%', textAlign: 'center' },
    calendarWeekRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    dayCell: { width: '12.5%', height: 40, justifyContent: 'center', alignItems: 'center', borderRadius: 12, position: 'relative' },
    dayCellEmpty: { width: '12.5%', height: 40 },
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
    modalMonthPickerWeekdays: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    modalMonthPickerWeekdayText: { fontSize: 10, fontFamily: 'Outfit_900Black', color: '#CBD5E1', width: '12.5%', textAlign: 'center' },
    modalMonthPickerWeekRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
    modalMonthPickerDayEmpty: { width: '12.5%', height: 36 },
    modalMonthPickerDayCell: { width: '12.5%', height: 36, justifyContent: 'center', alignItems: 'center', borderRadius: 10 },
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
    fullscreenDotActive: { width: 16, backgroundColor: '#FFFFFF' },

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

    // Modal styles for fullscreen comparison
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
        bottom: 12,
        alignSelf: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        paddingVertical: 6,
        paddingHorizontal: 16,
        borderRadius: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.15)',
    },
    modalPhotoWeight: {
        color: '#FFFFFF',
        fontSize: 14,
        fontFamily: 'Outfit_900Black',
    },
    modalPhotoDate: {
        color: 'rgba(255, 255, 255, 0.5)',
        fontSize: 8,
        fontFamily: 'Outfit_700Bold',
        textTransform: 'uppercase',
        marginTop: 1,
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
        elevation: 10,
        shadowColor: '#000',
        shadowOpacity: 0.3,
        shadowRadius: 10,
        zIndex: 100,
    },
    modalTotalDiffText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontFamily: 'Outfit_900Black',
    },
    floatingControls: {
        position: 'absolute',
        top: 10,
        right: 10,
        flexDirection: 'row',
        gap: 6,
        zIndex: 50,
    },
    miniBtn: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    formatSelectorRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 12,
        backgroundColor: '#0F172A',
        gap: 12,
    },
    formatChip: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    formatChipActive: {
        backgroundColor: '#EA580C',
        borderColor: '#EA580C',
    },
    formatChipText: {
        color: 'rgba(255, 255, 255, 0.6)',
        fontSize: 11,
        fontFamily: 'Outfit_700Bold',
    },
    formatChipTextActive: {
        color: '#FFFFFF',
        fontFamily: 'Outfit_900Black',
    },
    modalGridCapture: {
        alignSelf: 'center',
        justifyContent: 'center',
        backgroundColor: '#090D16',
        overflow: 'hidden',
    }
});
