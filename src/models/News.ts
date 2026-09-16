import { Schema, model, Document } from 'mongoose';

export interface INewsArticle {
  id: number;
  title: string;
  excerpt: string;
  content: string;
  author: string;
  date: string;
  category: string;
  image: string;
  featured: boolean;
  state?: 'draft' | 'needs_review' | 'scheduled' | 'published';
}

export interface INewsArticleDocument extends Omit<INewsArticle, 'id'>, Document {
  numericId: number;
}

const newsSchema = new Schema<INewsArticleDocument>(
  {
    numericId: { type: Number, required: true, unique: true },
    title: { type: String, required: true },
    excerpt: { type: String, required: false, default: '' },
    content: { type: String, required: false, default: '' },
    author: { type: String, required: true, default: 'AYPA Secretariat' },
    date: { type: String, required: true },
    category: { type: String, required: true, default: 'News' },
    image: { type: String, required: false, default: '' },
    featured: { type: Boolean, required: true, default: false },
    state: { type: String, required: true, default: 'published' },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, any>) {
        ret.id = ret.numericId;
        delete ret.numericId;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);


export const NewsModel = model<INewsArticleDocument>('News', newsSchema);
