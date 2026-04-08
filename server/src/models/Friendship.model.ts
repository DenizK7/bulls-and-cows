import mongoose, { Schema, type Document, type Types } from 'mongoose';

export interface IFriendship extends Document {
  requesterId: Types.ObjectId;
  recipientId: Types.ObjectId;
  status: 'pending' | 'accepted' | 'blocked';
  createdAt: Date;
  updatedAt: Date;
}

const friendshipSchema = new Schema<IFriendship>(
  {
    requesterId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    recipientId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ['pending', 'accepted', 'blocked'], default: 'pending' },
  },
  { timestamps: true },
);

friendshipSchema.index({ requesterId: 1, recipientId: 1 }, { unique: true });
friendshipSchema.index({ recipientId: 1, status: 1 });

export const Friendship = mongoose.model<IFriendship>('Friendship', friendshipSchema);
