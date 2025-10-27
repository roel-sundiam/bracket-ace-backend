// Script to check all matches for a tournament
const http = require('http');

const tournamentId = process.argv[2] || '68f8d9311aacfddf116fa927';

const query = `
  query GetMatches($tournamentId: String!) {
    matches(tournamentId: $tournamentId) {
      id
      round
      bracketType
      participant1
      participant2
      participant1Name
      participant2Name
      completed
    }
  }
`;

async function checkMatches() {
  try {
    const postData = JSON.stringify({
      query: query,
      variables: { tournamentId }
    });

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

    const result = await new Promise((resolve, reject) => {
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

    if (result.errors) {
      console.error('GraphQL Errors:', JSON.stringify(result.errors, null, 2));
      process.exit(1);
    }

    const matches = result.data.matches;

    console.log(`\nTotal matches: ${matches.length}\n`);

    // Group by round
    const byRound = {};
    matches.forEach(m => {
      if (!byRound[m.round]) byRound[m.round] = [];
      byRound[m.round].push(m);
    });

    Object.keys(byRound).sort().forEach(round => {
      console.log(`\n=== ROUND ${round} ===`);
      byRound[round].forEach(m => {
        const label = round == 1
          ? (m.bracketType === 'winners' ? 'Group A' : 'Group B')
          : (m.bracketType === 'winners' ? 'Final' : '3rd Place');
        console.log(`  ${label}: ${m.participant1Name} vs ${m.participant2Name} (${m.completed ? 'COMPLETED' : 'PENDING'})`);
        console.log(`    ID: ${m.id}, Bracket: ${m.bracketType}`);
      });
    });
  } catch (error) {
    console.error('Error:', error.message || error);
    process.exit(1);
  }
}

checkMatches();
