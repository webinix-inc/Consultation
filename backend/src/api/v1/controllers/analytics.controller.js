const User = require("../../../models/user.model");
const { Consultant } = require("../../../models/consultant.model");
const Appointment = require("../../../models/appointment.model");
const Category = require("../../../models/category.model");
const { sendSuccess } = require("../../../utils/response");

exports.overview = async (req, res, next) => {
  try {
    const [totalConsultants, totalAppointments, activeClients, monthlyRevenue] = await Promise.all([
      Consultant.countDocuments({ status: { $in: ["Active"] } }),
      Appointment.countDocuments({}),
      User.countDocuments({ status: "Active" }),
      Category.aggregate([
        { $group: { _id: null, revenue: { $sum: "$monthlyRevenue" } } },
      ]).then((r) => (r[0]?.revenue || 0)),
    ]);

    const topCategoriesRaw = await Category.find({})
      .sort({ monthlyRevenue: -1 })
      .limit(6)
      .select("title monthlyRevenue consultants clients rating")
      .lean();

    // Aggregate appointment counts by category
    const categoryAppointmentCounts = await Appointment.aggregate([
      {
        $group: {
          _id: "$category",
          count: { $sum: 1 },
        },
      },
    ]);

    const appointmentCountMap = categoryAppointmentCounts.reduce((acc, curr) => {
      acc[curr._id] = curr.count;
      return acc;
    }, {});

    const topCategories = topCategoriesRaw.map((cat) => ({
      ...cat,
      appointmentCount: appointmentCountMap[cat.title] || 0,
    }));

    const recentAppointments = await Appointment.find({})
      .sort({ createdAt: -1 })
      .limit(5)
      .select("client consultant category date timeStart status");

    // Calculate monthly revenue trends (last 6 months)
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const now = new Date();
    const monthlyTrends = [];
    
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999);
      
      const [revenueResult, apptCount] = await Promise.all([
        Appointment.aggregate([
          {
            $match: {
              $or: [
                { startAt: { $gte: monthStart, $lte: monthEnd } },
                { date: { $gte: monthStart.toISOString().split('T')[0], $lte: monthEnd.toISOString().split('T')[0] } }
              ],
              status: { $in: ["Completed", "Confirmed"] }
            }
          },
          { $group: { _id: null, revenue: { $sum: "$fee" } } },
        ]),
        Appointment.countDocuments({
          $or: [
            { startAt: { $gte: monthStart, $lte: monthEnd } },
            { date: { $gte: monthStart.toISOString().split('T')[0], $lte: monthEnd.toISOString().split('T')[0] } }
          ]
        })
      ]);
      
      monthlyTrends.push({
        name: monthNames[monthStart.getMonth()],
        revenue: revenueResult[0]?.revenue || 0,
        appt: apptCount
      });
    }

    // Calculate category performance with revenue, sessions, and growth
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    const categoryPerformance = await Promise.all(
      topCategories.map(async (cat) => {
        // Current month stats
        const currentMonthStats = await Appointment.aggregate([
          {
            $match: {
              category: cat.title,
              $or: [
                { startAt: { $gte: startOfMonth } },
                { date: { $gte: startOfMonth.toISOString().split('T')[0] } }
              ],
              status: { $in: ["Completed", "Confirmed"] }
            }
          },
          {
            $group: {
              _id: null,
              revenue: { $sum: "$fee" },
              sessions: { $sum: 1 }
            }
          }
        ]);

        // Last month stats
        const lastMonthStats = await Appointment.aggregate([
          {
            $match: {
              category: cat.title,
              $or: [
                { startAt: { $gte: startOfLastMonth, $lte: endOfLastMonth } },
                { date: { $gte: startOfLastMonth.toISOString().split('T')[0], $lte: endOfLastMonth.toISOString().split('T')[0] } }
              ],
              status: { $in: ["Completed", "Confirmed"] }
            }
          },
          {
            $group: {
              _id: null,
              revenue: { $sum: "$fee" },
              sessions: { $sum: 1 }
            }
          }
        ]);

        const currentRevenue = currentMonthStats[0]?.revenue || 0;
        const currentSessions = currentMonthStats[0]?.sessions || 0;
        const lastRevenue = lastMonthStats[0]?.revenue || 0;
        const avgRate = currentSessions > 0 ? Math.round(currentRevenue / currentSessions) : 0;
        const growth = lastRevenue > 0 
          ? Math.round(((currentRevenue - lastRevenue) / lastRevenue) * 100)
          : 0;

        return {
          name: cat.title,
          revenue: currentRevenue,
          sessions: currentSessions,
          rate: `₹${avgRate}/hr avg`,
          growth: `${growth >= 0 ? '+' : ''}${growth}%`
        };
      })
    );

    // Get top performing consultants (by revenue this month)
    const topConsultantsRaw = await Appointment.aggregate([
      {
        $match: {
          $or: [
            { startAt: { $gte: startOfMonth } },
            { date: { $gte: startOfMonth.toISOString().split('T')[0] } }
          ],
          status: { $in: ["Completed", "Confirmed"] }
        }
      },
      {
        $group: {
          _id: "$consultant",
          revenue: { $sum: "$fee" },
          sessions: { $sum: 1 }
        }
      },
      { $sort: { revenue: -1 } },
      { $limit: 5 }
    ]);

    const consultantIds = topConsultantsRaw.map(c => c._id);
    const consultantDetails = await Consultant.find({ 
      $or: [
        { _id: { $in: consultantIds } },
        { user: { $in: consultantIds } }
      ]
    })
    .populate("user", "fullName")
    .select("user category subcategory rating")
    .lean();

    const consultantMap = consultantDetails.reduce((acc, consultant) => {
      const id = consultant._id.toString();
      const userId = consultant.user?._id?.toString() || consultant.user?.toString();
      acc[id] = consultant;
      if (userId) acc[userId] = consultant;
      return acc;
    }, {});

    const topConsultants = topConsultantsRaw.map((consultant, index) => {
      const details = consultantMap[consultant._id?.toString()] || {};
      const userName = details.user?.fullName || "Unknown Consultant";
      const categoryName = details.category?.title || details.subcategory?.title || "General";
      const rating = details.rating || 4.5;

      return {
        rank: index + 1,
        name: userName,
        category: categoryName,
        rating: parseFloat(rating.toFixed(1)),
        sessions: consultant.sessions,
        revenue: consultant.revenue
      };
    });

    return sendSuccess(res, "Analytics overview", {
      cards: {
        totalConsultants,
        totalAppointments,
        activeClients,
        monthlyRevenue,
      },
      topCategories,
      recentAppointments,
      // Enhanced analytics data
      monthlyTrends,
      categoryPerformance,
      topConsultants
    });
  } catch (err) {
    next(err);
  }
};

exports.consultantStats = async (req, res, next) => {
  try {
    const userId = req.user.id || req.user._id;
    console.log("📊 [Analytics] Fetching stats for User ID:", userId);
    console.log("📊 [Analytics] Full req.user:", req.user);

    const today = new Date().toISOString().split("T")[0];
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

    // Resolve Consultant Profile ID to handle cases where appointments/clients are linked by Profile ID instead of User ID
    const ConsultantModel = require("../../../models/consultant.model").Consultant;
    const consultantProfile = await ConsultantModel.findOne({ user: userId });

    console.log("📊 [Analytics] Consultant Profile found:", consultantProfile ? consultantProfile._id : "None");

    const consultantIds = [userId];
    if (consultantProfile) {
      consultantIds.push(consultantProfile._id);
    }
    console.log("📊 [Analytics] Querying with Consultant IDs:", consultantIds);

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    // Execute queries individually for better debugging
    const totalAppointments = await Appointment.countDocuments({ consultant: { $in: consultantIds } });
    console.log("📊 [Analytics] Total Appointments:", totalAppointments);

    const todayAppointments = await Appointment.countDocuments({
      consultant: { $in: consultantIds },
      $or: [
        { startAt: { $gte: startOfDay, $lte: endOfDay } },
        { date: today }
      ]
    });
    console.log("📊 [Analytics] Today Appointments:", todayAppointments);

    const activeClients = await require("../../../models/clientConsultant.model").countDocuments({ consultant: { $in: consultantIds }, status: "Active" });
    console.log("📊 [Analytics] Active Clients:", activeClients);

    const inactiveClients = await require("../../../models/clientConsultant.model").countDocuments({ consultant: { $in: consultantIds }, status: "Inactive" });
    console.log("📊 [Analytics] Inactive Clients:", inactiveClients);

    const monthlyRevenueResult = await Appointment.aggregate([
      {
        $match: {
          consultant: { $in: consultantIds },
          startAt: { $gte: startOfMonth },
          status: { $in: ["Completed", "Confirmed"] }
        }
      },
      { $group: { _id: null, revenue: { $sum: "$fee" } } },
    ]);
    const monthlyRevenue = monthlyRevenueResult[0]?.revenue || 0;
    console.log("📊 [Analytics] Monthly Revenue:", monthlyRevenue);

    const totalClients = activeClients + inactiveClients;
    const activePercent = totalClients > 0 ? Math.round((activeClients / totalClients) * 100) : 0;
    const inactivePercent = totalClients > 0 ? Math.round((inactiveClients / totalClients) * 100) : 0;

    const recentAppointments = await Appointment.find({ consultant: { $in: consultantIds } })
      .sort({ startAt: -1 })
      .limit(5)
      .populate("client", "fullName email avatar profileImage")
      .select("client date timeStart status session category");

    // Format recent appointments for frontend
    const formattedRecent = recentAppointments.map(appt => ({
      name: appt.client?.fullName || "Unknown Client",
      with: "You",
      tag: appt.category || "General",
      time: appt.timeStart,
      status: appt.status,
      avatar: appt.client?.avatar || appt.client?.profileImage || "https://via.placeholder.com/40"
    }));

    // Calculate monthly revenue trends (last 6 months)
    const monthlyRevenueTrends = [];
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999);
      
      const revenueResult = await Appointment.aggregate([
        {
          $match: {
            consultant: { $in: consultantIds },
            $or: [
              { startAt: { $gte: monthStart, $lte: monthEnd } },
              { date: { $gte: monthStart.toISOString().split('T')[0], $lte: monthEnd.toISOString().split('T')[0] } }
            ],
            status: { $in: ["Completed", "Confirmed"] }
          }
        },
        { $group: { _id: null, revenue: { $sum: "$fee" } } },
      ]);
      
      monthlyRevenueTrends.push({
        name: monthNames[monthStart.getMonth()],
        revenue: revenueResult[0]?.revenue || 0
      });
    }

    // Calculate weekly appointments (last 7 days)
    const weeklyAppointments = [];
    for (let i = 6; i >= 0; i--) {
      const dayStart = new Date();
      dayStart.setDate(dayStart.getDate() - i);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);
      
      const count = await Appointment.countDocuments({
        consultant: { $in: consultantIds },
        $or: [
          { startAt: { $gte: dayStart, $lte: dayEnd } },
          { date: dayStart.toISOString().split('T')[0] }
        ]
      });
      
      weeklyAppointments.push(count);
    }

    // Calculate performance metrics
    const completedAppointments = await Appointment.countDocuments({
      consultant: { $in: consultantIds },
      status: "Completed"
    });
    
    const totalBookedAppointments = await Appointment.countDocuments({
      consultant: { $in: consultantIds },
      status: { $in: ["Confirmed", "Completed", "Upcoming"] }
    });
    
    const sessionCompletionRate = totalBookedAppointments > 0 
      ? Math.round((completedAppointments / totalBookedAppointments) * 100) 
      : 0;

    // Average rating (if consultant model has rating field)
    const consultantProfileData = await ConsultantModel.findOne({ user: userId })
      .select("rating")
      .lean();
    const avgRating = consultantProfileData?.rating || 4.5;

    // Response time (average time to respond to appointment requests - placeholder logic)
    // This would need to be calculated based on actual response timestamps if available
    const responseTime = 2; // hours (placeholder - implement based on your actual response tracking)

    // Rebooking rate (clients who book again within 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const rebookedClientsResult = await Appointment.aggregate([
      {
        $match: {
          consultant: { $in: consultantIds },
          createdAt: { $gte: thirtyDaysAgo },
          status: { $in: ["Completed", "Confirmed", "Upcoming"] }
        }
      },
      {
        $group: {
          _id: "$client",
          appointmentCount: { $sum: 1 }
        }
      },
      {
        $match: {
          appointmentCount: { $gt: 1 }
        }
      }
    ]);
    
    const totalUniqueClients = await Appointment.distinct("client", {
      consultant: { $in: consultantIds },
      createdAt: { $gte: thirtyDaysAgo }
    });
    
    const rebookingRate = totalUniqueClients.length > 0
      ? Math.round((rebookedClientsResult.length / totalUniqueClients.length) * 100)
      : 0;

    // Calculate percentage change for monthly revenue
    const previousMonthRevenue = monthlyRevenueTrends[monthlyRevenueTrends.length - 2]?.revenue || 0;
    const currentMonthRevenue = monthlyRevenueTrends[monthlyRevenueTrends.length - 1]?.revenue || 0;
    const revenueDelta = previousMonthRevenue > 0
      ? ((currentMonthRevenue - previousMonthRevenue) / previousMonthRevenue * 100).toFixed(0)
      : 0;
    const revenueDeltaStr = revenueDelta >= 0 ? `+${revenueDelta}%` : `${revenueDelta}%`;

    // Calculate percentage change for total sessions
    const previousTotal = totalAppointments - todayAppointments; // Approximate previous total
    const sessionsDelta = previousTotal > 0
      ? ((totalAppointments - previousTotal) / previousTotal * 100).toFixed(0)
      : 0;
    const sessionsDeltaStr = sessionsDelta >= 0 ? `+${sessionsDelta}%` : `${sessionsDelta}%`;

    return sendSuccess(res, "Consultant stats fetched", {
      stats: [
        { id: "total", title: "Total Appointments", value: String(totalAppointments), delta: "+0%", up: true },
        { id: "today", title: "Today Appointments", value: String(todayAppointments), delta: "+0%", up: true },
        { id: "active", title: "Active Clients", value: String(activeClients), delta: "+0%", up: true },
        { id: "revenue", title: "Monthly Revenue", value: `₹${monthlyRevenue.toLocaleString()}`, delta: revenueDeltaStr, up: parseFloat(revenueDelta) >= 0 },
      ],
      clientStats: {
        total: totalClients,
        active: activeClients,
        inactive: inactiveClients,
        activePercent,
        inactivePercent
      },
      recentAppointments: formattedRecent,
      // Enhanced analytics data
      monthlyRevenueTrends,
      weeklyAppointments,
      performance: {
        sessionCompletion: sessionCompletionRate,
        avgRating: parseFloat(avgRating.toFixed(1)),
        responseTime, // in hours
        rebookingRate
      },
      metrics: {
        monthlyRevenue: monthlyRevenue,
        monthlyRevenueDelta: revenueDeltaStr,
        totalSessions: totalAppointments,
        totalSessionsDelta: sessionsDeltaStr
      }
    });
  } catch (err) {
    console.error("❌ [Analytics] Error fetching consultant stats:", err);
    next(err);
  }
};

exports.clientStats = async (req, res, next) => {
  try {
    const userId = req.user.id || req.user._id;
    console.log("📊 [Analytics] Fetching Client stats for User ID:", userId);
    console.log("📊 [Analytics] Full req.user:", req.user);
    const today = new Date();

    const totalAppointments = await Appointment.countDocuments({ client: userId });
    const completedAppointments = await Appointment.countDocuments({ client: userId, status: "Completed" });

    const upcomingAppointments = await Appointment.countDocuments({
      client: userId,
      status: { $in: ["Upcoming", "Confirmed"] },
      startAt: { $gte: today }
    });
    console.log("📊 [Analytics] Client Upcoming Appointments:", upcomingAppointments);

    const myConsultants = await require("../../../models/clientConsultant.model").countDocuments({ client: userId, status: "Active" });
    console.log("📊 [Analytics] Client My Consultants:", myConsultants);

    const totalSpentResult = await Appointment.aggregate([
      { $match: { client: userId, status: { $in: ["Completed", "Confirmed"] } } },
      { $group: { _id: null, total: { $sum: "$fee" } } },
    ]);
    const totalSpent = totalSpentResult[0]?.total || 0;
    console.log("📊 [Analytics] Client Total Spent:", totalSpent);

    const recentAppointments = await Appointment.find({ client: userId, status: "Upcoming" })
      .sort({ startAt: 1 })
      .limit(5)
      .populate("consultant", "fullName email avatar profileImage")
      .select("consultant date timeStart status category");

    const formattedRecent = recentAppointments.map(appt => ({
      name: appt.consultant?.fullName || "Unknown Consultant",
      with: "You",
      tag: appt.category || "General",
      time: `${appt.date} ${appt.timeStart}`,
      status: appt.status,
      avatar: appt.consultant?.avatar || appt.consultant?.profileImage || "https://via.placeholder.com/40"
    }));

    return sendSuccess(res, "Client stats fetched", {
      stats: [
        { id: "total", title: "Total Appointments", value: String(totalAppointments), delta: "+0%", up: true },
        { id: "completed", title: "Completed Sessions", value: String(completedAppointments), delta: "+0%", up: true },
        { id: "upcoming", title: "Upcoming Appointments", value: String(upcomingAppointments), delta: "+0%", up: true },
        { id: "spent", title: "Total Spent", value: `${totalSpent}`, delta: "+0%", up: true },
      ],
      recentAppointments: formattedRecent
    });
  } catch (err) {
    console.error("❌ [Analytics] Error fetching client stats:", err);
    next(err);
  }
};

exports.getClientStatsById = async (req, res, next) => {
  try {
    const userId = req.params.id;
    const today = new Date();

    const totalAppointments = await Appointment.countDocuments({ client: userId });
    const completedAppointments = await Appointment.countDocuments({ client: userId, status: "Completed" });

    const upcomingAppointments = await Appointment.countDocuments({
      client: userId,
      status: { $in: ["Upcoming", "Confirmed"] },
      startAt: { $gte: today }
    });

    const myConsultants = await require("../../../models/clientConsultant.model").countDocuments({ client: userId, status: "Active" });

    const totalSpentResult = await Appointment.aggregate([
      { $match: { client: userId, status: { $in: ["Completed", "Confirmed"] } } },
      { $group: { _id: null, total: { $sum: "$fee" } } },
    ]);
    const totalSpent = totalSpentResult[0]?.total || 0;

    const recentAppointments = await Appointment.find({ client: userId, status: "Upcoming" })
      .sort({ startAt: 1 })
      .limit(5)
      .populate("consultant", "fullName email avatar profileImage")
      .select("consultant date timeStart status category");

    const formattedRecent = recentAppointments.map(appt => ({
      name: appt.consultant?.fullName || "Unknown Consultant",
      with: "You",
      tag: appt.category || "General",
      time: `${appt.date} ${appt.timeStart}`,
      status: appt.status,
      avatar: appt.consultant?.avatar || appt.consultant?.profileImage || "https://via.placeholder.com/40"
    }));

    return sendSuccess(res, "Client stats fetched", {
      stats: [
        { id: "total", title: "Total Appointments", value: String(totalAppointments), delta: "+0%", up: true },
        { id: "completed", title: "Completed Sessions", value: String(completedAppointments), delta: "+0%", up: true },
        { id: "upcoming", title: "Upcoming Appointments", value: String(upcomingAppointments), delta: "+0%", up: true },
        { id: "spent", title: "Total Spent", value: `${totalSpent}`, delta: "+0%", up: true },
      ],
      recentAppointments: formattedRecent
    });
  } catch (err) {
    console.error("❌ [Analytics] Error fetching client stats by ID:", err);
    next(err);
  }
};
