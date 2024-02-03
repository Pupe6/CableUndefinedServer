import { ObjectId, HydratedDocument, FilterQuery } from "mongoose";
import bcrypt from "bcryptjs";

import { User, IUser } from "../models/User";
import { Errors } from "./errors";

async function getUsers(
	query: FilterQuery<IUser> = {}
): Promise<
	{ error: Error } | { count: number; users: HydratedDocument<IUser>[] }
> {
	try {
		const count = await User.countDocuments(query);

		const users: HydratedDocument<IUser>[] = await User.find(query);

		return { count, users };
	} catch (error) {
		return { error };
	}
}

async function updateUser(
	userId: ObjectId,
	oldPassword: string,
	user: IUser
): Promise<HydratedDocument<IUser> | { error: Error }> {
	try {
		if (!oldPassword) throw new Error(Errors.PASSWORD_REQUIRED_FOR_ACTION);

		const userToUpdate: HydratedDocument<IUser> = await User.findById(
			userId
		);

		for (let key in user) {
			if (!user[key]) delete user[key];
		}

		if (!userToUpdate) throw new Error(Errors.USER_NOT_FOUND);

		// Verify User Ownership
		if (!(await bcrypt.compare(oldPassword, userToUpdate.password)))
			throw new Error(Errors.INVALID_CREDENTIALS);

		const password = user.password || oldPassword;

		const updatedUser: HydratedDocument<IUser> =
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

		const userToDelete: HydratedDocument<IUser> = await User.findById(
			userId
		);

		if (!userToDelete) throw new Error(Errors.USER_NOT_FOUND);

		// Verify User Ownership
		if (!(await bcrypt.compare(userPassword, userToDelete.password)))
			throw new Error(Errors.INVALID_CREDENTIALS);

		await User.findByIdAndDelete(userId);

		return { message: "User has been deleted." };
	} catch (error) {
		return { error };
	}
}

async function createUser(
	user: IUser
): Promise<HydratedDocument<IUser> | { error: Error }> {
	try {
		const newUser: HydratedDocument<IUser> = await new User(user).save();

		return newUser;
	} catch (error) {
		return { error };
	}
}

export { getUsers, updateUser, deleteUser, createUser };
