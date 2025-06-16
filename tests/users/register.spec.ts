import request from "supertest";
import app from "../../src/app";
describe("POST auth/register", () => {
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
  });
});
