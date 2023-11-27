import { Router } from "express";

import { Errors } from "../utils/errors";

import { verifyJWT } from "../middleware/verifyJWT";

import { predict } from "../utils/langchain/index";

export const router = Router();

router.post("/predict", verifyJWT, async (req, res) => {
	const { microcontroller, module } = req.body;

	if (microcontroller === undefined || module === undefined)
		return res.status(400).json({ error: Errors.MISSING_FIELDS });

	try {
		const prediction = await predict(microcontroller, module);

		return res.status(200).json({ prediction });
	} catch (error) {
		return res.status(500).json({ error: Errors.INTERNAL_SERVER_ERROR });
	}
});

export const path = "/";
