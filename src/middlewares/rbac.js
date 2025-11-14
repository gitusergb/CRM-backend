/**
 * Role-Based Access Control (RBAC) middleware
 * Checks if user has required role(s) to access a route
 * 
 * Usage:
 * - authorize(['ADMIN']) - only admin
 * - authorize(['ADMIN', 'MANAGER']) - admin or manager
 */
export const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions. Required role(s): ' + allowedRoles.join(', '),
      });
    }

    next();
  };
};

/**
 * Helper middleware to check if user owns a resource or has admin/manager role
 */
export const authorizeOwnerOrAdmin = (getResourceOwnerId) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
      }

      // Admin and Manager can access any resource
      if (req.user.role === 'ADMIN' || req.user.role === 'MANAGER') {
        return next();
      }

      // For other roles, check ownership
      const ownerId = await getResourceOwnerId(req);
      
      if (ownerId === req.user.id) {
        return next();
      }

      return res.status(403).json({
        success: false,
        message: 'You do not have permission to access this resource',
      });
    } catch (error) {
      console.error('Authorization error:', error);
      res.status(500).json({
        success: false,
        message: 'Authorization error',
      });
    }
  };
};

