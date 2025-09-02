// middleware/auth.js
const { admin } = require("../firebase-config");

/**
 * Firebase auth middleware
 * - Accepts token from Authorization: Bearer <token> or x-firebase-token
 * - Verifies and checks revocation
 * - Attaches req.user (decoded claims) and req.firebaseUser (UserRecord)
 */
async function authenticateToken(req, res, next) {
  try {
    // 1) Extract token
    const header = req.headers.authorization || "";
    let token = null;

    if (header.startsWith("Bearer ")) {
      token = header.slice(7);
    } else if (req.headers["x-firebase-token"]) {
      token = req.headers["x-firebase-token"];
    }

    if (!token) {
      return res.status(401).json({ error: "No token provided" });
    }

    // 2) Verify token + check revocation
    //    If you don't need revocation checks, set the 2nd arg to false.
    const decoded = await admin.auth().verifyIdToken(token, true);

    // 3) (Optional) Load user record to ensure the account isn't disabled
    const userRecord = await admin.auth().getUser(decoded.uid);
    if (userRecord.disabled) {
      return res.status(403).json({ error: "User account is disabled" });
    }

    // 4) Attach to request
    req.user = decoded;        // { uid, email, ...customClaims }
    req.firebaseUser = userRecord;

    return next();
  } catch (err) {
    console.error("verifyIdToken error:", err);

    // Map common Firebase errors to cleaner API responses
    let status = 401;
    let message = "Invalid or expired token";

    // Token specifically revoked by admin
    if (err && err.code === "auth/id-token-revoked") {
      message = "Token revoked. Please sign in again.";
    } else if (err && err.code === "auth/argument-error") {
      message = "Malformed token.";
    } else if (err && err.errorInfo && err.errorInfo.code === "auth/invalid-id-token") {
      message = "Invalid ID token.";
    }

    return res.status(status).json({ error: message });
  }
}

module.exports = { authenticateToken };
