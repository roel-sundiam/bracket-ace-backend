import { Club } from '../../models/Club';
import { User } from '../../models/User';
import { ClubMembership } from '../../models/ClubMembership';
import { ClubRequest } from '../../models/ClubRequest';
import { TournamentRegistration } from '../../models/TournamentRegistration';
import { Player } from '../../models/Player';
import { getAuthContext, requireAuth, requireSuperAdmin, requireClubAdmin } from '../../utils/auth';

export const clubResolvers = {
  Query: {
    clubs: async () => {
      try {
        return await Club.find({ isActive: true })
          .populate('clubAdminId')
          .sort({ createdAt: -1 });
      } catch (error) {
        throw new Error('Failed to fetch clubs');
      }
    },

    club: async (_: any, { id }: { id: string }) => {
      try {
        const club = await Club.findById(id).populate('clubAdminId');
        if (!club) {
          throw new Error('Club not found');
        }
        return club;
      } catch (error) {
        throw new Error('Failed to fetch club');
      }
    },

    myClubs: async (_: any, __: any, context: any) => {
      const authContext = await getAuthContext(context.req);
      const user = requireAuth(authContext);

      console.log('[myClubs] User:', user.email, 'Role:', user.role, 'ID:', user._id);

      try {
        if (user.role === 'club_admin' || user.role === 'superadmin') {
          const clubs = await Club.find({ clubAdminId: user._id, isActive: true })
            .populate('clubAdminId');
          console.log('[myClubs] Found', clubs.length, 'clubs for club_admin/superadmin');
          return clubs;
        } else {
          const memberships = await ClubMembership.find({
            userId: user._id,
            status: 'approved'
          }).populate('clubId');

          console.log('[myClubs] Found', memberships.length, 'memberships for member');
          return memberships.map(membership => membership.clubId);
        }
      } catch (error) {
        console.error('[myClubs] Error:', error);
        throw new Error('Failed to fetch user clubs');
      }
    },

    clubMembers: async (_: any, { clubId }: { clubId: string }, context: any) => {
      const authContext = await getAuthContext(context.req);
      const user = requireAuth(authContext);
      
      try {
        const club = await Club.findById(clubId);
        if (!club) {
          throw new Error('Club not found');
        }
        
        // Only club admin can view all members
        if (user.role !== 'superadmin' && club.clubAdminId !== user._id) {
          throw new Error('Insufficient permissions');
        }
        
        return await ClubMembership.find({ 
          clubId, 
          status: 'approved' 
        })
        .populate('userId')
        .populate('clubId')
        .sort({ createdAt: -1 });
      } catch (error) {
        throw new Error('Failed to fetch club members');
      }
    },

    clubMembershipRequests: async (_: any, { clubId }: { clubId: string }, context: any) => {
      const authContext = await getAuthContext(context.req);
      const user = requireAuth(authContext);
      
      try {
        const club = await Club.findById(clubId);
        if (!club) {
          throw new Error('Club not found');
        }
        
        // Only club admin can view membership requests
        if (user.role !== 'superadmin' && club.clubAdminId !== user._id) {
          throw new Error('Insufficient permissions');
        }
        
        return await ClubMembership.find({ 
          clubId, 
          status: 'pending' 
        })
        .populate('userId')
        .populate('clubId')
        .sort({ requestedAt: -1 });
      } catch (error) {
        throw new Error('Failed to fetch membership requests');
      }
    },

    tournamentRegistrations: async (_: any, { tournamentId }: { tournamentId: string }, context: any) => {
      const authContext = await getAuthContext(context.req);
      const user = requireAuth(authContext);

      try {
        return await TournamentRegistration.find({ tournamentId })
          .populate('tournamentId')
          .populate('clubId')
          .sort({ registeredAt: -1 });
      } catch (error) {
        throw new Error('Failed to fetch tournament registrations');
      }
    },

    clubRequests: async (_: any, __: any, context: any) => {
      const authContext = await getAuthContext(context.req);
      requireSuperAdmin(authContext);

      try {
        return await ClubRequest.find()
          .sort({ createdAt: -1 });
      } catch (error) {
        throw new Error('Failed to fetch club requests');
      }
    },

    myClubRequests: async (_: any, __: any, context: any) => {
      const authContext = await getAuthContext(context.req);
      const user = requireAuth(authContext);

      try {
        return await ClubRequest.find({ requestedBy: user._id })
          .sort({ createdAt: -1 });
      } catch (error) {
        throw new Error('Failed to fetch your club requests');
      }
    },
  },

  Mutation: {
    createClub: async (_: any, { input }: { 
      input: { 
        name: string; 
        description?: string; 
        clubAdminEmail: string; 
      } 
    }, context: any) => {
      const authContext = await getAuthContext(context.req);
      requireSuperAdmin(authContext);
      
      try {
        const { name, description, clubAdminEmail } = input;
        
        if (!name || !clubAdminEmail) {
          throw new Error('Club name and admin email are required');
        }
        
        const existingClub = await Club.findOne({ name });
        if (existingClub) {
          throw new Error('Club with this name already exists');
        }
        
        const clubAdmin = await User.findOne({ 
          email: clubAdminEmail.toLowerCase() 
        });
        if (!clubAdmin) {
          throw new Error('Club admin user not found');
        }
        
        // Update user role to club_admin
        clubAdmin.role = 'club_admin';
        await clubAdmin.save();
        
        const club = new Club({
          name,
          description: description || '',
          clubAdminId: clubAdmin._id
        });
        
        await club.save();
        
        return await Club.findById(club._id).populate('clubAdminId');
      } catch (error) {
        throw new Error(`Failed to create club: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    },

    requestClubMembership: async (_: any, { clubId }: { clubId: string }, context: any) => {
      const authContext = await getAuthContext(context.req);
      const user = requireAuth(authContext);
      
      try {
        const club = await Club.findById(clubId);
        if (!club || !club.isActive) {
          throw new Error('Club not found or inactive');
        }
        
        const existingMembership = await ClubMembership.findOne({
          clubId,
          userId: user._id
        });
        
        if (existingMembership) {
          throw new Error(`Membership request already exists with status: ${existingMembership.status}`);
        }
        
        const membership = new ClubMembership({
          clubId,
          userId: user._id,
          status: 'pending'
        });
        
        await membership.save();
        
        return await ClubMembership.findById(membership._id)
          .populate('userId')
          .populate('clubId');
      } catch (error) {
        throw new Error(`Failed to request membership: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    },

    approveClubMembership: async (_: any, { membershipId }: { membershipId: string }, context: any) => {
      const authContext = await getAuthContext(context.req);
      const user = requireAuth(authContext);
      
      try {
        const membership = await ClubMembership.findById(membershipId)
          .populate('clubId');
        
        if (!membership) {
          throw new Error('Membership request not found');
        }
        
        const club = membership.clubId as any;
        if (user.role !== 'superadmin' && club.clubAdminId !== user._id) {
          throw new Error('Insufficient permissions');
        }
        
        if (membership.status !== 'pending') {
          throw new Error('Membership request has already been processed');
        }
        
        membership.status = 'approved';
        membership.approvedAt = new Date();
        membership.approvedBy = user._id;
        
        await membership.save();
        
        return await ClubMembership.findById(membership._id)
          .populate('userId')
          .populate('clubId')
          .populate('approvedBy');
      } catch (error) {
        throw new Error(`Failed to approve membership: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    },

    rejectClubMembership: async (_: any, { membershipId }: { membershipId: string }, context: any) => {
      const authContext = await getAuthContext(context.req);
      const user = requireAuth(authContext);
      
      try {
        const membership = await ClubMembership.findById(membershipId)
          .populate('clubId');
        
        if (!membership) {
          throw new Error('Membership request not found');
        }
        
        const club = membership.clubId as any;
        if (user.role !== 'superadmin' && club.clubAdminId !== user._id) {
          throw new Error('Insufficient permissions');
        }
        
        if (membership.status !== 'pending') {
          throw new Error('Membership request has already been processed');
        }
        
        membership.status = 'rejected';
        membership.rejectedAt = new Date();
        membership.approvedBy = user._id;
        
        await membership.save();
        
        return await ClubMembership.findById(membership._id)
          .populate('userId')
          .populate('clubId')
          .populate('approvedBy');
      } catch (error) {
        throw new Error(`Failed to reject membership: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    },

    selectPlayerForTournament: async (_: any, { tournamentId, playerId }: {
      tournamentId: string;
      playerId: string;
    }, context: any) => {
      const authContext = await getAuthContext(context.req);
      const user = requireClubAdmin(authContext);

      try {
        const player = await Player.findById(playerId).populate('clubId');
        if (!player) {
          throw new Error('Player not found');
        }

        let clubId;

        // Check if player has a direct club association (manually added club players)
        if (player.clubId) {
          const club = player.clubId as any;
          clubId = club._id;

          // Verify the club admin owns this club
          if (user.role !== 'superadmin' && club.clubAdminId.toString() !== user._id.toString()) {
            throw new Error('Player is not in your club');
          }
        }
        // Otherwise check if player has a userId and is a club member
        else if (player.userId) {
          const membership = await ClubMembership.findOne({
            userId: player.userId,
            status: 'approved'
          }).populate('clubId');

          if (!membership) {
            throw new Error('Player is not a club member');
          }

          const club = membership.clubId as any;
          clubId = club._id;

          if (user.role !== 'superadmin' && club.clubAdminId.toString() !== user._id.toString()) {
            throw new Error('Player is not in your club');
          }
        } else {
          throw new Error('Player is not associated with any club');
        }

        const existingRegistration = await TournamentRegistration.findOne({
          tournamentId,
          participantId: playerId
        });

        if (existingRegistration) {
          // If already selected by club admin, just return the existing registration
          // This allows the UI to be idempotent
          if (existingRegistration.selectedByClubAdmin) {
            return await TournamentRegistration.findById(existingRegistration._id)
              .populate('tournamentId')
              .populate('clubId');
          } else {
            existingRegistration.selectedByClubAdmin = true;
            existingRegistration.selectedAt = new Date();
            await existingRegistration.save();
            return await TournamentRegistration.findById(existingRegistration._id)
              .populate('tournamentId')
              .populate('clubId');
          }
        }

        const registration = new TournamentRegistration({
          tournamentId,
          clubId,
          participantId: playerId,
          participantType: 'player',
          selectedByClubAdmin: true,
          selectedAt: new Date()
        });

        await registration.save();

        return await TournamentRegistration.findById(registration._id)
          .populate('tournamentId')
          .populate('clubId');
      } catch (error) {
        throw new Error(`Failed to select player: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    },

    removePlayerFromTournament: async (_: any, { tournamentId, playerId }: {
      tournamentId: string;
      playerId: string;
    }, context: any) => {
      const authContext = await getAuthContext(context.req);
      const user = requireClubAdmin(authContext);

      try {
        const registration = await TournamentRegistration.findOne({
          tournamentId,
          participantId: playerId
        }).populate('clubId');

        if (!registration) {
          throw new Error('Registration not found');
        }

        const club = registration.clubId as any;
        console.log('[removePlayerFromTournament] User role:', user.role);
        console.log('[removePlayerFromTournament] Club admin ID:', club.clubAdminId?.toString());
        console.log('[removePlayerFromTournament] User ID:', user._id?.toString());

        if (user.role !== 'superadmin' && club.clubAdminId.toString() !== user._id.toString()) {
          throw new Error('Insufficient permissions');
        }

        await TournamentRegistration.findByIdAndDelete(registration._id);
        return true;
      } catch (error) {
        throw new Error(`Failed to remove player: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    },

    requestClubCreation: async (_: any, { input }: {
      input: {
        name: string;
        description?: string;
      }
    }, context: any) => {
      const authContext = await getAuthContext(context.req);
      const user = requireAuth(authContext);

      try {
        const { name, description } = input;

        if (!name) {
          throw new Error('Club name is required');
        }

        // Check if club with same name already exists
        const existingClub = await Club.findOne({ name });
        if (existingClub) {
          throw new Error('A club with this name already exists');
        }

        // Check if user already has a pending request with same name
        const existingRequest = await ClubRequest.findOne({
          requestedBy: user._id,
          name,
          status: 'pending'
        });
        if (existingRequest) {
          throw new Error('You already have a pending request for a club with this name');
        }

        const clubRequest = new ClubRequest({
          name,
          description: description || '',
          requestedBy: user._id,
          status: 'pending'
        });

        await clubRequest.save();

        return await ClubRequest.findById(clubRequest._id);
      } catch (error) {
        throw new Error(`Failed to request club creation: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    },

    approveClubRequest: async (_: any, { requestId }: { requestId: string }, context: any) => {
      const authContext = await getAuthContext(context.req);
      const admin = requireSuperAdmin(authContext);

      try {
        const clubRequest = await ClubRequest.findById(requestId);

        if (!clubRequest) {
          throw new Error('Club request not found');
        }

        if (clubRequest.status !== 'pending') {
          throw new Error('This request has already been processed');
        }

        // Check if club name is still available
        const existingClub = await Club.findOne({ name: clubRequest.name });
        if (existingClub) {
          throw new Error('A club with this name already exists');
        }

        const requesterId = clubRequest.requestedBy;

        // Update user role to club_admin
        await User.findByIdAndUpdate(requesterId, { role: 'club_admin' });

        // Create the club
        const club = new Club({
          name: clubRequest.name,
          description: clubRequest.description || '',
          clubAdminId: requesterId
        });

        await club.save();

        // Update the request status
        clubRequest.status = 'approved';
        clubRequest.reviewedBy = admin._id;
        clubRequest.reviewedAt = new Date();
        await clubRequest.save();

        return await Club.findById(club._id).populate('clubAdminId');
      } catch (error) {
        throw new Error(`Failed to approve club request: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    },

    rejectClubRequest: async (_: any, { requestId, reason }: {
      requestId: string;
      reason?: string;
    }, context: any) => {
      const authContext = await getAuthContext(context.req);
      const admin = requireSuperAdmin(authContext);

      try {
        const clubRequest = await ClubRequest.findById(requestId);

        if (!clubRequest) {
          throw new Error('Club request not found');
        }

        if (clubRequest.status !== 'pending') {
          throw new Error('This request has already been processed');
        }

        clubRequest.status = 'rejected';
        clubRequest.reviewedBy = admin._id;
        clubRequest.reviewedAt = new Date();
        clubRequest.rejectionReason = reason || '';

        await clubRequest.save();

        return await ClubRequest.findById(clubRequest._id);
      } catch (error) {
        throw new Error(`Failed to reject club request: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    },
  },

  // Type resolvers for populated fields
  Club: {
    clubAdmin: async (parent: any) => {
      return await User.findById(parent.clubAdminId);
    },
    memberCount: async (parent: any) => {
      return await ClubMembership.countDocuments({ 
        clubId: parent._id, 
        status: 'approved' 
      });
    },
  },

  ClubMembership: {
    club: async (parent: any) => {
      return await Club.findById(parent.clubId);
    },
    user: async (parent: any) => {
      return await User.findById(parent.userId);
    },
    approvedBy: async (parent: any) => {
      return parent.approvedBy ? await User.findById(parent.approvedBy) : null;
    },
  },

  TournamentRegistration: {
    tournament: async (parent: any) => {
      const Tournament = require('../../models/Tournament').Tournament;
      return await Tournament.findById(parent.tournamentId);
    },
    club: async (parent: any) => {
      return await Club.findById(parent.clubId);
    },
  },

  ClubRequest: {
    requestedBy: async (parent: any) => {
      return await User.findById(parent.requestedBy);
    },
    reviewedBy: async (parent: any) => {
      return parent.reviewedBy ? await User.findById(parent.reviewedBy) : null;
    },
  },
};