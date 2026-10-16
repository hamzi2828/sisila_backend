// src/middleware/requireAdmin.js
// Runs after `auth`. Checks the role in the database (not just the token) so a demoted or
// deactivated admin loses access immediately.
const User = require('../models/user');

module.exports = async function requireAdmin(req, res, next) {
  try {
    const userId = req.user && (req.user.id || req.user._id);
    if (!userId) {
      return res.status(401).json({ message: 'Authorization token required' });
    }
    const user = await User.findById(userId).select('role isActive').lean();
    if (!user || user.role !== 'admin' || user.isActive === false) {
      return res.status(403).json({ message: 'Admin access required' });
    }
    return next();
  } catch (err) {
    return res.status(500).json({ message: 'Failed to verify admin access' });
  }
};
