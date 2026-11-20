// Aguarda o carregamento completo do HTML antes de executar o código.
document.addEventListener("DOMContentLoaded", () => {
    // Procura o elemento que contém o título da tela inicial.
    const titulo = document.querySelector("h1");

    // Confirma no console que o projeto iniciou corretamente.
    if (titulo) {
        console.log(`${titulo.textContent} carregado com sucesso.`);
    }

    // Este arquivo controla a navegação entre as telas do menu principal.
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
    }

    // Faz os botões do menu e os botões "Voltar" funcionarem.
    botoesDeTela.forEach((botao) => {
        botao.addEventListener("click", () => {
            abrirTela(botao.dataset.screen);

            if (botao.dataset.screen === "play-screen" && typeof iniciarPartida === "function") {
                iniciarPartida();
            }
        });
    });

    // Atualiza o texto da configuração de volume enquanto o usuário move o controle.
    const controleVolume = document.getElementById("volume");
    const textoVolume = document.getElementById("volume-value");

    if (controleVolume && textoVolume) {
        controleVolume.addEventListener("input", () => {
            textoVolume.textContent = `${controleVolume.value}%`;
        });
    }

    // Sistema simples de personagens e movimentação na tela de teste.
    const canvas = document.getElementById("game-canvas");
    const contexto = canvas ? canvas.getContext("2d") : null;
    const seletorPersonagem = document.getElementById("character-select");
    const controleVelocidade = document.getElementById("speed-control");

    // Cinco personagens 16 por 16 pixels com cores e estilos diferentes.
    const personagens = [
        { nome: "Azul", roupa: "#62c9df", detalhe: "#2c5c88", cabelo: "#25304d" },
        { nome: "Rosa", roupa: "#ed87b8", detalhe: "#b54f82", cabelo: "#f4d35e" },
        { nome: "Roxo", roupa: "#8b66b5", detalhe: "#59447d", cabelo: "#bbc1d1" },
        { nome: "Amarelo", roupa: "#f4d35e", detalhe: "#b58b35", cabelo: "#6d4c41" },
        { nome: "Cinza", roupa: "#bbc1d1", detalhe: "#747b91", cabelo: "#353a50" }
    ];

    // Posição onde o personagem começa cada partida.
    const posicaoInicial = { x: 376, y: 288 };

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
        const tecla = evento.key.toLowerCase();
        const teclasMovimento = ["w", "a", "s", "d", "arrowup", "arrowleft", "arrowdown", "arrowright"];

        if (teclasMovimento.includes(tecla)) {
            evento.preventDefault();
            teclasPressionadas[tecla] = true;
        }

        if (tecla === "e" && modalTarefa && modalTarefa.hidden && !partida.pausada) {
            verificarInteracaoTarefa();
        }
    });

    window.addEventListener("keyup", (evento) => {
        teclasPressionadas[evento.key.toLowerCase()] = false;
    });

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

    function tocarAlarme() {
        try {
            const audioContexto = new (window.AudioContext || window.webkitAudioContext)();
            const oscilador = audioContexto.createOscillator();
            const ganho = audioContexto.createGain();

            oscilador.type = "square";
            oscilador.frequency.value = 660;
            ganho.gain.value = 0.05;

            oscilador.connect(ganho);
            ganho.connect(audioContexto.destination);
            oscilador.start();

            window.setTimeout(() => {
                oscilador.stop();
                audioContexto.close();
            }, configuracaoEventos.intervaloAlarme);
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
            ativar: (duracao) => {
                estadoEvento.ativo = "portas";
                estadoEvento.portasOriginalmenteTravadas = [];

                const portasParaTravar = portas.filter((porta) => porta.aberta).slice(0, 2);
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

    function iniciarEvento(duracao) {
        if (estadoEvento.ativo) return;

        const indice = Math.floor(Math.random() * eventosAleatorios.length);
        const eventoEscolhido = eventosAleatorios[indice];

        estadoEvento.nome = eventoEscolhido.nome;
        estadoEvento.mensagem = eventoEscolhido.mensagem;

        const duracaoEvento = duracao || configuracaoEventos.duracoes[eventoEscolhido.id] ||
            configuracaoEventos.duracaoPadrao;
        eventoEscolhido.ativar(duracaoEvento);

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

        if (restante <= 0) {
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
            if (document.getElementById("play-screen").classList.contains("active") && !partida.pausada) {
                iniciarEvento(configuracaoEventos.duracaoPadrao);
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

    // Sistema das seis tarefas da partida.
    const tarefas = [
        { id: "computador", nome: "Reiniciar o computador", categoria: "FÁCIL", concluida: false, progresso: 0, total: 3, x: 176, y: 64 },
        { id: "frascos", nome: "Organizar os frascos", categoria: "FÁCIL", concluida: false, progresso: 0, total: 3, x: 360, y: 256 },
        { id: "energia", nome: "Restaurar a energia", categoria: "MÉDIA", concluida: false, progresso: 0, total: 3, x: 72, y: 344 },
        { id: "portas", nome: "Desbloquear as portas", categoria: "MÉDIA", concluida: false, progresso: 0, total: 3, x: 624, y: 72 },
        { id: "reator", nome: "Estabilizar o reator", categoria: "DIFÍCIL", concluida: false, progresso: 0, total: 4, x: 640, y: 352 },
        { id: "protocolo", nome: "Ativar o protocolo", categoria: "DIFÍCIL", concluida: false, progresso: 0, total: 3, x: 400, y: 288 }
    ];

    const objetosColetaveis = {
        frascos: [
            { x: 96, y: 144, coletado: false },
            { x: 336, y: 360, coletado: false },
            { x: 620, y: 112, coletado: false }
        ],
        cartoes: [
            { x: 80, y: 336, coletado: false },
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

    function concluirTarefa(tarefa) {
        tarefa.concluida = true;
        tarefa.progresso = tarefa.total;
        feedbackTarefa.textContent = "Tarefa concluída!";
        atualizarListaTarefas();
        verificarResultado();
    }

    function erroTarefa() {
        feedbackTarefa.textContent = "Erro! Observe a ordem e tente novamente.";
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

    // Confere colisão com paredes, obstáculos e portas fechadas.
    function checarColisao() {
        // Verifica se o personagem toca qualquer área sólida.
        function estaSobreposto(retangulo) {
            return (
                personagem.x < retangulo.x + retangulo.largura &&
                personagem.x + personagem.tamanho > retangulo.x &&
                personagem.y < retangulo.y + retangulo.altura &&
                personagem.y + personagem.tamanho > retangulo.y
            );
        }

        // Para verificar qualquer colisão no mapa.
        const paredeColidida = paredes.some(estaSobreposto);
        const obstaculoColidido = obstaculos.some(estaSobreposto);

        // O gás ativo funciona como uma área temporariamente bloqueada.
        const gasColidido = estadoEvento.ativo === "gas" &&
            estadoEvento.gas && estaSobreposto(estadoEvento.gas);

        const portaFechada = portas.find((porta) => {
            return !porta.aberta && estaSobreposto(porta);
        });

        // Se houver colisão, a posição anterior é recuperada.
        if (paredeColidida || obstaculoColidido || gasColidido || portaFechada) {
            personagem.x = personagem.posicaoAnteriorX;
            personagem.y = personagem.posicaoAnteriorY;
        }

        return !paredeColidida && !obstaculoColidido && !gasColidido && !portaFechada;
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

    // Desenha um personagem em uma grade lógica de 16 por 16 pixels.
    function desenharPersonagem() {
        const dados = personagens[personagem.personagemAtual];
        const escala = personagem.tamanho / 16;

        contexto.save();

        // Virar o desenho horizontalmente muda a direção esquerda/direita.
        if (personagem.direcao === "esquerda") {
            contexto.translate(personagem.x + personagem.tamanho, personagem.y);
            contexto.scale(-1, 1);
        } else {
            contexto.translate(personagem.x, personagem.y);
        }

        // Tremor vertical de 1 pixel durante os passos.
        const salto = personagem.andando && personagem.quadroAnimacao === 1 ? escala : 0;

        // Sombra simples.
        contexto.fillStyle = "#202640";
        contexto.fillRect(3 * escala, 14 * escala + salto, 10 * escala, 2 * escala);

        // Pernas.
        contexto.fillStyle = "#30364f";
        const passoEsquerdo = personagem.andando && personagem.quadroAnimacao === 1 ? 1 : 0;
        const passoDireito = personagem.andando && personagem.quadroAnimacao === 0 ? 1 : 0;
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
        if (personagem.direcao === "cima") {
            contexto.fillRect(6 * escala, 4 * escala, 1 * escala, 1 * escala);
        } else {
            contexto.fillRect(10 * escala, 5 * escala, 1 * escala, 1 * escala);
        }

        contexto.restore();
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

            personagem.x += horizontal * personagem.velocidade * deltaTempo;
            personagem.y += vertical * personagem.velocidade * deltaTempo;

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
                atualizarPersonagem(Math.min(deltaTempo, 0.05));
                // Resolve a colisão antes de desenhar, para não haver quadro sobreposto.
                checarColisao();
            }
            desenharFundo();
            desenharPersonagem();
        }

        requestAnimationFrame(executarJogo);
    }

    if (contexto) {
        desenharFundo();
        desenharPersonagem();
        requestAnimationFrame(executarJogo);
    }

    console.log("Menu principal do Laboratory Chaos carregado com sucesso.");

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
                erroTarefa();
            }
            barraProgresso(tarefa);
        });
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
                erroTarefa();
            }
            barraProgresso(tarefa);
        });
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
                erroTarefa();
            }
            barraProgresso(tarefa);
        });
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
                if (passo === tarefa.total) {
                    concluirTarefa(tarefa);
                    portas.forEach((porta) => porta.aberta = true);
                }
            } else {
                erroTarefa();
            }
            barraProgresso(tarefa);
        });
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
                erroTarefa();
            }
            barraProgresso(tarefa);
        });
        barraProgresso(tarefa);
    }

    function interfaceProtocolo(tarefa) {
        instrucoesTarefa.textContent = "Colete os três cartões espalhados pelo laboratório e confirme o protocolo no painel central.";
        tarefa.progresso = objetosColetaveis.cartoes.filter((cartao) => cartao.coletado).length;

        const botaoConfirmar = document.createElement("button");
        botaoConfirmar.type = "button";
        botaoConfirmar.className = "task-option";
        botaoConfirmar.textContent = "CONFIRMAR";

        botaoConfirmar.addEventListener("click", () => {
            if (tarefa.concluida) return;
            tarefa.progresso = objetosColetaveis.cartoes.filter((cartao) => cartao.coletado).length;

            if (tarefa.progresso === tarefa.total) {
                concluirTarefa(tarefa);
            } else {
                erroTarefa();
                feedbackTarefa.textContent = `Faltam ${tarefa.total - tarefa.progresso} cartões de acesso.`;
            }
            barraProgresso(tarefa);
        });

        conteudoTarefa.appendChild(botaoConfirmar);
        barraProgresso(tarefa);
    }

    function abrirTarefa(tarefa) {
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

    atualizarListaTarefas();

    function verificarInteracaoTarefa() {
        // Distâncias medidas a partir do centro do personagem.
        // Os raios cresceram 15px porque meio corpo (24px) agora entra na conta.
        const centroX = personagem.x + personagem.tamanho / 2;
        const centroY = personagem.y + personagem.tamanho / 2;
        const raioTarefa = 100;
        const raioColeta = 70;

        // Escolhe a tarefa mais próxima dentro do raio.
        let tarefaEncontrada = null;
        let menorDistancia = raioTarefa;

        for (const tarefa of tarefas) {
            const distancia = Math.hypot(centroX - tarefa.x, centroY - tarefa.y);

            if (distancia < menorDistancia) {
                menorDistancia = distancia;
                tarefaEncontrada = tarefa;
            }
        }

        if (tarefaEncontrada) {
            abrirTarefa(tarefaEncontrada);
            return;
        }

        // Frascos podem ser coletados aproximando-se deles.
        for (const frasco of objetosColetaveis.frascos) {
            if (!frasco.coletado) {
                const distancia = Math.hypot(centroX - frasco.x, centroY - frasco.y);
                if (distancia < raioColeta) {
                    frasco.coletado = true;
                    const frascosColetados = objetosColetaveis.frascos.filter((item) => item.coletado).length;
                    mostrarAviso(`Frasco coletado (${frascosColetados}/3).`);
                    return;
                }
            }
        }

        // Cartões de acesso são coletados da mesma forma.
        for (const cartao of objetosColetaveis.cartoes) {
            if (!cartao.coletado) {
                const distancia = Math.hypot(centroX - cartao.x, centroY - cartao.y);
                if (distancia < raioColeta) {
                    cartao.coletado = true;
                    const encontrados = objetosColetaveis.cartoes.filter((item) => item.coletado).length;
                    mostrarAviso(`Cartão coletado (${encontrados}/3).`);
                    return;
                }
            }
        }

        mostrarAviso("Aproxime-se de um objeto ou tarefa e pressione E.");
    }

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

    const adversarios = [
        { nome: "Estudante Rosa", progresso: 1, ativo: true },
        { nome: "Estudante Roxo", progresso: 2, ativo: true },
        { nome: "Estudante Cinza", progresso: 1, ativo: true }
    ];

    const relogioPartida = document.getElementById("match-clock");
    const painelAdversarios = document.getElementById("opponents-panel");
    const jogadoresAtivos = document.getElementById("active-players");
    const nomeJogador = document.getElementById("player-name");
    const pauseOverlay = document.getElementById("pause-overlay");
    const resultOverlay = document.getElementById("result-overlay");
    const pauseButton = document.getElementById("pause-button");

    if (seletorPersonagem) {
        seletorPersonagem.addEventListener("change", () => {
            const nomes = ["Estudante Azul", "Estudante Rosa", "Estudante Roxo", "Estudante Amarelo", "Estudante Cinza"];
            const elementoNome = document.getElementById("player-name");
            if (elementoNome) elementoNome.textContent = nomes[Number(seletorPersonagem.value)];
            personagem.personagemAtual = Number(seletorPersonagem.value);
        });
    }

    function atualizarPainelAdversarios() {
        painelAdversarios.innerHTML = "";
        let ativos = partida.jogadorAtivo ? 1 : 0;

        adversarios.forEach((adversario) => {
            if (adversario.ativo) ativos += 1;

            const item = document.createElement("div");
            item.className = `opponent${adversario.ativo ? "" : " eliminated"}`;
            item.textContent = `${adversario.nome}: ${adversario.ativo ? `${adversario.progresso}/6` : "ELIMINADO"}`;
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

        document.getElementById("result-title").textContent = vitoria ? "VITÓRIA" : "DERROTA";
        document.getElementById("result-message").textContent = motivo;
        resultOverlay.hidden = false;
    }

    function verificarResultado() {
        if (partida.encerrada) return;

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

        if (partida.jogadorAtivo && adversariosAtivos.length === 0) {
            finalizarPartida(true, "Você é o último estudante ativo da partida!");
            return;
        }

        // Hoje nada torna jogadorAtivo falso. Esta verificação fica pronta para o
        // multiplayer: quando o jogador se desconectar, o servidor marcará false.
        if (!partida.jogadorAtivo) {
            finalizarPartida(false, "Você foi eliminado abstratamente da partida.");
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

    function iniciarPartida() {
        // Encerra o evento ativo primeiro (ele pode ter travado portas).
        finalizarEvento();

        partida.tempoRestante = partida.duracaoInicial;
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

        adversarios.forEach((adversario, indice) => {
            adversario.ativo = true;
            adversario.progresso = indice === 1 ? 2 : 1;
        });

        // Recomeça a contagem do próximo evento (cancela o timer antigo).
        agendarProximoEvento();

        atualizarCronometro();
        atualizarListaTarefas();
        atualizarPainelAdversarios();
    }

    function pausarPartida() {
        if (partida.encerrada || partida.pausada) return;

        partida.pausada = true;
        pausarEventos();
        pauseOverlay.hidden = false;
    }

    function continuarPartida() {
        if (partida.encerrada || !partida.pausada) return;

        partida.pausada = false;
        partida.ultimaAtualizacao = Date.now();
        retomarEventos();
        pauseOverlay.hidden = true;
    }

    function atualizarPartida() {
        if (!partida.iniciou || partida.pausada || partida.encerrada) return;

        const agora = Date.now();
        if (agora - partida.ultimaAtualizacao >= 1000) {
            const segundosPassados = Math.floor((agora - partida.ultimaAtualizacao) / 1000);
            partida.tempoRestante -= segundosPassados;
            partida.ultimaAtualizacao += segundosPassados * 1000;

            partida.tempoRestante = Math.max(0, partida.tempoRestante);
            atualizarCronometro();

            // Simulação abstrata: adversários avançam ou podem ser eliminados.
            if (Math.random() < 0.12) {
                const adversarioElegivel = adversarios.find((adversario) => adversario.ativo);
                if (adversarioElegivel) {
                    // Chegar a 6/6 é tratado em verificarResultado() como vitória do adversário.
                    adversarioElegivel.progresso = Math.min(6, adversarioElegivel.progresso + 1);
                }
                atualizarPainelAdversarios();
            }

            verificarResultado();
        }

        // Eliminação abstrata de um adversário em intervalos aleatórios.
        if (partida.tempoRestante > 0 && Math.random() < 0.006) {
            const ativo = adversarios.filter((adversario) => adversario.ativo);
            if (ativo.length > 0) {
                ativo[Math.floor(Math.random() * ativo.length)].ativo = false;
                atualizarPainelAdversarios();
            }
        }

        verificarResultado();
    }

    pauseButton.addEventListener("click", pausarPartida);
    document.getElementById("resume-button").addEventListener("click", continuarPartida);

    document.getElementById("pause-menu-button").addEventListener("click", () => {
        pauseOverlay.hidden = true;
        abrirTela("menu-screen");
    });

    document.getElementById("restart-button").addEventListener("click", iniciarPartida);

    document.getElementById("result-menu-button").addEventListener("click", () => {
        resultOverlay.hidden = true;
        abrirTela("menu-screen");
    });

    atualizarPainelAdversarios();
    atualizarCronometro();

    // Camada demonstrativa de salas: os dados ficam somente em memória.
    // Pode ser substituída por HTTP ou WebSocket no futuro.
    const salasLocais = {
        criada: null,
        listarPublicas() {
            return [
                { id: "LAB101", nome: "Laboratório Azul", publica: true, jogadores: 3, capacidade: 5, anfitriao: "Estudante Azul", personagemAnfitriao: "Azul" },
                { id: "LAB204", nome: "Experimento Rosa", publica: true, jogadores: 4, capacidade: 5, anfitriao: "Estudante Rosa", personagemAnfitriao: "Rosa" },
                { id: "LAB333", nome: "Caos do Reator", publica: true, jogadores: 3, capacidade: 5, anfitriao: "Estudante Roxo", personagemAnfitriao: "Roxo" }
            ];
        },
        gerarCodigo() {
            const letras = "ABCDEFGHJKLMNPQRSTUVWXYZ";
            let codigo = "LAB";
            for (let indice = 0; indice < 3; indice += 1) {
                codigo += letras[Math.floor(Math.random() * letras.length)];
            }
            return codigo;
        },
        criar(nome, publica) {
            this.criada = {
                id: this.gerarCodigo(),
                nome,
                publica,
                capacidade: 5,
                jogadores: [
                    { nome: "Estudante Azul", personagem: "Azul", anfitriao: true },
                    { nome: "Estudante Rosa", personagem: "Rosa", anfitriao: false },
                    { nome: "Estudante Roxo", personagem: "Roxo", anfitriao: false }
                ]
            };
            return this.criada;
        },
        buscarPorCodigo(codigo) {
            const codigoNormalizado = codigo.trim().toUpperCase();
            if (this.criada && this.criada.id === codigoNormalizado) return this.criada;
            return this.listarPublicas().find((sala) => sala.id === codigoNormalizado) || null;
        },
        entrar(sala) {
            if (!sala) return false;
            if (Array.isArray(sala.jogadores)) {
                this.criada = sala;
                return true;
            }
            if (sala.jogadores >= sala.capacidade) return false;

            this.criada = {
                id: sala.id,
                nome: sala.nome,
                publica: true,
                capacidade: sala.capacidade,
                jogadores: [
                    { nome: sala.anfitriao, personagem: sala.personagemAnfitriao, anfitriao: true },
                    { nome: "Estudante Azul", personagem: "Azul", anfitriao: false },
                    { nome: "Estudante Amarelo", personagem: "Amarelo", anfitriao: false }
                ]
            };
            return true;
        }
    };

    const criarSalaPublica = document.getElementById("create-public-room");
    const criarSalaPrivada = document.getElementById("create-private-room");
    const entrarSalaBotao = document.getElementById("join-room-button");
    const codigoSalaInput = document.getElementById("room-code-input");
    const feedbackSala = document.getElementById("room-feedback");
    const listaSalasPublicas = document.getElementById("public-room-list");
    const lobby = document.getElementById("room-lobby");

    function corDoPersonagem(nome) {
        const cores = { Azul: "#62c9df", Rosa: "#ed87b8", Roxo: "#8b66b5", Amarelo: "#f4d35e", Cinza: "#bbc1d1" };
        return cores[nome] || "#bbc1d1";
    }

    function exibirLobby(sala) {
        lobby.hidden = false;
        document.getElementById("lobby-room-name").textContent = sala.nome;
        document.getElementById("lobby-room-code").textContent = sala.id;
        document.getElementById("lobby-room-type").textContent = sala.publica
            ? "Sala pública • 3 a 5 jogadores"
            : "Sala privada • 3 a 5 jogadores";

        const listaJogadores = document.getElementById("lobby-player-list");
        listaJogadores.innerHTML = "";

        sala.jogadores.forEach((jogador) => {
            const cartao = document.createElement("div");
            cartao.className = `lobby-player${jogador.anfitriao ? " host" : ""}`;

            const avatar = document.createElement("div");
            avatar.className = "player-avatar";
            avatar.style.background = corDoPersonagem(jogador.personagem);

            const nome = document.createElement("strong");
            nome.textContent = jogador.nome;

            const descricao = document.createElement("span");
            descricao.textContent = jogador.anfitriao ? "ANFITRIÃO" : jogador.personagem;

            cartao.append(avatar, nome, descricao);
            listaJogadores.appendChild(cartao);
        });
        feedbackSala.textContent = "Sala local aberta.";
    }

    function atualizarSalasPublicas() {
        listaSalasPublicas.innerHTML = "";

        salasLocais.listarPublicas().forEach((sala) => {
            const linha = document.createElement("div");
            linha.className = "public-room";

            const nome = document.createElement("strong");
            nome.textContent = sala.nome;

            const quantidade = document.createElement("span");
            quantidade.textContent = `${sala.jogadores}/${sala.capacidade} jogadores`;

            const botao = document.createElement("button");
            botao.type = "button";
            botao.className = "back-button";
            botao.textContent = "ENTRAR";
            botao.addEventListener("click", () => {
                if (salasLocais.entrar(sala)) exibirLobby(salasLocais.criada);
            });

            linha.append(nome, quantidade, botao);
            listaSalasPublicas.appendChild(linha);
        });
    }

    criarSalaPublica.addEventListener("click", () => exibirLobby(salasLocais.criar("Laboratório Público", true)));
    criarSalaPrivada.addEventListener("click", () => exibirLobby(salasLocais.criar("Laboratório Privado", false)));

    entrarSalaBotao.addEventListener("click", () => {
        const sala = salasLocais.buscarPorCodigo(codigoSalaInput.value);
        if (!sala) {
            feedbackSala.textContent = "Sala não encontrada nesta simulação local.";
            return;
        }
        if (salasLocais.entrar(sala)) exibirLobby(salasLocais.criada);
    });

    document.getElementById("leave-room-button").addEventListener("click", () => {
        lobby.hidden = true;
        salasLocais.criada = null;
        feedbackSala.textContent = "Você saiu da sala local.";
    });

    document.getElementById("start-local-match").addEventListener("click", () => {
        abrirTela("play-screen");
        if (typeof iniciarPartida === "function") iniciarPartida();
    });

    atualizarSalasPublicas();
});
