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

type Enumerate<
	N extends number,
	Acc extends number[] = []
> = Acc["length"] extends N
	? Acc[number]
	: Enumerate<N, [...Acc, Acc["length"]]>;

type IntRange<F extends number, T extends number> = Exclude<
	Enumerate<T>,
	Enumerate<F>
>;

type PowerType = "+" | "-";
type PowerRow = IntRange<0, 25>;
type PowerColumn = "l" | "r";

type OtherColumn = "a" | "b" | "c" | "d" | "e" | "f" | "g" | "h" | "i" | "j";
type MCURow = IntRange<0, 20>;
type MAINRow = IntRange<0, 30>;

// Based on the breadboard type use the correct row type
type PowerPin = `MAIN${PowerType}${PowerColumn}${PowerRow}`;
type MCUPin = `MCU${OtherColumn}${MCURow}`;
type MAINPin = `MAIN${OtherColumn}${MAINRow}`;
export type Pin = PowerPin | MCUPin | MAINPin;

export type Connection = [Pin, Pin];

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
		_collaborators: {
			type: [{ type: Types.ObjectId, required: true, ref: "User" }],
			default: [],
		},
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
			[
				{
					type: String,
					required: true,
				},
				{
					type: String,
					required: true,
				},
			],
		],
	},
	{ timestamps: true, versionKey: false }
);

export const Diagram = model<IDiagramDocument>("Diagram", diagramSchema);
