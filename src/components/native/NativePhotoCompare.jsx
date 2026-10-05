import React, { useState, useRef, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Modal, Platform, PanResponder, Animated } from 'react-native';
import { X, Share2, Activity, Columns2, Rows2 } from 'lucide-react-native';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { useTranslation } from 'react-i18next';
import { formatDate } from '../../i18n';
import { photoUri } from '../../utils/journal';

// Side-by-side "before & after" of 2–4 progress photos. Each photo can be
// dragged and pinch-zoomed to line the bodies up, then the grid is shared as
// one image.

const AdjustableGridImage = ({ uri, id, adjustment, onAdjustmentChange, onActiveStart, onActiveEnd }) => {
    const [containerSize, setContainerSize] = useState(null);
    const [imageRatio, setImageRatio] = useState(1);

    useEffect(() => {
        if (uri) Image.getSize(uri, (w, h) => { if (w && h) setImageRatio(w / h); }, () => {});
    }, [uri]);

    const coverScale = useMemo(() => {
        if (!containerSize || !imageRatio) return 1;
        const containerRatio = containerSize.width / containerSize.height;
        return containerRatio > imageRatio ? containerRatio / imageRatio : imageRatio / containerRatio;
    }, [containerSize, imageRatio]);

    const activeScale = adjustment?.scale || 1;
    const pan = useRef(new Animated.ValueXY({ x: adjustment?.x || 0, y: adjustment?.y || 0 })).current;
    const scale = useRef(new Animated.Value(coverScale * activeScale)).current;
    const valRef = useRef({ x: adjustment?.x || 0, y: adjustment?.y || 0, scale: activeScale });
    const coverRef = useRef(coverScale);

    useEffect(() => {
        coverRef.current = coverScale;
        valRef.current = { x: adjustment?.x || 0, y: adjustment?.y || 0, scale: activeScale };
        pan.setValue({ x: adjustment?.x || 0, y: adjustment?.y || 0 });
        scale.setValue(coverScale * activeScale);
    }, [adjustment, coverScale]);

    const startDist = useRef(0);
    const startScale = useRef(1);
    const isPinching = useRef(false);

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderGrant: (evt) => {
                onActiveStart && onActiveStart();
                isPinching.current = false;
                const { touches } = evt.nativeEvent;
                if (touches.length === 2) {
                    isPinching.current = true;
                    startDist.current = Math.hypot(touches[0].pageX - touches[1].pageX, touches[0].pageY - touches[1].pageY);
                    startScale.current = valRef.current.scale;
                } else {
                    startDist.current = 0;
                    pan.setOffset({ x: valRef.current.x, y: valRef.current.y });
                    pan.setValue({ x: 0, y: 0 });
                }
            },
            onPanResponderMove: (evt, gesture) => {
                const { touches } = evt.nativeEvent;
                if (touches.length === 2) {
                    isPinching.current = true;
                    const dist = Math.hypot(touches[0].pageX - touches[1].pageX, touches[0].pageY - touches[1].pageY);
                    if (startDist.current === 0) {
                        startDist.current = dist;
                        startScale.current = valRef.current.scale;
                    } else {
                        // Amplified so small pinches still zoom noticeably.
                        const next = Math.max(0.3, Math.min(6, startScale.current * (1 + ((dist / startDist.current) - 1) * 1.8)));
                        scale.setValue(coverRef.current * next);
                        valRef.current.scale = next;
                    }
                } else if (touches.length === 1 && !isPinching.current) {
                    startDist.current = 0;
                    pan.setValue({ x: gesture.dx, y: gesture.dy });
                }
            },
            onPanResponderRelease: () => {
                onActiveEnd && onActiveEnd();
                startDist.current = 0;
                pan.flattenOffset();
                onAdjustmentChange(id, { x: pan.x._value, y: pan.y._value, scale: valRef.current.scale });
                isPinching.current = false;
            },
            onPanResponderTerminate: () => {
                onActiveEnd && onActiveEnd();
                startDist.current = 0;
                isPinching.current = false;
            },
        })
    ).current;

    return (
        <View
            style={{ flex: 1, overflow: 'hidden', backgroundColor: '#090D16' }}
            onLayout={(e) => setContainerSize({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}
            {...panResponder.panHandlers}
        >
            <Animated.Image
                source={{ uri }}
                style={{ width: '100%', height: '100%', transform: [{ translateX: pan.x }, { translateY: pan.y }, { scale }] }}
                resizeMode="contain"
            />
        </View>
    );
};

const NativePhotoCompare = ({ visible, photos, weightFor, formatWeight, formatDiff, onClose }) => {
    const { t } = useTranslation();
    const [adjustments, setAdjustments] = useState({});
    const [isSharing, setIsSharing] = useState(false);
    const [activeId, setActiveId] = useState(null);
    const [twoLayout, setTwoLayout] = useState('side-by-side');
    const gridRef = useRef();

    const idOf = (p) => `${p.date}-${p.index}`;
    const first = photos[0] ? weightFor(photos[0]) : null;
    const last = photos.length > 1 ? weightFor(photos[photos.length - 1]) : null;
    const totalDiff = first && last ? last - first : null;
    const n = photos.length;

    const handleShare = async () => {
        if (isSharing) return;
        setIsSharing(true);
        try {
            const uri = await captureRef(gridRef, { format: 'png', quality: 0.95 });
            await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: t('calendar.shareDialog'), UTI: 'public.png' });
        } catch (error) {
            console.error('Error sharing image: ', error);
        } finally {
            setIsSharing(false);
        }
    };

    const column = n === 3 || (n === 2 && twoLayout === 'stacked');
    const boxStyle = n === 2
        ? (twoLayout === 'stacked' ? { width: '100%', height: '50%' } : { width: '50%', height: '100%' })
        : n === 3 ? { width: '100%', height: '33.33%' } : { width: '50%', height: '50%' };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={styles.overlay}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={onClose} style={styles.roundBtn}><X size={20} color="#FFFFFF" /></TouchableOpacity>
                    <View style={{ alignItems: 'center' }}>
                        <Text style={styles.title}>{t('calendar.evolution')}</Text>
                        <Text style={styles.subTitle}>{t('calendar.adjustShare')}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                        {!isSharing && n === 2 && (
                            <TouchableOpacity onPress={() => setTwoLayout((l) => (l === 'side-by-side' ? 'stacked' : 'side-by-side'))} style={styles.roundBtn}>
                                {twoLayout === 'side-by-side' ? <Rows2 size={20} color="#FFFFFF" /> : <Columns2 size={20} color="#FFFFFF" />}
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity onPress={handleShare} style={styles.roundBtn} disabled={isSharing}>
                            {isSharing ? <Activity size={20} color="#EA580C" /> : <Share2 size={20} color="#FFFFFF" />}
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={{ flex: 1 }}>
                    <View ref={gridRef} collapsable={false} style={[styles.grid, column ? { flexDirection: 'column' } : { flexDirection: 'row', flexWrap: 'wrap' }]}>
                        {photos.map((photo) => {
                            const id = idOf(photo);
                            const w = weightFor(photo);
                            return (
                                <View key={id} style={[styles.photoBox, boxStyle]}>
                                    <AdjustableGridImage
                                        uri={photoUri(photo)}
                                        id={id}
                                        adjustment={adjustments[id]}
                                        onAdjustmentChange={(key, adj) => setAdjustments((prev) => ({ ...prev, [key]: adj }))}
                                        onActiveStart={() => setActiveId(id)}
                                        onActiveEnd={() => setActiveId(null)}
                                    />
                                    {!isSharing && activeId === id && <View pointerEvents="none" style={styles.activeOutline} />}
                                    <View style={styles.photoOverlay}>
                                        {!!w && <Text style={styles.photoWeight}>{formatWeight(w)}</Text>}
                                        <Text style={styles.photoDate}>{photo.date ? formatDate(photo.date, { day: '2-digit', month: 'short', year: '2-digit' }) : ''}</Text>
                                    </View>
                                </View>
                            );
                        })}
                        {totalDiff !== null && (
                            <View style={[styles.totalBadge, n === 3 ? { top: '66.66%' } : { top: '50%' }]}>
                                <Text style={styles.totalText}>{formatDiff(totalDiff)}</Text>
                            </View>
                        )}
                    </View>
                </View>
            </View>
        </Modal>
    );
};

export default NativePhotoCompare;

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: '#090D16', paddingTop: Platform.OS === 'ios' ? 44 : 20 },
    header: { height: 64, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20 },
    roundBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255, 255, 255, 0.1)', justifyContent: 'center', alignItems: 'center' },
    title: { fontSize: 18, fontFamily: 'Outfit_900Black', color: '#FFFFFF', textTransform: 'uppercase', letterSpacing: 2 },
    subTitle: { fontSize: 8, fontFamily: 'Outfit_900Black', color: '#EA580C', textTransform: 'uppercase', letterSpacing: 1 },
    grid: { width: '100%', height: '100%' },
    photoBox: { borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.05)', backgroundColor: '#0F172A' },
    activeOutline: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderWidth: 2.5, borderColor: 'rgba(234, 88, 12, 0.6)', zIndex: 50 },
    photoOverlay: { position: 'absolute', bottom: 12, alignSelf: 'center', backgroundColor: 'rgba(0, 0, 0, 0.75)', paddingVertical: 6, paddingHorizontal: 16, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.15)' },
    photoWeight: { color: '#FFFFFF', fontSize: 14, fontFamily: 'Outfit_900Black' },
    photoDate: { color: 'rgba(255, 255, 255, 0.5)', fontSize: 8, fontFamily: 'Outfit_700Bold', textTransform: 'uppercase', marginTop: 1 },
    totalBadge: { position: 'absolute', left: '50%', transform: [{ translateX: -40 }, { translateY: -20 }], backgroundColor: '#EA580C', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, elevation: 10, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 10, zIndex: 100 },
    totalText: { color: '#FFFFFF', fontSize: 14, fontFamily: 'Outfit_900Black' },
});
