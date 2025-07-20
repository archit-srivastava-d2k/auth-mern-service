import request from "supertest";
import app from "../../src/app";
import { DataSource } from "typeorm";
import { AppDataSource } from "../../src/config/data-source";
import { Roles } from "../../src/constants";
import bcrypt from "bcrypt";
import { isJwt } from "../utils";
import { User } from "../../src/entity/User";
import { RefreshToken } from "../../src/entity/RefreshToken";

describe("POST auth/register", () => {
  let connection: DataSource;

  beforeAll(async () => {
    connection = await AppDataSource.initialize();
  }, 15000); // Increased timeout for beforeAll

  beforeEach(async () => {
    // Option 1: Use truncate instead of drop/sync for faster cleanup
    await connection.synchronize(true); // true = drop schema first

    // Alternative Option 2: Manual cleanup (faster than drop/sync)
    // try {
    //   await connection.createQueryBuilder()
    //     .delete()
    //     .from(RefreshToken)
    //     .execute();
    //   await connection.createQueryBuilder()
    //     .delete()
    //     .from(User)
    //     .execute();
    // } catch (error) {
    //   console.log("Cleanup error (expected if tables don't exist):", error);
    // }
  }, 10000); // Increased timeout for beforeEach

  afterEach(async () => {
    if (connection.isInitialized) {
      // Use query builder for safe full-table delete (no criteria needed)
      await connection
        .createQueryBuilder()
        .delete()
        .from(RefreshToken)
        .execute();
      await connection.createQueryBuilder().delete().from(User).execute();
      console.log("Cleaned up test data (users and refresh tokens)");
    }
  }, 10000); // Added timeout for afterEach

  afterAll(async () => {
    if (connection) {
      await connection.destroy();
    }
  }, 10000); // Added timeout for afterAll

  describe("Given all fields", () => {
    it("should return 201", async () => {
      const UserData = {
        firstName: "Test",
        lastName: "User",
        email: "test@example.com",
        password: "password",
      };
      const response = await request(app).post("/auth/register").send(UserData);
      expect(response.status).toBe(201);
    }, 10000); // Increased timeout for individual test

    it("should return valid JSON", async () => {
      const UserData = {
        firstName: "Test",
        lastName: "User",
        email: "test@example.com",
        password: "password",
      };
      const response = await request(app).post("/auth/register").send(UserData);
      expect(response.type).toBe("application/json");
    }, 10000);

    it("should persist the user in the database", async () => {
      const UserData = {
        firstName: "Test",
        lastName: "User",
        email: "  test@example.com",
        password: "password",
      };
      await request(app).post("/auth/register").send(UserData);
      const userRepository = connection.getRepository("User");
      const users = await userRepository.find();
      expect(users).toHaveLength(1);
      expect(users[0].firstName).toBe(UserData.firstName);
      expect(users[0].lastName).toBe(UserData.lastName);
      expect(users[0].email).toBe(UserData.email.trim().toLowerCase());
    }, 10000);

    it("should return the user ID in the response", async () => {
      const UserData = {
        firstName: "Test",
        lastName: "User",
        email: "  test@example.com",
        password: "password",
      };

      const response = await request(app)
        .post("/auth/register")
        .send(UserData)
        .expect(201);

      expect(response.body).toHaveProperty(
        "message",
        "User registered successfully",
      );
      expect(response.body).toHaveProperty("userId");
      expect(typeof response.body.userId).toBe("number");
    }, 10000);

    it("should assign the user role ", async () => {
      const UserData = {
        firstName: "Test",
        lastName: "User",
        email: "  test@example.com",
        password: "password",
      };
      await request(app).post("/auth/register").send(UserData);
      const userRepository = connection.getRepository("User");
      const users = await userRepository.find();
      expect(users[0]).toHaveProperty("role");
      expect(users[0].role).toBe(Roles.CUSTOMER);
    }, 10000);

    it("should store the password as hashed in the database", async () => {
      const userData = {
        firstName: "Test",
        lastName: "User",
        email: "test@example.com",
        password: "password",
      };

      await request(app).post("/auth/register").send(userData);

      const userRepository = connection.getRepository("User");
      const users = await userRepository.find({ select: ["password"] });
      expect(users).toHaveLength(1);
      const storedPassword = users[0].password;
      console.log("hashed password ->", storedPassword);
      expect(storedPassword).not.toBe(userData.password);
      expect(storedPassword).toMatch(/^\$2b\$10\$[\w./]+$/);
      expect(await bcrypt.compare(userData.password, storedPassword)).toBe(
        true,
      );
    }, 10000);

    it("should return 400 if email is already registered", async () => {
      const userData = {
        firstName: "Test",
        lastName: "User",
        email: "test@example.com",
        password: "password",
      };
      const userRepository = connection.getRepository("User");
      await userRepository.save({ ...userData, role: Roles.CUSTOMER });
      const users = await userRepository.find();

      await request(app).post("/auth/register").send(userData);

      const response = await request(app).post("/auth/register").send(userData);

      expect(response.status).toBe(400);
      expect(users).toHaveLength(1);
    }, 10000);

    it("should return the access token and refresh token inside a cookie", async () => {
      const userData = {
        firstName: "Test",
        lastName: "User",
        email: "test@example.com",
        password: "password",
      };

      const response = await request(app).post("/auth/register").send(userData);

      const cookies = response.headers["set-cookie"] || [];
      const cookiesArray = Array.isArray(cookies) ? cookies : [cookies];

      let accessToken: string | null = null;
      let refreshToken: string | null = null;

      cookiesArray.forEach((cookie) => {
        if (cookie.startsWith("accessToken=")) {
          accessToken = cookie.split(";")[0].split("=")[1];
        }
        if (cookie.startsWith("refreshToken=")) {
          refreshToken = cookie.split(";")[0].split("=")[1];
        }
      });
      console.log("Set-Cookie headers:", response.headers["set-cookie"]);

      expect(accessToken).not.toBeNull();
      expect(refreshToken).not.toBeNull();
      // Optionally test token structure
      expect(isJwt(accessToken)).toBeTruthy();
    }, 10000);

    it("should store the refresh token in the database", async () => {
      const userData = {
        firstName: "Test",
        lastName: "User",
        email: "test@example.com",
        password: "password",
      };
      const response = await request(app).post("/auth/register").send(userData);
      const refreshTokenRepo = connection.getRepository("RefreshToken");
      const refreshTokens = await refreshTokenRepo.find();
      expect(refreshTokens).toHaveLength(1);
    }, 10000);
  });

  describe("Given missing fields", () => {
    it("should return 400 if email is missing", async () => {
      const userData = {
        firstName: "Test",
        lastName: "User",
        email: "",
        password: "password",
      };
      const response = await request(app).post("/auth/register").send(userData);
      expect(response.status).toBe(400);
    }, 10000);

    it("should return 400 if password is missing", async () => {
      const userData = {
        firstName: "Test",
        lastName: "User",
        email: "test@example.com",
        password: "",
      };
      const response = await request(app).post("/auth/register").send(userData);
      expect(response.status).toBe(400);
    }, 10000);

    it("should return 400 if first name is missing", async () => {
      const userData = {
        firstName: "",
        lastName: "User",
        email: "test@example.com",
        password: "password",
      };
      const response = await request(app).post("/auth/register").send(userData);
      expect(response.status).toBe(400);
    }, 10000);

    it("should return 400 if last name is missing", async () => {
      const userData = {
        firstName: "Test",
        lastName: "",
        email: "test@example.com",
        password: "password",
      };
      const response = await request(app).post("/auth/register").send(userData);
      expect(response.status).toBe(400);
    }, 10000);
  });

  describe("fields are not in the correct format", () => {
    it("should trim the email and convert it to lowercase", async () => {
      const userData = {
        firstName: "Test",
        lastName: "User",
        email: "  taest@example.com  ",
        password: "password",
      };
      const response = await request(app).post("/auth/register").send(userData);
      const userRepository = connection.getRepository("User");
      const user = await userRepository.find();
      expect(user[0].email).toBe("taest@example.com");
    }, 10000);
  });
});
