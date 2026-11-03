/**
 * Standalone background worker: `npm run start:worker`. Use it when the API
 * runs on several instances or you want emails sent off the web servers.
 * Set WORKER_IN_PROCESS=false on the API instances in that case.
 */
import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module.js";
import { createRootLogger, PinoNestLogger } from "./common/logger.js";
import { loadEnv } from "./config/env.js";

const env = loadEnv();
const logger = createRootLogger(env.LOG_LEVEL, env.NODE_ENV === "development");
const ctx = await NestFactory.createApplicationContext(AppModule.forRoot(env, { worker: true, cron: true }), { logger: new PinoNestLogger(logger) });
ctx.enableShutdownHooks();
await ctx.init();
logger.info("RiTECHS worker running");
