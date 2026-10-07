# Mounjoy — guia para quem mexe no código

App de acompanhamento de tratamento com GLP-1 (Mounjaro, Ozempic…). Um único
código **Expo / React Native** que roda em iOS, Android (Expo Go) e no
navegador (react-native-web). Backend: **Supabase** (Postgres + Auth + Edge
Function). A landing de marketing é outro projeto, em `landing/`.

Documentação completa em [`docs/`](docs/README.md). Leia antes de mudar algo
grande:

- [`docs/ARQUITETURA.md`](docs/ARQUITETURA.md): pastas, modelo de dados do
  usuário, onde cada coisa é salva, Supabase, i18n, unidades.
- [`docs/FUNCIONALIDADES.md`](docs/FUNCIONALIDADES.md): o que cada tela faz e
  as regras de negócio.
- [`docs/TESTES.md`](docs/TESTES.md): como testar e o que está coberto.
- [`docs/PENDENCIAS.md`](docs/PENDENCIAS.md): o que falta para lançar e os
  problemas conhecidos.

## Comandos

```bash
npm run web          # app no navegador, http://localhost:8081 (o mesmo Metro serve o Expo Go)
npm start            # Expo para o celular (Expo Go, mesma rede Wi-Fi)
npm test             # testes unitários (Vitest, sem rede)
npm run test:e2e     # Playwright contra o Expo Web
npm run build:web    # build web de produção em dist/
```

Em desenvolvimento, **"Entrar com paciente teste"** na primeira tela carrega o
Paciente Teste (`src/utils/demoUser.js`): 60 dias de dados, só em memória.

## Regras que evitam regressões

Confira esta lista antes de dar uma mudança por terminada.

1. **Texto de tela só por i18n, nos 6 idiomas.** Toda string visível vai em
   `src/i18n/locales/{pt,en,es,fr,it,de}.json`, com as mesmas chaves e
   placeholders (`tests/unit/i18n.test.js` falha se faltar algum). Plural usa
   `_one` / `_other`. Textos de permissão do sistema (câmera etc.) ficam em
   `src/i18n/native/*.json`.
2. **Datas e números com `formatDate` / `formatNumber`** de `src/i18n`. Nunca
   `'pt-BR'` fixo nem `toLocaleString` direto.
3. **Unidades: sempre grava em métrico** (kg, m, cm, L, g). Exibição e
   entrada passam por `unitsFor(user)` (`src/utils/units.js`).
4. **O que é gravado são chaves estáveis, não texto de tela**: id do local de
   aplicação, dia da semana 0–6, id do suplemento, chave do nutriente.
5. **Dias**: use os helpers de `src/utils/journal.js` (`intakeKey`,
   `isSameDay`, `startOfDay`, `daysBetween`, `recordDateFor`). A chave de
   `dailyIntakeHistory` é `intakeKey(data)` (`AAAA-MM-DD` do dia local).
6. **Medidas corporais** são entradas de `measurements` com `weight: 0`.
   Pesagens e medidas se separam com `weightLogs` / `bodyLogs`; nunca leia
   `measurements` cru para o gráfico de peso.
7. **O registro do usuário é imutável**: sempre `setUser({ ...user, campo })`.
   `App.js` cuida de salvar.
8. **Campo novo que precisa persistir para quem tem conta** exige as quatro
   coisas: migração nova em `supabase/migrations/AAAAMMDD_nome.sql` (só
   acrescentar, nunca apagar coluna), o mesmo trecho em `supabase/schema.sql`,
   gravação em `userService.saveUserProfile` e leitura em
   `userService.getUserProfile`. Colunas de migração nova são gravadas dentro
   de `withNewerSchema(...)`, para o app não quebrar antes de a migração rodar.
   Sem isso o dado some ao entrar em outro aparelho.
9. **Registros passam pela central**: `useLog().openLog(tipo, { date })`
   (`NativeLogCenter.jsx`). Não crie modais de registro paralelos.
10. **Lógica em `src/utils/`, tela fina.** Cálculo novo vira função pura com
    teste em `tests/unit/`.
11. **Elemento tocável novo ganha `testID`** (vira `data-testid` na web; é o
    que os testes e2e usam).
12. **Tem que funcionar na web também.** `Alert.alert` não faz nada na web
    (mostre a mensagem na tela); câmera, código de barras e notificações são
    só iOS/Android: confira com `Platform.OS`.
13. **Gestos**: nada de `onStartShouldSetResponder` em contêineres (trava a
    rolagem). Veja `NativePhotoCompare.jsx` e `NativeUI.jsx` (Slider) como
    referência de gesto.
14. **Segredos nunca no app.** Variável `EXPO_PUBLIC_*` vai para o bundle e
    qualquer um lê. Chaves de servidor (Gemini, service role) só como secret
    da Edge Function ou em `.env.local` para scripts.
15. **Recurso novo aparece no Paciente Teste.** Atualize
    `src/utils/demoUser.js` para dar para ver e testar sem cadastrar nada.
16. **Créditos das bases de alimentos** (TACO, USDA, Open Food Facts) ficam
    num ponto só: embaixo de "Confirmar refeição" (`NativeMealScan.jsx`).

## Antes de commitar

1. `npm test` e `npm run test:e2e` passando.
2. Olhar a mudança no navegador (`npm run web`) em largura de celular.
3. Atualizar `docs/` se mudou comportamento, dado ou regra.

Branch de trabalho: `develop-app` → PR para `main`. Mensagens de commit em
inglês, no formato `feat(area): ...` / `fix(area): ...`.
