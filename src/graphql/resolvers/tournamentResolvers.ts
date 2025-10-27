import { Tournament } from '../../models/Tournament';
import { Player } from '../../models/Player';
import { Team } from '../../models/Team';
import { Club } from '../../models/Club';
import { TournamentRegistration } from '../../models/TournamentRegistration';
import { getAuthContext, requireAuth, requireSuperAdmin } from '../../utils/auth';
import mongoose from 'mongoose';

export const tournamentResolvers = {
  Query: {
    tournaments: async () => {
      try {
        return await Tournament.find().sort({ createdAt: -1 });
      } catch (error) {
        throw new Error('Failed to fetch tournaments');
      }
    },

    tournament: async (_: any, { id }: { id: string }) => {
      try {
        if (!mongoose.Types.ObjectId.isValid(id)) {
          throw new Error('Invalid tournament ID format');
        }
        const tournament = await Tournament.findById(id);
        if (!tournament) {
          throw new Error('Tournament not found');
        }
        return tournament;
      } catch (error) {
        if (error instanceof Error) {
          throw error;
        }
        throw new Error('Failed to fetch tournament');
      }
    },

    participants: async (_: any, { tournamentId }: { tournamentId: string }) => {
      try {
        if (!mongoose.Types.ObjectId.isValid(tournamentId)) {
          throw new Error('Invalid tournament ID format');
        }
        const tournament = await Tournament.findById(tournamentId);
        if (!tournament) {
          throw new Error('Tournament not found');
        }

        if (tournament.mode === 'singles') {
          // First, check for club tournament registrations
          const registrations = await TournamentRegistration.find({
            tournamentId,
            participantType: 'player'
          });

          if (registrations.length > 0) {
            // Fetch players from registrations
            const playerIds = registrations.map(r => r.participantId);
            const players = await Player.find({ _id: { $in: playerIds } });
            return { participants: players };
          } else {
            // Fall back to traditional player registration (for open tournaments)
            const players = await Player.find({
              mode: 'singles',
              tournamentId: tournamentId
            });
            return { participants: players };
          }
        } else {
          const teams = await Team.find({ tournamentId })
            .populate('player1Id player2Id');
          return { participants: teams };
        }
      } catch (error) {
        console.error('[participants] Error:', error);
        throw new Error(`Failed to fetch participants: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    },
  },

  Mutation: {
    createTournament: async (_: any, { input }: {
      input: {
        name: string;
        mode: 'singles' | 'doubles';
        registrationType: 'open' | 'club_only';
        clubId?: string;
        bracketingMethod?: 'random' | 'manual';
      }
    }, context: any) => {
      const authContext = await getAuthContext(context.req);
      requireAuth(authContext);

      try {
        const { name, mode, registrationType, clubId, bracketingMethod } = input;
        
        if (!name || !mode || !registrationType) {
          throw new Error('Name, mode, and registration type are required');
        }
        
        if (registrationType === 'club_only' && !clubId) {
          throw new Error('Club ID is required for club-only tournaments');
        }
        
        if (clubId) {
          const club = await Club.findById(clubId);
          if (!club) {
            throw new Error('Club not found');
          }

          // Only superadmin or club admin can create club tournaments
          const clubAdminIdStr = club.clubAdminId?.toString();
          const userIdStr = authContext.user!._id.toString();

          if (authContext.user!.role !== 'superadmin' && clubAdminIdStr !== userIdStr) {
            throw new Error('Insufficient permissions to create tournament for this club');
          }
        }
        
        const maxParticipants = mode === 'singles' ? 8 : 16;

        const tournament = new Tournament({
          name,
          mode,
          registrationType,
          clubId: clubId || null,
          maxParticipants,
          bracketingMethod: bracketingMethod || 'random'
        });

        await tournament.save();
        return await Tournament.findById(tournament._id);
      } catch (error) {
        throw new Error(`Failed to create tournament: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    },

    updateTournamentStatus: async (_: any, { id, status }: { id: string; status: string }) => {
      try {
        const tournament = await Tournament.findByIdAndUpdate(
          id,
          { status },
          { new: true }
        );

        if (!tournament) {
          throw new Error('Tournament not found');
        }

        return tournament;
      } catch (error) {
        throw new Error('Failed to update tournament status');
      }
    },

    updateTournamentRegistrationType: async (_: any, { id, registrationType }: { id: string; registrationType: 'open' | 'club_only' }) => {
      try {
        const tournament = await Tournament.findByIdAndUpdate(
          id,
          { registrationType },
          { new: true }
        );

        if (!tournament) {
          throw new Error('Tournament not found');
        }

        return tournament;
      } catch (error) {
        throw new Error('Failed to update tournament registration type');
      }
    },

    deleteTournament: async (_: any, { id }: { id: string }) => {
      try {
        const result = await Tournament.findByIdAndDelete(id);
        return !!result;
      } catch (error) {
        throw new Error('Failed to delete tournament');
      }
    },

    archiveTournament: async (_: any, { id }: { id: string }) => {
      try {
        const tournament = await Tournament.findByIdAndUpdate(
          id,
          { status: 'completed' },
          { new: true }
        );

        if (!tournament) {
          throw new Error('Tournament not found');
        }

        return tournament;
      } catch (error) {
        throw new Error('Failed to archive tournament');
      }
    },

    syncTournamentParticipants: async (_: any, { id }: { id: string }) => {
      try {
        const tournament = await Tournament.findById(id);
        if (!tournament) {
          throw new Error('Tournament not found');
        }

        // Count actual players for this tournament
        const playerCount = await Player.countDocuments({ tournamentId: id });

        // Update the tournament with the correct count
        const updatedTournament = await Tournament.findByIdAndUpdate(
          id,
          { currentParticipants: playerCount },
          { new: true }
        );

        return updatedTournament;
      } catch (error) {
        throw new Error('Failed to sync tournament participants');
      }
    },
  },

  Tournament: {
    club: async (parent: any) => {
      return parent.clubId ? await Club.findById(parent.clubId) : null;
    },
  },

  ParticipantUnion: {
    __resolveType(obj: any) {
      if (obj.player1Id && obj.player2Id) {
        return 'Team';
      }
      return 'Player';
    }
  }
};