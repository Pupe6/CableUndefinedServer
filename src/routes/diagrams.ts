import { Router } from "express";

import { Errors } from "../utils/errors";
import { UserRequest, verifyJWT } from "../middleware/verifyJWT";
import { getDiagrams } from "../utils/diagrams";

export const router = Router();

// only owner and collaborators can access check the db and the jwt
router.get("/:id", verifyJWT, async (req: UserRequest, res) => {
	const { id } = req.params;
	const { user } = req;

	try {
		const results = await getDiagrams({ _id: id });

		if ("error" in results) {
			return res.status(500).json({ error: results.error });
		}

		const diagram = results[0];

		if (!diagram) {
			return res.status(404).json({ error: Errors.NOT_FOUND });
		}

		if (
			!diagram._collaborators.includes(user._id) &&
			!diagram._owner.equals(user._id)
		) {
			return res.status(403).json({ error: Errors.INVALID_CREDENTIALS });
		}

		return res.status(200).json(diagram);
	} catch (err) {
		return res.status(500).json({ error: Errors.INTERNAL_SERVER_ERROR });
	}
});

// TODO: add the rest of the routes

export const path = "/diagrams";
