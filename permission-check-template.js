
const checkPermission = async (req, module, action) => {
  try {
    const user = req.user;
    if (user?.role?.toLowerCase() === 'administrador') {
      return true;
    }
    if (!user?.roleId) {
      return false;
    }
    const [permissionCheck] = await query(`
      SELECT COUNT(*) as has_permission 
      FROM role_permissions rp
      INNER JOIN permissions p ON rp.permission_id = p.id
      WHERE rp.role_id = ? AND p.module = ? AND p.action = ?
    `, [user.roleId, module, action]);
    return permissionCheck[0].has_permission > 0;
  } catch (error) {
    console.error('Error checking permission:', error);
    return false;
  }
};
