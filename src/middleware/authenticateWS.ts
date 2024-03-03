import { HydratedDocument } from "mongoose";
import jwt from "jsonwebtoken";
import { User, IUser } from "../models/User";
import { BannedToken } from "../models/BannedToken";
import { Errors } from "../utils/errors";
import { Socket } from "socket.io";
import { mongooseZodCustomType, z } from "mongoose-zod";
import { ZodError } from "zod";

export const JWTUserSchema = z
	.object({
		user: z.object({
			_id: mongooseZodCustomType("ObjectId"),
			username: z.string(),
			email: z.string(),
			createdAt: z.date(),
			updatedAt: z.date(),
			lastActivity: z.date(),
		}),
	})
	.strict();

const authenticationSchema = z.object({
	token: z.string(),
});

async function authenticateSocket(data: any): Promise<
	| HydratedDocument<IUser>
	| {
			error: Error;
			errors?: ZodError;
	  }
> {
	const parsedData = authenticationSchema.safeParse(data);

	if (parsedData.success === false)
		return {
			error: new Error(Errors.INVALID_FIELDS),
			errors: parsedData.error,
		};

	const { token } = parsedData.data;

	try {
		const bannedToken = await BannedToken.findOne({ token });

		if (bannedToken)
			return {
				error: new Error(Errors.EXPIRED_TOKEN),
			};
	} catch (error) {
		console.error(error);

		return { error: new Error(Errors.INTERNAL_SERVER_ERROR) };
	}

	try {
		const decodedJWT = jwt.verify(token, process.env.TOKEN_KEY);

		const user = await User.findOne({
			_id: (decodedJWT as any)._id,
		});

		if (!user) return { error: new Error(Errors.NOT_FOUND) };

		await User.updateOne({ _id: user._id }, { lastActivity: new Date() });

		const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

		if (user.lastActivity < thirtyMinutesAgo) {
			await User.updateOne({ _id: user._id }, { _token: null });

			await BannedToken.create({ token });

			return { error: new Error(Errors.EXPIRED_TOKEN) };
		}

		delete user.password;
		delete user._token;

		data.user = user;

		// remove the token from the data object
		delete data.token;
	} catch (error) {
		return { error: new Error(Errors.INVALID_TOKEN) };
	}

	return data;
}

export const onWithAuth = (
	socket: Socket,
	event: string,
	callback: Function
) => {
	socket.on(event, async data => {
		try {
			const newData = await authenticateSocket(data);

			if ("error" in newData) {
				return socket.emit("error", {
					error: newData.error.message,
					errors: newData.errors,
				});
			}

			callback(newData);
		} catch (error) {
			console.error(error);

			socket.emit("error", { error: Errors.INTERNAL_SERVER_ERROR });
		}
	});
};
