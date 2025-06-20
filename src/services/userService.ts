// userService.ts
import { userData } from "../types";
import { User } from "../entity/User";
import { AppDataSource } from "../config/data-source";
import { Repository } from "typeorm";

export class UserService {
  constructor(private userRepository: Repository<User>) {
    // You can initialize any dependencies here if needed
  }
  async create({
    firstName,
    lastName,
    email,
    password,
  }: userData): Promise<void> {
    await this.userRepository.save({
      firstName,
      lastName,
      email: email.trim().toLowerCase(),
      password,
    });
  }
}
