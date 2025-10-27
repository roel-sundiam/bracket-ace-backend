const mongoose = require('mongoose');
require('dotenv').config();

// MongoDB connection string from .env
const MONGODB_URI = process.env.MONGODB_URI;

// Player Schema
const playerSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  gender: { type: String, required: true },
  mode: { type: String, default: 'doubles' },
  tournamentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tournament' },
  teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', default: null }
}, { timestamps: true });

const Player = mongoose.model('Player', playerSchema);

// Tournament Schema
const tournamentSchema = new mongoose.Schema({
  name: { type: String, required: true }
});

const Tournament = mongoose.model('Tournament', tournamentSchema);

async function checkPlayers() {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB\n');

    // Find the tournament
    const tournamentName = '2nd Rich Town 2 Invitational Women\'s Doubles Tennis Tournament';
    console.log(`Searching for tournament: "${tournamentName}"`);

    const tournament = await Tournament.findOne({ name: tournamentName });

    if (!tournament) {
      console.error(`Tournament "${tournamentName}" not found!`);
      process.exit(1);
    }

    console.log(`Found tournament: ${tournament.name}`);
    console.log(`Tournament ID: ${tournament._id}\n`);

    // Find all players for this tournament
    const players = await Player.find({ tournamentId: tournament._id });

    console.log(`=== PLAYERS IN TOURNAMENT ===`);
    console.log(`Total players found: ${players.length}\n`);

    if (players.length > 0) {
      players.forEach((player, index) => {
        console.log(`${index + 1}. ${player.firstName} ${player.lastName}`);
        console.log(`   - ID: ${player._id}`);
        console.log(`   - Gender: ${player.gender}`);
        console.log(`   - Mode: ${player.mode}`);
        console.log(`   - Team ID: ${player.teamId || 'Not paired'}`);
        console.log(`   - Created: ${player.createdAt}`);
        console.log('');
      });
    } else {
      console.log('No players found for this tournament!');
    }

    // Also check all players in database
    const allPlayers = await Player.find({});
    console.log(`\n=== ALL PLAYERS IN DATABASE ===`);
    console.log(`Total players in database: ${allPlayers.length}\n`);

  } catch (error) {
    console.error('Error checking players:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
  }
}

// Run the script
checkPlayers();
