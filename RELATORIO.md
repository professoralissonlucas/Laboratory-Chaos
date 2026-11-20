# Relatório de revisão — Laboratory Chaos

Revisão completa do projeto feita em 20/11/2026, a partir do `CLAUDE.md` e do `SPEC.md`.

**Como foi verificado**

- `node --check` em `script.js`, `config.js`, `server/index.js` e `server/scripts/teste-multiplayer.js`: sem erros.
- `cd server && npm test`: **37 aprovados, 0 com falha** (antes e depois das correções).
- `URL_TESTE=https://laboratory-chaos.onrender.com npm test`: **38 aprovados, 0 com falha** (servidor online). O Render responde com CORS liberado para `https://professoralissonlucas.github.io`.
- Teste no navegador (Chrome headless): modo solo abrindo o `index.html` direto e uma partida multiplayer com 3 abas no servidor local. **34 verificações, todas aprovadas, nenhum erro de JavaScript.**
- Capturas de tela de todas as telas em **360px, 700px e 1280px**, medindo se algo passa da largura da tela.
- Uma busca (BFS) com o mapa real calculou todas as posições onde o personagem consegue ficar e conferiu se cada tarefa e cada coletável pode ser acionado com **E**.
- Busca por caminhos absolutos (`src="/…"`, `href="/…"`, `url(/…)`): **nenhum encontrado**.

---

## 1. O que funciona

- **Menu e navegação**: os 5 botões do menu e todos os "Voltar" trocam de tela corretamente.
- **Interface**: HUD (jogador, cronômetro, jogadores ativos), painel de adversários, painel de evento, lista de tarefas, modal de tarefa, overlays de pausa e de resultado.
- **Personagens**: 5 personagens, seletor no solo e no lobby, nome no HUD, sem repetir personagem na mesma sala.
- **Movimentação**: W A S D e setas, diagonal normalizada, slider de velocidade (80–260) no solo, velocidade travada em 160 no multiplayer.
- **Mapa e colisões**: paredes, portas, móveis, porta do Reator fechada no início, nuvem de gás bloqueando.
- **As seis tarefas**: os seis minijogos funcionam, inclusive a coleta de 3 frascos e 3 cartões.
- **Eventos**: apagão, gás, portas travadas e alarme com bip (respeita volume e "efeitos sonoros").
- **Cronômetro e pausa**: 5 minutos, fica rosa no último minuto e para tudo durante a pausa.
- **Vitória e derrota**: 6 tarefas, último jogador ativo e fim do tempo (empate = ninguém vence), no solo e no multiplayer.
- **Salas e lobby**: sala pública/privada, entrar por código (aceita minúsculas), lista pública em tempo real, mínimo de 3 e máximo de 5 jogadores, só o anfitrião inicia.
- **Multiplayer**: servidor autoritativo (relógio, eventos, validação de tarefas, resultado igual para todos), movimento sincronizado com interpolação, pausa só do anfitrião, troca de anfitrião quando ele sai, desconexão tratada.
- **Os três modos**: `index.html` direto (solo, Salas mostra "SERVIDOR OFFLINE"), servidor local com `npm start` e GitHub Pages ligado ao Render.

---

## 2. O que foi corrigido

### Problemas graves (impediam o jogo)

1. **Era impossível concluir "Ativar o protocolo".** Ao apertar E, o jogo sempre dava prioridade à tarefa mais próxima (raio de 100px) antes dos coletáveis (raio de 70px). O cartão da sala de Energia ficava a 11px da tarefa de Energia, então nunca podia ser pego, e sem os 3 cartões o protocolo nunca terminava.
   *Correção:* o E agora junta tarefas e coletáveis ao alcance e aciona **o mais próximo**. O cartão da Energia foi para (128, 420) e o frasco da Segurança para (600, 160), longe das marcas de tarefa, para não se confundirem no mapa.
2. **A partida solo acabava em poucos segundos.** A eliminação dos adversários era sorteada **a cada quadro** (0,6% × 60 quadros por segundo), então os 3 eram eliminados em ~7s. Além disso, só o primeiro adversário avançava, e chegava a 6/6 em ~40s.
   *Correção:* `simularAdversarios()` agora sorteia **uma vez por segundo de jogo** (não depende do computador) e escolhe um adversário ao acaso. Simulando 20.000 partidas, o primeiro adversário chega a 6/6 com mediana de ~3min20s, e em ~1 de cada 4 partidas nenhum chega.
3. **Multiplayer: um minijogo recusado pelo servidor travava para sempre.** Se o servidor recusasse (por exemplo, com o jogo pausado), todos os botões ficavam verdes e desativados e a tarefa nunca mais podia ser feita.
   *Correção:* em `tarefa:recusada` o minijogo volta ao começo e é redesenhado.

### Problemas médios

4. **O bip do alarme continuava tocando depois de voltar ao menu** no modo solo. *Correção:* a nova função `sairDaPartida()` encerra o evento, cancela o próximo sorteio e sai da sala (se houver). Ela é usada por todos os botões que voltam ao menu.
5. **Ficar preso no gás ou numa porta travada:** se o evento começava com o personagem dentro da área, ele não conseguia mais andar. *Correção:* nesse caso só paredes e móveis bloqueiam, até ele sair.
6. **Na diagonal o personagem parava ao encostar na parede.** *Correção:* o movimento é feito um eixo de cada vez, então ele desliza pela parede.
7. **Dava para usar tarefas e coletáveis através da parede** (por exemplo, o Reator pelo corredor, sem abrir a porta, ou as tarefas de salas com portas travadas). *Correção:* o E só funciona na **mesma sala** do objeto (`salasDoMapa` e `salaDoPonto()`).
8. **Era possível fazer tarefas com o jogo pausado** (o modal continuava aberto e o relógio parado). *Correção:* pausar ou encerrar a partida fecha o modal.
9. **Os eventos automáticos do solo sempre duravam 10s.** *Correção:* agora usam a duração de cada evento (8/10/12/8s), a mesma do servidor.
10. **As setas não funcionavam nos sliders e listas** das telas de Configurações e Salas, porque o jogo bloqueava as setas em todas as telas. O E também podia abrir uma tarefa estando no menu. *Correção:* o teclado do jogo só age com a tela de partida ativa.
11. **Teclas "presas"** quando a janela perdia o foco. *Correção:* tudo é solto no `blur` da janela e ao pausar.

### Ajustes visuais e de texto

12. **No celular (360px), os overlays de pausa e resultado ficavam cortados** sobre o canvas pequeno. *Correção:* até 700px eles cobrem a tela inteira, como o modal de tarefa. A identidade visual (paleta, bordas e sombras) foi mantida.
13. O HUD dizia "ADVERSÁRIOS ATIVOS", mas contava você também. Agora diz **"JOGADORES ATIVOS"**, e o valor inicial no HTML passou de 3 para 4.
14. O título da tela de partida era "TELA DE TESTE" e passou a ser **"PARTIDA"**.
15. Os títulos "Entrar com código" e "Salas públicas" tinham margem extra no topo do painel.
16. A tela "Como jogar" agora explica que a porta do Reator começa trancada.

### Configuração

17. O `config.js` agora reconhece o **Live Server do VS Code** (porta 5500) e procura o servidor na porta 3000 do mesmo computador. O CORS do servidor já previa esse caso, mas antes o cliente sempre mostrava "offline".

O `server/index.js` **não precisou de mudanças**: as regras que ele repete continuam iguais às do cliente. `SPEC.md` e `CLAUDE.md` foram atualizados com as mudanças acima.

---

## 3. O que ainda precisa melhorar

- **Celular**: não há controles de toque. A interface cabe na tela, mas não dá para andar.
- **Reconexão**: no multiplayer, recarregar a página ou perder a conexão tira o jogador da partida.
- **Segurança do multiplayer**: o servidor não confere os cliques dos minijogos, a distância das coletas nem a velocidade e as paredes no movimento. Um cliente modificado poderia trapacear.
- **Render gratuito**: o servidor "dorme" sem uso. A primeira conexão pode passar de 15s e mostrar "offline" antes de conectar sozinha.
- **Indicação de alcance**: não há destaque visual mostrando o que o E vai acionar; seria bom acender a marca ou o objeto mais próximo.
- **Plaquinhas de nome** se sobrepõem quando dois jogadores ficam muito próximos.
- **Assets**: a pasta `assets/` está vazia; sprites e sons são gerados por código.
- **Testes automáticos do cliente**: o `npm test` cobre só o servidor. O teste no navegador desta revisão foi feito à parte e não está no repositório.

---

## 4. Como executar o jogo

### Solo (sem servidor)
Abra o arquivo `index.html` direto no navegador (duplo clique) e clique em **JOGAR**. A tela SALAS mostrará "SERVIDOR OFFLINE", o que é normal nesse modo.

### Rede local da escola (sem internet)
```bash
cd server
npm install      # só na primeira vez
npm start
```
O terminal mostra os endereços, por exemplo `http://192.168.0.10:3000`. Cada aluno abre esse endereço no navegador, no mesmo Wi-Fi ou rede. O próprio servidor entrega o jogo.

Para desenvolver com o **Live Server** do VS Code, deixe o `npm start` rodando: a página na porta 5500 conecta sozinha ao servidor na porta 3000.

### Online
- Jogo: https://professoralissonlucas.github.io/Laboratory-Chaos/ (GitHub Pages publica a raiz do repositório).
- Servidor: Render, com *Root Directory* `server`, build `npm install` e start `npm start`. A URL fica em `URL_SERVIDOR_ONLINE` no `config.js`.
- Se o Render estiver "dormindo", espere até ~1 minuto na tela SALAS: ele conecta sozinho.

### Testes automáticos
```bash
cd server
npm test                                                   # sobe um servidor temporário e simula 3 a 6 jogadores
URL_TESTE=https://laboratory-chaos.onrender.com npm test   # testa o servidor online
```

---

## 5. Como testar uma partida completa, passo a passo

### Solo
1. Abra o jogo e clique em **JOGAR**. O cronômetro começa em 05:00, o HUD mostra 4 jogadores ativos e há 3 adversários no painel.
2. Ande com **W A S D** ou com as setas, inclusive na diagonal, e encoste numa parede para ver que o personagem desliza.
3. Na sala Principal (centro), aperte **E** perto da marca amarela à direita para abrir **Ativar o protocolo** e clique em CONFIRMAR: deve aparecer "Faltam 3 cartões". Feche.
4. **Coleta** (aperte E perto de cada objeto; o aviso mostra "Frasco coletado (1/3)" etc.):
   - Frascos (rosa): sala de Computadores (embaixo, à esquerda), sala Principal (em cima do armário roxo da esquerda; pegue pelo lado direito do armário) e sala de Segurança (embaixo, à esquerda).
   - Cartões (amarelos): sala de Energia (embaixo, no meio) e sala de Segurança (à direita).
5. Faça as tarefas:
   - **Computadores** (marca sobre o computador): ENERGIA → MEMÓRIA → REDE. Clique errado para ver o botão piscar e a sequência reiniciar.
   - **Energia** (sala de baixo, à esquerda): AZUL → AMARELO → ROSA.
   - **Segurança** (marca sobre o armário): ▲ → ■ → ●. Todas as portas abrem, inclusive a do Reator (que fica rosa).
   - Entre no **Reator** e pegue o 3º cartão (à direita, perto do equipamento). Faça a tarefa do reator: 1 → 2 → 3 → 4.
   - **Organizar os frascos** (marca da esquerda na sala Principal): AZUL → ROSA → AMARELO.
   - **Ativar o protocolo**: CONFIRMAR, agora com os 3 cartões.
6. Ao concluir a 6ª tarefa aparece **VITÓRIA**. Teste **JOGAR NOVAMENTE**: tudo volta ao início, com a porta do Reator fechada e os objetos de volta no mapa.
7. **Pausa**: clique em PAUSAR. O relógio para, o minijogo fecha e o E não funciona. Depois clique em CONTINUAR.
8. **Eventos**: clique várias vezes em TESTAR EVENTO ALEATÓRIO para ver cada um:
   - **Apagão**: a tela escurece.
   - **Gás**: aparece uma nuvem roxa na sala Principal. Se o personagem estiver dentro dela, ainda consegue sair.
   - **Portas travadas**: as portas de Computadores e Energia ficam amarelas.
   - **Alarme**: o painel pisca e toca um bip. Com o alarme ativo, volte ao menu: o bip deve parar.
9. **Derrota**: deixe o tempo correr sem fazer tarefas. Um adversário costuma chegar a 6/6 antes de acabar o tempo; se ninguém chegar, ao fim do tempo vence quem tiver mais tarefas.

### Multiplayer (3 jogadores; dá para usar 3 abas no mesmo computador)
1. Rode `npm start` (ou use o GitHub Pages) e abra o jogo em 3 abas ou computadores. Em **SALAS**, deve aparecer "SERVIDOR ONLINE".
2. Aba A: **Criar sala privada** e anote o código (ex.: `LABXYZ`). Abas B e C: digite o código, em minúsculas também funciona, e clique em **ENTRAR**.
3. No lobby, troque de personagem: o personagem de outro jogador fica indisponível. Com 2 jogadores, INICIAR PARTIDA fica desativado; só o anfitrião (A) pode iniciar com 3.
4. A inicia: as 3 abas vão para a partida com o mesmo cronômetro. Ande em uma aba e veja o boneco se mexer nas outras, com o nome em cima.
5. Conclua uma tarefa em B. O painel de A e C mostra o progresso de B (1/6).
6. Em B, sem cartões, abra o Protocolo e clique em CONFIRMAR: o servidor recusa ("Colete os 3 cartões primeiro").
7. Em A, clique em PAUSAR: as 3 abas pausam, e B e C não veem o botão CONTINUAR. Quando A continua, o jogo volta para todos.
8. Espere um evento (18–30s): ele aparece igual nas 3 abas, ao mesmo tempo.
9. Feche a aba A (o anfitrião): B vira o novo anfitrião e passa a ver PAUSAR. Depois, em C, clique em VOLTAR AO MENU: B fica como último ativo e recebe **VITÓRIA**.
10. Em B, clique em **VOLTAR À SALA**: o lobby aparece de novo, pronto para outra partida.
