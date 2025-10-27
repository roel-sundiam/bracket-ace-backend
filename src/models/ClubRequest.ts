import { Schema, model, Document } from 'mongoose';

export interface IClubRequest extends Document {
  _id: string;
  name: string;
  description?: string;
  requestedBy: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy?: string;
  reviewedAt?: Date;
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const clubRequestSchema = new Schema<IClubRequest>({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500,
    default: ''
  },
  requestedBy: {
    type: String,
    required: true,
    ref: 'User'
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  reviewedBy: {
    type: String,
    ref: 'User',
    default: null
  },
  reviewedAt: {
    type: Date,
    default: null
  },
  rejectionReason: {
    type: String,
    trim: true,
    maxlength: 500,
    default: null
  }
}, {
  timestamps: true
});

// Indexes
clubRequestSchema.index({ requestedBy: 1, status: 1 });
clubRequestSchema.index({ status: 1, createdAt: -1 });
clubRequestSchema.index({ name: 1 });

export const ClubRequest = model<IClubRequest>('ClubRequest', clubRequestSchema);
