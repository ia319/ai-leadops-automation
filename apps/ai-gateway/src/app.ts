import Fastify from "fastify";
import type { FastifyInstance } from "fastify";

import type { AppConfig } from "./config.js";
import { registerHealthRoute } from "./routes/health.js";
import { registerQualifyLeadRoute } from "./routes/qualify-lead.js";

export async function buildApp(config: AppConfig): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: config.logLevel,
    },
  });

  await registerHealthRoute(app, config);
  await registerQualifyLeadRoute(app, config);

  return app;
}
