import mongoose, { Schema, Document, Model, Types } from 'mongoose';
import { Role } from '@/types';

export interface IUser extends Document {
  username: string;
  passwordHash: string;
  organizationId: Types.ObjectId;
  role: Role;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    username: { type: String, required: true, unique: true, trim: true, lowercase: true },
    passwordHash: { type: String, required: true },
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    role: { type: String, enum: Object.values(Role), default: Role.VIEWER },
  },
  { timestamps: true }
);

UserSchema.index({ organizationId: 1, username: 1 });

export const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
