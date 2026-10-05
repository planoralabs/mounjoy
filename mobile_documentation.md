# Mounjoy Mobile - Documentação de Transição e Telas

Este documento serve como referência técnica detalhada sobre a transição do Mounjoy da versão Web (React + Vite + TailwindCSS) para a versão Mobile (React Native + Expo Go), documentando a arquitetura geral, estratégias de design, componentes e a implementação específica de cada tela.

---

## 1. Arquitetura e Estratégia de Transição

Para portar a experiência interativa e premium do Mounjoy para dispositivos móveis, escolhemos a plataforma **Expo + React Native**, que nos fornece:
- **Hot Reloading rápido** via Expo Go para iterar rapidamente no visual.
- **Acesso nativo** a recursos de hardware (como `ImagePicker` para fotos de evolução).
- **Paridade estilística**: Embora o React Native use `StyleSheet` (baseado em Flexbox) ao invés do TailwindCSS do Web, reproduzimos detalhadamente a paleta de cores (laranja de marca `#EA580C`/`#F97316`, fundos suaves `#FAF7F2`), tipografia (`Outfit` do Google Fonts) e bordas altamente arredondadas (`border-radius: 40`).

### 1.1 Sincronização de Dados
Ambos os ambientes compartilham a estrutura lógica das informações do usuário. O estado do usuário é gerenciado globalmente na raiz (`App.js`) e repassado para as sub-telas. As alterações são despachadas por meio do callback `setUser(newData)`, mantendo os dados sincronizados em tempo real.

### 1.2 Estrutura atual do projeto (Expo como única versão do app)
Em setembro/2026 o antigo webapp (React + Vite + Tailwind) foi removido. O código final dele está preservado na tag git `webapp-vite-final`. O app agora é **um só código Expo**, que roda em iOS, Android e no navegador:

- `npm start`: Expo (celular via Expo Go)
- `npm run web`: o mesmo app no navegador (http://localhost:8081)
- `npm run build:web`: gera a versão web de produção em `dist/`
- `landing/`: **landing page de marketing** (a antiga FunLandingPage), em um projeto Vite separado. Use `npm run landing:dev` / `npm run landing:build`. Ela não leva ao app: os botões dizem "Em breve nas lojas" e depois viram os selos da App Store e da Google Play. O app fica em `app.mounjoy.com`.
- `assets/`: imagens usadas pelo app. `assets/library/` guarda artes extras da capivara (abraço, surpresa etc.) que ainda não são usadas.

**Entrada e "Continuar":** a primeira tela (`NativeWelcome.jsx`) é o login/cadastro. Enquanto os provedores de login não estão configurados, o botão **Continuar** entra direto e guarda os dados só no aparelho (AsyncStorage, chave `mounjoy_guest_user`; no navegador vira localStorage). Sair (Perfil → Sair) mantém esses dados no aparelho; só "Apagar minha conta" os remove. Quem depois entra numa conta sem perfil leva os dados locais junto: `App.js` (NativeMain) sobe tudo para o Supabase e limpa o aparelho. Uma conta nova sem dados locais passa pelo onboarding.

**Deploy (Vercel):** são dois projetos. O app usa `vercel.json` na raiz (`npm run build:web` → `dist/`, com as variáveis `EXPO_PUBLIC_SUPABASE_URL` e `EXPO_PUBLIC_SUPABASE_ANON_KEY`). A landing (`www.mounjoy.com`) usa Root Directory `landing` e não precisa de variáveis.

**Testes:** `npm test` roda os testes unitários. `npm run test:e2e` roda o Playwright contra o Expo Web. As specs de login e cadastro só rodam com `.env.test.local` (projeto Supabase de **teste**, com confirmação de e-mail desligada) e são puladas sem ele, para nunca criar contas em produção.

---

## 2. Detalhes das Telas Mobile

Reorganizado em outubro/2026 (o estado anterior está na tag git `app-pre-reorg-2026-10`). A navegação tem 4 abas e um botão central **+**:

| Aba | Pergunta que responde | Arquivo |
|---|---|---|
| **Hoje** | "O que eu faço hoje?" | `NativeToday.jsx` |
| **Diário** | "O que aconteceu no dia X?" | `NativeJournal.jsx` |
| **+** | "Quero registrar algo" | `NativeLogCenter.jsx` |
| **Progresso** | "Quanto já avancei?" | `NativeProgress.jsx` |
| **Perfil** | "Meu tratamento e ajustes" | `NativeProfile.jsx` |

### 2.1 Entrada (`NativeWelcome.jsx`)
- Topo com a marca (selo, título GLP-1, capivara escalando) e, logo abaixo, o formulário de login/cadastro (Supabase).
- Botão **Continuar**: acesso temporário sem login, com os dados no aparelho (ver 1.2). Substituiu a antiga landing interna e a tela de login separada; o conteúdo de marketing fica só no site (`landing/`).

### 2.2 Onboarding (`NativeOnboarding.jsx`)
- Configuração guiada (nome, unidades, peso/altura, meta, medicamento, dose e dia da aplicação). Sem mudanças nesta reorganização.

### 2.3 Central de registros (`NativeLogCenter.jsx`)
- **Um único lugar para registrar qualquer coisa.** O botão **+** da barra de abas abre o menu: Peso, Aplicação (ou Comprimido), Como estou (sintomas + Food Noise + anotação), Refeição (abre a análise por foto), Foto de progresso e Medidas (cintura/quadril).
- Qualquer tela chama `useLog().openLog(tipo, { date })`. Sem `date` o registro é "agora"; vindo do Diário, ele é arquivado no dia escolhido (no horário atual).
- Também guarda o modal de **Configurar Protocolo** (medicamento, dose e dia da semana), antes duplicado na Home e no Perfil.
- Medidas corporais são gravadas como uma entrada própria em `measurements` com `weight: 0`, para não virarem uma "pesagem" falsa no gráfico. `utils/journal.js` separa pesagens (`weightLogs`) de medidas (`bodyLogs`).
- Food Noise só é salvo se a pessoa mexer no controle. Uma anotação sem sintomas nem Food Noise vira uma entrada de "Anotação" (`isMemoryOnly`).

### 2.4 Hoje (`NativeToday.jsx`)
De cima para baixo, só o que importa no dia:
1. Data, saudação e semana do tratamento (o avatar abre o Perfil).
2. **No máximo um aviso de contexto**: "Dia da sua dose" quando a dose semanal vence, ou "Cuidado com o Food Noise" a partir do 5º dia após a dose.
3. **Próxima dose**: contagem regressiva (ou "Feito hoje ✓"), medicamento/dose (toque para trocar o protocolo), botão 3D para registrar, local sugerido e dica do ciclo. Vale também para comprimidos diários.
4. **Metas de hoje**: água, proteína e fibra empilhadas num só cartão (antes era um carrossel horizontal que escondia 2 das 3 metas, e havia barras duplicadas no cartão de peso), com a capivara comemorando a cada + e confete ao bater a meta. Logo abaixo, "Escanear refeição".
5. **Seu peso**: peso atual, variação desde o início, barra até a meta e ritmo semanal (toque abre o Progresso).
6. Alertas (platô; proteína baixa só a partir das 14h) e dica do dia.
7. Simulador de dias: só em desenvolvimento (`__DEV__`).

### 2.5 Diário (`NativeJournal.jsx`)
- Junta as antigas abas **Diário** e **Agenda**. Uma faixa da semana (expansível para o mês) escolhe o dia; os pontinhos coloridos mostram o que há em cada dia (dose, peso/medidas, sintomas/notas, refeição, foto), com legenda.
- Abaixo: resumo do dia (água, proteína, fibra) e uma **linha do tempo** com tudo daquele dia, do mais recente ao mais antigo: aplicações, pesagens, medidas, check-ins, anotações, fotos (toque abre em tela cheia) e refeições (`meal_logs`, só para quem tem conta).
- O botão **Registrar** abre a central de registros já apontando para o dia escolhido.

### 2.6 Progresso (`NativeProgress.jsx`)
- Números principais: peso atual, variação desde o início, meta (com quanto falta) e IMC.
- Gráfico do peso. Com menos de 2 pesagens mostra um gráfico de **exemplo**, esmaecido e marcado como tal (antes os dados fictícios apareciam sem aviso).
- **Fotos de evolução**: galeria (toque abre em tela cheia, com excluir) e o **comparador antes/depois** (`NativePhotoCompare.jsx`), que saiu da Agenda. Agora se escolhem as próprias fotos (2 a 4) e o peso de cada uma vem da pesagem mais próxima, em até 3 dias.
- Medidas corporais (última cintura/quadril e variação desde a primeira) e as últimas aplicações, com a próxima dose.

### 2.7 Perfil (`NativeProfile.jsx`)
- Cartão **Meu tratamento** (medicamento, dose e dia), que abre o Configurar Protocolo.
- Metas diárias (água, proteína, fibra, na mesma ordem e cor da tela Hoje), Preferências (unidades, lembretes) e Conta (sair, apagar).
- Saíram daqui: o modal de protocolo duplicado e o de medidas (agora na central de registros).

## 3. Desafios de Gestos e Soluções Customizadas

### 3.1 Captura de Gestos nos Sliders (`NativeUI.jsx`)
- **Problema**: O `PanResponder` dos sliders de peso/altura falhava ou travava quando inserido dentro de telas com scroll (`ScrollView`), pois o scroll nativo "roubava" os gestos.
- **Solução**: 
  1. Adicionado o comando `evt.currentTarget.requestDisallowInterceptTouchEvent(true)` nos manipuladores `onPanResponderGrant` e `onPanResponderMove`. Isso bloqueia temporariamente a rolagem do `ScrollView` enquanto o usuário ajusta o slider.
  2. Substituído o cálculo baseado em `locationX` (que é relativo ao elemento tocado e causa saltos no slider se o usuário tocar na bolinha) por `pageX` absoluto. Ao obter a largura e a coordenada X inicial da barra (cados obtidos dinamicamente na primeira montagem com `ref` e `onLayout`), conseguimos uma precisão de arrasto de 100% livre de bugs de renderização.

### 3.2 Livre Movimentação na Rolagem de Páginas
- **Problema**: O uso excessivo de interceptadores de toque (`onStartShouldSetResponder={() => true}`) em containers de modais e carrosséis travava a rolagem vertical natural do aplicativo caso o usuário tocasse ou iniciasse o movimento com o dedo posicionado acima destes elementos.
- **Solução**: Removemos as declarações de responder invasivas de todos os wrappers de cartões e modais na home e no calendário, devolvendo a prioridade ao `ScrollView` raiz e garantindo uma navegação fluida em todo o app.

---

## 4. Seletor de Local de Aplicação Nativo (`NativeBodySelector.jsx`)

Para garantir paridade com a versão Web, o aplicativo mobile foi atualizado para utilizar um mapa corporal totalmente interativo desenvolvido em SVG (`react-native-svg`):
- **Visualização Humana**: Renderização de caminhos SVG correspondentes aos Braços, Abdômen e Coxas do paciente.
- **Interatividade Tátil**: Cada região responde individualmente ao toque (`onPress` nas tags `Path` do SVG), atualizando instantaneamente o local selecionado.
- **Destaque Visual Dinâmico**: O componente diferencia as cores dos membros baseando-se no estado: laranja para o local atualmente selecionado e esmeralda para a recomendação gerada pelo algoritmo de rotação inteligente.
- **Integração Consistente**: O seletor visual foi integrado aos fluxos de registro de aplicação no Dashboard e no Perfil do usuário.

---

## 5. Status de Lançamento (iOS + Android)

Levantamento feito em 2026-08-21. O backend já migrou de Firebase para Supabase
(`src/supabaseClient.js`); as `firestore.rules` foram removidas nessa migração
— restam só dois comentários stale mencionando "Firestore" em
`src/App.jsx:55` e `src/components/Dashboard.jsx:250`, sem efeito funcional,
que valem uma limpeza de texto quando alguém mexer nesses arquivos.

### Bloqueadores para rodar/testar localmente
- [ ] **Sem `.env`/`.env.local` no projeto.** `supabaseClient.js` exige
  `EXPO_PUBLIC_SUPABASE_URL` e `EXPO_PUBLIC_SUPABASE_ANON_KEY`; sem isso o
  app não conecta a nada. Recriar o arquivo local com as credenciais do
  Supabase antes de qualquer teste funcional.
- [ ] **CRÍTICO — build web nunca recebe as env vars, mesmo com `.env.local`
  correto.** Verificado em 2026-08-21 rodando `npm run dev` com um
  `.env.local` válido: `vite.config.js:13` faz
  `define: { 'process.env': env }`, mas essa substituição **não é aplicada**
  pelo servidor de dev do Vite — `curl http://localhost:5173/src/supabaseClient.js`
  mostra o literal `process.env[...]` sem nenhuma troca, e o app quebra
  sempre com `Uncaught Error: supabaseUrl is required` ao carregar, mesmo
  com credenciais válidas no arquivo. Ou seja: hoje a versão web do Mounjoy
  está inoperante em qualquer ambiente (não é só falta de configurar
  localmente — é a mecânica de injeção de env que está quebrada). Caminho
  de correção recomendado: trocar `getEnv()` em `src/supabaseClient.js` para
  ler `import.meta.env.VITE_SUPABASE_URL` no lado Vite/web (o mecanismo
  nativo do Vite, que sempre funciona) mantendo o fallback
  `process.env.EXPO_PUBLIC_SUPABASE_URL` só para o lado Expo/Metro nativo, e
  remover o `define: {'process.env': env}` de `vite.config.js` — hoje ele
  também expõe **todo o `process.env` do SO** (não só as chaves do app) para
  o bundle do navegador, que é o aviso que o próprio Vite imprime no boot
  ("The `define` option contains an object with 'PATH'... This poses a
  security risk"). Corrigir os dois problemas juntos.
- [ ] CSP em `index.html` ainda restringe `script-src`/`worker-src` a
  domínios do Firebase (`*.firebaseapp.com`, `apis.google.com`) — bloqueia o
  Web Worker que o `@supabase/supabase-js` usa para sessão/realtime
  (`Creating a worker from 'blob:...' violates ... script-src`). Precisa
  atualizar a CSP para os domínios do Supabase (ou do worker-src correto)
  como parte da limpeza pós-migração.

### Pendências para build de loja (App Store / Play Store)
- [ ] `app.json` sem `ios.bundleIdentifier` e sem `android.package`
  (obrigatórios para gerar build assinado).
- [ ] `app.json` sem `icon` e sem `splash` configurados — cai no ícone padrão
  do Expo.
- [ ] `app.json` sem `android.versionCode` / `ios.buildNumber`.
- [ ] Sem `eas.json` — falta a configuração de build/submit via EAS
  (caminho padrão do Expo para gerar `.ipa`/`.aab` e submeter às lojas).
- [ ] Sem termos de uso / política de privacidade publicados — exigidos por
  ambas as lojas no cadastro do app antes da submissão.
- [ ] Sem metadados de loja preparados (descrição, categoria, screenshots,
  classificação etária).

### Cobertura de testes
- [x] Suíte de testes criada em 2026-08-21 (unit + E2E web), inspirada no
  padrão em camadas do projeto Tour Sinop mas reescrita do zero para a stack
  real do Mounjoy (Supabase/Vite/`react-native-web`), já que o código de
  testes do Tour Sinop era específico daquele stack (Firestore + Vercel
  Functions + Asaas) e não era reaproveitável diretamente. Ver
  [tests/README de uso](#) e a seção 6 abaixo.
- [ ] Suíte ainda não rodou de ponta a ponta contra um projeto Supabase de
  teste de verdade (o projeto ainda não foi criado) — só a camada `unit`
  (14 testes, sem rede) foi executada e está passando. A camada `e2e` está
  bloqueada pelo bug de env vars acima: mesmo os specs que só usam o modo
  convidado (sem Supabase) não sobem, porque a página inteira quebra no
  boot por causa do `process.env` — corrigir o bug de env é pré-requisito
  para rodar qualquer teste de navegador, não só os que tocam Supabase.
- [ ] Sem cobertura E2E de build nativa real (simulador iOS / emulador
  Android). Ferramenta recomendada se isso virar prioridade: Maestro (mais
  simples que Detox para Expo).

### Já resolvido
- [x] Repositório local sincronizado com `origin/main` (estava 14 commits
  atrás).
- [x] Migração de Firebase para Supabase concluída no código (`firestore.rules`
  removido, `supabaseClient.js` em uso).

---

## 6. Suíte de Testes (unit + E2E)

Criada em 2026-08-21. Três partes:

- **`tests/unit/`** (Vitest, sem rede) — `securityUtils.test.js` e
  `userService.test.js`, este último contra um fake em memória do query
  builder do `supabase-js` (`tests/helpers/supabase-fake.js`). Rodar com
  `npm run test:unit`.
- **`tests/e2e/`** (Playwright, navegador real contra `npm run dev`) — 5
  jornadas: onboarding pelo "Continuar", login com conta seedada, metas
  diárias, registrar dose, e dados do "Continuar" migrando para uma conta
  nova (localStorage → Supabase). Precisa de um **projeto Supabase de TESTE
  separado** (nunca produção) — rodar `supabase/schema.sql` nele, colar
  `EXPO_PUBLIC_SUPABASE_URL`/`EXPO_PUBLIC_SUPABASE_ANON_KEY`/
  `SUPABASE_SERVICE_ROLE_KEY` em `.env.test.local` (gitignored), depois
  `npm run test:e2e:seed` e `npm run test:e2e`.
- **`data-testid`** foi adicionado nos elementos-chave de Login, Onboarding,
  App (abas + botão `tab-add-button`), central de registros (`log-menu-*`) e Hoje, já que o app não usa router
  (troca de tela é só `useState`, sem URL) e não tinha nenhum seletor
  estável antes.

Bloqueador atual: o bug de `process.env`/`define` descrito acima impede
qualquer teste de navegador de rodar até ser corrigido, mesmo os que não
tocam Supabase.

---

## 7. Funcionalidade (planejada): Análise de Refeição por Foto

Levantamento feito em 2026-08-25. Ainda **não implementada** — este é o
plano de arquitetura acordado antes de começar o código. App é nativo-first
(prioridade é o app mobile via Expo); web só recebe port manual depois,
quando fizer sentido.

### 7.1 Objetivo

Usuário tira/seleciona foto de um prato → app extrai automaticamente lista
de alimentos + quantidade estimada → usuário revisa, ajusta pesos, remove
itens errados e adiciona itens manuais → o prato confirmado gera totais de
calorias/proteína/carboidrato/gordura, salvos no diário do usuário
(`dailyIntakeHistory`).

**Imagens do prato NÃO são armazenadas** — só os dados extraídos
(nome do item, peso, macros). Isso é diferente das fotos de evolução
corporal, que o usuário já opta por salvar para o comparador visual e
continuam sendo persistidas normalmente.

### 7.2 Captura de foto (iOS + Android)

Resolvido com `expo-image-picker` (já é dependência do projeto):
`launchCameraAsync` (tirar na hora) e `launchImageLibraryAsync` (escolher
da galeria), ambos com `requestCameraPermissionsAsync`/
`requestMediaLibraryPermissionsAsync`. Precisa declarar
`NSCameraUsageDescription` / `NSPhotoLibraryUsageDescription` em
`app.json` (ainda não configurado — ver seção "Pendências para build de
loja").

### 7.3 Motor de extração: LLM de visão (Gemini)

Decisão: usar a API do Gemini (Google) como motor de reconhecimento —
manda a foto + prompt estruturado, recebe JSON com os itens
identificados. Escolhido em vez de treinar modelo próprio (custo de
engenharia alto demais pro estágio atual) ou API especializada de
nutrição tipo LogMeal/Foodvisor (mais cara, menos flexível, avaliar depois
se a precisão do Gemini não for suficiente).

**Modelo escolhido**: `gemini-flash-lite-latest` — variante mais barata da
família que ainda aceita imagem, adequada pra uma extração estruturada
simples como essa (testado e confirmado funcionando em 2026-08-25). Escolha ainda não validada por comparação com outros modelos — ver o plano de benchmark em 7.13.
Catálogo de modelos evolui rápido; para ver os disponíveis na sua própria
chave: `GET https://generativelanguage.googleapis.com/v1beta/models?key=SUA_CHAVE`.

**Cota gratuita**: a Google não publica mais uma tabela estática de
limites — é por conta/tier, visível só logado em
https://aistudio.google.com/rate-limit. Checar lá antes de estimar
volume de uso esperado.

A chave já foi gerada e testada (status 200 contra o endpoint real) em
2026-08-25 — está em `.env.local` como `GEMINI_API_KEY` (sem prefixo
`EXPO_PUBLIC_`/`VITE_` de propósito, pois só a Edge Function usa, nunca o
client). Falta configurá-la como **secret da Edge Function** (não basta
estar em `.env.local`, que só vale pro ambiente local do bundler — ver
7.4.1).

**Importante**: a chamada ao Gemini **não deve** sair direto do app
mobile com a key embutida no bundle (qualquer chave `EXPO_PUBLIC_*` fica
visível no binário/JS bundle, decompilável). Precisa passar por uma
Supabase Edge Function, que guarda a key como secret do lado servidor.

### 7.4.1 Edge Function: `analyze-meal-photo`

Implementada em `supabase/functions/analyze-meal-photo/index.ts` (Deno).
Recebe `{ imageBase64, mimeType }` via POST autenticado (exige sessão
Supabase válida — verifica `Authorization` header antes de gastar cota do
Gemini), chama `gemini-flash-lite-latest` com prompt estruturado pedindo
JSON, valida o formato da resposta (nunca confia cegamente no que o
modelo devolve) e retorna `{ items: [...] }`. Não persiste a imagem em
lugar nenhum.

**Deploy** (rodar da raiz do projeto, precisa da Supabase CLI — já
instalada via `npx supabase`):

```bash
npx supabase login
npx supabase link --project-ref isdljpboxthpvzhxbxsi
npx supabase secrets set GEMINI_API_KEY=sua_chave_aqui
npx supabase functions deploy analyze-meal-photo
```

A secret é configurada **separadamente** do `.env.local` — Edge Functions
rodam no servidor da Supabase, não têm acesso ao `.env.local` da sua
máquina. `supabase secrets set` guarda a chave no projeto Supabase
remoto, acessível só pela função via `Deno.env.get('GEMINI_API_KEY')`.

Ainda não deployada — pendente de você rodar os comandos acima (o login
interativo e o link do projeto exigem confirmação sua, não posso fazer
por você).

### 7.4 Fluxo técnico ponta a ponta

```
App (Native*.jsx) tira/seleciona foto
  → converte pra base64
  → chama Supabase Edge Function `analyze-meal-photo` (POST, base64 no body)
  → Edge Function chama Gemini API com prompt estruturado, pedindo JSON:
      [{ name, category, estimatedGrams, confidence }]
  → Edge Function NÃO salva a imagem em lugar nenhum, só repassa o JSON de volta
  → app recebe a lista, popula tela de revisão editável
  → usuário ajusta peso/remove/adiciona item manual
  → cada item confirmado busca macros na tabela própria do Supabase
    (`food_items`, ver 7.5) por nome/categoria
  → totais do prato somados e gravados em `dailyIntakeHistory[data]`
```

### 7.5 Base de nutrição (tabelas próprias, Supabase)

App é global — TACO (só Brasil) não serve como base principal. Semente
inicial via fontes abertas e gratuitas, sem custo recorrente:
- **Open Food Facts** (openfoodfacts.org) — banco colaborativo global,
  API pública gratuita, cobre produtos industrializados de várias regiões.
- **USDA FoodData Central** — base americana robusta para alimentos
  genéricos/não industrializados (frutas, grãos, carnes in natura),
  gratuita.

Ambas usadas só para popular a tabela própria no Supabase (não como
dependência em runtime) — assim dá pra evoluir/corrigir/complementar os
dados depois sem depender de disponibilidade externa.

Schema proposto (a criar em `supabase/schema.sql`):

```sql
create table food_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  name_search text generated always as (lower(name)) stored, -- busca case-insensitive
  category text,
  source text not null, -- 'openfoodfacts' | 'usda' | 'manual'
  source_id text,       -- id externo, para re-sincronizar/atualizar depois
  calories_per_100g numeric not null,
  protein_per_100g numeric not null,
  carbs_per_100g numeric not null,
  fat_per_100g numeric not null,
  fiber_per_100g numeric,
  created_at timestamptz default now()
);
create index food_items_name_search_idx on food_items (name_search);

create table meal_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  logged_at timestamptz not null default now(),
  items jsonb not null, -- [{ food_item_id, name, grams, source: 'ai'|'manual', calories, protein, carbs, fat }]
  total_calories numeric,
  total_protein numeric,
  total_carbs numeric,
  total_fat numeric
);
```

`meal_logs.items` guarda uma cópia dos macros calculados no momento do
registro (não só a referência a `food_items`), para que uma correção
futura na base não altere retroativamente o histórico do usuário.

### 7.6 Sistema de unidades (novo campo de onboarding)

App vai global — precisa perguntar no onboarding se o usuário usa
sistema **Métrico** (kg, cm, ml/g) ou **Imperial** (lb, ft/in, fl oz/oz).
São sistemas diferentes, não intercambiáveis automaticamente sem
conversão. Novo campo: `user.settings.unitSystem: 'metric' | 'imperial'`
(default `'metric'`), usado em toda a UI para converter peso, altura e
porções — inclusive nos pesos estimados desta nova feature (o Gemini
sempre estima em gramas internamente; a UI converte pra oz se o usuário
estiver em `imperial`).

**Implementado (2026-09-30).** O passo de unidades do onboarding vem
pré-selecionado pelo sistema de medidas do aparelho (`expo-localization`:
iOS respeita Ajustes › Idioma e Região; Android deriva da região; na web
usa a região do navegador — `src/i18n/resolve.js`), e o usuário pode trocar
depois em Perfil › Sistema de Medidas. O armazenamento continua sempre
métrico (kg, m, cm, L, g); toda conversão de exibição/entrada passa por
`src/utils/units.js` (`unitsFor(user)` em `src/i18n`). Imperial exibe
lb, ft/in, in, fl oz e oz.

### 7.6.1 Idiomas (i18n)

O app não tem seletor de idioma: segue o idioma do aparelho (ou o
"idioma por app" do iOS / Android 13+). Traduções em
`src/i18n/locales/*.json` (i18next + react-i18next); idioma sem tradução
cai em inglês. Idiomas ativos: en, pt, es, fr, de, it (as páginas das
lojas começam só em en e pt). Datas e números usam `formatDate` /
`formatNumber` de `src/i18n`, nunca `'pt-BR'` fixo. Valores gravados são
chaves estáveis (dia da semana 0–6, `site` = id do local, `substance` =
chave), nunca texto de tela. `tests/unit/i18n.test.js` garante que todos
os idiomas têm as mesmas chaves e placeholders. Em dev, `?lng=de` na URL
força um idioma na web para revisar traduções.

### 7.7 UI de revisão manual

Modelo de item por card, editável:

```js
{
  id, name, category,
  estimatedGrams, confirmedGrams,   // usuário pode ajustar
  confidence,                       // < limiar exibe aviso "baixa confiança"
  source: 'ai' | 'manual',
  nutrition: { calories, protein, carbs, fat }
}
```

Tela nova (`NativeMealScan.jsx`, a criar): lista de cards no padrão visual
já usado pros cards de meta diária no Dashboard, com peso editável, botão
remover, e "+ Adicionar item" que abre busca manual em `food_items`.

### 7.10 Macros: fonte dupla (base própria + estimativa do Gemini)

Ajustado em 2026-08-25. Como `food_items` começa vazia (7.8 ainda
pendente), depender só dela deixava calorias/macros sempre zerados na
prática. Agora a extração já pede pro próprio Gemini estimar
`caloriesPer100g`/`proteinPer100g`/`carbsPer100g`/`fatPer100g` (por 100g,
não pela porção) na mesma chamada de identificação — ele já tem
conhecimento nutricional geral, então funciona imediatamente, sem
depender de importação de base.

Ordem de prioridade por item, em `NativeMealScan.jsx` (`withNutrition`):
1. **`food_items` (banco próprio)** — se houver match por nome, usa os
   valores de lá (mais autoritativo, curado/corrigível por nós).
2. **Estimativa do Gemini** — fallback quando não há match na base.
3. **Sem dados** — só quando nenhuma das duas fontes tem valor (ex: item
   manual sem estimativa da IA e sem match na base).

`nutritionSource: 'db' | 'ai' | null` fica salvo no item pra permitir no
futuro uma UI que diferencie "dado curado" de "estimativa da IA" (ainda
não exibido, mas pronto pra usar). A taxa por 100g (`rate100g`) fica
guardada no item pra recalcular calorias/macros instantaneamente quando o
usuário edita a quantidade, sem precisar re-consultar o banco.

**Ajuste de porção**: além do campo de texto editável, o card de cada
item agora tem botões `−`/`+` que ajustam de 5 em 5 gramas
(`stepGrams`), mantendo a edição direta por teclado disponível também.

### 7.11 Histórico de refeições e dica de peso total

Ajustado em 2026-08-25.

- **Histórico**: as refeições salvas em `meal_logs` aparecem na linha do
  tempo do Diário (`NativeJournal.jsx`, ver 2.5) — antes ficavam numa seção
  própria do antigo `NativeLogs.jsx`. Lista as refeições salvas em `meal_logs`
  (data/hora, nomes dos itens, calorias e macros totais), via
  `userService.getMealLogs(uid)`. Só dados, sem foto (a foto nunca foi
  persistida, por decisão de escopo — 7.1).
- **Dica de peso total**: campo opcional "Peso aproximado do prato" na
  tela inicial do scanner (`NativeMealScan.jsx`), antes de tirar a foto.
  Quando preenchido, vai como `totalWeightHintGrams` pro Edge Function,
  que injeta no prompt do Gemini como referência ("o prato pesa
  aproximadamente Xg no total") pra calibrar as estimativas de peso por
  item — melhora a precisão já que hoje a IA só tem pistas visuais (sem
  escala de referência real).

### 7.12 Performance da captura e correção de scroll

Ajustado em 2026-08-25.

- **Scroll travado na tela de revisão**: causado por um `TouchableWithoutFeedback`
  que eu havia colocado em volta de toda a tela (pra fechar o teclado ao
  tocar fora do campo de peso) — isso capturava o gesto de scroll do
  `ScrollView` da lista de itens. Corrigido: o `TouchableWithoutFeedback`
  agora envolve só o bloco `status === 'idle'` (onde fica o campo de
  peso), não a tela de revisão.
- **Análise lenta**: a foto da câmera sai em resolução altíssima (câmeras
  atuais tiram fácil 3000px+ de largura); o parâmetro `quality` do
  `expo-image-picker` só comprime o JPEG, não reduz a dimensão — então o
  base64 enviado pra Edge Function podia ter vários MB, e o upload em
  rede móvel era o gargalo real (não o processamento do Gemini em si).
  Adicionada dependência `expo-image-manipulator`: a foto é redimensionada
  pra 900px de largura antes de virar base64, reduzindo bastante o
  tamanho do payload.

### 7.9 Proteções contra abuso e uso indevido da chave de API

Implementado em 2026-08-25. Camadas, da mais barata pra mais cara de
processar (a Edge Function rejeita cedo, antes de gastar cota do Gemini):

1. **Autenticação obrigatória** — a função exige um JWT válido de sessão
   Supabase (`Authorization` header verificado via `auth.getUser()`) antes
   de qualquer coisa. Sem isso, nem chega a checar rate-limit.
2. **Rate-limit persistente no banco** — tabela `meal_scan_usage`
   (`user_id`, `date`, `count`, `last_request_at`) + função
   `check_and_increment_meal_scan_usage()` (`SECURITY DEFINER`, atômica
   via `SELECT ... FOR UPDATE`). Dois limites, ajustáveis nas constantes
   do topo de `supabase/functions/analyze-meal-photo/index.ts`:
   - **Limite diário**: 20 análises/usuário/dia (`DAILY_SCAN_LIMIT`).
   - **Intervalo mínimo**: 5 segundos entre chamadas
     (`MIN_SECONDS_BETWEEN_SCANS`) — impede spam de cliques repetidos.
   Por quê no banco e não em memória da função: Edge Functions são
   stateless entre invocações (cada chamada pode cair numa instância
   diferente), então um contador em memória não sobrevive nem protege
   nada — precisa de estado persistente e atômico.
3. **Validação de payload** — rejeita imagens acima de ~5.2MB em base64
   (`MAX_BASE64_LENGTH`) e tipos MIME fora da lista permitida
   (`image/jpeg`, `image/png`, `image/webp`, `image/heic`) antes de
   processar ou enviar pro Gemini.
4. **Validação da resposta do Gemini** — nunca confia cegamente no JSON
   que volta: filtra itens sem `name`/`estimatedGrams` válidos, trunca
   nomes em 100 caracteres, satura `confidence` em `[0,1]`.
5. **RLS em todas as tabelas novas** — `food_items` é só-leitura pro
   client (escrita só via service role/admin), `meal_logs` e
   `meal_scan_usage` restritas a `auth.uid() = user_id`.
6. **Chave nunca chega ao client** — `GEMINI_API_KEY` é secret da Edge
   Function (`supabase secrets set`), nunca prefixo `EXPO_PUBLIC_`/`VITE_`
   — não é decompilável do bundle do app.
7. **Limites no client (defesa em profundidade, não é a proteção real)**
   — `NativeMealScan.jsx` trunca nome de item manual em 100 caracteres e
   satura gramas em 5000g, só pra UX/sanidade dos dados; a proteção de
   verdade é sempre a validação no servidor acima, já que o client pode
   ser burlado.

**Erros retornados ao usuário**: a função devolve mensagens específicas
(`429` com "aguarde alguns segundos" ou "limite diário atingido") que o
app já exibe na tela de captura em vez de um erro genérico.

**Não implementado ainda** (avaliar se necessário depois): CAPTCHA/App
Check do Firebase-equivalente para Expo (ex: bloquear requisições que não
vêm do app real), e alerta/dashboard de custo do lado da Google Cloud
(configurável em https://console.cloud.google.com/billing — orçamento com
alerta por e-mail, recomendado configurar manualmente já que envolve
faturamento).

### 7.8 Pendências antes de codar

- [ ] Usuário gera API key gratuita do Gemini em aistudio.google.com e
  fornece via `.env.local` (`GEMINI_API_KEY`, sem prefixo `EXPO_PUBLIC_`
  já que só a Edge Function vai usá-la, nunca o client).
- [ ] Criar a Supabase Edge Function `analyze-meal-photo`.
- [ ] Popular `food_items` com uma amostra inicial (Open Food Facts +
  USDA) — decidir escopo inicial (ex: 500-1000 itens mais comuns) antes
  de importar a base inteira.
- [ ] Adicionar seletor de sistema de unidades no onboarding nativo.
- [ ] Declarar `NSCameraUsageDescription`/permissões de câmera no
  `app.json` (ainda ausente, ver seção 5 "Pendências para build de loja").

### 7.13 Evolução planejada: escolha do modelo por benchmark (OpenRouter)

**Status: planejado, não iniciado (registrado em 2026-09-30).** Nada disto
existe no código ainda. Quando for retomado, o Claude orienta cada etapa
(criação de conta/chaves, escolha dos modelos, dataset) e implementa o CLI.

**Por quê.** Hoje a Edge Function usa um único modelo
(`gemini-flash-lite-latest`, ver 7.3) escolhido sem medição. A ideia é
comparar vários modelos de visão com as mesmas fotos e a mesma instrução,
e escolher pelo equilíbrio entre acerto, custo e tempo — com números, não
impressão.

**Conceitos.**
- **OpenRouter** (openrouter.ai): uma conta e uma chave de API dão acesso a
  modelos de vários provedores (Google, Anthropic, OpenAI, Meta, Qwen…)
  pela mesma API; trocar de modelo é trocar o nome. Créditos pré-pagos.
- **Guardrails** (configuração do OpenRouter): lista de **modelos
  permitidos** por chave + **teto de gasto** por chave. Nunca criar chave
  sem os dois.
- **Benchmark**: rodar todos os modelos contra o mesmo conjunto de fotos
  com resposta conhecida e medir o erro de cada um.
- **CLI**: script de terminal no próprio repo que executa o benchmark de
  forma repetível (rodar de novo quando sair modelo novo ou mudar o prompt).

**Etapas.**

1. **Conta e chaves (usuário, com orientação do Claude)**
   - Criar conta no OpenRouter e colocar **US$ 10** de crédito.
   - Em Guardrails, selecionar ~5–8 modelos de visão candidatos (lista
     definida na hora, pelo catálogo e preços do momento; incluir o Gemini
     atual como referência).
   - Gerar **uma chave por uso**, cada uma com **teto de US$ 5** — ex.:
     `mounjoy-benchmark` (só local) e, se o app migrar, outra separada para
     a Edge Function.
   - Ativar a restrição de provedores que **não retêm/treinam com os dados**
     (fotos de refeição de app de saúde — LGPD/GDPR).
   - A chave vai em `.env.local` como `OPENROUTER_API_KEY` (sem prefixo
     `EXPO_PUBLIC_`, nunca no bundle, nunca colada no chat).

2. **Dataset de teste (usuário)**
   - 20–50 fotos reais de pratos em `bench/meals/` (fora do app; não
     commitar fotos pessoais — avaliar `.gitignore`).
   - Para cada foto, a "resposta certa" em `bench/meals/<nome>.json`:
     alimentos presentes e **gramas pesadas na balança**; calorias/macros
     de referência pela tabela nutricional (TACO/USDA).
   - Variar: prato simples, prato misto, porção grande/pequena, bebida,
     embalagem, foto com pouca luz. Incluir casos com e sem o peso total
     informado (dica de peso, ver 7.11).

3. **CLI de benchmark (Claude implementa)**
   - Script em `scripts/bench-meal-models.mjs`, comando proposto:
     `npm run bench:meals -- --models <lista> [--runs 3] [--hint-weight]`.
   - Usa **exatamente o mesmo prompt e o mesmo formato de resposta** da
     Edge Function (extrair o prompt para um módulo compartilhado, para os
     dois não divergirem).
   - Para cada modelo × foto, registra:
     - acerto de itens (precisão/recall dos alimentos identificados);
     - erro médio de gramas por item e do total do prato;
     - erro de calorias e proteína do prato;
     - taxa de JSON válido no formato esperado;
     - tempo de resposta (mediana e pior caso);
     - custo por foto (o OpenRouter devolve o custo de cada chamada).
   - `--runs` repete cada foto para medir consistência (o mesmo modelo
     pode responder diferente a cada vez).
   - Saída: tabela no terminal + `bench/results/<data>.csv` e um resumo em
     Markdown para comparar execuções ao longo do tempo.
   - Para de rodar se o gasto acumulado passar de um limite local
     (`--max-cost`, padrão US$ 2), além do teto da chave.

4. **Decisão**
   - Critério sugerido: descartar quem tiver JSON inválido > 2% ou tempo
     mediano > 8 s; entre os restantes, menor erro de calorias/proteína,
     desempatando por custo por foto.
   - Registrar a escolha e a tabela nesta seção (data + versão do prompt).

5. **Adoção no app**
   - Duas opções, decididas com o resultado: (a) manter chamada direta ao
     provedor vencedor na Edge Function, ou (b) passar a Edge Function a
     chamar o OpenRouter (troca de modelo sem novo deploy de código, só de
     configuração; permite fallback para um segundo modelo se o primeiro
     falhar).
   - Em ambos: nova secret na Edge Function, manter os limites de uso de
     7.9, atualizar 7.3/7.4.1 e rodar o benchmark de novo antes de trocar.

**Checklist.**
- [ ] Conta OpenRouter + US$ 10 de crédito
- [ ] Guardrails: modelos permitidos + teto de US$ 5 por chave
- [ ] Provedores sem retenção de dados
- [ ] `OPENROUTER_API_KEY` em `.env.local`
- [ ] Dataset com 20–50 fotos e gabarito pesado
- [ ] Prompt da Edge Function extraído para módulo compartilhado
- [ ] CLI `npm run bench:meals`
- [ ] Primeira rodada + decisão registrada aqui
- [ ] Migração da Edge Function (se o vencedor não for o modelo atual)

---

## 8. Nuvem e limites de uso (outubro/2026)

### 8.1 Limites da análise de refeições

A função `analyze-meal-photo` aceita chamadas sem login enquanto o app roda
no modo "Continuar", então ela tem três travas, todas checadas antes de gastar
cota do Gemini:

| Quem | Limite padrão | Secret para mudar |
|---|---|---|
| Usuário logado (por conta) | 20 por dia | `MEAL_SCAN_DAILY_LIMIT` |
| Sem login (por aparelho, via hash do IP) | 5 por dia | `MEAL_SCAN_ANON_DAILY_LIMIT` |
| O app inteiro (soma de todos) | 300 por dia | `MEAL_SCAN_GLOBAL_DAILY_LIMIT` |
| Intervalo mínimo entre duas análises | 5 s | `MEAL_SCAN_MIN_SECONDS` |

Os padrões são os valores de produção. Para testar com mais folga, sem mexer
no código: `npx supabase secrets set MEAL_SCAN_ANON_DAILY_LIMIT=100` (e depois
voltar com `npx supabase secrets unset MEAL_SCAN_ANON_DAILY_LIMIT`), ou usar um
projeto Supabase de teste com limites maiores. O IP nunca é guardado, só um
hash. Tabelas `meal_scan_anon_usage` e `meal_scan_global_usage`, escritas só
pela função (service role). Recomendado também: um teto de gasto/cota na
própria chave do Gemini (Google AI Studio / Google Cloud).

### 8.2 Sincronização dos dados (pronta, ainda inativa)

Nada é gravado na nuvem no modo "Continuar". Para quem entra com conta,
`userService.saveUserProfile` agora espelha as listas do app: insere registros
novos, **atualiza** os editados e **apaga** os removidos (medidas, aplicações e
"Como estou"; casados pela data/hora). Também salva as metas de calorias,
gorduras e carboidratos, altura, peso inicial, meta de peso, dia da dose,
lembretes, o consumo diário de calorias/gorduras/carboidratos e a fibra das
refeições. Refeições da conta podem ser removidas pelo Diário.

Pré-requisito antes de ativar o login: rodar
`supabase/migrations/20261005_app_reorg.sql` no SQL editor do projeto (só
acrescenta colunas/tabelas). Fotos de progresso continuam só no aparelho, por
decisão (fase de testes).
