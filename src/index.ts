import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";

import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";

import mongoose from "mongoose";
import path from "path";
import fs from "fs";
import { Errors } from "./utils/errors";

dotenv.config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
	cors: {
		origin: "*",
	},
});

const routesPath = path.join(__dirname, "routes");

app.use(express.json());
app.use(cookieParser());

// Set CORS With Whitelist Array
let whitelistedDomains = process.env.WHITELISTED_DOMAINS.split(", ");
let allowedOrigins =
	process.env.NODE_ENV === "production"
		? whitelistedDomains
		: // todo change port
		  ["http://localhost:5500", "http://127.0.0.1:5500"];

app.use(
	cors({
		origin: allowedOrigins,
		optionsSuccessStatus: 200,
	})
);

app.use((req, res, next) => {
	const origin = req.headers.origin;

	// todo might need to comment this out
	if (allowedOrigins.includes(origin))
		res.setHeader("Access-Control-Allow-Origin", "*");

	// todo maybe change to *
	res.setHeader(
		"Access-Control-Allow-Methods",
		"GET, POST, PUT, DELETE, OPTIONS"
	);
	res.setHeader(
		"Access-Control-Allow-Headers",
		"Content-Type, X-Token, Origin"
	);

	next();
});

// Register Routes
try {
	fs.readdirSync(routesPath).forEach(file => {
		const route = require(path.join(routesPath, file));
		app.use(route.path, route.router);
	});

	app.all("*", (_, res) =>
		res.status(404).json({
			error: Errors.NOT_FOUND,
		})
	);
} catch (error) {
	console.error(error);
	app.all("*", (_, res) =>
		res.status(500).json({
			error: Errors.INTERNAL_SERVER_ERROR,
		})
	);
}

io.on("connection", socket => {
	console.log("User connected");

	socket.on("disconnect", () => {
		console.log("User disconnected");
	});

	socket.on("error", error => {
		console.error(error);
	});
});

const port = process.env.PORT || 8393;

// Connect To MongoDB
mongoose.connect(process.env.DB_URI).then(() => {
	console.log("Connected to MongoDB");

	// Start The Server
	server.listen(port, () => console.log(`Server started on port ${port}`));
});
