function isAuthenticated(req, res, next) {
  console.log('*** isAuthenticated ***')
  if (req.session?.user) {
    return next();
  }
  return res.status(401).json({ message: 'Unauthorized' });
}

function isAdmin(req, res, next) {
  if (req.session?.user?.roles?.includes('admin')) {
    return next();
  }
  return res.status(403).json({ message: 'Forbidden: Admins only' });
}

function isVerified(req, res, next) {
  if (req.session?.user?.roles?.includes('verified')) {
    return next();
  }
  return res.status(403).json({ message: 'Forbidden: Verified athletes only' });
}

module.exports = {
  isAuthenticated,
  isAdmin,
  isVerified
};
