import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface IDeployedBpmn extends Document {
  organizationId: Types.ObjectId;
  userId: Types.ObjectId;
  chatId: Types.ObjectId;
  branchId: Types.ObjectId;
  versionId: Types.ObjectId;
  deploymentId: string;
  processDefinitionId?: string;
  deployedAt: Date;
}

const DeployedBpmnSchema = new Schema<IDeployedBpmn>({
  organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  chatId: { type: Schema.Types.ObjectId, ref: 'Chat', required: true },
  branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
  versionId: { type: Schema.Types.ObjectId, ref: 'BpmnVersion', required: true },
  deploymentId: { type: String, required: true },
  processDefinitionId: { type: String },
  deployedAt: { type: Date, default: Date.now },
});

DeployedBpmnSchema.index({ organizationId: 1, chatId: 1 });

export const DeployedBpmn: Model<IDeployedBpmn> =
  mongoose.models.DeployedBpmn || mongoose.model<IDeployedBpmn>('DeployedBpmn', DeployedBpmnSchema);
