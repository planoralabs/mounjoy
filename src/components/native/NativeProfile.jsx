import React, { useState, useMemo } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    ScrollView, 
    TouchableOpacity, 
    SafeAreaView, 
    Platform, 
    Image, 
    TextInput,
    Switch
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Button, Modal, Input } from './NativeUI';
import NativeBodySelector from './NativeBodySelector';
import { 
    User, 
    Shield, 
    Key, 
    AlertCircle, 
    ChevronRight, 
    LogOut, 
    Bell, 
    Settings, 
    Scale, 
    Camera, 
    Check, 
    TrendingUp 
} from 'lucide-react-native';
import { MOCK_MEDICATIONS } from '../../constants/medications';
import { suggestNextInjection, getSiteById } from '../../services/InjectionService';

const MenuItem = ({ icon: Icon, label, subLabel, onPress, color = '#64748B' }) => (
    <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.7}>
        <View style={styles.menuItemLeft}>
            <View style={[styles.menuIconBox, { backgroundColor: color + '15' }]}>
                <Icon size={20} color={color} />
            </View>
            <View>
                <Text style={styles.menuLabel}>{label}</Text>
                {subLabel && <Text style={styles.menuSubLabel}>{subLabel}</Text>}
            </View>
        </View>
        <ChevronRight size={18} color="#CBD5E1" />
    </TouchableOpacity>
);

const NativeProfile = ({ user, setUser, onLogout, theme, setTheme }) => {
    const [showProtocolModal, setShowProtocolModal] = useState(false);
    const [showMeasureModal, setShowMeasureModal] = useState(false);
    const [showReminderModal, setShowReminderModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteStep, setDeleteStep] = useState(1);
    const [isDeleting, setIsDeleting] = useState(false);

    const [selectedMed, setSelectedMed] = useState(user.medicationId || 'ozempic');
    const [selectedDose, setSelectedDose] = useState(user.currentDose || '0.25 mg');
    const [routeFilter, setRouteFilter] = useState('all');
    const [selectedSiteId, setSelectedSiteId] = useState(null);
    const [measures, setMeasures] = useState({ waist: '', hip: '' });

    const [reminderSettings, setReminderSettings] = useState({
        enabled: user.settings?.remindersEnabled ?? true,
        time: user.settings?.reminderTime || '09:00'
    });

    const filteredMeds = useMemo(() => {
        if (routeFilter === 'all') return MOCK_MEDICATIONS;
        return MOCK_MEDICATIONS.filter(m => m.route === routeFilter);
    }, [routeFilter]);

    const injectionSuggestion = useMemo(() => {
        return suggestNextInjection(user.doseHistory || []);
    }, [user.doseHistory]);

    const currentMedInfo = useMemo(() => {
        return MOCK_MEDICATIONS.find(m => m.id === selectedMed) || MOCK_MEDICATIONS[0];
    }, [selectedMed]);

    const handlePhotoPick = async () => {
        const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (permissionResult.granted === false) {
            alert("Você precisa permitir acesso à galeria de fotos para alterar a foto de perfil!");
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.7,
            base64: true,
        });

        if (!result.canceled && result.assets && result.assets[0].base64) {
            const base64Url = `data:image/webp;base64,${result.assets[0].base64}`;
            setUser({
                ...user,
                photoURL: base64Url
            });
        }
    };

    const handleUpdateProtocol = () => {
        setUser({
            ...user,
            medicationId: selectedMed,
            currentDose: selectedDose
        });
        setShowProtocolModal(false);
    };

    const handleSaveMeasures = () => {
        const now = new Date().toISOString();
        setUser({
            ...user,
            measurements: [
                {
                    date: now,
                    waist: parseFloat(measures.waist) || 0,
                    hip: parseFloat(measures.hip) || 0,
                    weight: user.currentWeight
                },
                ...(user.measurements || [])
            ]
        });
        setShowMeasureModal(false);
        setMeasures({ waist: '', hip: '' });
    };



    const handleSaveReminders = () => {
        setUser({
            ...user,
            settings: {
                ...(user.settings || {}),
                remindersEnabled: reminderSettings.enabled,
                reminderTime: reminderSettings.time
            }
        });
        setShowReminderModal(false);
    };

    const updateGoal = (key, value) => {
        setUser({
            ...user,
            settings: {
                ...(user.settings || {}),
                [key]: value
            }
        });
    };

    const handleDeleteAccount = async () => {
        setIsDeleting(true);
        // Emulador local / Limpeza do estado
        setTimeout(() => {
            setIsDeleting(false);
            setShowDeleteModal(false);
            onLogout && onLogout();
        }, 1500);
    };

    const siteOptions = [
        { id: 'arm-right', name: 'Braço Direito' },
        { id: 'arm-left', name: 'Braço Esquerdo' },
        { id: 'abdomen-left', name: 'Abdômen Esquerdo' },
        { id: 'abdomen-right', name: 'Abdômen Direito' },
        { id: 'thigh-right', name: 'Coxa Direita' },
        { id: 'thigh-left', name: 'Coxa Esquerda' }
    ];

    const currentMedicationDisplay = user.medicationId ? (user.medicationId.charAt(0).toUpperCase() + user.medicationId.slice(1)) : 'Protocolo';

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                
                {/* Profile Header */}
                <View style={styles.profileHeader}>
                    <View style={styles.avatarLargeContainer}>
                        <TouchableOpacity style={styles.avatarLarge} onPress={handlePhotoPick}>
                            {user.photoURL ? (
                                <Image source={{ uri: user.photoURL }} style={styles.avatarImage} />
                            ) : (
                                <Text style={styles.avatarTextLarge}>{user.name?.charAt(0).toUpperCase() || 'U'}</Text>
                            )}
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.cameraBadge} onPress={handlePhotoPick}>
                            <Camera size={16} color="#64748B" />
                        </TouchableOpacity>
                    </View>
                    <Text style={styles.profileName}>{user.name || 'Usuário Mounjoy'}</Text>
                    <Text style={styles.profileMeta}>
                        Protocolo • {currentMedicationDisplay} ({user.currentDose || 'N/A'})
                    </Text>
                </View>



                {/* Health Goals Card */}
                <View style={styles.goalsCard}>
                    <View style={styles.goalsHeader}>
                        <TrendingUp size={18} color="#EA580C" />
                        <Text style={styles.goalsTitle}>Metas de Saúde</Text>
                    </View>

                    <View style={styles.goalsGrid}>
                        <View style={styles.goalRow}>
                            <Text style={styles.goalLabel}>Proteína (g)</Text>
                            <View style={styles.goalControlRow}>
                                <TouchableOpacity 
                                    onPress={() => updateGoal('proteinGoal', Math.max(40, (user.settings?.proteinGoal || 100) - 5))}
                                    style={styles.goalBtn}
                                >
                                    <Text style={styles.goalBtnText}>−</Text>
                                </TouchableOpacity>
                                <Text style={styles.goalValue}>{user.settings?.proteinGoal || 100}</Text>
                                <TouchableOpacity 
                                    onPress={() => updateGoal('proteinGoal', (user.settings?.proteinGoal || 100) + 5)}
                                    style={styles.goalBtn}
                                >
                                    <Text style={styles.goalBtnText}>+</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View style={styles.goalRow}>
                            <Text style={styles.goalLabel}>Água (Litros)</Text>
                            <View style={styles.goalControlRow}>
                                <TouchableOpacity 
                                    onPress={() => updateGoal('waterGoal', Math.max(1, (user.settings?.waterGoal || 2.5) - 0.1))}
                                    style={styles.goalBtn}
                                >
                                    <Text style={styles.goalBtnText}>−</Text>
                                </TouchableOpacity>
                                <Text style={styles.goalValue}>{(user.settings?.waterGoal || 2.5).toFixed(1)}</Text>
                                <TouchableOpacity 
                                    onPress={() => updateGoal('waterGoal', (user.settings?.waterGoal || 2.5) + 0.1)}
                                    style={styles.goalBtn}
                                >
                                    <Text style={styles.goalBtnText}>+</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>

                    <View style={styles.fiberDivider} />

                    <View style={styles.goalFullRow}>
                        <Text style={styles.goalLabel}>Fibra (g)</Text>
                        <View style={styles.goalControlRow}>
                            <TouchableOpacity 
                                onPress={() => updateGoal('fiberGoal', Math.max(10, (user.settings?.fiberGoal || 25) - 1))}
                                style={styles.goalBtn}
                            >
                                <Text style={styles.goalBtnText}>−</Text>
                            </TouchableOpacity>
                            <Text style={styles.goalValue}>{user.settings?.fiberGoal || 25}</Text>
                            <TouchableOpacity 
                                onPress={() => updateGoal('fiberGoal', (user.settings?.fiberGoal || 25) + 1)}
                                style={styles.goalBtn}
                            >
                                <Text style={styles.goalBtnText}>+</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                {/* Settings list */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Ajustes e Medidas</Text>
                    <View style={styles.card}>
                        <MenuItem icon={Settings} label="Configurar Protocolo" subLabel="Medicamento e Dosagem atual" onPress={() => setShowProtocolModal(true)} color="#EA580C" />
                        <MenuItem icon={Scale} label="Progresso Corporal (Medidas)" subLabel="Acompanhar medidas corporais" onPress={() => setShowMeasureModal(true)} color="#3B82F6" />
                        <MenuItem icon={Bell} label="Lembretes" subLabel="Horários dos lembretes de dose" onPress={() => setShowReminderModal(true)} color="#F59E0B" />
                    </View>
                </View>

                {/* Danger Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Conta</Text>
                    <View style={styles.card}>
                        <MenuItem icon={LogOut} label="Sair da Conta" subLabel="Desconectar do dispositivo" onPress={onLogout} color="#EF4444" />
                    </View>
                    <TouchableOpacity 
                        style={styles.deleteLink}
                        onPress={() => { setDeleteStep(1); setShowDeleteModal(true); }}
                    >
                        <Text style={styles.deleteLinkText}>Apagar Minha Conta e Dados Permanentemente</Text>
                    </TouchableOpacity>
                </View>

            </ScrollView>

            {/* Modal: Configurar Protocolo */}
            <Modal visible={showProtocolModal} onClose={() => setShowProtocolModal(false)} title="Configurar Protocolo">
                <View style={styles.routeSelectorRow}>
                    <TouchableOpacity onPress={() => setRouteFilter('all')} style={[styles.routeBtn, routeFilter === 'all' && styles.routeBtnActive]}>
                        <Text style={[styles.routeBtnText, routeFilter === 'all' && styles.routeBtnTextActive]}>Todos</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setRouteFilter('injectable')} style={[styles.routeBtn, routeFilter === 'injectable' && styles.routeBtnActive]}>
                        <Text style={[styles.routeBtnText, routeFilter === 'injectable' && styles.routeBtnTextActive]}>Injetável</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setRouteFilter('oral')} style={[styles.routeBtn, routeFilter === 'oral' && styles.routeBtnActive]}>
                        <Text style={[styles.routeBtnText, routeFilter === 'oral' && styles.routeBtnTextActive]}>Via Oral</Text>
                    </TouchableOpacity>
                </View>

                <Text style={styles.modalSubLabelText}>Medicamento</Text>
                <View style={styles.medGrid}>
                    {filteredMeds.map(med => (
                        <TouchableOpacity 
                            key={med.id} 
                            onClick={() => { setSelectedMed(med.id); setSelectedDose(med.doses[0]); }}
                            onPress={() => { setSelectedMed(med.id); setSelectedDose(med.doses[0]); }}
                            style={[styles.medChip, selectedMed === med.id && styles.medChipActive]}
                        >
                            <Text style={[styles.medChipText, selectedMed === med.id && styles.medChipTextActive]}>
                                {med.name}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <Text style={styles.modalSubLabelText}>Dosagem</Text>
                <View style={styles.doseGrid}>
                    {currentMedInfo?.doses.map(dose => (
                        <TouchableOpacity 
                            key={dose} 
                            onClick={() => setSelectedDose(dose)}
                            onPress={() => setSelectedDose(dose)}
                            style={[styles.doseChip, selectedDose === dose && styles.doseChipActive]}
                        >
                            <Text style={[styles.doseChipText, selectedDose === dose && styles.doseChipTextActive]}>
                                {dose}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <Button onClick={handleUpdateProtocol} style={{ width: '100%', marginTop: 16 }}>
                    Salvar Alterações
                </Button>
            </Modal>

            {/* Modal: Progresso Corporal (Medidas) */}
            <Modal visible={showMeasureModal} onClose={() => setShowMeasureModal(false)} title="Progresso Corporal">
                <Text style={styles.modalIntroText}>Monitore suas medidas para ver a perda de gordura além da balança.</Text>
                <View style={styles.measuresInputRow}>
                    <View style={{ flex: 1 }}>
                        <Input 
                            label="Cintura (cm)" 
                            placeholder="Ex: 80" 
                            value={measures.waist} 
                            onChangeText={(val) => setMeasures({ ...measures, waist: val })}
                            keyboardType="numeric"
                        />
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                        <Input 
                            label="Quadril (cm)" 
                            placeholder="Ex: 95" 
                            value={measures.hip} 
                            onChangeText={(val) => setMeasures({ ...measures, hip: val })}
                            keyboardType="numeric"
                        />
                    </View>
                </View>

                <Button onClick={handleSaveMeasures} style={{ width: '100%', marginTop: 16 }}>
                    Salvar Medidas
                </Button>
            </Modal>

            {/* Modal: Lembretes */}
            <Modal visible={showReminderModal} onClose={() => setShowReminderModal(false)} title="Configurar Lembretes">
                <View style={styles.reminderToggleRow}>
                    <View>
                        <Text style={styles.reminderToggleTitle}>Notificações</Text>
                        <Text style={styles.reminderToggleSub}>Alertas no dispositivo</Text>
                    </View>
                    <Switch 
                        value={reminderSettings.enabled}
                        onValueChange={(val) => setReminderSettings({ ...reminderSettings, enabled: val })}
                        thumbColor={Platform.OS === 'android' ? '#EA580C' : undefined}
                        trackColor={{ true: '#FFEDD5' }}
                    />
                </View>

                <View style={{ marginTop: 16 }}>
                    <Input 
                        label="Horário Preferencial"
                        placeholder="Ex: 09:00"
                        value={reminderSettings.time}
                        onChangeText={(val) => setReminderSettings({ ...reminderSettings, time: val })}
                    />
                    <Text style={styles.reminderInfoTip}>Este é o horário que o banner aparecerá no seu dia de dose.</Text>
                </View>

                <Button onClick={handleSaveReminders} style={{ width: '100%', marginTop: 20 }}>
                    Salvar Configurações
                </Button>
            </Modal>



            {/* Modal: Confirmação de Exclusão */}
            <Modal visible={showDeleteModal} onClose={() => !isDeleting && setShowDeleteModal(false)} title={deleteStep === 1 ? "🚨 Aviso Importante" : "⚠️ Última Chance"}>
                <View style={styles.deleteModalContent}>
                    <View style={styles.deleteAlertBox}>
                        <Text style={styles.deleteAlertTitle}>Ação Irreversível</Text>
                        <Text style={styles.deleteAlertDesc}>
                            {deleteStep === 1 
                                ? "Ao apagar sua conta, todas as suas fotos de evolução, registros de doses, peso e histórico clínico serão DELETADOS PARA SEMPRE."
                                : "Nós NÃO poderemos recuperar seus dados caso você mude de ideia depois. Você tem certeza ABSOLUTA de que deseja prosseguir?"}
                        </Text>
                    </View>

                    <View style={{ gap: 12, width: '100%' }}>
                        {deleteStep === 1 ? (
                            <Button onClick={() => setDeleteStep(2)} style={{ backgroundColor: '#EF4444' }}>
                                Eu entendo, quero prosseguir
                            </Button>
                        ) : (
                            <Button onClick={handleDeleteAccount} disabled={isDeleting} style={{ backgroundColor: '#7F1D1D' }}>
                                {isDeleting ? "Apagando tudo..." : "APAGAR TUDO AGORA"}
                            </Button>
                        )}
                        <TouchableOpacity onPress={() => setShowDeleteModal(false)} style={styles.cancelLink} disabled={isDeleting}>
                            <Text style={styles.cancelLinkText}>Cancelar e Voltar</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

        </SafeAreaView>
    );
};

export default NativeProfile;

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FAF7F2' },
    scroll: { padding: 24, paddingBottom: 120 },
    profileHeader: { alignItems: 'center', marginBottom: 24, marginTop: Platform.OS === 'android' ? 20 : 0 },
    avatarLargeContainer: {
        position: 'relative',
        width: 100, 
        height: 100,
        marginBottom: 16,
    },
    avatarLarge: { 
        width: '100%', 
        height: '100%', 
        borderRadius: 40, 
        backgroundColor: '#fff', 
        borderWidth: 1, 
        borderColor: '#E2E8F0', 
        justifyContent: 'center', 
        alignItems: 'center', 
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        overflow: 'hidden',
    },
    avatarImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    cameraBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 3,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    avatarTextLarge: { fontSize: 40, fontFamily: 'Outfit_900Black', color: '#EA580C' },
    profileName: { fontSize: 24, fontFamily: 'Outfit_700Bold', color: '#0F172A' },
    profileMeta: { fontSize: 13, fontFamily: 'Outfit_600SemiBold', color: '#94A3B8', marginTop: 4 },

    primaryActionCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 32,
        padding: 20,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        marginBottom: 20,
        elevation: 2,
    },
    primaryActionLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
    },
    primaryActionIconBox: {
        width: 48,
        height: 48,
        borderRadius: 16,
        backgroundColor: '#FFF7ED',
        justifyContent: 'center',
        alignItems: 'center',
    },
    primaryActionTitle: {
        fontSize: 16,
        fontFamily: 'Outfit_700Bold',
        color: '#0F172A',
    },
    primaryActionSub: {
        fontSize: 11,
        fontFamily: 'Outfit_600SemiBold',
        color: '#94A3B8',
        marginTop: 2,
    },

    // Goals Card
    goalsCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 32,
        padding: 20,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        marginBottom: 24,
    },
    goalsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 16,
    },
    goalsTitle: {
        fontSize: 14,
        fontFamily: 'Outfit_700Bold',
        color: '#0F172A',
    },
    goalsGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 12,
    },
    goalRow: {
        flex: 1,
    },
    goalFullRow: {
        width: '100%',
    },
    goalLabel: {
        fontSize: 10,
        fontFamily: 'Outfit_900Black',
        color: '#94A3B8',
        textTransform: 'uppercase',
        marginBottom: 8,
    },
    goalControlRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        borderRadius: 16,
        padding: 4,
    },
    goalBtn: {
        width: 36,
        height: 36,
        borderRadius: 12,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    goalBtnText: {
        fontSize: 18,
        fontFamily: 'Outfit_700Bold',
        color: '#64748B',
    },
    goalValue: {
        flex: 1,
        textAlign: 'center',
        fontSize: 14,
        fontFamily: 'Outfit_900Black',
        color: '#0F172A',
    },
    fiberDivider: {
        height: 1,
        backgroundColor: '#F1F5F9',
        marginVertical: 16,
    },

    section: { marginBottom: 24 },
    sectionTitle: { fontSize: 11, fontFamily: 'Outfit_900Black', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12, marginLeft: 12 },
    card: { 
        backgroundColor: '#FFFFFF', 
        borderRadius: 32, 
        paddingVertical: 10, 
        borderWidth: 1, 
        borderColor: '#F1F5F9',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.02,
        shadowRadius: 8,
        elevation: 2,
    },
    menuItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 20 },
    menuItemLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    menuIconBox: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    menuLabel: { fontSize: 15, fontFamily: 'Outfit_700Bold', color: '#0F172A' },
    menuSubLabel: { fontSize: 11, fontFamily: 'Outfit_600SemiBold', color: '#94A3B8', marginTop: 2 },

    deleteLink: {
        alignItems: 'center',
        marginTop: 16,
    },
    deleteLinkText: {
        fontSize: 11,
        fontFamily: 'Outfit_700Bold',
        color: '#CBD5E1',
        textDecorationLine: 'underline',
    },

    // Modal styles
    routeSelectorRow: {
        flexDirection: 'row',
        backgroundColor: '#F1F5F9',
        borderRadius: 16,
        padding: 4,
        marginBottom: 16,
    },
    routeBtn: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 12,
        alignItems: 'center',
    },
    routeBtnActive: {
        backgroundColor: '#FFFFFF',
        elevation: 1,
    },
    routeBtnText: {
        fontSize: 12,
        fontFamily: 'Outfit_700Bold',
        color: '#64748B',
    },
    routeBtnTextActive: {
        color: '#EA580C',
    },
    modalSubLabelText: {
        fontSize: 11,
        fontFamily: 'Outfit_900Black',
        color: '#94A3B8',
        textTransform: 'uppercase',
        marginTop: 16,
        marginBottom: 10,
    },
    medGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    medChip: {
        flex: 1,
        minWidth: '45%',
        paddingVertical: 12,
        borderRadius: 16,
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        alignItems: 'center',
    },
    medChipActive: {
        backgroundColor: '#EA580C',
        borderColor: '#EA580C',
    },
    medChipText: {
        fontSize: 13,
        fontFamily: 'Outfit_700Bold',
        color: '#475569',
    },
    medChipTextActive: {
        color: '#FFFFFF',
    },

    doseGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    doseChip: {
        flex: 1,
        minWidth: '28%',
        paddingVertical: 12,
        borderRadius: 16,
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        alignItems: 'center',
    },
    doseChipActive: {
        backgroundColor: '#EA580C',
        borderColor: '#EA580C',
    },
    doseChipText: {
        fontSize: 12,
        fontFamily: 'Outfit_700Bold',
        color: '#475569',
    },
    doseChipTextActive: {
        color: '#FFFFFF',
    },

    modalIntroText: {
        fontSize: 12,
        fontFamily: 'Outfit_600SemiBold',
        color: '#64748B',
        textAlign: 'center',
        marginBottom: 16,
    },
    measuresInputRow: {
        flexDirection: 'row',
    },

    reminderToggleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        padding: 16,
        borderRadius: 20,
    },
    reminderToggleTitle: {
        fontSize: 14,
        fontFamily: 'Outfit_700Bold',
        color: '#0F172A',
    },
    reminderToggleSub: {
        fontSize: 10,
        fontFamily: 'Outfit_600SemiBold',
        color: '#94A3B8',
        marginTop: 2,
    },
    reminderInfoTip: {
        fontSize: 10,
        fontFamily: 'Outfit_600SemiBold',
        color: '#94A3B8',
        fontStyle: 'italic',
        textAlign: 'center',
        marginTop: 8,
    },

    doseSummaryCard: {
        backgroundColor: '#F8FAFC',
        padding: 16,
        borderRadius: 20,
        alignItems: 'center',
        marginBottom: 16,
    },
    doseSummaryLabel: {
        fontSize: 10,
        fontFamily: 'Outfit_900Black',
        color: '#94A3B8',
        textTransform: 'uppercase',
    },
    doseSummaryValue: {
        fontSize: 22,
        fontFamily: 'Outfit_900Black',
        color: '#0F172A',
        marginTop: 4,
    },

    siteGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    siteChip: {
        width: '48%',
        paddingVertical: 12,
        borderRadius: 16,
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        alignItems: 'center',
    },
    siteChipActive: {
        backgroundColor: '#EA580C',
        borderColor: '#EA580C',
    },
    siteChipSuggested: {
        backgroundColor: '#E8F5E9',
        borderColor: '#C8E6C9',
    },
    siteChipText: {
        fontSize: 12,
        fontFamily: 'Outfit_700Bold',
        color: '#475569',
    },
    siteChipTextActive: {
        color: '#FFFFFF',
    },

    deleteModalContent: {
        alignItems: 'center',
        gap: 20,
    },
    deleteAlertBox: {
        backgroundColor: '#FEF2F2',
        borderRadius: 24,
        padding: 20,
        borderWidth: 1,
        borderColor: '#FEE2E2',
        alignItems: 'center',
    },
    deleteAlertTitle: {
        fontSize: 16,
        fontFamily: 'Outfit_900Black',
        color: '#EF4444',
        textTransform: 'uppercase',
        marginBottom: 8,
    },
    deleteAlertDesc: {
        fontSize: 13,
        fontFamily: 'Outfit_600SemiBold',
        color: '#7F1D1D',
        textAlign: 'center',
        lineHeight: 18,
    },
    cancelLink: {
        alignItems: 'center',
        paddingVertical: 8,
    },
    cancelLinkText: {
        fontSize: 12,
        fontFamily: 'Outfit_900Black',
        color: '#94A3B8',
        textTransform: 'uppercase',
    }
});
