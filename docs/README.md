# Documentação do Mounjoy

| Documento | Para quê |
|---|---|
| [`../CLAUDE.md`](../CLAUDE.md) | Comandos e **regras obrigatórias** para qualquer mudança no código. O Claude Code lê este arquivo sozinho em toda sessão. |
| [`ARQUITETURA.md`](ARQUITETURA.md) | Como o app é montado: pastas, modos de uso, modelo de dados, Supabase, i18n, unidades, lembretes, variáveis de ambiente. |
| [`FUNCIONALIDADES.md`](FUNCIONALIDADES.md) | O que cada tela faz e as regras de negócio. |
| [`TESTES.md`](TESTES.md) | Testes existentes, como rodar, o que não é coberto e o que trazer da suíte do Tour Sinop. |
| [`PENDENCIAS.md`](PENDENCIAS.md) | O que falta para lançar, infraestrutura e avisos conhecidos. |
| [`historico/mobile_documentation.md`](historico/mobile_documentation.md) | Registro das decisões de agosto a outubro/2026 (migração do Vite, desenho da análise de refeições, benchmark de modelos). Partes estão desatualizadas; vale o que está nos documentos acima. |

## Mantendo atualizado

Toda mudança que altera comportamento, dado gravado ou regra de negócio
atualiza o documento correspondente **no mesmo commit**. Decisão importante
(por que escolhemos X e não Y) pode ir para `historico/` com data.
