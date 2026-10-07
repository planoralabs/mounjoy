# Funcionalidades e regras de negócio

Estado de outubro/2026. Cada item diz o que o usuário vê e a regra por trás.
Quando mudar um comportamento, atualize aqui.

## Navegação

Quatro abas e um botão central **+**:

| Aba | Pergunta que responde | Arquivo |
|---|---|---|
| Hoje | "O que eu faço hoje?" | `NativeToday.jsx` |
| Diário | "O que aconteceu no dia X?" | `NativeJournal.jsx` |
| + | "Quero registrar algo" | `NativeLogCenter.jsx` |
| Progresso | "Quanto já avancei?" | `NativeProgress.jsx` |
| Perfil | "Meu tratamento e ajustes" | `NativeProfile.jsx` |

## Entrada

- **Primeira tela** (`NativeWelcome.jsx`): login/cadastro por e-mail, botão
  **Continuar** (convidado, dados só no aparelho) e, só em desenvolvimento,
  **Entrar com paciente teste**.
- **Onboarding**: nome, sistema de unidades (pré-selecionado pelo aparelho),
  peso/altura, meta, medicamento, dose e dia da aplicação.

## Hoje

De cima para baixo:

1. Data, saudação ("Oi, Nome!") e "Xª semana de [medicamento]". Sem emojis.
2. **No máximo um aviso**: "Dia da sua dose" quando a dose vence hoje, ou
   "Cuidado com o ruído alimentar" a partir do 5º dia depois da dose
   (só medicamento semanal).
3. **Próxima dose**: contagem regressiva ou "Feito hoje ✓", medicamento e
   dose (toque troca o protocolo), botão de registrar, local sugerido e dica
   do ciclo. Comprimido diário funciona igual, com intervalo de 1 dia.
4. **Metas de hoje**: água, proteína, fibra, carboidratos, gorduras e
   calorias, com + / − e toque no valor para digitar. Confete ao bater a meta.
   Logo abaixo, "Escanear refeição".
5. **Suplementos** (ver seção própria).
6. **Foto do dia**.
7. **Lembrete de medidas**: só aparece se a pessoa nunca mediu cintura/quadril
   ou se a última medida tem 14 dias ou mais (`measuresDue`). Toque abre o
   registro; "×" esconde por 7 dias (guardado só no aparelho).
8. **Seu peso**: atual, variação, barra até a meta e ritmo semanal.
9. Alertas: platô (3 últimas pesagens iguais) e proteína baixa (depois das
   14h, abaixo de 40% da meta). Depois, a dica do dia.
10. Simulador de dias: só em desenvolvimento.

## Central de registros (+)

Menu: Peso, Aplicação (ou Comprimido), Como estou, Refeição, Foto de progresso
e Medidas. Qualquer tela abre com `useLog().openLog(tipo, { date })`; vindo do
Diário, o registro vai para o dia escolhido (no horário atual).

- **Aplicação**: dose, medicamento e local no mapa do corpo
  (`NativeBodySelector.jsx`). O local sugerido evita os 3 últimos usados
  (`suggestNextInjection`). No mapa, o contorno do corpo é contínuo e as
  divisões entre regiões são tracejadas.
- **Como você se sente?**: sintomas, ruído alimentar (0–10) e anotação. O
  ruído alimentar só é salvo se a pessoa mexer no controle. Só anotação, sem
  sintomas nem ruído, vira uma entrada de "Anotação".
- **Medidas**: cintura e/ou quadril (pode ser só um dos dois).

## Refeições

1. "Registrar refeição" pergunta primeiro: **Foto do prato** ou **Digitar
   alimentos**.
2. **Foto**: câmera ou galeria, peso aproximado do prato opcional (melhora a
   estimativa). A análise pode ser minimizada: um banner acima das abas mostra
   o progresso e reabre o resultado.
3. **Digitar**: abre a busca direto. Se a pessoa fechar a busca sem adicionar
   nada, o registro é cancelado e volta para a escolha (sem banner).
4. **Revisão** (os dois caminhos terminam aqui): cada alimento com
   quantidade (− / campo / +, centralizado), calorias e os 4 macros em 2×2;
   botão "+ Adicionar alimento"; resumo da refeição; "Confirmar refeição". Os
   créditos das bases ficam embaixo deste botão, e só aqui.
5. Ao confirmar, os totais entram no dia (`dailyIntakeHistory`). Apagar a
   refeição no Diário tira os totais de volta.

**Busca de alimentos** (`NativeFoodSearch.jsx`): sem acento, todas as
palavras, tolerante a erro de digitação, idioma do usuário primeiro; alimentos
criados pela pessoa aparecem antes e marcados "Meu alimento". Recentes ficam
no aparelho, com a última porção usada. **Criar alimento** usa os valores do
rótulo por 100 g. **Código de barras** (só celular) consulta o Open Food
Facts; produto não encontrado abre "Criar alimento" e é lembrado.

## Suplementos

- Configurados no Perfil ou pelo ícone do card em Hoje: catálogo
  (multivitamínico, vitamina D, B12, ferro, cálcio, magnésio, ômega-3,
  creatina, colágeno), whey e "Outro" com nome livre.
- Frequência diária, semanal ou mensal. **Semanal pergunta o dia da semana;
  mensal, o dia do mês**, e o dia escolhido fica visível para trocar.
- **Em Hoje só aparece o que vence no dia**: diário sempre; semanal no dia da
  semana escolhido; mensal no dia do mês (em mês mais curto, no último dia).
  Suplementos antigos sem dia definido continuam aparecendo todo dia.
- O card não mostra contagem ("2 de 3"); só o botão de editar no cabeçalho.
- **Whey** tem nutrientes por dose (editáveis, conforme o rótulo); cada dose
  soma nas metas do dia e tirar a dose desconta.
- No Diário, o lápis do registro de suplementos permite ajustar quantos de
  cada foram tomados naquele dia.

## Diário

- Calendário da semana (expansível para o mês) com pontinhos coloridos por tipo
  de registro e legenda. Botão **Hoje** dentro do calendário, acima da
  legenda, quando outro dia ou mês está na tela.
- Resumo do dia: água, proteína, fibra e calorias, cada um com um **anel** do
  percentual da meta. "Ver todos os nutrientes" abre a tabela completa (6
  nutrientes com valor, meta e barra).
- Linha do tempo do dia, mais recente primeiro: aplicações, pesagens, medidas,
  "Como estou", anotações, fotos (agrupadas numa grade) e refeições
  (expansíveis, com os itens; macros em 2×2). Editar/apagar conforme o tipo.
- "Registrar" abre a central já no dia escolhido.

## Progresso

- Números: peso atual, variação desde o início, meta (quanto falta) e IMC
  (toque abre as faixas da OMS).
- **Gráfico com abas Peso | Medidas | Nutrientes** (aba ativa em laranja):
  - **Peso**: linha arrastável, toque no ponto mostra data, peso e IMC. Com
    menos de 2 pesagens mostra um exemplo esmaecido e marcado.
  - **Medidas**: cintura (roxo) e quadril (rosa), arrastável; toque mostra só
    as medidas que existem naquele dia. Embaixo, último valor e variação
    desde a primeira medida.
  - **Nutrientes**: um nutriente por vez (proteína primeiro), uma barra por
    dia registrado (hoje incluído), linha tracejada da meta; barras abaixo da
    meta ficam mais claras. Toque mostra o dia. Resumo: média e em quantos
    dias a meta foi batida. **Calorias contam como limite** ("dentro da meta").
- **Fotos de evolução**: miniaturas com data e peso centralizados; toque abre
  em tela cheia (com excluir). **Comparar antes e depois**: escolher 2 a 4
  fotos; no comparador cada foto pode ser arrastada e ampliada com pinça ao
  mesmo tempo (na web, roda do mouse), e o resultado é compartilhado como
  imagem. O peso de cada foto vem da pesagem mais próxima, em até 3 dias.
- Últimas aplicações e a próxima dose.

## Perfil

Meu tratamento (abre Configurar Protocolo), metas diárias, dados do corpo,
sistema de medidas, lembretes, suplementos e conta (sair, apagar conta).
"Sair" mantém os dados de convidado no aparelho; "Apagar minha conta" remove.

## Lembretes

Notificações locais (só iOS/Android): dose (e dose atrasada), água (1 a 5 por
dia a partir de um horário), proteína e pesagem (diária ou semanal). Um
lembrete cuja tarefa já foi feita é cancelado sozinho. Detalhes em
`ARQUITETURA.md` §8.

## Paciente Teste (desenvolvimento)

`src/utils/demoUser.js`, sempre igual (aleatório com semente fixa): 104 → ~96
kg em 60 dias de Mounjaro (2,5 mg → 5 mg), pesagens e fotos a cada 3 dias,
aplicações semanais em rodízio, check-ins, consumo diário, multivitamínico e
creatina diários, vitamina D semanal (num dia fixo da semana), whey, medidas a cada 2 semanas
(a última há 16 dias, para o lembrete aparecer) e refeições de exemplo (TACO)
nos últimos 7 dias, que batem com o consumo desses dias.
