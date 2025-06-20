// src/controllers/AuthController.ts
import { NextFunction, Response } from "express";
import { RegisterRequest } from "../types";
import { UserService } from "../services/userService";
import { Logger } from "winston";

export class AuthController {
  constructor(
    private userService: UserService,
    private logger: Logger,
  ) {
    this.userService = userService; // Removed redundant assignment
  } // Removed redundant assignment

  async register(
    req: RegisterRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    const { firstName, lastName, email, password } = req.body;

    try {
      const user = await this.userService.create({
        firstName,
        lastName,
        email,
        password,
      });
      this.logger.debug("User registration data", {
        firstName,
        lastName,
        email: email.trim().toLowerCase(),
        password: "*****",
      }); // In a real application, you should not log the password
      this.logger.info("User registered successfully", {
        userId: user.id,
      });
      res.status(201).json({
        message: "User registered successfully",
        userId: user.id,
      });
    } catch (error) {
      next(error); // Pass the error to the next middleware
    }
  }
}
