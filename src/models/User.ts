import { Schema, model, Document, Model } from 'mongoose';
import bcrypt from 'bcryptjs';
import { UserRole, ALL_ROLES, getPermissionsForRole } from '../config/permissions';

export interface IUser {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  profileImage?: string;
  memberSince: string;
  isApproved: boolean;
  isActive: boolean;
  church?: string;
  phone?: string;
  dioceseId: string;
  archdeaconryId?: string;
  branchId?: string;
  permissions: string[];
  tokenVersion: number;
  lastLoginAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IUserDocument extends Omit<IUser, 'id'>, Document {
  comparePassword(candidatePassword: string): Promise<boolean>;
}

export interface IUserModel extends Model<IUserDocument> {}

const userSchema = new Schema<IUserDocument, IUserModel>(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    password: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: ALL_ROLES,
      required: true,
      default: 'youth',
      index: true,
    },
    profileImage: { type: String, default: '' },
    memberSince: { type: String, required: true },
    isApproved: { type: Boolean, required: true, default: false },
    isActive: { type: Boolean, required: true, default: true },
    church: { type: String, default: '' },
    phone: { type: String, default: '' },
    dioceseId: { type: String, default: 'accra', index: true },
    archdeaconryId: { type: String, default: '', index: true },
    branchId: { type: String, default: '', index: true },
    permissions: { type: [String], default: [] },
    tokenVersion: { type: Number, default: 0 },
    lastLoginAt: { type: Date },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, any>) {
        ret.id = ret._id ? ret._id.toString() : ret.id;
        delete ret._id;
        delete ret.__v;
        delete ret.password;
        return ret;
      },
    },
  }
);

// Pre-save hook to hash password if modified and compute default permissions
userSchema.pre('save', async function () {
  if (this.isModified('role') || this.isNew) {
    if (!this.permissions || this.permissions.length === 0) {
      this.permissions = getPermissionsForRole(this.role);
    }
  }

  if (!this.isModified('password') || !this.password) {
    return;
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Method to compare entered password with hashed password
userSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  if (!this.password) {
    return false;
  }
  return bcrypt.compare(candidatePassword, this.password);
};

export const UserModel = model<IUserDocument, IUserModel>('User', userSchema);
