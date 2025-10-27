import { Match } from '../../models/Match';
import { Tournament } from '../../models/Tournament';
import { Player } from '../../models/Player';
import { Team } from '../../models/Team';
import { BracketAssignment } from '../../models/BracketAssignment';
import mongoose from 'mongoose';

// This will be used for real-time subscriptions later
let matchSubscriptions = new Map();

export const matchResolvers = {
  Query: {
    matches: async (_: any, { tournamentId }: { tournamentId: string }) => {
      try {
        if (!mongoose.Types.ObjectId.isValid(tournamentId)) {
          throw new Error('Invalid tournament ID format');
        }
        const matches = await Match.find({ tournamentId })
          .sort({ round: 1, bracketType: 1 });
        
        // Add participant names for easier frontend display
        const enrichedMatches = await Promise.all(matches.map(async (match) => {
          const tournament = await Tournament.findById(tournamentId);
          let participant1Name = 'TBD';
          let participant2Name = 'TBD';

          // Only fetch participant info if they're not TBD placeholders
          if (match.participant1 && match.participant1 !== 'TBD') {
            if (tournament && tournament.mode === 'singles') {
              const p1 = await Player.findById(match.participant1);
              participant1Name = p1 ? `${p1.firstName || ''} ${p1.lastName || ''}`.trim() || 'TBD' : 'TBD';
            } else {
              const t1 = await Team.findById(match.participant1);
              participant1Name = t1?.name || 'TBD';
            }
          }

          if (match.participant2 && match.participant2 !== 'TBD') {
            if (tournament && tournament.mode === 'singles') {
              const p2 = await Player.findById(match.participant2);
              participant2Name = p2 ? `${p2.firstName || ''} ${p2.lastName || ''}`.trim() || 'TBD' : 'TBD';
            } else {
              const t2 = await Team.findById(match.participant2);
              participant2Name = t2?.name || 'TBD';
            }
          }
          
          return {
            ...match.toObject(),
            id: match._id.toString(),
            participant1Name,
            participant2Name
          };
        }));
        
        return enrichedMatches;
      } catch (error) {
        if (error instanceof Error) {
          throw error;
        }
        throw new Error('Failed to fetch matches');
      }
    },

    bracket: async (_: any, { tournamentId }: { tournamentId: string }) => {
      try {
        if (!mongoose.Types.ObjectId.isValid(tournamentId)) {
          throw new Error('Invalid tournament ID format');
        }
        const tournament = await Tournament.findById(tournamentId);

        if (!tournament) {
          throw new Error('Tournament not found');
        }
        
        const winnersMatches = await Match.find({
          tournamentId,
          bracketType: 'winners'
        }).sort({ round: 1 });
        
        const losersMatches = await Match.find({
          tournamentId,
          bracketType: 'losers'
        }).sort({ round: 1 });
        
        // Enrich matches with participant names
        const enrichMatches = async (matches: any[]) => {
          return await Promise.all(matches.map(async (match) => {
            let participant1Name = 'TBD';
            let participant2Name = 'TBD';
            
            if (tournament.mode === 'singles') {
              const p1 = await Player.findById(match.participant1);
              const p2 = await Player.findById(match.participant2);
              participant1Name = p1 ? `${p1.firstName || ''} ${p1.lastName || ''}`.trim() || 'TBD' : 'TBD';
              participant2Name = p2 ? `${p2.firstName || ''} ${p2.lastName || ''}`.trim() || 'TBD' : 'TBD';
            } else {
              const t1 = await Team.findById(match.participant1);
              const t2 = await Team.findById(match.participant2);
              participant1Name = t1?.name || 'TBD';
              participant2Name = t2?.name || 'TBD';
            }
            
            return {
              ...match.toObject(),
              id: match._id.toString(),
              participant1Name,
              participant2Name
            };
          }));
        };
        
        const enrichedWinners = await enrichMatches(winnersMatches);
        const enrichedLosers = await enrichMatches(losersMatches);
        
        return {
          tournament,
          winners: enrichedWinners,
          losers: enrichedLosers
        };
      } catch (error) {
        if (error instanceof Error) {
          throw error;
        }
        throw new Error('Failed to fetch bracket');
      }
    },
  },

  Mutation: {
    generateMatches: async (_: any, { tournamentId }: { tournamentId: string }) => {
      try {
        if (!tournamentId) {
          throw new Error('Tournament ID is required');
        }

        const tournament = await Tournament.findById(tournamentId);
        if (!tournament) {
          throw new Error('Tournament not found');
        }

        if (tournament.status !== 'registration') {
          throw new Error('Cannot generate matches for this tournament');
        }

        const expectedParticipants = tournament.mode === 'singles' ? 8 : 16;
        if (tournament.currentParticipants < expectedParticipants) {
          throw new Error(`Need ${expectedParticipants} participants to start tournament`);
        }

        // Get participants
        let participants: string[] = [];
        if (tournament.mode === 'singles') {
          const players = await Player.find({ mode: 'singles' }).limit(8);
          participants = players.map(p => p._id.toString());
        } else {
          const teams = await Team.find({ tournamentId }).limit(8);
          participants = teams.map(t => t._id.toString());
        }

        if (participants.length !== 8) {
          throw new Error(`Expected 8 participants but found ${participants.length}`);
        }

        // Shuffle participants randomly
        for (let i = participants.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [participants[i], participants[j]] = [participants[j], participants[i]];
        }

        // Split participants into two brackets
        // First 4 go to Winners bracket, last 4 go to Consolation bracket
        const winnersBracket = participants.slice(0, 4);
        const consolationBracket = participants.slice(4, 8);

        // Apply standard tournament seeding: 1v4, 2v3 for each bracket
        // This ensures balanced matchups within each bracket

        // Create quarter-final matches (Winners bracket) - 2 matches
        const winnersQF1 = new Match({
          tournamentId,
          round: 1,
          bracketType: 'winners',
          participant1: winnersBracket[0], // Seed 1
          participant2: winnersBracket[3], // Seed 4
          completed: false
        });
        await winnersQF1.save();

        const winnersQF2 = new Match({
          tournamentId,
          round: 1,
          bracketType: 'winners',
          participant1: winnersBracket[1], // Seed 2
          participant2: winnersBracket[2], // Seed 3
          completed: false
        });
        await winnersQF2.save();

        // Create consolation bracket quarter-finals - 2 matches
        const consolationQF1 = new Match({
          tournamentId,
          round: 1,
          bracketType: 'losers',
          participant1: consolationBracket[0], // Seed 1
          participant2: consolationBracket[3], // Seed 4
          completed: false
        });
        await consolationQF1.save();

        const consolationQF2 = new Match({
          tournamentId,
          round: 1,
          bracketType: 'losers',
          participant1: consolationBracket[1], // Seed 2
          participant2: consolationBracket[2], // Seed 3
          completed: false
        });
        await consolationQF2.save();

        // Create semi-final match placeholder (Winners bracket)
        const winnersSF = new Match({
          tournamentId,
          round: 2,
          bracketType: 'winners',
          participant1: 'TBD',
          participant2: 'TBD',
          completed: false
        });
        await winnersSF.save();

        // Create semi-final match placeholder (Consolation bracket)
        const consolationSF = new Match({
          tournamentId,
          round: 2,
          bracketType: 'losers',
          participant1: 'TBD',
          participant2: 'TBD',
          completed: false
        });
        await consolationSF.save();

        // Create final match placeholder (Winners bracket)
        const winnersFinal = new Match({
          tournamentId,
          round: 3,
          bracketType: 'winners',
          participant1: 'TBD',
          participant2: 'TBD',
          completed: false
        });
        await winnersFinal.save();

        // Create final match placeholder (Consolation bracket)
        const consolationFinal = new Match({
          tournamentId,
          round: 3,
          bracketType: 'losers',
          participant1: 'TBD',
          participant2: 'TBD',
          completed: false
        });
        await consolationFinal.save();

        await Tournament.findByIdAndUpdate(tournamentId, { status: 'in-progress' });

        // Return all created matches
        const allMatches = [
          winnersQF1,
          winnersQF2,
          winnersSF,
          winnersFinal,
          consolationQF1,
          consolationQF2,
          consolationSF,
          consolationFinal
        ];

        return allMatches;
      } catch (error) {
        throw new Error(`Failed to generate matches: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    },

    submitMatchResult: async (_: any, { input }: { 
      input: { 
        matchId: string; 
        winnerId: string; 
        loserId: string; 
        score?: { participant1Score: number; participant2Score: number } 
      } 
    }) => {
      try {
        const { matchId, winnerId, loserId, score } = input;
        
        if (!winnerId || !loserId) {
          throw new Error('Winner and loser IDs are required');
        }
        
        const match = await Match.findById(matchId);
        if (!match) {
          throw new Error('Match not found');
        }
        
        if (match.completed) {
          throw new Error('Match already completed');
        }
        
        const validParticipants = [match.participant1.toString(), match.participant2.toString()];
        if (!validParticipants.includes(winnerId) || !validParticipants.includes(loserId)) {
          throw new Error('Invalid winner or loser ID');
        }
        
        match.winner = winnerId;
        match.loser = loserId;
        match.completed = true;
        
        if (score) {
          match.score = score;
        }
        
        await match.save();
        
        // TODO: Auto-advance winners to next round
        await advanceWinnerToNextRound(match);
        await moveLosersToConsolationBracket(match);
        
        return match;
      } catch (error) {
        throw new Error(`Failed to update match result: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    },

    updateLiveScore: async (_: any, { input }: {
      input: {
        matchId: string;
        scoreA: number;
        scoreB: number;
        pointsA?: number;
        pointsB?: number;
      }
    }) => {
      try {
        const { matchId, scoreA, scoreB, pointsA, pointsB } = input;

        const match = await Match.findById(matchId);
        if (!match) {
          throw new Error('Match not found');
        }

        if (match.completed) {
          throw new Error('Cannot update score for completed match');
        }

        // Update the live score with games and points
        match.score = {
          participant1Score: scoreA,
          participant2Score: scoreB,
          participant1Points: pointsA || 0,
          participant2Points: pointsB || 0
        };

        // Note: Match will remain live until admin explicitly clicks "End Match"
        // This allows the score to be visible on the public live scoring page
        // even when one team reaches 4 games

        await match.save();

        // TODO: Emit subscription update for real-time updates

        return match;
      } catch (error) {
        throw new Error(`Failed to update live score: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    },

    assignParticipantToBracket: async (_: any, { input }: {
      input: {
        tournamentId: string;
        participantId: string;
        bracketType: 'winners' | 'losers';
        seed: number;
      }
    }) => {
      try {
        const { tournamentId, participantId, bracketType, seed } = input;

        const tournament = await Tournament.findById(tournamentId);
        if (!tournament) {
          throw new Error('Tournament not found');
        }

        if (tournament.status !== 'registration') {
          throw new Error('Can only assign participants during registration');
        }

        if (tournament.bracketingMethod !== 'manual') {
          throw new Error('This tournament is set to random bracketing');
        }

        if (seed < 1 || seed > 4) {
          throw new Error('Seed must be between 1 and 4');
        }

        // Check if assignment already exists and update it, or create new one
        const existingAssignment = await BracketAssignment.findOne({
          tournamentId,
          participantId
        });

        if (existingAssignment) {
          existingAssignment.bracketType = bracketType;
          existingAssignment.seed = seed;
          await existingAssignment.save();
          return existingAssignment;
        } else {
          const assignment = new BracketAssignment({
            tournamentId,
            participantId,
            bracketType,
            seed
          });
          await assignment.save();
          return assignment;
        }
      } catch (error) {
        throw new Error(`Failed to assign participant: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    },

    generateMatchesFromManualSeeding: async (_: any, { tournamentId }: { tournamentId: string }) => {
      try {
        const tournament = await Tournament.findById(tournamentId);
        if (!tournament) {
          throw new Error('Tournament not found');
        }

        if (tournament.status !== 'registration') {
          throw new Error('Cannot generate matches for this tournament');
        }

        if (tournament.bracketingMethod !== 'manual') {
          throw new Error('This tournament is set to random bracketing. Use generateMatches instead.');
        }

        // Get all bracket assignments
        const assignments = await BracketAssignment.find({ tournamentId }).sort({ bracketType: 1, seed: 1 });

        if (assignments.length !== 8) {
          throw new Error(`Need 8 participants assigned but found ${assignments.length}`);
        }

        // Separate assignments by bracket type
        const winnersAssignments = assignments.filter(a => a.bracketType === 'winners');
        const consolationAssignments = assignments.filter(a => a.bracketType === 'losers');

        if (winnersAssignments.length !== 4) {
          throw new Error(`Need 4 participants in winners bracket but found ${winnersAssignments.length}`);
        }

        if (consolationAssignments.length !== 4) {
          throw new Error(`Need 4 participants in consolation bracket but found ${consolationAssignments.length}`);
        }

        // Sort by seed to ensure correct ordering
        winnersAssignments.sort((a, b) => a.seed - b.seed);
        consolationAssignments.sort((a, b) => a.seed - b.seed);

        // Create quarter-final matches (Winners bracket) - 2 matches
        // Seed 1 vs Seed 4, Seed 2 vs Seed 3
        const winnersQF1 = new Match({
          tournamentId,
          round: 1,
          bracketType: 'winners',
          participant1: winnersAssignments[0].participantId, // Seed 1
          participant2: winnersAssignments[3].participantId, // Seed 4
          completed: false
        });
        await winnersQF1.save();

        const winnersQF2 = new Match({
          tournamentId,
          round: 1,
          bracketType: 'winners',
          participant1: winnersAssignments[1].participantId, // Seed 2
          participant2: winnersAssignments[2].participantId, // Seed 3
          completed: false
        });
        await winnersQF2.save();

        // Create consolation bracket quarter-finals - 2 matches
        const consolationQF1 = new Match({
          tournamentId,
          round: 1,
          bracketType: 'losers',
          participant1: consolationAssignments[0].participantId, // Seed 1
          participant2: consolationAssignments[3].participantId, // Seed 4
          completed: false
        });
        await consolationQF1.save();

        const consolationQF2 = new Match({
          tournamentId,
          round: 1,
          bracketType: 'losers',
          participant1: consolationAssignments[1].participantId, // Seed 2
          participant2: consolationAssignments[2].participantId, // Seed 3
          completed: false
        });
        await consolationQF2.save();

        // Create semi-final match placeholder (Winners bracket)
        const winnersSF = new Match({
          tournamentId,
          round: 2,
          bracketType: 'winners',
          participant1: 'TBD',
          participant2: 'TBD',
          completed: false
        });
        await winnersSF.save();

        // Create semi-final match placeholder (Consolation bracket)
        const consolationSF = new Match({
          tournamentId,
          round: 2,
          bracketType: 'losers',
          participant1: 'TBD',
          participant2: 'TBD',
          completed: false
        });
        await consolationSF.save();

        // Create final match placeholder (Winners bracket)
        const winnersFinal = new Match({
          tournamentId,
          round: 3,
          bracketType: 'winners',
          participant1: 'TBD',
          participant2: 'TBD',
          completed: false
        });
        await winnersFinal.save();

        // Create final match placeholder (Consolation bracket)
        const consolationFinal = new Match({
          tournamentId,
          round: 3,
          bracketType: 'losers',
          participant1: 'TBD',
          participant2: 'TBD',
          completed: false
        });
        await consolationFinal.save();

        await Tournament.findByIdAndUpdate(tournamentId, {
          status: 'in-progress',
          seedingCompleted: true
        });

        // Return all created matches
        const allMatches = [
          winnersQF1,
          winnersQF2,
          winnersSF,
          winnersFinal,
          consolationQF1,
          consolationQF2,
          consolationSF,
          consolationFinal
        ];

        return allMatches;
      } catch (error) {
        throw new Error(`Failed to generate matches from manual seeding: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    },

    generateRoundRobinMatches: async (_: any, { tournamentId }: { tournamentId: string }) => {
      try {
        const tournament = await Tournament.findById(tournamentId);
        if (!tournament) {
          throw new Error('Tournament not found');
        }

        if (tournament.status === 'completed') {
          throw new Error('Cannot generate matches for a completed tournament');
        }

        if (!tournament.groupA || !tournament.groupB || tournament.groupA.length === 0 || tournament.groupB.length === 0) {
          throw new Error('Groups must be assigned before generating matches');
        }

        console.log('Tournament groups:', {
          groupA: tournament.groupA,
          groupB: tournament.groupB,
          groupALength: tournament.groupA.length,
          groupBLength: tournament.groupB.length
        });

        // Validate that both groups have the same number of teams (2, 3, or 4 teams each)
        if (tournament.groupA.length < 2 || tournament.groupB.length < 2) {
          throw new Error(`Each group must have at least 2 teams. Group A has ${tournament.groupA.length} teams, Group B has ${tournament.groupB.length} teams`);
        }

        if (tournament.groupA.length !== tournament.groupB.length) {
          throw new Error(`Both groups must have the same number of teams. Group A has ${tournament.groupA.length} teams, Group B has ${tournament.groupB.length} teams`);
        }

        // Delete any existing matches for this tournament
        await Match.deleteMany({ tournamentId });

        const createdMatches: any[] = [];

        // Generate round-robin matches for Group A
        // Each team plays every other team once (4 teams = 6 matches)
        const groupATeams = tournament.groupA;
        for (let i = 0; i < groupATeams.length; i++) {
          for (let j = i + 1; j < groupATeams.length; j++) {
            const match = new Match({
              tournamentId,
              round: 1, // All group matches are considered round 1
              bracketType: 'winners', // Group A uses winners bracket
              participant1: groupATeams[i],
              participant2: groupATeams[j],
              completed: false
            });
            await match.save();
            createdMatches.push(match);
          }
        }

        // Generate round-robin matches for Group B
        const groupBTeams = tournament.groupB;
        for (let i = 0; i < groupBTeams.length; i++) {
          for (let j = i + 1; j < groupBTeams.length; j++) {
            const match = new Match({
              tournamentId,
              round: 1, // All group matches are considered round 1
              bracketType: 'losers', // Group B uses losers bracket
              participant1: groupBTeams[i],
              participant2: groupBTeams[j],
              completed: false
            });
            await match.save();
            createdMatches.push(match);
          }
        }

        // Generate knockout stage matches
        // Direct finals format for all group sizes:
        // - Championship Final: 1st Group A vs 1st Group B
        // - 3rd Place Match: 2nd Group A vs 2nd Group B

        // Championship Final: 1st place from each group
        const final = new Match({
          tournamentId,
          round: 2,
          bracketType: 'winners',
          participant1: 'TBD', // 1st place Group A
          participant2: 'TBD', // 1st place Group B
          completed: false
        });
        await final.save();
        createdMatches.push(final);

        // 3rd Place Match: 2nd place from each group
        const thirdPlace = new Match({
          tournamentId,
          round: 2,
          bracketType: 'losers',
          participant1: 'TBD', // 2nd place Group A
          participant2: 'TBD', // 2nd place Group B
          completed: false
        });
        await thirdPlace.save();
        createdMatches.push(thirdPlace);

        // Update tournament status to in_progress
        await Tournament.findByIdAndUpdate(tournamentId, {
          status: 'in_progress',
          seedingCompleted: true
        });

        return createdMatches;
      } catch (error) {
        throw new Error(`Failed to generate round-robin matches: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    },

    updateMatchSchedule: async (_: any, { matchId, scheduledDate, scheduledTime }: {
      matchId: string;
      scheduledDate?: Date;
      scheduledTime?: string;
    }) => {
      try {
        const match = await Match.findById(matchId);
        if (!match) {
          throw new Error('Match not found');
        }

        // Update scheduling fields
        match.scheduledDate = scheduledDate || undefined;
        match.scheduledTime = scheduledTime || undefined;

        await match.save();
        return match;
      } catch (error) {
        throw new Error(`Failed to update match schedule: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    },

    recalculatePlayoffMatches: async (_: any, { tournamentId }: { tournamentId: string }) => {
      try {
        console.log('[RECALCULATE] Starting playoff recalculation for tournament:', tournamentId);

        // Call the advancePlayoffTeams function which will recalculate and update
        await advancePlayoffTeams(tournamentId);

        // Return the updated playoff matches
        const playoffMatches = await Match.find({
          tournamentId,
          round: 2
        }).sort({ bracketType: -1 }); // winners first, then losers

        console.log('[RECALCULATE] Playoff matches updated:', playoffMatches.length);

        return playoffMatches;
      } catch (error) {
        throw new Error(`Failed to recalculate playoff matches: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    },

    deleteMatch: async (_: any, { matchId }: { matchId: string }) => {
      try {
        console.log('[DELETE MATCH] Deleting match:', matchId);

        const match = await Match.findById(matchId);
        if (!match) {
          throw new Error('Match not found');
        }

        // Don't allow deleting completed matches
        if (match.completed) {
          throw new Error('Cannot delete a completed match');
        }

        await Match.findByIdAndDelete(matchId);
        console.log('[DELETE MATCH] Match deleted successfully');

        return true;
      } catch (error) {
        throw new Error(`Failed to delete match: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    },

    resetMatch: async (_: any, { matchId }: { matchId: string }) => {
      try {
        console.log('[RESET MATCH] Resetting match:', matchId);

        const match = await Match.findById(matchId);
        if (!match) {
          throw new Error('Match not found');
        }

        // Reset match to pending state
        match.completed = false;
        match.winner = undefined;
        match.loser = undefined;
        match.score = undefined;

        await match.save();
        console.log('[RESET MATCH] Match reset successfully');

        return match;
      } catch (error) {
        throw new Error(`Failed to reset match: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    },
  },

  Match: {
    participant1Name: async (parent: any) => {
      // Return 'TBD' if participant is not set or is a placeholder
      if (!parent.participant1 || parent.participant1 === 'TBD') {
        return 'TBD';
      }

      const tournament = await Tournament.findById(parent.tournamentId);
      if (tournament && tournament.mode === 'singles') {
        const player = await Player.findById(parent.participant1);
        return player ? `${player.firstName || ''} ${player.lastName || ''}`.trim() || 'TBD' : 'TBD';
      } else {
        const team = await Team.findById(parent.participant1);
        return team?.name || 'TBD';
      }
    },

    participant2Name: async (parent: any) => {
      // Return 'TBD' if participant is not set or is a placeholder
      if (!parent.participant2 || parent.participant2 === 'TBD') {
        return 'TBD';
      }

      const tournament = await Tournament.findById(parent.tournamentId);
      if (tournament && tournament.mode === 'singles') {
        const player = await Player.findById(parent.participant2);
        return player ? `${player.firstName || ''} ${player.lastName || ''}`.trim() || 'TBD' : 'TBD';
      } else {
        const team = await Team.findById(parent.participant2);
        return team?.name || 'TBD';
      }
    },
  },
};

// Helper functions for bracket advancement

/**
 * Calculate group standings based on completed matches
 * Uses the same tie-breaking rules as the frontend
 */
async function calculateGroupStandings(
  matches: any[],
  groupTeams: string[]
): Promise<Array<{ teamId: string; rank: number; wins: number; gamesWon: number; gamesLost: number; gamesDifferential: number }>> {

  // Initialize standings for all teams in the group
  const standingsMap = new Map<string, any>();

  groupTeams.forEach(teamId => {
    standingsMap.set(teamId, {
      teamId: teamId,
      rank: 0,
      matchesPlayed: 0,
      wins: 0,
      losses: 0,
      gamesWon: 0,
      gamesLost: 0,
      gamesDifferential: 0,
      points: 0
    });
  });

  // Process completed matches
  matches.forEach(match => {
    if (!match.completed || !match.score) return;

    const p1Id = match.participant1.toString();
    const p2Id = match.participant2.toString();
    const p1Score = match.score.participant1Score || 0;
    const p2Score = match.score.participant2Score || 0;

    // Update participant 1 stats
    if (standingsMap.has(p1Id)) {
      const standing = standingsMap.get(p1Id);
      standing.matchesPlayed++;
      standing.gamesWon += p1Score;
      standing.gamesLost += p2Score;

      if (match.winner && match.winner.toString() === p1Id) {
        standing.wins++;
        standing.points += 2;
      } else {
        standing.losses++;
        standing.points += 1;
      }
    }

    // Update participant 2 stats
    if (standingsMap.has(p2Id)) {
      const standing = standingsMap.get(p2Id);
      standing.matchesPlayed++;
      standing.gamesWon += p2Score;
      standing.gamesLost += p1Score;

      if (match.winner && match.winner.toString() === p2Id) {
        standing.wins++;
        standing.points += 2;
      } else {
        standing.losses++;
        standing.points += 1;
      }
    }
  });

  // Calculate games differential
  const standings = Array.from(standingsMap.values()).map(standing => {
    standing.gamesDifferential = standing.gamesWon - standing.gamesLost;
    return standing;
  });

  // Helper to get head-to-head winner
  const getHeadToHeadWinner = (teamId1: string, teamId2: string): string | null => {
    const headToHeadMatch = matches.find(match =>
      match.completed &&
      ((match.participant1.toString() === teamId1 && match.participant2.toString() === teamId2) ||
       (match.participant1.toString() === teamId2 && match.participant2.toString() === teamId1))
    );

    if (!headToHeadMatch || !headToHeadMatch.winner) {
      return null;
    }

    return headToHeadMatch.winner.toString();
  };

  // Sort standings with tie-breaking rules
  standings.sort((a, b) => {
    // 1. Primary: Most games won
    if (b.gamesWon !== a.gamesWon) return b.gamesWon - a.gamesWon;

    // 2. Secondary: Most match wins
    if (b.wins !== a.wins) return b.wins - a.wins;

    // 3. Tertiary: Head-to-head record (only for 2-team ties)
    const teamsWithSameStats = standings.filter(s =>
      s.gamesWon === a.gamesWon && s.wins === a.wins
    );

    if (teamsWithSameStats.length === 2) {
      const h2hWinner = getHeadToHeadWinner(a.teamId, b.teamId);
      if (h2hWinner === a.teamId) return -1;
      if (h2hWinner === b.teamId) return 1;
    }

    // 4. Quaternary: Games differential
    if (b.gamesDifferential !== a.gamesDifferential) {
      return b.gamesDifferential - a.gamesDifferential;
    }

    // 5. Quinary: Fewer matches played
    if (a.matchesPlayed !== b.matchesPlayed) {
      return a.matchesPlayed - b.matchesPlayed;
    }

    // 6. Ultimate: Alphabetical by team ID
    return a.teamId.localeCompare(b.teamId);
  });

  // Assign ranks
  standings.forEach((standing, index) => {
    standing.rank = index + 1;
  });

  return standings;
}

/**
 * Advance playoff teams based on group standings
 * Called after each match completion to check if all group matches are done
 */
async function advancePlayoffTeams(tournamentId: string) {
  const tournament = await Tournament.findById(tournamentId);
  if (!tournament) return;

  const groupA = tournament.groupA || [];
  const groupB = tournament.groupB || [];

  if (groupA.length === 0 || groupB.length === 0) return;

  // Get all round 1 matches (group stage)
  const groupAMatches = await Match.find({
    tournamentId,
    round: 1,
    bracketType: 'winners'
  });

  const groupBMatches = await Match.find({
    tournamentId,
    round: 1,
    bracketType: 'losers'
  });

  // Check if all group matches are completed
  const allGroupAComplete = groupAMatches.every(m => m.completed);
  const allGroupBComplete = groupBMatches.every(m => m.completed);

  if (!allGroupAComplete || !allGroupBComplete) {
    console.log('[PLAYOFF ADVANCEMENT] Not all group matches completed yet');
    return;
  }

  console.log('[PLAYOFF ADVANCEMENT] All group matches completed. Calculating standings...');

  // Calculate standings for both groups
  const groupAStandings = await calculateGroupStandings(groupAMatches, groupA.map(id => id.toString()));
  const groupBStandings = await calculateGroupStandings(groupBMatches, groupB.map(id => id.toString()));

  console.log('[PLAYOFF ADVANCEMENT] Group A standings:', groupAStandings);
  console.log('[PLAYOFF ADVANCEMENT] Group B standings:', groupBStandings);

  // Get top 2 from each group
  const groupA1st = groupAStandings[0]?.teamId;
  const groupA2nd = groupAStandings[1]?.teamId;
  const groupB1st = groupBStandings[0]?.teamId;
  const groupB2nd = groupBStandings[1]?.teamId;

  console.log('[PLAYOFF ADVANCEMENT] Advancing teams:', {
    finals: `${groupA1st} vs ${groupB1st}`,
    thirdPlace: `${groupA2nd} vs ${groupB2nd}`
  });

  // Find or create Finals match (round 2, bracketType 'winners')
  let finalsMatch = await Match.findOne({
    tournamentId,
    round: 2,
    bracketType: 'winners'
  });

  if (!finalsMatch && groupA1st && groupB1st) {
    // Create Finals match if it doesn't exist
    finalsMatch = new Match({
      tournamentId,
      round: 2,
      bracketType: 'winners',
      participant1: groupA1st,
      participant2: groupB1st,
      completed: false
    });
    await finalsMatch.save();
    console.log('[PLAYOFF ADVANCEMENT] Created Finals match');
  } else if (finalsMatch && groupA1st && groupB1st) {
    finalsMatch.participant1 = groupA1st;
    finalsMatch.participant2 = groupB1st;
    await finalsMatch.save();
    console.log('[PLAYOFF ADVANCEMENT] Updated Finals match');
  }

  // Find or create 3rd Place match (round 2, bracketType 'losers')
  let thirdPlaceMatch = await Match.findOne({
    tournamentId,
    round: 2,
    bracketType: 'losers'
  });

  if (!thirdPlaceMatch && groupA2nd && groupB2nd) {
    // Create 3rd Place match if it doesn't exist
    thirdPlaceMatch = new Match({
      tournamentId,
      round: 2,
      bracketType: 'losers',
      participant1: groupA2nd,
      participant2: groupB2nd,
      completed: false
    });
    await thirdPlaceMatch.save();
    console.log('[PLAYOFF ADVANCEMENT] Created 3rd Place match');
  } else if (thirdPlaceMatch && groupA2nd && groupB2nd) {
    thirdPlaceMatch.participant1 = groupA2nd;
    thirdPlaceMatch.participant2 = groupB2nd;
    await thirdPlaceMatch.save();
    console.log('[PLAYOFF ADVANCEMENT] Updated 3rd Place match');
  }
}

async function advanceWinnerToNextRound(completedMatch: any) {
  const { tournamentId, round, bracketType, winner, loser } = completedMatch;

  // Get tournament to check group size
  const tournament = await Tournament.findById(tournamentId);
  if (!tournament) return;

  const teamsPerGroup = tournament.groupA?.length || 0;

  // For round-robin tournaments with 4+ teams per group, use standings-based advancement
  if (teamsPerGroup >= 4 && round === 1) {
    console.log('[ADVANCEMENT] Round-robin tournament detected. Checking if ready for playoff advancement...');
    await advancePlayoffTeams(tournamentId);
    return;
  }

  // For 4-team tournaments (2 per group), round 1 group matches advance directly to finals
  if (teamsPerGroup === 2 && round === 1) {
    console.log(`[ADVANCEMENT] 4-team tournament detected. Round: ${round}, Winner: ${winner}, Loser: ${loser}`);
    // Group stage completed - advance winner to finals, loser to 3rd place
    // bracketType 'winners' = Group A, 'losers' = Group B in round-robin

    // Find the finals match (round 2, bracketType 'winners')
    const finalsMatch = await Match.findOne({
      tournamentId,
      round: 2,
      bracketType: 'winners'
    });

    console.log(`[ADVANCEMENT] Finals match found:`, finalsMatch ? {
      id: finalsMatch._id,
      participant1: finalsMatch.participant1,
      participant2: finalsMatch.participant2
    } : 'NOT FOUND');

    if (finalsMatch) {
      if (finalsMatch.participant1 === 'TBD') {
        finalsMatch.participant1 = winner;
        await finalsMatch.save();
        console.log(`[ADVANCEMENT] Updated finals participant1 to ${winner}`);
      } else if (finalsMatch.participant2 === 'TBD') {
        finalsMatch.participant2 = winner;
        await finalsMatch.save();
        console.log(`[ADVANCEMENT] Updated finals participant2 to ${winner}`);
      }
    }

    // Find the 3rd place match (round 2, bracketType 'losers')
    const thirdPlaceMatch = await Match.findOne({
      tournamentId,
      round: 2,
      bracketType: 'losers'
    });

    console.log(`[ADVANCEMENT] 3rd place match found:`, thirdPlaceMatch ? {
      id: thirdPlaceMatch._id,
      participant1: thirdPlaceMatch.participant1,
      participant2: thirdPlaceMatch.participant2
    } : 'NOT FOUND');

    if (thirdPlaceMatch && loser && loser !== 'TBD') {
      if (thirdPlaceMatch.participant1 === 'TBD') {
        thirdPlaceMatch.participant1 = loser;
        await thirdPlaceMatch.save();
        console.log(`[ADVANCEMENT] Updated 3rd place participant1 to ${loser}`);
      } else if (thirdPlaceMatch.participant2 === 'TBD') {
        thirdPlaceMatch.participant2 = loser;
        await thirdPlaceMatch.save();
        console.log(`[ADVANCEMENT] Updated 3rd place participant2 to ${loser}`);
      }
    }
  } else if (round < 3) {
    // For larger tournaments or subsequent rounds, use standard advancement
    // Find the next round match where this winner should advance
    const nextRoundMatches = await Match.find({
      tournamentId,
      round: round + 1,
      bracketType: bracketType // Stay in same bracket type
    });

    // For round 1 to round 2, there should only be 1 match in each bracket
    // So both QF winners go to the single SF match
    // For round 2 to round 3, both SF winners go to the single F match
    for (const nextMatch of nextRoundMatches) {
      if (nextMatch.participant1 === 'TBD') {
        nextMatch.participant1 = winner;
        await nextMatch.save();
        break;
      } else if (nextMatch.participant2 === 'TBD') {
        nextMatch.participant2 = winner;
        await nextMatch.save();
        break;
      }
    }
  }
}

async function moveLosersToConsolationBracket(completedMatch: any) {
  // In this dual-bracket system, losers don't move between brackets
  // Each bracket is independent, so this function is no longer needed
  // Keeping it for backwards compatibility but it does nothing
  return;
}