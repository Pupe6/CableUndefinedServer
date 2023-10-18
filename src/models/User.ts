import { Schema, model, models } from "mongoose";

export interface IUser {
	username: string;
	email: string;
	password: string;
	lastActivity?: Date;
	_token?: string | null;
	createdAt?: Date;
	updatedAt?: Date;
}

const userSchema = new Schema<IUser>(
	{
		username: {
			type: String,
			required: [true, "Username is required."],
			// @ts-ignore
			unique: [true, 'The username "{VALUE}" is already taken.'],
			trim: true,
		},
		email: {
			type: String,
			required: [true, "Email is required"],
			unique: [true, 'The email "{VALUE}" is already taken.'],
			// @ts-ignore
			match: [
				/^[A-Za-z0-9_\.]+@[A-Za-z]+\.[A-Za-z]{2,3}$/,
				'"{VALUE}" is not a valid email.',
			],
		},
		password: {
			type: String,
			required: [true, "Password is required."],
			trim: true,
		},
		lastActivity: {
			type: Date,
			default: new Date(),
		},
		_token: {
			type: String,
		},
	},
	{ timestamps: true, versionKey: false }
);

export const User = models["User"] || model("User", userSchema);
