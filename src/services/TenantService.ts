import { Repository } from "typeorm/repository/Repository";
import { Tenant } from "../entity/Tenant";
import { Itenant } from "../types";

export class TenantService {
  constructor(private tenantRepository: Repository<Tenant>) {}
  async create(tenantData: Itenant) {
    const tenant = this.tenantRepository.create(tenantData);
    await this.tenantRepository.save(tenant);
    return tenant;
  }
}
