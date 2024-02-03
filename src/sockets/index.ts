import { Errors } from "../utils/errors";

import { SocketWithAuth } from "..";
import { predict } from "../utils/langchain";

export function registerEvents(socket: SocketWithAuth) {
	socket.onWithAuth("prediction", async data => {
		try {
			const { microcontroller, module } = data;

			if (!(microcontroller && module))
				return socket.emit("error", { error: Errors.MISSING_FIELDS });

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
