import { Schema, model, Document } from 'mongoose';

export type ReportStatus = 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected';

export interface IReport {
  id: string;
  title: string;
  reportingPeriod: string;
  branchId: string;
  archdeaconryId: string;
  dioceseId: string;
  submittedBy: string;
  status: ReportStatus;
  summary: string;
  activities?: string;
  attendance?: number;
  achievements?: string;
  challenges?: string;
  recommendations?: string;
  reviewedBy?: string;
  reviewComment?: string;
  reviewedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IReportDocument extends Omit<IReport, 'id'>, Document {}

const reportSchema = new Schema<IReportDocument>(
  {
    title: { type: String, required: true, trim: true },
    reportingPeriod: { type: String, required: true, trim: true, index: true },
    branchId: { type: String, required: true, index: true },
    archdeaconryId: { type: String, required: true, index: true },
    dioceseId: { type: String, required: true, default: 'accra', index: true },
    submittedBy: { type: String, required: true, index: true },
    status: {
      type: String,
      enum: ['draft', 'submitted', 'under_review', 'approved', 'rejected'],
      required: true,
      default: 'draft',
      index: true,
    },
    summary: { type: String, required: true },
    activities: { type: String, default: '' },
    attendance: { type: Number, default: 0 },
    achievements: { type: String, default: '' },
    challenges: { type: String, default: '' },
    recommendations: { type: String, default: '' },
    reviewedBy: { type: String, default: '' },
    reviewComment: { type: String, default: '' },
    reviewedAt: { type: Date },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, any>) {
        ret.id = ret._id ? ret._id.toString() : ret.id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

export const ReportModel = model<IReportDocument>('Report', reportSchema);
