// router.ts
import express from "express";
import { AuthController } from "../controllers/AuthController";
import { UserService } from "../services/userService";
import { User } from "../entity/User";
import { AppDataSource } from "../config/data-source";
import logger from "../config/logger";
const router = express.Router();
const userRepository = AppDataSource.getRepository(User);

const userService = new UserService(userRepository);
const authController = new AuthController(userService, logger);

router.post("/register", async (req, res, next) => {
  try {
    await authController.register(req, res, next);
  } catch (error) {
    next(error);
  }
});

export default router;
