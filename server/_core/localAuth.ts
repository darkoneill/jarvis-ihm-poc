import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";
import { ENV } from "./env";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";

/**
 * Local Authentication Module
 * Provides username/password authentication for 100% local deployment
 * without dependency on Manus OAuth
 */

// Hash password using bcrypt
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

// Verify password against hash
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Generate a unique local openId for local users
export function generateLocalOpenId(): string {
  return `local_${randomUUID()}`;
}

// Initialize default admin user if LOCAL_AUTH_ENABLED and no admin exists
export async function initializeLocalAdmin(): Promise<void> {
  if (!ENV.localAuthEnabled) {
    return;
  }

  const database = await db.getDb();
  if (!database) {
    console.log("[LocalAuth] Database not available, skipping admin initialization");
    return;
  }

  try {
    // Check if admin user exists
    const existingAdmin = await db.getUserByUsername(ENV.localAdminUsername);
    
    if (!existingAdmin) {
      console.log("[LocalAuth] Creating default admin user...");
      const passwordHash = await hashPassword(ENV.localAdminPassword);
      const openId = generateLocalOpenId();
      
      await db.upsertUser({
        openId,
        username: ENV.localAdminUsername,
        passwordHash,
        name: "Administrateur Local",
        email: null,
        loginMethod: "local",
        role: "admin",
        lastSignedIn: new Date(),
      });
      
      console.log(`[LocalAuth] Admin user created: ${ENV.localAdminUsername}`);
    } else {
      console.log("[LocalAuth] Admin user already exists");
    }
  } catch (error) {
    console.error("[LocalAuth] Failed to initialize admin user:", error);
  }
}

export function registerLocalAuthRoutes(app: Express) {
  // Login endpoint
  app.post("/api/auth/local/login", async (req: Request, res: Response) => {
    if (!ENV.localAuthEnabled) {
      res.status(403).json({ error: "Local authentication is disabled" });
      return;
    }

    const { username, password } = req.body;

    if (!username || !password) {
      res.status(400).json({ error: "Username and password are required" });
      return;
    }

    try {
      const user = await db.getUserByUsername(username);

      if (!user || !user.passwordHash) {
        res.status(401).json({ error: "Invalid username or password" });
        return;
      }

      const isValid = await verifyPassword(password, user.passwordHash);

      if (!isValid) {
        res.status(401).json({ error: "Invalid username or password" });
        return;
      }

      // Update last signed in
      await db.upsertUser({
        openId: user.openId,
        lastSignedIn: new Date(),
      });

      // Create session token
      const sessionToken = await sdk.createSessionToken(user.openId, {
        name: user.name || username,
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      res.json({
        success: true,
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      });
    } catch (error) {
      console.error("[LocalAuth] Login failed:", error);
      res.status(500).json({ error: "Login failed" });
    }
  });

  // Register endpoint (admin only or first user)
  app.post("/api/auth/local/register", async (req: Request, res: Response) => {
    if (!ENV.localAuthEnabled) {
      res.status(403).json({ error: "Local authentication is disabled" });
      return;
    }

    const { username, password, name, email } = req.body;

    if (!username || !password) {
      res.status(400).json({ error: "Username and password are required" });
      return;
    }

    if (password.length < 8) {
      res.status(400).json({ error: "Password must be at least 8 characters" });
      return;
    }

    try {
      // Check if username already exists
      const existingUser = await db.getUserByUsername(username);
      if (existingUser) {
        res.status(409).json({ error: "Username already exists" });
        return;
      }

      // Create new user
      const passwordHash = await hashPassword(password);
      const openId = generateLocalOpenId();

      await db.upsertUser({
        openId,
        username,
        passwordHash,
        name: name || username,
        email: email || null,
        loginMethod: "local",
        role: "user",
        lastSignedIn: new Date(),
      });

      // Create session token
      const sessionToken = await sdk.createSessionToken(openId, {
        name: name || username,
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      res.json({
        success: true,
        message: "User registered successfully",
      });
    } catch (error) {
      console.error("[LocalAuth] Registration failed:", error);
      res.status(500).json({ error: "Registration failed" });
    }
  });

  // Change password endpoint
  app.post("/api/auth/local/change-password", async (req: Request, res: Response) => {
    if (!ENV.localAuthEnabled) {
      res.status(403).json({ error: "Local authentication is disabled" });
      return;
    }

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      res.status(400).json({ error: "Current and new passwords are required" });
      return;
    }

    if (newPassword.length < 8) {
      res.status(400).json({ error: "New password must be at least 8 characters" });
      return;
    }

    try {
      // Get current user from session
      const user = await sdk.authenticateRequest(req);

      if (!user.passwordHash) {
        res.status(400).json({ error: "User does not have local authentication" });
        return;
      }

      const isValid = await verifyPassword(currentPassword, user.passwordHash);

      if (!isValid) {
        res.status(401).json({ error: "Current password is incorrect" });
        return;
      }

      // Update password
      const newPasswordHash = await hashPassword(newPassword);
      await db.updateUserPassword(user.id, newPasswordHash);

      res.json({ success: true, message: "Password changed successfully" });
    } catch (error) {
      console.error("[LocalAuth] Password change failed:", error);
      res.status(500).json({ error: "Password change failed" });
    }
  });

  // Check auth mode endpoint
  app.get("/api/auth/mode", (req: Request, res: Response) => {
    res.json({
      localAuthEnabled: ENV.localAuthEnabled,
      oauthEnabled: !ENV.localAuthEnabled && !!ENV.oAuthServerUrl,
    });
  });

  // List local users (admin only)
  app.get("/api/auth/local/users", async (req: Request, res: Response) => {
    if (!ENV.localAuthEnabled) {
      res.status(403).json({ error: "Local authentication is disabled" });
      return;
    }

    try {
      const currentUser = await sdk.authenticateRequest(req);
      
      if (currentUser.role !== "admin") {
        res.status(403).json({ error: "Admin access required" });
        return;
      }

      const users = await db.getLocalUsers();
      res.json({
        users: users.map(u => ({
          id: u.id,
          username: u.username,
          name: u.name,
          email: u.email,
          role: u.role,
          lastSignedIn: u.lastSignedIn,
          createdAt: u.createdAt,
        })),
      });
    } catch (error) {
      console.error("[LocalAuth] Failed to list users:", error);
      res.status(500).json({ error: "Failed to list users" });
    }
  });
}
