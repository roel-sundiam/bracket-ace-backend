const mongoose = require('mongoose');
require('dotenv').config();

// MongoDB connection string from .env
const MONGODB_URI = process.env.MONGODB_URI;

// Player Schema - must match the actual model
const playerSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  gender: { type: String, required: true },
  mode: { type: String, default: 'doubles' },
  tournamentId: { type: String, default: null },
  teamId: { type: String, default: null }
}, { timestamps: true });

const Player = mongoose.model('Player', playerSchema);

async function testQuery() {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB\n');

    const tournamentId = '68fa2733e6dbb8ba02ecbca5';

    console.log(`Testing query: Player.find({ tournamentId: "${tournamentId}" })\n`);

    // This simulates what the GraphQL resolver does
    const players = await Player.find({ tournamentId }).populate('teamId');

    console.log(`✅ Query returned ${players.length} players\n`);

    if (players.length > 0) {
      console.log('First 3 players:');
      players.slice(0, 3).forEach((player, index) => {
        console.log(`${index + 1}. ${player.firstName} ${player.lastName}`);
        console.log(`   - ID: ${player._id}`);
        console.log(`   - Gender: ${player.gender}`);
        console.log(`   - Mode: ${player.mode}`);
        console.log(`   - Tournament ID: ${player.tournamentId}`);
        console.log('');
      });
    }

  } catch (error) {
    console.error('Error testing query:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
  }
}

// Run the script
testQuery();
