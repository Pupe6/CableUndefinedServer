import { ObjectId, HydratedDocument, FilterQuery } from "mongoose";
import bcrypt from "bcryptjs";

import { User, IUserDocument, IUser } from "../models/User";
import { Errors } from "./errors";
import { BannedToken } from "../models/BannedToken";

async function getUsers(
	query: FilterQuery<IUserDocument> = {}
): Promise<
	| { error: Error }
	| { count: number; users: HydratedDocument<IUserDocument>[] }
> {
	try {
		const count = await User.countDocuments(query);

		const users: HydratedDocument<IUserDocument>[] = await User.find(query);

		return { count, users };
	} catch (error) {
		return { error };
	}
}

async function updateUser(
	userId: ObjectId,
	oldPassword: string,
	user: Partial<IUser>
): Promise<HydratedDocument<IUserDocument> | { error: Error }> {
	try {
		if (!oldPassword) throw new Error(Errors.PASSWORD_REQUIRED_FOR_ACTION);

		const userToUpdate: HydratedDocument<IUserDocument> =
			await User.findById(userId);

		// Remove empty fields
		for (let key in user) {
			if (!user[key]) delete user[key];
		}

		if (!userToUpdate) throw new Error(Errors.USER_NOT_FOUND);

		// Verify User Ownership
		if (!(await bcrypt.compare(oldPassword, userToUpdate.password)))
			throw new Error(Errors.INVALID_CREDENTIALS);

		const password = user.password || oldPassword;

		// delete _token and lastActivity fields so they don't get updated
		delete user._token;
		delete user.lastActivity;

		const updatedUser: HydratedDocument<IUserDocument> =
			await User.findByIdAndUpdate(
				userId,
				{ ...user, password: await bcrypt.hash(password, 10) },
				{
					new: true,
				}
			);

		return updatedUser;
	} catch (error) {
		return { error };
	}
}

async function deleteUser(
	userId: ObjectId,
	userPassword: string
): Promise<{ message: string } | { error: Error }> {
	try {
		if (!userPassword) throw new Error(Errors.PASSWORD_REQUIRED_FOR_ACTION);

		const userToDelete: HydratedDocument<IUserDocument> =
			await User.findById(userId);

		if (!userToDelete) throw new Error(Errors.USER_NOT_FOUND);

		// Verify User Ownership
		if (!(await bcrypt.compare(userPassword, userToDelete.password)))
			throw new Error(Errors.INVALID_CREDENTIALS);

		// Ban the user's token
		if (userToDelete._token) {
			await BannedToken.create({ token: userToDelete._token });
		}

		await User.findByIdAndDelete(userId);

		return { message: "User has been deleted." };
	} catch (error) {
		return { error };
	}
}

// TODO: maybe omit the lastActivity and _token field
async function createUser(
	user: IUser
): Promise<HydratedDocument<IUserDocument> | { error: Error }> {
	try {
		const newUser: HydratedDocument<IUserDocument> = await new User(
			user
		).save();

		return newUser;
	} catch (error) {
		return { error };
	}
}

export { getUsers, updateUser, deleteUser, createUser };
