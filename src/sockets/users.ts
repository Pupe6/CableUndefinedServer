import { SocketWithAuth } from "..";
import { Errors } from "../utils/errors";
import { deleteUser, updateUser } from "../utils/users";

export function registerEvents(socket: SocketWithAuth) {
	socket.onWithAuth("users:update", async data => {
		try {
			if (!(data.user._id && data.password && data.updatedUser))
				return socket.emit("error", { error: Errors.MISSING_FIELDS });

			const user = await updateUser(
				data.user._id,
				data.password,
				data.updatedUser
			);

			if ("error" in user) {
				return socket.emit("error", { error: user.error.message });
			}

			user.password = undefined;

			socket.emit("users:update", { user });
		} catch (error) {
			console.error(error);
			socket.emit("error", { error: Errors.INTERNAL_SERVER_ERROR });
		}
	});

	socket.onWithAuth("users:delete", async data => {
		try {
			if (!(data.user._id && data.password))
				return socket.emit("error", { error: Errors.MISSING_FIELDS });

			const result = await deleteUser(data.user._id, data.password);

			if ("error" in result) {
				return socket.emit("error", { error: result.error.message });
			}

			socket.emit("users:delete", result);
		} catch (error) {
			console.error(error);
			socket.emit("error", { error: Errors.INTERNAL_SERVER_ERROR });
		}
	});
}

export const namespace = "/users";
