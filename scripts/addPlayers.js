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

// Players to add
const playersToAdd = [
  { firstName: 'Pat', lastName: 'Pineda', gender: 'female' },
  { firstName: 'Hala', lastName: 'Riva', gender: 'female' },
  { firstName: 'Dgen', lastName: 'Lim', gender: 'female' },
  { firstName: 'Cha', lastName: 'Manabat', gender: 'female' },
  { firstName: 'Pam', lastName: 'Asuncion', gender: 'female' },
  { firstName: 'Helen', lastName: 'Sundiam', gender: 'female' },
  { firstName: 'Noreen', lastName: 'Munoz', gender: 'female' },
  { firstName: 'Christine', lastName: 'Cruz', gender: 'female' },
  { firstName: 'Tracy', lastName: 'Talo', gender: 'female' },
  { firstName: 'Jhen', lastName: 'Cunanan', gender: 'female' },
  { firstName: 'Trina', lastName: 'Sevilla', gender: 'female' },
  { firstName: 'Ruth', lastName: 'Barerra', gender: 'female' },
  { firstName: 'Andrea', lastName: 'Henson', gender: 'female' },
  { firstName: 'Reianne', lastName: 'Chavez', gender: 'female' },
  { firstName: 'Rose', lastName: 'Cortez', gender: 'female' },
  { firstName: 'Tel', lastName: 'Cruz', gender: 'female' },
  { firstName: 'Pau', lastName: 'Dungo', gender: 'female' },
  { firstName: 'Lea', lastName: 'Nacu', gender: 'female' }
];

async function addPlayers() {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find the tournament
    const tournamentName = '2nd Rich Town 2 Invitational Women\'s Doubles Tennis Tournament';
    console.log(`\nSearching for tournament: "${tournamentName}"`);

    const tournament = await Tournament.findOne({ name: tournamentName });

    if (!tournament) {
      console.error(`Tournament "${tournamentName}" not found!`);
      console.log('\nAvailable tournaments:');
      const allTournaments = await Tournament.find({});
      allTournaments.forEach(t => console.log(`  - ${t.name} (ID: ${t._id})`));
      process.exit(1);
    }

    console.log(`Found tournament: ${tournament.name} (ID: ${tournament._id})`);

    // Add all players
    console.log(`\nAdding ${playersToAdd.length} players to the tournament...`);

    const createdPlayers = [];
    for (const playerData of playersToAdd) {
      const player = new Player({
        ...playerData,
        mode: 'doubles',
        tournamentId: tournament._id.toString(), // Convert ObjectId to string
        teamId: null
      });

      await player.save();
      createdPlayers.push(player);
      console.log(`✓ Added: ${player.firstName} ${player.lastName}`);
    }

    console.log(`\n✅ Successfully added ${createdPlayers.length} players to the tournament!`);

    // Show summary
    console.log('\n=== Summary ===');
    console.log(`Tournament: ${tournament.name}`);
    console.log(`Total players added: ${createdPlayers.length}`);
    console.log('All players are female and set to doubles mode');

  } catch (error) {
    console.error('Error adding players:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\nMongoDB connection closed');
  }
}

// Run the script
addPlayers();
