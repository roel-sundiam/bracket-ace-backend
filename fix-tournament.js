// Script to fix tournament by deleting old playoff matches and regenerating them
const http = require('http');

const tournamentId = process.argv[2] || '68f8d9311aacfddf116fa927';

// IDs of matches to delete (wrong round 2 matches and all round 3 matches)
const matchIdsToDelete = [
  '68fa1830e6dbb8ba02eca5d4', // Round 2 Final (pending - Player5 vs Player5)
  '68fa1830e6dbb8ba02eca5d8', // Round 3 3rd Place
  '68fa1830e6dbb8ba02eca5d6'  // Round 3 Final
];

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

async function fixTournament() {
  try {
    console.log('🔧 Fixing tournament playoff matches...\n');

    // Step 1: Delete extra/wrong playoff matches
    console.log('Step 1: Deleting extra playoff matches...');

    const deleteQuery = `
      mutation DeleteMatch($matchId: ID!) {
        deleteMatch(matchId: $matchId)
      }
    `;

    for (const matchId of matchIdsToDelete) {
      console.log(`  Deleting match ${matchId}...`);
      const result = await makeRequest(deleteQuery, { matchId });

      if (result.errors) {
        console.error(`  ⚠️  Failed to delete ${matchId}:`, result.errors[0].message);
      } else if (result.data.deleteMatch) {
        console.log(`  ✅ Deleted`);
      }
    }

    console.log('\nStep 2: Recalculating playoff matches with correct participants...');

    const regenerateQuery = `
      mutation RegeneratePlayoffs($tournamentId: String!) {
        recalculatePlayoffMatches(tournamentId: $tournamentId) {
          id
          round
          bracketType
          participant1Name
          participant2Name
        }
      }
    `;

    const result = await makeRequest(regenerateQuery, { tournamentId });

    if (result.errors) {
      console.error('GraphQL Errors:', JSON.stringify(result.errors, null, 2));
      process.exit(1);
    }

    console.log('\n✅ Playoff matches recalculated!\n');
    console.log('Updated playoff matches:');
    result.data.recalculatePlayoffMatches.forEach(match => {
      const label = match.bracketType === 'winners' ? 'FINAL' : '3RD PLACE';
      console.log(`  ${label} (round ${match.round}): ${match.participant1Name} vs ${match.participant2Name}`);
    });

    console.log('\n✅ Tournament fixed! Refresh your browser to see the changes.');

  } catch (error) {
    console.error('Error:', error.message || error);
    console.error('Full error:', error);
    process.exit(1);
  }
}

fixTournament();
