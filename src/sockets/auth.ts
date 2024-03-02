import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import { Errors } from "../utils/errors";
import { createUser, getUsers } from "../utils/users";

import { User } from "../models/User";
import { BannedToken } from "../models/BannedToken";
import { z, mongooseZodCustomType } from "mongoose-zod";
import { SocketWithAuth } from "..";

export function registerEvents(socket: SocketWithAuth) {
	const authRegisterSchema = z
		.object({
			username: z.string(),
			email: z.string(),
			password: z.string(),
		})
		.strict();

	socket.on("auth:register", async (data: unknown) => {
		try {
			const parsedData = authRegisterSchema.safeParse(data);

			if (parsedData.success === false)
				// TODO: rename error
				return socket.emit("error", {
					error: Errors.INVALID_FIELDS,
					errors: parsedData.error,
				});

			const { username, email, password } = parsedData.data;

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

	const authLoginSchema = z
		.object({
			email: z.string(),
			password: z.string(),
		})
		.strict();

	socket.on("auth:login", async (data: unknown) => {
		try {
			const parsedData = authLoginSchema.safeParse(data);

			if (parsedData.success === false)
				// TODO: rename error
				return socket.emit("error", {
					error: Errors.INVALID_FIELDS,
					errors: parsedData.error,
				});

			const { email, password } = parsedData.data;

			const result = await getUsers({ email: email.toLowerCase() });

			if ("error" in result) {
				return socket.emit("error", { error: result.error.message });
			}

			const user = result.users[0];

			if (!user) {
				return socket.emit("error", { error: Errors.NOT_FOUND });
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

	const authLogoutSchema = z
		.object({
			token: z.string(),
			user: z.object({ _id: mongooseZodCustomType("ObjectId") }),
		})
		.strict();

	socket.onWithAuth("auth:logout", async (data: unknown) => {
		try {
			const parsedData = authLogoutSchema.safeParse(data);

			if (parsedData.success === false)
				// TODO: rename error
				return socket.emit("error", {
					error: Errors.INVALID_FIELDS,
					errors: parsedData.error,
				});

			const { token, user } = parsedData.data;

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
