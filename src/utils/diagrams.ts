import { FilterQuery, HydratedDocument } from "mongoose";
import { Connection, Diagram, IDiagram } from "../models/Diagram";
import { Errors } from "./errors";

async function getDiagrams(
	query: FilterQuery<IDiagram> = {}
): Promise<HydratedDocument<IDiagram>[] | { error: Error }> {
	try {
		const diagrams: HydratedDocument<IDiagram>[] = await Diagram.find(
			query
		);

		return diagrams;
	} catch (error) {
		return { error };
	}
}

async function updateDiagram(
	diagramId: Pick<IDiagram, "_id">,
	diagram: Partial<Omit<IDiagram, "_id">>
): Promise<HydratedDocument<IDiagram> | { error: Error }> {
	try {
		const diagramToUpdate: HydratedDocument<IDiagram> =
			await Diagram.findById(diagramId);

		if (!diagramToUpdate) throw new Error(Errors.NOT_FOUND);

		const updatedDiagram: HydratedDocument<IDiagram> =
			await Diagram.findByIdAndUpdate(diagramId, diagram, { new: true });

		return updatedDiagram;
	} catch (error) {
		return { error };
	}
}

async function deleteDiagram(
	diagramId: Pick<IDiagram, "_id">
): Promise<{ message: string } | { error: Error }> {
	try {
		const diagramToDelete: HydratedDocument<IDiagram> =
			await Diagram.findById(diagramId);

		if (!diagramToDelete) throw new Error(Errors.NOT_FOUND);

		await Diagram.findByIdAndDelete(diagramId);

		return { message: "Diagram has been deleted." };
	} catch (error) {
		return { error };
	}
}

// TODO: change the pick to use _owner instead of _id
// ! this was causing an error in the socket definitions
async function createDiagram(
	ownerId: Pick<IDiagram, "_id">,
	name: string = "New Diagram"
): Promise<HydratedDocument<IDiagram> | { error: Error }> {
	try {
		const newDiagram: HydratedDocument<IDiagram> = await new Diagram({
			_owner: ownerId,
			name,
		}).save();

		return newDiagram;
	} catch (error) {
		return { error };
	}
}

function connectionsMatch(
	connection1: Connection,
	connection2: Connection
): boolean {
	return (
		(connection1[0] === connection2[0] &&
			connection1[1] === connection2[1]) ||
		(connection1[0] === connection2[1] && connection1[1] === connection2[0])
	);
}

async function createConnection(
	diagramId: Pick<IDiagram, "_id">,
	connection: Connection
): Promise<HydratedDocument<IDiagram> | { error: Error }> {
	try {
		const diagram: HydratedDocument<IDiagram> = await Diagram.findById(
			diagramId
		);

		if (!diagram) throw new Error(Errors.NOT_FOUND);

		if (diagram.connections.some(c => connectionsMatch(c, connection)))
			throw new Error(Errors.CONNECTION_EXISTS);

		diagram.connections.push(connection);

		const updatedDiagram: HydratedDocument<IDiagram> = await diagram.save();

		return updatedDiagram;
	} catch (error) {
		return { error };
	}
}

async function deleteConnection(
	diagramId: Pick<IDiagram, "_id">,
	connection: Connection
): Promise<HydratedDocument<IDiagram> | { error: Error }> {
	try {
		const diagram: HydratedDocument<IDiagram> = await Diagram.findById(
			diagramId
		);

		if (!diagram) throw new Error(Errors.NOT_FOUND);

		diagram.connections = diagram.connections.filter(
			c => !connectionsMatch(c, connection)
		);

		const updatedDiagram: HydratedDocument<IDiagram> = await diagram.save();

		return updatedDiagram;
	} catch (error) {
		return { error };
	}
}

async function createPart(
	diagramId: Pick<IDiagram, "_id">,
	part: IDiagram["parts"][0]
): Promise<HydratedDocument<IDiagram> | { error: Error }> {
	try {
		const diagram: HydratedDocument<IDiagram> = await Diagram.findById(
			diagramId
		);

		if (!diagram) throw new Error(Errors.NOT_FOUND);

		diagram.parts.push(part);

		const updatedDiagram: HydratedDocument<IDiagram> = await diagram.save();

		return updatedDiagram;
	} catch (error) {
		return { error };
	}
}

async function deletePart(
	diagramId: Pick<IDiagram, "_id">,
	partId: IDiagram["parts"][0]["id"]
): Promise<HydratedDocument<IDiagram> | { error: Error }> {
	try {
		const diagram: HydratedDocument<IDiagram> = await Diagram.findById(
			diagramId
		);

		if (!diagram) throw new Error(Errors.NOT_FOUND);

		diagram.parts = diagram.parts.filter(p => p.id !== partId);

		const updatedDiagram: HydratedDocument<IDiagram> = await diagram.save();

		return updatedDiagram;
	} catch (error) {
		return { error };
	}
}

async function updatePart(
	diagramId: Pick<IDiagram, "_id">,
	part: Partial<IDiagram["parts"][0]>
): Promise<HydratedDocument<IDiagram> | { error: Error }> {
	try {
		const diagram: HydratedDocument<IDiagram> = await Diagram.findById(
			diagramId
		);

		if (!diagram) throw new Error(Errors.NOT_FOUND);

		const index = diagram.parts.findIndex(p => p.id === part.id);

		if (index === -1) throw new Error(Errors.NOT_FOUND);

		// update only the fields that are present in the part object
		diagram.parts[index] = { ...diagram.toJSON().parts[index], ...part };

		const updatedDiagram: HydratedDocument<IDiagram> = await diagram.save();

		return updatedDiagram;
	} catch (error) {
		return { error };
	}
}

export {
	getDiagrams,
	createDiagram,
	updateDiagram,
	deleteDiagram,
	createConnection,
	deleteConnection,
	createPart,
	deletePart,
	updatePart,
};
