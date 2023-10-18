import { Request, Response, NextFunction } from "express";
import { HydratedDocument } from "mongoose";
import jwt from "jsonwebtoken";

import { IUser, User } from "../models/User";
import { BannedToken } from "../models/BannedToken";

export interface UserRequest extends Request {
	user: HydratedDocument<IUser>;
}

export const verifyJWT = async (
	req: UserRequest,
	res: Response,
	next: NextFunction
) => {
	const token: string = req.cookies.token;

	try {
		if (!token)
			return res.status(401).json({
				message:
					"A token is required for authentication. Please log in.",
				valid: false,
			});

		const bannedToken = await BannedToken.findOne({ token });

		if (bannedToken)
			return res.status(401).json({
				message: "This token has expired. Please log in again.",
				valid: false,
			});
	} catch (err) {
		console.error(err);
		res.status(500).json({
			message: "Internal server error. Please try again later.",
			valid: false,
		});
	}

	try {
		const decodedJWT = jwt.verify(token, <string>process.env.TOKEN_KEY);

		const user: HydratedDocument<IUser> = await User.findOne({
			_id: (decodedJWT as any)._id,
		});

		if (!user)
			return res.status(401).json({
				message:
					"Could not find a user with this token. Please log in again.",
				valid: false,
			});

		await User.updateOne({ _id: user._id }, { lastActivity: new Date() });

		const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

		if (user.lastActivity < thirtyMinutesAgo) {
			await User.updateOne({ _id: user._id }, { _token: null });

			await BannedToken.create({ token });

			return res.status(403).json({
				message: "Your session has expired. Please log in again.",
				valid: false,
			});
		}

		delete user.password;
		delete user._token;

		req.user = user;
	} catch (err) {
		return res.status(401).json({
			message: "Invalid token. Please log in again.",
			valid: false,
		});
	}

	return next();
};
