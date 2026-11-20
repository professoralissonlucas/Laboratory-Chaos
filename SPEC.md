# SPEC — Laboratory Chaos

Documento de especificação e contexto do projeto. Descreve **o que existe hoje** no código (estado atual), como as partes se conectam e quais pontos estão incompletos ou simulados.

---

## 1. Visão geral

**Laboratory Chaos** ("LAB 2.0") é um jogo 2D top-down em estilo pixel art, feito em **HTML, CSS e JavaScript puro** (sem frameworks, sem bibliotecas, sem build). O jogador controla um estudante dentro de um laboratório dividido em salas, precisa completar **6 tarefas** (minijogos) antes do tempo acabar ou antes dos adversários, enquanto **eventos aleatórios** (apagão, gás, portas travadas, alarme) atrapalham.

O "multijogador" (adversários e salas) é **inteiramente simulado localmente** — não há servidor, rede nem persistência.

- Idioma da interface e do código: **português (pt-BR)**.
- Público/contexto: projeto escolar (pasta `projetos3serie`).

---

## 2. Estrutura de arquivos

```
rafisa/
├── index.html      # Estrutura de todas as telas (250 linhas)
├── style.css       # Visual pixel art e layout responsivo (763 linhas)
├── script.js       # Toda a lógica do jogo (1290 linhas)
└── assets/
    ├── images/     # vazio (reservado)
    └── sounds/     # vazio (reservado)
```

- Não há `package.json`, dependências, testes ou controle de versão (git).
- Todos os gráficos são desenhados via **Canvas 2D** com retângulos coloridos; o som do alarme é gerado via **Web Audio API**. As pastas de assets ainda não são usadas.

### Como executar
Abrir `index.html` diretamente no navegador (ou servir a pasta com qualquer servidor estático). O `script.js` é carregado com `defer` e tudo roda dentro de um único `DOMContentLoaded`.

---

## 3. Telas (index.html)

Cada tela é um `<main class="screen">`; apenas a que tem a classe `active` é exibida. A navegação é feita por botões com o atributo `data-screen="<id-da-tela>"`.

| ID da tela | Nome | Conteúdo |
|---|---|---|
| `menu-screen` | Menu principal | Título e 5 botões: Jogar, Como Jogar, Configurações, Créditos, Salas |
| `play-screen` | Tela de teste / partida | Seletor de personagem, slider de velocidade, canvas 800×480, HUD (jogador, cronômetro, adversários ativos), painel de adversários, ajuda de teclado, painel de evento, botão "Testar evento aleatório", progresso de tarefas, modal de tarefa, overlays de pausa e resultado, botões Pausar e Voltar |
| `how-screen` | Como jogar | Texto do objetivo e uma dica |
| `settings-screen` | Configurações | Slider de volume (0–100%) e checkbox de efeitos sonoros |
| `credits-screen` | Créditos | Texto sobre o projeto |
| `rooms-screen` | Salas | Aviso de simulação local, criar sala pública/privada, entrar por código, lista de salas públicas, lobby |

Elementos sobrepostos dentro de `play-screen` (controlados pelo atributo `hidden`):
- `#task-modal` — janela do minijogo da tarefa.
- `#pause-overlay` — "Jogo pausado" (Continuar / Voltar ao menu).
- `#result-overlay` — "Vitória"/"Derrota" (Jogar novamente / Voltar ao menu).

---

## 4. Visual (style.css)

- **Paleta** definida em variáveis CSS no `:root`:
  `--night #13172b`, `--panel #252b4a`, `--panel-light #343d68`, `--blue #62c9df`, `--purple #8b66b5`, `--pink #ed87b8`, `--yellow #f4d35e`, `--gray #bbc1d1`, `--white #fff8dc`.
- Fonte única: `"Courier New", monospace`.
- Estética pixel art: bordas grossas pretas (`#0b0d1b`), sombras sólidas deslocadas (`8px 8px 0`), `image-rendering: pixelated`, sem bordas arredondadas.
- Fundo da página com grade de 32px e decoração fixa (`.lab-background`, `.pixel-dot`).
- Animação `alarmFlash` piscando o painel de evento durante o alarme.
- **Responsivo**: um único breakpoint `@media (max-width: 700px)` que empilha grades em uma coluna e esconde a decoração de fundo.
- Existe a classe `.test-tube` no CSS que não é usada no HTML.

---

## 5. Lógica do jogo (script.js)

Todo o código vive dentro de um único callback de `DOMContentLoaded`, em escopo de função (nada é exposto globalmente). Os nomes de variáveis e funções estão em português.

### 5.1 Navegação
- `abrirTela(id)` remove `active` de todas as `.screen` e adiciona na tela alvo.
- Ao clicar num botão que abre `play-screen`, chama `iniciarPartida()` (reinicia a partida).
- O slider de volume apenas atualiza o texto `#volume-value`.

### 5.2 Personagem
- 5 personagens (Azul, Rosa, Roxo, Amarelo, Cinza), cada um com cores de `roupa`, `detalhe` e `cabelo`.
- Desenhado numa grade lógica de **16×16** escalada para **48px** (`tamanho: 48`).
- Estado em `personagem`: posição `x/y` (inicia em 376, 288), posição anterior (para desfazer colisão), `velocidade` (160 px/s), `direcao` (`cima/baixo/esquerda/direita`), animação de 2 quadros trocando a cada 0,14s.
- Movimento com **W A S D** ou **setas**; a diagonal é normalizada. Esquerda é feita espelhando o desenho (`scale(-1, 1)`).
- O seletor `#character-select` troca o personagem e o nome no HUD.

### 5.3 Mapa e colisão
Canvas lógico de **800×480 px**, piso em xadrez de 64px. O mapa é definido por três listas de retângulos `{x, y, largura, altura}`:

- `paredes` — bordas externas + paredes de 5 salas.
- `portas` — 6 portas com `aberta: true/false`. Desenhadas rosa (aberta) ou amarela (fechada).
- `obstaculos` — móveis com colisão (`mesa`, `computador`, `armario`, `equipamento`, `reator`).

Salas: **Computadores** (sup. esquerda), **Principal** (centro), **Energia** (inf. esquerda), **Segurança** (sup. direita), **Reator** (inf. direita). A porta do **Reator começa fechada**.

`checarColisao()` usa sobreposição AABB do personagem contra paredes, obstáculos, portas fechadas e a nuvem de gás ativa; em caso de colisão volta para a posição anterior. O personagem também é limitado às bordas do canvas.

### 5.4 Loop principal
`executarJogo(tempo)` via `requestAnimationFrame`. Só atualiza quando `play-screen` está ativa:

1. `atualizarPartida()` — cronômetro, simulação de adversários, condição de vitória.
2. `atualizarEvento()` — contagem regressiva do evento ativo.
3. `atualizarPersonagem(delta)` — movimento (delta limitado a 0,05s).
4. `desenharFundo()` — mapa, portas, objetos, marcadores de tarefa, coletáveis, gás e apagão.
5. `desenharPersonagem()`.
6. `checarColisao()`.

### 5.5 Eventos aleatórios
Configuração em `configuracaoEventos`: intervalo entre eventos de **18 a 30s**, duração padrão de 10s, durações específicas por evento.

| ID | Nome | Efeito |
|---|---|---|
| `apagao` | APAGÃO | Escurece o canvas inteiro (overlay 78% opaco) |
| `gas` | VAZAMENTO DE GÁS | Bloqueia a área `{304, 304, 144×112}` (sala principal) com nuvem roxa/rosa |
| `portas` | PORTAS TRAVADAS | Fecha as duas primeiras portas abertas; reabre ao terminar |
| `alarme` | ALARME | Painel pisca e toca bip (onda quadrada 660 Hz) a cada 1,4s |

- `iniciarEvento()` sorteia um evento (só um ativo por vez); `finalizarEvento()` desfaz os efeitos.
- `agendarProximoEvento()` usa `setTimeout` recursivo e dispara apenas se a `play-screen` estiver ativa.
- O botão "Testar evento aleatório" força um evento de 8s.
- Para adicionar um evento novo: incluir um objeto `{ id, nome, mensagem, ativar(duracao) }` em `eventosAleatorios` e tratar a limpeza em `finalizarEvento()` e o desenho/colisão quando necessário.

### 5.6 Tarefas (minijogos)
Seis tarefas na lista `tarefas`, cada uma com `id`, `nome`, `categoria`, `concluida`, `progresso`, `total` e posição `x/y` do marcador no mapa (quadrado amarelo; fica verde quando concluída).

| ID | Nome | Dificuldade | Mecânica |
|---|---|---|---|
| `computador` | Reiniciar o computador | Fácil | Clicar ENERGIA → MEMÓRIA → REDE. Erro reinicia a sequência |
| `frascos` | Organizar os frascos | Fácil | Coletar 3 frascos no mapa e clicar AZUL → ROSA → AMARELO |
| `energia` | Restaurar a energia | Média | Conectar cabos AZUL → AMARELO → ROSA |
| `portas` | Desbloquear as portas | Média | Clicar ▲ → ■ → ●. Ao concluir, **abre todas as portas** (inclusive a do Reator) |
| `reator` | Estabilizar o reator | Difícil | Clicar 1 → 2 → 3 → 4 (fica dentro da sala do Reator) |
| `protocolo` | Ativar o protocolo | Difícil | Coletar 3 cartões de acesso no mapa e clicar CONFIRMAR |

- **Interação**: tecla **E** chama `verificarInteracaoTarefa()`. Se o personagem estiver a menos de 85px de uma tarefa, abre o modal; senão tenta coletar um frasco/cartão a menos de 55px. A distância é medida a partir do canto superior esquerdo do personagem (`x, y`), não do centro.
- `objetosColetaveis` guarda 3 frascos e 3 cartões com flag `coletado`.
- O modal é montado dinamicamente em `abrirTarefa()`, que chama a função `interface<Tarefa>()` correspondente. Helpers: `criarOpcoes()`, `barraProgresso()`, `concluirTarefa()`, `erroTarefa()`.
- `atualizarListaTarefas()` atualiza o painel "TAREFAS x/6".

### 5.7 Partida
Estado em `partida`: duração de **300s (5 min)**, `pausada`, `encerrada`, `iniciou`, `jogadorAtivo`.

- **Cronômetro** `MM:SS` no HUD; fica rosa no último minuto.
- **Adversários simulados** (Rosa, Roxo, Cinza): a cada segundo há 12% de chance de o primeiro adversário ativo ganhar +1 de progresso (ao chegar em 6 ele é marcado como inativo); a cada quadro há 0,6% de chance de um adversário aleatório ser "eliminado".
- **Condições de fim** (`verificarResultado()`):
  - Vitória: concluir as 6 tarefas.
  - Vitória: ser o último jogador ativo.
  - Derrota: jogador inativo (nunca acontece hoje — nada define `jogadorAtivo = false`).
  - Fim do tempo: compara tarefas concluídas do jogador com o maior progresso entre adversários ativos (maior = vitória; empate ou menor = derrota).
- Pausar/continuar, jogar novamente e voltar ao menu pelos overlays.

### 5.8 Salas (simulação local)
Objeto `salasLocais`, só em memória (comentário no código prevê troca futura por HTTP/WebSocket):

- `listarPublicas()` — 3 salas fixas: `LAB101`, `LAB204`, `LAB333` (capacidade 5).
- `gerarCodigo()` — `"LAB"` + 3 letras aleatórias.
- `criar(nome, publica)` — cria sala com 3 jogadores fictícios.
- `buscarPorCodigo(codigo)` — procura na sala criada ou nas públicas.
- `entrar(sala)` — monta o lobby com o anfitrião e jogadores fictícios.

O lobby mostra nome, código, tipo e cartões dos jogadores. "Iniciar teste" abre a `play-screen` e reinicia a partida — a sala escolhida não influencia a partida.

---

## 6. Controles

| Tecla | Ação |
|---|---|
| W / ↑ | Mover para cima |
| S / ↓ | Mover para baixo |
| A / ← | Mover para a esquerda |
| D / → | Mover para a direita |
| E | Interagir com tarefa ou coletar objeto próximo |
| Mouse | Menus, botões dos minijogos, pausa |

---

## 7. Limitações e pontos incompletos conhecidos

Observações do estado atual do código (registradas apenas para referência; nada foi alterado):

1. **Slider de velocidade** (`#speed-control`) não está ligado a `personagem.velocidade`.
2. **Configurações** de volume e efeitos sonoros não afetam o áudio do alarme.
3. **Pasta `assets/`** vazia; sprites e sons são todos gerados por código.
4. **Pausa parcial**: com o jogo pausado, o personagem ainda se move por trás do overlay, o tempo do evento ativo continua correndo e novos eventos podem ser disparados.
5. **`iniciarPartida()` não reinicia** posição do personagem, frascos/cartões coletados, portas nem o evento ativo.
6. **Feedback de coleta** é escrito em `#task-feedback`, que fica dentro do modal fechado, então o jogador não vê a mensagem ao coletar.
7. **Tarefa dos frascos**: clicar na ordem certa antes de coletar os 3 frascos desabilita os botões e avança o progresso sem concluir; o progresso também é sobrescrito pela contagem de frascos coletados.
8. **Adversário que chega a 6/6** é marcado como inativo (aparece "ELIMINADO") em vez de vencer a partida.
9. **`jogadorAtivo`** nunca vira `false`, então a derrota por eliminação não acontece.
10. **Colisão** é resolvida depois do desenho do quadro (pode haver 1 quadro de sobreposição visual).
11. **Interação por distância** usa o canto superior esquerdo do personagem, o que favorece aproximações por certos lados.
12. **Tela "Como jogar"** descreve o objetivo de forma genérica ("equipamentos perdidos"), sem citar tarefas, tecla E nem eventos.
13. Classe CSS `.test-tube` e as classes `.task-option.selected` / `.wrong` não são usadas.

---

## 8. Convenções do código

- Identificadores e comentários em **português**.
- IDs/classes HTML em **inglês** com kebab-case (`play-screen`, `task-modal`).
- Retângulos do mapa sempre no formato `{ x, y, largura, altura }`.
- Elementos de UI exibidos/ocultados pelo atributo `hidden`; telas pela classe `active`.
- Texto vindo de dados é inserido com `textContent` (exceto a barra de progresso, que usa `insertAdjacentHTML` com valor numérico).
