import { Schema, model, Document } from 'mongoose';

export interface ITeam extends Document {
  _id: string;
  name: string;
  player1Id: string;
  player2Id: string;
  tournamentId: string;
  createdAt: Date;
  updatedAt: Date;
}

const teamSchema = new Schema<ITeam>({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  player1Id: {
    type: String,
    required: true
  },
  player2Id: {
    type: String,
    required: true
  },
  tournamentId: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});

teamSchema.index({ tournamentId: 1 });
teamSchema.index({ player1Id: 1, player2Id: 1 }, { unique: true });

export const Team = model<ITeam>('Team', teamSchema);