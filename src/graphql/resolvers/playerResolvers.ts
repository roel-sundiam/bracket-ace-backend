import { Player } from '../../models/Player';
import { Team } from '../../models/Team';
import { Tournament } from '../../models/Tournament';
import { User } from '../../models/User';
import { Club } from '../../models/Club';
import { ClubMembership } from '../../models/ClubMembership';
import { getAuthContext, requireAuth } from '../../utils/auth';

export const playerResolvers = {
  Query: {
    players: async (_: any, { mode }: { mode?: 'singles' | 'doubles' }) => {
      try {
        const filter = mode ? { mode } : {};
        return await Player.find(filter).populate('teamId');
      } catch (error) {
        throw new Error('Failed to fetch players');
      }
    },

    tournamentPlayers: async (_: any, { tournamentId }: { tournamentId: string }) => {
      try {
        return await Player.find({ tournamentId }).populate('teamId');
      } catch (error) {
        throw new Error('Failed to fetch tournament players');
      }
    },

    tournamentGroups: async (_: any, { tournamentId }: { tournamentId: string }) => {
      try {
        const tournament = await Tournament.findById(tournamentId);
        if (!tournament) {
          return null;
        }

        // Assuming tournament has groupA and groupB fields
        return {
          tournamentId,
          groupA: (tournament as any).groupA || [],
          groupB: (tournament as any).groupB || [],
        };
      } catch (error) {
        throw new Error('Failed to fetch tournament groups');
      }
    },

    clubPlayers: async (_: any, { clubId }: { clubId: string }, context: any) => {
      const authContext = await getAuthContext(context.req);
      requireAuth(authContext);

      try {
        // Get manually added club players
        const manualPlayers = await Player.find({ clubId, tournamentId: null }).populate('userId clubId');

        // Get club members who can be players
        const memberships = await ClubMembership.find({ clubId, status: 'approved' }).populate('userId');

        // Create player objects from club members who aren't already players
        const memberPlayers = memberships
          .filter(m => {
            const user = m.userId as any;
            return !manualPlayers.some(p => p.userId?.toString() === user._id.toString());
          })
          .map(m => {
            const user = m.userId as any;
            return {
              id: `member-${user._id}`,
              firstName: user.firstName,
              lastName: user.lastName,
              gender: user.gender,
              userId: user._id,
              clubId,
              mode: 'singles' as const,
              createdAt: m.createdAt,
              updatedAt: m.updatedAt
            };
          });

        return [...manualPlayers, ...memberPlayers];
      } catch (error) {
        console.error('[clubPlayers] Error:', error);
        throw new Error('Failed to fetch club players');
      }
    },

    teams: async (_: any, { tournamentId }: { tournamentId?: string }) => {
      try {
        const filter = tournamentId ? { tournamentId } : {};
        return await Team.find(filter).populate('player1Id player2Id');
      } catch (error) {
        throw new Error('Failed to fetch teams');
      }
    },
  },

  Mutation: {
    registerPlayer: async (_: any, { input }: { 
      input: { 
        name: string; 
        mode: 'singles' | 'doubles'; 
        tournamentId: string 
      } 
    }) => {
      try {
        const { name, mode, tournamentId } = input;
        
        if (!name || !mode || !tournamentId) {
          throw new Error('Name, mode, and tournamentId are required');
        }
        
        const tournament = await Tournament.findById(tournamentId);
        if (!tournament) {
          throw new Error('Tournament not found');
        }
        
        if (tournament.mode !== mode) {
          throw new Error('Player mode must match tournament mode');
        }
        
        if (tournament.status !== 'registration') {
          throw new Error('Tournament registration is closed');
        }
        
        const maxPlayers = mode === 'singles' ? 8 : 16;
        const currentPlayers = await Player.countDocuments({ mode, tournamentId });
        
        if (currentPlayers >= maxPlayers) {
          throw new Error('Tournament is full');
        }
        
        const player = new Player({ name, mode, tournamentId });
        await player.save();
        
        await Tournament.findByIdAndUpdate(tournamentId, {
          $inc: { currentParticipants: 1 }
        });
        
        return player;
      } catch (error) {
        throw new Error(`Failed to register player: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    },

    registerTeam: async (_: any, { input }: { 
      input: { 
        name: string; 
        player1Name: string; 
        player2Name: string; 
        tournamentId: string 
      } 
    }) => {
      try {
        const { name, player1Name, player2Name, tournamentId } = input;
        
        if (!name || !player1Name || !player2Name || !tournamentId) {
          throw new Error('All fields are required');
        }
        
        const tournament = await Tournament.findById(tournamentId);
        if (!tournament) {
          throw new Error('Tournament not found');
        }
        
        if (tournament.mode !== 'doubles') {
          throw new Error('Teams can only be created for doubles tournaments');
        }
        
        if (tournament.status !== 'registration') {
          throw new Error('Tournament registration is closed');
        }
        
        const currentTeams = await Team.countDocuments({ tournamentId });
        if (currentTeams >= 8) {
          throw new Error('Tournament is full (8 teams max)');
        }
        
        const player1 = new Player({ name: player1Name, mode: 'doubles', tournamentId });
        const player2 = new Player({ name: player2Name, mode: 'doubles', tournamentId });
        
        await player1.save();
        await player2.save();
        
        const team = new Team({
          name,
          player1Id: player1._id,
          player2Id: player2._id,
          tournamentId
        });
        
        await team.save();
        
        player1.teamId = team._id;
        player2.teamId = team._id;
        
        await player1.save();
        await player2.save();
        
        await Tournament.findByIdAndUpdate(tournamentId, {
          $inc: { currentParticipants: 2 }
        });
        
        const populatedTeam = await Team.findById(team._id)
          .populate('player1Id player2Id');
        
        return populatedTeam;
      } catch (error) {
        throw new Error(`Failed to register team: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    },

    addClubPlayer: async (_: any, { input }: {
      input: {
        firstName: string;
        lastName: string;
        gender: 'male' | 'female';
        clubId: string;
        userId?: string;
      }
    }, context: any) => {
      const authContext = await getAuthContext(context.req);
      requireAuth(authContext);

      try {
        const { firstName, lastName, gender, clubId, userId } = input;

        // Verify club exists
        const club = await Club.findById(clubId);
        if (!club) {
          throw new Error('Club not found');
        }

        // Verify user is club admin or superadmin
        const clubAdminIdStr = club.clubAdminId?.toString();
        const userIdStr = authContext.user!._id.toString();

        if (authContext.user!.role !== 'superadmin' && clubAdminIdStr !== userIdStr) {
          throw new Error('Only club admin can add players');
        }

        // If userId is provided, verify it exists and isn't already a player for this club
        if (userId) {
          const user = await User.findById(userId);
          if (!user) {
            throw new Error('User not found');
          }

          const existingPlayer = await Player.findOne({ clubId, userId, tournamentId: null });
          if (existingPlayer) {
            throw new Error('User is already a club player');
          }
        }

        // Create the player
        const player = new Player({
          firstName,
          lastName,
          gender,
          clubId,
          userId: userId || null,
          mode: 'singles', // Default mode, can be used for both
          tournamentId: null // Null means it's a club player, not tournament-specific
        });

        await player.save();
        return await Player.findById(player._id).populate('userId clubId');
      } catch (error) {
        throw new Error(`Failed to add club player: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    },

    removeClubPlayer: async (_: any, { playerId }: { playerId: string }, context: any) => {
      const authContext = await getAuthContext(context.req);
      requireAuth(authContext);

      try {
        const player = await Player.findById(playerId).populate('clubId');
        if (!player) {
          throw new Error('Player not found');
        }

        if (!player.clubId) {
          throw new Error('Not a club player');
        }

        const club = await Club.findById(player.clubId);
        if (!club) {
          throw new Error('Club not found');
        }

        // Verify user is club admin or superadmin
        const clubAdminIdStr = club.clubAdminId?.toString();
        const userIdStr = authContext.user!._id.toString();

        if (authContext.user!.role !== 'superadmin' && clubAdminIdStr !== userIdStr) {
          throw new Error('Only club admin can remove players');
        }

        // Only allow removal of manually added players (not members)
        if (player.userId) {
          throw new Error('Cannot remove club members. Remove their membership instead.');
        }

        await Player.findByIdAndDelete(playerId);
        return true;
      } catch (error) {
        throw new Error(`Failed to remove club player: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    },

    // Quick Tournament Mutations
    createQuickPlayer: async (_: any, { input }: {
      input: {
        firstName: string;
        lastName: string;
        gender: 'male' | 'female';
        tournamentId: string;
      }
    }) => {
      try {
        const { firstName, lastName, gender, tournamentId } = input;

        const tournament = await Tournament.findById(tournamentId);
        if (!tournament) {
          throw new Error('Tournament not found');
        }

        const player = new Player({
          firstName,
          lastName,
          gender,
          mode: 'doubles',
          tournamentId,
        });

        await player.save();

        // Update tournament participant count
        await Tournament.findByIdAndUpdate(tournamentId, {
          $inc: { currentParticipants: 1 }
        });

        return await Player.findById(player._id).populate('teamId');
      } catch (error) {
        throw new Error(`Failed to create quick player: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    },

    updateQuickPlayer: async (_: any, { id, input }: {
      id: string;
      input: {
        firstName?: string;
        lastName?: string;
        gender?: 'male' | 'female';
      }
    }) => {
      try {
        const player = await Player.findByIdAndUpdate(
          id,
          { $set: input },
          { new: true }
        ).populate('teamId');

        if (!player) {
          throw new Error('Player not found');
        }

        return player;
      } catch (error) {
        throw new Error(`Failed to update quick player: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    },

    deleteQuickPlayer: async (_: any, { id }: { id: string }) => {
      try {
        const player = await Player.findById(id);
        if (!player) {
          throw new Error('Player not found');
        }

        if (player.teamId) {
          throw new Error('Cannot delete a player that is assigned to a team');
        }

        const tournamentId = player.tournamentId;
        await Player.findByIdAndDelete(id);

        // Update tournament participant count if player was part of a tournament
        if (tournamentId) {
          await Tournament.findByIdAndUpdate(tournamentId, {
            $inc: { currentParticipants: -1 }
          });
        }

        return true;
      } catch (error) {
        throw new Error(`Failed to delete quick player: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    },

    createQuickTeam: async (_: any, { input }: {
      input: {
        name: string;
        player1Id: string;
        player2Id: string;
        tournamentId: string;
      }
    }) => {
      try {
        const { name, player1Id, player2Id, tournamentId } = input;

        const tournament = await Tournament.findById(tournamentId);
        if (!tournament) {
          throw new Error('Tournament not found');
        }

        const player1 = await Player.findById(player1Id);
        const player2 = await Player.findById(player2Id);

        if (!player1 || !player2) {
          throw new Error('One or both players not found');
        }

        if (player1.teamId || player2.teamId) {
          throw new Error('One or both players are already in a team');
        }

        const team = new Team({
          name,
          player1Id,
          player2Id,
          tournamentId,
        });

        await team.save();

        // Update players with teamId
        player1.teamId = team._id;
        player2.teamId = team._id;
        await player1.save();
        await player2.save();

        return await Team.findById(team._id).populate('player1Id player2Id');
      } catch (error) {
        throw new Error(`Failed to create quick team: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    },

    deleteQuickTeam: async (_: any, { id }: { id: string }) => {
      try {
        const team = await Team.findById(id);
        if (!team) {
          throw new Error('Team not found');
        }

        // Remove teamId from players
        await Player.updateMany(
          { _id: { $in: [team.player1Id, team.player2Id] } },
          { $unset: { teamId: 1 } }
        );

        await Team.findByIdAndDelete(id);
        return true;
      } catch (error) {
        throw new Error(`Failed to delete quick team: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    },

    setTournamentGroups: async (_: any, { input }: {
      input: {
        tournamentId: string;
        groupA: string[];
        groupB: string[];
      }
    }) => {
      try {
        const { tournamentId, groupA, groupB } = input;

        const tournament = await Tournament.findById(tournamentId);
        if (!tournament) {
          throw new Error('Tournament not found');
        }

        // Update tournament with groups
        await Tournament.findByIdAndUpdate(tournamentId, {
          $set: { groupA, groupB }
        });

        return {
          tournamentId,
          groupA,
          groupB,
        };
      } catch (error) {
        throw new Error(`Failed to set tournament groups: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    },
  },

  Player: {
    user: async (parent: any) => {
      return parent.userId ? await User.findById(parent.userId) : null;
    },
    club: async (parent: any) => {
      return parent.clubId ? await Club.findById(parent.clubId) : null;
    },
  },

  Team: {
    player1: async (parent: any) => {
      return await Player.findById(parent.player1Id);
    },
    player2: async (parent: any) => {
      return await Player.findById(parent.player2Id);
    },
  },
};