// =====================================================================
// LABORATORY CHAOS — teste automático do multiplayer
//
// Uso (dentro de server/):  npm test
// O teste sobe o próprio servidor numa porta livre e simula de 3 a 6
// jogadores com socket.io-client.
//
// Para testar um servidor que já está rodando (ex.: o do Render):
//   URL_TESTE=https://seu-app.onrender.com npm test
// =====================================================================

const path = require("path");
const net = require("net");
const { spawn } = require("child_process");
const { io } = require("socket.io-client");

// =================================================================
// Ferramentas do teste
// =================================================================

let aprovados = 0;
let reprovados = 0;

// Registra o resultado de uma verificação.
function verificar(condicao, descricao, detalhe) {
    if (condicao) {
        aprovados += 1;
        console.log(`  OK    ${descricao}`);
    } else {
        reprovados += 1;
        console.log(`  FALHA ${descricao}${detalhe !== undefined ? ` → ${JSON.stringify(detalhe)}` : ""}`);
    }
}

function titulo(texto) {
    console.log(`\n${texto}`);
}

const pausar = (ms) => new Promise((resolver) => setTimeout(resolver, ms));

// Espera um evento (que passe no filtro). Devolve os dados ou null se der o tempo.
// Deve ser chamada ANTES da ação que provoca o evento.
function esperarEvento(socket, nome, filtro = () => true, limiteMs = 3000) {
    return new Promise((resolver) => {
        const ouvir = (dados) => {
            if (!filtro(dados)) return;
            clearTimeout(relogio);
            socket.off(nome, ouvir);
            resolver(dados);
        };
        const relogio = setTimeout(() => {
            socket.off(nome, ouvir);
            resolver(null);
        }, limiteMs);
        socket.on(nome, ouvir);
    });
}

// Conta quantas vezes um evento chega durante um tempo.
async function contarEventos(socket, nome, duracaoMs) {
    let total = 0;
    const ouvir = () => { total += 1; };
    socket.on(nome, ouvir);
    await pausar(duracaoMs);
    socket.off(nome, ouvir);
    return total;
}

// Coleta os próximos N eventos de um tipo.
function coletarEventos(socket, nome, quantidade, limiteMs = 6000) {
    return new Promise((resolver) => {
        const lista = [];
        const ouvir = (dados) => {
            lista.push(dados);
            if (lista.length === quantidade) terminar();
        };
        const terminar = () => {
            clearTimeout(relogio);
            socket.off(nome, ouvir);
            resolver(lista);
        };
        const relogio = setTimeout(terminar, limiteMs);
        socket.on(nome, ouvir);
    });
}

// Emite um evento com resposta (ack). Devolve null se o servidor não responder.
function pedir(socket, evento, dados) {
    return new Promise((resolver) => {
        const relogio = setTimeout(() => resolver(null), 3000);
        socket.emit(evento, dados, (resposta) => {
            clearTimeout(relogio);
            resolver(resposta);
        });
    });
}

const clientes = [];

// Conecta um jogador simulado e guarda a última lista de salas públicas.
function conectar(url, nome) {
    return new Promise((resolver, rejeitar) => {
        const socket = io(url, { forceNew: true, transports: ["websocket"], reconnection: false });
        socket.nome = nome;
        socket.publicas = [];
        socket.on("salas:publicas", (lista) => { socket.publicas = lista; });
        socket.once("connect", () => resolver(socket));
        socket.once("connect_error", (erro) => rejeitar(new Error(`${nome} não conectou: ${erro.message}`)));
        clientes.push(socket);
    });
}

// Coleta 3 frascos e 3 cartões e conclui todas as tarefas pedidas.
function coletarTudo(socket) {
    [0, 1, 2].forEach((indice) => {
        socket.emit("coletavel:pegar", { tipo: "frascos", indice });
        socket.emit("coletavel:pegar", { tipo: "cartoes", indice });
    });
}

// =================================================================
// Servidor usado no teste
// =================================================================

// Pede ao sistema uma porta livre.
function portaLivre() {
    return new Promise((resolver) => {
        const provisorio = net.createServer();
        provisorio.listen(0, () => {
            const { port } = provisorio.address();
            provisorio.close(() => resolver(port));
        });
    });
}

// Sobe o server/index.js e espera a mensagem "rodando".
async function subirServidor() {
    const porta = await portaLivre();
    const processo = spawn(process.execPath, [path.join(__dirname, "..", "index.js")], {
        env: { ...process.env, PORT: String(porta) },
        stdio: ["ignore", "pipe", "pipe"]
    });

    await new Promise((resolver, rejeitar) => {
        const limite = setTimeout(() => rejeitar(new Error("O servidor não iniciou em 10s.")), 10000);
        processo.stdout.on("data", (texto) => {
            if (String(texto).includes("rodando")) {
                clearTimeout(limite);
                resolver();
            }
        });
        processo.stderr.on("data", (texto) => process.stderr.write(texto));
        processo.on("exit", (codigo) => rejeitar(new Error(`O servidor fechou (código ${codigo}).`)));
    });

    return { url: `http://localhost:${porta}`, processo };
}

// =================================================================
// Cenários
// =================================================================

// 1. Criar sala, entrar por código, limites de 3 a 5 jogadores.
async function cenarioSalas(url) {
    titulo("1. Salas e lobby");
    const [A, B, C, D, E, F] = await Promise.all(["A", "B", "C", "D", "E", "F"].map((nome) => conectar(url, nome)));

    const criada = await pedir(A, "sala:criar", { publica: false, nome: "Teste" });
    verificar(criada && criada.ok && /^LAB[A-Z]{3}$/.test(criada.sala.codigo), "A cria uma sala privada com código LAB + 3 letras", criada);
    const codigo = criada.sala.codigo;
    await pausar(150);
    verificar(!F.publicas.some((sala) => sala.codigo === codigo), "sala privada não aparece na lista pública");

    const naoExiste = await pedir(B, "sala:entrar", { codigo: "LABZZZ" === codigo ? "LABYYY" : "LABZZZ" });
    verificar(naoExiste && !naoExiste.ok, "código inexistente é recusado", naoExiste);

    const entrouB = await pedir(B, "sala:entrar", { codigo: `  ${codigo.toLowerCase()} ` });
    verificar(entrouB && entrouB.ok, "B entra pelo código (minúsculas e espaços)", entrouB);

    const inicioCom2 = await pedir(A, "partida:iniciar");
    verificar(inicioCom2 && !inicioCom2.ok, "início com 2 jogadores é recusado", inicioCom2);

    for (const jogador of [C, D, E]) await pedir(jogador, "sala:entrar", { codigo });
    const salaCheia = await pedir(F, "sala:entrar", { codigo });
    verificar(salaCheia && !salaCheia.ok && /cheia/i.test(salaCheia.erro), "6º jogador é recusado (sala cheia)", salaCheia);

    const atualizacao = esperarEvento(A, "sala:atualizada", (sala) => sala.jogadores.length === 5, 1000);
    A.emit("sala:personagem", { personagem: 0 }, () => {});
    const comCinco = await atualizacao;
    const personagens = comCinco ? comCinco.jogadores.map((jogador) => jogador.personagem) : [];
    verificar(comCinco && new Set(personagens).size === 5, "5 jogadores, cada um com um personagem diferente", personagens);

    const trocaOcupada = await pedir(B, "sala:personagem", { personagem: 0 });
    verificar(trocaOcupada && !trocaOcupada.ok, "não dá para escolher o personagem de outro jogador", trocaOcupada);

    const saida = esperarEvento(A, "sala:atualizada", (sala) => sala.jogadores.length === 3);
    D.emit("sala:sair");
    E.emit("sala:sair");
    verificar(Boolean(await saida), "D e E saem da sala: sobram 3 no lobby");

    const inicioPorB = await pedir(B, "partida:iniciar");
    verificar(inicioPorB && !inicioPorB.ok, "jogador que não é anfitrião não inicia", inicioPorB);

    return { A, B, C, D, codigo };
}

// 2. Partida: início, cronômetro, movimento, tarefas, eventos, pausa e desconexões.
async function cenarioPartida({ A, B, C, D, codigo }) {
    titulo("2. Partida");
    const jogadores = [A, B, C];

    const iniciadas = jogadores.map((jogador) => esperarEvento(jogador, "partida:iniciada"));
    const foraDaSala = contarEventos(D, "partida:iniciada", 500);
    const inicio = await pedir(A, "partida:iniciar");
    const dadosInicio = await Promise.all(iniciadas);
    verificar(inicio && inicio.ok && dadosInicio.every((dados) => dados && dados.jogadores.length === 3),
        "anfitrião inicia com 3 e os 3 recebem partida:iniciada", inicio);
    verificar(await foraDaSala === 0, "quem saiu da sala não recebe o início");

    const atrasado = await pedir(D, "sala:entrar", { codigo });
    verificar(atrasado && !atrasado.ok, "não dá para entrar com a partida em andamento", atrasado);

    // Cronômetro: os 3 recebem os mesmos valores, diminuindo 1 por segundo.
    const ticks = await Promise.all(jogadores.map((jogador) => coletarEventos(jogador, "partida:estado", 3)));
    const tempos = ticks.map((lista) => lista.map((estado) => estado.tempoRestante));
    const iguais = tempos.every((lista) => JSON.stringify(lista) === JSON.stringify(tempos[0]));
    const descendo = tempos[0].length === 3 && tempos[0][0] - tempos[0][1] === 1 && tempos[0][1] - tempos[0][2] === 1;
    verificar(iguais && descendo && tempos[0][0] < 300, "cronômetro igual para todos e diminuindo 1 por segundo", tempos);

    // Movimento: posição do A chega ao B e ao C, e não volta para o A.
    const posicoes = [B, C].map((jogador) => esperarEvento(jogador, "jogador:posicao", (dados) => dados.id === A.id));
    const devolvida = contarEventos(A, "jogador:posicao", 400);
    A.emit("jogador:posicao", { x: 410.6, y: 300, direcao: "esquerda", andando: true });
    const [posB, posC] = await Promise.all(posicoes);
    verificar(posB && posB.x === 411 && posB.direcao === "esquerda" && posB.andando === true && posC && posC.x === 411,
        "movimento do A é repassado para B e C", posB);
    verificar(await devolvida === 0, "o A não recebe a própria posição de volta");

    const limitada = esperarEvento(B, "jogador:posicao", (dados) => dados.id === A.id);
    await pausar(60);
    A.emit("jogador:posicao", { x: 99999, y: -5, direcao: "voar" });
    const dadosLimitados = await limitada;
    verificar(dadosLimitados && dadosLimitados.x === 752 && dadosLimitados.y === 0 && dadosLimitados.direcao === "baixo",
        "posição fora do mapa é limitada e direção inválida corrigida", dadosLimitados);

    // Tarefa: recusada sem coletar; aceita depois; progresso chega a todos.
    const recusa = esperarEvento(B, "tarefa:recusada");
    B.emit("tarefa:concluir", { tarefaId: "frascos" });
    const motivoRecusa = await recusa;
    verificar(motivoRecusa && /frascos/.test(motivoRecusa.motivo), "tarefa dos frascos recusada sem os 3 frascos", motivoRecusa);

    const confirmacao = esperarEvento(B, "tarefa:confirmada", (dados) => dados.tarefaId === "frascos");
    const progressos = [A, C].map((jogador) => esperarEvento(jogador, "progresso:atualizado", (dados) => dados.jogadorId === B.id));
    coletarTudo(B);
    B.emit("tarefa:concluir", { tarefaId: "frascos" });
    const [confirmada, progressoA, progressoC] = await Promise.all([confirmacao, ...progressos]);
    verificar(Boolean(confirmada), "tarefa dos frascos confirmada após coletar os 3");
    verificar(progressoA && progressoA.tarefasConcluidas === 1 && progressoC && progressoC.tarefasConcluidas === 1,
        "A e C veem o progresso do B (1/6)", progressoA);

    const repetida = esperarEvento(B, "tarefa:recusada");
    B.emit("tarefa:concluir", { tarefaId: "frascos" });
    verificar(/já concluída/.test(((await repetida) || {}).motivo), "a mesma tarefa não conta duas vezes");

    // Eventos: o mesmo evento chega a todos e termina para todos.
    const iniciados = jogadores.map((jogador) => esperarEvento(jogador, "evento:iniciado"));
    A.emit("evento:testar");
    const eventos = await Promise.all(iniciados);
    const ids = eventos.map((evento) => evento && evento.id);
    verificar(ids.every((id) => id && id === ids[0]) && eventos.every((evento) => evento.duracaoMs === 8000),
        `o mesmo evento sorteado pelo servidor chega a todos (${ids[0]})`, eventos);
    if (ids[0] === "portas") {
        verificar(JSON.stringify(eventos[0].portas) === "[0,1]", "portas travadas: as mesmas portas para todos", eventos[0].portas);
    }

    const finalizados = await Promise.all(jogadores.map((jogador) =>
        esperarEvento(jogador, "evento:finalizado", () => true, 10000)));
    verificar(finalizados.every((evento) => evento && evento.id === ids[0]), "o evento termina para todos depois de 8s", finalizados);

    // Pausa: só o anfitrião pausa, e o relógio para para todos.
    const pausaIndevida = contarEventos(A, "partida:pausada", 500);
    B.emit("partida:pausar", { pausada: true });
    verificar(await pausaIndevida === 0, "quem não é anfitrião não consegue pausar");

    const pausas = jogadores.map((jogador) => esperarEvento(jogador, "partida:pausada", (dados) => dados.pausada));
    A.emit("partida:pausar", { pausada: true });
    verificar((await Promise.all(pausas)).every(Boolean), "anfitrião pausa para todos");
    const ticksPausados = await coletarEventos(C, "partida:estado", 2);
    verificar(ticksPausados.length === 2 && ticksPausados[0].tempoRestante === ticksPausados[1].tempoRestante,
        "relógio parado durante a pausa", ticksPausados.map((estado) => estado.tempoRestante));

    // Desconexão do anfitrião (com o jogo pausado): B assume.
    const saidas = [B, C].map((jogador) => esperarEvento(jogador, "jogador:saiu"));
    const novaSala = esperarEvento(C, "sala:atualizada", (sala) => sala.anfitriaoId === B.id);
    const fimPrematuro = contarEventos(B, "partida:fim", 600);
    A.disconnect();
    const [saidaB] = await Promise.all(saidas);
    const salaDepois = await novaSala;
    verificar(saidaB && saidaB.jogadorId && saidaB.novoAnfitriaoId === B.id, "anfitrião desconecta: B vira o novo anfitrião", saidaB);
    verificar(salaDepois && salaDepois.jogadores.some((jogador) => !jogador.ativo), "o A aparece como inativo para os outros");
    verificar(await fimPrematuro === 0, "com 2 jogadores ativos a partida continua");

    const retomada = esperarEvento(C, "partida:pausada", (dados) => dados.pausada === false);
    B.emit("partida:pausar", { pausada: false });
    verificar(Boolean(await retomada), "o novo anfitrião consegue continuar a partida");
    const ticksRetomados = await coletarEventos(C, "partida:estado", 2);
    verificar(ticksRetomados.length === 2 && ticksRetomados[0].tempoRestante - ticksRetomados[1].tempoRestante === 1,
        "relógio volta a andar", ticksRetomados.map((estado) => estado.tempoRestante));

    // Último jogador ativo vence.
    const fim = esperarEvento(B, "partida:fim");
    const lobby = esperarEvento(B, "sala:atualizada", (sala) => sala.estado === "lobby");
    C.disconnect();
    const resultado = await fim;
    verificar(resultado && resultado.tipo === "ultimo" && resultado.vencedorId === B.id,
        "C desconecta: B é o último jogador ativo e vence", resultado);
    const salaFinal = await lobby;
    verificar(salaFinal && salaFinal.jogadores.length === 1, "a sala volta ao lobby só com quem ficou", salaFinal && salaFinal.jogadores.length);
}

// 3. Anfitrião sai no lobby e vitória por concluir as 6 tarefas (mesmo resultado para todos).
async function cenarioVitoriaPorTarefas(url) {
    titulo("3. Troca de anfitrião no lobby e vitória por tarefas");
    const [G, H, I, J] = await Promise.all(["G", "H", "I", "J"].map((nome) => conectar(url, nome)));

    const criada = await pedir(G, "sala:criar", { publica: true, nome: "Pública" });
    const codigo = criada.sala.codigo;
    await pausar(150);
    verificar(J.publicas.some((sala) => sala.codigo === codigo), "sala pública aparece na lista em tempo real");

    await pedir(H, "sala:entrar", { codigo });
    await pedir(I, "sala:entrar", { codigo });

    const trocaNoLobby = esperarEvento(H, "sala:atualizada", (sala) => sala.anfitriaoId === H.id);
    G.emit("sala:sair");
    const salaSemG = await trocaNoLobby;
    verificar(salaSemG && salaSemG.jogadores.length === 2, "anfitrião sai no lobby: o próximo (H) assume", salaSemG && salaSemG.anfitriaoId);

    await pedir(J, "sala:entrar", { codigo });
    const iniciadas = [H, I, J].map((jogador) => esperarEvento(jogador, "partida:iniciada"));
    const inicio = await pedir(H, "partida:iniciar");
    await Promise.all(iniciadas);
    verificar(inicio && inicio.ok, "novo anfitrião inicia a partida com 3", inicio);

    const fins = [H, I, J].map((jogador) => esperarEvento(jogador, "partida:fim"));
    coletarTudo(I);
    ["computador", "frascos", "energia", "portas", "reator", "protocolo"].forEach((tarefaId) => {
        I.emit("tarefa:concluir", { tarefaId });
    });
    const resultados = await Promise.all(fins);
    const iguais = resultados.every((dados) => dados && dados.vencedorId === I.id && dados.tipo === "tarefas");
    verificar(iguais, "I conclui as 6 tarefas e os 3 recebem o mesmo resultado", resultados);
}

// =================================================================
// Execução
// =================================================================

(async () => {
    const vigia = setTimeout(() => {
        console.log("\nTempo total esgotado (90s).");
        process.exit(1);
    }, 90000);

    let servidor = null;
    try {
        let url = process.env.URL_TESTE;
        if (!url) {
            servidor = await subirServidor();
            url = servidor.url;
        }
        console.log(`Testando o servidor em ${url}`);

        const jogadores = await cenarioSalas(url);
        await cenarioPartida(jogadores);
        await cenarioVitoriaPorTarefas(url);
    } catch (erro) {
        reprovados += 1;
        console.log(`\nERRO: ${erro.message}`);
    } finally {
        clientes.forEach((socket) => socket.disconnect());
        if (servidor) servidor.processo.kill();
        clearTimeout(vigia);
    }

    console.log(`\n${aprovados} aprovados, ${reprovados} com falha.`);
    process.exit(reprovados === 0 ? 0 : 1);
})();
