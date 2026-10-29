import mongoose from 'mongoose';
import { connectDatabase, disconnectDatabase } from '../config/db';
import { env } from '../config/env';
import { User } from '../models/user.model';
import { hashPassword } from '../utils/password';

export interface SeedAdminOptions {
  name?: string;
  email?: string;
  password?: string;
  disconnectWhenDone?: boolean;
}

export interface SeedAdminResult {
  action: 'created' | 'updated';
  userId: string;
  email: string;
  role: 'admin';
}

/**
 * Parses CLI arguments in --key=value format.
 */
export const parseCliArgs = (argv: string[]): Record<string, string> => {
  const result: Record<string, string> = {};
  for (const arg of argv) {
    if (arg.startsWith('--') && arg.includes('=')) {
      const equalsIdx = arg.indexOf('=');
      const key = arg.slice(2, equalsIdx).trim();
      const val = arg.slice(equalsIdx + 1).trim();
      if (key && val) {
        result[key] = val;
      }
    }
  }
  return result;
};

/**
 * Provision or promote an administrator account securely.
 * Supports programmatic invocation, environment variables, and CLI parameters.
 */
export const seedAdmin = async (
  options?: SeedAdminOptions
): Promise<SeedAdminResult> => {
  const cliArgs = parseCliArgs(process.argv.slice(2));

  const name =
    options?.name !== undefined
      ? options.name
      : cliArgs.name || process.env.ADMIN_NAME || env.ADMIN_NAME || 'System Administrator';

  const rawEmail =
    options?.email !== undefined
      ? options.email
      : cliArgs.email || process.env.ADMIN_EMAIL || env.ADMIN_EMAIL || '';

  const email = rawEmail.trim().toLowerCase();

  const password =
    options?.password !== undefined
      ? options.password
      : cliArgs.password || process.env.ADMIN_PASSWORD || env.ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error(
      'ADMIN_EMAIL and ADMIN_PASSWORD must be configured via environment variables or CLI options (--email=... --password=...).'
    );
  }

  // Email format validation
  const emailRegex = /^\S+@\S+\.\S+$/;
  if (!emailRegex.test(email)) {
    throw new Error(`Invalid admin email format: '${email}'. Please enter a valid email address.`);
  }

  // Password length enforcement
  if (password.length < 8) {
    throw new Error('ADMIN_PASSWORD must be at least 8 characters long.');
  }

  const shouldDisconnect = options?.disconnectWhenDone ?? true;

  try {
    await connectDatabase();

    if (mongoose.connection.readyState !== 1) {
      throw new Error(
        'Database connection could not be established. Please verify MONGODB_URI and network connectivity.'
      );
    }

    const existingUser = await User.findOne({ email });
    const passwordHash = await hashPassword(password);

    if (existingUser) {
      existingUser.name = name;
      existingUser.passwordHash = passwordHash;
      existingUser.role = 'admin';
      await existingUser.save();

      console.log(
        `[Admin Provisioning] Successfully promoted/updated administrator account for: ${email}`
      );

      return {
        action: 'updated',
        userId: existingUser._id.toString(),
        email: existingUser.email,
        role: 'admin',
      };
    } else {
      const newUser = await User.create({
        name,
        email,
        passwordHash,
        role: 'admin',
      });

      console.log(
        `[Admin Provisioning] Successfully created initial administrator account for: ${email}`
      );

      return {
        action: 'created',
        userId: newUser._id.toString(),
        email: newUser.email,
        role: 'admin',
      };
    }
  } finally {
    if (shouldDisconnect) {
      await disconnectDatabase().catch(() => {});
    }
  }
};

// Execute if run directly from CLI
if (require.main === module) {
  seedAdmin()
    .then((result) => {
      console.log(
        `[Admin Provisioning] Process completed. Action: ${result.action}, Email: ${result.email}`
      );
      process.exit(0);
    })
    .catch((err) => {
      console.error(
        '[Admin Provisioning] Error:',
        err instanceof Error ? err.message : err
      );
      process.exit(1);
    });
}
