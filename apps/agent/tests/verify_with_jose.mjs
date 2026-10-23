// Verifies a Python-signed agent token exactly the way apps/api does (jose, EdDSA, same claims).
// Usage: node verify_with_jose.mjs <token> <public_jwk_json> <method> <path> <body>
import { createHash } from "node:crypto";
import { importJWK, jwtVerify } from "jose";

const [token, jwkJson, method, path, body] = process.argv.slice(2);
const { payload, protectedHeader } = await jwtVerify(token, await importJWK(JSON.parse(jwkJson), "EdDSA"), {
  audience: "ailo", typ: "agent+jwt", algorithms: ["EdDSA"], maxTokenAge: "60s", requiredClaims: ["iat", "exp", "jti"],
});
const bh = createHash("sha256").update(body ?? "").digest("base64url");
const ok = payload.htm === method && payload.htu === path && payload.bh === bh;
console.log(JSON.stringify({ ok, kid: protectedHeader.kid }));
process.exit(ok ? 0 : 1);
