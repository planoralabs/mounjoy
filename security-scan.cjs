const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * 🛡️ Mounjoy Security Scanner
 * Executa auditoria de bibliotecas e busca vazamentos de logs/dados.
 */

console.log('🚀 Iniciando Varredura de Segurança OWASP...');

// 1. Audit de Bibliotecas (Pillar 06)
console.log('\n📦 Verificando vulnerabilidades em bibliotecas (npm audit)...');
try {
    execSync('npm audit', { stdio: 'inherit' });
    console.log('✅ Bibliotecas seguras!');
} catch (error) {
    console.warn('⚠️ Foram encontradas vulnerabilidades que precisam de atenção.');
}

// 2. Scan de Logs e Segredos (Pillar 05/09)
console.log('\n🔍 Buscando vazamentos de depuração e segredos...');
const DANGEROUS_PATTERNS = [
    { pattern: /console\.log\(/g, name: 'Logs de depuração (console.log)' },
    { pattern: /TODO|FIXME/g, name: 'Notas de desenvolvimento (TODO/FIXME)' },
    { pattern: /apiKey:\s*["'].+["']/g, name: 'Possível chave de API exposta' },
    { pattern: /password:\s*["'].+["']/g, name: 'Possível senha hardcoded' }
];

const srcPath = path.join(__dirname, 'src');

function scanDir(directory) {
    const files = fs.readdirSync(directory);
    files.forEach(file => {
        const fullPath = path.join(directory, file);
        if (fs.statSync(fullPath).isDirectory()) {
            if (file !== 'node_modules' && file !== '.git') {
                scanDir(fullPath);
            }
        } else if (file.endsWith('.js') || file.endsWith('.jsx')) {
            const content = fs.readFileSync(fullPath, 'utf8');
            DANGEROUS_PATTERNS.forEach(p => {
                const matches = content.match(p.pattern);
                if (matches) {
                    console.warn(`[Vulnerabilidade: ${p.name}] encontrada em: ${path.relative(__dirname, fullPath)} (${matches.length} ocorrências)`);
                }
            });
        }
    });
}

try {
    scanDir(srcPath);
    console.log('\n✅ Scan de arquivos concluído!');
} catch (error) {
    console.error('❌ Erro durante o scan de arquivos:', error.message);
}

console.log('\n🛡️ Varredura finalizada. Recomenda-se rodar este script semanalmente.');
