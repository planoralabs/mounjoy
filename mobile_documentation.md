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
