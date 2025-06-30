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
  }: userData): Promise<User> {
    // Check if the user already exists
    const existingUser = await this.userRepository.findOne({
      where: { email: email.trim().toLowerCase() },
    });
    if (existingUser) {
      const error = createHttpError(400, "User already exists");
      throw error;
    }
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    try {
      const user = await this.userRepository.save({
        firstName,
        lastName,
        email: email.trim().toLowerCase(),
        password: hashedPassword,
        role: Roles.CUSTOMER,
      });
      return user;
    } catch (err) {
      const error = createHttpError(500, "Error creating user");
      throw error;
    }
  }

  async findByEmail(email: string) {
    const user = await this.userRepository.findOne({
      where: { email: email.trim().toLowerCase() },
    });
    return user;
  }

  async findById(id: number) {
    const user = await this.userRepository.findOne({
      where: { id: id },
    });
    return user;
  }
}
