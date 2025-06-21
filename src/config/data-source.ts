import "reflect-metadata";
import { DataSource } from "typeorm";
import { User } from "../entity/User";
import { serverConfig as config, serverConfig } from "./index";

export const AppDataSource = new DataSource({
  type: "postgres",
  host: config.DB_HOST || "localhost",
  port: Number(config.DB_PORT),
  username: config.DB_USERNAME || "test",
  password: config.DB_PASSWORD || "test",
  database: config.DB_NAME || "test",
  synchronize: false, // Disable synchronization in production
  logging: false,
  entities: [User],
  migrations: [],
  subscribers: [],
});
