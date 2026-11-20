# Laboratory Chaos

Jogo 2D em pixel art, visto de cima, feito em **HTML, CSS e JavaScript puro**. Você é um estudante num laboratório com 5 salas e precisa concluir **6 tarefas** (minijogos) em **5 minutos**, antes dos adversários. Eventos aleatórios atrapalham: apagão, vazamento de gás, portas travadas e alarme.

- **Solo**: adversários simulados, funciona sem internet.
- **Multiplayer**: de 3 a 5 jogadores em salas públicas ou privadas, com um servidor Node.js + Socket.IO.

▶ **Jogar agora:** https://professoralissonlucas.github.io/Laboratory-Chaos/

## Controles

| Ação | Teclado | Celular (deitado) |
|---|---|---|
| Andar | **W A S D** ou **setas** | Direcional à esquerda |
| Interagir (tarefa ou coletar) | **E** | Botão **E** à direita |
| Pausar | Botão **Ⅱ PAUSAR** | Botão **Ⅱ** no topo |
| Ver adversários, evento e tarefas | Abaixo do mapa | Botão **☰ PAINÉIS** |

Com o celular em pé, a partida pede para girar o aparelho. O que o **E** vai acionar fica com um contorno piscando.

## Como rodar

**Solo (sem servidor):** abra o arquivo `index.html` no navegador e clique em **JOGAR**.

**Rede local da escola (sem internet):** precisa do [Node.js](https://nodejs.org/) 18 ou mais novo.

```bash
cd server
npm install    # só na primeira vez
npm start
```

O terminal mostra o endereço para os colegas, por exemplo `http://192.168.0.10:3000`. Cada um abre esse endereço no navegador, conectado ao mesmo Wi-Fi.

**Online:** o jogo está no GitHub Pages, e o servidor multiplayer no Render (*Root Directory* `server`, build `npm install`, start `npm start`). O endereço do servidor fica em `URL_SERVIDOR_ONLINE`, no `config.js`. O Render gratuito "dorme" sem uso: a primeira conexão pode levar até um minuto.

## Testes

Testes automáticos do multiplayer (simulam de 3 a 6 jogadores):

```bash
cd server
npm test
```

Para testar o servidor online, use um terminal **bash** (Git Bash, Linux, macOS):

```bash
URL_TESTE=https://laboratory-chaos.onrender.com npm test
```

ou o **Windows PowerShell**:

```powershell
$env:URL_TESTE="https://laboratory-chaos.onrender.com"; npm test
```

No PowerShell, a variável continua valendo até fechar o terminal. Para voltar a testar o servidor local, rode `Remove-Item Env:URL_TESTE`.

## Estrutura

```
├── index.html     # Todas as telas do jogo
├── style.css      # Visual pixel art e layout (computador e celular)
├── config.js      # Endereço do servidor multiplayer
├── script.js      # Lógica do jogo (personagem, mapa, eventos, tarefas, salas, toque)
├── assets/        # Reservada para imagens e sons (os gráficos e o som são gerados por código)
├── server/
│   ├── index.js                    # Servidor: salas, cronômetro, eventos e resultado
│   ├── package.json                # npm start / npm test
│   └── scripts/teste-multiplayer.js
├── README.md      # Este arquivo
├── SPEC.md        # Especificação técnica detalhada
├── RELATORIO.md   # Relatório de revisão, testes e melhorias
└── CLAUDE.md      # Guia para quem mexe no código
```

## Créditos

Projeto escolar desenvolvido pelas alunas **[NOMES]**.
