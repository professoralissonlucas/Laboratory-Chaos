# SPEC — Laboratory Chaos

Documento de especificação e contexto do projeto. Descreve **o que existe hoje** no código (estado atual), como as partes se conectam e quais pontos estão incompletos.

---

## 1. Visão geral

**Laboratory Chaos** ("LAB 2.0") é um jogo 2D top-down em estilo pixel art, feito em **HTML, CSS e JavaScript puro** no navegador (sem frameworks nem build). O jogador controla um estudante dentro de um laboratório dividido em salas e precisa completar **6 tarefas** (minijogos) antes do tempo acabar ou antes dos adversários, enquanto **eventos aleatórios** (apagão, gás, portas travadas, alarme) atrapalham.

Há dois modos:

- **Solo** — adversários simulados no próprio navegador. Funciona sem servidor.
- **Multiplayer** — servidor **Node.js + Express + Socket.IO**, sem banco de dados (tudo em memória). De 3 a 5 jogadores por sala; o servidor é autoritativo.

- Idioma da interface e do código: **português (pt-BR)**.
- Público/contexto: projeto escolar (pasta `projetos3serie`).

---

## 2. Estrutura de arquivos

```
rafisa/                 # raiz = publicada pelo GitHub Pages
├── index.html          # Estrutura de todas as telas
├── style.css           # Visual pixel art e layout responsivo
├── config.js           # URL do servidor multiplayer
├── script.js           # Toda a lógica do cliente (9 seções comentadas)
├── assets/             # images/ e sounds/ vazios (reservados)
├── server/
│   ├── package.json    # "npm start" e "npm test"; dependências: express, socket.io
│   ├── index.js        # Socket.IO + regras das salas/partida (+ estáticos no modo local)
│   └── scripts/teste-multiplayer.js   # teste automático do multiplayer
├── README.md           # Apresentação curta: como jogar, rodar e testar
├── SPEC.md
├── RELATORIO.md        # Revisão, correções, testes e melhorias
└── CLAUDE.md
```

- Gráficos desenhados via **Canvas 2D** com retângulos coloridos; o som do alarme é gerado via **Web Audio API**.
- Controle de versão com git; `node_modules/` é ignorado.
- Todos os caminhos no HTML/CSS/JS são relativos (o Pages publica em `/Laboratory-Chaos/`).

### Como executar
- **Online**: front-end no GitHub Pages (https://professoralissonlucas.github.io/Laboratory-Chaos/); servidor no Render (*Root Directory* `server`, `npm install` / `npm start`). A URL do Render vai em `URL_SERVIDOR_ONLINE` no `config.js`.
- **Rede da escola**: `cd server`, `npm install` e `npm start` (no Windows PowerShell 5.1, um por linha ou separados por `;`, pois `&&` não existe). O Express serve o jogo da pasta raiz e imprime os endereços `http://IP:3000` da rede local.
- **Só solo**: abrir `index.html` direto no navegador (`file://`): sem servidor, a tela Salas mostra "SERVIDOR OFFLINE".
- O `script.js` é carregado com `defer` e tudo roda dentro de um único `DOMContentLoaded` (sem ES modules, para funcionar via `file://`).

### Conexão com o servidor
- `config.js` define `URL_SERVIDOR`: em `*.github.io` usa `URL_SERVIDOR_ONLINE`; na porta 5500 (Live Server do VS Code) usa o mesmo host na porta 3000; em `localhost`/IP usa `location.origin`; em `file://` é `null`.
- `conectarServidor()` cria um `<script>` com `${URL_SERVIDOR}/socket.io/socket.io.js`. Estados na tela Salas: "CONECTANDO AO SERVIDOR..." → "SERVIDOR ONLINE" ou, se falhar/passar de 15s, "SERVIDOR OFFLINE". Se o servidor responder depois (Render acordando), conecta sozinho.

---

## 3. Telas (index.html)

Cada tela é um `<main class="screen">`; apenas a que tem a classe `active` é exibida. A navegação é feita por botões com `data-screen="<id-da-tela>"`.

| ID da tela | Nome | Conteúdo |
|---|---|---|
| `menu-screen` | Menu principal | Título e 5 botões: Jogar, Como Jogar, Configurações, Créditos, Salas |
| `play-screen` | Partida (título "PARTIDA"). Em telas de toque: barra no topo, gaveta de painéis, direcional e botão E (paisagem) ou aviso "GIRE O CELULAR" (retrato) | Seletor de personagem, slider de velocidade (com valor), canvas 800×480 dentro de `.canvas-frame`, HUD, painel de adversários, ajuda de teclado, painel de evento, botão "Testar evento aleatório", progresso de tarefas, modal de tarefa, botões Pausar, Tela cheia e Voltar (em `.match-buttons`, dentro de `#match-panels`) |
| `how-screen` | Como jogar | Objetivo, controles (teclado e celular), tecla E, coletáveis, porta do Reator trancada, eventos e limite de 5 minutos |
| `settings-screen` | Configurações | Volume (0–100%) e efeitos sonoros — ambos afetam o bip do alarme |
| `credits-screen` | Créditos | Texto sobre o projeto |
| `rooms-screen` | Salas | Status do servidor (`#server-status`), criar sala pública/privada, entrar por código, lista de salas públicas, lobby com escolha de personagem |

Elementos sobrepostos (atributo `hidden`):
- `#task-modal` — janela do minijogo (fixa na tela, centralizada, com rolagem).
- `#pause-overlay` e `#result-overlay` — dentro de `.canvas-frame`, cobrem exatamente o canvas (até 700px de largura cobrem a tela toda).

---

## 4. Visual (style.css)

- **Paleta** no `:root`: `--night #13172b`, `--panel #252b4a`, `--panel-light #343d68`, `--blue #62c9df`, `--purple #8b66b5`, `--pink #ed87b8`, `--yellow #f4d35e`, `--gray #bbc1d1`, `--white #fff8dc`.
- Fonte única: `"Courier New", monospace`.
- Estética pixel art: bordas pretas grossas (`#0b0d1b`), sombras sólidas deslocadas, `image-rendering: pixelated`, sem bordas arredondadas.
- Canvas: resolução lógica 800×480, escalado só pelo CSS (`aspect-ratio: 5 / 3`).
- **Responsivo**: breakpoint `@media (max-width: 700px)` — menos espaço interno, HUD em 2 colunas, painéis empilhados; os overlays de pausa/resultado passam a cobrir a tela inteira (`position: fixed`), porque o canvas fica pequeno demais. Testado em 360, 700 e 1280px sem rolagem horizontal. Telas de toque têm regras próprias (ver 4.1).
- Botões desativados (`:disabled`) ficam com 50% de opacidade.
- Tamanhos padronizados no `:root`: `--titulo-tela`, `--titulo-janela`, `--titulo-secao`, `--espaco`, `--espaco-grande` e `--espaco-janela` (menores até 700px).
- Botões de bloco (`.menu-button`, `.back-button`, `.room-action`, `.task-option`): sobem 2px no hover (só com `hover: hover`), afundam 3px ao clicar e têm foco visível com `outline` amarelo de 3px (offset 2px). Transições em `steps(2)`.
- Telas aparecem com `aparecerTela` (opacidade, `steps(4)`); modal, overlays e gaveta com `abrirJanela` (12px, `steps(3)`). O título do menu tem sombra em 3 camadas sólidas.
- No canvas, as marcas de tarefa pendentes pulsam (`PULSO_TAREFA`) e os coletáveis piscam um brilho (`desenharBrilho()`).
- `prefers-reduced-motion: reduce` desliga animações, transições, o pulso e o brilho (CSS e `movimentoReduzido` no script.js).

---

### 4.1 Celular (telas de toque)
- Tudo que é de toque fica no fim do `style.css` ("CELULAR E TOQUE") e só vale em `@media (pointer: coarse)`; no computador `.touch-bar`, `.panels-header`, `.touch-controls` e `.rotate-notice` ficam escondidos.
- Meta viewport com `viewport-fit=cover`; `.screen` usa `100dvh` e `env(safe-area-inset-*)`. Botões com `touch-action: manipulation`.
- `abrirTela()` marca `body.em-partida` na tela da partida; a gaveta usa `body.paineis-abertos`.
- **Paisagem**: `#play-screen` fica fixo (sem rolagem, `touch-action: none`, sem seleção). O `.match-hud` vira uma barra de 56px no topo com `.touch-bar` (resumo `#touch-summary`, ☰ PAINÉIS, Ⅱ `#touch-pause-button`, ⛶). O `.canvas-frame` tem a maior largura que cabe em 5:3 abaixo da barra. `#match-panels` (adversários, ajuda, evento, testar evento, tarefas e botões) vira uma gaveta fixa com rolagem; a barra `#match-toolbar` (personagem/velocidade) é levada para dentro dela pelo `organizarLayoutToque()`. Overlays de pausa/resultado ficam fixos na tela toda.
- **Retrato**: `.rotate-notice` cobre a tela da partida (z-index 70).
- Alvos de toque com no mínimo 44px; campos com fonte de 16px (evita o zoom do iPhone); o código da sala fica ao lado do ENTRAR.

## 5. Lógica do cliente (script.js)

Seções: 1. Navegação e configurações · 2. Personagem · 3. Mapa · 4. Eventos · 5. Tarefas · 6. Partida · 7. Salas · 8. Celular · 9. Loop principal e inicialização.

### 5.1 Navegação
- `abrirTela(id)` troca a classe `active`.
- JOGAR chama `iniciarPartida()` (modo solo).
- Voltar ao menu estando numa sala (lobby ou partida em rede) sai da sala no servidor.

### 5.2 Personagem
- 5 personagens (Azul, Rosa, Roxo, Amarelo, Cinza), desenhados numa grade 16×16 escalada para 48px.
- Movimento com **W A S D** ou **setas**; a diagonal é normalizada. As teclas só controlam o jogo com a `play-screen` ativa (nas outras telas as setas voltam a mexer em sliders e listas) e são ignoradas enquanto se digita num campo de texto. Se a janela perde o foco, todas as teclas são soltas.
- Velocidade vem do slider (80–260). No multiplayer fica travada em 160.

### 5.3 Mapa e colisão
Canvas lógico de **800×480 px**. Mapa definido por listas de retângulos `{ x, y, largura, altura }`: `paredes`, `portas` (com `aberta` e `abertaInicial`) e `obstaculos`.

Salas: Computadores, Principal, Energia, Segurança e Reator (porta do **Reator começa fechada**).

`checarColisao(soFixos)` usa uma **hitbox de 28×28 px nos pés** (`caixaColisao()`), menor que o desenho de 48px, para o personagem passar nas portas de 32px, e devolve `true` se ela toca paredes, obstáculos, portas fechadas ou a nuvem de gás. `atualizarPersonagem()` move **um eixo de cada vez** e desfaz só o eixo que colidiu (na diagonal o personagem desliza pela parede). Se o gás ou uma porta travada surgir em cima do jogador, só paredes e obstáculos bloqueiam até ele sair (`soFixos`). A colisão é resolvida antes do desenho.

`salasDoMapa` guarda o retângulo interno de cada sala; `salaDoPonto(x, y)` diz em qual sala um ponto está (ou `null` nos corredores).

### 5.4 Loop principal
`executarJogo(tempo)` via `requestAnimationFrame`, só com a `play-screen` ativa. Pausado, apenas desenha. Sem pausa: `atualizarPartida()` → `atualizarEvento()` → `atualizarPersonagem()` (com a colisão) → `enviarPosicao()` → desenho.

### 5.5 Eventos aleatórios

| ID | Nome | Efeito | Duração (multiplayer) |
|---|---|---|---|
| `apagao` | APAGÃO | Escurece o canvas (78% opaco) | 8s |
| `gas` | VAZAMENTO DE GÁS | Bloqueia `{304, 304, 144×112}` | 10s |
| `portas` | PORTAS TRAVADAS | Trava Computadores e Energia | 12s |
| `alarme` | ALARME | Painel pisca e bip a cada 1,4s | 8s |

- Solo: `agendarProximoEvento()` sorteia a cada 18–30s (um único timer, cancelado ao reiniciar, pausar ou voltar ao menu) e `iniciarEvento()` aplica com a duração própria de cada evento (a mesma tabela do servidor). O botão "Testar evento" usa 8s.
- Voltar ao menu no meio da partida (`sairDaPartida()`) encerra o evento ativo — o bip do alarme para.
- Multiplayer: o servidor sorteia; o cliente só chama `aplicarEvento(id, duração, portas)` e `finalizarEvento()`.
- Avisos curtos (coleta, recusa de tarefa, jogador saiu) usam `mostrarAviso()` no painel de evento.

### 5.6 Tarefas (minijogos)

| ID | Nome | Mecânica |
|---|---|---|
| `computador` | Reiniciar o computador | ENERGIA → MEMÓRIA → REDE (erro reinicia) |
| `frascos` | Organizar os frascos | Coletar 3 frascos; só então AZUL → ROSA → AMARELO |
| `energia` | Restaurar a energia | AZUL → AMARELO → ROSA |
| `portas` | Desbloquear as portas | ▲ → ■ → ● ; abre todas as portas (só para quem concluiu) |
| `reator` | Estabilizar o reator | 1 → 2 → 3 → 4 |
| `protocolo` | Ativar o protocolo | Coletar 3 cartões e CONFIRMAR |

- Tecla **E**: considera as tarefas a até 100px e os frascos/cartões a até 70px do **centro** do personagem, **só na mesma sala** (`salaDoPonto`), e aciona o **mais próximo**. Assim nenhum coletável fica escondido por uma tarefa vizinha, e o Reator só pode ser usado de dentro da sala (porta aberta).
- **Destaque**: `alvoDaInteracao()` escolhe o alvo (a mesma função usada pelo E) e `desenharDestaqueInteracao()` desenha um contorno de 3px piscando entre `--yellow` e `--pink` a cada 250ms, com borda preta, por cima dos bonecos. Não aparece com o jogo pausado/encerrado, com o modal aberto ou durante o apagão.
- Coletáveis — frascos: (96,144), (336,360), (600,160); cartões: (128,420), (720,112), (720,384).
- Erros piscam o botão com `.wrong`; CONFIRMAR fica `.selected` com os 3 cartões; ao reabrir, passos já feitos aparecem verdes.
- Multiplayer: `concluirTarefa()` pede validação ao servidor; só `tarefa:confirmada` chama `marcarTarefaConcluida()`. Em `tarefa:recusada`, o minijogo volta ao começo (e é redesenhado se estiver aberto).
- A pausa e o fim da partida fecham o modal de tarefa.

### 5.7 Partida
- Estado em `partida` (300s, `pausada`, `encerrada`, `jogadorAtivo`) e `modoJogo` ("solo" | "rede").
- `iniciarPartida(modo, dados)` reinicia personagem, coletáveis, portas, tarefas, evento e adversários.
- **Solo**: 3 adversários simulados. `simularAdversarios()` roda **uma vez por segundo de jogo** (não depende do FPS): 3,5% de chance de um adversário sorteado concluir mais uma tarefa e 0,3% de um ser eliminado. Na simulação, o primeiro adversário chega a 6/6 com mediana de ~3min20s. `verificarResultado()` decide (6 tarefas, último ativo, ou fim do tempo).
- O HUD mostra **JOGADORES ATIVOS** (você + adversários ativos).
- **Multiplayer**: adversários são os outros jogadores (progresso real); o resultado vem do servidor (`partida:fim`). Se a conexão cair, `jogadorAtivo = false` → derrota.
- Pausa completa (movimento, relógio, eventos, bip). No multiplayer só o anfitrião pausa, e pausa para todos.

### 5.8 Movimentação sincronizada (multiplayer)
- Cada personagem (0–4) nasce num ponto da sala principal: `posicaoDeSaida(i)` = `{ x: 296 + 40·i, y: 288 }`.
- `enviarPosicao()` manda `{ x, y, direcao, andando }` a cada 66ms (~15x/s), só quando algo mudou, sem enviar com o jogo pausado ou encerrado (`volatile`: mensagens velhas são descartadas).
- `outrosJogadores` guarda as últimas 10 posições recebidas de cada um. `atualizarOutrosJogadores()` desenha cada um **100ms no passado**, interpolando entre as duas posições ao redor desse momento (fica parado na última se não chegar nada novo).
- `desenharBoneco()` desenha qualquer jogador com o personagem escolhido; `desenharNome()` põe uma plaquinha escura com o nome acima da cabeça. O próprio personagem é desenhado depois dos outros e sem plaquinha; as plaquinhas vêm por último, por cima de todos.
- `organizarPlaquinhas()` evita plaquinhas sobrepostas: a de quem está mais embaixo fica no lugar; as outras sobem de 14 em 14px (ou descem, perto do topo) até achar espaço, com um tracinho ligando à cabeça.
- Outros jogadores não colidem entre si nem com o jogador.

### 5.8.1 Celular (seção 8 do script.js)
- **Direcional** (`#dpad`): Pointer Events com `setPointerCapture`; `aplicarDirecional()` converte a posição do dedo em 8 setores e liga `teclasPressionadas.arrowup/down/left/right` (o mesmo objeto do teclado). `pointerup`/`pointercancel`/`lostpointercapture` soltam.
- **Botão E** (`#touch-e-button`): `pointerdown` chama `interagir()`, a mesma função da tecla E. O `touchstart` dos controles é cancelado para evitar o clique fantasma no modal recém-aberto.
- `soltarTeclas()` também apaga o direcional; é chamada ao girar o aparelho, ao abrir a gaveta, ao pausar e no `blur`.
- `#touch-summary` é atualizado por um `MutationObserver` que observa `#event-name`, `#event-message` e `#tasks-completed`.
- Tela cheia: `alternarTelaCheia()` (com prefixo `webkit` como alternativa) e `screen.orientation.lock("landscape")` quando possível; os botões `.fullscreen-button` ficam `hidden` se não houver suporte.
- Plaquinhas de nome: `tamanhoFonteNome()` aumenta a letra conforme o canvas é reduzido na tela (11px na tela; 11 a 18px do canvas).
- Código da sala: Enter/"Ir" do teclado entra; ao focar, o painel é centralizado.

### 5.9 Salas (cliente)
Objeto `rede` (socket, online, meuId, sala, publicas) e `salasRede` (criar, entrar, sair, trocarPersonagem, iniciar). `conectarServidor()` registra todos os `socket.on`. O lobby mostra jogadores, anfitrião, "VOCÊ", personagens ocupados e só libera INICIAR PARTIDA para o anfitrião com 3+ jogadores.

---

## 6. Servidor (server/index.js)

- Escuta em `0.0.0.0` na porta `PORT` (padrão 3000) e imprime os IPs da rede local ao iniciar.
- CORS do Socket.IO pela variável `ORIGENS_PERMITIDAS` (vírgulas). Padrão: `https://professoralissonlucas.github.io` e `localhost`/`127.0.0.1` nas portas 3000 e 5500.
- Modo local: serve os arquivos estáticos da pasta raiz, bloqueando `server/` e arquivos/pastas com ponto (`.git/`).
- Estado só em memória: `salas` (Map por código `LAB` + 3 letras).
- Sala: anfitrião, estado (`lobby` | `jogando`), jogadores (personagem único, ativo, tarefas, frascos e cartões individuais) e partida.
- Relógio por **tick de 1s**: desconta tempo, eventos e o próximo sorteio (18–30s), e envia `partida:estado`. Pausado, não desconta.
- Valida tarefas: partida em andamento e sem pausa, jogador ativo, tarefa válida e inédita, 3 frascos para `frascos`, 3 cartões para `protocolo`. (O minijogo roda no navegador; o servidor valida regras e pré-requisitos, não os cliques.)
- Resultado igual para todos: 6 tarefas → vence; um único ativo → vence; fim do tempo → mais tarefas vence (empate no topo = ninguém vence). Depois a sala volta ao lobby.
- Saída/desconexão: no lobby remove; na partida fica inativo; se era anfitrião, o próximo ativo assume; sala vazia é apagada. Partida em andamento não aceita novos jogadores.

### Teste automático (`cd server && npm test`)
Sobe o servidor numa porta livre e simula de 3 a 6 jogadores (37 verificações, ou 38 quando o evento sorteado é "portas travadas"), em 3 cenários:
1. **Salas**: criar sala privada (fora da lista pública), código inexistente, entrar pelo código, recusar início com 2, recusar o 6º jogador, personagens únicos, sair da sala, só o anfitrião inicia.
2. **Partida**: início com 3, entrada recusada durante a partida, cronômetro igual e diminuindo, repasse e limite de posição, tarefa recusada/confirmada/repetida, progresso para os outros, mesmo evento para todos (início e fim), pausa só do anfitrião, anfitrião desconecta com o jogo pausado (o próximo assume e continua), último jogador ativo vence, sala volta ao lobby.
3. **Lobby e vitória por tarefas**: sala pública na lista em tempo real, anfitrião sai no lobby (o próximo assume), conclusão das 6 tarefas com o mesmo resultado para todos.

`URL_TESTE=<url> npm test` testa um servidor já rodando (ex.: o do Render); no Windows PowerShell: `$env:URL_TESTE="<url>"; npm test` (e `Remove-Item Env:URL_TESTE` para voltar ao teste local). Sai com código 1 se algo falhar.

### Eventos Socket.IO
- Cliente → servidor: `sala:criar`, `sala:entrar`, `sala:sair`, `sala:personagem`, `partida:iniciar`, `partida:pausar`, `evento:testar`, `coletavel:pegar`, `tarefa:concluir`, `jogador:posicao`.
- Servidor → cliente: `salas:publicas`, `sala:atualizada`, `partida:iniciada`, `partida:estado`, `partida:pausada`, `evento:iniciado`, `evento:finalizado`, `progresso:atualizado`, `tarefa:confirmada`, `tarefa:recusada`, `jogador:saiu`, `partida:fim`, `jogador:posicao` (repassado para os outros da sala, com `id`).
- `jogador:posicao` no servidor: só com a partida rodando e sem pausa; ignora mensagens com menos de 40ms de intervalo; descarta números inválidos; limita x a 0–752 e y a 0–432; direção inválida vira "baixo".

---

## 7. Controles

| Tecla | Ação |
|---|---|
| W / ↑ | Mover para cima |
| S / ↓ | Mover para baixo |
| A / ← | Mover para a esquerda |
| D / → | Mover para a direita |
| E | Interagir com tarefa ou coletar objeto próximo |
| Mouse | Menus, botões dos minijogos, pausa |

---

## 8. Limitações conhecidas

1. Celular: a partida só é jogável com o aparelho deitado; testado só em emulação (falta conferir em aparelhos reais).
2. Multiplayer: sem reconexão (recarregar a página = sair da partida).
3. Multiplayer: o servidor não valida os cliques dos minijogos nem a distância das coletas; a posição só é limitada ao mapa (não confere paredes nem velocidade, então um cliente modificado poderia "teleportar").
4. Pasta `assets/` vazia; sprites e sons são gerados por código.
5. Render gratuito "dorme" sem uso: a primeira conexão pode passar dos 15s e mostrar "offline" antes de conectar sozinho.
6. Multiplayer: com muitos jogadores amontoados, uma plaquinha deslocada pode ficar longe da cabeça do seu boneco (o tracinho indica de quem é).

---

## 9. Convenções do código

- Identificadores e comentários em **português**.
- IDs/classes HTML em **inglês** com kebab-case (`play-screen`, `task-modal`).
- Retângulos sempre no formato `{ x, y, largura, altura }`.
- UI exibida/ocultada pelo atributo `hidden`; telas pela classe `active`.
- Texto vindo de dados inserido com `textContent` (exceto a barra de progresso, que usa `insertAdjacentHTML` com valor numérico).
- Regras repetidas no servidor (seção "REGRAS" de `server/index.js`) devem ser mantidas iguais às do cliente.
