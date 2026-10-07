# Arquitetura

Estado de outubro/2026. Para o histórico de decisões (migração do Vite,
desenho da análise de refeições, benchmark de modelos), veja
[`historico/mobile_documentation.md`](historico/mobile_documentation.md).

## 1. Visão geral

| Peça | Onde | O que faz |
|---|---|---|
| App | `App.js`, `src/` | Expo / React Native. Roda em iOS, Android (Expo Go) e web (react-native-web, mesmo código). |
| Backend | Supabase (`src/supabaseClient.js`) | Auth por e-mail, tabelas com RLS, busca de alimentos (RPC). |
| Análise de foto | `supabase/functions/analyze-meal-photo/` | Edge Function (Deno) que chama o Gemini com a chave guardada no servidor. |
| Base de alimentos | tabela `food_items` | TACO (pt) + USDA (en), carregada por `scripts/`. |
| Landing | `landing/` | Site de marketing (Vite), projeto e deploy separados. |
| Deploy web do app | Vercel (`vercel.json`) | `npm run build:web` → `dist/`. |

Não há roteador: a troca de tela é estado (`useState`) em `App.js`. Por isso
os testes usam `testID` em vez de URL.

## 2. Pastas

```
App.js                      raiz: sessão, persistência, abas, central de registros
src/
  components/native/        uma tela ou bloco por arquivo (Native*.jsx)
  services/                 acesso a dados e serviços (Supabase, notificações, alimentos)
  utils/                    lógica pura e testável (datas, metas, suplementos, lembretes…)
  constants/medications.js  catálogo de medicamentos, doses e via (injetável/oral)
  contexts/AuthContext.jsx  login / cadastro (Supabase Auth)
  i18n/                     i18next: locales/*.json (telas), native/*.json (permissões do sistema)
supabase/
  schema.sql                esquema completo (projeto novo roda só este arquivo)
  migrations/               mudanças incrementais, já aplicadas em produção
  functions/analyze-meal-photo/
  seed/food_items.csv       base de alimentos pronta para importar
scripts/                    build-food-seed.mjs, import-food-items.mjs
tests/unit/                 Vitest
tests/e2e/                  Playwright (Expo Web)
```

### Telas (`src/components/native/`)

| Arquivo | Papel |
|---|---|
| `NativeWelcome.jsx` | Primeira tela: login/cadastro, "Continuar" sem conta e, em dev, "Entrar com paciente teste". |
| `NativeOnboarding.jsx` | Configuração inicial (nome, unidades, corpo, meta, medicamento, dose, dia). |
| `NativeToday.jsx` | Aba **Hoje**. |
| `NativeJournal.jsx` | Aba **Diário** (calendário + linha do tempo do dia). |
| `NativeLogCenter.jsx` | Botão **+**: menu e modais de registro; também o "Configurar protocolo". |
| `NativeProgress.jsx` + `NativeProgressCharts.jsx` | Aba **Progresso** (gráficos de peso, medidas e nutrientes; fotos; doses). |
| `NativeProfile.jsx` | Aba **Perfil** (tratamento, metas, unidades, lembretes, suplementos, conta). |
| `NativeMealScan.jsx` | Registrar refeição (por foto ou digitando), revisão e banner minimizado. |
| `NativeFoodSearch.jsx` | Busca de alimentos, quantidade, criar alimento, código de barras. |
| `NativeSupplements.jsx` | Configuração de suplementos, card do Hoje e editor do Diário. |
| `NativeReminders.jsx` | Configuração dos lembretes (notificações locais). |
| `NativeBodySelector.jsx` | Mapa do corpo para escolher o local da aplicação. |
| `NativePhotoCompare.jsx` / `NativePhotoViewer.jsx` | Comparador antes/depois e visualizador de fotos. |
| `NativeUI.jsx` | Componentes base: `Modal`, `Button`, `Input`, `Slider`, `NumberStepper`. |

## 3. Os três modos de uso

| Modo | Como entra | Onde os dados ficam |
|---|---|---|
| **Convidado** | "Continuar" na primeira tela | Só no aparelho: AsyncStorage, chave `mounjoy_guest_user` (localStorage na web). Nada vai para a nuvem. |
| **Conta** | Login / cadastro por e-mail | Supabase. A cada mudança, `App.js` chama `userService.saveUserProfile`, que espelha o registro inteiro nas tabelas (ver §5). |
| **Paciente Teste** | "Entrar com paciente teste" (só em `__DEV__`) | Só em memória (`buildDemoUser()`); some ao recarregar. Nunca grava em lugar nenhum. |

Convidado que depois entra numa conta **sem perfil** leva os dados junto:
`App.js` sobe tudo para o Supabase e limpa o aparelho. Conta nova sem dados
locais passa pelo onboarding.

**Fotos de progresso ficam só no aparelho**, mesmo com conta (decisão da fase
de testes). Fotos de prato nunca são guardadas.

## 4. O registro do usuário

Tudo o que a tela mostra vem de um único objeto `user`, mantido em `App.js` e
alterado só com `setUser({ ...user, ... })`. Campos:

| Campo | Formato | Observação |
|---|---|---|
| `uid` | string | Só com conta. Sem `uid` = convidado. |
| `isDemo` | `true` | Só no Paciente Teste. |
| `name`, `email`, `photoURL` | string | |
| `medicationId` | chave de `MOCK_MEDICATIONS` | ex.: `mounjaro`, `ozempic`, `wegovy-pill` |
| `currentDose` | string | ex.: `'5.0 mg'` |
| `injectionDay` | 0–6 | dia da semana da dose (0 = domingo) |
| `isMaintenance` | bool | |
| `height` | metros (string/número) | |
| `startWeight`, `goalWeight`, `currentWeight` | kg | |
| `startDate`, `lastWeightDate` | ISO | |
| `measurements` | `[{ date, weight, waist?, hip? }]` | pesagem (`weight > 0`) ou medida corporal (`weight: 0`, cm) |
| `doseHistory` | `[{ date, dose, medication, siteId, site, area, side }]` | `siteId` ex.: `abdomen-left` |
| `sideEffectsLogs` | `[{ date, symptoms[], foodNoise?, trigger, note, isMemoryOnly? }]` | "Como você se sente?"; só anotação = `isMemoryOnly` |
| `photos` | `[{ url, date }]` | fotos de progresso (só no aparelho) |
| `dailyIntakeHistory` | `{ 'AAAA-MM-DD': { water, protein, fiber, carbs, fat, calories } }` | água em litros, macros em g, calorias em kcal |
| `meals` | `[{ id, logged_at, items[], total_* }]` | **só convidado/teste**; com conta as refeições vão para a tabela `meal_logs` |
| `customFoods` | `[{ id, name, calories, protein, carbs, fat, fiber, barcode? }]` | "Criar alimento"; valores por 100 g, como no rótulo |
| `supplements` | `[{ id, name?, custom?, frequency, day?, nutrients? }]` | `frequency`: `daily`/`weekly`/`monthly`; `day`: dia da semana (semanal) ou do mês (mensal) |
| `supplementLogs` | `[{ date, supplementId, name }]` | cada dose marcada |
| `settings` | objeto | `proteinGoal`, `waterGoal` (L), `fiberGoal`, `calorieGoal`, `fatGoal`, `carbsGoal`, `unitSystem` (`metric`/`imperial`), `reminders` (ver §8) |

Metas padrão quando a pessoa não definiu: proteína 100 g, água 2,5 L, fibra
25 g, calorias 1800 kcal, gorduras 60 g, carboidratos 150 g
(`nutrientGoal` em `src/utils/nutrition.js`).

**Refeição soma no dia na hora em que é salva.** Os totais da refeição são
somados em `dailyIntakeHistory[dia]`; ao apagar a refeição, eles são
subtraídos. O whey dos suplementos faz o mesmo a cada dose.

## 5. Supabase

### Tabelas

| Tabela | Conteúdo | Quem escreve |
|---|---|---|
| `profiles` | uma linha por conta: dados do onboarding, metas, unidades, lembretes (`reminder_settings`), `supplements`, `custom_foods` | o app (RLS: só o dono) |
| `measurements`, `dose_history`, `symptoms_logs`, `supplement_logs` | listas do registro do usuário | o app, espelhando a lista (insere novos, atualiza editados, apaga removidos; casados pela data/hora) |
| `daily_intake` | uma linha por dia (água, proteína, fibra, calorias, gorduras, carboidratos) | o app (upsert por `user_id,date`) |
| `meal_logs` | refeições de quem tem conta, com os itens e macros copiados no momento do registro | o app |
| `food_items` | base de referência (~8.000 alimentos TACO + USDA) | só scripts com service role; leitura pública |
| `meal_scan_usage`, `meal_scan_anon_usage`, `meal_scan_global_usage` | contadores de uso da análise de foto | só a Edge Function |

Funções: `search_food_items(q, pref_lang, max_results)` (busca sem acento,
tolerante a erro de digitação, idioma do usuário primeiro) e as de contagem
de uso da análise de foto.

### Migrações

`supabase/schema.sql` é o esquema completo, para criar um projeto do zero.
Mudanças em projeto existente vão em `supabase/migrations/`, aplicadas à mão no
SQL Editor do Supabase. As três atuais (`20261005_app_reorg`,
`20261006_reminders_supplements`, `20261007_food_search`) **já estão aplicadas
em produção** (conferido em 2026-10-07).

Regras: migração só acrescenta (`add column if not exists`, `create table if
not exists`); o mesmo trecho vai para `schema.sql`; no app, gravação de coluna
nova passa por `withNewerSchema` (`userService.js`), que ignora o erro de
"coluna não existe" para o app continuar funcionando se a migração ainda não
rodou.

### Edge Function `analyze-meal-photo`

Recebe a foto em base64, chama o Gemini (`GEMINI_API_KEY` é secret do
projeto) e devolve `{ items: [{ name, category, estimatedGrams, confidence,
caloriesPer100g… }] }`. A imagem não é salva. Hoje aceita chamadas **sem
login** (modo convidado), com três limites checados antes de gastar cota:

| Quem | Limite padrão | Secret para mudar |
|---|---|---|
| Conta | 20 por dia | `MEAL_SCAN_DAILY_LIMIT` |
| Sem login (por hash do IP) | 5 por dia | `MEAL_SCAN_ANON_DAILY_LIMIT` |
| O app inteiro | 300 por dia | `MEAL_SCAN_GLOBAL_DAILY_LIMIT` |
| Intervalo mínimo | 5 s | `MEAL_SCAN_MIN_SECONDS` |

Deploy: `npx supabase functions deploy analyze-meal-photo` (com o projeto
linkado).

### Base de alimentos

- `scripts/build-food-seed.mjs` gera `supabase/seed/food_items.csv` a partir
  da TACO 4ª ed. (pt) e da USDA SR Legacy + Foundation (en).
- `scripts/import-food-items.mjs` importa o CSV (precisa de
  `SUPABASE_SERVICE_ROLE_KEY` no ambiente; nunca no app).
- Código de barras: consulta o Open Food Facts direto do app; produto
  desconhecido abre "Criar alimento" e fica salvo em `customFoods`.
- Ordem de confiança na análise por foto: `food_items` (quando o nome casa com
  segurança) → estimativa do Gemini → "sem dados".

## 6. Idiomas (i18n)

- O app segue o idioma do aparelho; não há seletor. Idiomas: pt, en, es, fr,
  de, it. Idioma sem tradução cai em inglês. Na web, `?lng=de` força um idioma
  (para revisar traduções).
- Telas: `src/i18n/locales/*.json`. Textos de permissão do sistema iOS/Android:
  `src/i18n/native/*.json` (referenciados no `app.json`).
- `tests/unit/i18n.test.js` garante as mesmas chaves e placeholders em todos.
- Em português, "Food Noise" é **"Ruído alimentar"**; nos outros idiomas fica
  "Food Noise".

## 7. Unidades

Gravação sempre métrica. `unitsFor(user)` devolve as funções de conversão e
formatação para o sistema escolhido (`metric`: kg, cm, L, g / `imperial`: lb,
ft/in, in, fl oz, oz). O onboarding pré-seleciona pelo sistema do aparelho
(`src/i18n/resolve.js`); dá para trocar em Perfil.

## 8. Lembretes (notificações locais)

Sem servidor: o próprio aparelho dispara. `src/utils/reminders.js` monta o
plano (função pura, testada) a partir do registro e da hora atual;
`src/services/NotificationService.js` agenda. O app refaz o plano a cada
mudança do registro e ao voltar para o primeiro plano, então um lembrete cuja
tarefa já foi feita (dose registrada, meta de água batida, pesou hoje) some
sozinho. Tipos: dose (e dose atrasada), água (1–5 por dia), proteína e
pesagem. Horizonte de 3 dias (limite de 64 notificações pendentes do iOS).
Só iOS/Android.

## 9. Variáveis de ambiente

| Arquivo | Variáveis | Uso |
|---|---|---|
| `.env.local` (não versionado) | `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` | app (vão para o bundle, são públicas por natureza) |
| `.env.local` | `GEMINI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | só scripts locais; **nunca** com prefixo `EXPO_PUBLIC_` |
| `.env.test.local` (não versionado) | as mesmas, de um projeto Supabase **de teste** | e2e com conta (ver `docs/TESTES.md`) |
| Secrets do Supabase | `GEMINI_API_KEY`, limites `MEAL_SCAN_*` | Edge Function |
| Vercel | `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` | build web |

`.env.local.example` traz as duas variáveis do app.
