const { MongoClient } = require('mongodb');
require('dotenv').config();

async function cleanup() {
  const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
  const client = new MongoClient(mongoURI);

  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db('BracketAce');

    // Delete all tournaments
    const tournamentsResult = await db.collection('tournaments').deleteMany({});
    console.log(`Deleted ${tournamentsResult.deletedCount} tournaments`);

    // Delete all matches
    const matchesResult = await db.collection('matches').deleteMany({});
    console.log(`Deleted ${matchesResult.deletedCount} matches`);

    // Delete all teams
    const teamsResult = await db.collection('teams').deleteMany({});
    console.log(`Deleted ${teamsResult.deletedCount} teams`);

    // Delete all players
    const playersResult = await db.collection('players').deleteMany({});
    console.log(`Deleted ${playersResult.deletedCount} players`);

    console.log('Database cleaned successfully!');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

cleanup();
