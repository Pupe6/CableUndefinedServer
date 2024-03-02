import { Errors } from "../utils/errors";

import { SocketWithAuth } from "..";
import { predict } from "../utils/langchain";
import { z } from "mongoose-zod";

export function registerEvents(socket: SocketWithAuth) {
	const predictionSchema = z.object({
		microcontroller: z.string().min(1),
		module: z.string().min(1),
	});

	socket.onWithAuth("prediction", async (data: unknown) => {
		try {
			const parsedData = predictionSchema.safeParse(data);

			if (parsedData.success === false)
				return socket.emit("error", {
					error: Errors.INVALID_FIELDS,
					errors: parsedData.error,
				});

			const { microcontroller, module } = parsedData.data;

			const prediction = await predict(microcontroller, module);

			return socket.emit("prediction", { prediction });
		} catch (error) {
			console.error(error);
			socket.emit("error", {
				error: Errors.INTERNAL_SERVER_ERROR,
			});
		}
	});
}

export const namespace = "/";
