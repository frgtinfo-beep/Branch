// Guards the HTML admin page: unauthenticated visitors are redirected to the
// login form rather than shown JSON.
function requireAdminPage(req, res, next) {
  if (req.session && req.session.isAdmin) {
    return next();
  }
  res.redirect("/admin/login");
}

// Guards the JSON API the admin page calls: unauthenticated callers get a
// 401, not a redirect (there's no browser navigation to redirect).
function requireAdminApi(req, res, next) {
  if (req.session && req.session.isAdmin) {
    return next();
  }
  res.status(401).json({ error: "Not authenticated" });
}

module.exports = { requireAdminPage, requireAdminApi };
