import { Schema, model, Types, PopulatedDoc, Document } from "mongoose";
import { IUser } from "./User";

export interface DiagramsElement {
	id: number;
	x: number;
	y: number;
	name: string;
	type: string;
	angle: number;
	locked: boolean;
	version: number;
	updated: number;
}

type Breadboard = "MCU" | "MAIN";
// TODO: Be able to know which pin of + or - is being used (ie the 25th + pin of the breadboard)
type Rows =
	| `${0 | 1 | 2 | 3 | 4 | 5}${0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9}`
	| "+"
	| "-";

// Based on the breadboard type use the correct row type
export type Pin = `${Breadboard}${Rows}`;

export type Connection = `${Pin} - ${Pin}`;

export interface IDiagram {
	_owner: PopulatedDoc<IUser & Document>;
	_collaborators: PopulatedDoc<IUser & Document>[];
	parts: DiagramsElement[];
	connections: Connection[];
}

export interface IDiagramDocument extends IDiagram, Document {}

const diagramSchema = new Schema<IDiagramDocument>(
	{
		_owner: { type: Types.ObjectId, required: true, ref: "User" },
		_collaborators: [{ type: Types.ObjectId, required: true, ref: "User" }],
		parts: [
			// ! Use the DiagramsElement type as the array type
			{
				id: { type: Number },
				x: { type: Number },
				y: { type: Number },
				name: { type: String },
				type: { type: String },
				angle: { type: Number },
				locked: { type: Boolean },
				version: { type: Number },
				updated: { type: Number },
			},
		],
		connections: [
			// ! Use the Connection type as the array type
			{
				type: String,
				required: true,
			},
		],
	},
	{ timestamps: true, versionKey: false }
);

export const Diagram = model<IDiagramDocument>("Diagram", diagramSchema);
