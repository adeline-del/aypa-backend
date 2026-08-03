import { Request, Response } from 'express';
import { ContactMessageModel, IContactMessage } from '../models/Contact';
import { config } from '../config/env';

let inMemoryMessages: IContactMessage[] = [];

export const submitContactForm = async (req: Request, res: Response): Promise<void> => {
  const { name, email, subject, message } = req.body;

  if (config.useInMemoryMock) {
    const newMessage: IContactMessage = {
      id: Date.now().toString(),
      name,
      email,
      subject,
      message,
      createdAt: new Date().toISOString(),
    };
    inMemoryMessages.push(newMessage);

    res.status(201).json({
      success: true,
      message: "Thank you for your message! We'll get back to you soon.",
      data: newMessage,
    });
    return;
  }

  const messageDoc = await ContactMessageModel.create({
    name,
    email,
    subject,
    message,
    createdAt: new Date().toISOString(),
  });

  res.status(201).json({
    success: true,
    message: "Thank you for your message! We'll get back to you soon.",
    data: messageDoc,
  });
};

export const getContactMessages = async (_req: Request, res: Response): Promise<void> => {
  if (config.useInMemoryMock) {
    res.status(200).json({ success: true, count: inMemoryMessages.length, data: inMemoryMessages });
    return;
  }

  const messages = await ContactMessageModel.find().sort({ createdAt: -1 });
  res.status(200).json({ success: true, count: messages.length, data: messages });
};
