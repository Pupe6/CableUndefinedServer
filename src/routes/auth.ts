import { Router } from "express";

import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import { Errors } from "../utils/errors";
import { createUser, getUsers } from "../utils/users";
import { verifyJWT, UserRequest } from "../middleware/verifyJWT";

import { User } from "../models/User";
import { BannedToken } from "../models/BannedToken";

export const router = Router();

router.post("/register", async (req, res) => {
	try {
		const { username, email, password } = req.body;

		if (!(username && email && password)) {
			return res.status(400).json({ error: Errors.MISSING_FIELDS });
		}

		let encryptedPassword = await bcrypt.hash(password, 10);

		let user = await createUser({
			username,
			email: email.toLowerCase(),
			password: encryptedPassword,
		});

		if ("error" in user) {
			// todo add error handling
			return res.status(400).json({ error: user.error });
		}

		user._token = jwt.sign(
			{
				_id: user._id,
				username: user.username,
			},
			process.env.TOKEN_KEY
		);

		await user.save();

		res.cookie("token", user._token, {
			httpOnly: true,
			secure: process.env.NODE_ENV === "production",
			sameSite: "none",
			maxAge: 60 * 60 * 1000,
		});

		return res.status(201).json({
			user: {
				...user.toJSON(),
				password: undefined,
				_token: undefined,
			},
		});
	} catch (error) {
		console.error(error);
		return res.status(500).json({ error: Errors.INTERNAL_SERVER_ERROR });
	}
});

router.post("/login", async (req, res) => {
	try {
		const { email, password } = req.body;

		if (!(email && password))
			return res.status(400).json({ error: Errors.MISSING_FIELDS });

		const result = await getUsers({ email: email.toLowerCase() });

		if ("error" in result) {
			// todo add error handling
			return res.status(400).json({ error: result.error });
		}

		const user = result.users[0];

		// todo add error handling
		if ("error" in user) return res.status(400).json({ error: user.error });

		if (!(await bcrypt.compare(password, user.password)))
			return res.status(400).json({ error: Errors.INVALID_CREDENTIALS });

		const token = jwt.sign(
			{
				_id: user._id,
				username: user.username,
			},
			process.env.TOKEN_KEY
		);

		res.cookie("token", token, {
			httpOnly: true,
			secure: process.env.NODE_ENV === "production",
			sameSite: "none",
			maxAge: 60 * 60 * 1000,
		});

		if (user._token) await BannedToken.create({ token: user._token });

		user._token = token;
		user.lastActivity = new Date();

		await user.save();

		return res.status(200).json({
			user: {
				...user.toJSON(),
				password: undefined,
				_token: undefined,
			},
		});
	} catch (error) {
		console.error(error);
		return res.status(500).json({ error: Errors.INTERNAL_SERVER_ERROR });
	}
});

router.get("/logout", verifyJWT, async (req: UserRequest, res) => {
	try {
		const token = <string>req.cookies.token;

		await User.findByIdAndUpdate(req.user._id, { _token: null });

		await BannedToken.create({ token });

		res.clearCookie("token");

		return res.status(200).json({ message: "Logged out successfully." });
	} catch (error) {
		console.error(error);
		return res.status(500).json({ error: Errors.INTERNAL_SERVER_ERROR });
	}
});

router.get("/token", verifyJWT, async (_, res) => {
	try {
		res.status(200).json({ message: "Token is valid.", valid: true });
	} catch (error) {
		console.error(error);
		return res.status(500).json({ error: Errors.INTERNAL_SERVER_ERROR });
	}
});

export const path = "/auth";
