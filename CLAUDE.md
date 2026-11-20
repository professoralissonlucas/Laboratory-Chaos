# CLAUDE.md — Laboratory Chaos

Guia para trabalhar neste repositório. A especificação detalhada do estado atual está em [SPEC.md](SPEC.md); leia-a antes de mudanças maiores.

## Resumo do projeto

**Laboratory Chaos** ("LAB 2.0") é um jogo escolar 2D top-down em pixel art, feito em **HTML, CSS e JavaScript puro**. O jogador controla um estudante num laboratório com 5 salas, precisa concluir **6 tarefas** (minijogos abertos com a tecla **E**) em **5 minutos**, enquanto **eventos aleatórios** (apagão, gás, portas travadas, alarme) atrapalham.

Há dois modos:
- **Solo** (botão JOGAR): adversários simulados, tudo no navegador. Funciona até abrindo `index.html` direto.
- **Multiplayer** (tela SALAS): servidor **Node.js + Express + Socket.IO**, sem banco de dados (tudo em memória). Salas públicas/privadas, 3 a 5 jogadores, servidor autoritativo (cronômetro, eventos, validação de tarefas, resultado).

- Idioma da interface e do código: português (pt-BR).
- Sem build. Testes automáticos do multiplayer: `cd server && npm test` (sobe o servidor numa porta livre e simula de 3 a 6 jogadores com `socket.io-client`; `URL_TESTE=<url> npm test` testa um servidor já rodando). Rode-os depois de qualquer mudança no `server/index.js` ou nos eventos Socket.IO.

## Publicação e execução

- **Front-end**: GitHub Pages publica a **raiz** do repositório (https://professoralissonlucas.github.io/Laboratory-Chaos/). Por isso os arquivos do jogo ficam na raiz e **todos os caminhos são relativos** (nada começando com `/`).
- **Servidor online**: Render, com *Root Directory* `server`, build `npm install`, start `npm start`. A URL vai em `URL_SERVIDOR_ONLINE` no `config.js`.
- **Rede da escola (sem internet)**: `cd server`, `npm install`, `npm start`. O Express também serve o jogo da pasta raiz; o terminal mostra os endereços `http://IP:3000` para os colegas.
- `config.js` escolhe o servidor: `*.github.io` → Render; porta 5500 (Live Server) → mesmo host na porta 3000; `localhost`/IP → `location.origin`; `file://` → nenhum (só solo).
- O `script.js` carrega `${URL_SERVIDOR}/socket.io/socket.io.js` dinamicamente. Enquanto carrega, a tela Salas mostra "CONECTANDO AO SERVIDOR..."; se falhar ou passar de 15s, mostra "SERVIDOR OFFLINE" (o solo nunca depende disso).
- Variáveis do servidor: `PORT` (padrão 3000) e `ORIGENS_PERMITIDAS` (CORS, separadas por vírgula; padrão: o github.io e `localhost`/`127.0.0.1` nas portas 3000 e 5500).

## Estrutura de arquivos

```
rafisa/                  # raiz = o que o GitHub Pages publica
├── index.html           # Todas as telas (<main class="screen">) e overlays
├── style.css            # Visual pixel art, paleta no :root, breakpoint de 700px + bloco de toque (pointer: coarse)
├── config.js            # URL do servidor multiplayer (carregado antes do script.js)
├── script.js            # Toda a lógica do cliente, dentro de um único DOMContentLoaded
├── assets/              # images/ e sounds/ vazios (reservados)
├── server/              # Servidor isolado, com package.json próprio
│   ├── package.json     # "npm start" / "npm test"; deps: express, socket.io; dev: socket.io-client
│   ├── index.js         # Socket.IO + regras das salas/partida (+ arquivos estáticos no modo local)
│   └── scripts/
│       └── teste-multiplayer.js  # Teste automático (npm test)
├── SPEC.md              # Especificação do estado atual e limitações conhecidas
├── CLAUDE.md            # Este arquivo
└── .gitignore           # ignora node_modules/ (em qualquer pasta)
```

O servidor nunca entrega `server/` nem arquivos/pastas começando com ponto (como `.git/`) quando serve o jogo localmente.

Seções do `script.js` (cada uma com comentário de cabeçalho):

1. Navegação e configurações — `abrirTela(id)`, botões `data-screen`, volume/efeitos.
2. Personagem — `personagem`, `posicaoDeSaida()`, `escolherPersonagem()`, `aplicarVelocidade()`, `desenharBoneco()` (qualquer jogador), `desenharNome()`/`organizarPlaquinhas()` (nomes sem sobreposição), `atualizarPersonagem(delta)`.
3. Mapa — `paredes`, `portas`, `obstaculos`, `caixaColisao()` (hitbox 28×28 nos pés), `checarColisao(soFixos)` (true se colide; usada por eixo em `atualizarPersonagem`), `salasDoMapa`/`salaDoPonto()` (interação só na mesma sala), `desenharFundo()`.
4. Eventos — `eventosAleatorios`, `iniciarEvento()` (sorteio solo), `aplicarEvento(id, duração, portas)`, `finalizarEvento()`, `agendarProximoEvento()`.
5. Tarefas — `tarefas`, `objetosColetaveis`, `alvoDaInteracao()` (o que o E aciona; usado também por `desenharDestaqueInteracao()`), `interface<Tarefa>()`, `concluirTarefa()` (rede: pede validação), `marcarTarefaConcluida()`.
6. Partida — `modoJogo` ("solo" | "rede"), `iniciarPartida(modo, dados)`, `atualizarPartida()` (só solo), `verificarResultado()`, `pausarPartida()`/`congelarPartida()`.
7. Salas — objeto `rede`, `outrosJogadores` (posições recebidas + interpolação de 100ms em `atualizarOutrosJogadores()`), `enviarPosicao()` (~15x/s), `salasRede`, `exibirLobby()`, `conectarServidor()` (carrega o cliente Socket.IO) e `iniciarSocket()` (todos os `socket.on`).
8. Celular — `organizarLayoutToque()`, gaveta (`abrirPaineis()`), `atualizarResumoToque()`, direcional (`aplicarDirecional()`), botão E (`interagir()`), `alternarTelaCheia()`.
9. Loop principal e inicialização — `executarJogo(tempo)` via `requestAnimationFrame`.

O `server/index.js` repete algumas regras do cliente (seção "REGRAS", ex.: tarefas, durações dos eventos, portas travadas). Ao mudar uma regra, mude nos dois arquivos.

## Convenções

- **Identificadores e comentários em português** (`personagem`, `abrirTarefa`, `// Desenha as portas...`).
- **IDs e classes HTML em inglês, kebab-case** (`play-screen`, `task-modal`, `event-panel`).
- **Retângulos sempre no formato `{ x, y, largura, altura }`** (paredes, portas, obstáculos, área de gás etc.).
- **UI mostrada/ocultada com o atributo `hidden`** (modal de tarefa, overlays, lobby).
- **Telas trocadas com a classe `active`** em `.screen` (via `abrirTela()`).
- **Texto vindo de dados inserido com `textContent`**, nunca `innerHTML` com conteúdo variável.
- **Celular**: estilos de toque só dentro de `@media (pointer: coarse)` (fim do `style.css`); controles de toque usam Pointer Events e alimentam `teclasPressionadas`/`interagir()`, nunca uma lógica de movimento própria.

## Regras permanentes

1. **Não mudar a identidade visual**: manter a paleta do `:root` (`--night`, `--panel`, `--panel-light`, `--blue`, `--purple`, `--pink`, `--yellow`, `--gray`, `--white`), a fonte `"Courier New", monospace`, a estética pixel art, as bordas pretas grossas, as sombras sólidas deslocadas e **nenhuma borda arredondada**.
2. **Não remover funcionalidades que já funcionam.**
3. **Sem frameworks ou bundlers no front-end** — apenas HTML, CSS e JavaScript puro. O cliente Socket.IO vem do próprio servidor (carregado dinamicamente a partir do `config.js`), sem CDN. Não converter o `script.js` para ES modules (quebra ao abrir o `index.html` direto).
4. **Mudanças pequenas e incrementais**, explicando cada uma ao usuário.
5. **É um projeto escolar**: código legível, com comentários curtos em português.
