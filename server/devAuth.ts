// Authentication fallback when Azure AD / Twilio are not configured
// Staff email+password auth is enabled when Azure SSO credentials are missing
// Phone OTP fallback is enabled when Twilio credentials are missing

import type { Express, Request, Response } from "express";
import { storage } from "./storage";
import crypto from "crypto";
import { hashPassword, verifyPassword } from "./passwordUtils";

// Check if Azure SSO is fully configured (both credentials required)
const AZURE_SSO_CONFIGURED = !!(
  process.env.AZURE_CLIENT_ID && 
  process.env.AZURE_CLIENT_SECRET
);

// Staff fallback auth enabled when Azure SSO is NOT configured
const STAFF_FALLBACK_ENABLED = !AZURE_SSO_CONFIGURED;

// Check if Twilio is configured for phone OTP
const TWILIO_CONFIGURED = !!(
  process.env.TWILIO_ACCOUNT_SID && 
  process.env.TWILIO_AUTH_TOKEN
);

// OTP fallback enabled when Twilio is NOT configured  
const OTP_FALLBACK_ENABLED = !TWILIO_CONFIGURED;

// In-memory OTP storage for dev mode
const devOtpStore = new Map<string, { otp: string; expiresAt: number; userData: any }>();

export function setupDevAuth(app: Express) {
  // Log auth configuration status
  if (STAFF_FALLBACK_ENABLED) {
    console.log("[Auth] Staff email+password fallback ENABLED (Azure SSO not configured)");
  } else {
    console.log("[Auth] Microsoft SSO configured with Azure AD");
  }
  
  if (OTP_FALLBACK_ENABLED) {
    console.log("[Auth] Phone OTP fallback ENABLED (Twilio not configured)");
  } else {
    console.log("[Auth] Phone OTP configured with Twilio");
  }

  // ==========================================
  // MICROSOFT SSO (Staff) - Fallback Auth
  // ==========================================
  
  if (STAFF_FALLBACK_ENABLED) {
    console.log("[Auth] Staff signup/login via email+password is available");
    
    // Dev mode: Show staff signup form instead of redirecting to Azure
    app.get("/api/login/microsoft", (req: Request, res: Response) => {
      res.redirect("/auth/staff-proposal");
    });
    
    // Dev mode: Direct staff account creation (bypasses Azure)
    app.post("/api/auth/dev/staff-signup", async (req: Request, res: Response) => {
      try {
        const { email, firstName, lastName, proposedRole, notes, password } = req.body;
        
        // Validate email domain in dev mode (still enforce @melaniacalvin.com)
        if (!email.endsWith("@melaniacalvin.com")) {
          return res.status(400).json({ 
            message: "Staff accounts must use @melaniacalvin.com email domain" 
          });
        }
        
        // Validate password
        if (!password || password.length < 8) {
          return res.status(400).json({ 
            message: "Password must be at least 8 characters long" 
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
        
        // Hash password
        const passwordHash = await hashPassword(password);
        
        // Create pending staff user
        const userId = crypto.randomUUID();
        await storage.upsertUser({
          id: userId,
          email,
          firstName,
          lastName,
          profileImageUrl: null,
        });
        
        // Update user with pending status, auth provider, and password hash
        await storage.updateUserForStaffSignup(userId, {
          status: "pending",
          authProvider: "microsoft",
          passwordHash,
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
        const { email, password } = req.body;
        
        // Validate email domain
        if (!email.endsWith("@melaniacalvin.com")) {
          return res.status(400).json({ 
            message: "Staff accounts must use @melaniacalvin.com email domain" 
          });
        }
        
        const user = await storage.getUserByEmail(email);
        if (!user) {
          return res.status(401).json({ message: "Invalid email or password" });
        }
        
        // Verify password
        if (!user.passwordHash) {
          return res.status(401).json({ message: "Invalid email or password" });
        }
        
        const isPasswordValid = await verifyPassword(password, user.passwordHash);
        if (!isPasswordValid) {
          return res.status(401).json({ message: "Invalid email or password" });
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
    // Azure SSO is configured - redirect to Azure for staff login
    // TODO: Implement real Azure AD OAuth when credentials are available
    app.get("/api/login/microsoft", (req: Request, res: Response) => {
      res.redirect("/auth/staff-proposal");
    });
  }
  
  // ==========================================
  // PHONE OTP (Student/Parent) - Fallback Auth
  // ==========================================
  
  if (OTP_FALLBACK_ENABLED) {
    
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
    // Twilio is configured - implement real OTP
    // TODO: Implement real Twilio OTP when credentials are available
    app.post("/api/auth/otp/request", (req: Request, res: Response) => {
      res.status(501).json({ message: "Twilio integration not yet implemented" });
    });
    
    app.post("/api/auth/otp/verify", (req: Request, res: Response) => {
      res.status(501).json({ message: "Twilio integration not yet implemented" });
    });
  }
  
  // Get auth status (for frontend to know which flows to show)
  app.get("/api/auth/dev-status", (req: Request, res: Response) => {
    res.json({
      staffFallbackEnabled: STAFF_FALLBACK_ENABLED,
      otpFallbackEnabled: OTP_FALLBACK_ENABLED,
    });
  });
}
