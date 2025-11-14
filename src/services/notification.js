import { prisma } from '../utils/prisma.js';

/**
 * Create a notification in the database and send via Socket.io
 * @param {Object} options - Notification options
 * @param {string} options.userId - User ID to notify
 * @param {string} options.title - Notification title
 * @param {string} options.message - Notification message
 * @param {string} options.type - Notification type (info, success, warning, error)
 * @param {string} options.link - Optional link
 * @param {Object} options.io - Socket.io instance
 */
export const createNotification = async ({ userId, title, message, type = 'info', link = null, io = null }) => {
  try {
    // Create notification in database
    const notification = await prisma.notification.create({
      data: {
        userId,
        title,
        message,
        type,
        link,
      },
    });

    // Send via Socket.io if available
    if (io) {
      io.to(`user-${userId}`).emit('notification', {
        id: notification.id,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        link: notification.link,
        isRead: notification.isRead,
        createdAt: notification.createdAt,
      });
    }

    return notification;
  } catch (error) {
    console.error('Failed to create notification:', error);
    throw error;
  }
};

