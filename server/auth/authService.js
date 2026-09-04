import crypto from "node:crypto";
import { dbService } from "../db/index.js";
import { tokenService } from "./tokenService.js";

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = crypto.scryptSync(password, salt, 64);
  return `${salt}:${derivedKey.toString("hex")}`;
}

function verifyPassword(password, storedHash) {
  if (!storedHash) return false;
  const [salt, key] = storedHash.split(":");
  if (!salt || !key) return false;
  const derivedKey = crypto.scryptSync(password, salt, 64);
  return crypto.timingSafeEqual(Buffer.from(key, "hex"), derivedKey);
}

export const authService = {
  validateUsername(username) {
    if (!username || typeof username !== "string") {
      return { valid: false, error: "Username is required." };
    }
    const trimmed = username.trim();
    if (trimmed.length < 3 || trimmed.length > 20) {
      return { valid: false, error: "Callsign must be between 3 and 20 characters." };
    }
    if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
      return { valid: false, error: "Callsign can only contain letters, numbers, and underscores." };
    }
    return { valid: true, username: trimmed };
  },

  register({ username, password }) {
    const check = this.validateUsername(username);
    if (!check.valid) return { error: check.error };

    const existing = dbService.getUserByUsername(check.username);
    if (existing) {
      return { error: "Callsign is already taken." };
    }

    if (!password || password.length < 4) {
      return { error: "Password must have at least 4 characters." };
    }

    const id = crypto.randomUUID();
    const passwordHash = hashPassword(password);
    dbService.createUser({ id, username: check.username, passwordHash });

    const profile = dbService.getProfileByUserId(id);
    const token = tokenService.createToken({ userId: id, username: check.username });

    return { success: true, user: profile, token };
  },

  login({ username, password }) {
    if (!username || !password) {
      return { error: "Username and password are required." };
    }

    const user = dbService.getUserByUsername(username);
    if (!user || !user.password_hash) {
      return { error: "Invalid credentials." };
    }

    if (!verifyPassword(password, user.password_hash)) {
      return { error: "Invalid credentials." };
    }

    const profile = dbService.getProfileByUserId(user.id);
    const token = tokenService.createToken({ userId: user.id, username: user.username });

    return { success: true, user: profile, token };
  },

  createGuest(preferredCallsign) {
    let callsign = preferredCallsign;
    if (!callsign || !this.validateUsername(callsign).valid) {
      const randomSuffix = Math.floor(100 + Math.random() * 900);
      callsign = `Analyst_${randomSuffix}`;
    }

    // Ensure unique
    let attempt = 0;
    let finalCallsign = callsign;
    while (dbService.getUserByUsername(finalCallsign)) {
      attempt++;
      finalCallsign = `${callsign}_${attempt}`;
    }

    const id = crypto.randomUUID();
    dbService.createUser({ id, username: finalCallsign, passwordHash: null });

    const profile = dbService.getProfileByUserId(id);
    const token = tokenService.createToken({ userId: id, username: finalCallsign });

    return { success: true, user: profile, token };
  },

  updateCallsign(userId, newUsername) {
    const check = this.validateUsername(newUsername);
    if (!check.valid) return { error: check.error };

    const existing = dbService.getUserByUsername(check.username);
    if (existing && existing.id !== userId) {
      return { error: "Callsign is already taken." };
    }

    const updated = dbService.updateUsername(userId, check.username);
    const newToken = tokenService.createToken({ userId, username: check.username });
    return { success: true, user: updated, token: newToken };
  },

  getProfile(userId) {
    return dbService.getProfileByUserId(userId);
  },
};
