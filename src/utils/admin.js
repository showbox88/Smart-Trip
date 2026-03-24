/**
 * Admin utility for Smart Trip
 */

// List of authorized administrator emails
export const ADMIN_EMAILS = [
  'showbox88@gmail.com',
];

/**
 * Checks if a user has administrative privileges
 * @param {Object} user - The user object from AppContext
 * @returns {boolean}
 */
export function isAdmin(user) {
  if (!user || !user.email) return false;
  return ADMIN_EMAILS.includes(user.email.toLowerCase());
}
