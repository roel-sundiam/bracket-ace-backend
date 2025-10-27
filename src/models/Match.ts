import { Schema, model, Document } from 'mongoose';

export interface IMatch extends Document {
  _id: string;
  tournamentId: string;
  round: number; // 1 = QF, 2 = SF, 3 = Final
  bracketType: 'winners' | 'losers';
  participant1: string; // playerId or teamId
  participant2: string; // playerId or teamId
  winner?: string; // participant id
  loser?: string; // participant id
  score?: {
    participant1Score: number; // Games won
    participant2Score: number; // Games won
    participant1Points?: number; // Points in current game (0, 15, 30, 40)
    participant2Points?: number; // Points in current game (0, 15, 30, 40)
  };
  completed: boolean;
  scheduledDate?: Date; // For quick tournaments scheduling
  scheduledTime?: string; // HH:MM format
  createdAt: Date;
  updatedAt: Date;
}

const matchSchema = new Schema<IMatch>({
  tournamentId: {
    type: String,
    required: true
  },
  round: {
    type: Number,
    required: true,
    min: 1,
    max: 3
  },
  bracketType: {
    type: String,
    enum: ['winners', 'losers'],
    required: true
  },
  participant1: {
    type: String,
    required: true
  },
  participant2: {
    type: String,
    required: true
  },
  winner: {
    type: String,
    default: null
  },
  loser: {
    type: String,
    default: null
  },
  score: {
    participant1Score: {
      type: Number,
      min: 0,
      max: 10,
      default: 0
    },
    participant2Score: {
      type: Number,
      min: 0,
      max: 10,
      default: 0
    },
    participant1Points: {
      type: Number,
      min: 0,
      max: 40,
      default: 0
    },
    participant2Points: {
      type: Number,
      min: 0,
      max: 40,
      default: 0
    }
  },
  completed: {
    type: Boolean,
    default: false
  },
  scheduledDate: {
    type: Date,
    default: null
  },
  scheduledTime: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

matchSchema.index({ tournamentId: 1, round: 1, bracketType: 1 });

export const Match = model<IMatch>('Match', matchSchema);