// Storefront origins allowed to call the API (CORS) and to receive Stripe redirects.
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:3000';

const ALLOWED_ORIGINS = [
  FRONTEND_ORIGIN,
  'https://www.silsilla.pk',
  'https://silsilla.pk',
  'https://sisila-frontend.vercel.app',
  'https://gymwear-frontend.vercel.app',
  'http://localhost:3000',
  'http://localhost:3001',
];

// Send shoppers back to the storefront they came from, so they return signed in on the same domain.
function storefrontOrigin(requestOrigin) {
  if (requestOrigin && ALLOWED_ORIGINS.includes(requestOrigin)) return requestOrigin;
  return FRONTEND_ORIGIN;
}

module.exports = { FRONTEND_ORIGIN, ALLOWED_ORIGINS, storefrontOrigin };
