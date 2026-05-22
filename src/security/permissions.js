export const ROLES = {
  GUEST: 'guest',
  USER: 'user',
  STAKER: 'staker',
  GOVERNOR: 'governor',
  ADMIN: 'admin',
};

// Role hierarchy: higher index = more permissions
const ROLE_HIERARCHY = [
  ROLES.GUEST,
  ROLES.USER,
  ROLES.STAKER,
  ROLES.GOVERNOR,
  ROLES.ADMIN,
];

// Action → minimum required role
const ACTION_PERMISSIONS = {
  // Public actions
  'view:artifacts': ROLES.GUEST,
  'view:protocol': ROLES.GUEST,
  'scan:qr': ROLES.GUEST,

  // Wallet-gated actions
  'verify:qr': ROLES.USER,
  'create:receipt': ROLES.USER,
  'export:receipts': ROLES.USER,
  'view:audit': ROLES.USER,
  'sign:message': ROLES.USER,

  // Staker actions
  'stake:tokens': ROLES.STAKER,
  'unstake:tokens': ROLES.STAKER,
  'claim:rewards': ROLES.STAKER,

  // Governance actions
  'vote:proposal': ROLES.GOVERNOR,
  'create:proposal': ROLES.GOVERNOR,

  // Admin actions
  'export:audit': ROLES.ADMIN,
  'admin:panel': ROLES.ADMIN,
  'manage:users': ROLES.ADMIN,
};

// Actions that require wallet connection regardless of role
const WALLET_REQUIRED_ACTIONS = new Set([
  'verify:qr',
  'create:receipt',
  'export:receipts',
  'sign:message',
  'stake:tokens',
  'unstake:tokens',
  'claim:rewards',
  'vote:proposal',
  'create:proposal',
  'ido:buy',
]);

function getRoleLevel(role) {
  const idx = ROLE_HIERARCHY.indexOf(role);
  return idx === -1 ? -1 : idx;
}

export function hasPermission(role, action) {
  const requiredRole = ACTION_PERMISSIONS[action];
  if (!requiredRole) return false; // unknown action = denied
  const userLevel = getRoleLevel(role);
  const requiredLevel = getRoleLevel(requiredRole);
  return userLevel >= requiredLevel;
}

export function requiresWallet(action) {
  return WALLET_REQUIRED_ACTIONS.has(action);
}

export function isAdmin(session) {
  if (!session) return false;
  return session.role === ROLES.ADMIN;
}

export function getEffectiveRole(session) {
  if (!session || !session.token) return ROLES.GUEST;
  return session.role || ROLES.USER;
}

export function canPerform(session, action, connected = false) {
  const role = getEffectiveRole(session);
  if (requiresWallet(action) && !connected) {
    return { allowed: false, reason: 'wallet_required' };
  }
  if (!hasPermission(role, action)) {
    return { allowed: false, reason: 'insufficient_permissions', role, action };
  }
  return { allowed: true };
}

export default {
  ROLES,
  hasPermission,
  requiresWallet,
  isAdmin,
  getEffectiveRole,
  canPerform,
};
