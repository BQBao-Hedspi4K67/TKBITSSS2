import bcrypt from 'bcryptjs';
import { PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('Password@123', 12);

  await prisma.user.upsert({
    where: { email: 'student@tempo.local' },
    update: {
      passwordHash,
      fullName: 'Tempo Student',
      studentCode: '21522001',
      role: UserRole.STUDENT,
    },
    create: {
      email: 'student@tempo.local',
      passwordHash,
      fullName: 'Tempo Student',
      studentCode: '21522001',
      role: UserRole.STUDENT,
    },
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
