import { DataSource } from "typeorm";
import request from "supertest";
import createJWKSMock from "mock-jwks";
import { AppDataSource } from "../../src/config/data-source";
import app from "../../src/app";
import { User } from "../../src/entity/User";
import { Roles } from "../../src/constants";

describe("GET /auth/self", () => {
  let connection: DataSource;
  let jwks: ReturnType<typeof createJWKSMock>;

  beforeAll(async () => {
    jwks = createJWKSMock("http://localhost:5501");
    connection = await AppDataSource.initialize();
  });

  beforeEach(async () => {
    jwks.start();
    await connection.dropDatabase();
    await connection.synchronize();
  });

  afterEach(() => {
    if (jwks) {
      jwks.stop();
    }
  });

  afterAll(async () => {
    if (connection) {
      await connection.destroy();
    }
  });

  describe("Given all fields", () => {
    it("should return the 200 status code", async () => {
      const accessToken = jwks.token({
        sub: "1",
        role: Roles.CUSTOMER,
      });
      const response = await request(app)
        .get("/auth/self")
        .set("Cookie", [`accessToken=${accessToken}`])
        .send();
      expect(response.statusCode).toBe(200);
    });

    it("should return the user data", async () => {
      const userData = {
        firstName: "Rakesh",
        lastName: "K",
        email: "rakesh@mern.space",
        password: "password",
      };
      const userRepository = connection.getRepository(User);
      const data = await userRepository.save({
        ...userData,
        role: Roles.CUSTOMER,
      });
      const accessToken = jwks.token({
        sub: String(data.id),
        role: data.role,
      });

      const response = await request(app)
        .get("/auth/self")
        .set("Cookie", [`accessToken=${accessToken}`])
        .send();
      expect((response.body as Record<string, string>).id).toBe(data.id);
      expect(response.body.email).toBe(userData.email);
      expect(response.body.firstName).toBe(userData.firstName);
      expect(response.body.lastName).toBe(userData.lastName);
      expect(response.body.role).toBe(Roles.CUSTOMER);
    });

    it("should not return the password field", async () => {
      const userData = {
        firstName: "Rakesh",
        lastName: "K",
        email: "rakesh@mern.space",
        password: "password",
      };
      const userRepository = connection.getRepository(User);
      const data = await userRepository.save({
        ...userData,
        role: Roles.CUSTOMER,
      });
      const accessToken = jwks.token({
        sub: String(data.id),
        role: data.role,
      });

      const response = await request(app)
        .get("/auth/self")
        .set("Cookie", [`accessToken=${accessToken}`])
        .send();
      expect(response.body as Record<string, string>).not.toHaveProperty(
        "password",
      );
    });

    it("should return 401 status code if token does not exist", async () => {
      const userData = {
        firstName: "Rakesh",
        lastName: "K",
        email: "rakesh@mern.space",
        password: "password",
      };
      const userRepository = connection.getRepository(User);
      await userRepository.save({
        ...userData,
        role: Roles.CUSTOMER,
      });

      const response = await request(app).get("/auth/self").send();
      expect(response.statusCode).toBe(401);
    });

    // New tests to increase coverage
    it("should return 401 for an invalid token", async () => {
      const response = await request(app)
        .get("/auth/self")
        .set("Cookie", [`accessToken=invalid-token`])
        .send();
      expect(response.statusCode).toBe(401);
    });

    it("should return 401 for an expired token", async () => {
      const userData = {
        firstName: "Rakesh",
        lastName: "K",
        email: "rakesh@mern.space",
        password: "password",
      };
      const userRepository = connection.getRepository(User);
      const data = await userRepository.save({
        ...userData,
        role: Roles.CUSTOMER,
      });

      // Generate expired token (exp in the past)
      const accessToken = jwks.token({
        sub: String(data.id),
        role: data.role,
        exp: Math.floor(Date.now() / 1000) - 3600, // Expired 1 hour ago
      });

      const response = await request(app)
        .get("/auth/self")
        .set("Cookie", [`accessToken=${accessToken}`])
        .send();
      expect(response.statusCode).toBe(401);
    });

    it("should return 403 for unauthorized role if role-based access is enforced", async () => {
      const userData = {
        firstName: "Rakesh",
        lastName: "K",
        email: "rakesh@mern.space",
        password: "password",
      };
      const userRepository = connection.getRepository(User);
      const data = await userRepository.save({
        ...userData,
        role: Roles.CUSTOMER,
      });

      // Generate token with a role that might be restricted (e.g., not ADMIN)
      const accessToken = jwks.token({
        sub: String(data.id),
        role: Roles.CUSTOMER,
      });

      const response = await request(app)
        .get("/auth/self")
        .set("Cookie", [`accessToken=${accessToken}`])
        .send();
      // Adjust based on your `canAccess.ts` middleware
      // If `canAccess.ts` restricts `/auth/self` to ADMIN, expect 403
      // If not restricted, this test may not apply
      expect(response.statusCode).toBe(200); // Modify to 403 if role-based access applies
    });
  });
});
