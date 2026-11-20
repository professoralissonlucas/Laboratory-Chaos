// =====================================================================
// LABORATORY CHAOS — lógica do jogo
//
// Tudo roda dentro de um único DOMContentLoaded (sem módulos ES), para
// funcionar abrindo o index.html direto no navegador.
//
// Seções:
//   1. Navegação e configurações
//   2. Personagem
//   3. Mapa
//   4. Eventos
//   5. Tarefas
//   6. Partida
//   7. Salas
//   8. Celular (controles de toque, gaveta de painéis e tela cheia)
//   9. Loop principal e inicialização
// =====================================================================

// Aguarda o carregamento completo do HTML antes de executar o código.
document.addEventListener("DOMContentLoaded", () => {
    // Procura o elemento que contém o título da tela inicial.
    const titulo = document.querySelector("h1");

    // Confirma no console que o projeto iniciou corretamente.
    if (titulo) {
        console.log(`${titulo.textContent} carregado com sucesso.`);
    }

    // =================================================================
    // 1. NAVEGAÇÃO E CONFIGURAÇÕES
    // =================================================================

    // Seleciona todos os botões que possuem o atributo data-screen.
    const botoesDeTela = document.querySelectorAll("[data-screen]");

    // Guarda todas as telas do projeto.
    const telas = document.querySelectorAll(".screen");

    // Muda para a tela informada pelo botão clicado.
    function abrirTela(nomeDaTela) {
        telas.forEach((tela) => {
            tela.classList.remove("active");
        });

        const telaSelecionada = document.getElementById(nomeDaTela);

        if (telaSelecionada) {
            telaSelecionada.classList.add("active");
        }

        // No celular, a partida trava a rolagem da página (ver style.css).
        document.body.classList.toggle("em-partida", nomeDaTela === "play-screen");
        document.body.classList.remove("paineis-abertos");
    }

    // Faz os botões do menu e os botões "Voltar" funcionarem.
    botoesDeTela.forEach((botao) => {
        botao.addEventListener("click", () => {
            // Voltar ao menu: deixa a partida (e a sala, se estiver numa).
            if (botao.dataset.screen === "menu-screen") sairDaPartida();

            abrirTela(botao.dataset.screen);

            if (botao.dataset.screen === "play-screen" && typeof iniciarPartida === "function") {
                iniciarPartida();
            }
        });
    });

    // Controles da tela de configurações (usados também pelo som do alarme).
    const controleVolume = document.getElementById("volume");
    const textoVolume = document.getElementById("volume-value");
    const caixaEfeitos = document.getElementById("effects");

    // Atualiza o texto do volume enquanto o usuário move o controle.
    if (controleVolume && textoVolume) {
        controleVolume.addEventListener("input", () => {
            textoVolume.textContent = `${controleVolume.value}%`;
        });
    }

    // =================================================================
    // 2. PERSONAGEM
    // =================================================================

    const canvas = document.getElementById("game-canvas");
    const contexto = canvas ? canvas.getContext("2d") : null;
    const seletorPersonagem = document.getElementById("character-select");
    const controleVelocidade = document.getElementById("speed-control");
    const textoVelocidade = document.getElementById("speed-value");
    const nomeJogador = document.getElementById("player-name");

    // Cinco personagens 16 por 16 pixels com cores e estilos diferentes.
    const personagens = [
        { nome: "Azul", roupa: "#62c9df", detalhe: "#2c5c88", cabelo: "#25304d" },
        { nome: "Rosa", roupa: "#ed87b8", detalhe: "#b54f82", cabelo: "#f4d35e" },
        { nome: "Roxo", roupa: "#8b66b5", detalhe: "#59447d", cabelo: "#bbc1d1" },
        { nome: "Amarelo", roupa: "#f4d35e", detalhe: "#b58b35", cabelo: "#6d4c41" },
        { nome: "Cinza", roupa: "#bbc1d1", detalhe: "#747b91", cabelo: "#353a50" }
    ];

    // Posição onde o personagem começa cada partida (solo).
    const posicaoInicial = { x: 376, y: 288 };

    // No multiplayer cada personagem (0 a 4) nasce lado a lado na sala principal.
    // O personagem 2 nasce no mesmo ponto do modo solo.
    function posicaoDeSaida(indicePersonagem) {
        return { x: 296 + indicePersonagem * 40, y: 288 };
    }

    const personagem = {
        x: posicaoInicial.x,
        y: posicaoInicial.y,
        posicaoAnteriorX: posicaoInicial.x,
        posicaoAnteriorY: posicaoInicial.y,
        tamanho: 48,
        velocidade: 160,
        direcao: "baixo",
        andando: false,
        quadroAnimacao: 0,
        tempoAnimacao: 0,
        personagemAtual: 0
    };

    const teclasPressionadas = {};

    // O evento E verifica se o personagem está próximo de uma tarefa ou objeto.
    window.addEventListener("keydown", (evento) => {
        // Enquanto o usuário digita (ex.: código da sala), as teclas não controlam o jogo.
        const alvo = evento.target;
        const digitando = alvo.tagName === "TEXTAREA" ||
            (alvo.tagName === "INPUT" && alvo.type === "text");
        if (digitando) return;

        // Fora da partida as setas voltam a controlar sliders, listas e a rolagem.
        if (!telaDeJogoAtiva()) return;

        const tecla = evento.key.toLowerCase();
        const teclasMovimento = ["w", "a", "s", "d", "arrowup", "arrowleft", "arrowdown", "arrowright"];

        if (teclasMovimento.includes(tecla)) {
            evento.preventDefault();
            teclasPressionadas[tecla] = true;
        }

        if (tecla === "e" && !evento.repeat) interagir();
    });

    // Tecla E ou botão E da tela de toque: interage com o que estiver perto.
    function interagir() {
        if (modalTarefa && modalTarefa.hidden && !partida.pausada && !partida.encerrada) {
            verificarInteracaoTarefa();
        }
    }

    window.addEventListener("keyup", (evento) => {
        teclasPressionadas[evento.key.toLowerCase()] = false;
    });

    // Se a janela perde o foco, o keyup não chega: solta todas as teclas.
    function soltarTeclas() {
        Object.keys(teclasPressionadas).forEach((tecla) => {
            teclasPressionadas[tecla] = false;
        });
        // O direcional de toque também volta ao normal.
        document.querySelectorAll(".dpad-arm.pressionado").forEach((braco) => {
            braco.classList.remove("pressionado");
        });
    }
    window.addEventListener("blur", soltarTeclas);

    // A partida só recebe teclado com a tela de jogo aberta.
    function telaDeJogoAtiva() {
        const telaJogo = document.getElementById("play-screen");
        return Boolean(telaJogo && telaJogo.classList.contains("active"));
    }

    // Escolhe qual dos cinco personagens é desenhado e mostra o nome no HUD.
    function escolherPersonagem(indice) {
        personagem.personagemAtual = indice;
        if (seletorPersonagem) seletorPersonagem.value = String(indice);
        if (nomeJogador) nomeJogador.textContent = `Estudante ${personagens[indice].nome}`;
    }

    if (seletorPersonagem) {
        seletorPersonagem.addEventListener("change", () => {
            escolherPersonagem(Number(seletorPersonagem.value));
        });
    }

    // Liga o slider de velocidade ao personagem e mostra o valor.
    // No multiplayer a velocidade fica fixa em 160 para a corrida ser justa.
    function aplicarVelocidade() {
        if (!controleVelocidade) return;
        if (modoJogo === "rede") controleVelocidade.value = "160";
        controleVelocidade.disabled = modoJogo === "rede";
        personagem.velocidade = Number(controleVelocidade.value);
        if (textoVelocidade) textoVelocidade.textContent = controleVelocidade.value;
    }

    if (controleVelocidade) {
        controleVelocidade.addEventListener("input", aplicarVelocidade);
    }

    // Desenha o personagem do próprio jogador.
    function desenharPersonagem() {
        desenharBoneco(personagem);
    }

    // Desenha qualquer boneco (o jogador ou outro jogador da sala) numa grade 16x16.
    // O boneco precisa de: x, y, direcao, andando, quadroAnimacao e personagemAtual.
    function desenharBoneco(boneco) {
        const dados = personagens[boneco.personagemAtual];
        const tamanho = personagem.tamanho;
        const escala = tamanho / 16;

        contexto.save();

        // Virar o desenho horizontalmente muda a direção esquerda/direita.
        if (boneco.direcao === "esquerda") {
            contexto.translate(boneco.x + tamanho, boneco.y);
            contexto.scale(-1, 1);
        } else {
            contexto.translate(boneco.x, boneco.y);
        }

        // Tremor vertical de 1 pixel durante os passos.
        const salto = boneco.andando && boneco.quadroAnimacao === 1 ? escala : 0;

        // Sombra simples.
        contexto.fillStyle = "#202640";
        contexto.fillRect(3 * escala, 14 * escala + salto, 10 * escala, 2 * escala);

        // Pernas.
        contexto.fillStyle = "#30364f";
        const passoEsquerdo = boneco.andando && boneco.quadroAnimacao === 1 ? 1 : 0;
        const passoDireito = boneco.andando && boneco.quadroAnimacao === 0 ? 1 : 0;
        contexto.fillRect((3 - passoEsquerdo) * escala, 11 * escala, 4 * escala, 3 * escala);
        contexto.fillRect((9 + passoDireito) * escala, 11 * escala, 4 * escala, 3 * escala);

        // Corpo e jaleco.
        contexto.fillStyle = dados.roupa;
        contexto.fillRect(3 * escala, 6 * escala, 10 * escala, 6 * escala);
        contexto.fillStyle = dados.detalhe;
        contexto.fillRect(7 * escala, 7 * escala, 2 * escala, 5 * escala);

        // Braços.
        contexto.fillStyle = "#f1c27d";
        contexto.fillRect(1 * escala, 7 * escala, 2 * escala, 4 * escala);
        contexto.fillRect(13 * escala, 7 * escala, 2 * escala, 4 * escala);

        // Cabeça e cabelo.
        contexto.fillStyle = "#f1c27d";
        contexto.fillRect(4 * escala, 2 * escala, 8 * escala, 5 * escala);
        contexto.fillStyle = dados.cabelo;
        contexto.fillRect(3 * escala, 1 * escala, 10 * escala, 3 * escala);
        contexto.fillRect(3 * escala, 3 * escala, 2 * escala, 2 * escala);

        // Olhos que mudam conforme a direção inferior/superior.
        contexto.fillStyle = "#171a31";
        if (boneco.direcao === "cima") {
            contexto.fillRect(6 * escala, 4 * escala, 1 * escala, 1 * escala);
        } else {
            contexto.fillRect(10 * escala, 5 * escala, 1 * escala, 1 * escala);
        }

        contexto.restore();
    }

    // Tamanho da letra das plaquinhas, em pixels do canvas. O canvas é
    // reduzido pelo CSS (no celular fica bem menor que 800px); a letra cresce
    // na mesma proporção para continuar com ~11px na tela (máximo de 18).
    function tamanhoFonteNome() {
        const larguraNaTela = canvas.clientWidth || canvas.width;
        return Math.min(18, Math.max(11, Math.round(11 * canvas.width / larguraNaTela)));
    }

    function fonteNome() {
        return `bold ${tamanhoFonteNome()}px 'Courier New', monospace`;
    }

    // Retângulo da plaquinha no lugar normal: centralizada acima da cabeça.
    function plaquinhaDoNome(boneco, nome) {
        contexto.save();
        contexto.font = fonteNome();
        const largura = Math.ceil(contexto.measureText(nome).width) + 8;
        contexto.restore();

        const altura = tamanhoFonteNome() + 2;
        const centroX = Math.round(boneco.x + personagem.tamanho / 2);
        const topo = Math.max(0, Math.round(boneco.y) - altura + 1);
        return { x: centroX - Math.round(largura / 2), y: topo, largura, altura, topoNormal: topo };
    }

    // Plaquinha com o nome (fundo escuro, texto claro, sem cantos arredondados).
    // "placa" vem de plaquinhaDoNome(); se ela foi empurrada para cima para não
    // sobrepor outra, um tracinho liga a plaquinha à cabeça do boneco.
    function desenharNome(boneco, nome, placa) {
        const caixa = placa || plaquinhaDoNome(boneco, nome);
        const centroX = caixa.x + Math.round(caixa.largura / 2);

        contexto.save();
        contexto.font = fonteNome();
        contexto.textAlign = "center";
        contexto.textBaseline = "middle";

        if (caixa.y < caixa.topoNormal) {
            contexto.fillStyle = "rgba(11, 13, 27, 0.85)";
            contexto.fillRect(centroX - 1, caixa.y + caixa.altura, 2, caixa.topoNormal - caixa.y);
        }

        contexto.fillStyle = "rgba(11, 13, 27, 0.85)";
        contexto.fillRect(caixa.x, caixa.y, caixa.largura, caixa.altura);
        contexto.fillStyle = "#fff8dc";
        contexto.fillText(nome, centroX, caixa.y + Math.round(caixa.altura / 2) + 1);
        contexto.restore();
    }

    // Evita plaquinhas sobrepostas: quem está mais embaixo no mapa fica no
    // lugar normal; as outras sobem (ou descem, se não couberem no topo)
    // até achar um espaço livre. Devolve uma plaquinha para cada boneco.
    function organizarPlaquinhas(bonecos) {
        const passo = tamanhoFonteNome() + 3;
        const deslocamentos = [0, -passo, -passo * 2, -passo * 3, -passo * 4, passo, passo * 2];
        const colocadas = [];

        const sobrepoe = (a, b) => a.x < b.x + b.largura && a.x + a.largura > b.x &&
            a.y < b.y + b.altura && a.y + a.altura > b.y;

        // Do mais embaixo para o mais em cima.
        const ordem = [...bonecos].sort((a, b) => b.y - a.y);

        return new Map(ordem.map((boneco) => {
            const normal = plaquinhaDoNome(boneco, boneco.nome);
            let escolhida = normal;

            for (const deslocamento of deslocamentos) {
                const tentativa = { ...normal, y: normal.y + deslocamento };
                const dentroDoMapa = tentativa.y >= 0 && tentativa.y + tentativa.altura <= canvas.height;
                if (dentroDoMapa && !colocadas.some((outra) => sobrepoe(tentativa, outra))) {
                    escolhida = tentativa;
                    break;
                }
            }

            colocadas.push(escolhida);
            return [boneco, escolhida];
        }));
    }

    // Atualiza posição e animação usando o tempo real entre dois quadros.
    function atualizarPersonagem(deltaTempo) {
        let horizontal = 0;
        let vertical = 0;

        if (teclasPressionadas.w || teclasPressionadas.arrowup) vertical -= 1;
        if (teclasPressionadas.s || teclasPressionadas.arrowdown) vertical += 1;
        if (teclasPressionadas.a || teclasPressionadas.arrowleft) horizontal -= 1;
        if (teclasPressionadas.d || teclasPressionadas.arrowright) horizontal += 1;

        personagem.andando = horizontal !== 0 || vertical !== 0;

        if (horizontal !== 0 || vertical !== 0) {
            // Guarda a posição segura antes de tentar mover.
            personagem.posicaoAnteriorX = personagem.x;
            personagem.posicaoAnteriorY = personagem.y;

            // Normaliza a diagonal para não andar mais rápido nessas direções.
            const tamanhoDiagonal = Math.sqrt(horizontal * horizontal + vertical * vertical);
            horizontal /= tamanhoDiagonal;
            vertical /= tamanhoDiagonal;

            // Se o gás ou uma porta travada apareceu em cima do jogador,
            // ele pode andar para sair (só paredes e móveis bloqueiam).
            const soFixos = checarColisao(false);

            // Move um eixo de cada vez: na diagonal, o personagem desliza
            // pela parede em vez de parar.
            personagem.x += horizontal * personagem.velocidade * deltaTempo;
            if (checarColisao(soFixos)) personagem.x = personagem.posicaoAnteriorX;

            personagem.y += vertical * personagem.velocidade * deltaTempo;
            if (checarColisao(soFixos)) personagem.y = personagem.posicaoAnteriorY;

            if (horizontal < 0) personagem.direcao = "esquerda";
            if (horizontal > 0) personagem.direcao = "direita";
            if (vertical < 0) personagem.direcao = "cima";
            if (vertical > 0) personagem.direcao = "baixo";

            personagem.tempoAnimacao += deltaTempo;
            if (personagem.tempoAnimacao > 0.14) {
                personagem.quadroAnimacao = personagem.quadroAnimacao === 0 ? 1 : 0;
                personagem.tempoAnimacao = 0;
            }
        }

        // Impede que o personagem saia da área do Canvas.
        personagem.x = Math.max(0, Math.min(canvas.width - personagem.tamanho, personagem.x));
        personagem.y = Math.max(0, Math.min(canvas.height - personagem.tamanho, personagem.y));
    }

    // =================================================================
    // 3. MAPA
    // =================================================================

    // Cada retângulo representa uma parede ou área sólida do mapa.
    // Os números correspondem a posições em pixels dentro do Canvas.
    const paredes = [
        { x: 0, y: 0, largura: 800, altura: 16 },
        { x: 0, y: 464, largura: 800, altura: 16 },
        { x: 0, y: 0, largura: 16, altura: 480 },
        { x: 784, y: 0, largura: 16, altura: 480 },

        // Sala de computadores.
        { x: 16, y: 16, largura: 16, altura: 176 },
        { x: 16, y: 16, largura: 224, altura: 16 },
        { x: 224, y: 16, largura: 16, altura: 176 },
        { x: 16, y: 192, largura: 96, altura: 16 },
        { x: 144, y: 192, largura: 96, altura: 16 },

        // Sala principal.
        { x: 272, y: 208, largura: 256, altura: 16 },
        { x: 272, y: 400, largura: 256, altura: 16 },
        { x: 272, y: 208, largura: 16, altura: 96 },
        { x: 272, y: 336, largura: 16, altura: 64 },
        { x: 512, y: 208, largura: 16, altura: 96 },
        { x: 512, y: 336, largura: 16, altura: 64 },

        // Sala de energia.
        { x: 16, y: 288, largura: 16, altura: 176 },
        { x: 16, y: 288, largura: 96, altura: 16 },
        { x: 144, y: 288, largura: 96, altura: 16 },
        { x: 224, y: 288, largura: 16, altura: 176 },
        { x: 16, y: 448, largura: 224, altura: 16 },

        // Sala de segurança.
        { x: 560, y: 16, largura: 224, altura: 16 },
        { x: 768, y: 16, largura: 16, altura: 176 },
        { x: 560, y: 16, largura: 16, altura: 176 },
        { x: 560, y: 192, largura: 96, altura: 16 },
        { x: 688, y: 192, largura: 96, altura: 16 },

        // Sala do reator.
        { x: 560, y: 272, largura: 96, altura: 16 },
        { x: 688, y: 272, largura: 96, altura: 16 },
        { x: 560, y: 448, largura: 224, altura: 16 },
        { x: 560, y: 272, largura: 16, altura: 176 },
        { x: 768, y: 272, largura: 16, altura: 176 }
    ];

    // Corredor central e portas abertas ligam todas as salas.
    const portas = [
        { x: 112, y: 192, largura: 32, altura: 16, aberta: true, nome: "Computadores" },
        { x: 112, y: 288, largura: 32, altura: 16, aberta: true, nome: "Energia" },
        { x: 656, y: 192, largura: 32, altura: 16, aberta: true, nome: "Segurança" },
        { x: 656, y: 272, largura: 32, altura: 16, aberta: false, nome: "Reator" },
        { x: 272, y: 304, largura: 16, altura: 32, aberta: true, nome: "Principal" },
        { x: 512, y: 304, largura: 16, altura: 32, aberta: true, nome: "Principal" }
    ];

    // Lembra o estado original de cada porta para reiniciar a partida.
    portas.forEach((porta) => {
        porta.abertaInicial = porta.aberta;
    });

    // Objetos decorativos que também possuem colisão.
    const obstaculos = [
        { x: 48, y: 48, largura: 64, altura: 32, tipo: "mesa" },
        { x: 144, y: 48, largura: 64, altura: 32, tipo: "computador" },
        { x: 48, y: 112, largura: 64, altura: 32, tipo: "computador" },
        { x: 144, y: 112, largura: 64, altura: 32, tipo: "mesa" },

        { x: 304, y: 240, largura: 48, altura: 32, tipo: "mesa" },
        { x: 448, y: 240, largura: 48, altura: 32, tipo: "mesa" },
        { x: 304, y: 352, largura: 48, altura: 32, tipo: "armario" },
        { x: 448, y: 352, largura: 48, altura: 32, tipo: "armario" },

        { x: 48, y: 320, largura: 48, altura: 48, tipo: "equipamento" },
        { x: 176, y: 320, largura: 32, altura: 80, tipo: "armario" },

        { x: 592, y: 48, largura: 64, altura: 48, tipo: "armario" },
        { x: 688, y: 48, largura: 64, altura: 48, tipo: "mesa" },

        { x: 608, y: 320, largura: 64, altura: 64, tipo: "reator" },
        { x: 704, y: 320, largura: 32, altura: 80, tipo: "equipamento" }
    ];

    // Caixa de colisão nos pés: o desenho tem 48px, mas só esta área de 28x28 colide.
    // Assim o personagem passa pelas portas de 32px sem mudar o mapa.
    function caixaColisao() {
        return { x: personagem.x + 10, y: personagem.y + 20, largura: 28, altura: 28 };
    }

    // Confere se a posição atual colide com paredes, obstáculos, portas
    // fechadas ou a nuvem de gás. Devolve true se houver colisão.
    // Com soFixos = true, só paredes e obstáculos contam.
    function checarColisao(soFixos) {
        const caixa = caixaColisao();

        // Verifica se a caixa de colisão toca qualquer área sólida.
        function estaSobreposto(retangulo) {
            return (
                caixa.x < retangulo.x + retangulo.largura &&
                caixa.x + caixa.largura > retangulo.x &&
                caixa.y < retangulo.y + retangulo.altura &&
                caixa.y + caixa.altura > retangulo.y
            );
        }

        // Paredes e obstáculos sempre bloqueiam.
        if (paredes.some(estaSobreposto) || obstaculos.some(estaSobreposto)) return true;
        if (soFixos) return false;

        // O gás ativo funciona como uma área temporariamente bloqueada.
        const gasColidido = Boolean(estadoEvento.ativo === "gas" &&
            estadoEvento.gas && estaSobreposto(estadoEvento.gas));

        const portaFechada = portas.some((porta) => !porta.aberta && estaSobreposto(porta));

        return gasColidido || portaFechada;
    }

    // Retângulo interno de cada sala. Tarefas e coletáveis só podem ser
    // usados de dentro da mesma sala (não dá para "atravessar" paredes).
    const salasDoMapa = [
        { nome: "Computadores", x: 32, y: 32, largura: 192, altura: 160 },
        { nome: "Energia", x: 32, y: 304, largura: 192, altura: 144 },
        { nome: "Principal", x: 288, y: 224, largura: 224, altura: 176 },
        { nome: "Segurança", x: 576, y: 32, largura: 192, altura: 160 },
        { nome: "Reator", x: 576, y: 288, largura: 192, altura: 160 }
    ];

    // Nome da sala onde está o ponto (ou null nos corredores).
    function salaDoPonto(x, y) {
        const sala = salasDoMapa.find((item) =>
            x >= item.x && x < item.x + item.largura && y >= item.y && y < item.y + item.altura);
        return sala ? sala.nome : null;
    }

    // Desenha o mapa completo do laboratório e seus objetos.
    function desenharFundo() {
        contexto.fillStyle = "#343d68";
        contexto.fillRect(0, 0, canvas.width, canvas.height);

        for (let linha = 0; linha < 8; linha += 1) {
            for (let coluna = 0; coluna < 13; coluna += 1) {
                contexto.fillStyle = (linha + coluna) % 2 === 0 ? "#404a78" : "#394268";
                contexto.fillRect(coluna * 64, linha * 64, 64, 64);
            }
        }

        // Desenha cada parede em cinza com uma borda azul.
        for (const parede of paredes) {
            contexto.fillStyle = "#777f98";
            contexto.fillRect(parede.x, parede.y, parede.largura, parede.altura);
            contexto.fillStyle = "#9da5b8";
            contexto.fillRect(parede.x, parede.y, parede.largura, 4);
        }

        // Desenha portas rosas quando abertas e amarelas quando fechadas.
        for (const porta of portas) {
            contexto.fillStyle = porta.aberta ? "#ed87b8" : "#f4d35e";
            contexto.fillRect(porta.x, porta.y, porta.largura, porta.altura);
            contexto.fillStyle = "#1d2440";
            contexto.fillRect(porta.x + 12, porta.y + 4, 8, 8);
        }

        // Desenha os objetos decorativos conforme seu tipo.
        for (const objeto of obstaculos) {
            if (objeto.tipo === "computador") {
                contexto.fillStyle = "#1d2440";
                contexto.fillRect(objeto.x, objeto.y, objeto.largura, objeto.altura);
                contexto.fillStyle = "#62c9df";
                contexto.fillRect(objeto.x + 8, objeto.y + 6, objeto.largura - 16, objeto.altura - 16);
            } else if (objeto.tipo === "reator") {
                contexto.fillStyle = "#626b86";
                contexto.fillRect(objeto.x, objeto.y, objeto.largura, objeto.altura);
                contexto.fillStyle = "#f4d35e";
                contexto.fillRect(objeto.x + 20, objeto.y + 20, 24, 24);
                contexto.fillStyle = "#ed87b8";
                contexto.fillRect(objeto.x + 28, objeto.y + 28, 8, 8);
            } else {
                contexto.fillStyle = objeto.tipo === "armario" ? "#8b66b5" : "#bda765";
                contexto.fillRect(objeto.x, objeto.y, objeto.largura, objeto.altura);
                contexto.fillStyle = "#1d2440";
                contexto.fillRect(objeto.x + 6, objeto.y + 6, objeto.largura - 12, 4);

                if (objeto.tipo === "equipamento") {
                    contexto.fillStyle = "#62c9df";
                    contexto.fillRect(objeto.x + 12, objeto.y + 16, objeto.largura - 24, 10);
                }
            }
        }

        // Marcadores das seis tarefas no mapa.
        tarefas.forEach((tarefa) => {
            contexto.fillStyle = tarefa.concluida ? "#4e675a" : "#f4d35e";
            contexto.fillRect(tarefa.x - 10, tarefa.y - 10, 20, 20);
            contexto.fillStyle = "#171a31";
            contexto.fillRect(tarefa.x - 3, tarefa.y - 3, 6, 6);
        });

        // Frascos e cartões ainda não coletados aparecem no mapa.
        objetosColetaveis.frascos.forEach((frasco) => {
            if (!frasco.coletado) {
                contexto.fillStyle = "#ed87b8";
                contexto.fillRect(frasco.x - 8, frasco.y - 8, 16, 16);
                contexto.fillStyle = "#62c9df";
                contexto.fillRect(frasco.x - 4, frasco.y - 12, 8, 8);
            }
        });

        objetosColetaveis.cartoes.forEach((cartao) => {
            if (!cartao.coletado) {
                contexto.fillStyle = "#f4d35e";
                contexto.fillRect(cartao.x - 10, cartao.y - 7, 20, 14);
                contexto.fillStyle = "#8b66b5";
                contexto.fillRect(cartao.x - 6, cartao.y - 3, 12, 6);
            }
        });

        // Nuvem visual de gás fictício durante o evento.
        if (estadoEvento.ativo === "gas" && estadoEvento.gas) {
            const gas = estadoEvento.gas;
            contexto.fillStyle = "rgba(139, 102, 181, 0.72)";
            contexto.fillRect(gas.x, gas.y, gas.largura, gas.altura);

            contexto.fillStyle = "rgba(237, 135, 184, 0.55)";
            for (let circulo = 0; circulo < 5; circulo += 1) {
                contexto.beginPath();
                contexto.arc(gas.x + 25 + circulo * 24, gas.y + 50, 18, 0, Math.PI * 2);
                contexto.fill();
            }
        }

        // Escurecimento temporário do apagão.
        if (estadoEvento.ativo === "apagao") {
            contexto.fillStyle = "rgba(9, 11, 22, 0.78)";
            contexto.fillRect(0, 0, canvas.width, canvas.height);
        }
    }

    // =================================================================
    // 4. EVENTOS
    // =================================================================

    // Configuração dos eventos aleatórios da partida.
    const configuracaoEventos = {
        intervaloMinimo: 18000,
        intervaloMaximo: 30000,
        duracoes: {
            apagao: 8000,
            gas: 10000,
            portas: 12000,
            alarme: 8000
        },
        duracaoPadrao: 10000,
        intervaloAlarme: 700
    };

    const painelEvento = document.getElementById("event-panel");
    const nomeEvento = document.getElementById("event-name");
    const mensagemEvento = document.getElementById("event-message");
    const tempoEvento = document.getElementById("event-time");
    const botaoTestarEvento = document.getElementById("test-event-button");

    const estadoEvento = {
        ativo: false,
        nome: "",
        mensagem: "",
        terminaEm: 0,
        gas: null,
        portasOriginalmenteTravadas: [],
        intervaloSom: null,
        restanteNaPausa: 0
    };

    // Guarda o timer do próximo evento para poder pausar e cancelar.
    const agendamento = {
        timer: null,
        disparaEm: 0,
        restanteNaPausa: null
    };

    // Um único contexto de áudio, criado no primeiro bip.
    let audioContexto = null;

    // Toca um bip curto respeitando o volume e a opção de efeitos sonoros.
    function tocarAlarme() {
        const volume = controleVolume ? Number(controleVolume.value) / 100 : 0.5;
        const efeitosLigados = caixaEfeitos ? caixaEfeitos.checked : true;
        if (!efeitosLigados || volume === 0) return;

        try {
            if (!audioContexto) {
                audioContexto = new (window.AudioContext || window.webkitAudioContext)();
            }
            if (audioContexto.state === "suspended") audioContexto.resume();

            const oscilador = audioContexto.createOscillator();
            const ganho = audioContexto.createGain();

            oscilador.type = "square";
            oscilador.frequency.value = 660;
            // Volume de 50% equivale ao ganho original de 0,05.
            ganho.gain.value = 0.1 * volume;

            oscilador.connect(ganho);
            ganho.connect(audioContexto.destination);
            oscilador.start();
            oscilador.stop(audioContexto.currentTime + configuracaoEventos.intervaloAlarme / 1000);
        } catch (erro) {
            console.log("O navegador não permitiu reproduzir o som de teste.");
        }
    }

    // Novo evento pode ser acrescentado a esta lista no futuro.
    const eventosAleatorios = [
        {
            id: "apagao",
            nome: "APAGÃO",
            mensagem: "A iluminação está instável!",
            ativar: (duracao) => {
                estadoEvento.ativo = "apagao";
                estadoEvento.terminaEm = Date.now() + duracao;
            }
        },
        {
            id: "gas",
            nome: "VAZAMENTO DE GÁS",
            mensagem: "Uma área foi bloqueada por gás fictício.",
            ativar: (duracao) => {
                estadoEvento.ativo = "gas";
                estadoEvento.gas = { x: 304, y: 304, largura: 144, altura: 112 };
                estadoEvento.terminaEm = Date.now() + duracao;
            }
        },
        {
            id: "portas",
            nome: "PORTAS TRAVADAS",
            mensagem: "Duas portas foram temporariamente bloqueadas.",
            // No multiplayer o servidor informa quais portas travar (as mesmas para todos).
            ativar: (duracao, indicesDoServidor) => {
                estadoEvento.ativo = "portas";
                estadoEvento.portasOriginalmenteTravadas = [];

                const portasParaTravar = indicesDoServidor
                    ? indicesDoServidor.map((indice) => portas[indice]).filter((porta) => porta && porta.aberta)
                    : portas.filter((porta) => porta.aberta).slice(0, 2);
                portasParaTravar.forEach((porta) => {
                    estadoEvento.portasOriginalmenteTravadas.push(porta);
                    porta.aberta = false;
                });

                estadoEvento.terminaEm = Date.now() + duracao;
            }
        },
        {
            id: "alarme",
            nome: "ALARME",
            mensagem: "Alarme ativado! Atenção no laboratório.",
            ativar: (duracao) => {
                estadoEvento.ativo = "alarme";
                estadoEvento.terminaEm = Date.now() + duracao;
                painelEvento.classList.add("alarm-active");
                tocarAlarme();
                estadoEvento.intervaloSom = window.setInterval(tocarAlarme, 1400);
            }
        }
    ];

    // Modo solo: sorteia um evento e aplica.
    function iniciarEvento(duracao) {
        if (estadoEvento.ativo) return;

        const indice = Math.floor(Math.random() * eventosAleatorios.length);
        const eventoEscolhido = eventosAleatorios[indice];

        const duracaoEvento = duracao || configuracaoEventos.duracoes[eventoEscolhido.id] ||
            configuracaoEventos.duracaoPadrao;
        aplicarEvento(eventoEscolhido.id, duracaoEvento);
    }

    // Aplica um evento pelo id (no multiplayer, o id e a duração vêm do servidor).
    function aplicarEvento(id, duracaoEvento, portasDoServidor) {
        const eventoEscolhido = eventosAleatorios.find((evento) => evento.id === id);
        if (!eventoEscolhido) return;
        if (estadoEvento.ativo) finalizarEvento();

        estadoEvento.nome = eventoEscolhido.nome;
        estadoEvento.mensagem = eventoEscolhido.mensagem;
        eventoEscolhido.ativar(duracaoEvento, portasDoServidor);

        painelEvento.classList.add("active");
        nomeEvento.textContent = eventoEscolhido.nome;
        mensagemEvento.textContent = eventoEscolhido.mensagem;

        console.log(`Evento iniciado: ${eventoEscolhido.nome}`);
    }

    function finalizarEvento() {
        if (!estadoEvento.ativo) return;

        if (estadoEvento.ativo === "portas") {
            estadoEvento.portasOriginalmenteTravadas.forEach((porta) => {
                porta.aberta = true;
            });
        }

        if (estadoEvento.ativo === "alarme") {
            window.clearInterval(estadoEvento.intervaloSom);
            painelEvento.classList.remove("alarm-active");
        }

        estadoEvento.ativo = false;
        estadoEvento.gas = null;
        estadoEvento.portasOriginalmenteTravadas = [];

        painelEvento.classList.remove("active");
        nomeEvento.textContent = "SISTEMA NORMAL";
        mensagemEvento.textContent = "Nenhum evento ativo.";
        tempoEvento.textContent = "";
    }

    function atualizarEvento() {
        if (!estadoEvento.ativo) return;

        const restante = Math.max(0, estadoEvento.terminaEm - Date.now());
        tempoEvento.textContent = `${Math.ceil(restante / 1000)}s`;

        // No multiplayer quem encerra o evento é o servidor (evento:finalizado).
        if (restante <= 0 && modoJogo === "solo") {
            finalizarEvento();
        }
    }

    let temporizadorAviso = null;

    // Mostra um aviso curto no painel de evento e depois restaura o texto.
    function mostrarAviso(texto) {
        window.clearTimeout(temporizadorAviso);
        if (!estadoEvento.ativo) nomeEvento.textContent = "AVISO";
        mensagemEvento.textContent = texto;

        temporizadorAviso = window.setTimeout(() => {
            if (estadoEvento.ativo) {
                mensagemEvento.textContent = estadoEvento.mensagem;
            } else {
                nomeEvento.textContent = "SISTEMA NORMAL";
                mensagemEvento.textContent = "Nenhum evento ativo.";
            }
        }, 2500);
    }

    if (botaoTestarEvento) {
        botaoTestarEvento.addEventListener("click", () => {
            // No multiplayer só o anfitrião vê o botão, e o servidor sorteia o evento.
            if (modoJogo === "rede") {
                if (rede.socket) rede.socket.emit("evento:testar");
                return;
            }
            finalizarEvento();
            iniciarEvento(8000);
        });
    }

    // Agenda o próximo evento. O atraso opcional serve para retomar após a pausa.
    function agendarProximoEvento(atraso) {
        // Cancela o timer anterior para nunca existirem dois ao mesmo tempo.
        window.clearTimeout(agendamento.timer);

        const intervalo = atraso !== undefined ? atraso : configuracaoEventos.intervaloMinimo +
            Math.random() * (configuracaoEventos.intervaloMaximo - configuracaoEventos.intervaloMinimo);

        agendamento.disparaEm = Date.now() + intervalo;
        agendamento.restanteNaPausa = null;
        agendamento.timer = window.setTimeout(() => {
            agendamento.timer = null;
            if (modoJogo === "solo" && document.getElementById("play-screen").classList.contains("active") && !partida.pausada) {
                // Sem duração fixa: cada evento usa a sua (igual ao servidor).
                iniciarEvento();
            }
            agendarProximoEvento();
        }, intervalo);
    }

    // Congela o evento ativo, o bip do alarme e o agendamento durante a pausa.
    function pausarEventos() {
        const agora = Date.now();

        if (estadoEvento.ativo) {
            estadoEvento.restanteNaPausa = Math.max(0, estadoEvento.terminaEm - agora);
            window.clearInterval(estadoEvento.intervaloSom);
        }

        if (agendamento.timer) {
            window.clearTimeout(agendamento.timer);
            agendamento.timer = null;
            agendamento.restanteNaPausa = Math.max(0, agendamento.disparaEm - agora);
        }
    }

    // Retoma tudo de onde parou ao continuar a partida.
    function retomarEventos() {
        if (estadoEvento.ativo) {
            estadoEvento.terminaEm = Date.now() + estadoEvento.restanteNaPausa;
            if (estadoEvento.ativo === "alarme") {
                estadoEvento.intervaloSom = window.setInterval(tocarAlarme, 1400);
            }
        }

        if (agendamento.restanteNaPausa !== null) {
            agendarProximoEvento(agendamento.restanteNaPausa);
        }
    }

    // =================================================================
    // 5. TAREFAS
    // =================================================================

    // Sistema das seis tarefas da partida.
    const tarefas = [
        { id: "computador", nome: "Reiniciar o computador", categoria: "FÁCIL", concluida: false, progresso: 0, total: 3, x: 176, y: 64 },
        { id: "frascos", nome: "Organizar os frascos", categoria: "FÁCIL", concluida: false, progresso: 0, total: 3, x: 360, y: 256 },
        { id: "energia", nome: "Restaurar a energia", categoria: "MÉDIA", concluida: false, progresso: 0, total: 3, x: 72, y: 344 },
        { id: "portas", nome: "Desbloquear as portas", categoria: "MÉDIA", concluida: false, progresso: 0, total: 3, x: 624, y: 72 },
        { id: "reator", nome: "Estabilizar o reator", categoria: "DIFÍCIL", concluida: false, progresso: 0, total: 4, x: 640, y: 352 },
        { id: "protocolo", nome: "Ativar o protocolo", categoria: "DIFÍCIL", concluida: false, progresso: 0, total: 3, x: 400, y: 288 }
    ];

    // Coletáveis ficam afastados das marcas de tarefa para não se confundirem.
    const objetosColetaveis = {
        frascos: [
            { x: 96, y: 144, coletado: false },
            { x: 336, y: 360, coletado: false },
            { x: 600, y: 160, coletado: false }
        ],
        cartoes: [
            { x: 128, y: 420, coletado: false },
            { x: 720, y: 112, coletado: false },
            { x: 720, y: 384, coletado: false }
        ]
    };

    const modalTarefa = document.getElementById("task-modal");
    const categoriaTarefa = document.getElementById("task-category");
    const tituloTarefa = document.getElementById("task-title");
    const instrucoesTarefa = document.getElementById("task-instructions");
    const conteudoTarefa = document.getElementById("task-content");
    const feedbackTarefa = document.getElementById("task-feedback");
    const botaoFecharTarefa = document.getElementById("task-close");
    const listaTarefas = document.getElementById("task-list");
    const contadorTarefas = document.getElementById("tasks-completed");

    function atualizarListaTarefas() {
        listaTarefas.innerHTML = "";
        let concluidas = 0;

        tarefas.forEach((tarefa) => {
            if (tarefa.concluida) concluidas += 1;
            const item = document.createElement("div");
            item.className = `task-status${tarefa.concluida ? " done" : ""}`;
            item.textContent = `${tarefa.concluida ? "✓" : "○"} ${tarefa.nome}`;
            listaTarefas.appendChild(item);
        });

        contadorTarefas.textContent = `${concluidas}/6`;
    }

    // Fim do minijogo. No multiplayer o servidor precisa validar antes.
    function concluirTarefa(tarefa) {
        if (modoJogo === "rede") {
            feedbackTarefa.textContent = "Validando com o servidor...";
            if (rede.socket) rede.socket.emit("tarefa:concluir", { tarefaId: tarefa.id });
            return;
        }
        marcarTarefaConcluida(tarefa);
    }

    // Marca a tarefa como feita (solo direto; multiplayer após tarefa:confirmada).
    function marcarTarefaConcluida(tarefa) {
        tarefa.concluida = true;
        tarefa.progresso = tarefa.total;
        feedbackTarefa.textContent = "Tarefa concluída!";

        // "Desbloquear as portas" abre todas as portas só para quem concluiu.
        if (tarefa.id === "portas") {
            portas.forEach((porta) => {
                porta.aberta = true;
            });
        }

        atualizarListaTarefas();
        verificarResultado();
    }

    function erroTarefa() {
        feedbackTarefa.textContent = "Erro! Observe a ordem e tente novamente.";
    }

    // Pisca o botão com a classe .wrong para indicar erro.
    function marcarErro(botao) {
        botao.classList.add("wrong");
        window.setTimeout(() => botao.classList.remove("wrong"), 450);
    }

    // Ao reabrir uma tarefa, marca como certos os passos já feitos.
    function marcarPassosFeitos(passo) {
        conteudoTarefa.querySelectorAll(".task-option").forEach((botao, indice) => {
            if (indice < passo) {
                botao.className = "task-option correct";
                botao.disabled = true;
            }
        });
    }

    function barraProgresso(tarefa) {
        conteudoTarefa.querySelectorAll(".task-progress-bar").forEach((barra) => barra.remove());
        conteudoTarefa.insertAdjacentHTML("beforeend",
            `<div class="task-progress-bar"><div style="width:${(tarefa.progresso / tarefa.total) * 100}%"></div></div>`);
    }

    function criarOpcoes(tarefa, opcoes, aoClicar) {
        const grupo = document.createElement("div");
        grupo.className = "task-options";

        opcoes.forEach((opcao) => {
            const botao = document.createElement("button");
            botao.type = "button";
            botao.className = "task-option";
            botao.textContent = opcao;
            botao.addEventListener("click", () => aoClicar(opcao, botao));
            grupo.appendChild(botao);
        });

        conteudoTarefa.appendChild(grupo);
    }

    function interfaceComputador(tarefa) {
        const sequencia = ["ENERGIA", "MEMÓRIA", "REDE"];
        let passo = tarefa.progresso;
        instrucoesTarefa.textContent = "Pressione os módulos nesta ordem: ENERGIA, MEMÓRIA e REDE.";

        criarOpcoes(tarefa, ["ENERGIA", "MEMÓRIA", "REDE"], (opcao, botao) => {
            if (tarefa.concluida) return;
            if (opcao === sequencia[passo]) {
                botao.className = "task-option correct";
                botao.disabled = true;
                passo += 1;
                tarefa.progresso = passo;
                feedbackTarefa.textContent = `${passo}/${tarefa.total} módulos reiniciados.`;
                if (passo === tarefa.total) concluirTarefa(tarefa);
            } else {
                passo = 0;
                tarefa.progresso = 0;
                conteudoTarefa.querySelectorAll(".task-option").forEach((item) => {
                    item.className = "task-option";
                    item.disabled = false;
                });
                marcarErro(botao);
                erroTarefa();
            }
            barraProgresso(tarefa);
        });
        marcarPassosFeitos(passo);
        barraProgresso(tarefa);
    }

    function interfaceFrascos(tarefa) {
        const sequencia = ["AZUL", "ROSA", "AMARELO"];
        let passo = tarefa.progresso;
        const contarFrascos = () => objetosColetaveis.frascos.filter((frasco) => frasco.coletado).length;
        instrucoesTarefa.textContent = `Colete os 3 frascos e organize nesta sequência: AZUL, ROSA e AMARELO. Coletados: ${contarFrascos()}/3.`;

        criarOpcoes(tarefa, sequencia, (opcao, botao) => {
            if (tarefa.concluida) return;

            // Só aceita a sequência depois de coletar todos os frascos.
            const frascosColetados = contarFrascos();
            if (frascosColetados < tarefa.total) {
                marcarErro(botao);
                feedbackTarefa.textContent = `Faltam ${tarefa.total - frascosColetados} frascos para organizar.`;
                return;
            }

            if (opcao === sequencia[passo]) {
                botao.className = "task-option correct";
                botao.disabled = true;
                passo += 1;
                tarefa.progresso = passo;
                feedbackTarefa.textContent = `${passo}/${tarefa.total} frascos organizados.`;
                if (passo === tarefa.total) concluirTarefa(tarefa);
            } else {
                marcarErro(botao);
                erroTarefa();
            }
            barraProgresso(tarefa);
        });
        marcarPassosFeitos(passo);
        barraProgresso(tarefa);
    }

    function interfaceEnergia(tarefa) {
        const sequencia = ["AZUL", "AMARELO", "ROSA"];
        let passo = tarefa.progresso;
        instrucoesTarefa.textContent = "Conecte os cabos nesta ordem: AZUL, AMARELO e ROSA.";

        criarOpcoes(tarefa, sequencia, (opcao, botao) => {
            if (tarefa.concluida) return;
            if (opcao === sequencia[passo]) {
                botao.className = "task-option correct";
                botao.disabled = true;
                passo += 1;
                tarefa.progresso = passo;
                feedbackTarefa.textContent = `${passo}/${tarefa.total} cabos conectados.`;
                if (passo === tarefa.total) concluirTarefa(tarefa);
            } else {
                marcarErro(botao);
                erroTarefa();
            }
            barraProgresso(tarefa);
        });
        marcarPassosFeitos(passo);
        barraProgresso(tarefa);
    }

    function interfacePortas(tarefa) {
        const sequencia = ["▲", "■", "●"];
        let passo = tarefa.progresso;
        instrucoesTarefa.textContent = "Repita a sequência no painel: TRIÂNGULO, QUADRADO e CÍRCULO.";

        criarOpcoes(tarefa, sequencia, (opcao, botao) => {
            if (tarefa.concluida) return;
            if (opcao === sequencia[passo]) {
                botao.className = "task-option correct";
                botao.disabled = true;
                passo += 1;
                tarefa.progresso = passo;
                feedbackTarefa.textContent = `${passo}/${tarefa.total} símbolos resolvidos.`;
                if (passo === tarefa.total) concluirTarefa(tarefa);
            } else {
                marcarErro(botao);
                erroTarefa();
            }
            barraProgresso(tarefa);
        });
        marcarPassosFeitos(passo);
        barraProgresso(tarefa);
    }

    function interfaceReator(tarefa) {
        let passo = tarefa.progresso;
        instrucoesTarefa.textContent = "Ajuste os quatro controles na ordem de 1 a 4.";

        criarOpcoes(tarefa, ["1", "2", "3", "4"], (opcao, botao) => {
            if (tarefa.concluida) return;
            if (Number(opcao) === passo + 1) {
                botao.className = "task-option correct";
                botao.disabled = true;
                passo += 1;
                tarefa.progresso = passo;
                feedbackTarefa.textContent = `${passo}/${tarefa.total} controles ajustados.`;
                if (passo === tarefa.total) concluirTarefa(tarefa);
            } else {
                marcarErro(botao);
                erroTarefa();
            }
            barraProgresso(tarefa);
        });
        marcarPassosFeitos(passo);
        barraProgresso(tarefa);
    }

    function interfaceProtocolo(tarefa) {
        instrucoesTarefa.textContent = "Colete os três cartões espalhados pelo laboratório e confirme o protocolo no painel central.";
        tarefa.progresso = objetosColetaveis.cartoes.filter((cartao) => cartao.coletado).length;

        const botaoConfirmar = document.createElement("button");
        botaoConfirmar.type = "button";
        // Com os 3 cartões, o botão fica destacado (.selected) indicando que está pronto.
        botaoConfirmar.className = tarefa.progresso === tarefa.total ? "task-option selected" : "task-option";
        botaoConfirmar.textContent = "CONFIRMAR";

        botaoConfirmar.addEventListener("click", () => {
            if (tarefa.concluida) return;
            tarefa.progresso = objetosColetaveis.cartoes.filter((cartao) => cartao.coletado).length;

            if (tarefa.progresso === tarefa.total) {
                botaoConfirmar.className = "task-option correct";
                concluirTarefa(tarefa);
            } else {
                marcarErro(botaoConfirmar);
                erroTarefa();
                feedbackTarefa.textContent = `Faltam ${tarefa.total - tarefa.progresso} cartões de acesso.`;
            }
            barraProgresso(tarefa);
        });

        conteudoTarefa.appendChild(botaoConfirmar);
        barraProgresso(tarefa);
    }

    // Tarefa mostrada no modal agora (para redesenhar se o servidor recusar).
    let tarefaAberta = null;

    function abrirTarefa(tarefa) {
        tarefaAberta = tarefa;
        modalTarefa.hidden = false;
        categoriaTarefa.textContent = `${tarefa.categoria} • ${tarefa.progresso}/${tarefa.total}`;
        tituloTarefa.textContent = tarefa.nome;
        conteudoTarefa.innerHTML = "";
        feedbackTarefa.textContent = tarefa.concluida ? "Esta tarefa já está concluída." : "";

        if (tarefa.id === "computador") interfaceComputador(tarefa);
        if (tarefa.id === "frascos") interfaceFrascos(tarefa);
        if (tarefa.id === "energia") interfaceEnergia(tarefa);
        if (tarefa.id === "portas") interfacePortas(tarefa);
        if (tarefa.id === "reator") interfaceReator(tarefa);
        if (tarefa.id === "protocolo") interfaceProtocolo(tarefa);
    }

    botaoFecharTarefa.addEventListener("click", () => {
        modalTarefa.hidden = true;
    });

    // No multiplayer o servidor registra cada coleta (necessária para validar tarefas).
    function avisarColeta(tipo, indice) {
        if (modoJogo === "rede" && rede.socket) rede.socket.emit("coletavel:pegar", { tipo, indice });
    }

    // Descobre o que o E vai acionar agora: a tarefa ou o coletável mais
    // próximo, ao alcance e na mesma sala. Devolve null se não houver nada.
    // O resultado traz a ação e o retângulo do desenho (usado no destaque).
    function alvoDaInteracao() {
        // Distâncias medidas a partir do centro do personagem.
        // Os raios cresceram 15px porque meio corpo (24px) agora entra na conta.
        const centroX = personagem.x + personagem.tamanho / 2;
        const centroY = personagem.y + personagem.tamanho / 2;
        const raioTarefa = 100;
        const raioColeta = 70;
        const salaDoJogador = salaDoPonto(centroX, centroY);

        // Junta tarefas e coletáveis ao alcance; vence o mais próximo.
        // (Antes as tarefas tinham prioridade e escondiam os coletáveis vizinhos.)
        const candidatos = [];

        // "desenho" é o retângulo { x, y, largura, altura } do objeto no mapa.
        function considerar(alvo, raio, desenho, acao) {
            if (salaDoPonto(alvo.x, alvo.y) !== salaDoJogador) return;
            const distancia = Math.hypot(centroX - alvo.x, centroY - alvo.y);
            if (distancia < raio) candidatos.push({ distancia, desenho, acao });
        }

        tarefas.forEach((tarefa) => {
            const desenho = { x: tarefa.x - 10, y: tarefa.y - 10, largura: 20, altura: 20 };
            considerar(tarefa, raioTarefa, desenho, () => abrirTarefa(tarefa));
        });

        objetosColetaveis.frascos.forEach((frasco, indice) => {
            if (frasco.coletado) return;
            const desenho = { x: frasco.x - 8, y: frasco.y - 12, largura: 16, altura: 20 };
            considerar(frasco, raioColeta, desenho, () => {
                frasco.coletado = true;
                avisarColeta("frascos", indice);
                const frascosColetados = objetosColetaveis.frascos.filter((item) => item.coletado).length;
                mostrarAviso(`Frasco coletado (${frascosColetados}/3).`);
            });
        });

        objetosColetaveis.cartoes.forEach((cartao, indice) => {
            if (cartao.coletado) return;
            const desenho = { x: cartao.x - 10, y: cartao.y - 7, largura: 20, altura: 14 };
            considerar(cartao, raioColeta, desenho, () => {
                cartao.coletado = true;
                avisarColeta("cartoes", indice);
                const encontrados = objetosColetaveis.cartoes.filter((item) => item.coletado).length;
                mostrarAviso(`Cartão coletado (${encontrados}/3).`);
            });
        });

        if (candidatos.length === 0) return null;
        candidatos.sort((a, b) => a.distancia - b.distancia);
        return candidatos[0];
    }

    // Tecla E: aciona o alvo escolhido por alvoDaInteracao().
    function verificarInteracaoTarefa() {
        const alvo = alvoDaInteracao();
        if (!alvo) {
            mostrarAviso("Aproxime-se de um objeto ou tarefa e pressione E.");
            return;
        }
        alvo.acao();
    }

    // Contorno piscando em volta do que o E vai acionar (só com o jogo
    // rodando e sem minijogo aberto). Alterna amarelo e rosa da paleta,
    // com borda preta por fora, no mesmo estilo pixel art do mapa.
    function desenharDestaqueInteracao() {
        if (!partida.iniciou || partida.pausada || partida.encerrada) return;
        if (modalTarefa && !modalTarefa.hidden) return;
        // No apagão o mapa fica escuro: o destaque não entrega os objetos.
        if (estadoEvento.ativo === "apagao") return;

        const alvo = alvoDaInteracao();
        if (!alvo) return;

        const folga = 4;
        const espessura = 3;
        const caixa = {
            x: alvo.desenho.x - folga,
            y: alvo.desenho.y - folga,
            largura: alvo.desenho.largura + folga * 2,
            altura: alvo.desenho.altura + folga * 2
        };

        // Pisca a cada 250ms trocando de cor (--yellow e --pink).
        const cor = Math.floor(performance.now() / 250) % 2 === 0 ? "#f4d35e" : "#ed87b8";

        // Moldura preta por fora e colorida por dentro, feita com retângulos.
        desenharMoldura(caixa.x - 1, caixa.y - 1, caixa.largura + 2, caixa.altura + 2, espessura + 2, "#0b0d1b");
        desenharMoldura(caixa.x, caixa.y, caixa.largura, caixa.altura, espessura, cor);
    }

    // Desenha só a borda de um retângulo (4 faixas), sem cantos arredondados.
    function desenharMoldura(x, y, largura, altura, espessura, cor) {
        contexto.fillStyle = cor;
        contexto.fillRect(x, y, largura, espessura);
        contexto.fillRect(x, y + altura - espessura, largura, espessura);
        contexto.fillRect(x, y, espessura, altura);
        contexto.fillRect(x + largura - espessura, y, espessura, altura);
    }

    // =================================================================
    // 6. PARTIDA
    // =================================================================

    // Sistema da partida local.
    const partida = {
        duracaoInicial: 300,
        tempoRestante: 300,
        ultimaAtualizacao: Date.now(),
        pausada: false,
        encerrada: false,
        iniciou: false,
        jogadorAtivo: true
    };

    // "solo": adversários simulados. "rede": partida real pelo servidor.
    let modoJogo = "solo";

    // Adversários falsos do modo solo.
    const adversariosSimulados = [
        { nome: "Estudante Rosa", progresso: 1 },
        { nome: "Estudante Roxo", progresso: 2 },
        { nome: "Estudante Cinza", progresso: 1 }
    ];

    // Lista mostrada no painel: simulados (solo) ou jogadores reais (rede).
    const adversarios = [];

    function preencherAdversariosSimulados() {
        adversarios.length = 0;
        adversariosSimulados.forEach((adversario) => {
            adversarios.push({ ...adversario, ativo: true });
        });
    }

    preencherAdversariosSimulados();

    const relogioPartida = document.getElementById("match-clock");
    const painelAdversarios = document.getElementById("opponents-panel");
    const jogadoresAtivos = document.getElementById("active-players");
    const pauseOverlay = document.getElementById("pause-overlay");
    const resultOverlay = document.getElementById("result-overlay");
    const pauseButton = document.getElementById("pause-button");
    // Pausa da barra do topo no celular (mesma ação do botão PAUSAR).
    const botaoPausaToque = document.getElementById("touch-pause-button");
    const botaoContinuar = document.getElementById("resume-button");
    const mensagemPausa = document.getElementById("pause-message");
    const botaoJogarNovamente = document.getElementById("restart-button");

    // No multiplayer só o anfitrião pausa, continua e testa eventos.
    function atualizarControlesAnfitriao() {
        const podeControlar = modoJogo === "solo" || souAnfitriao();
        pauseButton.hidden = !podeControlar;
        botaoPausaToque.hidden = !podeControlar;
        botaoContinuar.hidden = !podeControlar;
        if (botaoTestarEvento) botaoTestarEvento.hidden = !podeControlar;
        mensagemPausa.textContent = podeControlar
            ? "O cronômetro e os eventos estão suspensos."
            : "Pausado pelo anfitrião. Aguarde...";
    }

    function atualizarPainelAdversarios() {
        painelAdversarios.innerHTML = "";
        let ativos = partida.jogadorAtivo ? 1 : 0;

        adversarios.forEach((adversario) => {
            if (adversario.ativo) ativos += 1;

            const item = document.createElement("div");
            item.className = `opponent${adversario.ativo ? "" : " eliminated"}`;
            const textoInativo = modoJogo === "rede" ? "DESCONECTADO" : "ELIMINADO";
            item.textContent = `${adversario.nome}: ${adversario.ativo ? `${adversario.progresso}/6` : textoInativo}`;
            painelAdversarios.appendChild(item);
        });

        jogadoresAtivos.textContent = String(ativos);
    }

    function atualizarCronometro() {
        const minutos = Math.floor(partida.tempoRestante / 60);
        const segundos = partida.tempoRestante % 60;
        relogioPartida.textContent = `${String(minutos).padStart(2, "0")}:${String(segundos).padStart(2, "0")}`;

        if (partida.tempoRestante <= 60) {
            relogioPartida.style.background = "#ed87b8";
        } else {
            relogioPartida.style.background = "#f4d35e";
        }
    }

    function finalizarPartida(vitoria, motivo) {
        if (partida.encerrada) return;

        partida.encerrada = true;
        partida.pausada = true;

        // Partida encerrada não agenda mais eventos.
        window.clearTimeout(agendamento.timer);
        agendamento.timer = null;

        if (estadoEvento.ativo) finalizarEvento();
        modalTarefa.hidden = true;
        pauseOverlay.hidden = true;
        soltarTeclas();

        document.getElementById("result-title").textContent = vitoria ? "VITÓRIA" : "DERROTA";
        document.getElementById("result-message").textContent = motivo;
        // No multiplayer, "jogar novamente" volta para o lobby da sala.
        botaoJogarNovamente.textContent = modoJogo === "rede" ? "VOLTAR À SALA" : "JOGAR NOVAMENTE";
        resultOverlay.hidden = false;
    }

    function verificarResultado() {
        if (partida.encerrada) return;

        // jogadorAtivo vira false quando o jogador perde a conexão com o servidor.
        if (!partida.jogadorAtivo) {
            finalizarPartida(false, modoJogo === "rede"
                ? "Você perdeu a conexão com o servidor."
                : "Você foi eliminado abstratamente da partida.");
            return;
        }

        // No multiplayer o restante do resultado é decidido pelo servidor (partida:fim).
        if (modoJogo === "rede") return;

        const tarefasConcluidas = tarefas.filter((tarefa) => tarefa.concluida).length;

        if (tarefasConcluidas === 6) {
            finalizarPartida(true, "Você concluiu as seis tarefas antes dos adversários!");
            return;
        }

        // Um adversário que conclui as seis tarefas vence a partida.
        const adversarioCompleto = adversarios.find((adversario) => adversario.ativo && adversario.progresso >= 6);

        if (adversarioCompleto) {
            finalizarPartida(false, `${adversarioCompleto.nome} concluiu as seis tarefas primeiro!`);
            return;
        }

        const adversariosAtivos = adversarios.filter((adversario) => adversario.ativo);

        if (adversariosAtivos.length === 0) {
            finalizarPartida(true, "Você é o último estudante ativo da partida!");
            return;
        }

        if (partida.tempoRestante <= 0) {
            const adversarioVencedor = [...adversariosAtivos]
                .sort((a, b) => b.progresso - a.progresso)[0];

            const progressoJogador = tarefasConcluidas;
            const progressoAdversario = adversarioVencedor ? adversarioVencedor.progresso : 0;

            if (progressoJogador > progressoAdversario) {
                finalizarPartida(true, "Você liderou as tarefas quando o tempo terminou!");
            } else if (progressoJogador === progressoAdversario) {
                finalizarPartida(false, "Empate ao final do tempo. Nenhum jogador venceu!");
            } else {
                finalizarPartida(false, "Um adversário terminou com mais tarefas concluídas.");
            }
        }
    }

    // modo "solo" (padrão) ou "rede"; dadosRede vem de partida:iniciada.
    function iniciarPartida(modo, dadosRede) {
        modoJogo = modo === "rede" ? "rede" : "solo";

        // Encerra o evento ativo primeiro (ele pode ter travado portas).
        finalizarEvento();

        partida.tempoRestante = dadosRede ? dadosRede.tempoRestante : partida.duracaoInicial;
        partida.ultimaAtualizacao = Date.now();
        partida.pausada = false;
        partida.encerrada = false;
        partida.iniciou = true;
        partida.jogadorAtivo = true;

        resultOverlay.hidden = true;
        pauseOverlay.hidden = true;
        modalTarefa.hidden = true;

        // Personagem volta ao ponto inicial, parado e olhando para baixo.
        personagem.x = posicaoInicial.x;
        personagem.y = posicaoInicial.y;
        personagem.posicaoAnteriorX = posicaoInicial.x;
        personagem.posicaoAnteriorY = posicaoInicial.y;
        personagem.direcao = "baixo";
        personagem.andando = false;
        personagem.quadroAnimacao = 0;
        personagem.tempoAnimacao = 0;

        // Frascos e cartões voltam para o mapa.
        [...objetosColetaveis.frascos, ...objetosColetaveis.cartoes].forEach((objeto) => {
            objeto.coletado = false;
        });

        // Portas voltam ao estado original (Reator fechada).
        portas.forEach((porta) => {
            porta.aberta = porta.abertaInicial;
        });

        tarefas.forEach((tarefa) => {
            tarefa.concluida = false;
            tarefa.progresso = 0;
        });

        // Começa sem outros jogadores no mapa (o modo rede preenche logo abaixo).
        Object.keys(outrosJogadores).forEach((id) => delete outrosJogadores[id]);

        if (modoJogo === "rede") {
            // Adversários são os outros jogadores reais; personagem é o escolhido no lobby.
            adversarios.length = 0;
            dadosRede.jogadores.forEach((jogador) => {
                const saida = posicaoDeSaida(jogador.personagem);
                if (jogador.id === rede.meuId) {
                    escolherPersonagem(jogador.personagem);
                    // Cada personagem nasce num ponto diferente da sala principal.
                    personagem.x = saida.x;
                    personagem.y = saida.y;
                    personagem.posicaoAnteriorX = saida.x;
                    personagem.posicaoAnteriorY = saida.y;
                } else {
                    adversarios.push({ id: jogador.id, nome: jogador.nome, progresso: 0, ativo: true });
                    criarOutroJogador(jogador, saida);
                }
            });

            // Eventos vêm do servidor: cancela o agendamento local.
            window.clearTimeout(agendamento.timer);
            agendamento.timer = null;
            agendamento.restanteNaPausa = null;
        } else {
            preencherAdversariosSimulados();
            escolherPersonagem(Number(seletorPersonagem ? seletorPersonagem.value : 0));

            // Recomeça a contagem do próximo evento (cancela o timer antigo).
            agendarProximoEvento();
        }

        // Seletor e velocidade ficam travados no multiplayer.
        if (seletorPersonagem) seletorPersonagem.disabled = modoJogo === "rede";
        aplicarVelocidade();
        atualizarControlesAnfitriao();

        atualizarCronometro();
        atualizarListaTarefas();
        atualizarPainelAdversarios();
    }

    // Botão PAUSAR. No multiplayer o anfitrião pede ao servidor, que pausa para todos.
    function pausarPartida() {
        if (partida.encerrada || partida.pausada) return;
        if (modoJogo === "rede") {
            if (souAnfitriao()) rede.socket.emit("partida:pausar", { pausada: true });
            return;
        }
        congelarPartida();
    }

    // Botão CONTINUAR.
    function continuarPartida() {
        if (partida.encerrada || !partida.pausada) return;
        if (modoJogo === "rede") {
            if (souAnfitriao()) rede.socket.emit("partida:pausar", { pausada: false });
            return;
        }
        descongelarPartida();
    }

    // Aplica a pausa de fato (solo: na hora; rede: ao receber partida:pausada).
    function congelarPartida() {
        if (partida.encerrada || partida.pausada) return;
        partida.pausada = true;
        pausarEventos();
        soltarTeclas();
        // Com o jogo pausado não dá para fazer tarefas (o relógio está parado).
        modalTarefa.hidden = true;
        pauseOverlay.hidden = false;
    }

    function descongelarPartida() {
        if (partida.encerrada || !partida.pausada) return;
        partida.pausada = false;
        partida.ultimaAtualizacao = Date.now();
        retomarEventos();
        pauseOverlay.hidden = true;
    }

    function atualizarPartida() {
        // No multiplayer o relógio é do servidor e não há adversários simulados.
        if (modoJogo === "rede") return;
        if (!partida.iniciou || partida.pausada || partida.encerrada) return;

        const agora = Date.now();
        if (agora - partida.ultimaAtualizacao >= 1000) {
            const segundosPassados = Math.floor((agora - partida.ultimaAtualizacao) / 1000);
            partida.tempoRestante -= segundosPassados;
            partida.ultimaAtualizacao += segundosPassados * 1000;

            partida.tempoRestante = Math.max(0, partida.tempoRestante);
            atualizarCronometro();

            // Simulação abstrata, sorteada uma vez por segundo passado
            // (não depende da taxa de quadros do computador).
            for (let segundo = 0; segundo < segundosPassados; segundo += 1) {
                simularAdversarios();
            }

            verificarResultado();
        }
    }

    // Chances por segundo, ajustadas para o primeiro adversário chegar
    // a 6/6 por volta de 3min20s (mediana; em ~1 de cada 4 partidas ninguém chega)
    // e ~2 eliminações a cada 3 partidas.
    const CHANCE_AVANCO_POR_SEGUNDO = 0.035;
    const CHANCE_ELIMINACAO_POR_SEGUNDO = 0.003;

    function simularAdversarios() {
        const ativos = adversarios.filter((adversario) => adversario.ativo);
        if (ativos.length === 0) return;
        const sortear = () => ativos[Math.floor(Math.random() * ativos.length)];

        // Um adversário sorteado conclui mais uma tarefa.
        // Chegar a 6/6 é tratado em verificarResultado() como vitória do adversário.
        if (Math.random() < CHANCE_AVANCO_POR_SEGUNDO) {
            const adversario = sortear();
            adversario.progresso = Math.min(6, adversario.progresso + 1);
            atualizarPainelAdversarios();
        }

        // Eliminação abstrata de um adversário sorteado.
        if (Math.random() < CHANCE_ELIMINACAO_POR_SEGUNDO) {
            sortear().ativo = false;
            atualizarPainelAdversarios();
        }
    }

    pauseButton.addEventListener("click", pausarPartida);
    botaoPausaToque.addEventListener("click", pausarPartida);
    botaoContinuar.addEventListener("click", continuarPartida);

    // Volta ao menu no meio da partida: para o evento (e o bip do alarme),
    // cancela o próximo sorteio e sai da sala, se estiver numa.
    function sairDaPartida() {
        if (rede.sala) salasRede.sair();
        finalizarEvento();
        window.clearTimeout(agendamento.timer);
        agendamento.timer = null;
        agendamento.restanteNaPausa = null;
        if (partida.iniciou) partida.encerrada = true;
        modalTarefa.hidden = true;
        pauseOverlay.hidden = true;
        soltarTeclas();
    }

    document.getElementById("pause-menu-button").addEventListener("click", () => {
        sairDaPartida();
        abrirTela("menu-screen");
    });

    botaoJogarNovamente.addEventListener("click", () => {
        if (modoJogo === "rede") {
            // A sala volta ao lobby no servidor; o anfitrião inicia outra partida.
            resultOverlay.hidden = true;
            abrirTela("rooms-screen");
            return;
        }
        iniciarPartida("solo");
    });

    document.getElementById("result-menu-button").addEventListener("click", () => {
        resultOverlay.hidden = true;
        sairDaPartida();
        abrirTela("menu-screen");
    });

    // =================================================================
    // 7. SALAS (multiplayer pelo servidor Socket.IO)
    // =================================================================

    // Estado da conexão. "conectando" enquanto o cliente Socket.IO carrega.
    const rede = {
        socket: null,
        online: false,
        conectando: true,
        meuId: null,
        sala: null,
        publicas: []
    };

    // Tempo máximo esperando o servidor antes de mostrar "offline".
    // (O Render gratuito pode demorar para "acordar"; se ele responder depois, conecta sozinho.)
    const ESPERA_SERVIDOR_MS = 15000;

    // --- Outros jogadores no mapa (movimentação sincronizada) ---

    // Envia a própria posição ~15 vezes por segundo (a cada 66ms).
    const INTERVALO_ENVIO_MS = 66;
    // Desenha os outros um pouco "no passado" (100ms) para sempre ter duas
    // posições recebidas entre as quais interpolar: o movimento fica suave.
    const ATRASO_INTERPOLACAO_MS = 100;

    // Outros jogadores da partida, indexados pelo id do socket.
    const outrosJogadores = {};
    let ultimoEnvioPosicao = 0;
    let ultimaPosicaoEnviada = "";

    function criarOutroJogador(jogador, saida) {
        outrosJogadores[jogador.id] = {
            nome: jogador.nome,
            personagemAtual: jogador.personagem,
            x: saida.x,
            y: saida.y,
            direcao: "baixo",
            andando: false,
            quadroAnimacao: 0,
            tempoAnimacao: 0,
            // Posições recebidas: { tempo, x, y } (tempo do relógio deste navegador).
            amostras: [{ tempo: performance.now(), x: saida.x, y: saida.y }]
        };
    }

    // Guarda uma posição recebida do servidor.
    function receberPosicao(dados) {
        const outro = outrosJogadores[dados.id];
        if (!outro) return;

        // Se o jogador estava parado (sem mensagens), repete a última posição logo
        // antes da nova: assim o primeiro passo não dá um "pulo".
        const agora = performance.now();
        const ultima = outro.amostras[outro.amostras.length - 1];
        if (agora - ultima.tempo > INTERVALO_ENVIO_MS * 2) {
            outro.amostras.push({ tempo: agora - INTERVALO_ENVIO_MS, x: ultima.x, y: ultima.y });
        }

        outro.amostras.push({ tempo: agora, x: dados.x, y: dados.y });
        // Só as últimas 10 interessam.
        if (outro.amostras.length > 10) outro.amostras.shift();
        outro.direcao = dados.direcao;
        outro.andando = dados.andando;
    }

    // Calcula onde cada outro jogador está agora, interpolando entre duas amostras.
    function atualizarOutrosJogadores(deltaTempo) {
        const momento = performance.now() - ATRASO_INTERPOLACAO_MS;

        Object.values(outrosJogadores).forEach((outro) => {
            const amostras = outro.amostras;
            const ultima = amostras[amostras.length - 1];

            // Procura a amostra logo antes do "momento" desenhado.
            let anterior = amostras[0];
            let seguinte = ultima;
            for (let indice = amostras.length - 1; indice > 0; indice -= 1) {
                if (amostras[indice - 1].tempo <= momento) {
                    anterior = amostras[indice - 1];
                    seguinte = amostras[indice];
                    break;
                }
            }

            if (momento >= ultima.tempo || anterior === seguinte) {
                // Sem posição mais nova: fica parado na última conhecida.
                outro.x = ultima.x;
                outro.y = ultima.y;
            } else {
                // Interpolação linear entre as duas amostras.
                const fracao = Math.min(1, Math.max(0,
                    (momento - anterior.tempo) / (seguinte.tempo - anterior.tempo)));
                outro.x = anterior.x + (seguinte.x - anterior.x) * fracao;
                outro.y = anterior.y + (seguinte.y - anterior.y) * fracao;
            }

            // Animação dos passos igual à do próprio personagem.
            if (outro.andando && !partida.pausada) {
                outro.tempoAnimacao += deltaTempo;
                if (outro.tempoAnimacao > 0.14) {
                    outro.quadroAnimacao = outro.quadroAnimacao === 0 ? 1 : 0;
                    outro.tempoAnimacao = 0;
                }
            }
        });
    }

    function desenharOutrosJogadores() {
        Object.values(outrosJogadores).forEach((outro) => {
            desenharBoneco(outro);
        });
    }

    // As plaquinhas são desenhadas por último (por cima de todos os bonecos),
    // já organizadas para não se sobreporem.
    function desenharNomesOutrosJogadores() {
        const placas = organizarPlaquinhas(Object.values(outrosJogadores));
        placas.forEach((placa, outro) => desenharNome(outro, outro.nome, placa));
    }

    // Envia a própria posição, no máximo ~15x/s e só quando algo mudou.
    function enviarPosicao(tempoAtual) {
        if (modoJogo !== "rede" || !rede.socket || !rede.online) return;
        if (!partida.iniciou || partida.encerrada || partida.pausada) return;
        if (tempoAtual - ultimoEnvioPosicao < INTERVALO_ENVIO_MS) return;

        const dados = {
            x: Math.round(personagem.x),
            y: Math.round(personagem.y),
            direcao: personagem.direcao,
            andando: personagem.andando
        };
        const resumo = `${dados.x},${dados.y},${dados.direcao},${dados.andando}`;
        if (resumo === ultimaPosicaoEnviada) return;

        ultimoEnvioPosicao = tempoAtual;
        ultimaPosicaoEnviada = resumo;
        rede.socket.volatile.emit("jogador:posicao", dados);
    }

    const criarSalaPublica = document.getElementById("create-public-room");
    const criarSalaPrivada = document.getElementById("create-private-room");
    const entrarSalaBotao = document.getElementById("join-room-button");
    const codigoSalaInput = document.getElementById("room-code-input");
    const feedbackSala = document.getElementById("room-feedback");
    const listaSalasPublicas = document.getElementById("public-room-list");
    const lobby = document.getElementById("room-lobby");
    const statusServidor = document.getElementById("server-status");
    const seletorLobby = document.getElementById("lobby-character");
    const botaoIniciarPartida = document.getElementById("start-match");

    function souAnfitriao() {
        return Boolean(rede.sala && rede.sala.anfitriaoId === rede.meuId);
    }

    // Mostra se o servidor está disponível e libera/bloqueia os botões de sala.
    function atualizarStatusServidor() {
        if (rede.online) {
            statusServidor.textContent = "SERVIDOR ONLINE — salas reais com outros jogadores.";
        } else if (rede.conectando) {
            statusServidor.textContent = "CONECTANDO AO SERVIDOR...";
        } else {
            statusServidor.textContent = "SERVIDOR OFFLINE — use JOGAR para o modo solo.";
        }

        [criarSalaPublica, criarSalaPrivada, entrarSalaBotao].forEach((botao) => {
            botao.disabled = !rede.online;
        });
        codigoSalaInput.disabled = !rede.online;

        if (!rede.online) {
            rede.sala = null;
            rede.publicas = [];
            lobby.hidden = true;
        }
        atualizarSalasPublicas();
    }

    // Ações das salas: cada uma envia um evento ao servidor.
    const salasRede = {
        criar(publica) {
            const nome = publica ? "Laboratório Público" : "Laboratório Privado";
            rede.socket.emit("sala:criar", { publica, nome }, tratarRespostaSala);
        },
        entrar(codigo) {
            rede.socket.emit("sala:entrar", { codigo }, tratarRespostaSala);
        },
        sair() {
            if (rede.socket && rede.sala) rede.socket.emit("sala:sair");
            rede.sala = null;
            lobby.hidden = true;
            feedbackSala.textContent = "Você saiu da sala.";

            // Saiu no meio da partida: para o evento (e o bip do alarme).
            if (modoJogo === "rede") finalizarEvento();
        },
        trocarPersonagem(indice) {
            rede.socket.emit("sala:personagem", { personagem: indice }, (resposta) => {
                if (!resposta.ok) feedbackSala.textContent = resposta.erro;
            });
        },
        iniciar() {
            rede.socket.emit("partida:iniciar", null, (resposta) => {
                if (!resposta.ok) feedbackSala.textContent = resposta.erro;
            });
        }
    };

    function tratarRespostaSala(resposta) {
        if (!resposta.ok) {
            feedbackSala.textContent = resposta.erro;
            return;
        }
        rede.sala = resposta.sala;
        exibirLobby(resposta.sala);
    }

    function corDoPersonagem(indice) {
        const cores = ["#62c9df", "#ed87b8", "#8b66b5", "#f4d35e", "#bbc1d1"];
        return cores[indice] || "#bbc1d1";
    }

    // Desenha o lobby com os jogadores da sala (dados do servidor).
    function exibirLobby(sala) {
        lobby.hidden = false;
        document.getElementById("lobby-room-name").textContent = sala.nome;
        document.getElementById("lobby-room-code").textContent = sala.codigo;
        document.getElementById("lobby-room-type").textContent =
            `${sala.publica ? "Sala pública" : "Sala privada"} • ${sala.jogadores.length}/${sala.capacidade} jogadores (mínimo ${sala.minimo})`;

        const listaJogadores = document.getElementById("lobby-player-list");
        listaJogadores.innerHTML = "";

        sala.jogadores.forEach((jogador) => {
            const anfitriao = jogador.id === sala.anfitriaoId;
            const cartao = document.createElement("div");
            cartao.className = `lobby-player${anfitriao ? " host" : ""}`;

            const avatar = document.createElement("div");
            avatar.className = "player-avatar";
            avatar.style.background = corDoPersonagem(jogador.personagem);

            const nome = document.createElement("strong");
            nome.textContent = jogador.nome;

            const descricao = document.createElement("span");
            descricao.textContent = `${anfitriao ? "ANFITRIÃO" : "JOGADOR"}${jogador.id === rede.meuId ? " • VOCÊ" : ""}`;

            cartao.append(avatar, nome, descricao);
            listaJogadores.appendChild(cartao);
        });

        // Personagens já escolhidos por outros ficam indisponíveis.
        const eu = sala.jogadores.find((jogador) => jogador.id === rede.meuId);
        [...seletorLobby.options].forEach((opcao) => {
            opcao.disabled = sala.jogadores.some((jogador) =>
                jogador.id !== rede.meuId && jogador.personagem === Number(opcao.value));
        });
        if (eu) seletorLobby.value = String(eu.personagem);

        // Só o anfitrião inicia, e só com o mínimo de jogadores.
        const podeIniciar = souAnfitriao() && sala.jogadores.length >= sala.minimo;
        botaoIniciarPartida.disabled = !podeIniciar;
        botaoIniciarPartida.textContent = souAnfitriao() ? "INICIAR PARTIDA" : "AGUARDANDO ANFITRIÃO";
        feedbackSala.textContent = "";
    }

    function atualizarSalasPublicas() {
        listaSalasPublicas.innerHTML = "";

        if (rede.publicas.length === 0) {
            const vazio = document.createElement("p");
            if (rede.online) vazio.textContent = "Nenhuma sala pública aberta.";
            else vazio.textContent = rede.conectando ? "Aguardando o servidor..." : "Indisponível sem servidor.";
            listaSalasPublicas.appendChild(vazio);
            return;
        }

        rede.publicas.forEach((sala) => {
            const linha = document.createElement("div");
            linha.className = "public-room";

            const nome = document.createElement("strong");
            nome.textContent = `${sala.nome} (${sala.codigo})`;

            const quantidade = document.createElement("span");
            quantidade.textContent = `${sala.jogadores}/${sala.capacidade} jogadores`;

            const botao = document.createElement("button");
            botao.type = "button";
            botao.className = "back-button";
            botao.textContent = "ENTRAR";
            botao.addEventListener("click", () => salasRede.entrar(sala.codigo));

            linha.append(nome, quantidade, botao);
            listaSalasPublicas.appendChild(linha);
        });
    }

    criarSalaPublica.addEventListener("click", () => salasRede.criar(true));
    criarSalaPrivada.addEventListener("click", () => salasRede.criar(false));

    entrarSalaBotao.addEventListener("click", () => {
        const codigo = codigoSalaInput.value.trim();
        if (!codigo) {
            feedbackSala.textContent = "Digite o código da sala.";
            return;
        }
        salasRede.entrar(codigo);
    });

    // A tecla "Ir"/Enter do teclado do celular também entra na sala.
    codigoSalaInput.addEventListener("keydown", (evento) => {
        if (evento.key === "Enter") {
            evento.preventDefault();
            entrarSalaBotao.click();
        }
    });

    // Quando o teclado do celular abre, centraliza o campo e o botão ENTRAR.
    codigoSalaInput.addEventListener("focus", () => {
        window.setTimeout(() => {
            codigoSalaInput.closest(".join-panel").scrollIntoView({ block: "center", behavior: "smooth" });
        }, 300);
    });

    document.getElementById("leave-room-button").addEventListener("click", () => salasRede.sair());
    seletorLobby.addEventListener("change", () => salasRede.trocarPersonagem(Number(seletorLobby.value)));
    botaoIniciarPartida.addEventListener("click", () => salasRede.iniciar());

    // Monta uma frase de resultado igual para todos, do ponto de vista de cada um.
    function textoResultado(dados, venci) {
        if (dados.tipo === "tarefas") {
            return venci ? "Você concluiu as seis tarefas antes dos adversários!"
                : `${dados.vencedorNome} concluiu as seis tarefas primeiro!`;
        }
        if (dados.tipo === "ultimo") {
            return venci ? "Você é o último estudante ativo da partida!"
                : `${dados.vencedorNome} foi o último estudante ativo.`;
        }
        if (dados.tipo === "tempo") {
            return venci ? "Você liderou as tarefas quando o tempo terminou!"
                : `${dados.vencedorNome} terminou com mais tarefas concluídas.`;
        }
        return "Empate ao final do tempo. Nenhum jogador venceu!";
    }

    // Carrega o cliente Socket.IO do próprio servidor (config.js define URL_SERVIDOR).
    // Se não carregar a tempo, mostra "offline"; o modo solo não depende disso.
    function conectarServidor() {
        // Remove "/" do final para não gerar "//socket.io".
        const url = typeof URL_SERVIDOR === "string" ? URL_SERVIDOR.replace(/\/+$/, "") : null;
        if (!url) {
            rede.conectando = false;
            atualizarStatusServidor();
            return;
        }

        rede.conectando = true;
        atualizarStatusServidor();

        const limite = window.setTimeout(() => {
            if (!rede.online) {
                rede.conectando = false;
                atualizarStatusServidor();
            }
        }, ESPERA_SERVIDOR_MS);

        const script = document.createElement("script");
        script.src = `${url}/socket.io/socket.io.js`;
        script.onload = () => iniciarSocket(url, limite);
        script.onerror = () => {
            window.clearTimeout(limite);
            rede.conectando = false;
            atualizarStatusServidor();
        };
        document.head.appendChild(script);
    }

    // Liga ao servidor e trata cada evento que ele envia.
    function iniciarSocket(url, limite) {
        if (typeof io === "undefined") return;

        const socket = io(url);
        rede.socket = socket;

        socket.on("connect", () => {
            window.clearTimeout(limite);
            rede.online = true;
            rede.conectando = false;
            rede.meuId = socket.id;
            atualizarStatusServidor();
        });

        // Servidor fora do ar: o Socket.IO continua tentando reconectar sozinho.
        socket.on("connect_error", () => {
            rede.online = false;
            rede.conectando = false;
            atualizarStatusServidor();
        });

        socket.on("disconnect", () => {
            // O Socket.IO tenta reconectar sozinho; até lá mostra "conectando".
            rede.online = false;
            rede.conectando = true;
            atualizarStatusServidor();

            // Caiu no meio da partida: o jogador sai (derrota por desconexão).
            if (modoJogo === "rede" && partida.iniciou && !partida.encerrada) {
                partida.jogadorAtivo = false;
                finalizarEvento();
                verificarResultado();
            }
        });

        socket.on("salas:publicas", (lista) => {
            rede.publicas = lista;
            atualizarSalasPublicas();
        });

        socket.on("sala:atualizada", (sala) => {
            rede.sala = sala;
            if (sala.estado === "lobby") exibirLobby(sala);
            // Pode ter mudado o anfitrião durante a partida.
            if (modoJogo === "rede") atualizarControlesAnfitriao();
        });

        socket.on("partida:iniciada", (dados) => {
            abrirTela("play-screen");
            iniciarPartida("rede", dados);
        });

        socket.on("partida:estado", (dados) => {
            if (modoJogo !== "rede" || partida.encerrada) return;
            partida.tempoRestante = dados.tempoRestante;
            atualizarCronometro();
            if (dados.evento && estadoEvento.ativo) {
                estadoEvento.terminaEm = Date.now() + dados.evento.restanteMs;
                tempoEvento.textContent = `${Math.ceil(dados.evento.restanteMs / 1000)}s`;
            }
        });

        socket.on("partida:pausada", (dados) => {
            if (dados.pausada) congelarPartida();
            else descongelarPartida();
        });

        socket.on("evento:iniciado", (dados) => {
            aplicarEvento(dados.id, dados.duracaoMs, dados.portas);
        });

        socket.on("evento:finalizado", () => {
            finalizarEvento();
        });

        socket.on("progresso:atualizado", (dados) => {
            const adversario = adversarios.find((item) => item.id === dados.jogadorId);
            if (adversario) {
                adversario.progresso = dados.tarefasConcluidas;
                atualizarPainelAdversarios();
            }
        });

        socket.on("tarefa:confirmada", (dados) => {
            const tarefa = tarefas.find((item) => item.id === dados.tarefaId);
            if (tarefa && !tarefa.concluida) marcarTarefaConcluida(tarefa);
        });

        socket.on("tarefa:recusada", (dados) => {
            const tarefa = tarefas.find((item) => item.id === dados.tarefaId);
            if (tarefa && tarefa.concluida) return;

            // O minijogo volta ao começo; senão todos os botões ficariam
            // verdes e desativados e a tarefa nunca mais poderia ser feita.
            if (tarefa) {
                tarefa.progresso = 0;
                if (!modalTarefa.hidden && tarefaAberta === tarefa) abrirTarefa(tarefa);
            }
            feedbackTarefa.textContent = dados.motivo;
            mostrarAviso(dados.motivo);
        });

        socket.on("jogador:posicao", receberPosicao);

        socket.on("jogador:saiu", (dados) => {
            // Quem saiu some do mapa.
            delete outrosJogadores[dados.jogadorId];

            const adversario = adversarios.find((item) => item.id === dados.jogadorId);
            if (adversario) {
                adversario.ativo = false;
                atualizarPainelAdversarios();
                if (modoJogo === "rede" && !partida.encerrada) mostrarAviso(`${adversario.nome} saiu da partida.`);
            }
        });

        socket.on("partida:fim", (dados) => {
            if (modoJogo !== "rede") return;
            const venci = dados.vencedorId === rede.meuId;
            finalizarPartida(venci, textoResultado(dados, venci));
        });
    }

    // =================================================================
    // 8. CELULAR (controles de toque, gaveta de painéis e tela cheia)
    // =================================================================

    // Tela de toque (celular/tablet). O visual vem do CSS (pointer: coarse);
    // aqui só fica o que precisa de JavaScript.
    const consultaToque = window.matchMedia("(pointer: coarse)");
    const consultaRetrato = window.matchMedia("(orientation: portrait)");
    const barraPersonagem = document.getElementById("match-toolbar");
    const molduraCanvas = document.querySelector(".canvas-frame");
    const painelGaveta = document.getElementById("match-panels");
    const cabecalhoGaveta = painelGaveta.querySelector(".panels-header");
    const botaoPaineis = document.getElementById("panels-button");

    // No toque, a barra de personagem/velocidade vai para dentro da gaveta
    // (no computador fica acima do mapa, como sempre).
    function organizarLayoutToque() {
        if (consultaToque.matches) {
            cabecalhoGaveta.after(barraPersonagem);
        } else {
            molduraCanvas.before(barraPersonagem);
        }
    }

    // Mudanças de "toque" (ex.: tablet com teclado) e de orientação.
    consultaToque.addEventListener("change", organizarLayoutToque);
    // Girar o aparelho com o dedo no direcional não deixa o boneco andando sozinho.
    consultaRetrato.addEventListener("change", soltarTeclas);

    // --- Gaveta de painéis (adversários, evento, tarefas, opções) ---
    function abrirPaineis(abrir) {
        document.body.classList.toggle("paineis-abertos", abrir);
        botaoPaineis.setAttribute("aria-expanded", String(abrir));
        soltarTeclas();
    }

    botaoPaineis.addEventListener("click", () => {
        abrirPaineis(!document.body.classList.contains("paineis-abertos"));
    });
    document.getElementById("panels-close").addEventListener("click", () => abrirPaineis(false));

    // Resumo numa linha (barra do topo): tarefas e o evento ou aviso do momento.
    // Acompanha o painel de evento e o contador sem mexer na lógica deles.
    const resumoToque = document.getElementById("touch-summary");

    function atualizarResumoToque() {
        const textoTarefas = `TAREFAS ${contadorTarefas.textContent}`;
        const nome = nomeEvento.textContent;
        const normal = nome === "SISTEMA NORMAL";
        resumoToque.textContent = normal ? textoTarefas : `${textoTarefas} • ${nome}: ${mensagemEvento.textContent}`;
        resumoToque.classList.toggle("alerta", !normal);
    }

    const observadorResumo = new MutationObserver(atualizarResumoToque);
    [nomeEvento, mensagemEvento, contadorTarefas].forEach((elemento) => {
        observadorResumo.observe(elemento, { childList: true, characterData: true, subtree: true });
    });

    // --- Direcional (D-pad) ---
    // Funciona como um joystick: a direção sai da posição do dedo em relação
    // ao centro, em 8 setores (inclui diagonais). Ele só "aperta" as setas no
    // mesmo objeto teclasPressionadas do teclado: o movimento é o mesmo.
    const direcional = document.getElementById("dpad");
    let dedoNoDirecional = null;

    function aplicarDirecional(evento) {
        const area = direcional.getBoundingClientRect();
        const dx = evento.clientX - (area.left + area.width / 2);
        const dy = evento.clientY - (area.top + area.height / 2);
        const zonaMorta = area.width * 0.12;

        let cima = false;
        let baixo = false;
        let esquerda = false;
        let direita = false;

        if (Math.hypot(dx, dy) > zonaMorta) {
            // Setor 0 = direita, 2 = baixo, 4/-4 = esquerda, -2 = cima; ímpares = diagonais.
            const setor = Math.round(Math.atan2(dy, dx) / (Math.PI / 4));
            direita = [-1, 0, 1].includes(setor);
            baixo = [1, 2, 3].includes(setor);
            esquerda = [3, 4, -4, -3].includes(setor);
            cima = [-3, -2, -1].includes(setor);
        }

        teclasPressionadas.arrowup = cima;
        teclasPressionadas.arrowdown = baixo;
        teclasPressionadas.arrowleft = esquerda;
        teclasPressionadas.arrowright = direita;

        const pressionados = { cima, baixo, esquerda, direita };
        direcional.querySelectorAll(".dpad-arm").forEach((braco) => {
            braco.classList.toggle("pressionado", pressionados[braco.dataset.direcao]);
        });
    }

    function soltarDirecional(evento) {
        if (evento.pointerId !== dedoNoDirecional) return;
        dedoNoDirecional = null;
        ["arrowup", "arrowdown", "arrowleft", "arrowright"].forEach((tecla) => {
            teclasPressionadas[tecla] = false;
        });
        direcional.querySelectorAll(".dpad-arm").forEach((braco) => braco.classList.remove("pressionado"));
    }

    direcional.addEventListener("pointerdown", (evento) => {
        evento.preventDefault();
        if (dedoNoDirecional !== null) return;
        dedoNoDirecional = evento.pointerId;
        // Captura: o dedo pode escorregar para fora do direcional sem soltar.
        direcional.setPointerCapture(evento.pointerId);
        aplicarDirecional(evento);
    });

    direcional.addEventListener("pointermove", (evento) => {
        if (evento.pointerId === dedoNoDirecional) aplicarDirecional(evento);
    });

    ["pointerup", "pointercancel", "lostpointercapture"].forEach((tipo) => {
        direcional.addEventListener(tipo, soltarDirecional);
    });

    // --- Botão E ---
    const botaoE = document.getElementById("touch-e-button");

    botaoE.addEventListener("pointerdown", (evento) => {
        evento.preventDefault();
        botaoE.classList.add("pressionado");
        interagir();
    });
    ["pointerup", "pointercancel", "pointerleave"].forEach((tipo) => {
        botaoE.addEventListener(tipo, () => botaoE.classList.remove("pressionado"));
    });

    // Toque longo nos controles não abre menu do navegador.
    const controlesToque = document.querySelector(".touch-controls");
    controlesToque.addEventListener("contextmenu", (evento) => evento.preventDefault());

    // Cancela o "clique fantasma": depois do toque o navegador dispara um click
    // no mesmo ponto, que cairia no botão FECHAR do minijogo recém-aberto.
    controlesToque.addEventListener("touchstart", (evento) => evento.preventDefault(), { passive: false });

    // --- Tela cheia (Fullscreen API; o iPhone não tem, então o botão some) ---
    const botoesTelaCheia = document.querySelectorAll(".fullscreen-button");
    const suportaTelaCheia = Boolean(document.fullscreenEnabled || document.webkitFullscreenEnabled);

    function emTelaCheia() {
        return Boolean(document.fullscreenElement || document.webkitFullscreenElement);
    }

    function atualizarBotoesTelaCheia() {
        botoesTelaCheia.forEach((botao) => {
            botao.hidden = !suportaTelaCheia;
            // O botão grande (computador) tem texto; o da barra do celular, só o ícone.
            if (!botao.classList.contains("touch-bar-button")) {
                botao.textContent = emTelaCheia() ? "⛶ SAIR DA TELA CHEIA" : "⛶ TELA CHEIA";
            }
        });
    }

    async function alternarTelaCheia() {
        try {
            if (emTelaCheia()) {
                await (document.exitFullscreen || document.webkitExitFullscreen).call(document);
                return;
            }
            const raiz = document.documentElement;
            await (raiz.requestFullscreen || raiz.webkitRequestFullscreen).call(raiz);
            // No celular, tenta deixar a tela deitada (nem todo navegador permite).
            if (screen.orientation && screen.orientation.lock) {
                screen.orientation.lock("landscape").catch(() => {});
            }
        } catch (erro) {
            console.log("O navegador não permitiu a tela cheia.");
        }
    }

    botoesTelaCheia.forEach((botao) => botao.addEventListener("click", alternarTelaCheia));
    document.addEventListener("fullscreenchange", atualizarBotoesTelaCheia);
    document.addEventListener("webkitfullscreenchange", atualizarBotoesTelaCheia);

    // =================================================================
    // 9. LOOP PRINCIPAL E INICIALIZAÇÃO
    // =================================================================

    let ultimoTempo = 0;

    function executarJogo(tempoAtual) {
        if (!contexto) return;

        const deltaTempo = (tempoAtual - ultimoTempo) / 1000;
        ultimoTempo = tempoAtual;

        if (telas[0] && document.getElementById("play-screen").classList.contains("active")) {
            // Pausado: nada se move, só o desenho continua.
            if (!partida.pausada) {
                atualizarPartida();
                atualizarEvento();
                // A colisão é resolvida dentro do movimento, antes de desenhar.
                atualizarPersonagem(Math.min(deltaTempo, 0.05));
                enviarPosicao(tempoAtual);
            }
            atualizarOutrosJogadores(Math.min(deltaTempo, 0.05));
            desenharFundo();
            // Outros jogadores primeiro: o próprio personagem fica sempre por cima.
            desenharOutrosJogadores();
            desenharPersonagem();
            // Destaque por cima dos bonecos: a marca pode estar sob o personagem.
            desenharDestaqueInteracao();
            desenharNomesOutrosJogadores();
        }

        requestAnimationFrame(executarJogo);
    }

    // Tudo abaixo roda depois que todas as constantes acima já existem.
    aplicarVelocidade();
    if (controleVolume && textoVolume) textoVolume.textContent = `${controleVolume.value}%`;
    atualizarListaTarefas();
    atualizarPainelAdversarios();
    atualizarCronometro();
    atualizarControlesAnfitriao();
    organizarLayoutToque();
    atualizarResumoToque();
    atualizarBotoesTelaCheia();
    conectarServidor();

    if (contexto) {
        desenharFundo();
        desenharPersonagem();
        requestAnimationFrame(executarJogo);
    }

    console.log("Menu principal do Laboratory Chaos carregado com sucesso.");
});
