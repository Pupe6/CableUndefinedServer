import { HydratedDocument } from "mongoose";
import jwt from "jsonwebtoken";
import { IUser, User } from "../models/User";
import { BannedToken } from "../models/BannedToken";
import { Errors } from "../utils/errors";
import { Socket } from "socket.io";

async function authenticateSocket(
	data: any
): Promise<HydratedDocument<IUser> | Error> {
	let { token } = data;

	try {
		if (!token) return new Error(Errors.NO_SESSION);

		const bannedToken = await BannedToken.findOne({ token });

		if (bannedToken) return new Error(Errors.EXPIRED_TOKEN);
	} catch (error) {
		console.error(error);
		return new Error(Errors.INTERNAL_SERVER_ERROR);
	}

	try {
		const decodedJWT = jwt.verify(token, process.env.TOKEN_KEY);

		const user: HydratedDocument<IUser> = await User.findOne({
			_id: (decodedJWT as any)._id,
		});

		if (!user) return new Error(Errors.USER_NOT_FOUND);

		await User.updateOne({ _id: user._id }, { lastActivity: new Date() });

		const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

		if (user.lastActivity < thirtyMinutesAgo) {
			await User.updateOne({ _id: user._id }, { _token: null });

			await BannedToken.create({ token });

			return new Error(Errors.EXPIRED_TOKEN);
		}

		delete user.password;
		delete user._token;

		data.user = user;
	} catch (error) {
		return new Error(Errors.INVALID_TOKEN);
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
			data = await authenticateSocket(data);

			if (data instanceof Error) throw data;

			callback(data);
		} catch (error) {
			socket.emit("error", { error: error.message });
		}
	});
};
