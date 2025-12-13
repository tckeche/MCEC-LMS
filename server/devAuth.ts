// Development-mode authentication bypass
// This file provides dev-mode authentication when Azure AD / Twilio are not configured
// SECURITY: Dev routes are ONLY enabled when NODE_ENV is "development"

import type { Express, Request, Response } from "express";
import { storage } from "./storage";
import crypto from "crypto";

// SECURITY: Only enable dev mode in development environment AND when credentials are missing
const IS_DEVELOPMENT = process.env.NODE_ENV === "development";
const AZURE_CREDS_MISSING = !process.env.AZURE_CLIENT_ID || !process.env.AZURE_CLIENT_SECRET;
const TWILIO_CREDS_MISSING = !process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN;

// Dev mode requires BOTH: development environment AND missing credentials
const IS_DEV_MODE = IS_DEVELOPMENT && AZURE_CREDS_MISSING;
const IS_OTP_DEV_MODE = IS_DEVELOPMENT && TWILIO_CREDS_MISSING;

// In-memory OTP storage for dev mode
const devOtpStore = new Map<string, { otp: string; expiresAt: number; userData: any }>();

export function setupDevAuth(app: Express) {
  // Log security warnings for production
  if (!IS_DEVELOPMENT && AZURE_CREDS_MISSING) {
    console.warn("[SECURITY WARNING] AZURE_CLIENT_ID or AZURE_CLIENT_SECRET missing in production!");
    console.warn("[SECURITY WARNING] Microsoft SSO will NOT work. Dev mode is disabled for security.");
  }
  
  if (!IS_DEVELOPMENT && TWILIO_CREDS_MISSING) {
    console.warn("[SECURITY WARNING] TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN missing in production!");
    console.warn("[SECURITY WARNING] Phone OTP will NOT work. Dev mode is disabled for security.");
  }

  // ==========================================
  // MICROSOFT SSO (Staff) - Dev Mode Bypass
  // ==========================================
  
  if (IS_DEV_MODE) {
    console.log("[Dev Auth] Microsoft SSO running in DEVELOPMENT MODE - no Azure credentials required");
    
    // Dev mode: Show staff signup form instead of redirecting to Azure
    app.get("/api/login/microsoft", (req: Request, res: Response) => {
      res.redirect("/auth/staff-proposal");
    });
    
    // Dev mode: Direct staff account creation (bypasses Azure)
    app.post("/api/auth/dev/staff-signup", async (req: Request, res: Response) => {
      try {
        const { email, firstName, lastName, proposedRole, notes } = req.body;
        
        // Validate email domain in dev mode (still enforce @melaniacalvin.com)
        if (!email.endsWith("@melaniacalvin.com")) {
          return res.status(400).json({ 
            message: "Staff accounts must use @melaniacalvin.com email domain" 
          });
        }
        
        // Validate proposed role
        if (!["tutor", "manager", "admin"].includes(proposedRole)) {
          return res.status(400).json({ 
            message: "Invalid role. Must be tutor, manager, or admin" 
          });
        }
        
        // Check if user already exists
        const existingUser = await storage.getUserByEmail(email);
        if (existingUser) {
          return res.status(400).json({ 
            message: "An account with this email already exists" 
          });
        }
        
        // Create pending staff user
        const userId = crypto.randomUUID();
        await storage.upsertUser({
          id: userId,
          email,
          firstName,
          lastName,
          profileImageUrl: null,
        });
        
        // Update user with pending status and auth provider
        await storage.updateUserForStaffSignup(userId, {
          status: "pending",
          authProvider: "microsoft",
          proposedRole,
          role: "student", // Default role until approved
        });
        
        // Create staff role request
        await storage.createStaffRoleRequest({
          userId,
          proposedRole,
          notes: notes || null,
          status: "pending",
        });
        
        res.status(201).json({ 
          message: "Staff account created and pending approval",
          userId,
        });
      } catch (error) {
        console.error("Error in dev staff signup:", error);
        res.status(500).json({ message: "Failed to create staff account" });
      }
    });
    
    // Dev mode: Login as staff (for testing approved accounts)
    app.post("/api/auth/dev/staff-login", async (req: Request, res: Response) => {
      try {
        const { email } = req.body;
        
        const user = await storage.getUserByEmail(email);
        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }
        
        if (user.status !== "active") {
          return res.status(403).json({ 
            message: `Account is ${user.status}. Please wait for approval.` 
          });
        }
        
        // Create session
        const sessionUser = {
          claims: {
            sub: user.id,
            email: user.email,
            first_name: user.firstName,
            last_name: user.lastName,
            profile_image_url: user.profileImageUrl,
          },
          access_token: "dev-token-" + crypto.randomUUID(),
          refresh_token: "dev-refresh-" + crypto.randomUUID(),
          expires_at: Math.floor(Date.now() / 1000) + 3600 * 24, // 24 hours
        };
        
        req.login(sessionUser, (err) => {
          if (err) {
            console.error("Login error:", err);
            return res.status(500).json({ message: "Login failed" });
          }
          res.json({ message: "Login successful", redirect: "/" });
        });
      } catch (error) {
        console.error("Error in dev staff login:", error);
        res.status(500).json({ message: "Failed to login" });
      }
    });
  } else {
    if (AZURE_CREDS_MISSING) {
      console.log("[Auth] Microsoft SSO disabled - Azure credentials not configured");
      app.get("/api/login/microsoft", (req: Request, res: Response) => {
        res.status(503).json({ message: "Microsoft SSO is not configured" });
      });
    } else {
      console.log("[Auth] Microsoft SSO configured with Azure AD");
      // TODO: Implement real Azure AD OAuth when credentials are available
      app.get("/api/login/microsoft", (req: Request, res: Response) => {
        res.redirect("/auth/staff-proposal");
      });
    }
  }
  
  // ==========================================
  // PHONE OTP (Student/Parent) - Dev Mode Bypass
  // ==========================================
  
  if (IS_OTP_DEV_MODE) {
    console.log("[Dev Auth] Phone OTP running in DEVELOPMENT MODE - no Twilio credentials required");
    
    // Dev mode: Request OTP (logs OTP to console for testing)
    app.post("/api/auth/otp/request", async (req: Request, res: Response) => {
      try {
        const { phoneNumber, firstName, lastName, role } = req.body;
        
        if (!phoneNumber || !firstName || !lastName || !role) {
          return res.status(400).json({ message: "All fields are required" });
        }
        
        if (!["student", "parent"].includes(role)) {
          return res.status(400).json({ message: "Role must be student or parent" });
        }
        
        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes
        
        // Store OTP with user data
        devOtpStore.set(phoneNumber, {
          otp,
          expiresAt,
          userData: { firstName, lastName, role, phoneNumber },
        });
        
        // Log OTP to console (dev only) - console is only visible to developers
        console.log(`[Dev OTP] Code for ${phoneNumber}: ${otp}`);
        
        res.json({ 
          message: "OTP sent (dev mode)",
          // Return OTP in response for dev mode testing
          devOtp: otp,
          expiresIn: 600, // 10 minutes in seconds
        });
      } catch (error) {
        console.error("Error requesting OTP:", error);
        res.status(500).json({ message: "Failed to send OTP" });
      }
    });
    
    // Dev mode: Verify OTP and create/login user
    app.post("/api/auth/otp/verify", async (req: Request, res: Response) => {
      try {
        const { phoneNumber, otp } = req.body;
        
        if (!phoneNumber || !otp) {
          return res.status(400).json({ message: "Phone number and OTP are required" });
        }
        
        const stored = devOtpStore.get(phoneNumber);
        if (!stored) {
          return res.status(400).json({ message: "No OTP found. Please request a new one." });
        }
        
        if (Date.now() > stored.expiresAt) {
          devOtpStore.delete(phoneNumber);
          return res.status(400).json({ message: "OTP expired. Please request a new one." });
        }
        
        if (stored.otp !== otp) {
          return res.status(400).json({ message: "Invalid OTP" });
        }
        
        // OTP verified - clear it
        devOtpStore.delete(phoneNumber);
        
        const { firstName, lastName, role } = stored.userData;
        
        // Check if user exists
        let user = await storage.getUserByPhone(phoneNumber);
        
        if (!user) {
          // Create new user
          const userId = crypto.randomUUID();
          await storage.upsertUser({
            id: userId,
            email: null,
            firstName,
            lastName,
            profileImageUrl: null,
          });
          
          // Update with phone auth details
          await storage.updateUserForPhoneSignup(userId, {
            phoneNumber,
            role,
            authProvider: "phone_otp",
            status: "active",
          });
          
          user = await storage.getUser(userId);
        }
        
        if (!user) {
          return res.status(500).json({ message: "Failed to create user" });
        }
        
        // Create session
        const sessionUser = {
          claims: {
            sub: user.id,
            email: user.email,
            first_name: user.firstName,
            last_name: user.lastName,
            profile_image_url: user.profileImageUrl,
          },
          access_token: "dev-token-" + crypto.randomUUID(),
          refresh_token: "dev-refresh-" + crypto.randomUUID(),
          expires_at: Math.floor(Date.now() / 1000) + 3600 * 24 * 7, // 7 days
        };
        
        req.login(sessionUser, (err) => {
          if (err) {
            console.error("Login error:", err);
            return res.status(500).json({ message: "Login failed" });
          }
          res.json({ message: "Login successful", redirect: "/" });
        });
      } catch (error) {
        console.error("Error verifying OTP:", error);
        res.status(500).json({ message: "Failed to verify OTP" });
      }
    });
  } else {
    if (TWILIO_CREDS_MISSING) {
      console.log("[Auth] Phone OTP disabled - Twilio credentials not configured");
      app.post("/api/auth/otp/request", (req: Request, res: Response) => {
        res.status(503).json({ message: "Phone OTP is not configured" });
      });
      
      app.post("/api/auth/otp/verify", (req: Request, res: Response) => {
        res.status(503).json({ message: "Phone OTP is not configured" });
      });
    } else {
      console.log("[Auth] Phone OTP configured with Twilio");
      // TODO: Implement real Twilio OTP when credentials are available
      app.post("/api/auth/otp/request", (req: Request, res: Response) => {
        res.status(501).json({ message: "Twilio integration not yet implemented" });
      });
      
      app.post("/api/auth/otp/verify", (req: Request, res: Response) => {
        res.status(501).json({ message: "Twilio integration not yet implemented" });
      });
    }
  }
  
  // Get dev mode status (for frontend to know which flows to show)
  // SECURITY: Only expose dev status, not credentials or sensitive info
  app.get("/api/auth/dev-status", (req: Request, res: Response) => {
    res.json({
      microsoftDevMode: IS_DEV_MODE,
      otpDevMode: IS_OTP_DEV_MODE,
    });
  });
}
