import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Info, CheckCircle2, AlertTriangle, RefreshCw, X } from 'lucide-react-native';
import { Modal, Button } from './NativeUI';

const NativeBodySelector = ({ selectedSiteId, onSelect, suggestedSiteId }) => {
    const [showInfo, setShowInfo] = useState(false);

    const isActive = (id) => selectedSiteId === id;
    const isSuggested = (id) => suggestedSiteId === id;

    const getFillColor = (id) => {
        if (isActive(id)) return "#EA580C"; // brand-600
        if (isSuggested(id)) return "#10B981"; // emerald-500
        return "#FFFFFF";
    };

    const getSiteName = (id) => {
        const names = {
            'arm-right': 'Braço Direito',
            'arm-left': 'Braço Esquerdo',
            'abdomen-left': 'Abdômen Esquerdo',
            'abdomen-right': 'Abdômen Direito',
            'thigh-right': 'Coxa Direita',
            'thigh-left': 'Coxa Esquerda'
        };
        return names[id] || 'Selecione um local';
    };

    return (
        <View style={styles.container}>
            <View style={styles.selectorCard}>
                {/* Info Button */}
                <TouchableOpacity
                    onPress={() => setShowInfo(true)}
                    style={styles.infoBtn}
                    activeOpacity={0.7}
                >
                    <Info size={16} color="#94A3B8" />
                </TouchableOpacity>

                <View style={styles.svgWrapper}>
                    <Svg id="body" viewBox="0 100 198.81 450" style={styles.svg}>
                        {/* TRUNK (Reference - Always White) */}
                        <Path
                            fill="#FFFFFF"
                            stroke="#0F172A"
                            strokeWidth={1.5}
                            pointerEvents="none"
                            d="M147.08,247.36c-0.06-7.1.64-14.06,2.71-19.47,5.31-13.86,1.87-35.54,4.26-32.35l-5.58-77s-22.95-7.49-26.13-12.11H75.48c-3.19,4.62-26.13,12.11-26.13,12.11l-5.58,77C46.15,192.36,42.71,214,48,227.9c2.07,5.41,2.78,12.37,2.71,19.47h96.34Z"
                            transform="translate(0.5, 0.5)"
                        />

                        {/* Interactive parts */}
                        <Path
                            fill={getFillColor("arm-right")}
                            stroke="#0F172A"
                            strokeWidth={1.5}
                            d="M43.76,195.54c-2.39,3.19-4.94,16.09-5.1,25.82s-3.19,23.27-5.74,29,2.23,35.22-.32,50.36-10.36,42.55-10.36,47.81L3.76,346.3c1-10.36-5.42-86.06-3.35-90.68s4-15.46,2.71-22.63S0.42,189.49,4.4,179.92s-0.8-27.25,9.88-44.62,35.06-16.73,35.06-16.73Z"
                            transform="translate(0.5, 0.5)"
                            onPress={() => onSelect("arm-right")}
                        />

                        <Path
                            fill={getFillColor("arm-left")}
                            stroke="#0F172A"
                            strokeWidth={1.5}
                            d="M194,346.3c-1-10.36,5.42-86.06,3.35-90.68s-4-15.46-2.71-22.63,2.71-43.51-1.27-53.07,0.8-27.25-9.88-44.62-35.06-16.73-35.06-16.73l5.58,77c2.39,3.19,4.94,16.09,5.1,25.82s3.19,23.27,5.74,29-2.23,35.22.32,50.36,10.36,42.55,10.36,47.81Z"
                            transform="translate(0.5, 0.5)"
                            onPress={() => onSelect("arm-left")}
                        />

                        <Path
                            fill={getFillColor("abdomen-left")}
                            stroke="#0F172A"
                            strokeWidth={1.5}
                            d="M50.73,247.36 a136,136,0,0,1-3.62,28.82 c-2.55,10.36-11,68.53-11.79,89.72 L97,368.29 L97,247.36 Z"
                            transform="translate(0.5, 0.5)"
                            onPress={() => onSelect("abdomen-left")}
                        />

                        <Path
                            fill={getFillColor("abdomen-right")}
                            stroke="#0F172A"
                            strokeWidth={1.5}
                            d="M97,247.36 L97,368.29 L100.82,368.29 L162.49,365.9 c-0.8-21.2-9.24-79.36-11.79-89.72 a136,136,0,0,1-3.62-28.82 H97 Z"
                            transform="translate(0.5, 0.5)"
                            onPress={() => onSelect("abdomen-right")}
                        />

                        <Path
                            fill={getFillColor("thigh-right")}
                            stroke="#0F172A"
                            strokeWidth={1.5}
                            d="M35.11,508.33c1.67-14.63,4.15-24,4.67-31.36,0.8-11.31-5.26-89.88-4.46-111.07L97,368.29s0.32,12.43-2.07,21-7.33,19-7.33,33.78-2.23,48.45-6.53,62.31c-3.08,9.94-7,16-7.48,22.91H35.11Z"
                            transform="translate(0.5, 0.5)"
                            onPress={() => onSelect("thigh-right")}
                        />

                        <Path
                            fill={getFillColor("thigh-left")}
                            stroke="#0F172A"
                            strokeWidth={1.5}
                            d="M162.7,508.33c-1.67-14.63-4.15-24-4.67-31.36-0.8-11.31,5.26-89.88,4.46-111.07l-61.67,2.39s-0.32,12.43,2.07,21,7.33,19,7.33,33.78,2.23,48.45,6.53,62.31c3.08,9.94,7,16,7.48,22.91H162.7Z"
                            transform="translate(0.5, 0.5)"
                            onPress={() => onSelect("thigh-left")}
                        />
                    </Svg>
                </View>

                {/* Selected Site Name Label */}
                {selectedSiteId && (
                    <View style={styles.siteNameBadge}>
                        <Text style={styles.siteNameText}>{getSiteName(selectedSiteId)}</Text>
                    </View>
                )}
            </View>

            {/* Selection/Suggested Indicators */}
            <View style={styles.indicatorsRow}>
                <View style={styles.indicatorSuggested}>
                    <View style={styles.dotSuggested} />
                    <Text style={styles.indicatorTextSuggested}>Sugerido</Text>
                </View>
                <View style={styles.indicatorSelected}>
                    <View style={styles.dotSelected} />
                    <Text style={styles.indicatorTextSelected}>Selecionado</Text>
                </View>
            </View>

            {/* Guidance Info Modal */}
            <Modal visible={showInfo} onClose={() => setShowInfo(false)} title="Guia de Aplicação">
                    {/* Recommended Sites */}
                    <View style={styles.infoSection}>
                        <View style={styles.sectionHeader}>
                            <CheckCircle2 size={16} color="#EA580C" />
                            <Text style={styles.sectionTitle}>Locais Recomendados</Text>
                        </View>

                        <View style={styles.tipCard}>
                            <Text style={styles.tipTitle}>1. Abdômen (Preferido)</Text>
                            <Text style={styles.tipDesc}>
                                Região ao redor do umbigo (evitar ~5 cm do centro). Oferece absorção estável devido ao tecido adiposo.
                            </Text>
                        </View>

                        <View style={styles.tipCard}>
                            <Text style={styles.tipTitle}>2. Coxa (Frontal/Superior)</Text>
                            <Text style={styles.tipDesc}>
                                Fácil para autoaplicação. Pode haver maior sensibilidade em pessoas com baixo percentual de gordura.
                            </Text>
                        </View>

                        <View style={styles.tipCard}>
                            <Text style={styles.tipTitle}>3. Braço (Parte Posterior)</Text>
                            <Text style={styles.tipDesc}>
                                Região do tríceps. Absorção rápida, mas geralmente requer auxílio de outra pessoa para aplicar.
                            </Text>
                        </View>
                    </View>

                    {/* Rotation Logic */}
                    <View style={styles.rotationCard}>
                        <View style={styles.sectionHeader}>
                            <RefreshCw size={16} color="#10B981" />
                            <Text style={[styles.sectionTitle, { color: '#065F46' }]}>Rotação Essencial</Text>
                        </View>
                        <Text style={styles.rotationDesc}>
                            Alternar os pontos evita cicatrizes, irritações e lipodistrofia (nódulos de gordura), mantendo a medicação eficaz.
                        </Text>
                        <View style={styles.rotationExampleBox}>
                            <Text style={styles.rotationExampleText}>
                                Ex: S1 (Abdômen D) → S2 (Abdômen E) → S3 (Coxa D)...
                            </Text>
                        </View>
                    </View>

                    {/* Care Instructions */}
                    <View style={styles.careCard}>
                        <View style={styles.sectionHeader}>
                            <AlertTriangle size={16} color="#D97706" />
                            <Text style={[styles.sectionTitle, { color: '#78350F' }]}>Cuidados Importantes</Text>
                        </View>
                        <Text style={styles.careItem}>• Limpar o local com álcool antes de aplicar</Text>
                        <Text style={styles.careItem}>• Não aplicar sobre hematomas ou peles machucadas</Text>
                        <Text style={styles.careItem}>• Não massagear a área após a picada</Text>
                        <Text style={styles.careItem}>• Descarte as agulhas em coletores adequados</Text>
                    </View>

                    <Button onClick={() => setShowInfo(false)} style={{ width: '100%', marginTop: 8 }}>
                        Entendi
                    </Button>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: '100%',
        alignItems: 'center',
        gap: 12,
    },
    selectorCard: {
        backgroundColor: '#F8FBFF',
        padding: 12,
        borderRadius: 32,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        width: '100%',
        height: 250,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    infoBtn: {
        position: 'absolute',
        top: 12,
        right: 12,
        zIndex: 20,
        padding: 8,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 20,
    },
    svgWrapper: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    svg: {
        width: '100%',
        height: '100%',
    },
    siteNameBadge: {
        position: 'absolute',
        bottom: 12,
        alignSelf: 'center',
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        paddingVertical: 6,
        paddingHorizontal: 16,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        zIndex: 30,
    },
    siteNameText: {
        color: '#FFFFFF',
        fontSize: 10,
        fontFamily: 'Outfit_900Black',
        textTransform: 'uppercase',
        letterSpacing: 2,
    },
    indicatorsRow: {
        flexDirection: 'row',
        width: '100%',
        gap: 8,
    },
    indicatorSuggested: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#F0FDF4',
        padding: 8,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#DCFCE7',
    },
    dotSuggested: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#10B981',
    },
    indicatorTextSuggested: {
        fontSize: 10,
        fontFamily: 'Outfit_900Black',
        color: '#065F46',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    indicatorSelected: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#FFF7ED',
        padding: 8,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#FFEDD5',
    },
    dotSelected: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#EA580C',
    },
    indicatorTextSelected: {
        fontSize: 10,
        fontFamily: 'Outfit_900Black',
        color: '#9A3412',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    infoScroll: {
        paddingBottom: 24,
        gap: 16,
    },
    infoSection: {
        gap: 12,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
        paddingBottom: 8,
        marginBottom: 4,
    },
    sectionTitle: {
        fontSize: 12,
        fontFamily: 'Outfit_900Black',
        color: '#334155',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    tipCard: {
        backgroundColor: '#F8FAFC',
        padding: 16,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    tipTitle: {
        fontSize: 13,
        fontFamily: 'Outfit_700Bold',
        color: '#1E293B',
        marginBottom: 4,
    },
    tipDesc: {
        fontSize: 11,
        fontFamily: 'Outfit_600SemiBold',
        color: '#64748B',
        lineHeight: 15,
    },
    rotationCard: {
        backgroundColor: '#F0FDF4',
        padding: 16,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: '#DCFCE7',
        gap: 8,
    },
    rotationDesc: {
        fontSize: 11,
        fontFamily: 'Outfit_600SemiBold',
        color: '#065F46',
        lineHeight: 15,
    },
    rotationExampleBox: {
        backgroundColor: 'rgba(255, 255, 255, 0.6)',
        padding: 8,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#A7F3D0',
    },
    rotationExampleText: {
        fontSize: 9,
        fontFamily: 'Outfit_900Black',
        color: '#065F46',
        textTransform: 'uppercase',
    },
    careCard: {
        backgroundColor: '#FFFBEB',
        padding: 16,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: '#FEF3C7',
        gap: 8,
    },
    careItem: {
        fontSize: 11,
        fontFamily: 'Outfit_600SemiBold',
        color: '#78350F',
    },
});

export default NativeBodySelector;
