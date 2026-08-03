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
}

export interface INewsArticleDocument extends Omit<INewsArticle, 'id'>, Document {
  numericId: number;
}

const newsSchema = new Schema<INewsArticleDocument>(
  {
    numericId: { type: Number, required: true, unique: true },
    title: { type: String, required: true },
    excerpt: { type: String, required: true },
    content: { type: String, required: true },
    author: { type: String, required: true },
    date: { type: String, required: true },
    category: { type: String, required: true },
    image: { type: String, required: true },
    featured: { type: Boolean, required: true, default: false },
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
