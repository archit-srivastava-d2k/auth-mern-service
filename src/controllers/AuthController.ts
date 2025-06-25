import path from "path";
import fs from "fs";
import { NextFunction, Response } from "express";
import { RegisterRequest } from "../types";
import { UserService } from "../services/userService";
import { Logger } from "winston";
import { validationResult } from "express-validator";
import { JwtPayload, sign } from "jsonwebtoken";
import createHttpError from "http-errors";
import { serverConfig } from "../config";

export class AuthController {
  constructor(
    private userService: UserService,
    private logger: Logger,
  ) {
    this.userService = userService;
  }

  async register(req: RegisterRequest, res: Response, next: NextFunction) {
    const result = validationResult(req);
    if (!result.isEmpty()) {
      res.status(400).json({ errors: result.array() });
      return;
    }

    const { firstName, lastName, email, password } = req.body;

    if (!firstName || !lastName || !email || !password) {
      const error = new Error("All fields are required");
      this.logger.error(error.message);
      res.status(400).json({ message: error.message });
      return;
    }

    try {
      const user = await this.userService.create({
        firstName,
        lastName,
        email,
        password,
      });

      let privateKey: Buffer;
      try {
        privateKey = fs.readFileSync(
          path.join(__dirname, "../../certs/private.pem"),
        );
      } catch (error) {
        const err = createHttpError(500, "Private key not found");
        next(err);
        return;
      }

      const payload: JwtPayload = {
        sub: String(user.id),
        role: user.role,
      };

      const accessToken = sign(payload, privateKey, {
        algorithm: "RS256",
        expiresIn: "1h",
        issuer: "auth-service",
      });

      const refreshToken = sign(payload, serverConfig.REFRESH_TOKEN_SECRET!, {
        algorithm: "HS256",
        expiresIn: "1y",
        issuer: "auth-service",
      });

      // ✅ Set access token in HttpOnly cookie
      res.cookie("accessToken", accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production", // will be false in test
        sameSite: "strict",
        maxAge: 1000 * 60 * 60,
      });
      // ✅ Set refresh token in HttpOnly cookie
      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production", // will be false in test
        sameSite: "strict",
        maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year
      });

      this.logger.debug("User registration data", {
        firstName,
        lastName,
        email: email.trim().toLowerCase(),
        password: "*****", // Never log raw passwords!
      });

      this.logger.info("User registered successfully", {
        userId: user.id,
      });

      res.status(201).json({
        message: "User registered successfully",
        userId: user.id,
      });
    } catch (error) {
      next(error);
    }
  }
}
