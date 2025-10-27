import { Schema, model, Document } from 'mongoose';

export interface IBracketAssignment extends Document {
  _id: string;
  tournamentId: string;
  participantId: string; // playerId or teamId
  bracketType: 'winners' | 'losers';
  seed: number; // 1-8 within their bracket
  createdAt: Date;
  updatedAt: Date;
}

const bracketAssignmentSchema = new Schema<IBracketAssignment>({
  tournamentId: {
    type: String,
    required: true,
    ref: 'Tournament'
  },
  participantId: {
    type: String,
    required: true
  },
  bracketType: {
    type: String,
    enum: ['winners', 'losers'],
    required: true
  },
  seed: {
    type: Number,
    required: true,
    min: 1,
    max: 8
  }
}, {
  timestamps: true
});

// Ensure unique assignments (one participant can only be in one bracket with one seed)
bracketAssignmentSchema.index({ tournamentId: 1, participantId: 1 }, { unique: true });
// Ensure unique seeds within bracket (can't have two seed 1s in winners bracket)
bracketAssignmentSchema.index({ tournamentId: 1, bracketType: 1, seed: 1 }, { unique: true });

export const BracketAssignment = model<IBracketAssignment>('BracketAssignment', bracketAssignmentSchema);
