# Testes

Estado em 2026-10-07: **70 testes unitários passando**; **e2e com 3 passando e
2 pulados** (os 2 de login precisam de um projeto Supabase de teste, que ainda
não existe).

```bash
npm test                 # unitários (Vitest), ~2 s, sem rede
npm run test:e2e         # Playwright no Expo Web (sobe `npm run web` sozinho)
npm run test:e2e:ui      # o mesmo, com a interface do Playwright
npm run test:e2e:seed    # cria a conta fixa no projeto Supabase de TESTE
```

## 1. Camadas

### Unitários (`tests/unit/`, Vitest)

Lógica pura, sem rede e sem tela. É a camada mais barata: todo cálculo novo
deve entrar aqui.

| Arquivo | Garante |
|---|---|
| `i18n.test.js` | os 6 idiomas têm as mesmas chaves e placeholders; idioma do aparelho resolvido certo |
| `units.test.js` | conversões e formatação métrico/imperial |
| `reminders.test.js` | o plano de notificações (o que agendar, o que se cancela sozinho) |
| `supplements.test.js` | marcar/desmarcar, whey somando nas metas, dia da semana/mês de cada suplemento |
| `progressCharts.test.js` | histórico de nutrientes, média e metas, lembrete de medidas |
| `foodService.test.js` | busca nos alimentos criados pela pessoa e conversão para item da refeição |
| `userService.test.js` | gravação/leitura no Supabase contra um falso em memória (`tests/helpers/supabase-fake.js`) |
| `securityUtils.test.js` | limpeza de texto digitado |

### Ponta a ponta no navegador (`tests/e2e/`, Playwright)

O Playwright abre o app web de verdade (Chromium, em pt-BR) e clica como uma
pessoa. Os seletores são os `testID` dos componentes.

| Spec | Jornada | Precisa de Supabase de teste? |
|---|---|---|
| `onboarding-convidado.spec.js` | "Continuar" → onboarding → Hoje | não |
| `metas-diarias.spec.js` | + / − de água, proteína e fibra | não |
| `registrar-dose.spec.js` | registrar aplicação soma ao histórico | não |
| `login-e-dashboard.spec.js` | login com conta semeada mostra os dados | **sim** |
| `convidado-vira-conta.spec.js` | dados do convidado migram para a conta nova | **sim** |

As specs que precisam de conta são **puladas** (não falham) sem
`.env.test.local`. Atenção ao ler o resultado: "passou" com "2 skipped"
significa que login e sincronização não foram testados.

**Nunca rodar contra produção.** As specs com conta exigem um projeto Supabase
separado. Com `.env.test.local` presente, o Playwright sempre sobe um servidor
novo apontando para ele (não reaproveita o `npm run web` aberto, que aponta
para produção).

Para ativar as specs com conta:
1. Criar um projeto Supabase de teste (pode ser no plano gratuito).
2. Rodar `supabase/schema.sql` no SQL Editor dele.
3. Em Authentication, desligar a confirmação de e-mail.
4. Criar `.env.test.local` com `EXPO_PUBLIC_SUPABASE_URL`,
   `EXPO_PUBLIC_SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY` desse
   projeto.
5. `npm run test:e2e:seed` e depois `npm run test:e2e`.

### O que nenhum teste automático cobre hoje

Coisas que só existem no celular ou que a web não reproduz bem. Precisam de
conferência manual no Expo Go antes de cada versão:

- câmera e galeria (foto do prato, foto de progresso);
- leitura de código de barras;
- notificações (agendar, disparar, cancelar sozinhas);
- gestos com os dedos (pinça e arraste no comparador, sliders, rolagem);
- compartilhar a imagem do comparador;
- a análise de foto pela Edge Function (depende do Gemini);
- políticas de acesso (RLS) do Supabase: uma conta não pode ler dados de outra.

## 2. A suíte do Tour Sinop serve para o Mounjoy?

Analisada em 2026-10-07 (repositório `planoralabs/toursinop`, branch
`test/suite-e2e`). **Não dá para copiar**, mas várias ideias valem. A primeira
versão dos testes do Mounjoy (agosto/2026) já foi feita inspirada nela.

### Por que não dá para copiar

| Tour Sinop | Mounjoy |
|---|---|
| Site web (React + Vite) | App nativo (Expo) que também roda na web |
| Firebase (Firestore + Auth) | Supabase (Postgres + Auth) |
| 12 funções de servidor em `api/` (Vercel) | Não tem `api/`: o app fala direto com o Supabase, protegido por RLS; só 1 Edge Function |
| Pagamento (Asaas), e-mail (Resend), nota fiscal | Nada disso |
| Testes com `node:test` e falsos de Firestore/Asaas | Vitest + Playwright, falso do supabase-js |
| Emulador do Firestore (Java) para regras | Equivalente seria o Supabase local (Docker) |

O núcleo da suíte deles (`tests/e2e/`) testa as rotas de `api/` por HTTP com
falsos do Firestore e do gateway de pagamento. O Mounjoy não tem essas rotas,
então esse código não tem onde ser aplicado. E ela não tem nada para app nativo:
o próprio README diz que nada da interface é renderizado.

### O que vale trazer (por ordem de retorno)

1. **CI no GitHub (o mais importante).** Um workflow como o
   `.github/workflows/ci.yml` deles: a cada push/PR roda `npm ci`, `npm test`,
   `npm run test:e2e` (as specs sem conta) e `npm run build:web`. Um PR que
   quebra algo fica vermelho antes do merge, sem depender de lembrar de rodar
   os testes. **Ainda não existe no Mounjoy.**
2. **Convenção `todo` para defeito conhecido.** Achou um bug e não vai
   corrigir agora? Escreve o teste do comportamento **certo** marcado como
   pendente (no Vitest, `it.fails(...)`), com arquivo e consequência no nome.
   Quando o bug for corrigido, o teste avisa e a marcação sai no mesmo commit.
   Evita que bugs anotados se percam.
3. **Um teste de jornada encadeada.** Deles: `jornada.test.mjs`, que passa por
   todas as etapas sem preparar dados no meio, pegando defeitos *entre* etapas.
   Para o Mounjoy: Continuar → onboarding → registrar dose → refeição digitada
   → suplemento → Diário mostra tudo → Progresso mostra os gráficos.
4. **Testes de regras de acesso (RLS).** Equivalente ao `firestore-rules.test`
   deles: com o projeto de teste, conferir que a conta A não lê nem altera
   linhas da conta B em cada tabela. É a proteção de dados de saúde.
5. **Teste da Edge Function com Gemini falso**, como o falso de gateways
   deles: limites por conta/IP/global, intervalo mínimo, foto grande demais,
   resposta malformada do modelo.
6. **Testes de contrato**: `schema.sql` contém tudo o que as migrações criam;
   todo campo gravado por `saveUserProfile` é lido de volta por
   `getUserProfile` (ida e volta sem perder dado).
7. **Roteiro de teste manual** para o que só o celular faz (a lista acima),
   como o `README-teste-manual.md` deles.
8. **Testes no celular de verdade**: se virar prioridade, Maestro (mais
   simples que Detox para Expo) roda roteiros no simulador iOS / emulador
   Android.

## 3. Ao escrever um teste novo

- Nome descreve a consequência para o usuário, não a implementação.
- Lógica nova em `src/utils/` → teste em `tests/unit/` no mesmo commit.
- Fluxo novo de tela → `testID` nos elementos e, se for um fluxo central, uma
  spec em `tests/e2e/` que funcione no modo convidado (sem Supabase).
- Datas: use datas fixas (`new Date(2026, 9, 7)`), nunca "hoje", para o teste
  não mudar de resultado com o calendário.
