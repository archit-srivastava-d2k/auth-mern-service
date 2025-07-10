import { Request, Response, NextFunction } from "express";
import { TenantService } from "../services/TenantService";

export class TenantController {
  constructor(private tenantService: TenantService) {
    // Initialize any services or repositories if needed
  }
  async create(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<Response> {
    const { name, address } = req.body;
    try {
      const tenant = await this.tenantService.create({
        name,
        address,
      });
      res.status(201).json({
        message: "Tenant created successfully",
        tenant,
      });
    } catch (error) {
      next(error);
    }
    return res.status(201).json({
      message: "Tenant created successfully",
    });
  }
}
