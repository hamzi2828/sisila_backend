// src/middleware/optionalAdmin.js
// For public routes that show extra data to admins (e.g. draft blogs). Never rejects the request:
// sets req.isAdmin = true only when a valid Bearer token belongs to an active admin (checked in the
// database, like requireAdmin). A missing, invalid or expired token is treated as a public visitor.
const jwt = require('jsonwebtoken');
const User = require('../models/user');

module.exports = async function optionalAdmin(req, res, next) {
  req.isAdmin = false;
  try {
    const authHeader = req.headers['authorization'] || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    const secret = process.env.JWT_SECRET;
    if (!token || !secret) return next();

    const decoded = jwt.verify(token, secret);
    const userId = decoded && (decoded.id || decoded._id);
    if (!userId) return next();

    const user = await User.findById(userId).select('role isActive').lean();
    req.isAdmin = Boolean(user && user.role === 'admin' && user.isActive !== false);
  } catch (err) {
    req.isAdmin = false; // bad token or lookup failure: carry on as a public visitor
  }
  return next();
};
