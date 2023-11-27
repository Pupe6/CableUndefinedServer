import { Schema, model, models, Types, PopulatedDoc, Document } from "mongoose";
import { IUser } from "./User";

export interface IDiagram {
	_owner: PopulatedDoc<IUser & Document>;
	_collaborators: PopulatedDoc<IUser & Document>[];
	// TODO: add parts
	parts: [{}];
	// TODO: add connections
	connections: [[]];
	createdAt?: Date;
	updatedAt?: Date;
}

const diagramSchema = new Schema<IDiagram>(
	{
		_owner: { type: Types.ObjectId, required: true, ref: "User" },
		_collaborators: [{ type: Types.ObjectId, required: true, ref: "User" }],
		parts: [{}],
		connections: [[]],
	},
	{ timestamps: true, versionKey: false }
);

export const Diagram = models["Diagram"] || model("Diagram", diagramSchema);
