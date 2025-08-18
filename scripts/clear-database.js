const { PrismaClient } = require('@prisma/client');

// Debug: Check if DATABASE_URL is available
if (!process.env.DATABASE_URL) {
  console.error('ERROR: DATABASE_URL environment variable is not set');
  process.exit(1);
}

console.log('DATABASE_URL is available, connecting to database...');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

async function clearData() {
  try {
    console.log('Clearing all sources...');
    await prisma.source.deleteMany({});
    console.log('Sources cleared successfully');
    
    console.log('Clearing all questions...');
    await prisma.question.deleteMany({});
    console.log('Questions cleared successfully');
    
    console.log('Database data cleared successfully');
  } catch (error) {
    console.error('Error clearing database:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

clearData();
