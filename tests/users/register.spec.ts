import request from "supertest";
import app from "../../src/app";
import { DataSource } from "typeorm";
import { AppDataSource } from "../../src/config/data-source";
import { truncateTables } from "../utils";

describe("POST auth/register", () => {
  let connection: DataSource;
  beforeAll(async () => {
    connection = await AppDataSource.initialize();
  });

  beforeEach(async () => {
    // Clear the database before each test
    await truncateTables(connection);
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
      expect(user[0].password).toBe(UserData.password);
    });
  });
});
