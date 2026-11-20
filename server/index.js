// =====================================================================
// LABORATORY CHAOS — servidor multiplayer (Express + Socket.IO)
//
// Sem banco de dados: salas e partidas ficam só na memória.
// O servidor é autoritativo: controla salas, anfitrião, cronômetro,
// eventos, validação das tarefas e o resultado final.
//
// Seções:
//   1. Configuração
//   2. Regras
//   3. Salas
//   4. Partida
//   5. Eventos
//   6. Resultado
//   7. Conexões
// =====================================================================

// =================================================================
// 1. CONFIGURAÇÃO
// =================================================================

const os = require("os");
const path = require("path");
const http = require("http");
const express = require("express");
const { Server } = require("socket.io");

const PORTA = process.env.PORT || 3000;

// Sites que podem se conectar ao Socket.IO (CORS), separados por vírgula.
// Padrão: o GitHub Pages do jogo e servidores locais comuns (ex.: Live Server).
const ORIGENS_PADRAO = [
    "https://professoralissonlucas.github.io",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5500",
    "http://127.0.0.1:5500"
];
const ORIGENS_PERMITIDAS = process.env.ORIGENS_PERMITIDAS
    ? process.env.ORIGENS_PERMITIDAS.split(",").map((origem) => origem.trim()).filter(Boolean)
    : ORIGENS_PADRAO;

const app = express();
const servidor = http.createServer(app);
const io = new Server(servidor, {
    cors: { origin: ORIGENS_PERMITIDAS }
});

// Modo local (rede da escola sem internet): o Express também serve o jogo,
// que fica na pasta raiz do projeto (um nível acima de server/).
const PASTA_DO_JOGO = path.join(__dirname, "..");

// Não expõe o código do servidor nem node_modules pela web.
app.use("/server", (req, res) => res.sendStatus(404));
// dotfiles "ignore": esconde .git, .gitignore etc. (o padrão do Express
// ainda entregaria arquivos dentro de pastas como .git/).
app.use(express.static(PASTA_DO_JOGO, { dotfiles: "ignore" }));

// Lista os IPs desta máquina na rede local (para os colegas acessarem).
function ipsDaRedeLocal() {
    const ips = [];
    Object.values(os.networkInterfaces()).forEach((interfaces) => {
        (interfaces || []).forEach((item) => {
            if (item.family === "IPv4" && !item.internal) ips.push(item.address);
        });
    });
    return ips;
}

// =================================================================
// 2. REGRAS (manter igual ao script.js da raiz)
// =================================================================

const REGRAS = {
    minimoJogadores: 3,
    maximoJogadores: 5,
    duracaoPartida: 300,
    tarefas: ["computador", "frascos", "energia", "portas", "reator", "protocolo"],
    totalColetaveis: 3,
    intervaloMinimo: 18000,
    intervaloMaximo: 30000,
    duracoesEventos: { apagao: 8000, gas: 10000, portas: 12000, alarme: 8000 },
    duracaoTeste: 8000,
    // Índices das portas travadas pelo evento: Computadores e Energia.
    portasTravadas: [0, 1],
    // Limites da posição (canvas 800x480 menos o desenho de 48px).
    posicaoMaximaX: 752,
    posicaoMaximaY: 432,
    direcoes: ["cima", "baixo", "esquerda", "direita"],
    // Intervalo mínimo entre posições de um jogador (~15 por segundo, com folga).
    intervaloPosicaoMs: 40,
    nomesPersonagens: ["Azul", "Rosa", "Roxo", "Amarelo", "Cinza"]
};

// =================================================================
// 3. SALAS
// =================================================================

// Todas as salas abertas, indexadas pelo código (ex.: "LABXYZ").
const salas = new Map();

// Gera um código "LAB" + 3 letras que ainda não esteja em uso.
function gerarCodigo() {
    const letras = "ABCDEFGHJKLMNPQRSTUVWXYZ";
    let codigo;
    do {
        codigo = "LAB";
        for (let indice = 0; indice < 3; indice += 1) {
            codigo += letras[Math.floor(Math.random() * letras.length)];
        }
    } while (salas.has(codigo));
    return codigo;
}

// Dados da sala que podem ser enviados aos clientes.
function resumoSala(sala) {
    return {
        codigo: sala.codigo,
        nome: sala.nome,
        publica: sala.publica,
        anfitriaoId: sala.anfitriaoId,
        estado: sala.estado,
        capacidade: REGRAS.maximoJogadores,
        minimo: REGRAS.minimoJogadores,
        jogadores: [...sala.jogadores.values()].map((jogador) => ({
            id: jogador.id,
            nome: jogador.nome,
            personagem: jogador.personagem,
            ativo: jogador.ativo,
            tarefasConcluidas: jogador.tarefas.size
        }))
    };
}

function enviarSala(sala) {
    io.to(sala.codigo).emit("sala:atualizada", resumoSala(sala));
}

// Salas públicas que ainda aceitam jogadores.
function listarPublicas() {
    return [...salas.values()]
        .filter((sala) => sala.publica && sala.estado === "lobby" && sala.jogadores.size < REGRAS.maximoJogadores)
        .map((sala) => ({
            codigo: sala.codigo,
            nome: sala.nome,
            jogadores: sala.jogadores.size,
            capacidade: REGRAS.maximoJogadores
        }));
}

function enviarPublicas() {
    io.emit("salas:publicas", listarPublicas());
}

// Primeiro personagem (0 a 4) que ninguém da sala está usando.
function personagemLivre(sala) {
    const usados = [...sala.jogadores.values()].map((jogador) => jogador.personagem);
    return [0, 1, 2, 3, 4].find((indice) => !usados.includes(indice));
}

function nomeDoPersonagem(indice) {
    return `Estudante ${REGRAS.nomesPersonagens[indice]}`;
}

function adicionarJogador(sala, socket) {
    const personagem = personagemLivre(sala);
    sala.jogadores.set(socket.id, {
        id: socket.id,
        nome: nomeDoPersonagem(personagem),
        personagem,
        ativo: true,
        tarefas: new Set(),
        frascos: new Set(),
        cartoes: new Set()
    });
    socket.join(sala.codigo);
    socket.data.sala = sala.codigo;
}

// Remove o jogador da sala. Durante a partida ele só fica inativo.
function sairDaSala(socket) {
    const sala = salas.get(socket.data.sala);
    socket.data.sala = null;
    if (!sala) return;

    socket.leave(sala.codigo);
    const jogador = sala.jogadores.get(socket.id);
    if (!jogador) return;

    if (sala.estado === "jogando") {
        jogador.ativo = false;
    } else {
        sala.jogadores.delete(socket.id);
    }

    // Se o anfitrião saiu, o próximo jogador ativo (ordem de entrada) assume.
    if (sala.anfitriaoId === socket.id) {
        const proximo = [...sala.jogadores.values()].find((item) => item.ativo);
        sala.anfitriaoId = proximo ? proximo.id : null;
    }

    const restantesAtivos = [...sala.jogadores.values()].filter((item) => item.ativo);
    if (restantesAtivos.length === 0) {
        apagarSala(sala);
        return;
    }

    io.to(sala.codigo).emit("jogador:saiu", { jogadorId: socket.id, novoAnfitriaoId: sala.anfitriaoId });
    enviarSala(sala);
    verificarResultado(sala);
    enviarPublicas();
}

function apagarSala(sala) {
    if (sala.partida) clearInterval(sala.partida.timer);
    salas.delete(sala.codigo);
    enviarPublicas();
}

// =================================================================
// 4. PARTIDA
// =================================================================

function sortearIntervalo() {
    return REGRAS.intervaloMinimo + Math.random() * (REGRAS.intervaloMaximo - REGRAS.intervaloMinimo);
}

function iniciarPartida(sala) {
    sala.estado = "jogando";

    // Cada jogador começa do zero: tarefas e coletáveis são individuais.
    sala.jogadores.forEach((jogador) => {
        jogador.ativo = true;
        jogador.tarefas = new Set();
        jogador.frascos = new Set();
        jogador.cartoes = new Set();
    });

    sala.partida = {
        tempoRestante: REGRAS.duracaoPartida,
        pausada: false,
        evento: null,
        proximoEventoMs: sortearIntervalo(),
        timer: setInterval(() => passarSegundo(sala), 1000)
    };

    io.to(sala.codigo).emit("partida:iniciada", {
        tempoRestante: sala.partida.tempoRestante,
        jogadores: resumoSala(sala).jogadores
    });
    enviarSala(sala);
    enviarPublicas();
}

// Relógio da sala: roda a cada 1s. Pausado, nada é descontado.
function passarSegundo(sala) {
    const partida = sala.partida;
    if (!partida) return;

    if (!partida.pausada) {
        partida.tempoRestante = Math.max(0, partida.tempoRestante - 1);

        if (partida.evento) {
            partida.evento.restanteMs -= 1000;
            if (partida.evento.restanteMs <= 0) finalizarEvento(sala);
        } else {
            partida.proximoEventoMs -= 1000;
            if (partida.proximoEventoMs <= 0) iniciarEvento(sala);
        }
    }

    io.to(sala.codigo).emit("partida:estado", {
        tempoRestante: partida.tempoRestante,
        pausada: partida.pausada,
        evento: partida.evento ? { id: partida.evento.id, restanteMs: partida.evento.restanteMs } : null
    });

    verificarResultado(sala);
}

// Confere se a tarefa pode ser aceita. Devolve o motivo da recusa ou null.
function motivoRecusa(sala, jogador, tarefaId) {
    if (sala.estado !== "jogando") return "A partida não está em andamento.";
    if (sala.partida.pausada) return "A partida está pausada.";
    if (!jogador.ativo) return "Você não está mais na partida.";
    if (!REGRAS.tarefas.includes(tarefaId)) return "Tarefa desconhecida.";
    if (jogador.tarefas.has(tarefaId)) return "Tarefa já concluída.";
    if (tarefaId === "frascos" && jogador.frascos.size < REGRAS.totalColetaveis) return "Colete os 3 frascos primeiro.";
    if (tarefaId === "protocolo" && jogador.cartoes.size < REGRAS.totalColetaveis) return "Colete os 3 cartões primeiro.";
    return null;
}

// =================================================================
// 5. EVENTOS (valem para a sala inteira)
// =================================================================

function iniciarEvento(sala, duracaoForcada) {
    const ids = Object.keys(REGRAS.duracoesEventos);
    const id = ids[Math.floor(Math.random() * ids.length)];
    const duracao = duracaoForcada || REGRAS.duracoesEventos[id];

    sala.partida.evento = {
        id,
        restanteMs: duracao,
        portas: id === "portas" ? REGRAS.portasTravadas : []
    };

    io.to(sala.codigo).emit("evento:iniciado", { id, duracaoMs: duracao, portas: sala.partida.evento.portas });
}

function finalizarEvento(sala) {
    const evento = sala.partida.evento;
    if (!evento) return;

    io.to(sala.codigo).emit("evento:finalizado", { id: evento.id });
    sala.partida.evento = null;
    sala.partida.proximoEventoMs = sortearIntervalo();
}

// =================================================================
// 6. RESULTADO (mesmas regras do verificarResultado() do modo solo)
// =================================================================

function verificarResultado(sala) {
    if (sala.estado !== "jogando" || !sala.partida) return;

    const ativos = [...sala.jogadores.values()].filter((jogador) => jogador.ativo);

    // Quem concluir as seis tarefas primeiro vence.
    const completo = ativos.find((jogador) => jogador.tarefas.size === REGRAS.tarefas.length);
    if (completo) {
        finalizarPartida(sala, completo, "tarefas");
        return;
    }

    // Se sobrar um único jogador ativo, ele vence.
    if (ativos.length === 1) {
        finalizarPartida(sala, ativos[0], "ultimo");
        return;
    }

    // Fim do tempo: vence quem tiver mais tarefas; empate no topo = ninguém vence.
    if (sala.partida.tempoRestante <= 0) {
        const maior = Math.max(...ativos.map((jogador) => jogador.tarefas.size));
        const lideres = ativos.filter((jogador) => jogador.tarefas.size === maior);

        if (lideres.length === 1) {
            finalizarPartida(sala, lideres[0], "tempo");
        } else {
            finalizarPartida(sala, null, "empate");
        }
    }
}

// Envia o mesmo resultado para todos e devolve a sala ao lobby.
function finalizarPartida(sala, vencedor, tipo) {
    clearInterval(sala.partida.timer);
    sala.partida = null;
    sala.estado = "lobby";

    io.to(sala.codigo).emit("partida:fim", {
        vencedorId: vencedor ? vencedor.id : null,
        vencedorNome: vencedor ? vencedor.nome : null,
        tipo
    });

    // Quem saiu durante a partida deixa a sala de vez.
    sala.jogadores.forEach((jogador, id) => {
        if (!jogador.ativo) sala.jogadores.delete(id);
    });

    enviarSala(sala);
    enviarPublicas();
}

// =================================================================
// 7. CONEXÕES
// =================================================================

io.on("connection", (socket) => {
    socket.data.sala = null;
    socket.emit("salas:publicas", listarPublicas());

    // Atalho para pegar a sala e o jogador deste socket.
    function minhaSala() {
        return salas.get(socket.data.sala) || null;
    }

    function souAnfitriao(sala) {
        return sala && sala.anfitriaoId === socket.id;
    }

    // Garante que a resposta (ack) seja uma função.
    function responder(ack, dados) {
        if (typeof ack === "function") ack(dados);
    }

    socket.on("sala:criar", (dados, ack) => {
        if (socket.data.sala) sairDaSala(socket);

        const publica = Boolean(dados && dados.publica);
        const nome = String((dados && dados.nome) || (publica ? "Laboratório Público" : "Laboratório Privado")).slice(0, 30);
        const sala = {
            codigo: gerarCodigo(),
            nome,
            publica,
            anfitriaoId: socket.id,
            estado: "lobby",
            jogadores: new Map(),
            partida: null
        };

        salas.set(sala.codigo, sala);
        adicionarJogador(sala, socket);
        responder(ack, { ok: true, sala: resumoSala(sala) });
        enviarSala(sala);
        enviarPublicas();
    });

    socket.on("sala:entrar", (dados, ack) => {
        const codigo = String((dados && dados.codigo) || "").trim().toUpperCase();
        const sala = salas.get(codigo);

        if (!sala) return responder(ack, { ok: false, erro: "Sala não encontrada." });
        if (sala.jogadores.has(socket.id)) return responder(ack, { ok: true, sala: resumoSala(sala) });
        if (sala.estado !== "lobby") return responder(ack, { ok: false, erro: "A partida desta sala já começou." });
        if (sala.jogadores.size >= REGRAS.maximoJogadores) return responder(ack, { ok: false, erro: "Sala cheia (máximo de 5)." });

        if (socket.data.sala) sairDaSala(socket);
        adicionarJogador(sala, socket);
        responder(ack, { ok: true, sala: resumoSala(sala) });
        enviarSala(sala);
        enviarPublicas();
    });

    socket.on("sala:sair", () => {
        sairDaSala(socket);
    });

    socket.on("sala:personagem", (dados, ack) => {
        const sala = minhaSala();
        const personagem = Number(dados && dados.personagem);
        if (!sala || sala.estado !== "lobby") return responder(ack, { ok: false, erro: "Só dá para trocar no lobby." });
        if (!Number.isInteger(personagem) || personagem < 0 || personagem > 4) return responder(ack, { ok: false, erro: "Personagem inválido." });

        const ocupado = [...sala.jogadores.values()].some((jogador) => jogador.id !== socket.id && jogador.personagem === personagem);
        if (ocupado) return responder(ack, { ok: false, erro: "Outro jogador já escolheu este personagem." });

        const jogador = sala.jogadores.get(socket.id);
        jogador.personagem = personagem;
        jogador.nome = nomeDoPersonagem(personagem);
        responder(ack, { ok: true });
        enviarSala(sala);
    });

    socket.on("partida:iniciar", (dados, ack) => {
        const sala = minhaSala();
        if (!souAnfitriao(sala)) return responder(ack, { ok: false, erro: "Só o anfitrião pode iniciar." });
        if (sala.estado !== "lobby") return responder(ack, { ok: false, erro: "A partida já começou." });
        if (sala.jogadores.size < REGRAS.minimoJogadores) return responder(ack, { ok: false, erro: "São necessários pelo menos 3 jogadores." });

        responder(ack, { ok: true });
        iniciarPartida(sala);
    });

    socket.on("partida:pausar", (dados) => {
        const sala = minhaSala();
        if (!souAnfitriao(sala) || sala.estado !== "jogando") return;

        sala.partida.pausada = Boolean(dados && dados.pausada);
        io.to(sala.codigo).emit("partida:pausada", { pausada: sala.partida.pausada });
    });

    socket.on("evento:testar", () => {
        const sala = minhaSala();
        if (!souAnfitriao(sala) || sala.estado !== "jogando" || sala.partida.pausada) return;

        finalizarEvento(sala);
        iniciarEvento(sala, REGRAS.duracaoTeste);
    });

    socket.on("coletavel:pegar", (dados) => {
        const sala = minhaSala();
        if (!sala || sala.estado !== "jogando") return;

        const jogador = sala.jogadores.get(socket.id);
        const indice = Number(dados && dados.indice);
        const tipo = dados && dados.tipo;
        if (!jogador || !jogador.ativo) return;
        if (!Number.isInteger(indice) || indice < 0 || indice >= REGRAS.totalColetaveis) return;

        if (tipo === "frascos") jogador.frascos.add(indice);
        if (tipo === "cartoes") jogador.cartoes.add(indice);
    });

    // Posição do jogador: o servidor confere e repassa para os outros da sala.
    socket.on("jogador:posicao", (dados) => {
        const sala = minhaSala();
        if (!sala || sala.estado !== "jogando" || sala.partida.pausada) return;

        const jogador = sala.jogadores.get(socket.id);
        if (!jogador || !jogador.ativo || !dados) return;

        // Ignora mensagens rápidas demais (protege o servidor).
        const agora = Date.now();
        if (agora - (jogador.ultimaPosicaoEm || 0) < REGRAS.intervaloPosicaoMs) return;
        jogador.ultimaPosicaoEm = agora;

        const x = Number(dados.x);
        const y = Number(dados.y);
        if (!Number.isFinite(x) || !Number.isFinite(y)) return;

        const posicao = {
            id: socket.id,
            x: Math.round(Math.min(REGRAS.posicaoMaximaX, Math.max(0, x))),
            y: Math.round(Math.min(REGRAS.posicaoMaximaY, Math.max(0, y))),
            direcao: REGRAS.direcoes.includes(dados.direcao) ? dados.direcao : "baixo",
            andando: Boolean(dados.andando)
        };

        // volatile: se a rede estiver lenta, descarta posições velhas em vez de acumular.
        socket.volatile.to(sala.codigo).emit("jogador:posicao", posicao);
    });

    socket.on("tarefa:concluir", (dados) => {
        const sala = minhaSala();
        const tarefaId = dados && dados.tarefaId;
        if (!sala) return;

        const jogador = sala.jogadores.get(socket.id);
        const motivo = jogador ? motivoRecusa(sala, jogador, tarefaId) : "Você não está nesta sala.";
        if (motivo) {
            socket.emit("tarefa:recusada", { tarefaId, motivo });
            return;
        }

        jogador.tarefas.add(tarefaId);
        socket.emit("tarefa:confirmada", { tarefaId });
        io.to(sala.codigo).emit("progresso:atualizado", { jogadorId: socket.id, tarefasConcluidas: jogador.tarefas.size });
        verificarResultado(sala);
    });

    // Fechar a aba ou perder a conexão = sair da sala/partida.
    socket.on("disconnect", () => {
        sairDaSala(socket);
    });
});

// 0.0.0.0 aceita conexões de outros computadores da rede (e do Render).
servidor.listen(PORTA, "0.0.0.0", () => {
    console.log(`Laboratory Chaos rodando na porta ${PORTA}`);
    console.log(`  Neste computador: http://localhost:${PORTA}`);
    ipsDaRedeLocal().forEach((ip) => console.log(`  Na rede local:    http://${ip}:${PORTA}`));
    console.log(`  Origens permitidas (CORS): ${ORIGENS_PERMITIDAS.join(", ")}`);
});
