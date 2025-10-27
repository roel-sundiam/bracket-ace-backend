// Script to recalculate playoff matches for a tournament
// Usage: node recalculate-playoffs.js <tournamentId>

const http = require('http');

const GRAPHQL_ENDPOINT = 'http://localhost:3001/graphql';

const tournamentId = process.argv[2] || '68f8d9311aacfddf116fa927';

const mutation = `
  mutation RecalculatePlayoffs($tournamentId: String!) {
    recalculatePlayoffMatches(tournamentId: $tournamentId) {
      id
      round
      bracketType
      participant1
      participant2
      participant1Name
      participant2Name
    }
  }
`;

async function recalculatePlayoffs() {
  try {
    console.log(`Recalculating playoff matches for tournament: ${tournamentId}`);

    const postData = JSON.stringify({
      query: mutation,
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

    console.log('\n✅ Playoff matches recalculated successfully!\n');
    console.log('Updated matches:');
    result.data.recalculatePlayoffMatches.forEach(match => {
      const label = match.bracketType === 'winners' ? 'FINAL' : '3RD PLACE';
      console.log(`  ${label} (round ${match.round}, bracket: ${match.bracketType}): ${match.participant1Name} vs ${match.participant2Name}`);
    });
    console.log('\n✅ Please refresh your browser to see the updated schedule!');
  } catch (error) {
    console.error('Error:', error.message || error);
    console.error('Full error:', error);
    process.exit(1);
  }
}

recalculatePlayoffs();
