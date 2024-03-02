import { model } from "mongoose";
import { toMongooseSchema, z } from "mongoose-zod";

export const BannedTokenSchema = z
	.object({
		token: z.string().min(1),
	})
	.mongoose({
		schemaOptions: { timestamps: true, versionKey: false },
	});

export type IBannedToken = z.infer<typeof BannedTokenSchema>;

const BannedTokenMongooseSchema = toMongooseSchema(BannedTokenSchema);

export const BannedToken = model("BannedToken", BannedTokenMongooseSchema);
