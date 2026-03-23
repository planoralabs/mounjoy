export const MOCK_MEDICATIONS = [
    // 1. Semaglutida
    {
        id: 'wegovy-pill',
        name: 'Wegovy Pill',
        brand: 'Wegovy',
        substance: 'Semaglutida',
        route: 'oral',
        frequency: 'daily',
        focus: 'weight',
        doses: ['7 mg', '14 mg', '25 mg', '50 mg'],
        color: 'bg-brand-600',
        description: 'Versão oral de alta dose para perda de peso.'
    },
    {
        id: 'wegovy',
        name: 'Wegovy',
        brand: 'Wegovy',
        substance: 'Semaglutida',
        route: 'injectable',
        frequency: 'weekly',
        focus: 'weight',
        doses: ['0.25 mg', '0.5 mg', '1.0 mg', '1.7 mg', '2.4 mg'],
        color: 'bg-brand-500',
        description: 'Injetável semanal focado em obesidade.'
    },
    {
        id: 'ozempic',
        name: 'Ozempic',
        brand: 'Ozempic',
        substance: 'Semaglutida',
        route: 'injectable',
        frequency: 'weekly',
        focus: 'diabetes',
        doses: ['0.25 mg', '0.5 mg', '1.0 mg', '2.0 mg'],
        color: 'bg-blue-600',
        description: 'Injetável semanal para diabetes e peso.'
    },
    {
        id: 'rybelsus',
        name: 'Rybelsus',
        brand: 'Rybelsus',
        substance: 'Semaglutida',
        route: 'oral',
        frequency: 'daily',
        focus: 'diabetes',
        doses: ['3 mg', '7 mg', '14 mg'],
        color: 'bg-blue-500',
        description: 'Comprimido diário para Diabetes Tipo 2.'
    },
    {
        id: 'povitztra',
        name: 'Povitztra',
        brand: 'Povitztra',
        substance: 'Semaglutida',
        route: 'injectable',
        frequency: 'weekly',
        focus: 'weight',
        doses: ['0.25 mg', '0.5 mg', '1.0 mg'],
        color: 'bg-cyan-600',
        description: 'Marca regional (Brasil) focada em obesidade.'
    },
    {
        id: 'extensior',
        name: 'Extensior',
        brand: 'Extensior',
        substance: 'Semaglutida',
        route: 'injectable',
        frequency: 'weekly',
        focus: 'diabetes',
        doses: ['0.25 mg', '0.5 mg', '1.0 mg'],
        color: 'bg-cyan-500',
        description: 'Marca regional (Brasil) para diabetes.'
    },

    // 2. Tirzepatida
    {
        id: 'zepbound',
        name: 'Zepbound',
        brand: 'Zepbound',
        substance: 'Tirzepatida',
        route: 'injectable',
        frequency: 'weekly',
        focus: 'weight',
        doses: ['2.5 mg', '5.0 mg', '7.5 mg', '10.0 mg', '12.5 mg', '15.0 mg'],
        color: 'bg-emerald-600',
        description: 'Focado em perda de peso crônica.'
    },
    {
        id: 'mounjaro',
        name: 'Mounjaro',
        brand: 'Mounjaro',
        substance: 'Tirzepatida',
        route: 'injectable',
        frequency: 'weekly',
        focus: 'diabetes',
        doses: ['2.5 mg', '5.0 mg', '7.5 mg', '10.0 mg', '12.5 mg', '15.0 mg'],
        color: 'bg-emerald-500',
        description: 'Alta eficácia para peso e diabetes.'
    },

    // 3. Liraglutida
    {
        id: 'saxenda',
        name: 'Saxenda',
        brand: 'Saxenda',
        substance: 'Liraglutida',
        route: 'injectable',
        frequency: 'daily',
        focus: 'weight',
        doses: ['0.6 mg', '1.2 mg', '1.8 mg', '2.4 mg', '3.0 mg'],
        color: 'bg-indigo-600',
        description: 'Injetável diário para obesidade.'
    },
    {
        id: 'victoza',
        name: 'Victoza',
        brand: 'Victoza',
        substance: 'Liraglutida',
        route: 'injectable',
        frequency: 'daily',
        focus: 'diabetes',
        doses: ['0.6 mg', '1.2 mg', '1.8 mg'],
        color: 'bg-indigo-500',
        description: 'Injetável diário para Diabetes Tipo 2.'
    },
    {
        id: 'lirux',
        name: 'Lirux',
        brand: 'Lirux',
        substance: 'Liraglutida',
        route: 'injectable',
        frequency: 'daily',
        focus: 'diabetes',
        doses: ['0.6 mg', '1.2 mg', '1.8 mg'],
        color: 'bg-purple-600',
        description: 'Marca regional (Brasil) para diabetes.'
    },
    {
        id: 'olire',
        name: 'Olire',
        brand: 'Olire',
        substance: 'Liraglutida',
        route: 'injectable',
        frequency: 'daily',
        focus: 'weight',
        doses: ['0.6 mg', '1.2 mg', '1.8 mg', '2.4 mg', '3.0 mg'],
        color: 'bg-purple-500',
        description: 'Marca regional (Brasil) para obesidade.'
    },

    // 4. Dulaglutida
    {
        id: 'trulicity',
        name: 'Trulicity',
        brand: 'Trulicity',
        substance: 'Dulaglutida',
        route: 'injectable',
        frequency: 'weekly',
        focus: 'diabetes',
        doses: ['0.75 mg', '1.5 mg', '3.0 mg', '4.5 mg'],
        color: 'bg-rose-500',
        description: 'Injetável semanal para Diabetes Tipo 2.'
    },

    // 5. Combinações com Insulina
    {
        id: 'soliqua',
        name: 'Soliqua',
        brand: 'Soliqua',
        substance: 'Glargina + Lixisenatida',
        route: 'injectable',
        frequency: 'daily',
        focus: 'diabetes',
        doses: ['10-40 unidades', '30-60 unidades'],
        color: 'bg-orange-600',
        description: 'Combinação focada em Diabetes Tipo 2.'
    },
    {
        id: 'xultophy',
        name: 'Xultophy',
        brand: 'Xultophy',
        substance: 'Degludeca + Liraglutida',
        route: 'injectable',
        frequency: 'daily',
        focus: 'diabetes',
        doses: ['Até 50 unidades'],
        color: 'bg-orange-500',
        description: 'Associação de insulina com GLP-1.'
    }
];
