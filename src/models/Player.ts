import { Schema, model, Document } from 'mongoose';

export interface IPlayer extends Document {
  _id: string;
  firstName: string;
  lastName: string;
  gender: 'male' | 'female';
  userId?: string; // Link to authenticated user
  clubId?: string; // Link to club (for club-specific player pools)
  tournamentId?: string;
  teamId?: string;
  mode: 'singles' | 'doubles';
  createdAt: Date;
  updatedAt: Date;
}

const playerSchema = new Schema<IPlayer>({
  firstName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  lastName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  gender: {
    type: String,
    enum: ['male', 'female'],
    required: true
  },
  userId: {
    type: String,
    ref: 'User',
    default: null
  },
  clubId: {
    type: String,
    ref: 'Club',
    default: null
  },
  tournamentId: {
    type: String,
    default: null
  },
  teamId: {
    type: String,
    default: null
  },
  mode: {
    type: String,
    enum: ['singles', 'doubles'],
    required: true
  }
}, {
  timestamps: true
});

playerSchema.index({ firstName: 1, lastName: 1, clubId: 1 });
playerSchema.index({ userId: 1 });
playerSchema.index({ clubId: 1 });

export const Player = model<IPlayer>('Player', playerSchema);