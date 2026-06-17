const { PrismaClient } = require('../src/generated/client/index.js');
const prisma = new PrismaClient();

console.log('--- Prisma Client Test ---');
console.log('Models available on client:', Object.keys(prisma).filter(k => !k.startsWith('$')));
console.log('notificationLog exists:', !!prisma.notificationLog);
console.log('notificationSubscription exists:', !!prisma.notificationSubscription);
console.log('user exists:', !!prisma.user);
process.exit(0);
