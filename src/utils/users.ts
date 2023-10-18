import { ObjectId, HydratedDocument, FilterQuery } from "mongoose";
import bcrypt from "bcryptjs";

import { User, IUser } from "../models/User";

async function getUsers(
	query: FilterQuery<IUser> = {}
): Promise<
	{ err: Error } | { count: number; users: HydratedDocument<IUser>[] }
> {
	try {
		const count = await User.countDocuments(query);

		const users: HydratedDocument<IUser>[] = await User.find(query);

		return { count, users };
	} catch (err) {
		return { err };
	}
}

async function updateUser(
	userId: ObjectId,
	user: IUser & { newPassword?: string }
): Promise<HydratedDocument<IUser> | { err: Error }> {
	try {
		if (!user.password)
			throw new Error(
				"You must provide your password to update your account."
			);

		const userToUpdate: HydratedDocument<IUser> = await User.findById(
			userId
		);

		for (let key in user) {
			if (!user[key]) delete user[key];
		}

		if (!userToUpdate)
			throw new Error("There is no such user with provided id.");

		// Verify User Ownership
		if (!(await bcrypt.compare(user.password, userToUpdate.password)))
			throw new Error("The password you entered is incorrect.");

		const password = user.newPassword || user.password;

		const updatedUser: HydratedDocument<IUser> =
			await User.findByIdAndUpdate(
				userId,
				{ ...user, password: await bcrypt.hash(password, 10) },
				{
					new: true,
				}
			);

		return updatedUser;
	} catch (err) {
		return { err };
	}
}

async function deleteUser(
	userId: ObjectId,
	userPassword: string
): Promise<{ message: string } | { err: Error }> {
	try {
		if (!userPassword)
			throw new Error(
				"You must provide your password to delete your account."
			);

		const userToDelete: HydratedDocument<IUser> = await User.findById(
			userId
		);

		if (!userToDelete)
			throw new Error("There is no such user with provided id.");

		// Verify User Ownership
		if (!(await bcrypt.compare(userPassword, userToDelete.password)))
			throw new Error("The password you entered is incorrect.");

		await User.findByIdAndDelete(userId);

		return { message: "User has been deleted." };
	} catch (err) {
		return { err };
	}
}

async function createUser(
	user: IUser
): Promise<HydratedDocument<IUser> | { err: Error }> {
	try {
		const newUser: HydratedDocument<IUser> = await new User(user).save();

		return newUser;
	} catch (err) {
		return { err };
	}
}

export { getUsers, updateUser, deleteUser, createUser };
