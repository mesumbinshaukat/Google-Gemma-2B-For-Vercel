import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IMessage {
  role: 'user' | 'model';
  content: string;
  timestamp: Date;
}

export interface IChatSession extends Document {
  sessionId: string;
  messages: IMessage[];
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema = new Schema<IMessage>({
  role: {
    type: String,
    enum: ['user', 'model'],
    required: true
  },
  content: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

const ChatSessionSchema = new Schema<IChatSession>(
  {
    sessionId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    messages: [MessageSchema]
  },
  {
    timestamps: true
  }
);

// Prevent model recompilation in development
let ChatSession: Model<IChatSession>;

try {
  ChatSession = mongoose.model<IChatSession>('ChatSession');
} catch {
  ChatSession = mongoose.model<IChatSession>('ChatSession', ChatSessionSchema);
}

export default ChatSession;
