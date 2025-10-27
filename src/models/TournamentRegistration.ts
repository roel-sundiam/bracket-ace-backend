import { Schema, model, Document } from 'mongoose';

export interface ITournamentRegistration extends Document {
  _id: string;
  tournamentId: string;
  clubId: string;
  participantId: string; // playerId or teamId
  participantType: 'player' | 'team';
  selectedByClubAdmin: boolean;
  selectedAt?: Date;
  registeredAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const tournamentRegistrationSchema = new Schema<ITournamentRegistration>({
  tournamentId: {
    type: String,
    required: true,
    ref: 'Tournament'
  },
  clubId: {
    type: String,
    required: true,
    ref: 'Club'
  },
  participantId: {
    type: String,
    required: true
  },
  participantType: {
    type: String,
    enum: ['player', 'team'],
    required: true
  },
  selectedByClubAdmin: {
    type: Boolean,
    default: false
  },
  selectedAt: {
    type: Date,
    default: null
  },
  registeredAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Compound unique index to prevent duplicate registrations
tournamentRegistrationSchema.index({ tournamentId: 1, participantId: 1 }, { unique: true });

// Other indexes for efficient querying
tournamentRegistrationSchema.index({ tournamentId: 1, clubId: 1 });
tournamentRegistrationSchema.index({ clubId: 1, selectedByClubAdmin: 1 });
tournamentRegistrationSchema.index({ tournamentId: 1, selectedByClubAdmin: 1 });

export const TournamentRegistration = model<ITournamentRegistration>('TournamentRegistration', tournamentRegistrationSchema);