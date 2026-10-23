import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../../app";

let server: Server;
let base: string;

beforeAll(() => {
  server = createApp({ ownerPin: "246810", sessionSecret: "s".repeat(32) }).listen(0);
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(() => server.close());

const login = (pin: string) =>
  fetch(`${base}/v1/owner/session`, {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ pin }),
  });

describe("owner PIN brute force", () => {
  it("locks an address out after 5 wrong PINs, even if the 6th is right", async () => {
    for (let i = 0; i < 5; i++) expect((await login("000000")).status).toBe(401);
    const locked = await login("246810");
    expect(locked.status).toBe(429);
    expect(await locked.json()).toMatchObject({ error: { code: "TOO_MANY_ATTEMPTS" } });
  });
});
