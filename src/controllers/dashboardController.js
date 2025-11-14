import { prisma } from '../utils/prisma.js';

/**
 * Get dashboard analytics
 */
export const getDashboardStats = async (req, res) => {
  try {
    // Build base where clause based on user role
    const baseWhere = {};
    
    if (req.user.role === 'SALES_EXECUTIVE') {
      baseWhere.OR = [
        { assignedToId: req.user.id },
        { createdById: req.user.id },
      ];
    }

    // Get total leads count
    const totalLeads = await prisma.lead.count({
      where: baseWhere,
    });

    // Get leads by status
    const leadsByStatus = await prisma.lead.groupBy({
      by: ['status'],
      where: baseWhere,
      _count: {
        id: true,
      },
    });

    // Get leads by stage (simplified status groups)
    const statusGroups = {
      'New': ['NEW'],
      'In Progress': ['CONTACTED', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION'],
      'Won': ['CLOSED_WON'],
      'Lost': ['CLOSED_LOST'],
    };

    const leadsByStage = Object.entries(statusGroups).map(([stage, statuses]) => ({
      stage,
      count: 0, // Will be calculated
    }));

    // Calculate counts
    for (const group of leadsByStatus) {
      for (const [stage, statuses] of Object.entries(statusGroups)) {
        if (statuses.includes(group.status)) {
          const stageIndex = leadsByStage.findIndex(s => s.stage === stage);
          if (stageIndex !== -1) {
            leadsByStage[stageIndex].count += group._count.id;
          }
        }
      }
    }

    // Get conversion rate (Won / (Won + Lost))
    const wonCount = leadsByStatus.find(s => s.status === 'CLOSED_WON')?._count.id || 0;
    const lostCount = leadsByStatus.find(s => s.status === 'CLOSED_LOST')?._count.id || 0;
    const conversionRate = wonCount + lostCount > 0
      ? ((wonCount / (wonCount + lostCount)) * 100).toFixed(2)
      : 0;

    // Get total value
    const valueResult = await prisma.lead.aggregate({
      where: {
        ...baseWhere,
        status: 'CLOSED_WON',
      },
      _sum: {
        value: true,
      },
    });

    const totalValue = valueResult._sum.value || 0;

    // Get recent activities count (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentActivitiesCount = await prisma.activity.count({
      where: {
        createdAt: {
          gte: sevenDaysAgo,
        },
        ...(req.user.role === 'SALES_EXECUTIVE' ? {
          userId: req.user.id,
        } : {}),
      },
    });

    // Get leads created in last 30 days (for trend)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentLeads = await prisma.lead.findMany({
      where: {
        ...baseWhere,
        createdAt: {
          gte: thirtyDaysAgo,
        },
      },
      select: {
        createdAt: true,
        status: true,
        value: true,
      },
    });

    // Group by date for trend
    const leadsTrend = {};
    recentLeads.forEach(lead => {
      const date = lead.createdAt.toISOString().split('T')[0];
      if (!leadsTrend[date]) {
        leadsTrend[date] = { date, count: 0, value: 0 };
      }
      leadsTrend[date].count += 1;
      leadsTrend[date].value += lead.value || 0;
    });

    const trendData = Object.values(leadsTrend).sort((a, b) => 
      new Date(a.date) - new Date(b.date)
    );

    // Get top performing users (for Admin/Manager only)
    let topUsers = [];
    if (req.user.role === 'ADMIN' || req.user.role === 'MANAGER') {
      const userStats = await prisma.lead.groupBy({
        by: ['assignedToId'],
        where: {
          assignedToId: { not: null },
          status: 'CLOSED_WON',
        },
        _count: {
          id: true,
        },
        _sum: {
          value: true,
        },
        orderBy: {
          _sum: {
            value: 'desc',
          },
        },
        take: 5,
      });

      const userIds = userStats.map(s => s.assignedToId).filter(Boolean);
      const users = await prisma.user.findMany({
        where: {
          id: { in: userIds },
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      });

      topUsers = userStats.map(stat => {
        const user = users.find(u => u.id === stat.assignedToId);
        return {
          user: user || { firstName: 'Unknown', lastName: '' },
          leadsWon: stat._count.id,
          totalValue: stat._sum.value || 0,
        };
      });
    }

    res.json({
      success: true,
      data: {
        overview: {
          totalLeads,
          totalValue,
          conversionRate: parseFloat(conversionRate),
          recentActivities: recentActivitiesCount,
        },
        leadsByStatus: leadsByStatus.map(s => ({
          status: s.status,
          count: s._count.id,
        })),
        leadsByStage,
        trend: trendData,
        topUsers,
      },
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get dashboard stats',
      error: error.message,
    });
  }
};

