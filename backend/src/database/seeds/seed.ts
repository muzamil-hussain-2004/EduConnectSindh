import { prisma } from '../../config/database';
import { env } from '../../config/env';
import { logger } from '../../config/logger';
import { hashPassword } from '../../shared/utils/password';

const SUBJECTS = [
  'Mathematics',
  'English',
  'Physics',
  'Chemistry',
  'Biology',
  'Computer Science',
  'Web Development',
  'Urdu',
  'Sindhi',
  'Islamiat',
];

const JAMSHORO_AREAS = [
  'University of Sindh Campus',
  'Mehran University Campus',
  'Liaquat University Campus',
  'Kotri',
  'Jamshoro City',
  'Bhitai Colony',
];

// upsert makes the seed safe to run many times.
async function main() {
  const city = await prisma.city.upsert({
    where: { name: 'Jamshoro' },
    update: {},
    create: { name: 'Jamshoro' },
  });

  for (const name of JAMSHORO_AREAS) {
    await prisma.area.upsert({
      where: { cityId_name: { cityId: city.id, name } },
      update: {},
      create: { name, cityId: city.id },
    });
  }

  for (const name of SUBJECTS) {
    await prisma.subject.upsert({ where: { name }, update: {}, create: { name } });
  }

  logger.info(`Seeded city Jamshoro, ${JAMSHORO_AREAS.length} areas, ${SUBJECTS.length} subjects`);

  if (env.ADMIN_EMAIL && env.ADMIN_PASSWORD) {
    await prisma.user.upsert({
      where: { email: env.ADMIN_EMAIL.toLowerCase() },
      update: {},
      create: {
        email: env.ADMIN_EMAIL.toLowerCase(),
        passwordHash: await hashPassword(env.ADMIN_PASSWORD),
        fullName: 'Platform Admin',
        role: 'ADMIN',
        emailVerified: true,
      },
    });
    logger.info(`Admin account ready: ${env.ADMIN_EMAIL}`);
  }
}

main()
  .catch((err) => {
    logger.error(err, 'Seeding failed');
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
