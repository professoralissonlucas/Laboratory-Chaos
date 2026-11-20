# CLAUDE.md — Laboratory Chaos

Guia para trabalhar neste repositório. A especificação detalhada do estado atual está em [SPEC.md](SPEC.md); leia-a antes de mudanças maiores.

## Resumo do projeto

**Laboratory Chaos** ("LAB 2.0") é um jogo escolar 2D top-down em pixel art, feito em **HTML, CSS e JavaScript puro**. O jogador controla um estudante num laboratório com 5 salas, precisa concluir **6 tarefas** (minijogos abertos com a tecla **E**) em **5 minutos**, enquanto **eventos aleatórios** (apagão, gás, portas travadas, alarme) atrapalham. Adversários e salas "multijogador" são **simulados localmente** — não há servidor, rede nem persistência.

- Idioma da interface e do código: português (pt-BR).
- Para executar: abrir `index.html` no navegador (ou servir a pasta com qualquer servidor estático). Não há build, dependências nem testes automatizados.

## Estrutura de arquivos

```
rafisa/
├── index.html    # Todas as telas (<main class="screen">) e overlays
├── style.css     # Visual pixel art, paleta no :root, breakpoint único de 700px
├── script.js     # Toda a lógica, dentro de um único DOMContentLoaded
├── SPEC.md       # Especificação do estado atual e limitações conhecidas
├── CLAUDE.md     # Este arquivo
├── .gitignore
└── assets/
    ├── images/   # vazio (reservado)
    └── sounds/   # vazio (reservado)
```

Pontos-chave do `script.js` (ordem aproximada no arquivo):

- Navegação: `abrirTela(id)` + botões com `data-screen`.
- Personagem: `personagens`, `personagem`, `desenharPersonagem()`, `atualizarPersonagem(delta)`.
- Mapa: listas `paredes`, `portas`, `obstaculos`; `checarColisao()` (AABB); `desenharFundo()`.
- Eventos: `configuracaoEventos`, `eventosAleatorios`, `iniciarEvento()`, `finalizarEvento()`, `agendarProximoEvento()`.
- Tarefas: `tarefas`, `objetosColetaveis`, `abrirTarefa()`, funções `interface<Tarefa>()`, helpers `criarOpcoes()`, `barraProgresso()`, `concluirTarefa()`, `erroTarefa()`.
- Partida: `partida`, `adversarios`, `iniciarPartida()`, `atualizarPartida()`, `verificarResultado()`, `finalizarPartida()`.
- Salas locais: objeto `salasLocais`, `exibirLobby()`, `atualizarSalasPublicas()`.
- Loop: `executarJogo(tempo)` via `requestAnimationFrame`, ativo só com `play-screen` visível.

## Convenções

- **Identificadores e comentários em português** (`personagem`, `abrirTarefa`, `// Desenha as portas...`).
- **IDs e classes HTML em inglês, kebab-case** (`play-screen`, `task-modal`, `event-panel`).
- **Retângulos sempre no formato `{ x, y, largura, altura }`** (paredes, portas, obstáculos, área de gás etc.).
- **UI mostrada/ocultada com o atributo `hidden`** (modal de tarefa, overlays, lobby).
- **Telas trocadas com a classe `active`** em `.screen` (via `abrirTela()`).
- **Texto vindo de dados inserido com `textContent`**, nunca `innerHTML` com conteúdo variável.

## Regras permanentes

1. **Não mudar a identidade visual**: manter a paleta do `:root` (`--night`, `--panel`, `--panel-light`, `--blue`, `--purple`, `--pink`, `--yellow`, `--gray`, `--white`), a fonte `"Courier New", monospace`, a estética pixel art, as bordas pretas grossas, as sombras sólidas deslocadas e **nenhuma borda arredondada**.
2. **Não remover funcionalidades que já funcionam.**
3. **Sem frameworks ou bundlers no front-end** — apenas HTML, CSS e JavaScript puro.
4. **Mudanças pequenas e incrementais**, explicando cada uma ao usuário.
5. **É um projeto escolar**: código legível, com comentários curtos em português.
