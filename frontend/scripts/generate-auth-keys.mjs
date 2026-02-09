#!/usr/bin/env node
/**
 * Generate JWT_PRIVATE_KEY and JWKS for Convex Auth.
 * Run: node scripts/generate-auth-keys.mjs
 * Then add the output to your Convex deployment env vars (Dashboard → Settings → Environment Variables).
 */
import { exportJWK, exportPKCS8, generateKeyPair } from "jose";

const keys = await generateKeyPair("RS256", { extractable: true });
const privateKey = await exportPKCS8(keys.privateKey);
const publicKey = await exportJWK(keys.publicKey);
const jwks = JSON.stringify({ keys: [{ use: "sig", ...publicKey }] });

console.log("\nAdd these to your Convex deployment (Dashboard → Settings → Environment Variables):\n");
console.log("JWT_PRIVATE_KEY=" + JSON.stringify(privateKey.trimEnd().replace(/\n/g, " ")));
console.log("\nJWKS=" + JSON.stringify(jwks));
console.log("\nAlso set CONVEX_SITE_URL to your Convex site URL (e.g. https://different-panther-929.convex.site)\n");
