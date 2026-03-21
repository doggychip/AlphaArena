import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import session from "express-session";
import type { Express } from "express";
import { storage } from "./storage";
import { randomUUID } from "crypto";
import { log } from "./index";

function generateApiKey(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "aa_";
  for (let i = 0; i < 32; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
  return result;
}

export function setupAuth(app: Express) {
  const clientID = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const sessionSecret = process.env.SESSION_SECRET || "alphaarena-session-secret-change-me";

  // Session
  app.use(session({
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 7 * 24 * 60 * 60 * 1000 }, // 7 days
  }));

  app.use(passport.initialize());
  app.use(passport.session());

  passport.serializeUser((user: any, done) => done(null, user.id));
  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user || null);
    } catch (e) { done(e, null); }
  });

  // Google Strategy (only if credentials provided)
  if (clientID && clientSecret) {
    const callbackURL = process.env.GOOGLE_CALLBACK_URL || "/api/auth/google/callback";

    passport.use(new GoogleStrategy({
      clientID,
      clientSecret,
      callbackURL,
    }, async (_accessToken, _refreshToken, profile, done) => {
      try {
        const googleId = profile.id;
        const email = profile.emails?.[0]?.value ?? `${googleId}@google.com`;
        const displayName = profile.displayName || email.split("@")[0];
        const avatarUrl = profile.photos?.[0]?.value ?? null;

        // Check if user exists by googleId
        let user = await storage.getUserByGoogleId(googleId);
        if (!user) {
          // Check by email
          const allAgents = await storage.getAllAgents();
          // Create new user
          const userId = randomUUID();
          const apiKey = generateApiKey();
          const referralCode = userId.slice(0, 8);

          // We need to create via register or direct insert
          // For now, register creates a minimal user
          const result = await storage.register({
            username: displayName.replace(/\s+/g, "_").toLowerCase() + "_" + userId.slice(0, 4),
            email,
            password: randomUUID(), // placeholder
            agentName: `${displayName}'s Agent`,
            agentType: "hybrid",
          });
          user = result.user;
          log(`New Google user: ${displayName} (${email})`, "auth");
        }

        done(null, user);
      } catch (err) {
        done(err as Error, undefined);
      }
    }));

    // Routes
    app.get("/api/auth/google", passport.authenticate("google", { scope: ["profile", "email"] }));

    app.get("/api/auth/google/callback",
      passport.authenticate("google", { failureRedirect: "/#/register" }),
      (_req, res) => { res.redirect("/#/"); }
    );

    log("Google OAuth configured", "auth");
  } else {
    log("Google OAuth not configured (missing GOOGLE_CLIENT_ID/SECRET)", "auth");
  }

  // Auth status
  app.get("/api/auth/me", (req, res) => {
    if (req.user) {
      const u = req.user as any;
      res.json({ id: u.id, username: u.username, email: u.email, avatarUrl: u.avatarUrl, apiKey: u.apiKey });
    } else {
      res.status(401).json({ message: "Not authenticated" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.logout(() => {
      res.json({ message: "Logged out" });
    });
  });
}
