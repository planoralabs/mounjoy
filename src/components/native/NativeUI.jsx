import React, { useRef, useEffect, useState } from 'react';
import { TouchableOpacity, Text, StyleSheet, View, TextInput, Platform, Dimensions, Modal as RNModal, PanResponder, Animated } from 'react-native';

const { width } = Dimensions.get('window');

export const Button = ({ children, onClick, variant = 'primary', style = {}, textStyle = {}, disabled, ...props }) => {
    const variants = {
        primary: {
            container: { backgroundColor: '#EA580C', shadowColor: '#EA580C', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.15, shadowRadius: 10, elevation: 4 },
            text: { color: '#FFFFFF' }
        },
        secondary: {
            container: { backgroundColor: '#FFFFFF', borderColor: '#E2E8F0', borderWidth: 1 },
            text: { color: '#334155' }
        },
        ghost: {
            container: { backgroundColor: 'transparent' },
            text: { color: '#64748B' }
        },
        danger: {
            container: { backgroundColor: '#FEF2F2', borderColor: '#FEE2E2', borderWidth: 1 },
            text: { color: '#EF4444' }
        }
    };

    const v = variants[variant] || variants.primary;

    return (
        <TouchableOpacity
            onPress={onClick}
            disabled={disabled}
            style={[
                styles.btnBase,
                v.container,
                disabled && { opacity: 0.5 },
                style
            ]}
            activeOpacity={0.8}
            {...props}
        >
            {React.Children.map(children, child => 
                typeof child === 'string' ? (
                    <Text style={[styles.btnText, v.text, textStyle]}>{child}</Text>
                ) : (
                    child
                )
            )}
        </TouchableOpacity>
    );
};

export const Input = ({ label, value, onChangeText, placeholder, ...props }) => (
    <View style={styles.inputContainer}>
        {label && <Text style={styles.inputLabel}>{label}</Text>}
        <TextInput
            style={styles.input}
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor="#CBD5E1"
            {...props}
        />
    </View>
);

export const Slider = ({ label, value, onChange, min, max, step, suffix }) => {
    const parsedValue = parseFloat(value) || min;
    const percentage = Math.max(0, Math.min(100, ((parsedValue - min) / (max - min)) * 100));
    
    // Store props in a ref to avoid stale closures in PanResponder callbacks
    const propsRef = useRef({ min, max, step, onChange });
    useEffect(() => {
        propsRef.current = { min, max, step, onChange };
    }, [min, max, step, onChange]);

    const trackWidthRef = useRef(0);
    const [trackWidth, setTrackWidth] = useState(0);

    const pulseAnim = useRef(new Animated.Value(1)).current;
    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 0.4,
                    duration: 800,
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 800,
                    useNativeDriver: true,
                })
            ])
        ).start();
    }, [pulseAnim]);

    const trackRef = useRef(null);
    const initialValueRef = useRef(parsedValue);
    const isDraggingRef = useRef(false);

    // Keep initialValueRef updated if props value changes externally (but not during drag)
    useEffect(() => {
        if (!isDraggingRef.current) {
            initialValueRef.current = parsedValue;
        }
    }, [parsedValue]);

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onStartShouldSetPanResponderCapture: () => true,
            onMoveShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponderCapture: () => true,
            onPanResponderTerminationRequest: () => false,
            onPanResponderGrant: (evt, gestureState) => {
                isDraggingRef.current = true;
                if (evt.currentTarget && evt.currentTarget.requestDisallowInterceptTouchEvent) {
                    evt.currentTarget.requestDisallowInterceptTouchEvent(true);
                }
                const currentWidth = trackWidthRef.current;
                const { min: currentMin, max: currentMax, step: currentStep, onChange: currentOnChange } = propsRef.current;
                
                if (currentWidth > 0) {
                    const locationX = evt.nativeEvent.locationX;
                    const pct = Math.max(0, Math.min(1, locationX / currentWidth));
                    const rawVal = currentMin + pct * (currentMax - currentMin);
                    const stepped = Math.round(rawVal / currentStep) * currentStep;
                    const finalVal = Math.max(currentMin, Math.min(currentMax, stepped));
                    
                    initialValueRef.current = finalVal;
                    currentOnChange(finalVal.toFixed(currentStep < 1 ? (currentStep < 0.1 ? 2 : 1) : 0));
                }
            },
            onPanResponderMove: (evt, gestureState) => {
                if (evt.currentTarget && evt.currentTarget.requestDisallowInterceptTouchEvent) {
                    evt.currentTarget.requestDisallowInterceptTouchEvent(true);
                }
                const currentWidth = trackWidthRef.current;
                const { min: currentMin, max: currentMax, step: currentStep, onChange: currentOnChange } = propsRef.current;
                
                if (currentWidth > 0) {
                    const deltaPct = gestureState.dx / currentWidth;
                    const deltaVal = deltaPct * (currentMax - currentMin);
                    const rawVal = initialValueRef.current + deltaVal;
                    const stepped = Math.round(rawVal / currentStep) * currentStep;
                    const finalVal = Math.max(currentMin, Math.min(currentMax, stepped));
                    currentOnChange(finalVal.toFixed(currentStep < 1 ? (currentStep < 0.1 ? 2 : 1) : 0));
                }
            },
            onPanResponderRelease: () => {
                isDraggingRef.current = false;
            },
            onPanResponderTerminate: () => {
                isDraggingRef.current = false;
            },
        })
    ).current;

    const handleLayout = (e) => {
        const w = e.nativeEvent.layout.width;
        setTrackWidth(w);
        trackWidthRef.current = w;
    };

    return (
        <View style={styles.sliderContainer}>
            <View style={styles.sliderHeader}>
                <Text style={styles.inputLabel}>{label}</Text>
                <View style={styles.sliderHeaderValueRow}>
                    <Animated.View style={[styles.pulseDot, { opacity: pulseAnim }]} />
                    <Text style={styles.sliderValue}>
                        {value} <Text style={styles.sliderValueSuffix}>{suffix}</Text>
                    </Text>
                </View>
            </View>
            
            <View style={styles.sliderRowCard}>
                <View 
                    ref={trackRef}
                    style={styles.sliderTrackWrapper}
                    onLayout={handleLayout}
                    {...panResponder.panHandlers}
                >
                    <View style={styles.sliderTrackBg} pointerEvents="none" />
                    <View style={[styles.sliderTrackFill, { width: `${percentage}%` }]} pointerEvents="none" />
                    <View 
                        style={[
                            styles.sliderThumb, 
                            { 
                                left: `${percentage}%`,
                                transform: [{ translateX: -14 }] 
                            }
                        ]} 
                        pointerEvents="none" 
                    />
                </View>
                <View style={styles.sliderInputWrapper}>
                    <TextInput
                        style={styles.sliderTextInput}
                        value={String(value)}
                        onChangeText={onChange}
                        keyboardType="numeric"
                    />
                </View>
            </View>
        </View>
    );
};

export const Modal = ({ visible, onClose, title, children }) => (
    <RNModal visible={visible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>{title}</Text>
                    <TouchableOpacity onPress={onClose}>
                        <Text style={styles.closeText}>Fechar</Text>
                    </TouchableOpacity>
                </View>
                {children}
            </View>
        </View>
    </RNModal>
);

export const StatCard = ({ label, value, icon: Icon, color, subValue, onPress }) => (
    <TouchableOpacity onPress={onPress} style={styles.statCard} activeOpacity={0.9}>
        <View style={[styles.statIcon, { backgroundColor: color + '15' }]}>
            <Icon size={20} color={color} />
        </View>
        <Text style={styles.statLabel}>{label}</Text>
        <Text style={styles.statValue}>{value}</Text>
        {subValue && <Text style={styles.statSub}>{subValue}</Text>}
    </TouchableOpacity>
);

const styles = StyleSheet.create({
    btnBase: {
        paddingVertical: 16,
        paddingHorizontal: 24,
        borderRadius: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    btnText: {
        fontSize: 16,
        fontFamily: 'Outfit_700Bold',
        textAlign: 'center',
    },
    inputContainer: {
        marginBottom: 20,
        width: '100%',
    },
    inputLabel: {
        fontSize: 11,
        fontFamily: 'Outfit_900Black',
        color: '#64748B',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 8,
        marginLeft: 4,
    },
    input: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 16,
        padding: 16,
        fontSize: 16,
        color: '#0F172A',
        fontFamily: 'Outfit_600SemiBold',
    },
    sliderContainer: {
        marginBottom: 32,
        width: '100%',
    },
    sliderHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
        paddingHorizontal: 4,
    },
    sliderHeaderValueRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    pulseDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#EA580C',
    },
    sliderValue: {
        fontSize: 20,
        fontFamily: 'Outfit_900Black',
        color: '#EA580C',
    },
    sliderValueSuffix: {
        fontSize: 12,
        fontFamily: 'Outfit_600SemiBold',
        color: '#94A3B8',
    },
    sliderRowCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        padding: 8,
        paddingLeft: 16,
        borderRadius: 28,
        borderWidth: 2,
        borderColor: '#F1F5F9',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.02,
        shadowRadius: 4,
        elevation: 1,
    },
    sliderTrackWrapper: {
        flex: 1,
        height: 40,
        position: 'relative',
        backgroundColor: 'rgba(0,0,0,0)',
    },
    sliderTrackBg: {
        height: 12,
        backgroundColor: '#F8FAFC',
        borderRadius: 6,
        position: 'absolute',
        left: 0,
        right: 0,
        top: 14,
    },
    sliderTrackFill: {
        height: 12,
        backgroundColor: '#EA580C',
        borderRadius: 6,
        position: 'absolute',
        left: 0,
        top: 14,
    },
    sliderThumb: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#FFFFFF',
        borderWidth: 5,
        borderColor: '#EA580C',
        position: 'absolute',
        top: 6,
        shadowColor: '#EA580C',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 4,
    },
    sliderInputWrapper: {
        width: 96,
        marginLeft: 12,
    },
    sliderTextInput: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 20,
        paddingVertical: 10,
        textAlign: 'center',
        fontSize: 18,
        fontFamily: 'Outfit_900Black',
        color: '#0F172A',
        height: 48,
    },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(9, 52, 102, 0.4)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, minHeight: 300 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    modalTitle: { fontSize: 20, fontFamily: 'Outfit_700Bold', color: '#0F172A' },
    closeText: { color: '#64748B', fontFamily: 'Outfit_700Bold', fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.5 },
    statCard: { 
        backgroundColor: '#FFFFFF', 
        padding: 20, 
        borderRadius: 24, 
        flex: 1, 
        borderWidth: 1, 
        borderColor: '#F1F5F9',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.03,
        shadowRadius: 8,
        elevation: 2,
    },
    statIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
    statLabel: { fontSize: 10, fontFamily: 'Outfit_900Black', color: '#94A3B8', textTransform: 'uppercase', marginBottom: 4 },
    statValue: { fontSize: 22, fontFamily: 'Outfit_700Bold', color: '#0F172A' },
    statSub: { fontSize: 10, fontFamily: 'Outfit_600SemiBold', color: '#94A3B8', marginTop: 4 },
});
