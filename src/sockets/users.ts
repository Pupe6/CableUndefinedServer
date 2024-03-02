import { mongooseZodCustomType, z } from "mongoose-zod";
import { SocketWithAuth } from "..";
import { Errors } from "../utils/errors";
import { deleteUser, updateUser } from "../utils/users";

export function registerEvents(socket: SocketWithAuth) {
	const usersUpdateSchema = z
		.object({
			user: z.object({
				_id: mongooseZodCustomType("ObjectId"),
			}),
			password: z.string(),
			updatedUser: z
				.object({
					username: z.string().optional(),
					email: z.string().optional(),
					password: z.string().optional(),
				})
				.strict(),
		})
		.strict();

	socket.onWithAuth("users:update", async (data: unknown) => {
		try {
			const parsedData = usersUpdateSchema.safeParse(data);

			if (parsedData.success === false)
				return socket.emit("error", {
					error: Errors.INVALID_FIELDS,
					errors: parsedData.error,
				});

			const { user, password, updatedUser } = parsedData.data;

			const result = await updateUser(user._id, password, updatedUser);

			if ("error" in result) {
				return socket.emit("error", { error: result.error.message });
			}

			result.password = undefined;

			socket.emit("users:update", { user: result });
		} catch (error) {
			console.error(error);

			socket.emit("error", { error: Errors.INTERNAL_SERVER_ERROR });
		}
	});

	const usersDeleteSchema = z
		.object({
			user: z.object({
				_id: mongooseZodCustomType("ObjectId"),
			}),
			password: z.string(),
		})
		.strict();

	socket.onWithAuth("users:delete", async (data: unknown) => {
		try {
			const parsedData = usersDeleteSchema.safeParse(data);

			if (parsedData.success === false)
				return socket.emit("error", {
					error: Errors.INVALID_FIELDS,
					errors: parsedData.error,
				});

			const { user, password } = parsedData.data;

			const result = await deleteUser(user._id, password);

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
