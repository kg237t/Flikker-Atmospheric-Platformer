import express, { type Express } from "express";
import cors from "cors";
import { createRequire } from "node:module";
import type { IncomingMessage, ServerResponse } from "node:http";
import router from "./routes";
import { logger } from "./lib/logger";

const require = createRequire(import.meta.url);
// pino-http v10 exposes a CommonJS-style callable export. Using createRequire
// avoids the ESM/bundler type mismatch that Vercel's TypeScript check reports.
const pinoHttp = require("pino-http") as any;

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req: IncomingMessage & { id?: string }) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res: ServerResponse) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

export default app;
