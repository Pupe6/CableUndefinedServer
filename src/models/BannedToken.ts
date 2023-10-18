import { Schema, model, models } from "mongoose";

export interface IBannedToken {
	token: string;
	createdAt?: Date;
	updatedAt?: Date;
}

const bannedTokenSchema = new Schema<IBannedToken>(
	{
		token: {
			type: String,
			required: [true, "Token is required."],
		},
	},
	{ timestamps: true, versionKey: false }
);

export const BannedToken =
	models["BannedToken"] || model("BannedToken", bannedTokenSchema);
