import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface IBranch extends Document {
  organizationId: Types.ObjectId;
  chatId: Types.ObjectId;
  name: string;
  baseVersionId?: Types.ObjectId;
  headVersionId?: Types.ObjectId;
  isMerged: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const BranchSchema = new Schema<IBranch>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    chatId: { type: Schema.Types.ObjectId, ref: 'Chat', required: true, index: true },
    name: { type: String, required: true, trim: true },
    baseVersionId: { type: Schema.Types.ObjectId, ref: 'BpmnVersion', default: null },
    headVersionId: { type: Schema.Types.ObjectId, ref: 'BpmnVersion', default: null },
    isMerged: { type: Boolean, default: false },
  },
  { timestamps: true }
);

BranchSchema.index({ organizationId: 1, chatId: 1 });

export const Branch: Model<IBranch> =
  mongoose.models.Branch || mongoose.model<IBranch>('Branch', BranchSchema);
