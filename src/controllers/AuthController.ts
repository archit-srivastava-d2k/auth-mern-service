// src/controllers/AuthController.ts
import { NextFunction, Response } from "express";
import { RegisterRequest } from "../types";
import { UserService } from "../services/userService";
import { Logger } from "winston";
import { validationResult } from "express-validator";

export class AuthController {
  constructor(
    private userService: UserService,
    private logger: Logger,
  ) {
    this.userService = userService; // Removed redundant assignment
  } // Removed redundant assignment

  async register(req: RegisterRequest, res: Response, next: NextFunction) {
    const result = validationResult(req);
    if (!result.isEmpty()) {
      res.status(400).json({ errors: result.array() });
      return;
    }

    const { firstName, lastName, email, password } = req.body;

    try {
      const user = await this.userService.create({
        firstName,
        lastName,
        email,
        password,
      });

      if (!user.email) {
        const error = new Error("Email is required");
        this.logger.error(error.message);
        res.status(400).json({ message: error.message });
        return;
      }
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
