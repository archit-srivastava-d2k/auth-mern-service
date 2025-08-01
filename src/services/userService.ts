// src/services/userService.ts
import { LimitedUserData, userData, UserQueryParams } from "../types";
import { User } from "../entity/User";
import { Brackets, Repository } from "typeorm";
import createHttpError from "http-errors";
import { Roles } from "../constants";
import bcrypt from "bcryptjs";
export class UserService {
  constructor(private readonly userRepository: Repository<User>) {}

  async create({
    firstName,
    lastName,
    email,
    password,
    role,
    tenantId,
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
        role,
      });
      return user;
    } catch (err) {
      const error = createHttpError(500, "Error creating user");
      throw error;
    }
  }

  async findByEmailWithPassword(email: string) {
    return await this.userRepository.findOne({
      where: {
        email,
      },
      select: ["id", "firstName", "lastName", "email", "role", "password"],
      relations: {
        tenant: true,
      },
    });
  }
  async findById(id: number) {
    const user = await this.userRepository.findOne({
      where: { id: id },
    });
    return user;
  }

  async deleteById(userId: number) {
    return await this.userRepository.delete(userId);
  }

  async update(
    userId: number,
    { firstName, lastName, role, email, tenantId }: LimitedUserData,
  ) {
    try {
      return await this.userRepository.update(userId, {
        firstName,
        lastName,
        role,
        email,
        tenant: tenantId ? { id: tenantId } : null,
      });
    } catch (err) {
      const error = createHttpError(
        500,
        "Failed to update the user in the database",
      );
      throw error;
    }
  }

  async getAll(validatedQuery: UserQueryParams) {
    const queryBuilder = this.userRepository.createQueryBuilder("user");

    if (validatedQuery.q) {
      const searchTerm = `%${validatedQuery.q}%`;
      queryBuilder.where(
        new Brackets((qb) => {
          qb.where("CONCAT(user.firstName, ' ', user.lastName) ILike :q", {
            q: searchTerm,
          }).orWhere("user.email ILike :q", { q: searchTerm });
        }),
      );
    }

    if (validatedQuery.role) {
      queryBuilder.andWhere("user.role = :role", {
        role: validatedQuery.role,
      });
    }

    const result = await queryBuilder
      .leftJoinAndSelect("user.tenant", "tenant")
      .skip((validatedQuery.currentPage - 1) * validatedQuery.perPage)
      .take(validatedQuery.perPage)
      .orderBy("user.id", "DESC")
      .getManyAndCount();
    return result;
  }
}
