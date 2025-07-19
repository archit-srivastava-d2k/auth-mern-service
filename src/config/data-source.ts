import "reflect-metadata";
import { DataSource } from "typeorm";
import { serverConfig as config, serverConfig } from "./index";
export const AppDataSource = new DataSource({
  type: "postgres",
  url: config.TEST_DB_CONNECTION_STRING,
  synchronize: false, // Disable synchronization in production
  logging: false,
  extra: {
    family: 4,
  },
  ssl: {
    rejectUnauthorized: false,
  },
  entities: ["src/entity/*.{ts,js}"],
  migrations: ["src/migration/*.{ts,js}"],
  subscribers: [],
});
