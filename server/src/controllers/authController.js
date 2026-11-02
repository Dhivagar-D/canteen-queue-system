/**
 * Campus Authentication Controller
 * Handles role-based authentication and PIN validation for Campus Canteen.
 */

// Default PIN credentials (can be overridden via environment variables or DB)
const PINS = {
  CASHIER: process.env.CASHIER_PIN || '1234',
  KITCHEN: process.env.KITCHEN_PIN || '5555',
  ADMIN: process.env.ADMIN_PIN || '9999'
};

export function campusLogin(req, res) {
  try {
    const { role, identifier, pin } = req.body;

    if (!role) {
      return res.status(400).json({ error: 'Role is required.' });
    }

    // 1. Student Role: Roll Number / Name authentication (Zero PIN barrier)
    if (role === 'STUDENT') {
      const studentId = (identifier || '').trim();
      if (!studentId) {
        return res.status(400).json({ error: 'Please enter your College Roll Number or Student ID.' });
      }

      return res.json({
        success: true,
        user: {
          role: 'STUDENT',
          identifier: studentId,
          displayName: studentId
        }
      });
    }

    // 2. Cashier Role: PIN validation
    if (role === 'CASHIER') {
      if (!pin || pin !== PINS.CASHIER) {
        return res.status(401).json({ error: 'Invalid Cashier PIN. (Default: 1234)' });
      }

      return res.json({
        success: true,
        user: {
          role: 'CASHIER',
          identifier: 'CASHIER_1',
          displayName: 'Counter Cashier'
        }
      });
    }

    // 3. Kitchen Staff / Server Station: PIN validation
    if (role === 'KITCHEN') {
      if (!pin || pin !== PINS.KITCHEN) {
        return res.status(401).json({ error: 'Invalid Kitchen Station PIN. (Default: 5555)' });
      }

      return res.json({
        success: true,
        user: {
          role: 'KITCHEN',
          identifier: 'KITCHEN_STATION',
          displayName: 'Kitchen Prep & TV Board'
        }
      });
    }

    // 4. Canteen Admin / Manager: PIN validation
    if (role === 'ADMIN') {
      if (!pin || pin !== PINS.ADMIN) {
        return res.status(401).json({ error: 'Invalid Admin PIN. (Default: 9999)' });
      }

      return res.json({
        success: true,
        user: {
          role: 'ADMIN',
          identifier: 'ADMIN_SUPERVISOR',
          displayName: 'Canteen Manager (Admin)'
        }
      });
    }

    return res.status(400).json({ error: `Unknown role: ${role}` });
  } catch (err) {
    console.error('[campusLogin] Error:', err);
    return res.status(500).json({ error: 'Authentication service error' });
  }
}
