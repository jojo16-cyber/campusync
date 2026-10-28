import { connectDatabase, disconnectDatabase } from '../config/db';
import { env } from '../config/env';
import { User } from '../models/user.model';
import { hashPassword } from '../utils/password';

export const seedAdmin = async (): Promise<void> => {
  const name = env.ADMIN_NAME || 'System Administrator';
  const email = (env.ADMIN_EMAIL || '').trim().toLowerCase();
  const password = env.ADMIN_PASSWORD;

  if (!email || !password) {
    console.error(
      '[Admin Seed] Error: ADMIN_EMAIL and ADMIN_PASSWORD must be configured in environment (.env).'
    );
    process.exit(1);
  }

  if (password.length < 8) {
    console.error(
      '[Admin Seed] Error: ADMIN_PASSWORD must be at least 8 characters long.'
    );
    process.exit(1);
  }

  try {
    await connectDatabase();

    const existingUser = await User.findOne({ email });
    const passwordHash = await hashPassword(password);

    if (existingUser) {
      existingUser.name = name;
      existingUser.passwordHash = passwordHash;
      existingUser.role = 'admin';
      await existingUser.save();
      console.log(
        `[Admin Seed] Administrator account updated successfully for email: ${email}`
      );
    } else {
      await User.create({
        name,
        email,
        passwordHash,
        role: 'admin',
      });
      console.log(
        `[Admin Seed] Initial administrator created successfully for email: ${email}`
      );
    }
  } catch (error) {
    console.error(
      '[Admin Seed] Failed to seed administrator account:',
      error instanceof Error ? error.message : error
    );
    process.exit(1);
  } finally {
    await disconnectDatabase();
  }
};

// Execute if run directly from CLI
if (require.main === module) {
  seedAdmin()
    .then(() => {
      console.log('[Admin Seed] Seed process completed.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('[Admin Seed] Fatal error:', err);
      process.exit(1);
    });
}
