import crypto from "node:crypto";
import { BATTLE_CONFIG } from "../config.js";

const SECRET = BATTLE_CONFIG.JWT_SECRET;

function base64UrlEncode(str) {
  return Buffer.from(str)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function base64UrlDecode(str) {
  str = str.replace(/-/g, "+").replace(/_/g, "/");
  while (str.length % 4) {
    str += "=";
  }
  return Buffer.from(str, "base64").toString("utf-8");
}

export const tokenService = {
  createToken(payload, expiresInDays = 30) {
    const header = { alg: "HS256", typ: "JWT" };
    const exp = Date.now() + expiresInDays * 24 * 60 * 60 * 1000;
    const fullPayload = { ...payload, exp };

    const encodedHeader = base64UrlEncode(JSON.stringify(header));
    const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));

    const signature = crypto
      .createHmac("sha256", SECRET)
      .update(`${encodedHeader}.${encodedPayload}`)
      .digest("base64")
      .replace(/=/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");

    return `${encodedHeader}.${encodedPayload}.${signature}`;
  },

  verifyToken(token) {
    if (!token || typeof token !== "string") return null;
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const [encodedHeader, encodedPayload, signature] = parts;
    const expectedSig = crypto
      .createHmac("sha256", SECRET)
      .update(`${encodedHeader}.${encodedPayload}`)
      .digest("base64")
      .replace(/=/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");

    if (signature !== expectedSig) return null;

    try {
      const payload = JSON.parse(base64UrlDecode(encodedPayload));
      if (payload.exp && Date.now() > payload.exp) {
        return null; // Expired
      }
      return payload;
    } catch {
      return null;
    }
  },
};
