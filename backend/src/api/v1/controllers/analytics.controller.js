const User = require("../../../models/user.model");
const { Consultant } = require("../../../models/consultant.model");
const Appointment = require("../../../models/appointment.model");
const Category = require("../../../models/category.model");
const Transaction = require("../../../models/transaction.model");
const { sendSuccess } = require("../../../utils/response");

exports.overview = async (req, res, next) => {
  try {
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

    const Client = require("../../../models/client.model");

    const [totalConsultants, totalAppointments, activeClients, monthlyRevenue] = await Promise.all([
      Consultant.countDocuments({ status: { $in: ["Active"] } }),
      Appointment.countDocuments({}),
      Client.countDocuments({ status: "Active" }),
      // Calculate Admin Revenue (Platform Fees) from Transactions
      Transaction.aggregate([
        {
          $match: {
            createdAt: { $gte: startOfMonth },
            status: "Success",
            type: "Payment"
          }
        },
        { $group: { _id: null, revenue: { $sum: "$platformFee" } } },
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

    const recentAppointmentsRaw = await Appointment.find({})
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    const recentAppointments = await Promise.all(recentAppointmentsRaw.map(async (appt) => {
      // Populate Client Name
      let clientName = "Unknown Client";
      // Try User first
      let clientDoc = await User.findById(appt.client).select("fullName");
      if (!clientDoc) {
        // Try Client model
        clientDoc = await Client.findById(appt.client).select("fullName");
      }
      if (clientDoc) clientName = clientDoc.fullName;

      // Populate Consultant Name
      let consultantName = "Unknown Consultant";
      // Try Consultant model first (more likely)
      let consultantDoc = await Consultant.findById(appt.consultant).select("name firstName lastName fullName");
      if (!consultantDoc) {
        // Try User model
        consultantDoc = await User.findById(appt.consultant).select("fullName");
      }
      if (consultantDoc) {
        consultantName = consultantDoc.name || consultantDoc.fullName || `${consultantDoc.firstName} ${consultantDoc.lastName}`;
      }

      return {
        _id: appt._id,
        client: clientName,
        consultant: consultantName,
        category: appt.category,
        date: appt.date,
        timeStart: appt.timeStart, // Legacy
        status: appt.status,
        // Convert startAt if needed or just use legacy fields if available
      };
    }));

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
              status: { $in: ["Completed", "Upcoming"] }
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
              status: { $in: ["Completed", "Upcoming"] }
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
              status: { $in: ["Completed", "Upcoming"] }
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
          status: { $in: ["Completed", "Upcoming"] }
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

    // Cast IDs to ObjectId for Aggregation
    const mongoose = require("mongoose");
    const consultantObjectIds = consultantIds.map(id => new mongoose.Types.ObjectId(id));

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

    const monthlyRevenueResult = await Transaction.aggregate([
      {
        $match: {
          $or: [
            { consultant: { $in: consultantObjectIds } },
            { user: { $in: consultantObjectIds } }
          ],
          createdAt: { $gte: startOfMonth },
          status: "Success",
          type: "Payment"
        }
      },
      {
        $group: {
          _id: null,
          revenue: {
            $sum: { $ifNull: ["$netAmount", "$amount"] }
          }
        }
      },
    ]);

    const monthlyRevenue = monthlyRevenueResult[0]?.revenue || 0;
    console.log("📊 [Analytics] Monthly Net Revenue:", monthlyRevenue);

    // Calculate Total Revenue (All Time)
    const totalRevenueResult = await Transaction.aggregate([
      {
        $match: {
          $or: [
            { consultant: { $in: consultantObjectIds } },
            { user: { $in: consultantObjectIds } }
          ],
          status: "Success",
          type: "Payment"
        }
      },
      {
        $group: {
          _id: null,
          revenue: {
            $sum: { $ifNull: ["$netAmount", "$amount"] }
          },
          count: { $sum: 1 } // Debug: count transactions
        }
      },
    ]);
    const totalRevenue = totalRevenueResult[0]?.revenue || 0;
    console.log("📊 [Analytics] Total Net Revenue:", totalRevenue);
    console.log("📊 [Analytics] All Time Transaction Count:", totalRevenueResult[0]?.count || 0);
    console.log("📊 [Analytics] Consultant IDs used:", consultantIds);

    const totalClients = activeClients + inactiveClients;
    const activePercent = totalClients > 0 ? Math.round((activeClients / totalClients) * 100) : 0;
    const inactivePercent = totalClients > 0 ? Math.round((inactiveClients / totalClients) * 100) : 0;

    const recentAppointmentsRaw = await Appointment.find({ consultant: { $in: consultantIds } })
      .sort({ startAt: -1 })
      .limit(5)
      .select("client date timeStart status session category")
      .lean();

    const formattedRecent = await Promise.all(recentAppointmentsRaw.map(async (appt) => {
      // Find Client Name & Avatar
      let clientName = "Unknown Client";
      let clientAvatar = "https://via.placeholder.com/40";

      // Try User first
      let clientDoc = await User.findById(appt.client).select("fullName avatar profileImage");
      if (!clientDoc) {
        // Try Client model
        clientDoc = await require("../../../models/client.model").findById(appt.client).select("fullName avatar profileImage");
      }

      if (clientDoc) {
        clientName = clientDoc.fullName;
        clientAvatar = clientDoc.avatar || clientDoc.profileImage || clientAvatar;
      }

      return {
        name: clientName,
        with: "You",
        tag: appt.category || "General",
        time: appt.timeStart,
        status: appt.status,
        avatar: clientAvatar
      };
    }));

    // Calculate monthly revenue trends (last 6 months)
    const monthlyRevenueTrends = [];
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999);

      const revenueResult = await Transaction.aggregate([
        {
          $match: {
            consultant: { $in: consultantObjectIds },
            createdAt: { $gte: monthStart, $lte: monthEnd },
            status: "Success",
            type: "Payment"
          }
        },
        {
          $group: {
            _id: null,
            revenue: {
              $sum: { $ifNull: ["$netAmount", "$amount"] }
            }
          }
        },
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
      status: { $in: ["Completed", "Upcoming"] }
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
          status: { $in: ["Completed", "Upcoming"] }
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
        // Send Total Revenue instead of Monthly if that's what user prefers, or we can send both. 
        // Changing to Total Revenue as per user expectation of seeing lifetime earnings here.
        { id: "revenue", title: "Total Revenue", value: `₹${totalRevenue.toLocaleString()}`, delta: revenueDeltaStr, up: parseFloat(revenueDelta) >= 0 },
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
      status: "Upcoming",
      startAt: { $gte: today }
    });
    console.log("📊 [Analytics] Client Upcoming Appointments:", upcomingAppointments);

    const myConsultants = await require("../../../models/clientConsultant.model").countDocuments({ client: userId, status: "Active" });
    console.log("📊 [Analytics] Client My Consultants:", myConsultants);

    const mongoose = require("mongoose");
    const userObjectId = new mongoose.Types.ObjectId(userId);

    const totalSpentResult = await Transaction.aggregate([
      { $match: { user: userObjectId, status: "Success", type: "Payment" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    const totalSpent = totalSpentResult[0]?.total || 0;
    console.log("📊 [Analytics] Client Total Spent:", totalSpent);

    const recentAppointmentsRaw = await Appointment.find({
      client: userId,
      status: "Upcoming",
      startAt: { $gte: today }
    })
      .sort({ startAt: 1 })
      .limit(5)
      .select("consultant date timeStart startAt status category consultantSnapshot")
      .lean();

    const User = require("../../../models/user.model");
    const Consultant = require("../../../models/consultant.model").Consultant;

    const formattedRecent = await Promise.all(recentAppointmentsRaw.map(async (appt) => {
      let displayTime = "";
      if (appt.startAt) {
        const d = new Date(appt.startAt);
        const dateStr = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        const timeStr = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
        displayTime = `${dateStr}, ${timeStr}`;
      } else if (appt.date && appt.timeStart) {
        displayTime = `${appt.date} ${appt.timeStart}`;
      }

      // Robust Consultant Lookup
      let cName = "Unknown Consultant";
      let cAvatar = "https://via.placeholder.com/40";
      let cEmail = "";

      // 1. Try User
      let cDoc = await User.findById(appt.consultant).select("fullName email profileImage avatar");
      if (cDoc) {
        cName = cDoc.fullName;
        cEmail = cDoc.email;
        cAvatar = cDoc.profileImage || cDoc.avatar || cAvatar;
      } else {
        // 2. Try Consultant
        cDoc = await Consultant.findById(appt.consultant).select("name firstName lastName fullName email image");
        if (cDoc) {
          cName = cDoc.name || cDoc.fullName || `${cDoc.firstName} ${cDoc.lastName}`.trim();
          cEmail = cDoc.email;
          cAvatar = cDoc.image || cAvatar;
        } else {
          // 3. Try Snapshot
          if (appt.consultantSnapshot) {
            cName = appt.consultantSnapshot.name || cName;
            cEmail = appt.consultantSnapshot.email || cEmail;
          }
        }
      }

      if (cAvatar.includes("via.placeholder")) {
        cAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(cName)}&background=random`;
      }

      return {
        name: cName,
        with: "You",
        tag: appt.category || "General",
        time: displayTime,
        status: appt.status,
        avatar: cAvatar
      };
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
      status: "Upcoming",
      startAt: { $gte: today }
    });

    const myConsultants = await require("../../../models/clientConsultant.model").countDocuments({ client: userId, status: "Active" });

    const mongoose = require("mongoose");
    const userObjectId = new mongoose.Types.ObjectId(userId);

    const totalSpentResult = await Transaction.aggregate([
      { $match: { user: userObjectId, status: "Success", type: "Payment" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    const totalSpent = totalSpentResult[0]?.total || 0;

    const recentAppointmentsRaw = await Appointment.find({
      client: userId,
      status: "Upcoming",
      startAt: { $gte: today }
    })
      .sort({ startAt: 1 })
      .limit(5)
      .select("consultant date timeStart startAt status category consultantSnapshot")
      .lean();

    const User = require("../../../models/user.model");
    const Consultant = require("../../../models/consultant.model").Consultant;

    const formattedRecent = await Promise.all(recentAppointmentsRaw.map(async (appt) => {
      let displayTime = "";
      if (appt.startAt) {
        const d = new Date(appt.startAt);
        const dateStr = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        const timeStr = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
        displayTime = `${dateStr}, ${timeStr}`;
      } else if (appt.date && appt.timeStart) {
        displayTime = `${appt.date} ${appt.timeStart}`;
      }

      // Robust Consultant Lookup
      let cName = "Unknown Consultant";
      let cAvatar = "https://via.placeholder.com/40";
      let cEmail = "";

      // 1. Try User
      let cDoc = await User.findById(appt.consultant).select("fullName email profileImage avatar");
      if (cDoc) {
        cName = cDoc.fullName;
        cEmail = cDoc.email;
        cAvatar = cDoc.profileImage || cDoc.avatar || cAvatar;
      } else {
        // 2. Try Consultant
        cDoc = await Consultant.findById(appt.consultant).select("name firstName lastName fullName email image");
        if (cDoc) {
          cName = cDoc.name || cDoc.fullName || `${cDoc.firstName} ${cDoc.lastName}`.trim();
          cEmail = cDoc.email;
          cAvatar = cDoc.image || cAvatar;
        } else {
          // 3. Try Snapshot
          if (appt.consultantSnapshot) {
            cName = appt.consultantSnapshot.name || cName;
            cEmail = appt.consultantSnapshot.email || cEmail;
          }
        }
      }

      if (cAvatar.includes("via.placeholder")) {
        cAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(cName)}&background=random`;
      }

      return {
        name: cName,
        with: "You",
        tag: appt.category || "General",
        time: displayTime,
        status: appt.status,
        avatar: cAvatar
      };
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
