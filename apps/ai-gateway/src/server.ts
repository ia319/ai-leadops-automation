import { buildApp } from "./app.js";
import { loadConfig } from "./config.js";

let app: Awaited<ReturnType<typeof buildApp>> | undefined;

try {
  const config = loadConfig();
  app = await buildApp(config);

  await app.listen({
    port: config.port,
    host: "0.0.0.0",
  });

  app.log.info(
    {
      provider: config.aiProvider,
      port: config.port,
    },
    "AI Gateway started",
  );
} catch (error) {
  if (app) {
    app.log.error(error, "AI Gateway failed to start");
  } else {
    console.error("AI Gateway failed to start", error);
  }
  process.exitCode = 1;
}
