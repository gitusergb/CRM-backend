import { prisma } from '../utils/prisma.js';
import { createNotification } from '../services/notification.js';

/**
 * Get activities for a lead
 */
export const getLeadActivities = async (req, res) => {
  try {
    const { leadId } = req.params;

    // Verify lead exists and user has access
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
    });

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: 'Lead not found',
      });
    }

    // Check permissions
    if (
      req.user.role === 'SALES_EXECUTIVE' &&
      lead.assignedToId !== req.user.id &&
      lead.createdById !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to view activities for this lead',
      });
    }

    const activities = await prisma.activity.findMany({
      where: { leadId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json({
      success: true,
      data: activities,
    });
  } catch (error) {
    console.error('Get activities error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get activities',
      error: error.message,
    });
  }
};

/**
 * Create activity for a lead
 */
export const createActivity = async (req, res) => {
  try {
    const { leadId } = req.params;
    const { type, title, description, scheduledAt, completedAt } = req.body;

    // Validation
    if (!type || !title) {
      return res.status(400).json({
        success: false,
        message: 'Type and title are required',
      });
    }

    const validTypes = ['NOTE', 'CALL', 'MEETING', 'UPDATE', 'EMAIL'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: `Type must be one of: ${validTypes.join(', ')}`,
      });
    }

    // Verify lead exists and user has access
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
    });

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: 'Lead not found',
      });
    }

    // Check permissions
    if (
      req.user.role === 'SALES_EXECUTIVE' &&
      lead.assignedToId !== req.user.id &&
      lead.createdById !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to create activities for this lead',
      });
    }

    // Create activity
    const activity = await prisma.activity.create({
      data: {
        type,
        title,
        description,
        leadId,
        userId: req.user.id,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        completedAt: completedAt ? new Date(completedAt) : null,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        lead: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Create history entry
    await prisma.leadHistory.create({
      data: {
        leadId,
        fieldName: 'activity',
        newValue: `${type}: ${title}`,
        changedById: req.user.id,
      },
    });

    // Send Socket.io notification if lead is assigned to someone else
    if (lead.assignedToId && lead.assignedToId !== req.user.id) {
      const io = req.app.locals.io;
      await createNotification({
        userId: lead.assignedToId,
        title: 'New Activity Added',
        message: `${req.user.firstName} added a ${type.toLowerCase()} to lead: ${lead.firstName} ${lead.lastName}`,
        type: 'info',
        link: `/leads/${leadId}`,
        io,
      });
    }

    res.status(201).json({
      success: true,
      message: 'Activity created successfully',
      data: activity,
    });
  } catch (error) {
    console.error('Create activity error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create activity',
      error: error.message,
    });
  }
};

/**
 * Update activity
 */
export const updateActivity = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Get existing activity
    const activity = await prisma.activity.findUnique({
      where: { id },
      include: {
        lead: true,
      },
    });

    if (!activity) {
      return res.status(404).json({
        success: false,
        message: 'Activity not found',
      });
    }

    // Check permissions - user can only update their own activities unless Admin/Manager
    if (
      req.user.role === 'SALES_EXECUTIVE' &&
      activity.userId !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        message: 'You can only update your own activities',
      });
    }

    // Update activity
    const updatedActivity = await prisma.activity.update({
      where: { id },
      data: {
        ...updateData,
        scheduledAt: updateData.scheduledAt ? new Date(updateData.scheduledAt) : activity.scheduledAt,
        completedAt: updateData.completedAt ? new Date(updateData.completedAt) : activity.completedAt,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    res.json({
      success: true,
      message: 'Activity updated successfully',
      data: updatedActivity,
    });
  } catch (error) {
    console.error('Update activity error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update activity',
      error: error.message,
    });
  }
};

/**
 * Delete activity
 */
export const deleteActivity = async (req, res) => {
  try {
    const { id } = req.params;

    const activity = await prisma.activity.findUnique({
      where: { id },
    });

    if (!activity) {
      return res.status(404).json({
        success: false,
        message: 'Activity not found',
      });
    }

    // Check permissions
    if (
      req.user.role === 'SALES_EXECUTIVE' &&
      activity.userId !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own activities',
      });
    }

    await prisma.activity.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'Activity deleted successfully',
    });
  } catch (error) {
    console.error('Delete activity error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete activity',
      error: error.message,
    });
  }
};

