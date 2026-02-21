/**
 * Role-based access control.
 * Roles: 'consumer' | 'field_worker' | 'employee'
 * Employees have full management access (no separate admin role).
 *
 * Usage:
 *   router.delete('/regions/:id', authMiddleware, roleMiddleware(['employee']), handler)
 *   router.get('/complaints', authMiddleware, roleMiddleware(['employee', 'field_worker']), handler)
 */
const roleMiddleware = (allowedRoles) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({
      error: `Access denied. Required: ${allowedRoles.join(' or ')}`
    });
  }
  next();
};

module.exports = roleMiddleware;