import { Schema, model, Document } from 'mongoose';

export interface IClubMembership extends Document {
  _id: string;
  clubId: string;
  userId: string;
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: Date;
  approvedAt?: Date;
  rejectedAt?: Date;
  approvedBy?: string; // userId of club admin who approved/rejected
  createdAt: Date;
  updatedAt: Date;
}

const clubMembershipSchema = new Schema<IClubMembership>({
  clubId: {
    type: String,
    required: true,
    ref: 'Club'
  },
  userId: {
    type: String,
    required: true,
    ref: 'User'
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  requestedAt: {
    type: Date,
    default: Date.now
  },
  approvedAt: {
    type: Date,
    default: null
  },
  rejectedAt: {
    type: Date,
    default: null
  },
  approvedBy: {
    type: String,
    ref: 'User',
    default: null
  }
}, {
  timestamps: true
});

// Compound unique index to prevent duplicate membership requests
clubMembershipSchema.index({ clubId: 1, userId: 1 }, { unique: true });

// Other indexes for efficient querying
clubMembershipSchema.index({ clubId: 1, status: 1 });
clubMembershipSchema.index({ userId: 1, status: 1 });
clubMembershipSchema.index({ status: 1, requestedAt: -1 });

export const ClubMembership = model<IClubMembership>('ClubMembership', clubMembershipSchema);