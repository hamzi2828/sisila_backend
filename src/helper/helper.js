// src/helper/helper.js
const jwt = require('jsonwebtoken');

/**
 * Extracts user information from JWT token
 * @param {string} token - JWT token from Authorization header
 * @returns {Object|null} User object or null if invalid token
 */
function getUserFromToken(token) {
  if (!token) return null;
  
  try {
    // Remove 'Bearer ' prefix if present
    const tokenValue = token.startsWith('Bearer ') ? token.slice(7) : token;
    const secret = process.env.JWT_SECRET;
    
    if (!secret) {
      console.error('JWT_SECRET is not configured');
      return null;
    }
    
    // Verify and decode the token
    const decoded = jwt.verify(tokenValue, secret);
    
    // Return only the user information we need
    return {
      id: decoded.id,
      email: decoded.email,
      firstName: decoded.firstName,
      lastName: decoded.lastName
    };
  } catch (error) {
    console.error('Error decoding token:', error.message);
    return null;
  }
}

/**
 * Read a boolean from a request body value. Multipart FormData sends booleans as strings,
 * and Boolean('false') === true, so the usual spellings are parsed explicitly.
 * @param {*} value - Raw value from req.body (boolean, number or string)
 * @param {boolean} fallback - Returned when the value is missing, empty or not recognised
 * @returns {boolean}
 */
function toBoolean(value, fallback = false) {
  if (Array.isArray(value)) value = value[value.length - 1]; // field sent twice: last one wins
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const v = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'on'].includes(v)) return true;
    if (['false', '0', 'no', 'off'].includes(v)) return false;
  }
  return fallback;
}

module.exports = {
  getUserFromToken,
  toBoolean
};