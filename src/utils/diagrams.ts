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

// TODO: add the rest of the functions

export { getDiagrams };
