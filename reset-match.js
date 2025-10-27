// Script to reset a match back to pending status
const http = require('http');

const matchId = process.argv[2] || '68fa1830e6dbb8ba02eca5d2'; // Finals match ID

async function makeRequest(query, variables = {}) {
  const postData = JSON.stringify({ query, variables });

  const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/graphql',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function resetMatch() {
  try {
    console.log(`Resetting match ${matchId} to pending status...\n`);

    const mutation = `
      mutation ResetMatch($matchId: ID!) {
        resetMatch(matchId: $matchId) {
          id
          completed
          participant1Name
          participant2Name
        }
      }
    `;

    const result = await makeRequest(mutation, { matchId });

    if (result.errors) {
      console.error('GraphQL Errors:', JSON.stringify(result.errors, null, 2));
      process.exit(1);
    }

    const match = result.data.resetMatch;
    console.log('✅ Match reset successfully!\n');
    console.log(`Match: ${match.participant1Name} vs ${match.participant2Name}`);
    console.log(`Status: ${match.completed ? 'COMPLETED' : 'PENDING'}`);
    console.log('\n✅ The match should now appear in the Upcoming tab!');

  } catch (error) {
    console.error('Error:', error.message || error);
    console.error('Full error:', error);
    process.exit(1);
  }
}

resetMatch();
