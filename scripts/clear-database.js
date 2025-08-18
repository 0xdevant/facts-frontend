const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

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
