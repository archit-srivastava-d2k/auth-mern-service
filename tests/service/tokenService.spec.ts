import { DataSource, Repository } from "typeorm";
import { TokenService } from "../../src/services/TokenService";
import { RefreshToken } from "../../src/entity/RefreshToken";
import { User } from "../../src/entity/User";
import { AppDataSource } from "../../src/config/data-source";
import { Roles } from "../../src/constants";
import jwt from "jsonwebtoken";
import { serverConfig } from "../../src/config";

describe("TokenService", () => {
  let connection: DataSource;
  let tokenService: TokenService;
  let refreshTokenRepository: Repository<RefreshToken>;
  let userRepository: Repository<User>;
  let testUser: User;

  beforeAll(async () => {
    connection = await AppDataSource.initialize();
    refreshTokenRepository = connection.getRepository(RefreshToken);
    userRepository = connection.getRepository(User);
    tokenService = new TokenService(refreshTokenRepository);
  });

  beforeEach(async () => {
    await connection.dropDatabase();
    await connection.synchronize();

    // Create a test user
    testUser = await userRepository.save({
      firstName: "Test",
      lastName: "User",
      email: "test@example.com",
      password: "hashedPassword",
      role: Roles.CUSTOMER,
    });
  });

  afterAll(async () => {
    if (connection) {
      await connection.destroy();
    }
  });

  describe("generateAccessToken", () => {
    it("should generate a valid RS256 JWT access token", () => {
      const payload = {
        id: testUser.id,
        email: testUser.email,
        role: testUser.role,
      };

      const accessToken = tokenService.generateAccessToken(payload);

      expect(accessToken).toBeDefined();
      expect(typeof accessToken).toBe("string");

      // Verify token structure (should have 3 parts separated by dots)
      const tokenParts = accessToken.split(".");
      expect(tokenParts).toHaveLength(3);

      // Decode header and verify algorithm
      const header = JSON.parse(
        Buffer.from(tokenParts[0], "base64url").toString(),
      );
      expect(header.alg).toBe("RS256");
      expect(header.typ).toBe("JWT");
    });

    it("should include correct payload in access token", () => {
      const payload = {
        id: testUser.id,
        email: testUser.email,
        role: testUser.role,
      };

      const accessToken = tokenService.generateAccessToken(payload);

      // Decode payload (we can't verify signature without public key in test)
      const tokenParts = accessToken.split(".");
      const decodedPayload = JSON.parse(
        Buffer.from(tokenParts[1], "base64url").toString(),
      );

      expect(decodedPayload.id).toBe(payload.id);
      expect(decodedPayload.email).toBe(payload.email);
      expect(decodedPayload.role).toBe(payload.role);
      expect(decodedPayload.iss).toBe("auth-service");
      expect(decodedPayload.exp).toBeDefined();
    });

    it("should set expiration time to 1 hour", () => {
      const payload = {
        id: testUser.id,
        email: testUser.email,
        role: testUser.role,
      };

      const beforeGeneration = Math.floor(Date.now() / 1000);
      const accessToken = tokenService.generateAccessToken(payload);
      const afterGeneration = Math.floor(Date.now() / 1000);

      const tokenParts = accessToken.split(".");
      const decodedPayload = JSON.parse(
        Buffer.from(tokenParts[1], "base64url").toString(),
      );

      // Should expire in approximately 1 hour (3600 seconds)
      const expectedMinExp = beforeGeneration + 3590; // 10 seconds buffer
      const expectedMaxExp = afterGeneration + 3610; // 10 seconds buffer

      expect(decodedPayload.exp).toBeGreaterThanOrEqual(expectedMinExp);
      expect(decodedPayload.exp).toBeLessThanOrEqual(expectedMaxExp);
    });
  });

  describe("generateRefreshToken", () => {
    it("should generate a valid HS256 JWT refresh token", () => {
      const payload = {
        id: testUser.id,
        email: testUser.email,
        role: testUser.role,
      };

      const refreshToken = tokenService.generateRefreshToken(payload);

      expect(refreshToken).toBeDefined();
      expect(typeof refreshToken).toBe("string");

      // Verify token structure
      const tokenParts = refreshToken.split(".");
      expect(tokenParts).toHaveLength(3);

      // Decode header and verify algorithm
      const header = JSON.parse(
        Buffer.from(tokenParts[0], "base64url").toString(),
      );
      expect(header.alg).toBe("HS256");
      expect(header.typ).toBe("JWT");
    });

    it("should include correct payload in refresh token", () => {
      const payload = {
        id: testUser.id,
        email: testUser.email,
        role: testUser.role,
      };

      const refreshToken = tokenService.generateRefreshToken(payload);

      // Verify token using the refresh token secret
      const decoded = jwt.verify(
        refreshToken,
        serverConfig.REFRESH_TOKEN_SECRET!,
      ) as jwt.JwtPayload;

      expect(decoded.id).toBe(payload.id);
      expect(decoded.email).toBe(payload.email);
      expect(decoded.role).toBe(payload.role);
      expect(decoded.iss).toBe("auth-service");
      expect(decoded.jti).toBe(String(payload.id));
    });

    it("should set jwtid to string representation of user id", () => {
      const payload = {
        id: testUser.id,
        email: testUser.email,
        role: testUser.role,
      };

      const refreshToken = tokenService.generateRefreshToken(payload);
      const decoded = jwt.verify(
        refreshToken,
        serverConfig.REFRESH_TOKEN_SECRET!,
      ) as jwt.JwtPayload;

      expect(decoded.jti).toBe(String(payload.id));
    });
  });

  describe("persistRefreshToken", () => {
    it("should save refresh token to database with correct user association", async () => {
      const refreshToken = await tokenService.persistRefreshToken(testUser);

      expect(refreshToken).toBeDefined();
      expect(refreshToken.id).toBeDefined();
      expect(refreshToken.user.id).toBe(testUser.id);
      expect(refreshToken.expiresAt).toBeInstanceOf(Date);

      // Verify it was actually saved to database
      const savedToken = await refreshTokenRepository.findOne({
        where: { id: refreshToken.id },
        relations: ["user"],
      });

      expect(savedToken).toBeDefined();
      expect(savedToken!.user.id).toBe(testUser.id);
    });

    it("should set expiration date to 1 year from now", async () => {
      const beforePersist = new Date();
      const refreshToken = await tokenService.persistRefreshToken(testUser);
      const afterPersist = new Date();

      const oneYear = 365 * 24 * 60 * 60 * 1000; // 1 year in milliseconds
      const expectedMinExpiry = new Date(
        beforePersist.getTime() + oneYear - 1000,
      ); // 1 second buffer
      const expectedMaxExpiry = new Date(
        afterPersist.getTime() + oneYear + 1000,
      ); // 1 second buffer

      expect(refreshToken.expiresAt.getTime()).toBeGreaterThanOrEqual(
        expectedMinExpiry.getTime(),
      );
      expect(refreshToken.expiresAt.getTime()).toBeLessThanOrEqual(
        expectedMaxExpiry.getTime(),
      );
    });

    it("should create multiple refresh tokens for the same user", async () => {
      const token1 = await tokenService.persistRefreshToken(testUser);
      const token2 = await tokenService.persistRefreshToken(testUser);

      expect(token1.id).not.toBe(token2.id);
      expect(token1.user.id).toBe(testUser.id);
      expect(token2.user.id).toBe(testUser.id);

      const allTokens = await refreshTokenRepository.find({
        where: { user: { id: testUser.id } },
      });

      expect(allTokens).toHaveLength(2);
    });
  });

  describe("deleteRefreshToken", () => {
    it("should successfully delete an existing refresh token", async () => {
      // First create a token
      const refreshToken = await tokenService.persistRefreshToken(testUser);

      // Verify it exists
      const tokenBeforeDelete = await refreshTokenRepository.findOne({
        where: { id: refreshToken.id },
      });
      expect(tokenBeforeDelete).toBeDefined();

      // Delete the token
      const deleteResult = await tokenService.deleteRefreshToken(
        refreshToken.id,
      );

      expect(deleteResult.affected).toBe(1);

      // Verify it's deleted
      const tokenAfterDelete = await refreshTokenRepository.findOne({
        where: { id: refreshToken.id },
      });
      expect(tokenAfterDelete).toBeNull();
    });

    it("should return affected count of 0 for non-existent token", async () => {
      const nonExistentTokenId = 99999;

      const deleteResult =
        await tokenService.deleteRefreshToken(nonExistentTokenId);

      expect(deleteResult.affected).toBe(0);
    });

    it("should delete only the specified token when multiple tokens exist", async () => {
      // Create multiple tokens
      const token1 = await tokenService.persistRefreshToken(testUser);
      const token2 = await tokenService.persistRefreshToken(testUser);

      // Delete only the first token
      const deleteResult = await tokenService.deleteRefreshToken(token1.id);

      expect(deleteResult.affected).toBe(1);

      // Verify first token is deleted
      const deletedToken = await refreshTokenRepository.findOne({
        where: { id: token1.id },
      });
      expect(deletedToken).toBeNull();

      // Verify second token still exists
      const existingToken = await refreshTokenRepository.findOne({
        where: { id: token2.id },
      });
      expect(existingToken).toBeDefined();
    });
  });

  describe("Edge cases and error scenarios", () => {
    it("should handle empty payload in generateAccessToken", () => {
      const emptyPayload = {};

      const accessToken = tokenService.generateAccessToken(emptyPayload);

      expect(accessToken).toBeDefined();
      expect(typeof accessToken).toBe("string");

      const tokenParts = accessToken.split(".");
      const decodedPayload = JSON.parse(
        Buffer.from(tokenParts[1], "base64url").toString(),
      );

      expect(decodedPayload.iss).toBe("auth-service");
      expect(decodedPayload.exp).toBeDefined();
    });

    it("should handle empty payload in generateRefreshToken", () => {
      const emptyPayload = {};

      const refreshToken = tokenService.generateRefreshToken(emptyPayload);

      expect(refreshToken).toBeDefined();
      expect(typeof refreshToken).toBe("string");

      const decoded = jwt.verify(
        refreshToken,
        serverConfig.REFRESH_TOKEN_SECRET!,
      ) as jwt.JwtPayload;
      expect(decoded.iss).toBe("auth-service");
      expect(decoded.exp).toBeDefined();
    });

    it("should handle user with different roles", async () => {
      const adminUser = await userRepository.save({
        firstName: "Admin",
        lastName: "User",
        email: "admin@example.com",
        password: "hashedPassword",
        role: Roles.ADMIN,
      });

      const refreshToken = await tokenService.persistRefreshToken(adminUser);

      expect(refreshToken.user.id).toBe(adminUser.id);
      expect(refreshToken.user.role).toBe(Roles.ADMIN);
    });
  });
});
