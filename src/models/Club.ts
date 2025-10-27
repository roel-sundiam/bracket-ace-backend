import { Schema, model, Document } from 'mongoose';

export interface IClub extends Document {
  _id: string;
  name: string;
  description?: string;
  clubAdminId: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const clubSchema = new Schema<IClub>({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200,
    unique: true
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500,
    default: ''
  },
  clubAdminId: {
    type: String,
    required: true,
    ref: 'User'
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes
clubSchema.index({ name: 1 });
clubSchema.index({ clubAdminId: 1 });
clubSchema.index({ isActive: 1, createdAt: -1 });

export const Club = model<IClub>('Club', clubSchema);