import { describe, it, expect, vi, beforeEach } from "vitest";
import { hashPassword, verifyPassword, generateLocalOpenId } from "./localAuth";

// Mock the ENV module
vi.mock("./env", () => ({
  ENV: {
    localAuthEnabled: true,
    localAdminUsername: "admin",
    localAdminPassword: "jarvis2024",
    cookieSecret: "test-secret-key-for-testing-purposes-only",
    appId: "test-app-id",
    oAuthServerUrl: "",
    ownerOpenId: "",
  },
}));

// Mock the database module
vi.mock("../db", () => ({
  getDb: vi.fn().mockResolvedValue(null),
  getUserByUsername: vi.fn().mockResolvedValue(null),
  upsertUser: vi.fn().mockResolvedValue(undefined),
  updateUserPassword: vi.fn().mockResolvedValue(undefined),
  getLocalUsers: vi.fn().mockResolvedValue([]),
}));

describe("Local Authentication Module", () => {
  describe("hashPassword", () => {
    it("should hash a password", async () => {
      const password = "testPassword123";
      const hash = await hashPassword(password);
      
      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(0);
      // bcrypt hashes start with $2a$ or $2b$
      expect(hash).toMatch(/^\$2[ab]\$/);
    });

    it("should generate different hashes for the same password", async () => {
      const password = "testPassword123";
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);
      
      expect(hash1).not.toBe(hash2);
    });
  });

  describe("verifyPassword", () => {
    it("should verify a correct password", async () => {
      const password = "testPassword123";
      const hash = await hashPassword(password);
      
      const isValid = await verifyPassword(password, hash);
      
      expect(isValid).toBe(true);
    });

    it("should reject an incorrect password", async () => {
      const password = "testPassword123";
      const wrongPassword = "wrongPassword456";
      const hash = await hashPassword(password);
      
      const isValid = await verifyPassword(wrongPassword, hash);
      
      expect(isValid).toBe(false);
    });

    it("should handle empty password", async () => {
      const password = "testPassword123";
      const hash = await hashPassword(password);
      
      const isValid = await verifyPassword("", hash);
      
      expect(isValid).toBe(false);
    });
  });

  describe("generateLocalOpenId", () => {
    it("should generate a unique local openId", () => {
      const openId = generateLocalOpenId();
      
      expect(openId).toBeDefined();
      expect(openId).toMatch(/^local_[a-f0-9-]{36}$/);
    });

    it("should generate different openIds each time", () => {
      const openId1 = generateLocalOpenId();
      const openId2 = generateLocalOpenId();
      
      expect(openId1).not.toBe(openId2);
    });

    it("should start with 'local_' prefix", () => {
      const openId = generateLocalOpenId();
      
      expect(openId.startsWith("local_")).toBe(true);
    });
  });

  describe("Password Security", () => {
    it("should handle special characters in password", async () => {
      const password = "P@$$w0rd!#%^&*()";
      const hash = await hashPassword(password);
      
      const isValid = await verifyPassword(password, hash);
      
      expect(isValid).toBe(true);
    });

    it("should handle unicode characters in password", async () => {
      const password = "motdepasse日本語";
      const hash = await hashPassword(password);
      
      const isValid = await verifyPassword(password, hash);
      
      expect(isValid).toBe(true);
    });

    it("should handle very long passwords", async () => {
      const password = "a".repeat(100);
      const hash = await hashPassword(password);
      
      const isValid = await verifyPassword(password, hash);
      
      expect(isValid).toBe(true);
    });

    it("should be case sensitive", async () => {
      const password = "TestPassword";
      const hash = await hashPassword(password);
      
      const isValidLower = await verifyPassword("testpassword", hash);
      const isValidUpper = await verifyPassword("TESTPASSWORD", hash);
      const isValidCorrect = await verifyPassword("TestPassword", hash);
      
      expect(isValidLower).toBe(false);
      expect(isValidUpper).toBe(false);
      expect(isValidCorrect).toBe(true);
    });
  });
});
