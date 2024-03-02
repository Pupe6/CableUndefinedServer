import { FilterQuery, HydratedDocument } from "mongoose";
import { Diagram, IDiagramDocument } from "../models/Diagram";
import { Errors } from "./errors";

async function getDiagrams(
	query: FilterQuery<IDiagramDocument> = {}
): Promise<
	| { error: Error }
	| { count: number; diagrams: HydratedDocument<IDiagramDocument>[] }
> {
	try {
		const count = await Diagram.countDocuments(query);

		const diagrams: HydratedDocument<IDiagramDocument>[] =
			await Diagram.find(query);

		return { count, diagrams };
	} catch (error) {
		return { error };
	}
}

async function deleteDiagram(
	diagramId: string
): Promise<{ message: string } | { error: Error }> {
	try {
		if (!diagramId) throw new Error(Errors.MISSING_FIELDS);

		const diagramToDelete: HydratedDocument<IDiagramDocument> =
			await Diagram.findById(diagramId);

		if (!diagramToDelete) throw new Error(Errors.NOT_FOUND);

		await Diagram.findByIdAndDelete(diagramId);

		return { message: "Diagram has been deleted." };
	} catch (error) {
		return { error };
	}
}

async function createDiagram(
	ownerId: string
): Promise<HydratedDocument<IDiagramDocument> | { error: Error }> {
	try {
		const newDiagram: HydratedDocument<IDiagramDocument> =
			await new Diagram({ _owner: ownerId }).save();

		return newDiagram;
	} catch (error) {
		return { error };
	}
}

export { getDiagrams, deleteDiagram };
