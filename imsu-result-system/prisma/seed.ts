import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, UserRole } from 'src/generated/prisma/client';

const databaseUrl = process.env.DATABASE_URL;
const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD;
const fullName = process.env.ADMIN_FULL_NAME?.trim() || 'System Administrator';

if (!databaseUrl) {
  throw new Error('DATABASE_URL must be set in .env');
}

const adapter = new PrismaPg({
  connectionString: databaseUrl,
});

const prisma = new PrismaClient({ adapter });

async function main(): Promise<void> {
  if (!email || !password) {
    throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD must be set in .env');
  }

  if (password.length < 12) {
    throw new Error('ADMIN_PASSWORD must contain at least 12 characters.');
  }

  const existingAdmin = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      role: true,
    },
  });

  if (existingAdmin) {
    if (existingAdmin.role !== UserRole.SUPER_ADMIN) {
      throw new Error(
        'This email already belongs to an account that is not a SUPER_ADMIN.',
      );
    }

    console.log('Super administrator already exists. No changes made.');
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const admin = await prisma.user.create({
    data: {
      fullName,
      email,
      passwordHash,
      role: UserRole.SUPER_ADMIN,
      isActive: true,
      emailVerifiedAt: new Date(),
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
      isActive: true,
      emailVerifiedAt: true,
    },
  });

  console.log('Super administrator created successfully:', admin);
}

main()
  .catch((error: unknown): void => {
    if (error instanceof Error) {
      console.error('Failed to create administrator:', error.message);
      console.error(error.stack);
    } else {
      console.error('Failed to create administrator:', error);
    }

    process.exitCode = 1;
  })
  .finally(async (): Promise<void> => {
    await prisma.$disconnect();
  });
