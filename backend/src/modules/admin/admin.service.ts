import { prisma } from '../../config/database';

const DAYS = 14;

export const adminService = {
  /** One round trip of cheap COUNTs that power the admin overview cards. */
  async stats() {
    const since = new Date(Date.now() - (DAYS - 1) * 86_400_000);
    since.setUTCHours(0, 0, 0, 0);

    const [
      usersByRole,
      suspendedUsers,
      tutorsByStatus,
      coursesByStatus,
      enrollments,
      upcomingClasses,
      bookings,
      requestsByStatus,
      reviews,
      signupRows,
    ] = await Promise.all([
      prisma.user.groupBy({ by: ['role'], _count: { _all: true } }),
      prisma.user.count({ where: { status: 'SUSPENDED' } }),
      prisma.tutorProfile.groupBy({ by: ['verificationStatus'], _count: { _all: true } }),
      prisma.course.groupBy({ by: ['status'], _count: { _all: true } }),
      prisma.enrollment.count(),
      prisma.classSession.count({ where: { status: 'SCHEDULED', startsAt: { gt: new Date() } } }),
      prisma.classBooking.count(),
      prisma.tutorRequest.groupBy({ by: ['status'], _count: { _all: true } }),
      prisma.review.count({ where: { status: 'VISIBLE' } }),
      prisma.$queryRaw<{ day: Date; count: bigint }[]>`
        SELECT date_trunc('day', "createdAt") AS day, COUNT(*) AS count
        FROM users WHERE "createdAt" >= ${since}
        GROUP BY 1 ORDER BY 1`,
    ]);

    const tally = (rows: { _count: { _all: number } }[], key: string) =>
      Object.fromEntries(
        rows.map((r) => [(r as unknown as Record<string, string>)[key], r._count._all]),
      );

    const perDay = new Map(
      signupRows.map((r) => [r.day.toISOString().slice(0, 10), Number(r.count)]),
    );
    const signups = Array.from({ length: DAYS }, (_, i) => {
      const date = new Date(since.getTime() + i * 86_400_000).toISOString().slice(0, 10);
      return { date, count: perDay.get(date) ?? 0 };
    });

    const byRole = tally(usersByRole, 'role');
    return {
      users: {
        total: (Object.values(byRole) as number[]).reduce((a, b) => a + b, 0),
        suspended: suspendedUsers,
        byRole,
      },
      tutors: { byVerification: tally(tutorsByStatus, 'verificationStatus') },
      courses: { byStatus: tally(coursesByStatus, 'status'), enrollments },
      classes: { upcoming: upcomingClasses, bookings },
      requests: { byStatus: tally(requestsByStatus, 'status') },
      reviews: { visible: reviews },
      signups,
    };
  },
};
