import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

interface UserData {
  name: string;
  lat: number;
  lng: number;
}

// Store active users in memory
const users: Map<string, UserData> = new Map();

// Broadcast updated users list to all clients
function broadcastUsers() {
  const usersList = Array.from(users.entries()).map(([socketId, data]) => ({
    id: socketId,
    ...data,
  }));
  io.emit("users-update", usersList);
}

io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Handle user joining with their name
  socket.on("join", (data: { name: string }) => {
    users.set(socket.id, {
      name: data.name,
      lat: 0,
      lng: 0,
    });
    console.log(`${data.name} joined (${socket.id})`);
    broadcastUsers();
  });

  // Handle location updates
  socket.on("send-location", (data: { lat: number; lng: number }) => {
    const user = users.get(socket.id);
    if (user) {
      user.lat = data.lat;
      user.lng = data.lng;
      users.set(socket.id, user);
      broadcastUsers();
    }
  });

  // Handle disconnection
  socket.on("disconnect", () => {
    const user = users.get(socket.id);
    if (user) {
      console.log(`${user.name} disconnected (${socket.id})`);
    }
    users.delete(socket.id);
    broadcastUsers();
  });
});

const PORT = process.env.SOCKET_PORT || 3001;

httpServer.listen(PORT, () => {
  console.log(`Socket.IO server running on port ${PORT}`);
});
