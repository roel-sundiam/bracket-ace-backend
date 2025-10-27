import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import { Player } from '../models/Player';
import { TournamentRegistration } from '../models/TournamentRegistration';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/bracketace';

async function addDummyPlayers() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB connected');

    const tournamentId = '68e20eab0f69fc2a373d7d99';
    const clubId = '68e134e62624711ba8d3690d';

    // Create 6 new dummy players
    const dummyPlayers = [
      { firstName: 'Michael', lastName: 'Chang', gender: 'male' },
      { firstName: 'Sarah', lastName: 'Williams', gender: 'female' },
      { firstName: 'David', lastName: 'Martinez', gender: 'male' },
      { firstName: 'Emily', lastName: 'Anderson', gender: 'female' },
      { firstName: 'James', lastName: 'Taylor', gender: 'male' },
      { firstName: 'Lisa', lastName: 'Brown', gender: 'female' }
    ];

    console.log('Creating 6 new dummy players...\n');

    const createdPlayers = [];
    for (const playerData of dummyPlayers) {
      const player = await Player.create({
        ...playerData,
        clubId,
        mode: 'singles'
      });
      createdPlayers.push(player);
      console.log(`✓ Created: ${player.firstName} ${player.lastName}`);
    }

    // Get current registrations
    const existing = await TournamentRegistration.find({ tournamentId });
    console.log(`\nCurrent registrations: ${existing.length}`);

    // Register the new players for the tournament
    console.log('\nRegistering players for tournament...\n');

    for (const player of createdPlayers) {
      await TournamentRegistration.create({
        tournamentId,
        clubId,
        participantId: player._id,
        participantType: 'player',
        selectedByClubAdmin: true,
        selectedAt: new Date()
      });
      console.log(`✓ Registered: ${player.firstName} ${player.lastName}`);
    }

    const total = await TournamentRegistration.countDocuments({ tournamentId });
    console.log(`\nTotal registrations now: ${total}`);

    await mongoose.disconnect();
    console.log('\n✅ Done!');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

addDummyPlayers();
