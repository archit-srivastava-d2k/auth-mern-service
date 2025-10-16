import { JwtPayload, sign } from "jsonwebtoken";
import createHttpError from "http-errors";
import { serverConfig } from "../config";
import { User } from "../entity/User";
import { RefreshToken } from "../entity/RefreshToken";
import { Repository } from "typeorm";
import fs from "fs";
import path from "path";

// Try to load from env first (for CI/GitHub secrets)
let privateKey = process.env.PRIVATE_KEY;

// Fallback to file if env is not set (for local development)
if (!privateKey) {
  try {
    privateKey = fs.readFileSync(
      path.join(__dirname, "../../certs/private.pem"),
      "utf8", // Read as string
    );
    console.log("Loaded private key from file");
  } catch (err) {
    if (err instanceof Error) {
      throw createHttpError(
        500,
        "PRIVATE_KEY not found in env or file: " + err.message,
      );
    }
  }
}

// Validation: Ensure it's a valid PEM key (basic check)
if (!privateKey || privateKey.length < 1000) {
  // Your full key is ~1600 chars
  throw createHttpError(
    500,
    "Invalid PRIVATE_KEY: Too short or truncated (length: " +
      (privateKey ? privateKey.length : 0) +
      ")",
  );
}

if (
  !privateKey.includes("BEGIN RSA PRIVATE KEY") ||
  !privateKey.includes("END RSA PRIVATE KEY")
) {
  throw createHttpError(500, "Invalid PRIVATE_KEY: Missing PEM headers");
}

// Convert to Buffer for safe RS256 signing
const privateKeyBuffer = Buffer.from(privateKey, "utf-8");

// Debug log
console.log("Private key loaded successfully (length:", privateKey.length, ")");

export class TokenService {
  constructor(private readonly refreshTokenRepo: Repository<RefreshToken>) {
    // Initialization if needed
  }

  generateAccessToken(payload: JwtPayload) {
    const accessToken = sign(payload, privateKeyBuffer, {
      algorithm: "RS256",
      expiresIn: "1m",
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
