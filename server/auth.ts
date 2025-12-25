import session from "express-session";
import type { Express, Request, Response, NextFunction, RequestHandler } from "express";
import connectPg from "connect-pg-simple";
import bcrypt from "bcrypt";
import { storage } from "./storage";

declare module "express-session" {
  interface SessionData {
    userId: string;
  }
}

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: sessionTtl,
      sameSite: "lax",
    },
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());

  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password required" });
      }

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      // Only students and parents may use this login route
      if (user.role !== "student" && user.role !== "parent") {
        return res.status(403).json({
          message: "Please use the staff login portal"
        });
      }

      if (!user.passwordHash) {
        return res.status(401).json({ message: "Password not set. Please use password reset." });
      }

      const isValid = await bcrypt.compare(password, user.passwordHash);
      if (!isValid) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      if (!user.isActive) {
        return res.status(403).json({ message: "Account is inactive" });
      }

      if (user.status === "pending") {
        return res.status(403).json({ message: "Account pending approval" });
      }

      if (user.status === "rejected") {
        return res.status(403).json({ message: "Account has been rejected" });
      }

      req.session.userId = user.id;
      req.session.save((err) => {
        if (err) {
          console.error("Session save error:", err);
          return res.status(500).json({ message: "Login failed" });
        }
        res.json({ 
          message: "Login successful",
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            isSuperAdmin: user.isSuperAdmin,
          }
        });
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.post("/api/auth/signup", async (req: Request, res: Response) => {
    try {
      const { email, password, firstName, lastName, role } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password required" });
      }

      if (password.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters" });
      }

      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "Email already registered" });
      }

      // Only students and parents may self-signup
      if (role !== "student" && role !== "parent") {
        return res.status(403).json({
          message: "Only students and parents may sign up here"
        });
      }

      const userRole = role;

      const passwordHash = await bcrypt.hash(password, 10);
      
      const user = await storage.createUser({
        email,
        passwordHash,
        firstName: firstName || null,
        lastName: lastName || null,
        role: userRole,
        authProvider: "local",
        isActive: true,
        status: "active",
      });

      req.session.userId = user.id;
      req.session.save((err) => {
        if (err) {
          console.error("Session save error:", err);
          return res.status(500).json({ message: "Signup failed" });
        }
        res.status(201).json({ 
          message: "Account created successfully",
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
          }
        });
      });
    } catch (error) {
      console.error("Signup error:", error);
      res.status(500).json({ message: "Signup failed" });
    }
  });

  app.post("/api/auth/staff-login", async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password required" });
      }

      // 1. Lookup user first
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      // 2. Domain check: Super Admins bypass, others need @melaniacalvin.com
      if (!user.isSuperAdmin && !email.endsWith("@melaniacalvin.com")) {
        return res.status(403).json({ message: "Staff accounts must use @melaniacalvin.com email domain" });
      }

      // 3. Role check (Super Admins can also bypass this)
      const staffRoles = ["tutor", "manager", "admin"];
      if (!user.isSuperAdmin && !staffRoles.includes(user.role)) {
        return res.status(403).json({ message: "Not a staff account" });
      }

      if (!user.passwordHash) {
        return res.status(401).json({ message: "Password not set. Please contact admin." });
      }

      const isValid = await bcrypt.compare(password, user.passwordHash);
      if (!isValid) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      if (!user.isActive) {
        return res.status(403).json({ message: "Account is inactive" });
      }

      if (user.status === "pending") {
        return res.status(403).json({ message: "Account pending approval" });
      }

      req.session.userId = user.id;
      req.session.save((err) => {
        if (err) {
          console.error("Session save error:", err);
          return res.status(500).json({ message: "Login failed" });
        }
        res.json({ 
          message: "Login successful",
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            isSuperAdmin: user.isSuperAdmin,
            adminLevel: user.adminLevel,
          }
        });
      });
    } catch (error) {
      console.error("Staff login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.get("/api/logout", (req: Request, res: Response) => {
    req.session.destroy((err) => {
      if (err) {
        console.error("Logout error:", err);
      }
      res.redirect("/");
    });
  });

  app.post("/api/auth/logout", (req: Request, res: Response) => {
    req.session.destroy((err) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({ message: "Logout failed" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  if (process.env.BOOTSTRAP_TOKEN) {
    app.post("/api/bootstrap/super-admin", async (req: Request, res: Response) => {
      try {
        const token = req.headers["x-bootstrap-token"];
        
        if (!token || token !== process.env.BOOTSTRAP_TOKEN) {
          return res.status(401).json({ message: "Invalid bootstrap token" });
        }

        const { password } = req.body;
        const ownerEmail = "tckeche@gmail.com";

        let user = await storage.getUserByEmail(ownerEmail);
        
        const updates: any = {
          isSuperAdmin: true,
          isActive: true,
          status: "active",
          role: "admin",
          adminLevel: 4,
        };

        if (password) {
          if (password.length < 6) {
            return res.status(400).json({ message: "Password must be at least 6 characters" });
          }
          updates.passwordHash = await bcrypt.hash(password, 10);
        }

        if (user) {
          user = await storage.updateUser(user.id, updates);
          res.json({ 
            message: "Super admin account updated successfully",
            passwordSet: !!password,
          });
        } else {
          if (!password) {
            return res.status(400).json({ message: "Password required for new account" });
          }
          user = await storage.createUser({
            email: ownerEmail,
            firstName: "Owner",
            lastName: "Admin",
            ...updates,
          });
          res.status(201).json({ 
            message: "Super admin account created successfully",
            passwordSet: true,
          });
        }
      } catch (error) {
        console.error("Bootstrap error:", error);
        res.status(500).json({ message: "Bootstrap failed" });
      }
    });
  }
}

export const isAuthenticated: RequestHandler = async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.session?.userId;
  
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const user = await storage.getUser(userId);
  if (!user) {
    return res.status(401).json({ message: "User not found" });
  }

  if (!user.isActive) {
    return res.status(403).json({ message: "Account is inactive" });
  }

  (req as any).user = { claims: { sub: userId } };
  (req as any).dbUser = user;
  
  next();
};

export const requireRole = (roles: Array<string>): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).dbUser;

    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!roles.includes(user.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    next();
  };
};

export const requireAdminLevel = (minLevel: number) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).dbUser;

    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (user.isSuperAdmin) {
      return next();
    }

    if (user.role !== "admin" && user.role !== "manager") {
      return res.status(403).json({ message: "Admin access required" });
    }

    if ((user.adminLevel || 0) < minLevel) {
      return res.status(403).json({
        message: `Admin level ${minLevel}+ required`,
      });
    }

    next();
  };
};

