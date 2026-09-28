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
- `landing/`: **landing page de marketing** (a antiga FunLandingPage), em um projeto Vite separado. Use `npm run landing:dev` / `npm run landing:build`. Os botões levam para `VITE_APP_URL` (ver `landing/.env.example`).
- `assets/`: imagens usadas pelo app. `assets/library/` guarda artes extras da capivara (abraço, surpresa etc.) que ainda não são usadas.

**Convidado → conta:** quem faz o onboarding sem login tem os dados salvos só no aparelho (AsyncStorage, chave `mounjoy_guest_user`; no navegador vira localStorage). O Dashboard mostra o cartão "Salve seu progresso", que abre o cadastro. Quando a conta nova aparece sem perfil, `App.js` (NativeMain) sobe os dados do convidado para o Supabase e limpa o aparelho. Uma conta criada direto pelo login, sem dados de convidado, passa pelo onboarding.

**Deploy (Vercel):** são dois projetos. O app usa `vercel.json` na raiz (`npm run build:web` → `dist/`, com as variáveis `EXPO_PUBLIC_SUPABASE_URL` e `EXPO_PUBLIC_SUPABASE_ANON_KEY`). A landing usa Root Directory `landing` e a variável `VITE_APP_URL` com o endereço do app.

**Testes:** `npm test` roda os testes unitários. `npm run test:e2e` roda o Playwright contra o Expo Web. As specs de login e cadastro só rodam com `.env.test.local` (projeto Supabase de **teste**, com confirmação de e-mail desligada) e são puladas sem ele, para nunca criar contas em produção.

---

## 2. Detalhes das Telas Mobile

### 2.1 Landing Page (`NativeLandingPage.jsx`)
- **Objetivo**: Ponto de entrada do aplicativo.
- **Funcionalidades**: Apresenta a marca com um visual limpo e moderno, oferecendo duas opções claras de rota: "Começar Configuração" (onboarding) e "Já tenho conta" (login).

### 2.2 Onboarding (`NativeOnboarding.jsx`)
- **Objetivo**: Configuração guiada passo a passo (passos de 0 a 5) do perfil e protocolo do paciente.
- **Funcionalidades**:
  - Captura nome, peso inicial, altura e meta de peso.
  - **Filtro de Medicamentos (Passo 4)**: Interface otimizada que filtra substâncias por via de administração (injetável, comprimido) e objetivo (perda de peso, diabetes), com sub-seleção de marcas.
  - Integração de sliders interativos para peso e altura.

### 2.3 Home/Dashboard (`NativeDashboard.jsx`)
- **Objetivo**: Painel central diário com resumo de peso, aplicação e metas de consumo.
- **Funcionalidades**:
  - **Resumo de Progresso de Peso**: Exibição em duas colunas (Evolução de fotos com proporção fixa `320px` livre de distorções e Card de Peso com mini barras de proteína e água).
  - **Banner de Ciclo de Medicação**: Alerta dinâmico de pico de efeito da dose ou redução de nível (Food Noise), sugerindo ações inteligentes.
  - **Botão Físico 3D "Injetar"**: Botão personalizado com relevo tátil que simula uma aplicação quando pressionado.
  - **Metas do Dia**: Carrossel horizontal com cards interativos de consumo (Água, Proteína, Fibra) com mascotinhos animados e botões de adição rápida.

### 2.4 Diário (`NativeLogs.jsx`)
- **Objetivo**: Registro de sintomas e efeitos colaterais diários.
- **Funcionalidades**: Permite aos usuários marcar níveis de náusea, dor de cabeça, fadiga e registrar pensamentos em um campo de texto, salvando no histórico do dia selecionado.

### 2.5 Agenda/Calendário (`NativeCalendar.jsx`)
- **Objetivo**: Visualização em calendário da jornada.
- **Funcionalidades**:
  - Exibe um calendário mensal interativo.
  - Destaca os dias de dose aplicada e mapeia o local corporal utilizado para fácil alternância (evitando cicatrizes e lipodistrofia).

### 2.6 Dados/Evolução (`NativeEvolution.jsx`)
- **Objetivo**: Painel analítico de perda de peso e controle glicêmico.
- **Funcionalidades**:
  - **Gráfico de Linha**: Visualização gráfica bezier estilizada com os últimos registros de peso ou glicose.
  - **Comparador Visual de Fotos**: Permite selecionar até 4 registros históricos diferentes para exibi-los lado a lado em cards de aspecto `3/4`, calculando a diferença exata de peso (ex: `-1.5kg`) entre as datas selecionadas.
  - **Modal Fullscreen**: Visualização lado a lado em tela cheia com fundo ambientado (blur) e badge flutuante contendo o total de peso eliminado.

### 2.7 Perfil (`NativeProfile.jsx`)
- **Objetivo**: Ajustes de metas, protocolo e privacidade.
- **Funcionalidades**:
  - **Configurador de Protocolo**: Modal completo para trocar o medicamento (Ozempic, Wegovy, Mounjaro, Rybelsus) e a dosagem de forma simples.
  - **Metas de Saúde**: Controles rápidos na tela para incrementar/decrementar as metas diárias de ingestão de proteínas, água e fibras.
  - **Registro de Aplicação**: Modal com lista tátil destacando locais sugeridos e permitindo registrar a injeção manualmente.
  - **Lembretes e Exclusão Segura**: Interruptor de notificações e fluxo duplo de segurança para eliminação definitiva de dados.
  - **Foto de Perfil**: Integração com a câmera ou galeria do aparelho para atualizar a foto de avatar em tempo real.

---

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
  jornadas: onboarding como convidado, login com conta seedada, metas
  diárias, registrar dose, e convidado virando conta (migração
  localStorage → Supabase). Precisa de um **projeto Supabase de TESTE
  separado** (nunca produção) — rodar `supabase/schema.sql` nele, colar
  `EXPO_PUBLIC_SUPABASE_URL`/`EXPO_PUBLIC_SUPABASE_ANON_KEY`/
  `SUPABASE_SERVICE_ROLE_KEY` em `.env.test.local` (gitignored), depois
  `npm run test:e2e:seed` e `npm run test:e2e`.
- **`data-testid`** foi adicionado nos elementos-chave de Login, Onboarding,
  App (nav + banner de convidado) e Dashboard, já que o app não usa router
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
simples como essa (testado e confirmado funcionando em 2026-08-25).
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

Ainda não implementado — hoje o onboarding (`NativeOnboarding.jsx`/
`Onboarding.jsx`) só aceita peso/altura sem escolha de sistema.

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

- **Histórico**: nova seção "Refeições Registradas" no topo do
  `NativeLogs.jsx` (Diário) — lista as refeições salvas em `meal_logs`
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
