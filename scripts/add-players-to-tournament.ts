import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Player } from '../src/models/Player';
import { Tournament } from '../src/models/Tournament';

// Load environment variables
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/bracket-ace';

async function addPlayersToTournament() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find the tournament by name
    const tournamentName = 'Sample Test Tournament of 16';
    const tournament = await Tournament.findOne({ name: tournamentName });

    if (!tournament) {
      console.error(`❌ Tournament "${tournamentName}" not found`);
      process.exit(1);
    }

    console.log(`✅ Found tournament: ${tournament.name} (ID: ${tournament._id})`);
    console.log(`   Mode: ${tournament.mode}`);
    console.log(`   Current participants: ${tournament.currentParticipants}`);

    // Create 16 players
    const playerCount = 16;
    const createdPlayers = [];

    for (let i = 1; i <= playerCount; i++) {
      // Check if player already exists
      const existingPlayer = await Player.findOne({
        firstName: `Player${i}`,
        lastName: `Test`,
        mode: tournament.mode
      });

      if (existingPlayer) {
        console.log(`⚠️  Player${i} Test already exists, skipping...`);
        createdPlayers.push(existingPlayer);
        continue;
      }

      // Create new player
      const player = new Player({
        firstName: `Player${i}`,
        lastName: `Test`,
        gender: i % 2 === 0 ? 'female' : 'male', // Alternate genders
        mode: tournament.mode, // Use tournament mode (singles or doubles)
        tournamentId: tournament._id.toString()
      });

      await player.save();
      createdPlayers.push(player);
      console.log(`✅ Created Player${i} Test (ID: ${player._id})`);
    }

    console.log(`\n✅ Successfully added ${createdPlayers.length} players to tournament`);
    console.log(`\nPlayer IDs:`);
    createdPlayers.forEach((player, index) => {
      console.log(`   Player${index + 1}: ${player._id}`);
    });

    // Update tournament participant count
    const totalPlayers = await Player.countDocuments({
      tournamentId: tournament._id.toString()
    });

    tournament.currentParticipants = totalPlayers;
    await tournament.save();
    console.log(`\n✅ Updated tournament participant count: ${totalPlayers}`);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

// Run the script
addPlayersToTournament();
