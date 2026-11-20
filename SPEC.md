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
├── script.js           # Toda a lógica do cliente (8 seções comentadas)
├── assets/             # images/ e sounds/ vazios (reservados)
├── server/
│   ├── package.json    # "npm start"; dependências: express, socket.io
│   └── index.js        # Socket.IO + regras das salas/partida (+ estáticos no modo local)
├── SPEC.md
└── CLAUDE.md
```

- Gráficos desenhados via **Canvas 2D** com retângulos coloridos; o som do alarme é gerado via **Web Audio API**.
- Controle de versão com git; `node_modules/` é ignorado.
- Todos os caminhos no HTML/CSS/JS são relativos (o Pages publica em `/Laboratory-Chaos/`).

### Como executar
- **Online**: front-end no GitHub Pages (https://professoralissonlucas.github.io/Laboratory-Chaos/); servidor no Render (*Root Directory* `server`, `npm install` / `npm start`). A URL do Render vai em `URL_SERVIDOR_ONLINE` no `config.js`.
- **Rede da escola**: `cd server && npm install && npm start`. O Express serve o jogo da pasta raiz e imprime os endereços `http://IP:3000` da rede local.
- **Só solo**: abrir `index.html` direto no navegador (`file://`): sem servidor, a tela Salas mostra "SERVIDOR OFFLINE".
- O `script.js` é carregado com `defer` e tudo roda dentro de um único `DOMContentLoaded` (sem ES modules, para funcionar via `file://`).

### Conexão com o servidor
- `config.js` define `URL_SERVIDOR`: em `*.github.io` usa `URL_SERVIDOR_ONLINE`; em `localhost`/IP usa `location.origin`; em `file://` é `null`.
- `conectarServidor()` cria um `<script>` com `${URL_SERVIDOR}/socket.io/socket.io.js`. Estados na tela Salas: "CONECTANDO AO SERVIDOR..." → "SERVIDOR ONLINE" ou, se falhar/passar de 15s, "SERVIDOR OFFLINE". Se o servidor responder depois (Render acordando), conecta sozinho.

---

## 3. Telas (index.html)

Cada tela é um `<main class="screen">`; apenas a que tem a classe `active` é exibida. A navegação é feita por botões com `data-screen="<id-da-tela>"`.

| ID da tela | Nome | Conteúdo |
|---|---|---|
| `menu-screen` | Menu principal | Título e 5 botões: Jogar, Como Jogar, Configurações, Créditos, Salas |
| `play-screen` | Partida | Seletor de personagem, slider de velocidade (com valor), canvas 800×480 dentro de `.canvas-frame`, HUD, painel de adversários, ajuda de teclado, painel de evento, botão "Testar evento aleatório", progresso de tarefas, modal de tarefa, botões Pausar e Voltar |
| `how-screen` | Como jogar | Objetivo, controles, tecla E, coletáveis, eventos e limite de 5 minutos |
| `settings-screen` | Configurações | Volume (0–100%) e efeitos sonoros — ambos afetam o bip do alarme |
| `credits-screen` | Créditos | Texto sobre o projeto |
| `rooms-screen` | Salas | Status do servidor (`#server-status`), criar sala pública/privada, entrar por código, lista de salas públicas, lobby com escolha de personagem |

Elementos sobrepostos (atributo `hidden`):
- `#task-modal` — janela do minijogo (fixa na tela, centralizada, com rolagem).
- `#pause-overlay` e `#result-overlay` — dentro de `.canvas-frame`, cobrem exatamente o canvas.

---

## 4. Visual (style.css)

- **Paleta** no `:root`: `--night #13172b`, `--panel #252b4a`, `--panel-light #343d68`, `--blue #62c9df`, `--purple #8b66b5`, `--pink #ed87b8`, `--yellow #f4d35e`, `--gray #bbc1d1`, `--white #fff8dc`.
- Fonte única: `"Courier New", monospace`.
- Estética pixel art: bordas pretas grossas (`#0b0d1b`), sombras sólidas deslocadas, `image-rendering: pixelated`, sem bordas arredondadas.
- Canvas: resolução lógica 800×480, escalado só pelo CSS (`aspect-ratio: 5 / 3`).
- **Responsivo**: breakpoint `@media (max-width: 700px)` — menos espaço interno, HUD em 2 colunas, painéis empilhados, overlays compactos. Testado em 360px sem nada cortado.
- Botões desativados (`:disabled`) ficam com 50% de opacidade.

---

## 5. Lógica do cliente (script.js)

Seções: 1. Navegação e configurações · 2. Personagem · 3. Mapa · 4. Eventos · 5. Tarefas · 6. Partida · 7. Salas · 8. Loop principal e inicialização.

### 5.1 Navegação
- `abrirTela(id)` troca a classe `active`.
- JOGAR chama `iniciarPartida()` (modo solo).
- Voltar ao menu estando numa sala (lobby ou partida em rede) sai da sala no servidor.

### 5.2 Personagem
- 5 personagens (Azul, Rosa, Roxo, Amarelo, Cinza), desenhados numa grade 16×16 escalada para 48px.
- Movimento com **W A S D** ou **setas**; a diagonal é normalizada. As teclas são ignoradas enquanto se digita num campo de texto.
- Velocidade vem do slider (80–260). No multiplayer fica travada em 160.

### 5.3 Mapa e colisão
Canvas lógico de **800×480 px**. Mapa definido por listas de retângulos `{ x, y, largura, altura }`: `paredes`, `portas` (com `aberta` e `abertaInicial`) e `obstaculos`.

Salas: Computadores, Principal, Energia, Segurança e Reator (porta do **Reator começa fechada**).

`checarColisao()` usa uma **hitbox de 28×28 px nos pés** (`caixaColisao()`), menor que o desenho de 48px, para o personagem passar nas portas de 32px. Colide com paredes, obstáculos, portas fechadas e a nuvem de gás; em colisão, volta à posição anterior. A colisão é resolvida antes do desenho.

### 5.4 Loop principal
`executarJogo(tempo)` via `requestAnimationFrame`, só com a `play-screen` ativa. Pausado, apenas desenha. Sem pausa: `atualizarPartida()` → `atualizarEvento()` → `atualizarPersonagem()` → `checarColisao()` → desenho.

### 5.5 Eventos aleatórios

| ID | Nome | Efeito | Duração (multiplayer) |
|---|---|---|---|
| `apagao` | APAGÃO | Escurece o canvas (78% opaco) | 8s |
| `gas` | VAZAMENTO DE GÁS | Bloqueia `{304, 304, 144×112}` | 10s |
| `portas` | PORTAS TRAVADAS | Trava Computadores e Energia | 12s |
| `alarme` | ALARME | Painel pisca e bip a cada 1,4s | 8s |

- Solo: `agendarProximoEvento()` sorteia a cada 18–30s (um único timer, cancelado ao reiniciar ou pausar) e `iniciarEvento()` aplica com duração de 10s.
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

- Tecla **E**: abre a tarefa mais próxima a até 100px do **centro** do personagem; senão coleta frasco/cartão a até 70px.
- Erros piscam o botão com `.wrong`; CONFIRMAR fica `.selected` com os 3 cartões; ao reabrir, passos já feitos aparecem verdes.
- Multiplayer: `concluirTarefa()` pede validação ao servidor; só `tarefa:confirmada` chama `marcarTarefaConcluida()`.

### 5.7 Partida
- Estado em `partida` (300s, `pausada`, `encerrada`, `jogadorAtivo`) e `modoJogo` ("solo" | "rede").
- `iniciarPartida(modo, dados)` reinicia personagem, coletáveis, portas, tarefas, evento e adversários.
- **Solo**: 3 adversários simulados avançam/são eliminados ao acaso; `verificarResultado()` decide (6 tarefas, último ativo, ou fim do tempo).
- **Multiplayer**: adversários são os outros jogadores (progresso real); o resultado vem do servidor (`partida:fim`). Se a conexão cair, `jogadorAtivo = false` → derrota.
- Pausa completa (movimento, relógio, eventos, bip). No multiplayer só o anfitrião pausa, e pausa para todos.

### 5.8 Movimentação sincronizada (multiplayer)
- Cada personagem (0–4) nasce num ponto da sala principal: `posicaoDeSaida(i)` = `{ x: 296 + 40·i, y: 288 }`.
- `enviarPosicao()` manda `{ x, y, direcao, andando }` a cada 66ms (~15x/s), só quando algo mudou, sem enviar com o jogo pausado ou encerrado (`volatile`: mensagens velhas são descartadas).
- `outrosJogadores` guarda as últimas 10 posições recebidas de cada um. `atualizarOutrosJogadores()` desenha cada um **100ms no passado**, interpolando entre as duas posições ao redor desse momento (fica parado na última se não chegar nada novo).
- `desenharBoneco()` desenha qualquer jogador com o personagem escolhido; `desenharNome()` põe uma plaquinha escura com o nome acima da cabeça. O próprio personagem é desenhado por último (fica por cima) e sem plaquinha.
- Outros jogadores não colidem entre si nem com o jogador.

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

1. **Solo**: a eliminação aleatória dos adversários simulados (0,6% por quadro) encerra a partida em ~7s, e depende da taxa de quadros.
2. **Solo**: eventos automáticos usam a duração padrão de 10s em vez das durações por evento.
3. A tarefa do **Reator** pode ser aberta pelo lado de fora da parede (a 94px do marcador), sem precisar abrir a porta.
4. O gás pode prender o personagem se ele estiver dentro da área quando o evento começa.
5. Na diagonal o personagem não desliza pela parede; teclas podem ficar "presas" se a janela perde o foco.
6. Sem controles de toque: no celular a interface cabe na tela, mas não dá para andar.
7. Multiplayer: sem reconexão (recarregar a página = sair da partida).
8. Multiplayer: o servidor não valida os cliques dos minijogos; a posição só é limitada ao mapa (não confere paredes nem velocidade, então um cliente modificado poderia "teleportar").
9. Pasta `assets/` vazia; sprites e sons são gerados por código.
10. Render gratuito "dorme" sem uso: a primeira conexão pode passar dos 15s e mostrar "offline" antes de conectar sozinho.
11. Multiplayer: as plaquinhas de nome se sobrepõem quando dois jogadores ficam muito próximos.

---

## 9. Convenções do código

- Identificadores e comentários em **português**.
- IDs/classes HTML em **inglês** com kebab-case (`play-screen`, `task-modal`).
- Retângulos sempre no formato `{ x, y, largura, altura }`.
- UI exibida/ocultada pelo atributo `hidden`; telas pela classe `active`.
- Texto vindo de dados inserido com `textContent` (exceto a barra de progresso, que usa `insertAdjacentHTML` com valor numérico).
- Regras repetidas no servidor (seção "REGRAS" de `server/index.js`) devem ser mantidas iguais às do cliente.
