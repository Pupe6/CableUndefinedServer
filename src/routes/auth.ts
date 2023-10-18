import { Router } from "express";

import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import { createUser, getUsers } from "../utils/users";
import { verifyJWT, UserRequest } from "../middleware/verifyJWT";

import { User } from "../models/User";
import { BannedToken } from "../models/BannedToken";

export const router = Router();

router.post("/register", async (req, res) => {
	try {
		const { username, email, password } = req.body;

		if (!(username && email && password)) {
			return res
				.status(400)
				.json({ message: "Please fullfil all fields." });
		}

		let encryptedPassword = await bcrypt.hash(password, 10);

		let user = await createUser({
			username,
			email: email.toLowerCase(),
			password: encryptedPassword,
		});

		if ("err" in user) {
			return res.status(400).json({ err: user.err });
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
	} catch (err) {
		console.error(err);
		return res.status(500).json({ err: "Internal server error." });
	}
});

router.post("/login", async (req, res) => {
	try {
		const { email, password } = req.body;

		if (!(email && password))
			return res
				.status(400)
				.json({ message: "Please fullfil all fields." });

		const result = await getUsers({ email: email.toLowerCase() });

		if ("err" in result) {
			return res.status(400).json({ err: result.err });
		}

		const user = result.users[0];

		if ("err" in user) return res.status(400).json({ err: user.err });

		if (!(await bcrypt.compare(password, user.password)))
			return res.status(400).json({ err: "Invalid credentials." });

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
	} catch (err) {
		console.error(err);
		return res.status(500).json({ err: "Internal server error." });
	}
});

router.get("/logout", verifyJWT, async (req: UserRequest, res) => {
	try {
		const token = <string>req.cookies.token;

		if (!token) return res.status(400).json({ err: "No session found." });

		await User.findByIdAndUpdate(req.user._id, { _token: null });

		await BannedToken.create({ token });

		res.clearCookie("token");

		return res.status(200).json({ message: "Logged out successfully." });
	} catch (err) {
		console.error(err);
		return res.status(500).json({ err: "Internal server error." });
	}
});

router.get("/token", verifyJWT, async (_, res) => {
	try {
		res.status(200).json({ message: "Token is valid.", valid: true });
	} catch (err) {
		console.error(err);
		return res.status(500).json({ err: "Internal server error." });
	}
});

export const path = "/auth";
