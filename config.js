// =====================================================================
// LABORATORY CHAOS — endereço do servidor multiplayer
//
// Este arquivo é carregado antes do script.js (script comum, sem módulos).
// =====================================================================

// Endereço do servidor no Render. Troque pela URL do seu app.
const URL_SERVIDOR_ONLINE = "https://laboratory-chaos.onrender.com";

// Escolhe o servidor conforme onde a página está aberta:
// - GitHub Pages (*.github.io): usa o servidor do Render;
// - localhost ou IP da rede da escola: o próprio servidor que entregou a página;
// - arquivo aberto direto (file://): sem servidor, só o modo solo.
const URL_SERVIDOR = (() => {
    if (location.hostname.endsWith("github.io")) return URL_SERVIDOR_ONLINE;
    if (location.protocol === "http:" || location.protocol === "https:") return location.origin;
    return null;
})();
