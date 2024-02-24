import { Schema, model, Document } from "mongoose";

export interface IBannedToken {
	token: string;
}

export interface IBannedTokenDocument extends IBannedToken, Document {}

const bannedTokenSchema = new Schema<IBannedTokenDocument>(
	{
		token: {
			type: String,
			required: [true, "Token is required."],
		},
	},
	{ timestamps: true, versionKey: false }
);

export const BannedToken = model<IBannedTokenDocument>(
	"BannedToken",
	bannedTokenSchema
);
