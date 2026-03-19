import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View, TextInput, Platform, Dimensions, Modal as RNModal } from 'react-native';
import SliderModule from '@react-native-community/slider';

const { width } = Dimensions.get('window');

export const Button = ({ children, onClick, variant = 'primary', style = {}, textStyle = {}, disabled, ...props }) => {
    const variants = {
        primary: {
            container: { backgroundColor: '#14B8A6' },
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

export const Slider = ({ label, value, onChange, min, max, step, suffix }) => (
    <View style={styles.sliderContainer}>
        <View style={styles.sliderHeader}>
            <Text style={styles.inputLabel}>{label}</Text>
            <Text style={styles.sliderValue}>{value} {suffix}</Text>
        </View>
        <SliderModule
            style={{ width: '100%', height: 40 }}
            minimumValue={min}
            maximumValue={max}
            step={step}
            value={parseFloat(value)}
            onValueChange={v => onChange(v.toFixed(step < 1 ? 2 : 1))}
            minimumTrackTintColor="#14B8A6"
            maximumTrackTintColor="#E2E8F0"
            thumbTintColor="#14B8A6"
        />
    </View>
);

export const Modal = ({ visible, onClose, title, children }) => (
    <RNModal visible={visible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>{title}</Text>
                    <TouchableOpacity onPress={onClose}><Text style={styles.closeText}>Fechar</Text></TouchableOpacity>
                </View>
                {children}
            </View>
        </View>
    </RNModal>
);

export const StatCard = ({ label, value, icon: Icon, color, subValue, onPress }) => (
    <TouchableOpacity onPress={onPress} style={[styles.statCard]}>
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
        fontWeight: 'bold',
        textAlign: 'center',
    },
    inputContainer: {
        marginBottom: 20,
        width: '100%',
    },
    inputLabel: {
        fontSize: 12,
        fontWeight: '900',
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
        fontWeight: '600',
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
    },
    sliderValue: {
        fontSize: 18,
        fontWeight: '900',
        color: '#14B8A6',
    },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, minHeight: 300 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#0F172A' },
    closeText: { color: '#64748B', fontWeight: 'bold' },
    statCard: { backgroundColor: '#FFFFFF', padding: 20, borderRadius: 24, flex: 1, borderWidth: 1, borderColor: '#F1F5F9' },
    statIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
    statLabel: { fontSize: 10, fontWeight: '900', color: '#64748B', textTransform: 'uppercase', marginBottom: 4 },
    statValue: { fontSize: 22, fontWeight: 'bold', color: '#0F172A' },
    statSub: { fontSize: 10, color: '#94A3B8', marginTop: 4 },
});
