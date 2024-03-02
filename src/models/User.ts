import { Types, model } from "mongoose";
import { z, toMongooseSchema, mongooseZodCustomType } from "mongoose-zod";

export const UserSchema = z
	.object({
		_id: mongooseZodCustomType("ObjectId")
			.optional()
			.default(new Types.ObjectId()),
		username: z.string().min(1).trim(),
		email: z.string().min(1).email().trim(),
		password: z.string().min(1).trim(),
		lastActivity: z.date().optional().default(new Date()),
		_token: z.string().optional().nullable(),
		createdAt: z.date().optional().default(new Date()),
		updatedAt: z.date().optional().default(new Date()),
	})
	.strict()
	.mongoose({
		schemaOptions: { timestamps: true, versionKey: false },
		typeOptions: {
			username: { required: true, unique: true },
			email: {
				required: true,
				unique: true,
				match: /^[A-Za-z0-9_\.]+@[A-Za-z]+\.[A-Za-z]{2,3}$/,
			},
			password: { required: true },
		},
	});

export type IUser = z.infer<typeof UserSchema>;

const UserMongooseSchema = toMongooseSchema(UserSchema);

export const User = model("User", UserMongooseSchema);
