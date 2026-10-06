/**
 * InjectionService
 * Gerencia a lógica de rotação de locais de aplicação e sugestões inteligentes.
 *
 * `area` e `side` são chaves estáveis (não texto de tela); os nomes exibidos
 * vêm das traduções `sites.<id>` / `sitesShort.<id>` — ver siteLabel().
 */

import { MOCK_MEDICATIONS } from '../constants/medications';

export const SITES = [
    { id: 'abdomen-left', area: 'abdomen', side: 'left', icon: '📍' },
    { id: 'abdomen-right', area: 'abdomen', side: 'right', icon: '📍' },
    { id: 'thigh-left', area: 'thigh', side: 'left', icon: '🦵' },
    { id: 'thigh-right', area: 'thigh', side: 'right', icon: '🦵' },
    { id: 'arm-left', area: 'arm', side: 'left', icon: '💪' },
    { id: 'arm-right', area: 'arm', side: 'right', icon: '💪' },
];

const SITE_IDS = new Set(SITES.map((s) => s.id));

/**
 * Sugere o próximo local de aplicação baseado no histórico.
 * Regra: Não repetir o mesmo local nas últimas 3 aplicações.
 * Prioridade: Abdômen -> Coxa -> Braço.
 */
export const suggestNextInjection = (history = []) => {
    if (!history || history.length === 0) {
        return SITES[0]; // Default: Abdômen Esquerdo
    }

    const recentIds = history.slice(0, 3).map(i => i.siteId);

    // Filtrar opções disponíveis (não usadas recentemente)
    const available = SITES.filter(s => !recentIds.includes(s.id));

    if (available.length > 0) {
        // Priorizar Abdômen, depois alternar
        const abdomenOptions = available.filter(s => s.area === 'abdomen');
        if (abdomenOptions.length > 0) return abdomenOptions[0];

        const thighOptions = available.filter(s => s.area === 'thigh');
        if (thighOptions.length > 0) return thighOptions[0];

        return available[0];
    }

    // Fallback: Pegar o menos recentemente usado (o último da lista de histórico que aparece)
    const lastUsed = history[history.length - 1];
    return SITES.find(s => s.id !== lastUsed.siteId) || SITES[0];
};

export const getSiteById = (id) => SITES.find(s => s.id === id) || SITES[0];

/**
 * Nome exibível do local de uma dose registrada. Aceita registros novos
 * (siteId / site com o id, area 'oral') e antigos, gravados com texto em
 * português ("Abdômen", "Não registrado"), que são mostrados como estão.
 */
export const siteLabel = (t, dose) => {
    const id = dose?.siteId || dose?.site;
    if (SITE_IDS.has(id)) return t(`sites.${id}`);
    // Comprimidos não têm local: o rótulo vem da via da medicação registrada.
    const med = MOCK_MEDICATIONS.find((m) => m.id === dose?.medication);
    if (dose?.area === 'oral' || id === 'oral' || med?.route === 'oral') return t('sites.oral');
    const legacy = dose?.area || dose?.site;
    if (legacy && legacy !== 'not_recorded' && legacy !== 'Não registrado') return legacy;
    return t('common.notRecorded');
};
