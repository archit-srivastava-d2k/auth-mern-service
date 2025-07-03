import path from "path";
import fs from "fs";
import { Request, NextFunction, Response } from "express";
import { AuthRequest, RegisterRequest } from "../types";
import { UserService } from "../services/userService";
import { Logger } from "winston";
import { validationResult } from "express-validator";
import { JwtPayload, sign } from "jsonwebtoken";
import { serverConfig } from "../config";
import { AppDataSource } from "../config/data-source";
import { RefreshToken } from "../entity/RefreshToken";
import { TokenService } from "../services/TokenService";
import { create } from "domain";
import createHttpError from "http-errors";
import { CredentialService } from "../services/credentialService";
export class AuthController {
  constructor(
    private userService: UserService,
    private logger: Logger,
    private tokenService: TokenService,
    private credentialService: CredentialService,
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

      const payload: JwtPayload = {
        sub: String(user.id),
        role: user.role,
      };
      const accessToken = this.tokenService.generateAccessToken(payload);

      // const refreshTokenRepo = AppDataSource.getRepository(RefreshToken);
      // const newRefreshToken = await refreshTokenRepo.save({
      //   user: user,
      //   expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
      // });
      const newRefreshToken = await this.tokenService.persistRefreshToken(user);
      const refreshToken = this.tokenService.generateRefreshToken({
        ...payload,
        id: String(newRefreshToken.id),
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

  async login(req: RegisterRequest, res: Response, next: NextFunction) {
    const result = validationResult(req);
    if (!result.isEmpty()) {
      res.status(400).json({ errors: result.array() });
      return;
    }

    const { email, password } = req.body;
    this.logger.debug("New login request", {
      email: email.trim().toLowerCase(),
      password: "*****", // Never log raw passwords!
    });

    if (!email || !password) {
      const error = new Error("All fields are required");
      this.logger.error(error.message);
      res.status(400).json({ message: error.message });
      return;
    }
    /*
    check if username(email) exists in database
    if not, throw error
    if yes, check if password is correct
    if not, throw error
    if yes, generate access token
   Add Token to cookie
   return to respose id

    */

    try {
      const user = await this.userService.findByEmail(
        email.trim().toLowerCase(),
      );
      if (!user) {
        const error = createHttpError(400, "email or password is incorrect");
        next(error);
        return;
      }

      const passwordMatch = await this.credentialService.comparePassword(
        password,
        user.password,
      );
      if (!passwordMatch) {
        const error = createHttpError(400, "email or password is incorrect");
        next(error);
        return;
      }
      const payload: JwtPayload = {
        sub: String(user.id),
        role: user.role,
      };
      const accessToken = this.tokenService.generateAccessToken(payload);
      const newRefreshToken = await this.tokenService.persistRefreshToken(user);
      const refreshToken = this.tokenService.generateRefreshToken({
        ...payload,
        id: String(newRefreshToken.id),
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
        email: email.trim().toLowerCase(),
        password: "*****", // Never log raw passwords!
      });

      this.logger.info("User login successfully", {
        userId: user.id,
      });

      res.json({
        message: "User login successfully",
        userId: user.id,
      });
    } catch (error) {
      next(error);
    }
  }
  async self(req: AuthRequest, res: Response) {
    const user = await this.userService.findById(Number(req.auth.sub));
    res.json({ ...user, password: undefined });
  }
  async refresh(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const payload: JwtPayload = {
        sub: req.auth.sub,
        role: req.auth.role,
      };
      const userId = Number(req.auth.sub);

      if (isNaN(userId)) {
        return next(
          createHttpError(
            400,
            "Invalid token payload: user ID is not a number",
          ),
        );
      }

      console.log("User ID:", userId);

      const accessToken = this.tokenService.generateAccessToken(payload);

      const user = await this.userService.findById(Number(req.auth.sub));
      if (!user) {
        const error = createHttpError(
          400,
          "User with the token could not find",
        );
        next(error);
        return;
      }

      // Persist the refresh token
      const newRefreshToken = await this.tokenService.persistRefreshToken(user);

      // Delete old refresh token
      await this.tokenService.deleteRefreshToken(Number(req.auth?.id));

      const refreshToken = this.tokenService.generateRefreshToken({
        ...payload,
        id: String(newRefreshToken.id),
      });

      res.cookie("accessToken", accessToken, {
        domain: "localhost",
        sameSite: "strict",
        maxAge: 1000 * 60 * 60 * 24 * 1, // 1d
        httpOnly: true, // Very important
      });

      res.cookie("refreshToken", refreshToken, {
        domain: "localhost",
        sameSite: "strict",
        maxAge: 1000 * 60 * 60 * 24 * 365, // 1y
        httpOnly: true, // Very important
      });

      this.logger.info("User has been logged in", { id: user.id });
      res.json({ id: user.id });
    } catch (err) {
      next(err);
      return;
    }
  }
}
