import fs from "fs";
import path from "path";
import createHttpError from "http-errors";
import { JwtPayload, sign } from "jsonwebtoken";
import { serverConfig } from "../config";
import { User } from "../entity/User";
import { AppDataSource } from "../config/data-source";
import { RefreshToken } from "../entity/RefreshToken";
import { Repository } from "typeorm";

export class TokenService {
  constructor(private refreshTokenRepo: Repository<RefreshToken>) {
    // Initialization if needed
  }
  generateAccessToken(payload: JwtPayload) {
    let privateKey: string;
    if (!serverConfig.PRIVATE_KEY) {
      const error = createHttpError(
        500,
        "Private key not found in server config",
      );
      throw error;
    }
    try {
      privateKey = serverConfig.PRIVATE_KEY!;
    } catch (error) {
      const err = createHttpError(500, "Private key not found");
      throw err;
    }

    const accessToken = sign(payload, privateKey, {
      algorithm: "RS256",
      expiresIn: "1h",
      issuer: "auth-service",
    });
    return accessToken;
  }
  generateRefreshToken(payload: JwtPayload) {
    const refreshToken = sign(payload, serverConfig.REFRESH_TOKEN_SECRET!, {
      algorithm: "HS256",
      expiresIn: "1y",
      issuer: "auth-service",
      jwtid: String(payload.id),
    });
    return refreshToken;
  }

  async persistRefreshToken(user: User) {
    const newRefreshToken = await this.refreshTokenRepo.save({
      user: user,
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
    });
    return newRefreshToken;
  }

  async deleteRefreshToken(tokenId: number) {
    return await this.refreshTokenRepo.delete({ id: tokenId });
  }
}
