import { prisma } from '../src/lib/db/prisma';

async function check() {
  console.log('Prisma models:', Object.keys(prisma).filter(k => !k.startsWith('_')));
  if ((prisma as any).notificationLog) {
    console.log('✅ notificationLog exists in client');
  } else {
    console.log('❌ notificationLog DOES NOT exist in client');
  }
}

check().catch(console.error);
