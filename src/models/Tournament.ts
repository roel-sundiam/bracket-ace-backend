import { Schema, model, Document } from 'mongoose';

export interface IBracketState {
  winners: string[]; // Array of match IDs
  losers: string[]; // Array of match IDs
}

export interface IScheduleConfig {
  groupAScheduleTimes?: string[]; // Array of HH:MM times for Group A matches
  groupBScheduleTimes?: string[]; // Array of HH:MM times for Group B matches
  scheduleDate?: Date; // Date for scheduled matches
}

export interface ITournament extends Document {
  _id: string;
  name: string;
  mode: 'singles' | 'doubles';
  status: 'registration' | 'in-progress' | 'completed';
  registrationType: 'open' | 'club_only';
  clubId?: string; // For club-only tournaments
  maxParticipants: number; // 8 for singles, 16 for doubles
  currentParticipants: number;
  bracketState: IBracketState;
  bracketingMethod: 'random' | 'manual'; // How to assign participants to brackets
  seedingCompleted: boolean; // Track if manual seeding is done
  winnersChampion?: string; // playerId or teamId
  consolationChampion?: string; // playerId or teamId
  groupA?: string[]; // For quick tournament round robin groups
  groupB?: string[]; // For quick tournament round robin groups
  scheduleConfig?: IScheduleConfig; // Schedule configuration
  createdAt: Date;
  updatedAt: Date;
}

const bracketStateSchema = new Schema<IBracketState>({
  winners: [{
    type: String
  }],
  losers: [{
    type: String
  }]
}, { _id: false });

const scheduleConfigSchema = new Schema<IScheduleConfig>({
  groupAScheduleTimes: [{
    type: String
  }],
  groupBScheduleTimes: [{
    type: String
  }],
  scheduleDate: {
    type: Date,
    default: null
  }
}, { _id: false });

const tournamentSchema = new Schema<ITournament>({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  mode: {
    type: String,
    enum: ['singles', 'doubles'],
    required: true
  },
  status: {
    type: String,
    enum: ['registration', 'in-progress', 'completed'],
    default: 'registration'
  },
  registrationType: {
    type: String,
    enum: ['open', 'club_only'],
    default: 'open'
  },
  clubId: {
    type: String,
    ref: 'Club',
    default: null
  },
  maxParticipants: {
    type: Number,
    required: true,
    validate: {
      validator: function(this: ITournament, v: number) {
        return (this.mode === 'singles' && v === 8) || (this.mode === 'doubles' && v === 16);
      },
      message: 'Max participants must be 8 for singles or 16 for doubles'
    }
  },
  currentParticipants: {
    type: Number,
    default: 0,
    min: 0
  },
  bracketState: {
    type: bracketStateSchema,
    default: () => ({ winners: [], losers: [] })
  },
  bracketingMethod: {
    type: String,
    enum: ['random', 'manual'],
    default: 'random'
  },
  seedingCompleted: {
    type: Boolean,
    default: false
  },
  winnersChampion: {
    type: String,
    default: null
  },
  consolationChampion: {
    type: String,
    default: null
  },
  groupA: {
    type: [String],
    default: []
  },
  groupB: {
    type: [String],
    default: []
  },
  scheduleConfig: {
    type: scheduleConfigSchema,
    default: null
  }
}, {
  timestamps: true
});

tournamentSchema.index({ status: 1, createdAt: -1 });
tournamentSchema.index({ registrationType: 1, clubId: 1 });

export const Tournament = model<ITournament>('Tournament', tournamentSchema);