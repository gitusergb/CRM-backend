import { prisma } from '../utils/prisma.js';
import { sendLeadUpdateEmail } from '../services/email.js';
import { createNotification } from '../services/notification.js';

/**
 * Get all leads with filters
 */
export const getLeads = async (req, res) => {
  try {
    const {
      status,
      assignedToId,
      createdById,
      search,
      page = 1,
      limit = 20,
    } = req.query;

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    // Build where clause
    const where = {};

    if (status) {
      where.status = status;
    }

    if (assignedToId) {
      where.assignedToId = assignedToId;
    }

    if (createdById) {
      where.createdById = createdById;
    }

    // Role-based filtering
    if (req.user.role === 'SALES_EXECUTIVE') {
      // Sales executives can only see leads assigned to them or created by them
      where.OR = [
        { assignedToId: req.user.id },
        { createdById: req.user.id },
      ];
    }

    // Search filter
    if (search) {
      where.OR = [
        ...(where.OR || []),
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { company: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Get leads with pagination
    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        include: {
          assignedTo: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          _count: {
            select: {
              activities: true,
            },
          },
        },
        orderBy: {
          updatedAt: 'desc',
        },
        skip,
        take: limitNum,
      }),
      prisma.lead.count({ where }),
    ]);

    res.json({
      success: true,
      data: leads,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('Get leads error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get leads',
      error: error.message,
    });
  }
};

/**
 * Get single lead by ID
 */
export const getLead = async (req, res) => {
  try {
    const { id } = req.params;

    const lead = await prisma.lead.findUnique({
      where: { id },
      include: {
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
        activities: {
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
          take: 10, // Latest 10 activities
        },
        history: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 20, // Latest 20 history entries
        },
      },
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
        message: 'You do not have permission to view this lead',
      });
    }

    res.json({
      success: true,
      data: lead,
    });
  } catch (error) {
    console.error('Get lead error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get lead',
      error: error.message,
    });
  }
};

/**
 * Create new lead
 */
export const createLead = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      company,
      title,
      status = 'NEW',
      source,
      value = 0,
      notes,
      assignedToId,
    } = req.body;

    // Validation
    if (!firstName || !lastName) {
      return res.status(400).json({
        success: false,
        message: 'First name and last name are required',
      });
    }

    // Create lead
    const lead = await prisma.lead.create({
      data: {
        firstName,
        lastName,
        email,
        phone,
        company,
        title,
        status,
        source,
        value: parseFloat(value) || 0,
        notes,
        assignedToId: assignedToId || null,
        createdById: req.user.id,
      },
      include: {
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    // Create history entry
    await prisma.leadHistory.create({
      data: {
        leadId: lead.id,
        fieldName: 'created',
        newValue: 'Lead created',
        changedById: req.user.id,
      },
    });

    // Send notification via Socket.io and database
    const io = req.app.locals.io;
    if (lead.assignedToId) {
      await createNotification({
        userId: lead.assignedToId,
        title: 'New Lead Assigned',
        message: `You have been assigned a new lead: ${lead.firstName} ${lead.lastName}`,
        type: 'info',
        link: `/leads/${lead.id}`,
        io,
      });
    }

    res.status(201).json({
      success: true,
      message: 'Lead created successfully',
      data: lead,
    });
  } catch (error) {
    console.error('Create lead error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create lead',
      error: error.message,
    });
  }
};

/**
 * Update lead
 */
export const updateLead = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Get existing lead
    const existingLead = await prisma.lead.findUnique({
      where: { id },
      include: {
        assignedTo: true,
        createdBy: true,
      },
    });

    if (!existingLead) {
      return res.status(404).json({
        success: false,
        message: 'Lead not found',
      });
    }

    // Check permissions
    if (
      req.user.role === 'SALES_EXECUTIVE' &&
      existingLead.assignedToId !== req.user.id &&
      existingLead.createdById !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to update this lead',
      });
    }

    // Track changes for history
    const historyEntries = [];
    const fieldsToTrack = [
      'status',
      'assignedToId',
      'value',
      'firstName',
      'lastName',
      'email',
      'phone',
      'company',
    ];

    for (const field of fieldsToTrack) {
      if (updateData[field] !== undefined && updateData[field] !== existingLead[field]) {
        historyEntries.push({
          leadId: id,
          fieldName: field,
          oldValue: existingLead[field]?.toString() || null,
          newValue: updateData[field]?.toString() || null,
          changedById: req.user.id,
        });
      }
    }

    // Update lead
    const lead = await prisma.lead.update({
      where: { id },
      data: {
        ...updateData,
        value: updateData.value !== undefined ? parseFloat(updateData.value) : existingLead.value,
      },
      include: {
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    // Create history entries
    if (historyEntries.length > 0) {
      await prisma.leadHistory.createMany({
        data: historyEntries,
      });
    }

    // Send email notification if status changed significantly
    if (updateData.status && updateData.status !== existingLead.status) {
      const updatedBy = await prisma.user.findUnique({
        where: { id: req.user.id },
      });
      await sendLeadUpdateEmail(lead, 'Status Updated', updatedBy);
    }

    // Send Socket.io notification if assigned to different user
    if (updateData.assignedToId && updateData.assignedToId !== existingLead.assignedToId) {
      const io = req.app.locals.io;
      await createNotification({
        userId: updateData.assignedToId,
        title: 'Lead Assigned to You',
        message: `You have been assigned a lead: ${lead.firstName} ${lead.lastName}`,
        type: 'info',
        link: `/leads/${lead.id}`,
        io,
      });
    }

    res.json({
      success: true,
      message: 'Lead updated successfully',
      data: lead,
    });
  } catch (error) {
    console.error('Update lead error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update lead',
      error: error.message,
    });
  }
};

/**
 * Delete lead
 */
export const deleteLead = async (req, res) => {
  try {
    const { id } = req.params;

    const lead = await prisma.lead.findUnique({
      where: { id },
    });

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: 'Lead not found',
      });
    }

    // Only Admin and Manager can delete, or the creator
    if (
      req.user.role !== 'ADMIN' &&
      req.user.role !== 'MANAGER' &&
      lead.createdById !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to delete this lead',
      });
    }

    await prisma.lead.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'Lead deleted successfully',
    });
  } catch (error) {
    console.error('Delete lead error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete lead',
      error: error.message,
    });
  }
};

