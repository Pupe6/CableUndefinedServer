import { Router } from "express";

import { ObjectId } from "mongoose";

import { updateUser, deleteUser } from "../utils/users";
import { Errors } from "../utils/errors";
import { UserRequest, verifyJWT } from "../middleware/verifyJWT";

export const router = Router();

router.put("/:id", verifyJWT, async (req: UserRequest, res) => {
	try {
		const user = await updateUser(
			req.params._id as unknown as ObjectId,
			req.body
		);

		if ("error" in user) {
			// todo add error handling
			return res.status(400).json({ error: user.error });
		}

		user.password = undefined;

		return res.status(200).json({ user });
	} catch (error) {
		console.error(error);
		return res.status(500).json({ error: Errors.INTERNAL_SERVER_ERROR });
	}
});

router.delete("/:id", verifyJWT, async (req: UserRequest, res) => {
	try {
		const user = await deleteUser(
			req.params._id as unknown as ObjectId,
			req.body.password
		);

		if ("error" in user) {
			// todo add error handling
			return res.status(400).json({ error: user.error });
		}

		return res.status(200).json({ user });
	} catch (error) {
		console.error(error);
		return res.status(500).json({ error: Errors.INTERNAL_SERVER_ERROR });
	}
});

export const path = "/users";
