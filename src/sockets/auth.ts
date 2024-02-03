import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import { Errors } from "../utils/errors";
import { createUser, getUsers } from "../utils/users";

import { User } from "../models/User";
import { BannedToken } from "../models/BannedToken";
import { SocketWithAuth } from "..";

export function registerEvents(socket: SocketWithAuth) {
	socket.on("auth:register", async data => {
		try {
			const { username, email, password } = data;

			if (!(username && email && password)) {
				return socket.emit("error", { error: Errors.MISSING_FIELDS });
			}

			let encryptedPassword = await bcrypt.hash(password, 10);

			let user = await createUser({
				username,
				email: email.toLowerCase(),
				password: encryptedPassword,
			});

			if ("error" in user) {
				// todo add error handling
				return socket.emit("error", { error: user.error.message });
			}

			user._token = jwt.sign(
				{
					_id: user._id,
					username: user.username,
				},
				process.env.TOKEN_KEY
			);

			await user.save();

			socket.emit("auth:register", {
				user: {
					...user.toJSON(),
					password: undefined,
				},
			});
		} catch (error) {
			console.error(error);
			socket.emit("error", {
				error: Errors.INTERNAL_SERVER_ERROR,
			});
		}
	});

	socket.on("auth:login", async data => {
		try {
			const { email, password } = data;

			if (!(email && password)) {
				return socket.emit("error", { error: Errors.MISSING_FIELDS });
			}

			const result = await getUsers({ email: email.toLowerCase() });

			if ("error" in result) {
				return socket.emit("error", { error: result.error.message });
			}

			const user = result.users[0];

			if ("error" in user) {
				return socket.emit("error", { error: Errors.USER_NOT_FOUND });
			}

			if (!(await bcrypt.compare(password, user.password))) {
				return socket.emit("error", {
					error: Errors.INVALID_CREDENTIALS,
				});
			}

			const token = jwt.sign(
				{
					_id: user._id,
					username: user.username,
				},
				process.env.TOKEN_KEY
			);

			if (user._token) {
				await BannedToken.create({
					token: user._token,
				});
			}

			user._token = token;
			user.lastActivity = new Date();

			await user.save();

			socket.emit("auth:login", {
				user: {
					...user.toJSON(),
					password: undefined,
				},
			});
		} catch (error) {
			console.error(error);
			socket.emit("error", {
				error: Errors.INTERNAL_SERVER_ERROR,
			});
		}
	});

	socket.onWithAuth("auth:logout", async data => {
		try {
			const { token, user } = data;

			await User.findByIdAndUpdate(user._id, { _token: null });

			await BannedToken.create({ token });

			socket.emit("auth:logout", {
				message: "Logged out successfully.",
			});
		} catch (error) {
			console.error(error);
			socket.emit("error", {
				error: Errors.INTERNAL_SERVER_ERROR,
			});
		}
	});
}

export const namespace = "/auth";
