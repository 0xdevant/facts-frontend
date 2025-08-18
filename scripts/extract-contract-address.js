const fs = require('fs');

// Check if we're reading from stdin (git show) or from a file
if (process.argv.length > 2) {
  // Reading from a file
  const filePath = process.argv[2];
  try {
    const contractFile = fs.readFileSync(filePath, 'utf8');
    const match = contractFile.match(/factsContractAddress\s*=\s*["']([^"']+)["']/);
    console.log(match ? match[1] : '');
  } catch (error) {
    console.error('Error reading contract file:', error.message);
    process.exit(1);
  }
} else if (!process.stdin.isTTY) {
  // Reading from stdin (git show) - only when stdin is not a terminal
  let data = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', chunk => {
    data += chunk;
  });
  process.stdin.on('end', () => {
    try {
      const match = data.match(/factsContractAddress\s*=\s*["']([^"']+)["']/);
      console.log(match ? match[1] : '');
    } catch (error) {
      console.error('Error parsing contract data:', error.message);
      process.exit(1);
    }
  });
} else {
  // Default: read from current contract file
  try {
    const contractFile = fs.readFileSync('src/lib/contract.ts', 'utf8');
    const match = contractFile.match(/factsContractAddress\s*=\s*["']([^"']+)["']/);
    console.log(match ? match[1] : '');
  } catch (error) {
    console.error('Error reading contract file:', error.message);
    process.exit(1);
  }
}
