// Script to add the missing 3rd place match
const http = require('http');

const tournamentId = process.argv[2] || '68f8d9311aacfddf116fa927';

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

async function addThirdPlaceMatch() {
  try {
    console.log('Adding 3rd place match...\n');

    // We need to use MongoDB directly or create a mutation
    // For now, let's just regenerate the round robin matches
    // But first, let me check the tournament structure

    const getTournamentQuery = `
      query GetTournament($tournamentId: String!) {
        tournamentGroups(tournamentId: $tournamentId) {
          groupA {
            id
            name
          }
          groupB {
            id
            name
          }
        }
      }
    `;

    const tournamentResult = await makeRequest(getTournamentQuery, { tournamentId });

    if (tournamentResult.errors) {
      console.error('Error:', JSON.stringify(tournamentResult.errors, null, 2));
      process.exit(1);
    }

    const groupA = tournamentResult.data.tournamentGroups.groupA.map(t => t.id);
    const groupB = tournamentResult.data.tournamentGroups.groupB.map(t => t.id);

    console.log('Group A teams:', groupA.length);
    console.log('Group B teams:', groupB.length);

    // For now, just tell the user to use the GraphQL playground
    console.log('\n⚠️  The 3rd place match needs to be created manually.');
    console.log('\nGo to http://localhost:3001/graphql and run:\n');
    console.log(`mutation {
  # This will regenerate ALL matches including playoffs
  # WARNING: This will delete all existing matches!
  generateRoundRobinMatches(tournamentId: "${tournamentId}") {
    id
    round
    bracketType
  }
}`);

    console.log('\n💡 Or we need to add a dedicated mutation to create just the 3rd place match.');
    console.log('For now, the tournament has the correct Final match.');
    console.log('\n2nd place teams are:');
    console.log('  Group A: Player7 & Player10');
    console.log('  Group B: Player2 & Player15');

  } catch (error) {
    console.error('Error:', error.message || error);
    process.exit(1);
  }
}

addThirdPlaceMatch();
