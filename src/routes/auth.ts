// router.ts
import { AuthController } from "../controllers/AuthController";
import { UserService } from "../services/userService";
import { User } from "../entity/User";
import { AppDataSource } from "../config/data-source";
import logger from "../config/logger";
import express, {
  Request,
  Response,
  NextFunction,
  RequestHandler,
} from "express";
import registerValidator from "../validators/register-validator";
import { TokenService } from "../services/TokenService";
import { RefreshToken } from "../entity/RefreshToken";
import loginValidator from "../validators/login-validator";
import authenticate from "../middlewares/authenticate";
import { AuthRequest } from "../types";
import validateRefreshToken from "../middlewares/validateRefreshToken";
import parseRefreshToken from "../middlewares/parseRefreshToken";
import { CredentialService } from "../services/CredentialService";
const router = express.Router();
const userRepository = AppDataSource.getRepository(User);
const refreshTokenRepository = AppDataSource.getRepository(RefreshToken);
const userService = new UserService(userRepository);
const tokenService = new TokenService(refreshTokenRepository);
const credentialService = new CredentialService();
const authController = new AuthController(
  userService,
  logger,
  tokenService,
  credentialService,
);

router.post(
  "/register",
  registerValidator,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await authController.register(req, res, next);
    } catch (error) {
      next(error);
    }
  },
) as unknown as RequestHandler;

router.post(
  "/login",
  loginValidator,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await authController.login(req, res, next);
    } catch (error) {
      next(error);
    }
  },
) as unknown as RequestHandler;

router.get("/self", authenticate, (req: Request, res: Response) => {
  authController.self(req as AuthRequest, res);
}) as unknown as RequestHandler;

router.post(
  "/refresh",
  validateRefreshToken,
  (req: Request, res: Response, next: NextFunction) => {
    authController.refresh(req as AuthRequest, res, next);
  },
) as unknown as RequestHandler;

router.post(
  "/logout",
  authenticate,
  parseRefreshToken,
  (req: Request, res: Response, next: NextFunction) => {
    authController.logout(req as AuthRequest, res, next);
  },
) as unknown as RequestHandler;

export default router;
