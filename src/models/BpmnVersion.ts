import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface IBpmnVersion extends Document {
  organizationId: Types.ObjectId;
  userId: Types.ObjectId;
  chatId: Types.ObjectId;
  branchId: Types.ObjectId;
  parentVersionId?: Types.ObjectId;
  versionNumber: number;
  prompt: string;
  encryptedXml: string;
  iv: string;
  createdAt: Date;
}

const BpmnVersionSchema = new Schema<IBpmnVersion>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    chatId: { type: Schema.Types.ObjectId, ref: 'Chat', required: true, index: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true, index: true },
    parentVersionId: { type: Schema.Types.ObjectId, ref: 'BpmnVersion', default: null },
    versionNumber: { type: Number, required: true },
    prompt: { type: String, required: true },
    encryptedXml: { type: String, required: true },
    iv: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

BpmnVersionSchema.index({ organizationId: 1, branchId: 1, versionNumber: 1 });

export const BpmnVersion: Model<IBpmnVersion> =
  mongoose.models.BpmnVersion || mongoose.model<IBpmnVersion>('BpmnVersion', BpmnVersionSchema);
