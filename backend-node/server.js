const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

// ── Config ──
const PORT = parseInt(process.env.PORT || "4000", 10);
const CORS_ORIGIN = process.env.CORS_ORIGIN || "*";

const app = express();
app.use(cors({ origin: CORS_ORIGIN }));

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: CORS_ORIGIN,
    methods: ["GET", "POST"],
  },
});

// ── Health check ──
app.get("/", (_req, res) => {
  res.json({ status: "ok", server: "node" });
});

// ── In-memory state ──
// roomUsers: Map<room, Map<socketId, username>>
const roomUsers = new Map();

function getRoomUsers(room) {
  if (!roomUsers.has(room)) {
    roomUsers.set(room, new Map());
  }
  return roomUsers.get(room);
}

// ── Socket.IO handlers ──
io.on("connection", (socket) => {
  console.log(`[connect] ${socket.id}`);

  let currentRoom = null;
  let currentUser = null;

  socket.on("join", ({ username, room }) => {
    // Leave previous room if any
    if (currentRoom) {
      leaveCurrentRoom(socket);
    }

    currentRoom = room;
    currentUser = username;

    socket.join(room);
    getRoomUsers(room).set(socket.id, username);

    const payload = {
      username,
      message: `${username} has joined the room`,
      room,
      timestamp: Date.now(),
    };

    // Notify everyone in the room (including sender)
    io.to(room).emit("join", payload);

    console.log(`[join] ${username} → #${room}`);
  });

  socket.on("message", ({ username, message, room }) => {
    const payload = {
      username,
      message,
      room,
      timestamp: Date.now(),
    };

    io.to(room).emit("message", payload);
  });

  socket.on("leave", ({ username, room }) => {
    leaveCurrentRoom(socket);
  });

  socket.on("disconnect", () => {
    leaveCurrentRoom(socket);
    console.log(`[disconnect] ${socket.id}`);
  });

  function leaveCurrentRoom(sock) {
    if (!currentRoom || !currentUser) return;

    const room = currentRoom;
    const username = currentUser;

    sock.leave(room);
    const users = getRoomUsers(room);
    users.delete(sock.id);

    if (users.size === 0) {
      roomUsers.delete(room);
    }

    const payload = {
      username,
      message: `${username} has left the room`,
      room,
      timestamp: Date.now(),
    };

    io.to(room).emit("leave", payload);

    currentRoom = null;
    currentUser = null;

    console.log(`[leave] ${username} ← #${room}`);
  }
});

// ── Start ──
server.listen(PORT, () => {
  console.log(`Node.js chat backend running on http://localhost:${PORT}`);
});
