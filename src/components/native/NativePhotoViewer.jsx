import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Modal } from 'react-native';
import { ChevronLeft, ChevronRight, X, Trash2 } from 'lucide-react-native';
import { formatDate } from '../../i18n';
import { photoUri } from '../../utils/journal';

// Full-screen viewer for progress photos. `photos` is already ordered the way
// the caller shows them; `onDelete(photo)` is optional.
const NativePhotoViewer = ({ photos, index, onIndexChange, onClose, onDelete, caption }) => {
    const visible = index !== null && index >= 0 && index < photos.length;
    const photo = visible ? photos[index] : null;
    const go = (step) => onIndexChange((index + step + photos.length) % photos.length);

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <View style={styles.overlay}>
                {photo && (
                    <>
                        <Image source={{ uri: photoUri(photo) }} style={styles.img} resizeMode="contain" />
                        <View style={styles.topBar}>
                            {onDelete ? (
                                <TouchableOpacity onPress={() => onDelete(photo)} style={styles.deleteBtn}>
                                    <Trash2 size={18} color="#FFFFFF" />
                                </TouchableOpacity>
                            ) : <View />}
                            <TouchableOpacity onPress={onClose} style={styles.roundBtn}>
                                <X size={20} color="#FFFFFF" />
                            </TouchableOpacity>
                        </View>
                        <View style={styles.footer}>
                            <Text style={styles.dateText}>
                                {photo.date ? formatDate(photo.date, { day: '2-digit', month: 'long', year: 'numeric' }) : ''}
                                {caption ? `  ·  ${caption(photo)}` : ''}
                            </Text>
                            {photos.length > 1 && (
                                <View style={styles.navRow}>
                                    <TouchableOpacity onPress={() => go(-1)} style={styles.navBtn}><ChevronLeft size={24} color="#FFFFFF" /></TouchableOpacity>
                                    <View style={styles.dotsRow}>
                                        {photos.map((_, i) => <View key={i} style={[styles.dot, i === index && styles.dotActive]} />)}
                                    </View>
                                    <TouchableOpacity onPress={() => go(1)} style={styles.navBtn}><ChevronRight size={24} color="#FFFFFF" /></TouchableOpacity>
                                </View>
                            )}
                        </View>
                    </>
                )}
            </View>
        </Modal>
    );
};

export default NativePhotoViewer;

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', justifyContent: 'center', alignItems: 'center' },
    img: { width: '92%', height: '72%' },
    topBar: { position: 'absolute', top: 48, left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    roundBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.12)', justifyContent: 'center', alignItems: 'center' },
    deleteBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(239,68,68,0.8)', justifyContent: 'center', alignItems: 'center' },
    footer: { position: 'absolute', bottom: 40, left: 16, right: 16, alignItems: 'center', gap: 12 },
    dateText: { color: '#FFFFFF', fontSize: 11, fontFamily: 'Outfit_900Black', textTransform: 'uppercase', letterSpacing: 1, backgroundColor: 'rgba(255,255,255,0.1)', paddingVertical: 4, paddingHorizontal: 12, borderRadius: 10, overflow: 'hidden' },
    navRow: { width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    navBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
    dotsRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', justifyContent: 'center', flex: 1, paddingHorizontal: 8 },
    dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.3)' },
    dotActive: { width: 16, backgroundColor: '#FFFFFF' },
});
