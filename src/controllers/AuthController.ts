// AuthController.ts
import { Response } from "express";
import { RegisterRequest } from "../types";
import { UserService } from "../services/userService";

export class AuthController {
  constructor(private userService: UserService) {
    this.userService = userService;
  }

  async register(req: RegisterRequest, res: Response): Promise<void> {
    const { firstName, lastName, email, password } = req.body;
    await this.userService.create({
      firstName,
      lastName,
      email: email.trim().toLowerCase(),
      password,
    });

    res.status(201).json({
      message: "User registered successfully",
    });
  }
}
