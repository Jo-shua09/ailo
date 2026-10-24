// Starts the API on a free port for cross-language tests (apps/agent). Prints {"port": n} once listening.
import type { AddressInfo } from "node:net";
import { createApp } from "../app";

const server = createApp({ ownerPin: "2468", sessionSecret: "s".repeat(32) }).listen(0, () => {
  console.log(JSON.stringify({ port: (server.address() as AddressInfo).port }));
});
