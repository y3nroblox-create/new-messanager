const express = require("express");
const http = require("http");
const { WebSocketServer } = require("ws");

const app = express();
app.use(express.static("public"));

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// Пока история хранится в памяти (при перезапуске сервера пропадает).
// На следующем шаге заменим на базу данных.
const history = [];
const MAX_HISTORY = 50;
const MAX_TEXT = 2000;

function broadcast(data) {
  const json = JSON.stringify(data);
  for (const client of wss.clients) {
    if (client.readyState === 1) client.send(json);
  }
}

wss.on("connection", (ws) => {
  ws.name = "Аноним";
  ws.send(JSON.stringify({ type: "history", messages: history }));

  ws.on("message", (raw) => {
    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      return;
    }

    if (data.type === "join" && typeof data.name === "string") {
      ws.name = data.name.trim().slice(0, 30) || "Аноним";
      return;
    }

    if (data.type === "msg" && typeof data.text === "string") {
      const text = data.text.trim().slice(0, MAX_TEXT);
      if (!text) return;
      const message = { name: ws.name, text, time: Date.now() };
      history.push(message);
      if (history.length > MAX_HISTORY) history.shift();
      broadcast({ type: "msg", message });
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log("Мессенджер запущен на порту " + PORT));
