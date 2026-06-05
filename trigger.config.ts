import { config } from "dotenv";
import { defineConfig } from "@trigger.dev/sdk";

// The Trigger.dev CLI evaluates this config (via jiti) BEFORE it hydrates
// process.env from your .env files, so load them here to make the project ref
// available at config-evaluation time. Both values live in the gitignored
// .env.local (loaded by Next.js too):
//   TRIGGER_PROJECT_REF - project ref from the dashboard (Settings -> General), e.g. proj_abc123
//   TRIGGER_SECRET_KEY  - DEV secret key from the dashboard (API Keys page); read by the SDK at runtime
config({ path: [".env.local", ".env"], quiet: true });

const projectRef = process.env.TRIGGER_PROJECT_REF;

if (!projectRef) {
  throw new Error(
    "TRIGGER_PROJECT_REF is not set. Add it to .env.local (Trigger.dev dashboard -> Settings -> General).",
  );
}

export default defineConfig({
  project: projectRef,
  runtime: 'node',
  // Durable background tasks live in the root-level `trigger/` directory.
  // See the system boundaries in context/architecture-context.md.
  dirs: ["trigger"],
  retries: {
    enabledInDev: false,
    default: {
      maxAttempts: 3,
      minTimeoutInMs: 1000,
      maxTimeoutInMs: 10000,
      factor: 2,
      randomize: true,
    },
  },
  maxDuration: 3600,
});
