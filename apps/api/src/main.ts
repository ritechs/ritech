import "reflect-metadata";
import { createApp } from "./app.js";
import { createRootLogger } from "./common/logger.js";
import { loadEnv } from "./config/env.js";

const env = loadEnv();
const logger = createRootLogger(env.LOG_LEVEL, env.NODE_ENV === "development");
process.on("unhandledRejection", (err) => logger.error({ err }, "unhandled rejection"));

const app = await createApp(env, logger, { worker: env.WORKER_IN_PROCESS, cron: true });
await app.listen(env.PORT, env.HOST);
logger.info({ port: env.PORT, worker: env.WORKER_IN_PROCESS }, "RiTECHS API listening");
