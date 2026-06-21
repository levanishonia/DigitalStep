import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('password123', 10);

  const user = await prisma.user.upsert({
    where: { email: 'owner@digitalstep.app' },
    update: {},
    create: {
      name: 'Avery Morgan',
      email: 'owner@digitalstep.app',
      passwordHash,
      businesses: {
        create: {
          name: 'Bloom & Bean Cafe',
          industry: 'Cafe and bakery',
          audience: 'Neighborhood regulars and remote workers',
          location: 'Portland, OR',
          primaryGoal: 'Increase weekday morning visits',
          channels: ['instagram', 'facebook', 'email'],
          tasks: {
            create: [
              { title: 'Post weekly pastry special', description: 'Use a bright photo and mention the morning bundle.', dueDate: new Date(), status: 'todo' },
              { title: 'Draft Friday email', description: 'Highlight loyalty card reminders and seasonal drinks.', dueDate: new Date(Date.now() + 86400000), status: 'in_progress' }
            ]
          },
          contentItems: {
            create: [
              { title: 'Behind the scenes: sourdough prep', channel: 'instagram', status: 'scheduled', scheduledFor: new Date(Date.now() + 172800000), notes: 'Short reel from prep counter.' },
              { title: 'June loyalty offer', channel: 'email', status: 'draft', notes: 'Keep copy concise and local.' }
            ]
          },
          campaigns: {
            create: [
              { name: 'Weekday Breakfast Push', objective: 'Drive 15% more weekday morning orders', status: 'active', startDate: new Date(), endDate: new Date(Date.now() + 12096e5) }
            ]
          },
          recommendations: {
            create: [
              { title: 'Promote best-selling item earlier', description: 'Schedule coffee-and-pastry content before 8 AM when customers plan their commute.', priority: 1 },
              { title: 'Add a recurring planning block', description: 'Reserve 30 minutes each Monday to plan posts and email topics for the week.', priority: 2 }
            ]
          }
        }
      }
    }
  });

  console.log(`Seeded DigitalStep demo user: ${user.email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
