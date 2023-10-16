import { createServer } from "http";
import express from "express";
import { Server } from "socket.io";
import { randomUUID } from "crypto";

const app = express();
const server = createServer(app);
const io = new Server(server, {
	cors: {
		origin: "*",
	},
});

app.get("/", (_, res) => {
	res.json({ message: "Hello, World!" });
});

io.on("connection", socket => {
	console.log(`Client connected with id: ${socket.id}`);

	// socket.on("message", ({ message, time }) => {
	// 	console.log(`[${time}] Received message => ${message}`);

	// 	// broadcast message to all connected clients
	// 	socket.broadcast.emit("message", { message, time });
	// });

	// detect user joining a room
	socket.on("join-room", roomId => {
		socket.join(roomId);
		console.log(`User joined room: ${roomId}`);

		socket.on("message", ({ message, time }) => {
			console.log(`[${time}] Received message => ${message}`);

			// broadcast message to all connected clients
			socket.broadcast.to(roomId).emit("message", { message, time });
		});

		socket.broadcast.to(roomId).emit("message", {
			message: `User joined the room with id: ${roomId}`,
			time: new Date().toLocaleTimeString(),
		});
	});

	socket.on("create-room", () => {
		const roomId = randomUUID();

		socket.join(roomId);
		console.log(`User created room: ${roomId}`);

		socket.on("message", ({ message, time }) => {
			console.log(`[${time}] Received message => ${message}`);

			// broadcast message to all connected clients
			socket.broadcast.to(roomId).emit("message", { message, time });
		});

		socket.emit("message", {
			message: `Room created with id: ${roomId}`,
			time: new Date().toLocaleTimeString(),
		});
	});

	socket.on("leave-room", roomId => {
		socket.leave(roomId);
		console.log(`User left room: ${roomId}`);
	});
});

const port = process.env.PORT || 8393;

server.listen(port, () => console.log(`Server started on port ${port}`));
