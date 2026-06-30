import { buildApp } from "./app.js";
import { loadConfig } from "./config.js";

const config = loadConfig();
const app = await buildApp(config);

try {
  await app.listen({
    port: config.port,
    host: "0.0.0.0"
  });

  app.log.info(
    {
      provider: config.aiProvider,
      port: config.port
    },
    "AI Gateway started"
  );
} catch (error) {
  app.log.error(error, "AI Gateway failed to start");
  process.exitCode = 1;
}
