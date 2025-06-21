// src/services/userService.ts
import { userData } from "../types";
import { User } from "../entity/User";
import { Repository } from "typeorm";
import createHttpError from "http-errors";
import { Roles } from "../constants";
import bcrypt from "bcrypt";
export class UserService {
  constructor(private userRepository: Repository<User>) {}

  async create({
    firstName,
    lastName,
    email,
    password,
    // Default role is 'customer'
  }: userData): Promise<User> {
    // Hash the password for security
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create and save the user
    try {
      const user = await this.userRepository.save({
        firstName,
        lastName,
        email: email.trim().toLowerCase(),
        password: hashedPassword,
        role: Roles.CUSTOMER, // In a real application, you should hash the password before saving
      });
      return user;
    } catch (err) {
      const error = createHttpError(500, "Error creating user");
      throw error;
    }
  }
}
