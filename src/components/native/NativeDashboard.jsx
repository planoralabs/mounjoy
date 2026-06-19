import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    ScrollView, 
    TouchableOpacity, 
    SafeAreaView, 
    Platform, 
    Image, 
    Dimensions, 
    TouchableWithoutFeedback, 
    LayoutAnimation, 
    Animated,
    TextInput,
    Modal as RNModal
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Button, Modal, Input } from './NativeUI';
import NativeBodySelector from './NativeBodySelector';
import { MOCK_MEDICATIONS } from '../../constants/medications';
import { ReminderService } from '../../services/ReminderService';
import { suggestNextInjection, getSiteById } from '../../services/InjectionService';
import Svg, { Path, Defs, LinearGradient, Stop, ClipPath, Rect } from 'react-native-svg';
import { 
    ChevronLeft, 
    ChevronRight, 
    Plus, 
    Info, 
    TrendingUp, 
    Zap, 
    Droplet, 
    Activity, 
    Camera,
    Trash2,
    X,
    AlertCircle
} from 'lucide-react-native';

const { width } = Dimensions.get('window');

const waterImg = require('../../../assets/water.png');
const proteinImg = require('../../../assets/protein.png');
const fiberImg = require('../../../assets/fiber.png');
const scalerImg = require('../../../assets/scaler.png');
const mascotAchieveImg = require('../../../assets/mascotachieve.png');
const mascotFeedImg = require('../../../assets/mascotfeed.png');
const mascotFoodNoiseImg = require('../../../assets/mascotfoodnoise.png');
const mascotRememberImg = require('../../../assets/remember.png');
const mascotStretchImg = require('../../../assets/mascotstretch1.png');
const mascotStrongImg = require('../../../assets/mascotstrong.png');
const mascotHydratedImg = require('../../../assets/mascothydrated.png');
const mascotZenImg = require('../../../assets/mascotzen.png');
const mascotMirrorImg = require('../../../assets/mascotmirror.png');

const TIPS = [
    "Beba pelo menos 2.5L de água para ajudar os rins a processar a quebra de gordura.",
    "Priorize proteínas em todas as refeições para evitar a perda de massa muscular.",
    "Se sentir náusea, experimente comer porções menores e evitar frituras.",
    "A constipação é comum; aumente a ingestão de fibras e considere um suplemento.",
    "Mantenha um sono regular; o descanso é fundamental para o equilíbrio hormonal."
];

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
        {/* Hollow/Carved Background */}
        <Path 
            d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" 
            fill="url(#carvedGradient)"
        />
        {/* Glowing Liquid Fill */}
        <Path 
            d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" 
            fill="url(#liquidGlow)"
            clipPath="url(#dropClip)"
        />
        {/* Surface Shine/Depth */}
        <Path 
            d="M12 4c.5 1 1 2 2 4M9 12a3 3 0 0 0 6 0" 
            stroke="white" 
            strokeOpacity={0.15} 
            fill="none" 
            strokeLinecap="round"
        />
    </Svg>
);

const NativeDashboard = ({ user, setUser, setActiveTab }) => {
    const [simulatedDays, setSimulatedDays] = useState(0);
    const [showWeightModal, setShowWeightModal] = useState(false);
    const [newWeight, setNewWeight] = useState('');
    const [isApplied, setIsApplied] = useState(false);
    const [btnPressed, setBtnPressed] = useState(false);
    const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
    const [isFullscreenPhoto, setIsFullscreenPhoto] = useState(false);
    const [showDoseModal, setShowDoseModal] = useState(false);
    const [selectedSiteId, setSelectedSiteId] = useState(null);

    const siteOptions = [
        { id: 'arm-right', name: 'Braço Direito' },
        { id: 'arm-left', name: 'Braço Esquerdo' },
        { id: 'abdomen-left', name: 'Abdômen Esquerdo' },
        { id: 'abdomen-right', name: 'Abdômen Direito' },
        { id: 'thigh-right', name: 'Coxa Direita' },
        { id: 'thigh-left', name: 'Coxa Esquerda' }
    ];

    useEffect(() => {
        if (user.photos && user.photos.length > 0) {
            setCurrentPhotoIndex(user.photos.length - 1);
        }
    }, [user.photos]);

    const deletePhoto = () => {
        if (!user.photos || user.photos.length === 0) return;
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        const updatedPhotos = user.photos.filter((_, index) => index !== currentPhotoIndex);
        setUser({ ...user, photos: updatedPhotos });

        if (updatedPhotos.length === 0) {
            setIsFullscreenPhoto(false);
            setCurrentPhotoIndex(0);
        } else if (currentPhotoIndex >= updatedPhotos.length) {
            setCurrentPhotoIndex(updatedPhotos.length - 1);
        }
    };

    const getPhotoWeight = (photoDate) => {
        if (!photoDate || !user.measurements || user.measurements.length === 0) return null;
        const targetDate = new Date(photoDate);
        if (isNaN(targetDate.getTime())) return null;

        // Find closest measurement
        let closest = user.measurements[0];
        let minDiff = Math.abs(targetDate - new Date(closest.date));

        user.measurements.forEach(m => {
            const diff = Math.abs(targetDate - new Date(m.date));
            if (diff < minDiff) {
                minDiff = diff;
                closest = m;
            }
        });

        if (minDiff > 3 * 24 * 60 * 60 * 1000) return null;
        return closest.weight;
    };

    const handlePhotoPick = async () => {
        const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (permissionResult.granted === false) {
            alert("Você precisa permitir acesso à galeria de fotos para adicionar imagens!");
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [3, 4],
            quality: 0.7,
            base64: true,
        });

        if (!result.canceled && result.assets && result.assets[0].base64) {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            const base64Url = `data:image/webp;base64,${result.assets[0].base64}`;
            const newPhoto = { url: base64Url, date: new Date().toISOString() };
            const updatedPhotos = [...(user.photos || []), newPhoto];
            setUser({
                ...user,
                photos: updatedPhotos
            });
            setCurrentPhotoIndex(updatedPhotos.length - 1);
        }
    };

    const [animatingAsset, setAnimatingAsset] = useState(null);
    const [showHydratedMascot, setShowHydratedMascot] = useState(false);
    const [showProteinMascot, setShowProteinMascot] = useState(false);
    const [showFiberMascot, setShowFiberMascot] = useState(false);

    // Floating animation for carousel icons
    const floatAnim = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(floatAnim, {
                    toValue: 6,
                    duration: 1800,
                    useNativeDriver: true,
                }),
                Animated.timing(floatAnim, {
                    toValue: 0,
                    duration: 1800,
                    useNativeDriver: true,
                })
            ])
        ).start();
    }, [floatAnim]);

    const medication = MOCK_MEDICATIONS.find(m => m.id === user.medicationId);

    const getSimulatedDate = () => {
        const d = new Date();
        d.setDate(d.getDate() + simulatedDays);
        return d;
    };

    const todayStr = getSimulatedDate().toISOString().split('T')[0];
    const dailyData = (user.dailyIntakeHistory && user.dailyIntakeHistory[todayStr]) || { water: 0, protein: 0, fiber: 0 };

    const waterGoal = user.settings?.waterGoal || 2.5;
    const proteinGoal = user.settings?.proteinGoal || 100;
    const fiberGoal = user.settings?.fiberGoal || 25;

    const waterPercentage = Math.min(100, ((dailyData.water || 0) / waterGoal) * 100);
    const proteinPercentage = Math.min(100, ((dailyData.protein || 0) / proteinGoal) * 100);
    const fiberPercentage = Math.min(100, ((dailyData.fiber || 0) / fiberGoal) * 100);

    const isWaterComplete = waterPercentage >= 100;
    const isProteinComplete = proteinPercentage >= 100;
    const isFiberComplete = fiberPercentage >= 100;

    const reminder = ReminderService.calculateNextDose(user.doseHistory || [], 7, getSimulatedDate());
    const timeRemaining = ReminderService.formatTimeRemaining(reminder.daysRemaining, reminder.status);

    const cycleInfo = useMemo(() => {
        const lastDose = user.doseHistory?.[0];
        if (!lastDose) return { message: "Nenhuma dose registrada ainda.", level: 0, color: "#64748B", daysSinceDose: 7 };

        const lastDoseDate = new Date(lastDose.date);
        const todayDate = getSimulatedDate();
        const daysSinceDose = Math.floor((todayDate - lastDoseDate) / (1000 * 60 * 60 * 24));

        const drugLevel = Math.exp(-0.138 * daysSinceDose) * 100;

        let message = "";
        let color = "#EA580C";
        if (daysSinceDose <= 2) {
            message = "Fase de Pico: Priorize refeições leves.";
            color = "#EA580C";
        } else if (daysSinceDose >= 6) {
            message = "Nível Baixo: O Food Noise pode aumentar. Mantenha o foco!";
            color = "#F97316";
        } else {
            message = "Nível Estável: Aproveite para focar em treinos de força.";
            color = "#2563EB";
        }

        return { message, level: drugLevel, color, daysSinceDose };
    }, [user.doseHistory, simulatedDays]);

    const fillLevel = isApplied ? 100 : Math.max(8, Math.min(100, ((7 - cycleInfo.daysSinceDose) / 7) * 100));

    const injectionSuggestion = useMemo(() => {
        return suggestNextInjection(user.doseHistory || []);
    }, [user.doseHistory]);

    const updateIntake = (type, amount) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        
        const currentAmount = dailyData[type] || 0;
        const newAmount = Math.max(0, currentAmount + amount);

        const updatedHistory = {
            ...(user.dailyIntakeHistory || {}),
            [todayStr]: {
                ...((user.dailyIntakeHistory && user.dailyIntakeHistory[todayStr]) || {}),
                [type]: parseFloat(newAmount.toFixed(1))
            }
        };

        setUser({
            ...user,
            dailyIntakeHistory: updatedHistory
        });

        if (amount > 0) {
            setAnimatingAsset(type);
            if (type === 'water') {
                setShowHydratedMascot(true);
                setTimeout(() => {
                    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                    setShowHydratedMascot(false);
                }, 2000);
            } else if (type === 'protein') {
                setShowProteinMascot(true);
                setTimeout(() => {
                    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                    setShowProteinMascot(false);
                }, 2000);
            } else if (type === 'fiber') {
                setShowFiberMascot(true);
                setTimeout(() => {
                    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                    setShowFiberMascot(false);
                }, 2000);
            }
            setTimeout(() => setAnimatingAsset(null), 300);
        }
    };

    const updateWeight = () => {
        if (!newWeight) return;
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        const weightValue = parseFloat(newWeight);
        const now = new Date().toISOString();

        setUser({
            ...user,
            currentWeight: weightValue,
            history: [...(user.history || []), weightValue],
            lastWeightDate: now,
            measurements: [
                ...(user.measurements || []),
                { date: now, weight: weightValue }
            ]
        });
        setShowWeightModal(false);
        setNewWeight('');
    };

    const handleConfirmInjection = () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        const isOral = medication?.route === 'oral';
        const recordDate = getSimulatedDate();
        
        const siteId = selectedSiteId || injectionSuggestion.id;
        const site = getSiteById(siteId);

        const newRecord = {
            date: recordDate.toISOString(),
            dose: user.currentDose,
            medication: user.medicationId,
            siteId: isOral ? null : siteId,
            area: isOral ? 'Oral' : site?.area || 'Abdômen',
            side: isOral ? 'N/A' : site?.side || 'E'
        };

        setUser({
            ...user,
            doseHistory: [newRecord, ...(user.doseHistory || [])]
        });

        setShowDoseModal(false);
        setSelectedSiteId(null);
        setIsApplied(true);
        setTimeout(() => {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setIsApplied(false);
        }, 4000);
    };

    const startWeight = user.history?.[0] || user.currentWeight || 80.0;
    const progress5Percent = Math.min(100, Math.max(0, ((startWeight - user.currentWeight) / (startWeight * 0.05)) * 100));
    const progress10Percent = Math.min(100, Math.max(0, ((startWeight - user.currentWeight) / (startWeight * 0.10)) * 100));

    const dailyTip = useMemo(() => {
        const now = getSimulatedDate();
        const start = new Date(now.getFullYear(), 0, 0);
        const diff = now - start;
        const oneDay = 1000 * 60 * 60 * 24;
        const day = Math.floor(diff / oneDay);
        return TIPS[day % TIPS.length];
    }, [simulatedDays]);

    const weekNumber = useMemo(() => {
        if (!user.startDate) return 1;
        const diff = Math.abs(new Date() - new Date(user.startDate));
        return Math.ceil(diff / (1000 * 60 * 60 * 24 * 7)) || 1;
    }, [user.startDate]);

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                {/* Header Section */}
                <View style={styles.header}>
                    <View>
                        <Text style={styles.greeting}>Oi, {user.name || 'Usuário'}! 🎈</Text>
                        <Text style={styles.subtitle}>Você está arrasando na {weekNumber}ª semana!</Text>
                    </View>
                    <TouchableOpacity 
                        style={styles.avatar}
                        onPress={() => setActiveTab && setActiveTab('profile')}
                    >
                        <Text style={styles.avatarText}>{user.name?.charAt(0).toUpperCase() || '?'}</Text>
                    </TouchableOpacity>
                </View>

                {/* Banners */}
                {cycleInfo.daysSinceDose >= 5 ? (
                    <View style={styles.foodNoiseBanner}>
                        <View style={styles.bannerBackgroundMascotWrapper}>
                            <Image source={mascotStrongImg} style={styles.bannerMascotBg} resizeMode="contain" />
                        </View>
                        <View style={styles.bannerContent}>
                            <View style={styles.bannerHeaderRow}>
                                <View style={styles.bannerIconBox}>
                                    <Image source={mascotFoodNoiseImg} style={styles.bannerIconMascot} resizeMode="contain" />
                                </View>
                                <View style={styles.bannerTextContainer}>
                                    <Text style={styles.bannerTagline}>Cuidado com o Food Noise 🎈</Text>
                                    <Text style={styles.bannerTitle}>Mantenha o foco!</Text>
                                    <Text style={styles.bannerDesc}>Sua dose está baixando. Priorize as proteínas agora!</Text>
                                </View>
                            </View>
                        </View>
                    </View>
                ) : cycleInfo.daysSinceDose === 0 ? (
                    <View style={styles.doseBanner}>
                        <Image source={mascotZenImg} style={styles.doseBannerMascot} resizeMode="contain" />
                        <View style={styles.doseBannerTextContainer}>
                            <Text style={styles.doseBannerTagline}>Dia de Brilhar 💉</Text>
                            <Text style={styles.doseBannerTitle}>Dia da sua dose!</Text>
                            <Text style={styles.doseBannerDesc}>Prepare tudo com calma e respire fundo. Você está indo bem!</Text>
                        </View>
                    </View>
                ) : null}

                {/* Debug Time Simulator Controls */}
                <View style={styles.simulatorControls}>
                    <TouchableOpacity 
                        onPress={() => setSimulatedDays(prev => prev - 1)}
                        style={styles.simulatorBtn}
                    >
                        <ChevronLeft size={20} color="#94A3B8" />
                    </TouchableOpacity>
                    <View style={styles.simulatorInfo}>
                        <Text style={styles.simulatorLabel}>Simulador</Text>
                        <Text style={styles.simulatorVal}>
                            {simulatedDays === 0 ? "Tempo Real" : `${simulatedDays > 0 ? '+' : ''}${simulatedDays} Dias`}
                        </Text>
                    </View>
                    <TouchableOpacity 
                        onPress={() => setSimulatedDays(prev => prev + 1)}
                        style={styles.simulatorBtn}
                    >
                        <ChevronRight size={20} color="#94A3B8" />
                    </TouchableOpacity>
                </View>

                {/* Grid row: Photo Evolution & Weight Info */}
                <View style={styles.gridRow}>
                    {/* Left Column: Photo Evolution Card */}
                    <View style={[styles.columnCard, styles.photoGalleryFrame]}>
                        {user.photos && user.photos.length > 0 ? (
                            <View style={styles.mockPhotoContainer}>
                                <TouchableOpacity 
                                    activeOpacity={0.9} 
                                    onPress={() => setIsFullscreenPhoto(true)}
                                    style={StyleSheet.absoluteFill}
                                >
                                    <Image 
                                        source={{ uri: typeof user.photos[currentPhotoIndex] === 'string' ? user.photos[currentPhotoIndex] : user.photos[currentPhotoIndex].url }} 
                                        style={styles.mockPhoto} 
                                        resizeMode="cover" 
                                    />
                                </TouchableOpacity>
                                <View style={styles.photoHeaderOverlay}>
                                    <Text style={styles.photoHeaderTag}>Sua Evolução</Text>
                                    <TouchableOpacity 
                                        onPress={handlePhotoPick}
                                        style={styles.photoAddBtnSmall}
                                    >
                                        <Plus size={14} color="#64748B" />
                                    </TouchableOpacity>
                                </View>
                                
                                <View style={styles.photoFooterOverlay}>
                                    <View style={styles.photoBadgeRow}>
                                        <Text style={styles.photoBadgeText}>
                                            {new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' }).format(new Date(user.photos[currentPhotoIndex].date || new Date())).replace('/', '-')}
                                        </Text>
                                        {getPhotoWeight(user.photos[currentPhotoIndex].date) && (
                                            <Text style={styles.photoBadgeText}>
                                                {getPhotoWeight(user.photos[currentPhotoIndex].date)}kg
                                            </Text>
                                        )}
                                    </View>

                                    <View style={styles.photoNavRow}>
                                        {user.photos.length > 1 ? (
                                            <TouchableOpacity 
                                                onPress={() => setCurrentPhotoIndex(prev => (prev - 1 + user.photos.length) % user.photos.length)}
                                                style={styles.photoNavBtnSmall}
                                            >
                                                <ChevronLeft size={16} color="#FFFFFF" />
                                            </TouchableOpacity>
                                        ) : <View style={{ width: 24 }} />}

                                        <View style={styles.photoDotsRow}>
                                            {user.photos.map((_, i) => (
                                                <View 
                                                    key={i} 
                                                    style={[
                                                        styles.photoDot,
                                                        currentPhotoIndex === i ? styles.photoDotActive : null
                                                    ]} 
                                                />
                                            ))}
                                        </View>

                                        {user.photos.length > 1 ? (
                                            <TouchableOpacity 
                                                onPress={() => setCurrentPhotoIndex(prev => (prev + 1) % user.photos.length)}
                                                style={styles.photoNavBtnSmall}
                                            >
                                                <ChevronRight size={16} color="#FFFFFF" />
                                            </TouchableOpacity>
                                        ) : <View style={{ width: 24 }} />}
                                    </View>
                                </View>
                            </View>
                        ) : (
                            <TouchableOpacity 
                                activeOpacity={0.8}
                                onPress={handlePhotoPick}
                                style={styles.photoGalleryPlaceholder}
                            >
                                <View style={styles.cameraIconBox}>
                                    <Camera size={24} color="#94A3B8" />
                                </View>
                                <Text style={styles.photoGalleryLabel}>Sua Evolução</Text>
                                <Text style={styles.photoGallerySubLabel}>Adicionar foto</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Right Column: Weight Progress Card */}
                    <View style={[styles.columnCard, styles.weightProgressCard]}>
                        <View style={styles.weightMascotBgContainer}>
                            <Image source={mascotAchieveImg} style={styles.weightMascotBg} resizeMode="contain" />
                        </View>
                        
                        <View style={styles.weightHeaderRow}>
                            <Text style={styles.weightCardLabel}>Progresso</Text>
                            <TouchableOpacity 
                                onPress={() => {
                                    setNewWeight(user.currentWeight.toString());
                                    setShowWeightModal(true);
                                }}
                                style={styles.weightPlusBtn}
                            >
                                <Plus size={16} color="#FFFFFF" />
                            </TouchableOpacity>
                        </View>
                        
                        <View style={styles.weightMetricContainer}>
                            <Text style={styles.weightBigValue}>{user.currentWeight}</Text>
                            <Text style={styles.weightMetricSuffix}>kg</Text>
                        </View>

                        <View style={styles.weightGaugesContainer}>
                            {/* Protein gauge */}
                            <View style={styles.weightGauge}>
                                <View style={styles.weightGaugeHeader}>
                                    <Text style={styles.weightGaugeLabel}>Proteína</Text>
                                    <Text style={styles.weightGaugeValue}>{dailyData.protein}/{proteinGoal}g</Text>
                                </View>
                                <View style={styles.weightGaugeTrack}>
                                    <View style={[styles.weightGaugeFill, { backgroundColor: '#F97316', width: `${proteinPercentage}%` }]} />
                                </View>
                            </View>

                            {/* Water gauge */}
                            <View style={styles.weightGauge}>
                                <View style={styles.weightGaugeHeader}>
                                    <Text style={styles.weightGaugeLabel}>Água</Text>
                                    <Text style={styles.weightGaugeValue}>{dailyData.water}/{waterGoal}L</Text>
                                </View>
                                <View style={styles.weightGaugeTrack}>
                                    <View style={[styles.weightGaugeFill, { backgroundColor: '#3B82F6', width: `${waterPercentage}%` }]} />
                                </View>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Próxima Aplicação Widget */}
                {medication?.route === 'injectable' && (
                    <View style={styles.injectionCard}>
                        <View style={styles.injectionMascotBgContainer}>
                            <Image source={mascotStrongImg} style={styles.injectionMascotBg} resizeMode="contain" />
                        </View>
                        
                        <View style={styles.injectionRow}>
                            <View style={styles.injectionInfoCol}>
                                <View style={styles.injectionHeaderRow}>
                                    <Text style={styles.injectionLabel}>
                                        {isApplied ? 'Finalizado' : 'Próxima Aplicação'}
                                    </Text>
                                    <View style={styles.weekBadge}>
                                        <Text style={styles.weekBadgeText}>Semana {weekNumber}</Text>
                                    </View>
                                </View>
                                <Text style={styles.injectionBigTitle}>
                                    {isApplied ? 'Sucesso! 🎈' : (timeRemaining === 'Hoje!' ? "Hoje!" : `Em ${timeRemaining}`)}
                                </Text>
                            </View>

                            {/* physical 3D button */}
                            <TouchableWithoutFeedback
                                onPressIn={() => setBtnPressed(true)}
                                onPressOut={() => setBtnPressed(false)}
                                onPress={() => setShowDoseModal(true)}
                            >
                                <View style={styles.physicalBtnContainer}>
                                    <View style={styles.physicalBtnBase} />
                                    <View style={[
                                        styles.physicalBtnFace,
                                        btnPressed && styles.physicalBtnFacePressed
                                    ]}>
                                        <View style={{ width: 40, height: 40 }}>
                                            <SvgDroplet fillLevel={fillLevel} />
                                        </View>
                                        <Text style={styles.physicalBtnText}>
                                            {isApplied ? 'Sucesso!' : 'Injetar'}
                                        </Text>
                                    </View>
                                </View>
                            </TouchableWithoutFeedback>
                        </View>

                        <View style={styles.medDetailsBox}>
                            <View>
                                <Text style={styles.medDetailsLabel}>Seu Protocolo</Text>
                                <Text style={styles.medDetailsName}>{medication.name}</Text>
                            </View>
                            <View style={styles.dosePill}>
                                <Text style={styles.dosePillText}>{user.currentDose}</Text>
                            </View>
                        </View>

                        {!isApplied && (
                            <View style={styles.suggestedRow}>
                                <TouchableOpacity 
                                    style={styles.suggestedSiteCard}
                                    onPress={() => setShowDoseModal(true)}
                                    activeOpacity={0.8}
                                >
                                    <Text style={styles.suggestedSiteLabel}>Local Sugerido</Text>
                                    <View style={styles.suggestedSiteValueRow}>
                                        <Text style={styles.suggestedSiteIcon}>📍</Text>
                                        <Text style={styles.suggestedSiteText}>{injectionSuggestion.label}</Text>
                                    </View>
                                </TouchableOpacity>

                                <View style={styles.cycleTipCard}>
                                    <Text style={styles.cycleTipLabel}>Dica de Ciclo</Text>
                                    <Text style={styles.cycleTipText}>{cycleInfo.message}</Text>
                                </View>
                            </View>
                        )}
                    </View>
                )}

                {/* Daily wellness Snap Carousel */}
                <View style={styles.carouselHeader}>
                    <Text style={styles.carouselTitle}>Meta do Dia</Text>
                    <View style={styles.rateBadge}>
                        <Text style={styles.rateBadgeText}>
                            Taxa: {((startWeight - user.currentWeight) / Math.max(1, weekNumber)).toFixed(2)} kg/sem
                        </Text>
                    </View>
                </View>

                <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false}
                    snapToInterval={width - 80 + 16}
                    decelerationRate="fast"
                    style={styles.carouselScrollView}
                    contentContainerStyle={styles.carouselContainer}
                >
                    {/* ÁGUA Card */}
                    <View style={[
                        styles.carouselCard,
                        isWaterComplete ? { backgroundColor: '#3B82F6', borderColor: '#3B82F6' } : { backgroundColor: '#FFFFFF' }
                    ]}>
                        {showHydratedMascot && (
                            <View style={styles.mascotPopupContainer} pointerEvents="none">
                                <Image source={mascotHydratedImg} style={styles.mascotPopupImage} resizeMode="contain" />
                            </View>
                        )}
                        
                        <View style={styles.cardHeader}>
                            <Text style={[styles.cardTitleText, isWaterComplete && { color: '#FFFFFF' }]}>ÁGUA</Text>
                            <Text style={[styles.cardGoalText, isWaterComplete && { color: 'rgba(255,255,255,0.8)' }]}>{waterGoal} L/Dia</Text>
                        </View>

                        <View style={styles.cardIconWrapper}>
                            <Animated.Image 
                                source={waterImg} 
                                style={[
                                    styles.cardIcon, 
                                    { transform: [{ translateY: floatAnim }] },
                                    animatingAsset === 'water' && { scaleX: 1.25, scaleY: 1.25 }
                                ]} 
                                resizeMode="contain" 
                            />
                        </View>

                        <View style={styles.cardProgressRow}>
                            <Text style={[styles.cardProgressValue, isWaterComplete && { color: '#FFFFFF' }]}>{dailyData.water}</Text>
                            <View style={[styles.cardProgressBarTrack, isWaterComplete ? { backgroundColor: 'rgba(255,255,255,0.2)' } : { backgroundColor: '#EFF6FF' }]}>
                                <View style={[styles.cardProgressBarFill, { backgroundColor: isWaterComplete ? '#FFFFFF' : '#3B82F6', width: `${waterPercentage}%` }]} />
                            </View>
                            <Text style={[styles.cardProgressPct, isWaterComplete ? { color: '#FFFFFF' } : { color: '#3B82F6' }]}>{Math.round(waterPercentage)}%</Text>
                        </View>

                        <View style={styles.cardActionRow}>
                            <TouchableOpacity 
                                onPress={() => updateIntake('water', -0.2)}
                                style={[styles.cardActionBtn, isWaterComplete ? { backgroundColor: '#2563EB', borderColor: '#2563EB' } : { backgroundColor: '#F8FAFC' }]}
                            >
                                <Text style={[styles.cardActionBtnText, isWaterComplete ? { color: '#FFFFFF' } : { color: '#64748B' }]}>−</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                onPress={() => updateIntake('water', 0.2)}
                                style={[styles.cardActionBtn, isWaterComplete ? { backgroundColor: '#FFFFFF' } : { backgroundColor: '#3B82F6' }]}
                            >
                                <Text style={[styles.cardActionBtnText, isWaterComplete ? { color: '#3B82F6' } : { color: '#FFFFFF' }]}>+</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* PROTEÍNA Card */}
                    <View style={[
                        styles.carouselCard,
                        isProteinComplete ? { backgroundColor: '#F97316', borderColor: '#F97316' } : { backgroundColor: '#FFFFFF' }
                    ]}>
                        {showProteinMascot && (
                            <View style={styles.mascotPopupContainer} pointerEvents="none">
                                <Image source={mascotFeedImg} style={styles.mascotPopupImage} resizeMode="contain" />
                            </View>
                        )}
                        
                        <View style={styles.cardHeader}>
                            <Text style={[styles.cardTitleText, isProteinComplete && { color: '#FFFFFF' }]}>PROTEÍNA</Text>
                            <Text style={[styles.cardGoalText, isProteinComplete && { color: 'rgba(255,255,255,0.8)' }]}>{proteinGoal} g/Dia</Text>
                        </View>

                        <View style={styles.cardIconWrapper}>
                            <Animated.Image 
                                source={proteinImg} 
                                style={[
                                    styles.cardIcon, 
                                    { transform: [{ translateY: floatAnim }] },
                                    animatingAsset === 'protein' && { scaleX: 1.25, scaleY: 1.25 }
                                ]} 
                                resizeMode="contain" 
                            />
                        </View>

                        <View style={styles.cardProgressRow}>
                            <Text style={[styles.cardProgressValue, isProteinComplete && { color: '#FFFFFF' }]}>{dailyData.protein}</Text>
                            <View style={[styles.cardProgressBarTrack, isProteinComplete ? { backgroundColor: 'rgba(255,255,255,0.2)' } : { backgroundColor: '#FFF7ED' }]}>
                                <View style={[styles.cardProgressBarFill, { backgroundColor: isProteinComplete ? '#FFFFFF' : '#F97316', width: `${proteinPercentage}%` }]} />
                            </View>
                            <Text style={[styles.cardProgressPct, isProteinComplete ? { color: '#FFFFFF' } : { color: '#EA580C' }]}>{Math.round(proteinPercentage)}%</Text>
                        </View>

                        <View style={styles.cardActionRow}>
                            <TouchableOpacity 
                                onPress={() => updateIntake('protein', -5)}
                                style={[styles.cardActionBtn, isProteinComplete ? { backgroundColor: '#EA580C', borderColor: '#EA580C' } : { backgroundColor: '#F8FAFC' }]}
                            >
                                <Text style={[styles.cardActionBtnText, isProteinComplete ? { color: '#FFFFFF' } : { color: '#64748B' }]}>−</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                onPress={() => updateIntake('protein', 5)}
                                style={[styles.cardActionBtn, isProteinComplete ? { backgroundColor: '#FFFFFF' } : { backgroundColor: '#F97316' }]}
                            >
                                <Text style={[styles.cardActionBtnText, isProteinComplete ? { color: '#F97316' } : { color: '#FFFFFF' }]}>+</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* FIBRA Card */}
                    <View style={[
                        styles.carouselCard,
                        isFiberComplete ? { backgroundColor: '#10B981', borderColor: '#10B981' } : { backgroundColor: '#FFFFFF' }
                    ]}>
                        {showFiberMascot && (
                            <View style={styles.mascotPopupContainer} pointerEvents="none">
                                <Image source={mascotFeedImg} style={styles.mascotPopupImage} resizeMode="contain" />
                            </View>
                        )}
                        
                        <View style={styles.cardHeader}>
                            <Text style={[styles.cardTitleText, isFiberComplete && { color: '#FFFFFF' }]}>FIBRA</Text>
                            <Text style={[styles.cardGoalText, isFiberComplete && { color: 'rgba(255,255,255,0.8)' }]}>{fiberGoal} g/Dia</Text>
                        </View>

                        <View style={styles.cardIconWrapper}>
                            <Animated.Image 
                                source={fiberImg} 
                                style={[
                                    styles.cardIcon, 
                                    { transform: [{ translateY: floatAnim }] },
                                    animatingAsset === 'fiber' && { scaleX: 1.25, scaleY: 1.25 }
                                ]} 
                                resizeMode="contain" 
                            />
                        </View>

                        <View style={styles.cardProgressRow}>
                            <Text style={[styles.cardProgressValue, isFiberComplete && { color: '#FFFFFF' }]}>{dailyData.fiber}</Text>
                            <View style={[styles.cardProgressBarTrack, isFiberComplete ? { backgroundColor: 'rgba(255,255,255,0.2)' } : { backgroundColor: '#ECFDF5' }]}>
                                <View style={[styles.cardProgressBarFill, { backgroundColor: isFiberComplete ? '#FFFFFF' : '#10B981', width: `${fiberPercentage}%` }]} />
                            </View>
                            <Text style={[styles.cardProgressPct, isFiberComplete ? { color: '#FFFFFF' } : { color: '#10B981' }]}>{Math.round(fiberPercentage)}%</Text>
                        </View>

                        <View style={styles.cardActionRow}>
                            <TouchableOpacity 
                                onPress={() => updateIntake('fiber', -5)}
                                style={[styles.cardActionBtn, isFiberComplete ? { backgroundColor: '#059669', borderColor: '#059669' } : { backgroundColor: '#F8FAFC' }]}
                            >
                                <Text style={[styles.cardActionBtnText, isFiberComplete ? { color: '#FFFFFF' } : { color: '#64748B' }]}>−</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                onPress={() => updateIntake('fiber', 5)}
                                style={[styles.cardActionBtn, isFiberComplete ? { backgroundColor: '#FFFFFF' } : { backgroundColor: '#10B981' }]}
                            >
                                <Text style={[styles.cardActionBtnText, isFiberComplete ? { color: '#10B981' } : { color: '#FFFFFF' }]}>+</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </ScrollView>

                {/* Success Milestones Card */}
                <View style={styles.milestonesCard}>
                    <View style={styles.milestonesHeader}>
                        <View style={styles.milestonesIconBox}>
                            <Image source={mascotAchieveImg} style={styles.milestonesIcon} resizeMode="contain" />
                        </View>
                        <Text style={styles.milestonesTitle}>Marcos de Sucesso</Text>
                    </View>
                    
                    <View style={styles.milestoneItem}>
                        <View style={styles.milestoneLabelRow}>
                            <Text style={styles.milestoneName}>Meta 5% Clinicamente Significativa</Text>
                            <Text style={styles.milestoneTarget}>{(startWeight * 0.95).toFixed(1)} kg</Text>
                        </View>
                        <View style={styles.milestoneProgressTrack}>
                            <View style={[styles.milestoneProgressFill, { width: `${progress5Percent}%` }]} />
                        </View>
                    </View>

                    <View style={styles.milestoneItem}>
                        <View style={styles.milestoneLabelRow}>
                            <Text style={styles.milestoneName}>Meta 10% Transformação Metabólica</Text>
                            <Text style={styles.milestoneTarget}>{(startWeight * 0.90).toFixed(1)} kg</Text>
                        </View>
                        <View style={styles.milestoneProgressTrack}>
                            <View style={[styles.milestoneProgressFill, { width: `${progress10Percent}%` }]} />
                        </View>
                    </View>
                </View>

                {/* Daily Tip box */}
                {dailyTip && (
                    <View style={styles.tipCard}>
                        <View style={styles.tipIconBox}>
                            <Info size={20} color="#3B82F6" />
                        </View>
                        <View style={styles.tipContent}>
                            <Text style={styles.tipTitle}>Dica do Dia</Text>
                            <Text style={styles.tipDesc}>{dailyTip}</Text>
                        </View>
                    </View>
                )}
            </ScrollView>

            {/* Modal: Atualizar Peso */}
            <Modal visible={showWeightModal} onClose={() => setShowWeightModal(false)} title="Atualizar Peso">
                <View style={styles.modalWeightStatusCard}>
                    <View style={styles.modalWeightCol}>
                        <Text style={styles.modalWeightBadgeLabel}>Anterior</Text>
                        <Text style={styles.modalWeightBadgeVal}>{user.currentWeight}kg</Text>
                    </View>
                    <Image source={scalerImg} style={styles.modalScalerImg} resizeMode="contain" />
                </View>

                <View style={{ marginBottom: 20 }}>
                    <Input 
                        label="Novo Peso (kg)" 
                        placeholder="Ex: 80.5" 
                        value={newWeight} 
                        onChangeText={setNewWeight}
                        keyboardType="numeric"
                    />
                </View>
                
                <Button onClick={updateWeight} style={{ width: '100%', marginBottom: 12 }}>
                    Confirmar Peso
                </Button>
                <TouchableOpacity onPress={() => setShowWeightModal(false)} style={styles.cancelBtn}>
                    <Text style={styles.cancelBtnText}>Cancelar</Text>
                </TouchableOpacity>
            </Modal>

            {/* Modal: Protocolo de Aplicação (Registrar Dose) */}
            <Modal visible={showDoseModal} onClose={() => setShowDoseModal(false)} title="Protocolo de Aplicação">
                <ScrollView contentContainerStyle={{ paddingBottom: 16 }} showsVerticalScrollIndicator={false}>
                    <View style={styles.modalWeightStatusCard}>
                        <View style={styles.modalWeightCol}>
                            <Text style={styles.modalWeightBadgeLabel}>Medicamento & Dose</Text>
                            <Text style={styles.modalWeightBadgeVal}>
                                {medication?.name} <Text style={{ fontSize: 16, color: '#EA580C', fontFamily: 'Outfit_700Bold' }}>{user.currentDose}</Text>
                            </Text>
                        </View>
                    </View>

                    {/* Anticipation Warning (Reduced Interval) */}
                    {cycleInfo.daysSinceDose !== null && cycleInfo.daysSinceDose < 6 && (
                        <View style={styles.warningBox}>
                            <AlertCircle size={20} color="#EA580C" style={{ marginTop: 2 }} />
                            <View style={{ flex: 1 }}>
                                <Text style={styles.warningTitle}>Intervalo Reduzido</Text>
                                <Text style={styles.warningText}>
                                    Faltam apenas {cycleInfo.daysSinceDose} dias desde sua última dose. Aplicar o medicamento antes do intervalo de 6-7 dias pode aumentar os riscos de efeitos colaterais e sobrecarga. Deseja prosseguir mesmo assim?
                                </Text>
                            </View>
                        </View>
                    )}

                    <Text style={styles.modalSubLabelText}>Selecione o local de hoje</Text>
                    <View style={{ marginVertical: 12, width: '100%' }}>
                        <NativeBodySelector 
                            selectedSiteId={selectedSiteId || injectionSuggestion.id}
                            onSelect={setSelectedSiteId}
                            suggestedSiteId={injectionSuggestion.id}
                        />
                    </View>

                    <View style={styles.tipBox}>
                        <Text style={styles.tipText}>
                            * A rotação dos locais é fundamental para evitar lipodistrofia e garantir a absorção correta do medicamento.
                        </Text>
                    </View>

                    <Button onClick={handleConfirmInjection} style={{ width: '100%', marginTop: 16 }}>
                        Confirmar Aplicação
                    </Button>
                </ScrollView>
            </Modal>

            {/* Fullscreen Photo Zoom Modal */}
            <RNModal visible={isFullscreenPhoto} transparent animationType="fade">
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

                        {/* Top bar with tag & actions */}
                        <View style={styles.fullscreenHeaderModal}>
                            <Text style={styles.fullscreenHeaderTag}>Sua Evolução</Text>
                            <View style={{ flexDirection: 'row', gap: 12 }}>
                                <TouchableOpacity onPress={deletePhoto} style={styles.fullscreenDeleteBtn}>
                                    <Trash2 size={18} color="#FFFFFF" />
                                </TouchableOpacity>
                                <TouchableOpacity onPress={handlePhotoPick} style={styles.fullscreenAddBtn}>
                                    <Plus size={20} color="#64748B" />
                                </TouchableOpacity>
                            </View>
                        </View>

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
            </RNModal>
        </SafeAreaView>
    );
};

export default NativeDashboard;

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FAF7F2' },
    scroll: { padding: 24, paddingBottom: 120 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, marginTop: Platform.OS === 'android' ? 20 : 0 },
    greeting: { fontSize: 24, fontFamily: 'Outfit_900Black', color: '#EA580C' },
    subtitle: { fontSize: 13, fontFamily: 'Outfit_600SemiBold', color: '#EA580C', opacity: 0.8 },
    avatar: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', justifyContent: 'center', alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 3 },
    avatarText: { fontSize: 18, fontFamily: 'Outfit_700Bold', color: '#EA580C' },

    // Food Noise Banner
    foodNoiseBanner: { backgroundColor: '#F97316', borderRadius: 40, padding: 24, shadowColor: '#F97316', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.15, shadowRadius: 15, elevation: 4, position: 'relative', overflow: 'hidden', marginBottom: 20 },
    bannerBackgroundMascotWrapper: { absolute: 'absolute', right: -16, bottom: -16, width: 128, height: 128, position: 'absolute', opacity: 0.2 },
    bannerMascotBg: { width: '100%', height: '100%' },
    bannerContent: { relative: 'relative', zIndex: 10 },
    bannerHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    bannerIconBox: { width: 64, height: 64, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20, justifyContent: 'center', alignItems: 'center', padding: 8 },
    bannerIconMascot: { width: '100%', height: '100%' },
    bannerTextContainer: { flex: 1 },
    bannerTagline: { fontSize: 10, fontFamily: 'Outfit_900Black', color: '#FFE3D1', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 },
    bannerTitle: { fontSize: 20, fontFamily: 'Outfit_900Black', color: '#FFFFFF', marginBottom: 2 },
    bannerDesc: { fontSize: 12, fontFamily: 'Outfit_600SemiBold', color: 'rgba(255,255,255,0.9)', lineHeight: 16 },

    // Dose Banner
    doseBanner: { backgroundColor: '#2563EB', borderRadius: 40, padding: 24, shadowColor: '#2563EB', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.15, shadowRadius: 15, elevation: 4, position: 'relative', overflow: 'hidden', flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    doseBannerMascot: { width: 96, height: 108, position: 'absolute', bottom: -12, left: -12, zIndex: 20 },
    doseBannerTextContainer: { flex: 1, paddingLeft: 80, paddingVertical: 4 },
    doseBannerTagline: { fontSize: 10, fontFamily: 'Outfit_900Black', color: '#DBEAFE', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 },
    doseBannerTitle: { fontSize: 20, fontFamily: 'Outfit_900Black', color: '#FFFFFF', marginBottom: 2 },
    doseBannerDesc: { fontSize: 12, fontFamily: 'Outfit_600SemiBold', color: 'rgba(255,255,255,0.9)', lineHeight: 16 },

    // Debug Controls
    simulatorControls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, paddingVertical: 12, paddingHorizontal: 16, backgroundColor: 'rgba(241, 245, 249, 0.5)', borderRadius: 20, borderWidth: 1, borderColor: '#F1F5F9', marginBottom: 20 },
    simulatorBtn: { p: 8, width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
    simulatorInfo: { alignItems: 'center' },
    simulatorLabel: { fontSize: 9, fontFamily: 'Outfit_900Black', color: '#CBD5E1', textTransform: 'uppercase', letterSpacing: 1 },
    simulatorVal: { fontSize: 12, fontFamily: 'Outfit_700Bold', color: '#64748B' },

    // Grid row photo & weight
    gridRow: { flexDirection: 'row', gap: 16, marginBottom: 24 },
    columnCard: { flex: 1, height: 320, borderRadius: 40, borderWidth: 1, borderColor: '#F1F5F9', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.02, shadowRadius: 8, elevation: 2, overflow: 'hidden' },
    
    // Photo evolution card
    photoGalleryFrame: { backgroundColor: '#F8FAFC', borderStyle: 'dashed', borderWidth: 2, borderColor: '#CBD5E1', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
    photoGalleryPlaceholder: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center', padding: 16 },
    cameraIconBox: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2, marginBottom: 12 },
    photoGalleryLabel: { fontSize: 13, fontFamily: 'Outfit_900Black', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'center' },
    photoGallerySubLabel: { fontSize: 10, fontFamily: 'Outfit_600SemiBold', color: '#94A3B8', opacity: 0.7, marginTop: 4, textAlign: 'center' },
    
    mockPhotoContainer: { width: '100%', height: '100%', position: 'relative' },
    mockPhoto: { width: '100%', height: '100%', borderRadius: 38 },
    photoDateBadge: { position: 'absolute', bottom: 12, left: 12, right: 12, backgroundColor: 'rgba(0,0,0,0.4)', paddingVertical: 4, paddingHorizontal: 8, borderRadius: 12, backdropFilter: 'blur(2px)' },
    photoDateText: { color: '#FFFFFF', fontSize: 10, fontFamily: 'Outfit_700Bold', textAlign: 'center' },
    photoHeaderOverlay: {
        position: 'absolute',
        top: 12,
        left: 12,
        right: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 20,
    },
    photoHeaderTag: {
        fontSize: 10,
        fontFamily: 'Outfit_900Black',
        color: '#FFFFFF',
        textTransform: 'uppercase',
        letterSpacing: 1,
        backgroundColor: 'rgba(0,0,0,0.3)',
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 8,
    },
    photoAddBtnSmall: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
    },
    photoFooterOverlay: {
        position: 'absolute',
        bottom: 12,
        left: 12,
        right: 12,
        zIndex: 20,
        alignItems: 'center',
        gap: 8,
    },
    photoBadgeRow: {
        flexDirection: 'row',
        gap: 6,
    },
    photoBadgeText: {
        color: '#FFFFFF',
        fontSize: 8,
        fontFamily: 'Outfit_900Black',
        textTransform: 'uppercase',
        letterSpacing: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        paddingVertical: 3,
        paddingHorizontal: 6,
        borderRadius: 6,
    },
    photoNavRow: {
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    photoNavBtnSmall: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    photoDotsRow: {
        flexDirection: 'row',
        gap: 4,
    },
    photoDot: {
        width: 5,
        height: 5,
        borderRadius: 2.5,
        backgroundColor: 'rgba(255,255,255,0.4)',
    },
    photoDotActive: {
        width: 12,
        backgroundColor: '#FFFFFF',
    },

    // Weight progress card
    weightProgressCard: { backgroundColor: '#F97316', borderColor: 'transparent', padding: 20, justifyContent: 'space-between', overflow: 'hidden', relative: 'relative' },
    weightMascotBgContainer: { position: 'absolute', right: -24, bottom: -24, width: 120, height: 120, opacity: 0.1 },
    weightMascotBg: { width: '100%', height: '100%' },
    weightHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', relative: 'relative', zIndex: 10 },
    weightCardLabel: { fontSize: 10, fontFamily: 'Outfit_700Bold', color: '#FFE3D1', textTransform: 'uppercase', letterSpacing: 1 },
    weightPlusBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
    weightMetricContainer: { flexDirection: 'row', alignItems: 'end', marginTop: 12, relative: 'relative', zIndex: 10 },
    weightBigValue: { fontSize: 44, fontFamily: 'Outfit_900Black', color: '#FFFFFF', lineHeight: 44 },
    weightMetricSuffix: { fontSize: 14, fontFamily: 'Outfit_600SemiBold', color: 'rgba(255,255,255,0.8)', marginLeft: 2, marginBottom: 6 },
    
    weightGaugesContainer: { gap: 12, marginTop: 'auto', backgroundColor: 'rgba(255,255,255,0.1)', padding: 12, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', zIndex: 10 },
    weightGauge: { gap: 4 },
    weightGaugeHeader: { flexDirection: 'row', justifyContent: 'space-between' },
    weightGaugeLabel: { fontSize: 9, fontFamily: 'Outfit_900Black', color: '#FFFFFF', textTransform: 'uppercase' },
    weightGaugeValue: { fontSize: 10, fontFamily: 'Outfit_900Black', color: '#FFE3D1' },
    weightGaugeTrack: { height: 6, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 3, overflow: 'hidden' },
    weightGaugeFill: { height: '100%', borderRadius: 3 },

    // Syringe / Injection Card
    injectionCard: { backgroundColor: '#FFFFFF', padding: 24, borderRadius: 40, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.03, shadowRadius: 15, elevation: 3, borderWidth: 1, borderColor: '#F1F5F9', position: 'relative', overflow: 'hidden', marginBottom: 24 },
    injectionMascotBgContainer: { position: 'absolute', right: -32, top: -32, width: 140, height: 140, opacity: 0.03, transform: [{ rotate: '12deg' }] },
    injectionMascotBg: { width: '100%', height: '100%' },
    injectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'start', zIndex: 10, relative: 'relative', marginBottom: 20 },
    injectionInfoCol: { flex: 1 },
    injectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
    injectionLabel: { fontSize: 10, fontFamily: 'Outfit_900Black', color: '#EA580C', textTransform: 'uppercase', letterSpacing: 2 },
    weekBadge: { backgroundColor: '#F8FAFC', paddingVertical: 2, paddingHorizontal: 8, borderRadius: 8 },
    weekBadgeText: { fontSize: 9, fontFamily: 'Outfit_900Black', color: '#64748B', textTransform: 'uppercase' },
    injectionBigTitle: { fontSize: 28, fontFamily: 'Outfit_900Black', color: '#0F172A', letterSpacing: -0.5 },
    
    // 3D Injection Button styles
    physicalBtnContainer: { width: 96, height: 96, position: 'relative' },
    physicalBtnBase: { width: 96, height: 96, borderRadius: 32, backgroundColor: '#EA580C', position: 'absolute', top: 4, left: 0 },
    physicalBtnFace: { width: 96, height: 96, borderRadius: 32, backgroundColor: '#F97316', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.3)', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 6, elevation: 3, position: 'absolute', top: 0, left: 0 },
    physicalBtnFacePressed: { top: 4, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, elevation: 1 },
    physicalBtnText: { fontSize: 9, fontFamily: 'Outfit_900Black', color: '#FFFFFF', textTransform: 'uppercase', letterSpacing: 1, marginTop: 2 },

    medDetailsBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(241, 245, 249, 0.5)', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: '#F1F5F9', zIndex: 10, relative: 'relative', marginBottom: 12 },
    medDetailsLabel: { fontSize: 9, fontFamily: 'Outfit_900Black', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
    medDetailsName: { fontSize: 14, fontFamily: 'Outfit_900Black', color: '#334155' },
    dosePill: { backgroundColor: '#EA580C', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
    dosePillText: { fontSize: 12, fontFamily: 'Outfit_900Black', color: '#FFFFFF' },

    suggestedRow: { flexDirection: 'row', gap: 12, zIndex: 10, relative: 'relative' },
    suggestedSiteCard: { flex: 1, backgroundColor: '#FFFFFF', borderStyle: 'dashed', borderWidth: 2, borderColor: '#CBD5E1', borderRadius: 20, padding: 12 },
    suggestedSiteLabel: { fontSize: 9, fontFamily: 'Outfit_900Black', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
    suggestedSiteValueRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    suggestedSiteIcon: { fontSize: 14 },
    suggestedSiteText: { fontSize: 12, fontFamily: 'Outfit_900Black', color: '#334155' },
    cycleTipCard: { flex: 1, backgroundColor: '#FFF7ED', borderRadius: 20, padding: 12, borderWidth: 1, borderColor: '#FFEDD5' },
    cycleTipLabel: { fontSize: 9, fontFamily: 'Outfit_900Black', color: '#EA580C', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
    cycleTipText: { fontSize: 10, fontFamily: 'Outfit_700Bold', color: '#EA580C', lineHeight: 13 },

    // Carousel Section
    carouselHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'end', marginBottom: 16 },
    carouselTitle: { fontSize: 18, fontFamily: 'Outfit_700Bold', color: '#0F172A' },
    rateBadge: { backgroundColor: '#FFF7ED', paddingVertical: 4, paddingHorizontal: 8, borderRadius: 8 },
    rateBadgeText: { fontSize: 9, fontFamily: 'Outfit_900Black', color: '#EA580C', textTransform: 'uppercase', letterSpacing: 0.5 },
    
    carouselScrollView: {
        marginLeft: -24,
        marginRight: -24,
    },
    carouselContainer: {
        paddingLeft: 24,
        paddingRight: 24,
        gap: 16,
    },
    carouselCard: { 
        width: width - 80, 
        minHeight: 320, 
        borderRadius: 36, 
        borderWidth: 1, 
        borderColor: '#F1F5F9', 
        padding: 20, 
        flexDirection: 'column', 
        justifyContent: 'space-between', 
        shadowColor: '#000', 
        shadowOffset: { width: 0, height: 6 }, 
        shadowOpacity: 0.03, 
        shadowRadius: 10, 
        elevation: 3, 
        overflow: 'hidden', 
        position: 'relative' 
    },
    mascotPopupContainer: { 
        position: 'absolute', 
        top: 0, 
        left: 0, 
        right: 0, 
        bottom: 0, 
        justifyContent: 'center', 
        alignItems: 'center', 
        zIndex: 50, 
        backgroundColor: 'rgba(255,255,255,0.92)', 
        borderRadius: 36 
    },
    mascotPopupImage: { 
        width: '80%', 
        height: '80%',
    },

    cardHeader: { flexDirection: 'column', gap: 2 },
    cardTitleText: { fontSize: 14, fontFamily: 'Outfit_900Black', color: '#1E293B' },
    cardGoalText: { fontSize: 10, fontFamily: 'Outfit_700Bold', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.5 },
    cardIconWrapper: { height: 112, justifyContent: 'center', alignItems: 'center' },
    cardIcon: { width: 96, height: 96 },
    cardProgressRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    cardProgressValue: { fontSize: 24, fontFamily: 'Outfit_900Black', color: '#1E293B' },
    cardProgressBarTrack: { flex: 1, height: 8, borderRadius: 4, overflow: 'hidden' },
    cardProgressBarFill: { height: '100%', borderRadius: 4 },
    cardProgressPct: { fontSize: 10, fontFamily: 'Outfit_900Black' },
    
    cardActionRow: { flexDirection: 'row', gap: 12 },
    cardActionBtn: { flex: 1, height: 48, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4 },
    cardActionBtnText: { fontSize: 20, fontFamily: 'Outfit_700Bold' },

    // Milestones
    milestonesCard: { backgroundColor: '#FFFFFF', padding: 20, borderRadius: 36, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.02, shadowRadius: 8, elevation: 2, borderWidth: 1, borderColor: '#F1F5F9', marginBottom: 20 },
    milestonesHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
    milestonesIconBox: { width: 24, height: 24, borderRadius: 8, backgroundColor: '#FFF7ED', justifyContent: 'center', alignItems: 'center' },
    milestonesIcon: { width: 14, height: 14 },
    milestonesTitle: { fontSize: 12, fontFamily: 'Outfit_900Black', color: '#EA580C', textTransform: 'uppercase', letterSpacing: 1 },
    milestoneItem: { marginBottom: 16 },
    milestoneLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
    milestoneName: { fontSize: 9, fontFamily: 'Outfit_900Black', color: '#1E293B', textTransform: 'uppercase' },
    milestoneTarget: { fontSize: 10, fontFamily: 'Outfit_700Bold', color: '#94A3B8' },
    milestoneProgressTrack: { height: 12, backgroundColor: '#FAF7F2', borderRadius: 6, borderWidth: 1, borderColor: '#F1F5F9', overflow: 'hidden' },
    milestoneProgressFill: { height: '100%', backgroundColor: '#EA580C', borderRadius: 6 },

    // Tips Card
    tipCard: { backgroundColor: '#EFF6FF', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: '#DBEAFE', flexDirection: 'row', gap: 12, alignItems: 'start' },
    tipIconBox: { marginTop: 2 },
    tipContent: { flex: 1 },
    tipTitle: { fontSize: 14, fontFamily: 'Outfit_700Bold', color: '#1E3A8A', marginBottom: 4 },
    tipDesc: { fontSize: 12, fontFamily: 'Outfit_600SemiBold', color: '#1E3A8A', opacity: 0.8, lineHeight: 16 },

    // Modal helpers
    modalWeightStatusCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFF7ED', borderRadius: 28, padding: 20, borderWidth: 1, borderColor: '#FFEDD5', marginBottom: 24 },
    modalWeightCol: { gap: 4 },
    modalWeightBadgeLabel: { fontSize: 9, fontFamily: 'Outfit_900Black', color: '#EA580C', textTransform: 'uppercase', letterSpacing: 1 },
    modalWeightBadgeVal: { fontSize: 28, fontFamily: 'Outfit_900Black', color: '#9A3412' },
    modalScalerImg: { width: 72, height: 72 },
    cancelBtn: { paddingVertical: 12, alignItems: 'center' },
    cancelBtnText: { fontSize: 11, fontFamily: 'Outfit_900Black', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1 },

    // Fullscreen Overlay for photo zoom
    fullscreenOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' },
    fullscreenContent: { width: '100%', height: '80%', position: 'relative', justifyContent: 'center', alignItems: 'center' },
    fullscreenImg: { width: '90%', height: '90%' },
    fullscreenCloseBtn: { position: 'absolute', top: 16, right: 16, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center', zIndex: 30 },
    fullscreenHeaderModal: { position: 'absolute', top: 16, left: 16, right: 70, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', zIndex: 20 },
    fullscreenHeaderTag: { color: '#FFFFFF', fontSize: 11, fontFamily: 'Outfit_900Black', textTransform: 'uppercase', letterSpacing: 1, backgroundColor: 'rgba(0,0,0,0.3)', paddingVertical: 4, paddingHorizontal: 12, borderRadius: 10 },
    fullscreenDeleteBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(239,68,68,0.8)', justifyContent: 'center', alignItems: 'center' },
    fullscreenAddBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center' },
    fullscreenFooter: { position: 'absolute', bottom: 16, left: 16, right: 16, alignItems: 'center', gap: 12 },
    fullscreenDateText: { color: '#FFFFFF', fontSize: 11, fontFamily: 'Outfit_900Black', textTransform: 'uppercase', letterSpacing: 1, backgroundColor: 'rgba(255,255,255,0.1)', paddingVertical: 4, paddingHorizontal: 12, borderRadius: 10 },
    fullscreenNavRow: { width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    fullscreenNavBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
    fullscreenDotsRow: { flexDirection: 'row', gap: 6 },
    fullscreenDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.3)' },
    fullscreenDotActive: { width: 16, backgroundColor: '#FFFFFF' },

    siteGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
    siteChip: { flex: 1, minWidth: '45%', paddingVertical: 12, borderRadius: 16, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center' },
    siteChipActive: { backgroundColor: '#EA580C', borderColor: '#EA580C' },
    siteChipSuggested: { borderColor: '#BBF7D0', backgroundColor: '#F0FDF4' },
    siteChipText: { fontSize: 13, fontFamily: 'Outfit_700Bold', color: '#475569' },
    siteChipTextActive: { color: '#FFFFFF' },
    warningBox: {
        flexDirection: 'row',
        gap: 12,
        backgroundColor: '#FEF3C7',
        borderColor: '#FDE68A',
        borderWidth: 1,
        borderRadius: 24,
        padding: 16,
        marginBottom: 16,
    },
    warningTitle: {
        fontSize: 14,
        fontFamily: 'Outfit_700Bold',
        color: '#78350F',
        marginBottom: 2,
    },
    warningText: {
        fontSize: 11,
        fontFamily: 'Outfit_600SemiBold',
        color: '#78350F',
        lineHeight: 15,
    },
    tipBox: {
        backgroundColor: '#F8FAFC',
        borderRadius: 16,
        padding: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        marginBottom: 16,
    },
    tipText: {
        fontSize: 11,
        fontFamily: 'Outfit_600SemiBold',
        color: '#64748B',
        fontStyle: 'italic',
        lineHeight: 15,
    },
});
