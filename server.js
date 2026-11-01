const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const crypto = require("crypto");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 3000;
app.use(express.static(path.join(__dirname, "public")));

const rooms = new Map();
const makeCode = () => crypto.randomBytes(3).toString("hex").toUpperCase();
const cleanName = s => String(s || "").trim().replace(/[<>]/g, "").slice(0, 20);

function publicState(room) {
  return {
    code: room.code,
    hostId: room.hostId,
    players: [...room.players.values()].map(p => ({ id: p.id, name: p.name, score: p.score })),
    categories: room.categories,
    used: [...room.used],
    activeQuestion: room.activeQuestion,
    buzzWinner: room.buzzWinner,
    buzzOpen: room.buzzOpen,
    status: room.status,
    message: room.message
  };
}
function broadcast(room) { io.to(room.code).emit("state", publicState(room)); }
function getRoom(socket) {
  const code = socket.data.roomCode;
  return code ? rooms.get(code) : null;
}
function isHost(socket, room) { return !!room && room.hostId === socket.id; }

io.on("connection", socket => {
  socket.on("createRoom", ({name, categories}) => {
    name = cleanName(name) || "Spielleitung";
    let code = makeCode();
    while (rooms.has(code)) code = makeCode();
    const room = {
      code, hostId: socket.id, players: new Map(),
      categories: Array.isArray(categories) && categories.length ? categories : [],
      used: new Set(), activeQuestion: null, buzzWinner: null,
      buzzOpen: false, status: "board", message: "Wählt eine Kategorie und Punktzahl."
    };
    room.players.set(socket.id, {id: socket.id, name, score: 0});
    rooms.set(code, room);
    socket.join(code); socket.data.roomCode = code;
    socket.emit("joined", {code, host: true});
    broadcast(room);
  });

  socket.on("joinRoom", ({code, name}) => {
    code = String(code || "").trim().toUpperCase();
    const room = rooms.get(code);
    if (!room) return socket.emit("errorMessage", "Spielcode nicht gefunden.");
    name = cleanName(name);
    if (!name) return socket.emit("errorMessage", "Gib bitte einen Namen ein.");
    if ([...room.players.values()].some(p => p.name.toLowerCase() === name.toLowerCase()))
      return socket.emit("errorMessage", "Dieser Name ist bereits vergeben.");
    room.players.set(socket.id, {id: socket.id, name, score: 0});
    socket.join(code); socket.data.roomCode = code;
    socket.emit("joined", {code, host: false});
    broadcast(room);
  });

  socket.on("selectQuestion", ({categoryIndex, points, targetPlayerId}) => {
    const room = getRoom(socket);
    if (!isHost(socket, room) || room.status !== "board") return;
    const cat = room.categories[categoryIndex];
    if (!cat || ![100,200,300,400,500].includes(Number(points))) return;
    const q = cat.questions.find(q => q.points === Number(points));
    const key = `${categoryIndex}:${points}`;
    if (!q || room.used.has(key)) return;
    const assignedPlayerId = targetPlayerId && room.players.has(targetPlayerId) ? targetPlayerId : null;
    room.activeQuestion = {...q, category: cat.name, categoryIndex, key, assignedPlayerId};
    room.buzzWinner = null; room.buzzOpen = false; room.status = "question";
    room.message = "Frage läuft. Die Spielleitung kann den Buzzer freigeben.";
    broadcast(room);
  });

  socket.on("openBuzzers", () => {
    const room = getRoom(socket);
    if (!isHost(socket, room) || room.status !== "question" || room.buzzWinner) return;
    room.buzzOpen = true; room.message = "BUZZERN! Wer zuerst drückt, darf antworten.";
    broadcast(room);
  });

  socket.on("buzz", () => {
    const room = getRoom(socket);
    if (!room || !room.buzzOpen || room.status !== "question" || room.buzzWinner || !room.players.has(socket.id)) return;
    room.buzzWinner = socket.id;
    room.buzzOpen = false;
    const p = room.players.get(socket.id);
    room.message = `${p.name} ist zuerst dran!`;
    broadcast(room);
  });

  socket.on("judge", ({correct}) => {
    const room = getRoom(socket);
    if (!isHost(socket, room) || room.status !== "question" || !room.activeQuestion) return;
    const scoringPlayerId = room.activeQuestion.assignedPlayerId || room.buzzWinner;
    if (scoringPlayerId && room.players.has(scoringPlayerId)) {
      const p = room.players.get(scoringPlayerId);
      p.score += correct ? room.activeQuestion.points : -room.activeQuestion.points;
    }
    room.used.add(room.activeQuestion.key);
    room.activeQuestion = null; room.buzzWinner = null; room.buzzOpen = false;
    room.status = "board";
    room.message = correct ? "Richtig! Punkte wurden vergeben." : "Frage beendet. Punktestand aktualisiert.";
    broadcast(room);
  });

  socket.on("noAnswer", () => {
    const room = getRoom(socket);
    if (!isHost(socket, room) || room.status !== "question") return;
    room.buzzWinner = null; room.buzzOpen = true;
    room.message = "Niemand war richtig – die anderen dürfen erneut buzzern!";
    broadcast(room);
  });

  socket.on("editCategories", categories => {
    const room = getRoom(socket);
    if (!isHost(socket, room) || room.status !== "board") return;
    if (!Array.isArray(categories) || categories.length < 1 || categories.length > 6) return;
    room.categories = categories;
    room.used = new Set();
    room.message = "Fragen wurden aktualisiert.";
    broadcast(room);
  });

  socket.on("resetScores", () => {
    const room = getRoom(socket);
    if (!isHost(socket, room)) return;
    room.players.forEach(p => p.score = 0);
    room.used.clear(); room.activeQuestion = null; room.buzzWinner = null;
    room.buzzOpen = false; room.status = "board"; room.message = "Spiel zurückgesetzt.";
    broadcast(room);
  });

  socket.on("disconnect", () => {
    const room = getRoom(socket);
    if (!room) return;
    room.players.delete(socket.id);
    if (room.hostId === socket.id) {
      const next = room.players.keys().next();
      if (!next.done) room.hostId = next.value;
      else { rooms.delete(room.code); return; }
    }
    broadcast(room);
  });
});

server.listen(PORT, () => console.log(`Quizshow läuft auf Port ${PORT}`));
