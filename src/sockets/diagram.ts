import { z } from "mongoose-zod";
import { SocketWithAuth } from "..";
import {
	createConnection,
	createDiagram,
	createPart,
	deleteConnection,
	deleteDiagram,
	deletePart,
	getDiagrams,
	updateDiagram,
	updatePart,
} from "../utils/diagrams";
import { Errors } from "../utils/errors";
import { Types } from "mongoose";
import { JWTUserSchema } from "../middleware/authenticateWS";
import { ConnectionSchema, PartSchema } from "../models/Diagram";

async function userHasAccessToDiagram(
	diagramId: string | Types.ObjectId,
	userId: string | Types.ObjectId
) {
	const result = await getDiagrams({
		_id: new Types.ObjectId(diagramId),
		$or: [{ _owner: userId }, { _collaborators: userId }],
	});

	if ("error" in result) {
		return false;
	}

	return result.length > 0;
}

export function registerEvents(socket: SocketWithAuth) {
	const diagramsGetSchema = JWTUserSchema;

	// get the diagrams the user has access to - owns or collaborates on
	socket.onWithAuth("diagrams:get", async (data: unknown) => {
		try {
			const parsedData = diagramsGetSchema.safeParse(data);

			if (parsedData.success === false) {
				return socket.emit("error", {
					error: Errors.INVALID_FIELDS,
					errors: parsedData.error,
				});
			}

			const { user } = parsedData.data;

			const diagrams = await getDiagrams({
				$or: [{ _owner: user._id }, { _collaborators: user._id }],
			});

			if ("error" in diagrams) {
				return socket.emit("error", {
					error: diagrams.error.message,
				});
			}

			socket.emit("diagrams:get", { diagrams });
		} catch (error) {
			console.error(error);

			socket.emit("error", { error: Errors.INTERNAL_SERVER_ERROR });
		}
	});

	const diagramsCreateSchema = z
		.object({
			name: z.string().optional().default("New Diagram"),
		})
		.merge(JWTUserSchema)
		.strict();

	// create a new diagram
	socket.onWithAuth("diagrams:create", async (data: unknown) => {
		try {
			const parsedData = diagramsCreateSchema.safeParse(data);

			if (parsedData.success === false) {
				return socket.emit("error", {
					error: Errors.INVALID_FIELDS,
					// TODO: fix zod errors in response
					errors: parsedData.error,
				});
			}

			const { user, name } = parsedData.data;

			const diagram = await createDiagram(user._id, name);

			if ("error" in diagram) {
				return socket.emit("error", {
					error: diagram.error.message,
				});
			}

			socket.emit("diagrams:create", { diagram });
		} catch (error) {
			console.error(error);

			socket.emit("error", { error: Errors.INTERNAL_SERVER_ERROR });
		}
	});

	const diagramsUpdateSchema = z
		.object({
			diagram: z.object({
				_id: z.string().refine(Types.ObjectId.isValid),
			}),
			update: z
				.object({
					name: z.string().optional(),
					description: z.string().optional(),
				})
				.strict(),
		})
		.merge(JWTUserSchema)
		.strict();

	// update a diagram
	socket.onWithAuth("diagrams:update", async (data: unknown) => {
		try {
			const parsedData = diagramsUpdateSchema.safeParse(data);

			if (parsedData.success === false) {
				return socket.emit("error", {
					error: Errors.INVALID_FIELDS,
					errors: parsedData.error,
				});
			}

			const { diagram, update, user } = parsedData.data;

			const diagramToUpdate = await getDiagrams({
				_id: new Types.ObjectId(diagram._id),
			});

			if ("error" in diagramToUpdate) {
				return socket.emit("error", {
					error: diagramToUpdate.error.message,
				});
			}

			if (diagramToUpdate.length === 0) {
				return socket.emit("error", {
					error: Errors.NOT_FOUND,
				});
			}

			// check if the user is the owner of the diagram
			if (!diagramToUpdate[0]._owner.equals(user._id)) {
				return socket.emit("error", {
					error: Errors.UNAUTHORIZED,
				});
			}

			const result = await updateDiagram(
				new Types.ObjectId(diagram._id),
				update
			);

			if ("error" in result) {
				return socket.emit("error", {
					error: result.error.message,
				});
			}

			socket.emit("diagrams:update", result);
		} catch (error) {
			console.error(error);

			socket.emit("error", { error: Errors.INTERNAL_SERVER_ERROR });
		}
	});

	const diagramsDeleteSchema = z
		.object({
			diagram: z.object({
				_id: z.string().refine(Types.ObjectId.isValid),
			}),
		})
		.merge(JWTUserSchema)
		.strict();

	// delete a diagram
	socket.onWithAuth("diagrams:delete", async (data: unknown) => {
		try {
			const parsedData = diagramsDeleteSchema.safeParse(data);

			if (parsedData.success === false) {
				return socket.emit("error", {
					error: Errors.INVALID_FIELDS,
					errors: parsedData.error,
				});
			}

			const { diagram, user } = parsedData.data;

			const diagramToDelete = await getDiagrams({
				_id: new Types.ObjectId(diagram._id),
			});

			if ("error" in diagramToDelete) {
				return socket.emit("error", {
					error: diagramToDelete.error.message,
				});
			}

			if (diagramToDelete.length === 0) {
				return socket.emit("error", {
					error: Errors.NOT_FOUND,
				});
			}

			if (diagramToDelete[0]._owner !== user._id) {
				return socket.emit("error", {
					error: Errors.UNAUTHORIZED,
				});
			}

			const result = await deleteDiagram(new Types.ObjectId(diagram._id));

			if ("error" in result) {
				return socket.emit("error", {
					error: result.error.message,
				});
			}

			socket.emit("diagrams:delete", result);
		} catch (error) {
			console.error(error);

			socket.emit("error", { error: Errors.INTERNAL_SERVER_ERROR });
		}
	});

	const diagramsConnectionsCreateSchema = z
		.object({
			diagram: z.object({
				_id: z.string().refine(Types.ObjectId.isValid),
			}),
			connection: ConnectionSchema,
		})
		.merge(JWTUserSchema)
		.strict();

	// create a connection
	socket.onWithAuth("diagrams:connections:create", async (data: unknown) => {
		try {
			const parsedData = diagramsConnectionsCreateSchema.safeParse(data);

			if (parsedData.success === false) {
				return socket.emit("error", {
					error: Errors.INVALID_FIELDS,
					errors: parsedData.error,
				});
			}

			const { diagram, connection, user } = parsedData.data;

			if (!(await userHasAccessToDiagram(diagram._id, user._id))) {
				return socket.emit("error", {
					error: Errors.UNAUTHORIZED,
				});
			}

			const result = await createConnection(
				new Types.ObjectId(diagram._id),
				connection
			);

			if ("error" in result) {
				return socket.emit("error", {
					error: result.error.message,
				});
			}

			socket.emit("diagrams:connections:create", { diagram: result });
		} catch (error) {
			console.error(error);

			socket.emit("error", { error: Errors.INTERNAL_SERVER_ERROR });
		}
	});

	const diagramsConnectionsDeleteSchema = diagramsConnectionsCreateSchema;

	// delete a connection
	socket.onWithAuth("diagrams:connections:delete", async (data: unknown) => {
		try {
			const parsedData = diagramsConnectionsDeleteSchema.safeParse(data);

			if (parsedData.success === false) {
				return socket.emit("error", {
					error: Errors.INVALID_FIELDS,
					errors: parsedData.error,
				});
			}

			const { diagram, connection, user } = parsedData.data;

			if (!(await userHasAccessToDiagram(diagram._id, user._id))) {
				return socket.emit("error", {
					error: Errors.UNAUTHORIZED,
				});
			}

			// TODO: when deleting a connection that doesn't exist maybe return an error
			const result = await deleteConnection(
				new Types.ObjectId(diagram._id),
				connection
			);

			if ("error" in result) {
				return socket.emit("error", {
					error: result.error.message,
				});
			}

			socket.emit("diagrams:connections:delete", { diagram: result });
		} catch (error) {
			console.error(error);

			socket.emit("error", { error: Errors.INTERNAL_SERVER_ERROR });
		}
	});

	const diagramsPartsCreateSchema = z
		.object({
			diagram: z.object({
				_id: z.string().refine(Types.ObjectId.isValid),
			}),
			part: PartSchema.strict(),
		})
		.merge(JWTUserSchema)
		.strict();

	// create a part
	socket.onWithAuth("diagrams:parts:create", async (data: unknown) => {
		try {
			const parsedData = diagramsPartsCreateSchema.safeParse(data);

			if (parsedData.success === false) {
				return socket.emit("error", {
					error: Errors.INVALID_FIELDS,
					errors: parsedData.error,
				});
			}

			const { diagram, part, user } = parsedData.data;

			if (!(await userHasAccessToDiagram(diagram._id, user._id))) {
				return socket.emit("error", {
					error: Errors.UNAUTHORIZED,
				});
			}

			const result = await createPart(
				new Types.ObjectId(diagram._id),
				part
			);

			if ("error" in result) {
				return socket.emit("error", {
					error: result.error.message,
				});
			}

			socket.emit("diagrams:parts:create", { diagram: result });
		} catch (error) {
			console.error(error);

			socket.emit("error", { error: Errors.INTERNAL_SERVER_ERROR });
		}
	});

	const diagramsPartsDeleteSchema = z
		.object({
			diagram: z.object({
				_id: z.string().refine(Types.ObjectId.isValid),
			}),
			part: PartSchema.pick({ id: true }).strict(),
		})
		.merge(JWTUserSchema)
		.strict();

	// delete a part
	socket.onWithAuth("diagrams:parts:delete", async (data: unknown) => {
		try {
			const parsedData = diagramsPartsDeleteSchema.safeParse(data);

			if (parsedData.success === false) {
				return socket.emit("error", {
					error: Errors.INVALID_FIELDS,
					errors: parsedData.error,
				});
			}

			const { diagram, part, user } = parsedData.data;

			if (!(await userHasAccessToDiagram(diagram._id, user._id))) {
				return socket.emit("error", {
					error: Errors.UNAUTHORIZED,
				});
			}

			const result = await deletePart(
				new Types.ObjectId(diagram._id),
				part.id
			);

			if ("error" in result) {
				return socket.emit("error", {
					error: result.error.message,
				});
			}

			socket.emit("diagrams:parts:delete", { diagram: result });
		} catch (error) {
			console.error(error);

			socket.emit("error", { error: Errors.INTERNAL_SERVER_ERROR });
		}
	});

	const diagramsPartsUpdateSchema = z
		.object({
			diagram: z.object({
				_id: z.string().refine(Types.ObjectId.isValid),
			}),
			part: PartSchema.partial().refine(part => {
				return !!part.id;
			}),
		})
		.merge(JWTUserSchema)
		.strict();

	// update a part
	socket.onWithAuth("diagrams:parts:update", async (data: unknown) => {
		try {
			const parsedData = diagramsPartsUpdateSchema.safeParse(data);

			if (parsedData.success === false) {
				return socket.emit("error", {
					error: Errors.INVALID_FIELDS,
					errors: parsedData.error,
				});
			}

			const { diagram, part, user } = parsedData.data;

			if (!(await userHasAccessToDiagram(diagram._id, user._id))) {
				return socket.emit("error", {
					error: Errors.UNAUTHORIZED,
				});
			}

			const result = await updatePart(
				new Types.ObjectId(diagram._id),
				part
			);

			if ("error" in result) {
				return socket.emit("error", {
					error: result.error.message,
				});
			}

			socket.emit("diagrams:parts:update", { diagram: result });
		} catch (error) {
			console.error(error);

			socket.emit("error", { error: Errors.INTERNAL_SERVER_ERROR });
		}
	});
}

export const namespace = "/diagrams";
