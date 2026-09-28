import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

// Resolvido a partir do cwd (não de import.meta.url) para que este arquivo
// possa ser carregado tanto como ESM quanto transpilado para CJS pelo
// loader de config do Playwright — os scripts em package.json sempre
// rodam a partir da raiz do projeto.
const rootDir = process.cwd();

/**
 * Parser mínimo de .env, sem dependência externa (evita depender de
 * `node --env-file`, que não existe em toda versão do Node, e evita a
 * dependência `dotenv` só para isso). Só usado para os testes E2E/seed —
 * o app em si (Vite/Expo) continua lendo `.env.local` normalmente.
 */
export function loadTestEnv() {
    const envPath = path.join(rootDir, '.env.test.local');
    if (!existsSync(envPath)) return;

    const content = readFileSync(envPath, 'utf-8');
    for (const line of content.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;

        const eq = trimmed.indexOf('=');
        if (eq === -1) continue;

        const key = trimmed.slice(0, eq).trim();
        let value = trimmed.slice(eq + 1).trim();
        const isQuoted =
            (value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"));
        if (isQuoted) value = value.slice(1, -1);

        if (!(key in process.env)) process.env[key] = value;
    }
    // Marca que o app vai falar com o projeto de TESTE: as specs que escrevem
    // no Supabase (login/cadastro) só rodam com esta flag — sem ela, pulam, em
    // vez de criar contas no projeto de produção do .env.local.
    process.env.MOUNJOY_E2E_TEST_ENV = '1';
}
