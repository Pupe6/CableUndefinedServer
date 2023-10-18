import { Router } from "express";

import { ObjectId } from "mongoose";

import { updateUser, deleteUser } from "../utils/users";
import { UserRequest, verifyJWT } from "../middleware/verifyJWT";

export const router = Router();

router.put("/:id", verifyJWT, async (req: UserRequest, res) => {
	try {
		const user = await updateUser(
			req.params._id as unknown as ObjectId,
			req.body
		);

		if ("err" in user) {
			return res.status(400).json({ err: user.err });
		}

		user.password = undefined;

		return res.status(200).json({ user });
	} catch (err) {
		console.error(err);
		return res.status(500).json({ err: "Internal server error." });
	}
});

router.delete("/:id", verifyJWT, async (req: UserRequest, res) => {
	try {
		const user = await deleteUser(
			req.params._id as unknown as ObjectId,
			req.body.password
		);

		if ("err" in user) {
			return res.status(400).json({ err: user.err });
		}

		return res.status(200).json({ user });
	} catch (err) {
		console.error(err);
		return res.status(500).json({ err: "Internal server error." });
	}
});

export const path = "/users";
