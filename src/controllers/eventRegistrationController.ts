import type { Request, Response } from 'express';

import { EventRegistrationModel } from '../models/EventRegistration';
import { EventModel } from '../models/Event';
import { config } from '../config/env';

export const registerForEvent = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const eventId = Number(req.params.eventId);

  const {
    fullName,
    email,
    phone,
    archdeaconry,
    parish,
    age,
  } = req.body;

  if (config.useInMemoryMock) {
    res.status(201).json({
      success: true,
      message: 'Registration successful.',
      data: {
        eventId,
        fullName,
        email,
        phone,
        archdeaconry,
        parish,
        age,
      },
    });

    return;
  }

  const event = await EventModel.findOne({
    id: eventId,
  });

  if (!event) {
    res.status(404).json({
      success: false,
      message: 'Event not found.',
    });

    return;
  }

  if (event.registered >= event.capacity) {
    res.status(409).json({
      success: false,
      message: 'This event is full.',
    });

    return;
  }

  const existingRegistration =
    await EventRegistrationModel.findOne({
      eventId,
      email: email.toLowerCase(),
    });

  if (existingRegistration) {
    res.status(409).json({
      success: false,
      message:
        'This email address is already registered for this event.',
    });

    return;
  }

  const registration =
    await EventRegistrationModel.create({
      eventId,
      fullName,
      email,
      phone,
      archdeaconry,
      parish,
      age,
    });

  event.registered += 1;

  await event.save();

  res.status(201).json({
    success: true,
    message: 'Registration successful.',
    data: {
      eventId: registration.eventId,
      fullName: registration.fullName,
      email: registration.email,
      phone: registration.phone,
      archdeaconry: registration.archdeaconry,
      parish: registration.parish,
      age: registration.age,
    },
  });
};