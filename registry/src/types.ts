import type { AuthContext } from "./middleware/auth.js";

export type HonoEnv = {
  Variables: {
    auth: AuthContext;
    sanitizedBody: unknown;
    sanitizerWarnings: string[];
    schemaVersion: string;
  };
};
