# Pendências e problemas conhecidos

Revisado em 2026-10-07. Marque `[x]` e anote a data ao resolver.

## Antes de publicar nas lojas (App Store / Google Play)

- [ ] `app.json` sem `ios.bundleIdentifier` e `android.package`
  (obrigatórios para gerar o build assinado).
- [ ] `app.json` sem `icon` e `splash` próprios (cai no ícone padrão do Expo).
- [ ] `app.json` sem `ios.buildNumber` / `android.versionCode`.
- [ ] Sem `eas.json` (configuração de build e envio pelo EAS, o caminho
  padrão do Expo para gerar `.ipa` / `.aab`).
- [ ] Termos de uso e política de privacidade publicados (as lojas exigem; app
  de saúde, LGPD/GDPR).
- [ ] Textos, categoria, capturas de tela e classificação etária das lojas
  (começar em pt e en).
- [ ] **Apagar conta não apaga o login.** `userService.deleteUserAccount`
  remove a linha de `profiles` (e, em cascata, os registros), mas o usuário
  continua em `auth.users`. A Apple exige exclusão completa da conta dentro do
  app: precisa de uma Edge Function com service role que chame
  `auth.admin.deleteUser`.
- [ ] **Análise de foto aceita chamada sem login** (temporário, para o modo
  convidado). Antes de lançar: decidir entre exigir conta, usar login anônimo
  do Supabase ou manter os limites por IP de hoje (`ARQUITETURA.md` §5). Ver
  também o comentário em `userService.analyzeMealPhoto`.
- [ ] Teto de gasto/alerta de cobrança na chave do Gemini (Google AI Studio /
  Google Cloud).

## Infraestrutura e testes

- [ ] **CI no GitHub** rodando testes e build a cada PR (`TESTES.md` §2,
  item 1).
- [ ] Projeto Supabase **de teste** para as specs e2e com conta
  (`TESTES.md` §1).
- [ ] Testes de RLS (uma conta não acessa dados de outra).
- [ ] Testes da Edge Function com Gemini falso.
- [ ] Roteiro de teste manual no celular para câmera, código de barras,
  notificações e gestos.
- [ ] Atualizações do Expo disponíveis (`npx expo install --check`; em
  2026-10-07: expo 57.0.26 → 57.0.27 e mais 2 pacotes).

## Produto (decidido, ainda não feito)

- [ ] Fotos de progresso só ficam no aparelho, mesmo com conta (decisão da
  fase de testes). Para sincronizar: Supabase Storage com acesso só do dono.
- [ ] Benchmark de modelos para a análise de foto (OpenRouter), planejado em
  `historico/mobile_documentation.md` §7.13.
- [ ] Gráfico de nutrientes no Progresso: validar com uso real se fica ou sai
  (em avaliação desde 2026-10-07).

## Avisos conhecidos no console (sem efeito para o usuário)

- `"shadow*" style props are deprecated. Use "boxShadow"` (web).
- `[expo-notifications] Listening to push token changes is not yet fully
  supported on web` (notificações são só iOS/Android).
- `Unknown event handler property onResponder…` (web): vem dos `Path` tocáveis
  do mapa do corpo (`react-native-svg` com `onPress` no navegador).
- `TouchableMixin is deprecated` (web): vem do `react-native-chart-kit` usado
  no gráfico de peso.
