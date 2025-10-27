const mongoose = require('mongoose');
require('dotenv').config();

// MongoDB connection string from .env
const MONGODB_URI = process.env.MONGODB_URI;

async function fixTournamentIds() {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB\n');

    // Get the raw players collection
    const db = mongoose.connection.db;
    const playersCollection = db.collection('players');

    // Find the tournament
    const tournamentsCollection = db.collection('tournaments');
    const tournament = await tournamentsCollection.findOne({
      name: '2nd Rich Town 2 Invitational Women\'s Doubles Tennis Tournament'
    });

    if (!tournament) {
      console.error('Tournament not found!');
      process.exit(1);
    }

    console.log(`Found tournament: ${tournament.name}`);
    console.log(`Tournament ID (ObjectId): ${tournament._id}`);
    console.log(`Tournament ID (String): ${tournament._id.toString()}\n`);

    // Find all players with ObjectId tournamentId
    const playersWithObjectId = await playersCollection.find({
      tournamentId: tournament._id
    }).toArray();

    console.log(`Found ${playersWithObjectId.length} players with ObjectId tournamentId\n`);

    if (playersWithObjectId.length > 0) {
      // Update all players to use string tournamentId
      const result = await playersCollection.updateMany(
        { tournamentId: tournament._id },
        { $set: { tournamentId: tournament._id.toString() } }
      );

      console.log(`✅ Updated ${result.modifiedCount} players`);
      console.log(`   - Changed tournamentId from ObjectId to String\n`);
    }

    // Verify the fix
    const playersWithString = await playersCollection.find({
      tournamentId: tournament._id.toString()
    }).toArray();

    console.log(`Verification: ${playersWithString.length} players now have String tournamentId`);

    if (playersWithString.length > 0) {
      console.log('\nSample player:');
      console.log(`  - Name: ${playersWithString[0].firstName} ${playersWithString[0].lastName}`);
      console.log(`  - tournamentId: ${playersWithString[0].tournamentId}`);
      console.log(`  - tournamentId type: ${typeof playersWithString[0].tournamentId}`);
    }

  } catch (error) {
    console.error('Error fixing tournament IDs:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\nMongoDB connection closed');
  }
}

// Run the script
fixTournamentIds();
