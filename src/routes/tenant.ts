import express, {
  NextFunction,
  Request,
  RequestHandler,
  Response,
} from "express";
import { TenantController } from "../controllers/TenantController";
import { TenantService } from "../services/TenantService";
import { AppDataSource } from "../config/data-source";
import { Tenant } from "../entity/Tenant";
import logger from "../config/logger";
import authenticate from "../middlewares/authenticate";
import { canAccess } from "../middlewares/canAccess";
import { Roles } from "../constants";
import { CreateTenantRequest } from "../types";

const router = express.Router();

const tenantRepository = AppDataSource.getRepository(Tenant);
const tenantService = new TenantService(tenantRepository);
const tenantController = new TenantController(tenantService, logger);

router.post(
  "/",
  authenticate as RequestHandler,
  canAccess([Roles.ADMIN]),

  (req: CreateTenantRequest, res: Response, next: NextFunction) =>
    tenantController.create(req, res, next) as unknown as RequestHandler,
) as unknown as RequestHandler;

router.patch(
  "/:id",
  authenticate as RequestHandler,
  canAccess([Roles.ADMIN]),

  (req: CreateTenantRequest, res: Response, next: NextFunction) =>
    tenantController.update(req, res, next) as unknown as RequestHandler,
) as unknown as RequestHandler;
router.get(
  "/",
  (req: Request, res: Response, next: NextFunction) =>
    tenantController.getAll(req, res, next) as unknown as RequestHandler,
) as unknown as RequestHandler;
router.get(
  "/:id",
  authenticate as RequestHandler,
  canAccess([Roles.ADMIN]),
  (req, res, next) =>
    tenantController.getOne(req, res, next) as unknown as RequestHandler,
) as unknown as RequestHandler;
router.delete(
  "/:id",
  authenticate as RequestHandler,
  canAccess([Roles.ADMIN]),
  (req, res, next) =>
    tenantController.destroy(req, res, next) as unknown as RequestHandler,
) as unknown as RequestHandler;

export default router;
