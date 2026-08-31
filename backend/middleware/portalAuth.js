// Guards for the team portal — a separate concern from the GoCardless billing
// admin area (see middleware/adminAuth.js). Uses the same express-session
// instance already configured in server.js, but a distinct session key
// (`req.session.portalUser`) so the two login systems never collide.

// Guards portal HTML pages: unauthenticated visitors are redirected to the
// portal login form rather than shown JSON.
function requirePortalPage(req, res, next) {
  if (req.session && req.session.portalUser) {
    return next();
  }
  res.redirect("/portal/login");
}

// Guards the portal's JSON API: unauthenticated callers get a 401, not a
// redirect (there's no browser navigation to redirect).
function requirePortalApi(req, res, next) {
  if (req.session && req.session.portalUser) {
    return next();
  }
  res.status(401).json({ error: "Not authenticated" });
}

// Role gate factory — usage: requireRole("admin") or requireRole("admin", "bestuur").
// Must run after requirePortalApi/requirePortalPage so req.session.portalUser exists.
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (allowedRoles.includes(req.session.portalUser.role)) {
      return next();
    }
    res.status(403).json({ error: "Forbidden" });
  };
}

module.exports = { requirePortalPage, requirePortalApi, requireRole };
