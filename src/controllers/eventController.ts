import { Request, Response } from 'express';
import { EventModel, IEvent } from '../models/Event';
import { EventRegistrationModel } from '../models/EventRegistration';
import { config } from '../config/env';
import { ApiError } from '../utils/ApiError';

let inMemoryEvents: IEvent[] = [
  {
    id: 1,
    title: 'Sunday Morning Worship',
    description: 'Join us for our weekly worship service with inspiring messages and uplifting music.',
    date: '2024-01-14',
    time: '10:00 AM',
    location: 'Main Sanctuary',
    category: 'Worship',
    capacity: 200,
    registered: 145,
    isLive: true,
    streamUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    image: 'https://res.cloudinary.com/dxxmqm9vw/image/upload/v1775140329/2_mjwkin.jpg',
  },
  {
    id: 2,
    title: 'Youth Bible Study',
    description: "Deep dive into scripture with fellow young believers. Discover God's word together.",
    date: '2024-01-16',
    time: '7:00 PM',
    location: 'Youth Hall',
    category: 'Study',
    capacity: 50,
    registered: 32,
    isLive: false,
    image: 'https://res.cloudinary.com/dxxmqm9vw/image/upload/v1775140330/3_uph0zl.jpg',
  },
  {
    id: 3,
    title: 'Community Service Day',
    description: 'Serve our local community through various outreach programs and volunteer activities.',
    date: '2024-01-20',
    time: '9:00 AM',
    location: 'Community Center',
    category: 'Service',
    capacity: 100,
    registered: 67,
    isLive: false,
    image: 'https://res.cloudinary.com/dxxmqm9vw/image/upload/v1775140330/4_yxalfa.jpg',
  },
  {
    id: 4,
    title: 'Leadership Workshop',
    description: 'Develop your leadership skills and learn how to make a positive impact in your community.',
    date: '2024-01-25',
    time: '2:00 PM',
    location: 'Conference Room',
    category: 'Leadership',
    capacity: 30,
    registered: 18,
    isLive: true,
    streamUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    image: 'https://images.pexels.com/photos/7688336/pexels-photo-7688336.jpeg',
  },
];

//GET ALL EVENTS
export const getEvents = async (req: Request, res: Response): Promise<void> => {
  const { category, isLive } = req.query;

  if (config.useInMemoryMock) {
    let filtered = [...inMemoryEvents];
    if (category) {
      filtered = filtered.filter((e) => e.category.toLowerCase() === (category as string).toLowerCase());
    }
    if (isLive !== undefined) {
      filtered = filtered.filter((e) => e.isLive === (isLive === 'true'));
    }
    res.status(200).json({ success: true, count: filtered.length, data: filtered });
    return;
  }

  const filter: Record<string, unknown> = {};
  if (category) filter.category = new RegExp(`^${category}$`, 'i');
  if (isLive !== undefined) filter.isLive = isLive === 'true';

  const events = await EventModel.find(filter).sort({ date: 1 });
  res.status(200).json({ success: true, count: events.length, data: events });
};

//GET EVENT BY ID
export const getEventById = async (req: Request, res: Response): Promise<void> => {
  const numericId = parseInt(req.params.id, 10);

  if (config.useInMemoryMock) {
    const event = inMemoryEvents.find((e) => e.id === numericId);
    if (!event) {
      throw new ApiError(404, `Event with ID ${numericId} not found.`);
    }
    res.status(200).json({ success: true, data: event });
    return;
  }

  const event = await EventModel.findOne({ numericId });
  if (!event) {
    throw new ApiError(404, `Event with ID ${numericId} not found.`);
  }
  res.status(200).json({ success: true, data: event });
};

//CREATE A NEW EVENT
export const createEvent = async (req: Request, res: Response): Promise<void> => {
  const newEventData = req.body;

  if (config.useInMemoryMock) {
    const newId = inMemoryEvents.length > 0 ? Math.max(...inMemoryEvents.map((e) => e.id)) + 1 : 1;
    const createdEvent: IEvent = {
      id: newId,
      ...newEventData,
      registered: 0,
    };
    inMemoryEvents.push(createdEvent);
    res.status(201).json({ success: true, message: 'Event created successfully.', data: createdEvent });
    return;
  }

  const highest = await EventModel.findOne().sort({ numericId: -1 });
  const newNumericId = highest ? highest.numericId + 1 : 1;

  const eventDoc = await EventModel.create({
    numericId: newNumericId,
    ...newEventData,
    registered: 0,
  });

  
  res.status(201).json({ success: true, message: 'Event created successfully.', data: eventDoc });
};

//UPDATE AN EVENT
export const updateEvent = async (req: Request, res: Response): Promise<void> => {
  const numericId = parseInt(req.params.id, 10);
  const updates = req.body;

  if (config.useInMemoryMock) {
    const eventIndex = inMemoryEvents.findIndex((event) => event.id === numericId);

    if (eventIndex === -1) {
      throw new ApiError(404, `Event with ID ${numericId} not found.`);
    }

    const updatedEvent: IEvent = {
      ...inMemoryEvents[eventIndex],
      ...updates,
    };

    if (updatedEvent.capacity !== undefined && updatedEvent.capacity !== null && updatedEvent.registered > updatedEvent.capacity) {
      throw new ApiError(
        400,
        'Event capacity cannot be lower than the number of registered attendees.'
      );
    }

    inMemoryEvents[eventIndex] = updatedEvent;

    res.status(200).json({
      success: true,
      message: 'Event updated successfully.',
      data: updatedEvent,
    });

    return;
  }

  const event = await EventModel.findOne({ numericId });

  if (!event) {
    throw new ApiError(404, `Event with ID ${numericId} not found.`);
  }

  if (
    updates.capacity !== undefined &&
    updates.capacity !== null &&
    updates.capacity < event.registered
  ) {
    throw new ApiError(
      400,
      'Event capacity cannot be lower than the number of registered attendees.'
    );
  }

  Object.assign(event, updates);

  await event.save();

  res.status(200).json({
    success: true,
    message: 'Event updated successfully.',
    data: event,
  });
};

//DELETE AN EVENT
export const deleteEvent = async (req: Request, res: Response): Promise<void> => {
  const numericId = parseInt(req.params.id, 10);

  if (config.useInMemoryMock) {
    const eventIndex = inMemoryEvents.findIndex((event) => event.id === numericId);

    if (eventIndex === -1) {
      throw new ApiError(404, `Event with ID ${numericId} not found.`);
    }

    const [deletedEvent] = inMemoryEvents.splice(eventIndex, 1);

    res.status(200).json({
      success: true,
      message: 'Event deleted successfully.',
      data: deletedEvent,
    });

    return;
  }

  const deletedEvent = await EventModel.findOneAndDelete({ numericId });

  if (!deletedEvent) {
    throw new ApiError(404, `Event with ID ${numericId} not found.`);
  }

  res.status(200).json({
    success: true,
    message: 'Event deleted successfully.',
    data: deletedEvent,
  });
};


//REGISTER FOR AN EVENT
export const registerForEvent = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const numericId = parseInt(req.params.id, 10);

  const {
    fullName,
    email,
    phone,
    archdeaconry,
    parish,
    age,
  } = req.body;

  const event = await EventModel.findOne({
    numericId,
  });

  if (!event) {
    throw new ApiError(
      404,
      `Event with ID ${numericId} not found.`,
    );
  }

  if (event.capacity !== undefined && event.capacity !== null && event.registered >= event.capacity) {
    throw new ApiError(400, 'Event capacity reached.');
  }

  const existingRegistration =
    await EventRegistrationModel.findOne({
      eventId: numericId,
      email: email.toLowerCase(),
    });

  if (existingRegistration) {
    throw new ApiError(
      409,
      'This email is already registered for this event.',
    );
  }

  const registration =
    await EventRegistrationModel.create({
      eventId: numericId,
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
    message: 'Successfully registered for event.',
    data: registration,
  });
};