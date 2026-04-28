const { PrismaClient } = require('@prisma/client');
(async () => {
  const prisma = new PrismaClient();
  try {
    await prisma.$connect();
    console.log('Prisma connected');
    const u = await prisma.user.findFirst();
    console.log('Sample user:', JSON.stringify(u));
    await prisma.$disconnect();
    process.exit(0);
  } catch (e) {
    console.error('Prisma error:', e);
    try { await prisma.$disconnect(); } catch (e2) {}
    process.exit(2);
  }
})();
