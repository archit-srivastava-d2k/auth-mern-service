import request from "supertest";
import app from "../../src/app";
import { DataSource } from "typeorm";
import { AppDataSource } from "../../src/config/data-source";
import { Roles } from "../../src/constants";
import bcrypt from "bcrypt";
import logger from "../../src/config/logger";
describe("POST auth/register", () => {
  let connection: DataSource;
  beforeAll(async () => {
    connection = await AppDataSource.initialize();
  });

  beforeEach(async () => {
    await connection.dropDatabase();
    await connection.synchronize();
  });

  afterAll(async () => {
    await connection.destroy();
  });

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
    });

    it("should return valid JSON", async () => {
      const UserData = {
        firstName: "Test",
        lastName: "User",
        email: "test@example.com",
        password: "password",
      };
      const response = await request(app).post("/auth/register").send(UserData);
      expect(response.type).toBe("application/json");
    });

    it("should persist the user in the database", async () => {
      const UserData = {
        firstName: "Test",
        lastName: "User",
        email: "  test@example.com",
        password: "password",
      };
      await request(app).post("/auth/register").send(UserData);
      const userRePOsitory = connection.getRepository("User");
      const user = await userRePOsitory.find();
      expect(user).toHaveLength(1);
      expect(user[0].firstName).toBe(UserData.firstName);
      expect(user[0].lastName).toBe(UserData.lastName);
      expect(user[0].email).toBe(UserData.email.trim().toLowerCase());
    });

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
    });

    it("should assign the user role ", async () => {
      const UserData = {
        firstName: "Test",
        lastName: "User",
        email: "  test@example.com",
        password: "password",
      };
      await request(app).post("/auth/register").send(UserData);
      const userRePOsitory = connection.getRepository("User");
      const user = await userRePOsitory.find();
      expect(user[0]).toHaveProperty("role");
      expect(user[0].role).toBe(Roles.CUSTOMER);
    });

    it("should store the password as hashed in the database", async () => {
      const userData = {
        firstName: "Test",
        lastName: "User",
        email: "test@example.com",
        password: "password",
      };

      await request(app).post("/auth/register").send(userData);

      const userRepository = connection.getRepository("User");
      const users = await userRepository.find();
      expect(users).toHaveLength(1);
      const storedPassword = users[0].password;
      console.log("hashed password ->", storedPassword);
      expect(storedPassword).not.toBe(userData.password);
      expect(storedPassword).toMatch(/^\$2b\$10\$[\w./]+$/);
      expect(await bcrypt.compare(userData.password, storedPassword)).toBe(
        true,
      );
    });

    it("should return 400 if email is already registered", async () => {
      const userData = {
        firstName: "Test",
        lastName: "User",
        email: "test@example.com",
        password: "password",
      };
      const userRepository = await connection.getRepository("User");
      await userRepository.save({ ...userData, role: Roles.CUSTOMER });
      const users = await userRepository.find();

      await request(app).post("/auth/register").send(userData);

      const response = await request(app).post("/auth/register").send(userData);

      expect(response.status).toBe(400);
      expect(users).toHaveLength(1);
    });
  });
});
