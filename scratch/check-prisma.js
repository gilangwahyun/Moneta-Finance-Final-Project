const { prisma } = require('./src/lib/db/prisma');
console.log('Prisma models:', Object.keys(prisma));
if (prisma.notificationLog) {
  console.log('notificationLog exists');
} else {
  console.log('notificationLog DOES NOT exist');
}
process.exit(0);
