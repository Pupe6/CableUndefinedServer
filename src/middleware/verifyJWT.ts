import { Request, Response, NextFunction } from "express";
import { HydratedDocument } from "mongoose";
import jwt from "jsonwebtoken";

import { IUserDocument, User } from "../models/User";
import { BannedToken } from "../models/BannedToken";

import { Errors } from "../utils/errors";

export interface UserRequest extends Request {
	user: HydratedDocument<IUserDocument>;
}

export async function verifyJWT(
	req: UserRequest,
	res: Response,
	next: NextFunction
) {
	const token: string = req.cookies.token;

	try {
		if (!token)
			return res.status(401).json({
				error: Errors.NO_SESSION,
				valid: false,
			});

		const bannedToken = await BannedToken.findOne({ token });

		if (bannedToken)
			return res.status(401).json({
				error: Errors.EXPIRED_TOKEN,
				valid: false,
			});
	} catch (error) {
		console.error(error);

		res.status(500).json({
			error: Errors.INTERNAL_SERVER_ERROR,
			valid: false,
		});
	}

	try {
		const decodedJWT = jwt.verify(token, <string>process.env.TOKEN_KEY);

		const user = await User.findOne({
			_id: (decodedJWT as any)._id,
		});

		if (!user)
			return res.status(401).json({
				error: Errors.USER_NOT_FOUND,
				valid: false,
			});

		await User.updateOne({ _id: user._id }, { lastActivity: new Date() });

		const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

		if (user.lastActivity < thirtyMinutesAgo) {
			await User.updateOne({ _id: user._id }, { _token: null });

			await BannedToken.create({ token });

			return res.status(403).json({
				error: Errors.EXPIRED_TOKEN,
				valid: false,
			});
		}

		delete user.password;
		delete user._token;

		req.user = user;
	} catch (error) {
		return res.status(401).json({
			error: Errors.INVALID_TOKEN,
			valid: false,
		});
	}

	return next();
}
