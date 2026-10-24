// Starts the API on a free port for cross-language tests (apps/agent). Prints {"port": n} once listening.
import type { AddressInfo } from "node:net";

// Modules validate env at import time; test mode supplies safe defaults (config/env.ts), so set it first.
process.env.NODE_ENV = "test";
const { createApp } = await import("../app");

const server = createApp({ ownerPin: "246810", sessionSecret: "s".repeat(32) }).listen(0, () => {
  console.log(JSON.stringify({ port: (server.address() as AddressInfo).port }));
});
