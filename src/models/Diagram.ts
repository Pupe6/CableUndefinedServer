import { model } from "mongoose";
import { z, mongooseZodCustomType, toMongooseSchema } from "mongoose-zod";

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

// type PowerType = "+" | "-";
// type PowerRow = IntRange<0, 25>;
// type PowerColumn = "L" | "R";

type OtherColumn = "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H";
type MCURow = IntRange<0, 4>;
type MAINRow = IntRange<0, 12>;

// Based on the breadboard type use the correct row type
// type PowerPin = `MAIN${PowerType}${PowerColumn}${PowerRow}`;
type MCUPin = `MCU${OtherColumn}${MCURow}`;
type MAINPin = `MAIN${OtherColumn}${MAINRow}`;
type Pin = MCUPin | MAINPin;

const PinSchema = z
	.string()
	.regex(/^MCU[A-H][0-3]|MAIN[A-H]([0-9]|1[01])$/) as z.ZodType<
	Pin,
	any,
	any
>;

export const ConnectionSchema = z.tuple([PinSchema, PinSchema]);

export type Connection = z.infer<typeof ConnectionSchema>;

// ! Note this doesn't check if id is a unique id
// TODO: Add a check for unique id
export const PartSchema = z.object({
	id: z.number(),
	x: z.number(),
	y: z.number(),
	name: z.string(),
	type: z.string(),
	angle: z.number(),
	locked: z.boolean(),
	version: z.number(),
	updated: z.number(),
});

export const DiagramSchema = z
	.object({
		_id: mongooseZodCustomType("ObjectId").optional(),
		name: z.string().optional().default("New Diagram"),
		_owner: mongooseZodCustomType("ObjectId"),
		_collaborators: z
			.array(mongooseZodCustomType("ObjectId"))
			.optional()
			.default([]),
		parts: z.array(PartSchema).optional().default([]),
		connections: z.array(ConnectionSchema).optional().default([]),
		createdAt: z.date().optional().default(new Date()),
		updatedAt: z.date().optional().default(new Date()),
	})
	.strict()
	.mongoose({
		schemaOptions: { timestamps: true, versionKey: false },
		typeOptions: {
			_id: { auto: true },
			_owner: { required: true, ref: "User" },
			_collaborators: { ref: "User" },
		},
	});

export type IDiagram = z.infer<typeof DiagramSchema>;

const DiagramMongooseSchema = toMongooseSchema(DiagramSchema);

export const Diagram = model("Diagram", DiagramMongooseSchema);
