import pino from "pino";
import { config } from "./config";

export const logger = pino({
  level: config.logLevel,
  base: undefined,
  redact: {
    paths: [
      "email",
      "firstName",
      "lastName",
      "fileName",
      "oldFileName",
      "newFileName",
      "req.headers.authorization",
      "req.headers.cookie",
    ],
    censor: "[REDACTED]",
  },
});
