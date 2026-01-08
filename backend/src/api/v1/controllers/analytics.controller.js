const User = require("../../../models/user.model");
const { Consultant } = require("../../../models/consultant.model");
const Appointment = require("../../../models/appointment.model");
const Category = require("../../../models/category.model");
const Transaction = require("../../../models/transaction.model");
const { sendSuccess } = require("../../../utils/response");

exports.overview = async (req, res, next) => {
  try {
    const viewType = req.query.viewType || "monthly"; // "monthly" | "yearly"
    const queryMonth = req.query.month ? parseInt(req.query.month) - 1 : new Date().getMonth(); // 0-indexed
    const queryYear = req.query.year ? parseInt(req.query.year) : new Date().getFullYear();

    let startOfPeriod, endOfPeriod, startOfLastPeriod, endOfLastPeriod;
    const now = new Date(queryYear, queryMonth, 1);

    if (viewType === "yearly") {
      // Selected Year (Jan 1 - Dec 31)
      startOfPeriod = new Date(queryYear, 0, 1);
      endOfPeriod = new Date(queryYear, 11, 31, 23, 59, 59, 999);

      // Previous Year
      startOfLastPeriod = new Date(queryYear - 1, 0, 1);
      endOfLastPeriod = new Date(queryYear - 1, 11, 31, 23, 59, 59, 999);
    } else {
      // Selected Month
      startOfPeriod = new Date(queryYear, queryMonth, 1);
      endOfPeriod = new Date(queryYear, queryMonth + 1, 0, 23, 59, 59, 999);

      // Previous Month
      startOfLastPeriod = new Date(queryYear, queryMonth - 1, 1);
      endOfLastPeriod = new Date(queryYear, queryMonth, 0, 23, 59, 59, 999);
    }

    // Legacy mapping for variable names used in aggregations
    // We'll reuse the existing variable names but they now represent "current period" vs "last period"
    const startOfMonth = startOfPeriod;
    const endOfMonth = endOfPeriod;
    const startOfLastMonth = startOfLastPeriod;
    const endOfLastMonth = endOfLastPeriod;

    // Year stats (start of the selected year - always full year context for YTD logic)
    const startOfYear = new Date(queryYear, 0, 1);
    // For YTD, if we are looking at a past year, we probably want the whole year, or up to the selected month?
    // Let's assume YTD means "up to the end of the selected month" or "end of selected year" if it's in the past.
    // For simplicity and consistency with "Year to Date", let's keep it as start of year to end of selected month (or current time if current month).
    // Actually, "Year to Date" usually implies up to the current moment. If filters are used, it might mean "for that entire year" or "up to that month".
    // Let's standardise: Year Stats = From Jan 1 of selected year to Dec 31 of selected year (Full Year View for past years, YTD for current)
    // Wait, the previous logic was `startOfYear`... let's check aggregation.
    // Previous aggregation was `$gte: startOfYear`. That captures everything from Jan 1 onwards.
    // If I select "Nov 2025", YTD should probably be Jan 1 2025 - Nov 30 2025? Or just Jan 1 2025 - Dec 31 2025?
    // Let's define "Yearly Performance" as the performance for the selected year.
    const endOfYear = new Date(queryYear, 11, 31, 23, 59, 59, 999);

    const startOfLastYear = new Date(queryYear - 1, 0, 1);
    const endOfLastYear = new Date(queryYear - 1, 11, 31, 23, 59, 59, 999);

    const Client = require("../../../models/client.model");

    // Main stats - optimized with Promise.all
    const [
      totalConsultants,
      totalAppointments,
      activeClients,
      revenueStats,
      lastMonthRevenueStats,
      yearlyStats,
      lastYearStats
    ] = await Promise.all([
      Consultant.countDocuments({ status: { $in: ["Active"] } }),
      Appointment.countDocuments({}),
      Client.countDocuments({ status: "Active" }),
      // This month's revenue breakdown from Transactions
      Transaction.aggregate([
        {
          $match: {
            createdAt: { $gte: startOfMonth, $lte: endOfMonth },
            status: "Success",
            type: "Payment"
          }
        },
        {
          $group: {
            _id: null,
            gmv: { $sum: "$amount" },                    // Gross Merchandise Value
            platformRevenue: { $sum: "$platformFee" },   // Admin earnings
            consultantPayouts: { $sum: "$netAmount" },   // Consultant earnings
            transactionCount: { $sum: 1 }
          }
        },
      ]),
      // Last month's revenue for comparison
      Transaction.aggregate([
        {
          $match: {
            createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth },
            status: "Success",
            type: "Payment"
          }
        },
        {
          $group: {
            _id: null,
            gmv: { $sum: "$amount" },
            platformRevenue: { $sum: "$platformFee" },
            consultantPayouts: { $sum: "$netAmount" }
          }
        },
      ]),
      // This year's totals (Selected Year)
      Transaction.aggregate([
        {
          $match: {
            createdAt: { $gte: startOfYear, $lte: endOfYear },
            status: "Success",
            type: "Payment"
          }
        },
        {
          $group: {
            _id: null,
            gmv: { $sum: "$amount" },
            platformRevenue: { $sum: "$platformFee" },
            consultantPayouts: { $sum: "$netAmount" }
          }
        },
      ]),
      // Last year's totals for YoY comparison
      Transaction.aggregate([
        {
          $match: {
            createdAt: { $gte: startOfLastYear, $lte: endOfLastYear },
            status: "Success",
            type: "Payment"
          }
        },
        {
          $group: {
            _id: null,
            gmv: { $sum: "$amount" },
            platformRevenue: { $sum: "$platformFee" }
          }
        },
      ]),
    ]);

    // Activity Trend (Daily for Month, Monthly for Year)
    const activityTrend = [];
    if (viewType === "yearly") {
      for (let i = 0; i < 12; i++) {
        const mStart = new Date(queryYear, i, 1);
        const mEnd = new Date(queryYear, i + 1, 0, 23, 59, 59, 999);
        const count = await Appointment.countDocuments({
          status: { $in: ["Upcoming", "Completed", "Confirmed"] },
          $or: [
            { startAt: { $gte: mStart, $lte: mEnd } },
            { date: { $gte: mStart.toISOString().split('T')[0], $lte: mEnd.toISOString().split('T')[0] } }
          ]
        });
        activityTrend.push(count);
      }
    } else {
      const daysInMonth = new Date(queryYear, queryMonth + 1, 0).getDate();
      for (let d = 1; d <= daysInMonth; d++) {
        const dStart = new Date(queryYear, queryMonth, d, 0, 0, 0, 0);
        const dEnd = new Date(queryYear, queryMonth, d, 23, 59, 59, 999);
        const count = await Appointment.countDocuments({
          status: { $in: ["Upcoming", "Completed", "Confirmed"] },
          $or: [
            { startAt: { $gte: dStart, $lte: dEnd } },
            { date: dStart.toISOString().split('T')[0] }
          ]
        });
        activityTrend.push(count);
      }
    }

    // Extract values with defaults
    const currentStats = revenueStats[0] || { gmv: 0, platformRevenue: 0, consultantPayouts: 0, transactionCount: 0 };
    const lastMonthStats = lastMonthRevenueStats[0] || { gmv: 0, platformRevenue: 0, consultantPayouts: 0 };
    const yearStats = yearlyStats[0] || { gmv: 0, platformRevenue: 0, consultantPayouts: 0 };
    const prevYearStats = lastYearStats[0] || { gmv: 0, platformRevenue: 0 };

    // Calculate growth percentages
    const calcGrowth = (current, previous) => {
      if (previous === 0) return current > 0 ? "+100%" : "0%";
      const pct = Math.round(((current - previous) / previous) * 100);
      return pct >= 0 ? `+${pct}%` : `${pct}%`;
    };

    const monthlyGmvGrowth = calcGrowth(currentStats.gmv, lastMonthStats.gmv);
    const monthlyPlatformGrowth = calcGrowth(currentStats.platformRevenue, lastMonthStats.platformRevenue);
    const yoyGrowth = calcGrowth(yearStats.platformRevenue, prevYearStats.platformRevenue);

    // Dynamic Top Categories from Appointments (Resolving "General")
    const allAppointments = await Appointment.find({ status: { $ne: "Cancelled" } })
      .select("category consultant consultantSnapshot")
      .populate("consultant", "category subcategory")
      .lean();

    const categoryCounts = {};

    for (const appt of allAppointments) {
      let cat = appt.category || "General";

      // Fallback if category is "General"
      if (cat === "General") {
        if (appt.consultantSnapshot?.category) {
          const snapCat = appt.consultantSnapshot.category;
          cat = typeof snapCat === 'object' ? (snapCat.name || snapCat.title || "General") : snapCat;
        } else if (appt.consultant?.category) {
          const dbCat = appt.consultant.category;
          cat = typeof dbCat === 'object' ? (dbCat.name || dbCat.title || "General") : dbCat;
        }
      }

      if (cat) {
        categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
      }
    }

    const topCategories = Object.entries(categoryCounts)
      .map(([title, count]) => ({
        title,
        appointmentCount: count,
        // Mock revenue/rating/clients if needed by frontend types, though mostly count is used for chart
        monthlyRevenue: 0,
        consultants: 0,
        clients: 0,
        rating: 4.5
      }))
      .sort((a, b) => b.appointmentCount - a.appointmentCount)
      .slice(0, 5);

    const recentAppointmentsRaw = await Appointment.find({})
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    const recentAppointments = await Promise.all(recentAppointmentsRaw.map(async (appt) => {
      let clientName = "Unknown Client";
      // Try snapshot first, then DB
      if (appt.clientSnapshot?.name) {
        clientName = appt.clientSnapshot.name;
      } else {
        let clientDoc = await User.findById(appt.client).select("fullName");
        if (!clientDoc) {
          clientDoc = await Client.findById(appt.client).select("fullName");
        }
        if (clientDoc) clientName = clientDoc.fullName;
      }

      let consultantName = "Unknown Consultant";
      let consultantCategory = "General";

      // Try snapshot first
      if (appt.consultantSnapshot) {
        consultantName = appt.consultantSnapshot.name || consultantName;
        // Handle category if it's an object or string
        const snapCat = appt.consultantSnapshot.category;
        if (snapCat && typeof snapCat === "object") {
          consultantCategory = snapCat.name || snapCat.title || "General";
        } else if (snapCat) {
          consultantCategory = snapCat;
        }
      } else {
        // Fallback to DB
        let consultantDoc = await Consultant.findById(appt.consultant).select("name firstName lastName fullName category");
        if (!consultantDoc) {
          consultantDoc = await User.findById(appt.consultant).select("fullName");
        }
        if (consultantDoc) {
          consultantName = consultantDoc.name || consultantDoc.fullName || `${consultantDoc.firstName} ${consultantDoc.lastName}`;
          if (consultantDoc.category) {
            if (typeof consultantDoc.category === "object") {
              consultantCategory = consultantDoc.category.name || consultantDoc.category.title || "General";
            } else {
              consultantCategory = consultantDoc.category;
            }
          }
        }
      }

      return {
        _id: appt._id,
        client: clientName,
        consultant: consultantName,
        category: consultantCategory,
        date: appt.date,
        time: appt.startAt ? new Date(appt.startAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "",
        startAt: appt.startAt,
        status: appt.status,
      };
    }));

    // Calculate monthly revenue trends - using TRANSACTIONS
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthlyTrends = [];

    // Determine loop range based on viewType
    let loopStart, loopEnd, getMonthDate;

    if (viewType === "yearly") {
      // For yearly view, show all 12 months of the selected year
      loopStart = 0; // Jan
      loopEnd = 11;  // Dec
      getMonthDate = (i) => {
        const d = new Date(queryYear, i, 1);
        const end = new Date(queryYear, i + 1, 0, 23, 59, 59, 999);
        return { start: d, end };
      };
    } else {
      // For monthly view, show trends for the past 6 months ending at selected month
      loopStart = 5; // 5 months ago
      loopEnd = 0;   // Current month
      getMonthDate = (i) => {
        const mStart = new Date(queryYear, queryMonth - i, 1);
        const mEnd = new Date(queryYear, queryMonth - i + 1, 0, 23, 59, 59, 999);
        return { start: mStart, end: mEnd };
      };
    }

    // Adjust loop direction logic
    const iterateMonths = async () => {
      const results = [];
      if (viewType === "yearly") {
        for (let i = loopStart; i <= loopEnd; i++) {
          results.push(await processMonth(i));
        }
      } else {
        for (let i = loopStart; i >= loopEnd; i--) {
          results.push(await processMonth(i));
        }
      }
      return results;
    };

    const processMonth = async (i) => {
      const { start: monthStart, end: monthEnd } = getMonthDate(i);

      const [revenueResult, apptCount, cumulativeConsultants, cumulativeClients] = await Promise.all([
        Transaction.aggregate([
          {
            $match: {
              createdAt: { $gte: monthStart, $lte: monthEnd },
              status: "Success",
              type: "Payment"
            }
          },
          {
            $group: {
              _id: null,
              gmv: { $sum: "$amount" },
              platformRevenue: { $sum: "$platformFee" },
              consultantPayouts: { $sum: "$netAmount" }
            }
          },
        ]),
        // Appointment count for that month
        Appointment.countDocuments({
          $or: [
            { startAt: { $gte: monthStart, $lte: monthEnd } },
            { date: { $gte: monthStart.toISOString().split('T')[0], $lte: monthEnd.toISOString().split('T')[0] } }
          ]
        }),
        // Cumulative Consultants count up to end of month
        Consultant.countDocuments({ createdAt: { $lte: monthEnd } }),
        // Cumulative Clients count up to end of month
        Client.countDocuments({ createdAt: { $lte: monthEnd } })
      ]);

      const monthData = revenueResult[0] || { gmv: 0, platformRevenue: 0, consultantPayouts: 0 };
      return {
        name: monthNames[monthStart.getMonth()],
        gmv: monthData.gmv,
        revenue: monthData.platformRevenue,  // Platform revenue for backward compatibility
        consultantPayouts: monthData.consultantPayouts,
        appt: apptCount,
        consultants: cumulativeConsultants,
        clients: cumulativeClients
      };
    };

    const trendsData = await iterateMonths();
    monthlyTrends.push(...trendsData);

    // Calculate category performance with revenue, sessions, and growth
    // Note: startOfLastMonth and endOfLastMonth already declared at top of function

    // Dynamic Category Performance (Current vs Last Month)
    // Fetch all relevant appointments for the performance window
    const performanceAppointments = await Appointment.find({
      $or: [
        { startAt: { $gte: startOfLastMonth, $lte: endOfMonth } },
        { date: { $gte: startOfLastMonth.toISOString().split('T')[0], $lte: endOfMonth.toISOString().split('T')[0] } }
      ],
      status: { $in: ["Completed", "Upcoming"] }
    })
      .select("category consultant consultantSnapshot startAt date fee status")
      .populate("consultant", "category subcategory")
      .lean();

    const perfStats = {};

    // Helper to get category from appt
    const getCategory = (appt) => {
      let cat = appt.category || "General";
      if (cat === "General") {
        if (appt.consultantSnapshot?.category) {
          const snapCat = appt.consultantSnapshot.category;
          cat = typeof snapCat === 'object' ? (snapCat.name || snapCat.title || "General") : snapCat;
        } else if (appt.consultant?.category) {
          const dbCat = appt.consultant.category;
          cat = typeof dbCat === 'object' ? (dbCat.name || dbCat.title || "General") : dbCat;
        }
      }
      return cat || "General";
    };

    performanceAppointments.forEach(appt => {
      const cat = getCategory(appt);
      if (!perfStats[cat]) perfStats[cat] = { currentRevenue: 0, currentSessions: 0, lastRevenue: 0 };

      const apptDate = appt.startAt ? new Date(appt.startAt) : new Date(appt.date);
      const isCurrentMonth = apptDate >= startOfMonth && apptDate <= endOfMonth;
      const isLastMonth = apptDate >= startOfLastMonth && apptDate <= endOfLastMonth;

      if (isCurrentMonth) {
        if (appt.status === "Completed") {
          perfStats[cat].currentRevenue += (appt.fee || 0);
          perfStats[cat].currentSessions += 1;
        }
      } else if (isLastMonth) {
        if (appt.status === "Completed") {
          perfStats[cat].lastRevenue += (appt.fee || 0);
        }
      }
    });

    const categoryPerformance = Object.entries(perfStats).map(([name, stats]) => {
      const avgRate = stats.currentSessions > 0 ? Math.round(stats.currentRevenue / stats.currentSessions) : 0;
      const growth = stats.lastRevenue > 0
        ? Math.round(((stats.currentRevenue - stats.lastRevenue) / stats.lastRevenue) * 100)
        : 0;

      return {
        name,
        revenue: stats.currentRevenue,
        sessions: stats.currentSessions,
        rate: `₹${avgRate}/hr avg`,
        growth: `${growth >= 0 ? '+' : ''}${growth}%`
      };
    }).sort((a, b) => b.revenue - a.revenue); // Sort by revenue descending

    // Get top performing consultants (by revenue this month)
    const topConsultantsRaw = await Appointment.aggregate([
      {
        $match: {
          $or: [
            { startAt: { $gte: startOfMonth } },
            { date: { $gte: startOfMonth.toISOString().split('T')[0] } }
          ],
          status: "Completed"
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
      .populate("category", "title")
      .populate("subcategory", "title")
      .select("user category subcategory rating name firstName lastName")
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

      // Try to find name from User linkage first, then direct name fields
      const userName = details.user?.fullName || details.name ||
        (details.firstName ? `${details.firstName} ${details.lastName || ''}`.trim() : "Unknown Consultant");

      // Try to find category title from populated object, or use fallback
      let categoryName = "General";
      if (details.category && details.category.name) {
        categoryName = details.category.name;
      } else if (details.subcategory && details.subcategory.name) {
        categoryName = details.subcategory.name;
      } else if (typeof details.category === 'string') {
        // Fallback if population failed but string exists (unlikely given query)
        categoryName = details.category;
      }

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
        monthlyRevenue: currentStats.platformRevenue,  // Backward compatibility
      },
      // Enhanced revenue breakdown
      revenueBreakdown: {
        // This month
        monthlyGmv: currentStats.gmv,
        monthlyPlatformRevenue: currentStats.platformRevenue,
        monthlyConsultantPayouts: currentStats.consultantPayouts,
        monthlyTransactions: currentStats.transactionCount,
        monthlyGmvGrowth,
        monthlyPlatformGrowth,
        // Year to date
        yearlyGmv: yearStats.gmv,
        yearlyPlatformRevenue: yearStats.platformRevenue,
        yearlyConsultantPayouts: yearStats.consultantPayouts,
        yoyGrowth,
      },
      topCategories,
      recentAppointments,
      monthlyTrends,
      categoryPerformance,
      topConsultants,
      activityTrend,
    });
  } catch (err) {
    next(err);
  }
};



exports.consultantStats = async (req, res, next) => {
  try {
    const userId = req.user.id || req.user._id;
    const viewType = req.query.viewType || "monthly"; // "monthly" | "yearly"
    const queryMonth = req.query.month ? parseInt(req.query.month) - 1 : new Date().getMonth(); // 0-indexed
    const queryYear = req.query.year ? parseInt(req.query.year) : new Date().getFullYear();

    console.log(`📊 [Analytics] Fetching consultant stats for ${userId} - View: ${viewType}, Period: ${queryMonth + 1}/${queryYear}`);

    // Parse date ranges
    let startOfPeriod, endOfPeriod;
    if (viewType === "yearly") {
      startOfPeriod = new Date(queryYear, 0, 1);
      endOfPeriod = new Date(queryYear, 11, 31, 23, 59, 59, 999);
    } else {
      startOfPeriod = new Date(queryYear, queryMonth, 1);
      endOfPeriod = new Date(queryYear, queryMonth + 1, 0, 23, 59, 59, 999);
    }

    // "Today" is always "Real Today" for the "Today Appointments" card
    const today = new Date().toISOString().split("T")[0];
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    // Resolve Consultant Profile ID
    const ConsultantModel = require("../../../models/consultant.model").Consultant;
    const consultantProfile = await ConsultantModel.findOne({ user: userId }).populate("category");

    const consultantIds = [userId];
    if (consultantProfile) {
      consultantIds.push(consultantProfile._id);
    }

    // Cast IDs to ObjectId for Aggregation
    const mongoose = require("mongoose");
    const consultantObjectIds = consultantIds.map(id => new mongoose.Types.ObjectId(id));

    // 1. Total Appointments (Filtered by Period)
    const totalAppointments = await Appointment.countDocuments({
      consultant: { $in: consultantIds },
      status: "Completed",
      $or: [
        { startAt: { $gte: startOfPeriod, $lte: endOfPeriod } },
        { date: { $gte: startOfPeriod.toISOString().split('T')[0], $lte: endOfPeriod.toISOString().split('T')[0] } }
      ]
    });

    // 2. Today Appointments (Always Real Today)
    const todayAppointments = await Appointment.countDocuments({
      consultant: { $in: consultantIds },
      $or: [
        { startAt: { $gte: startOfDay, $lte: endOfDay } },
        { date: today }
      ]
    });

    // 3. Active Clients (Always Current)
    const activeClients = await require("../../../models/clientConsultant.model").countDocuments({ consultant: { $in: consultantIds }, status: "Active" });
    const inactiveClients = await require("../../../models/clientConsultant.model").countDocuments({ consultant: { $in: consultantIds }, status: "Inactive" });

    // 4. Revenue (Filtered by Period)
    // 4. Revenue (Filtered by Period) - Realized Revenue from Completed Appointments
    // 4. Revenue (Filtered by Period) - Realized Net Revenue from Completed Appointments
    const periodRevenueResult = await Transaction.aggregate([
      {
        $match: {
          consultant: { $in: consultantObjectIds },
          status: "Success",
          type: "Payment",
          createdAt: { $gte: startOfPeriod, $lte: endOfPeriod }
        }
      },
      {
        $lookup: {
          from: "appointments",
          localField: "appointment",
          foreignField: "_id",
          as: "appt"
        }
      },
      { $unwind: "$appt" },
      {
        $match: {
          "appt.status": "Completed"
        }
      },
      {
        $group: {
          _id: null,
          revenue: { $sum: "$netAmount" }
        }
      },
    ]);
    const periodRevenue = periodRevenueResult[0]?.revenue || 0;

    // 5. Total Lifetime Revenue (Unfiltered - generally expected in "Total Revenue" unless specifically "Monthly Revenue")
    // Wait, dashboard card says "Total Revenue". If I filter for August, should it show "Total Revenue in August"?
    // Usually yes, if the dashboard is filtered.
    // Let's return `periodRevenue` as the primary "value" for the revenue card, but label it "Revenue" in frontend maybe? 
    // The previous code returned `totalRevenue` (Lifetime) but the user asked for filters to work.
    // I will return `periodRevenue` for the filtered view.

    // 6. Trends (Dynamic based on selected period)
    const monthlyRevenueTrends = [];
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    // Determine loop logic
    // If Yearly: Show Jan-Dec of that year
    // If Monthly: Show 6 months ending at selected month
    let loopStart, loopEnd, getMonthDate;

    if (viewType === "yearly") {
      for (let i = 0; i < 12; i++) {
        const mStart = new Date(queryYear, i, 1);
        const mEnd = new Date(queryYear, i + 1, 0, 23, 59, 59, 990);
        const revenue = await getRevenueForRange(consultantObjectIds, mStart, mEnd);
        monthlyRevenueTrends.push({ name: monthNames[i], revenue });
      }
    } else {
      // Monthly view: Show selected month and 5 previous
      for (let i = 5; i >= 0; i--) {
        const mStart = new Date(queryYear, queryMonth - i, 1);
        const mEnd = new Date(queryYear, queryMonth - i + 1, 0, 23, 59, 59, 990);
        const revenue = await getRevenueForRange(consultantObjectIds, mStart, mEnd);
        monthlyRevenueTrends.push({ name: monthNames[mStart.getMonth()], revenue });
      }
    }

    // Helper to get revenue from Completed Appointments
    async function getRevenueForRange(ids, start, end) {
      const res = await Transaction.aggregate([
        {
          $match: {
            consultant: { $in: ids },
            type: "Payment",
            status: "Success",
            createdAt: { $gte: start, $lte: end }
          }
        },
        {
          $lookup: {
            from: "appointments",
            localField: "appointment",
            foreignField: "_id",
            as: "appt"
          }
        },
        { $unwind: "$appt" },
        {
          $match: { "appt.status": "Completed" }
        },
        { $group: { _id: null, rev: { $sum: "$netAmount" } } }
      ]);
      return res[0]?.rev || 0;
    }

    // 7. Activity Trend (Daily for Month, Monthly for Year)
    const activityTrend = [];
    if (viewType === "yearly") {
      // Monthly breakdown for the year
      for (let i = 0; i < 12; i++) {
        const mStart = new Date(queryYear, i, 1);
        const mEnd = new Date(queryYear, i + 1, 0, 23, 59, 59, 999);

        const count = await Appointment.countDocuments({
          consultant: { $in: consultantIds },
          status: { $in: ["Upcoming", "Completed", "Confirmed"] },
          $or: [
            { startAt: { $gte: mStart, $lte: mEnd } },
            { date: { $gte: mStart.toISOString().split('T')[0], $lte: mEnd.toISOString().split('T')[0] } }
          ]
        });
        activityTrend.push(count);
      }
    } else {
      // Daily breakdown for the month
      const daysInMonth = new Date(queryYear, queryMonth + 1, 0).getDate();
      for (let d = 1; d <= daysInMonth; d++) {
        const dStart = new Date(queryYear, queryMonth, d, 0, 0, 0, 0);
        const dEnd = new Date(queryYear, queryMonth, d, 23, 59, 59, 999);

        const count = await Appointment.countDocuments({
          consultant: { $in: consultantIds },
          status: { $in: ["Upcoming", "Completed", "Confirmed"] },
          $or: [
            { startAt: { $gte: dStart, $lte: dEnd } },
            { date: dStart.toISOString().split('T')[0] }
          ]
        });
        activityTrend.push(count);
      }
    }

    // ... (Rest of existing metrics calculations like completion rate, etc) ...

    const totalClients = activeClients + inactiveClients;
    const activePercent = totalClients > 0 ? Math.round((activeClients / totalClients) * 100) : 0;
    const inactivePercent = totalClients > 0 ? Math.round((inactiveClients / totalClients) * 100) : 0;

    // ... (Recent appointments logic - fine to keep "Recent" as absolute recent irrespective of filter? Or filter?)
    // "Recent Appointments" list usually implies "Latest". If I filter for last year, maybe I want to see appointments FROM last year.
    // Let's update `recentAppointments` to respect the filter too.

    const recentAppointmentsRaw = await Appointment.find({
      consultant: { $in: consultantIds },
      $or: [
        { startAt: { $gte: startOfPeriod, $lte: endOfPeriod } },
        { date: { $gte: startOfPeriod.toISOString().split('T')[0], $lte: endOfPeriod.toISOString().split('T')[0] } }
      ]
    })
      .sort({ startAt: -1 })
      .limit(5)
      .select("client date startAt status session category consultantSnapshot")
      .lean();

    // ... (formatting logic) ...
    const formattedRecent = await Promise.all(recentAppointmentsRaw.map(async (appt) => {
      let clientName = "Unknown Client";
      let clientAvatar = "https://via.placeholder.com/40";
      let clientDoc = await User.findById(appt.client).select("fullName avatar profileImage");
      if (!clientDoc) clientDoc = await require("../../../models/client.model").findById(appt.client).select("fullName avatar profileImage");
      if (clientDoc) {
        clientName = clientDoc.fullName;
        clientAvatar = clientDoc.avatar || clientDoc.profileImage || clientAvatar;
      }
      let displayCategory = "General";
      if (appt.consultantSnapshot?.category) {
        const snapCat = appt.consultantSnapshot.category;
        displayCategory = typeof snapCat === 'object' ? (snapCat.name || snapCat.title) : snapCat;
      } else if (consultantProfile?.category) {
        const pCat = consultantProfile.category;
        displayCategory = typeof pCat === 'object' ? (pCat.name || pCat.title) : pCat;
      }

      let consultantName = "Consultant";
      if (consultantProfile) {
        consultantName = consultantProfile.name || consultantProfile.fullName;
      } else {
        // Fallback or specific lookup if needed, but usually consultantProfile is available in scope or we can peek
        // Actually `consultantProfile` variable might not be in scope here directly if not fetched earlier.
        // Looking at lines 795, `consultantProfile` IS used. So it is available.
      }

      const dateObj = appt.startAt ? new Date(appt.startAt) : new Date();

      // Relative Date Logic
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
      const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
      const target = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate());

      let dateString = dateObj.toLocaleDateString("en-GB", { day: '2-digit', month: '2-digit', year: 'numeric' });
      if (target.getTime() === today.getTime()) dateString = "Today";
      else if (target.getTime() === tomorrow.getTime()) dateString = "Tomorrow";
      else if (target.getTime() === yesterday.getTime()) dateString = "Yesterday";

      return {
        id: appt._id,
        name: clientName,
        with: consultantName, // Use actual consultant name
        tag: displayCategory || "General",
        time: dateObj.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
        date: dateString, // Today, Tomorrow, Yesterday or DD/MM/YYYY
        status: appt.status,
        avatar: clientAvatar
      };
    }));


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

    // Response time (placeholder logic)
    const responseTime = 2; // hours

    // Rebooking rate logic
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const rebookedClientsResult = await Appointment.aggregate([
      {
        $match: {
          consultant: { $in: consultantIds },
          createdAt: { $gte: thirtyDaysAgo },
          status: "Completed"
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

    const totalUniqueClientsResult = await Appointment.distinct("client", {
      consultant: { $in: consultantIds },
      createdAt: { $gte: thirtyDaysAgo }
    });

    // Ensure totalUniqueClients is an array length or number
    const uniqueClientsCount = Array.isArray(totalUniqueClientsResult) ? totalUniqueClientsResult.length : 0;

    const rebookingRate = uniqueClientsCount > 0
      ? Math.round((rebookedClientsResult.length / uniqueClientsCount) * 100)
      : 0;

    // Session delta (simplified)
    const sessionsDeltaStr = "+0%";

    // Calculate deltas (optional - simplified for now, or could use prev period)
    const revenueDeltaStr = "+0%"; // Simplified for this iteration

    return sendSuccess(res, "Consultant stats fetched", {
      stats: [
        { id: "total", title: "Completed Appointments", value: String(totalAppointments), delta: "+0%", up: true },
        { id: "today", title: "Today Appointments", value: String(todayAppointments), delta: "+0%", up: true },
        { id: "active", title: "Active Clients", value: String(activeClients), delta: "+0%", up: true },
        { id: "revenue", title: "Total Revenue", value: `₹${periodRevenue.toLocaleString()}`, delta: revenueDeltaStr, up: true },
      ],
      clientStats: {
        total: totalClients,
        active: activeClients,
        inactive: inactiveClients,
        activePercent,
        inactivePercent
      },
      recentAppointments: formattedRecent,
      monthlyRevenueTrends,
      activityTrend,
      performance: {
        sessionCompletion: sessionCompletionRate,
        avgRating: parseFloat(avgRating.toFixed(1)),
        responseTime, // in hours
        rebookingRate
      },
      metrics: {
        monthlyRevenue: periodRevenue,
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
    const viewType = req.query.viewType || "monthly"; // "monthly" | "yearly"
    const queryMonth = req.query.month ? parseInt(req.query.month) - 1 : new Date().getMonth(); // 0-indexed
    const queryYear = req.query.year ? parseInt(req.query.year) : new Date().getFullYear();

    console.log(`📊 [Analytics] Fetching Client stats for ${userId} - View: ${viewType}, Period: ${queryMonth + 1}/${queryYear}`);

    // Parse date ranges
    let startOfPeriod, endOfPeriod;
    if (viewType === "yearly") {
      startOfPeriod = new Date(queryYear, 0, 1);
      endOfPeriod = new Date(queryYear, 11, 31, 23, 59, 59, 999);
    } else {
      startOfPeriod = new Date(queryYear, queryMonth, 1);
      endOfPeriod = new Date(queryYear, queryMonth + 1, 0, 23, 59, 59, 999);
    }

    const today = new Date();

    // 1. Total Appointments (In selected Period)
    const totalAppointments = await Appointment.countDocuments({
      client: userId,
      status: { $in: ["Upcoming", "Completed"] },
      $or: [
        { startAt: { $gte: startOfPeriod, $lte: endOfPeriod } },
        { date: { $gte: startOfPeriod.toISOString().split('T')[0], $lte: endOfPeriod.toISOString().split('T')[0] } }
      ]
    });

    const completedAppointments = await Appointment.countDocuments({
      client: userId,
      status: "Completed",
      $or: [
        { startAt: { $gte: startOfPeriod, $lte: endOfPeriod } },
        { date: { $gte: startOfPeriod.toISOString().split('T')[0], $lte: endOfPeriod.toISOString().split('T')[0] } }
      ]
    });

    // 2. Upcoming Appointments (In selected Period)
    // Note: If looking at past months, this will likely be 0, which is correct.
    const upcomingAppointments = await Appointment.countDocuments({
      client: userId,
      status: "Upcoming",
      $or: [
        { startAt: { $gte: startOfPeriod, $lte: endOfPeriod } },
        { date: { $gte: startOfPeriod.toISOString().split('T')[0], $lte: endOfPeriod.toISOString().split('T')[0] } }
      ]
    });

    // 3. My Consultants (Active) - This is a current state, usually not historical.
    // We'll keep it as "Currently Active Consultants" regardless of filter, or maybe filter those I had appointments with?
    // Let's keep it simple: "Active Consultants" is "Right Now".
    const myConsultants = await require("../../../models/clientConsultant.model").countDocuments({ client: userId, status: "Active" });

    const mongoose = require("mongoose");
    const userObjectId = new mongoose.Types.ObjectId(userId);

    // 4. Total Spent (In selected period)
    // Note: Transactions usually have 'createdAt'.
    const totalSpentResult = await Transaction.aggregate([
      {
        $match: {
          user: userObjectId,
          status: "Success",
          type: "Payment",
          createdAt: { $gte: startOfPeriod, $lte: endOfPeriod }
        }
      },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    const periodSpent = totalSpentResult[0]?.total || 0;

    // 5. Recent Appointments (In selected period)
    const recentAppointmentsRaw = await Appointment.find({
      client: userId,
      status: { $in: ["Upcoming", "Completed"] }, // Show all recent activity in that period
      $or: [
        { startAt: { $gte: startOfPeriod, $lte: endOfPeriod } },
        { date: { $gte: startOfPeriod.toISOString().split('T')[0], $lte: endOfPeriod.toISOString().split('T')[0] } }
      ]
    })
      .sort({ startAt: -1 })
      .limit(5)
      .select("consultant date startAt status category consultantSnapshot")
      .lean();

    // 6. Spending & Appointment Trends
    const monthlySpendingTrends = [];
    const monthlyApptTrends = []; // { name: 'Jan', total: 0, completed: 0 }
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    let loopStart, loopEnd, getMonthDate;
    // Helper to get spending
    async function getSpendingForRange(uid, start, end) {
      const res = await Transaction.aggregate([
        {
          $match: {
            user: uid,
            createdAt: { $gte: start, $lte: end },
            status: "Success",
            type: "Payment"
          }
        },
        { $group: { _id: null, total: { $sum: "$amount" } } }
      ]);
      return res[0]?.total || 0;
    }

    // Helper to get appointment counts
    async function getApptCountsForRange(uid, start, end) {
      const total = await Appointment.countDocuments({
        client: uid,
        status: { $in: ["Upcoming", "Completed"] },
        $or: [
          { startAt: { $gte: start, $lte: end } },
          { date: { $gte: start.toISOString().split('T')[0], $lte: end.toISOString().split('T')[0] } }
        ]
      });
      const completed = await Appointment.countDocuments({
        client: uid,
        status: "Completed",
        $or: [
          { startAt: { $gte: start, $lte: end } },
          { date: { $gte: start.toISOString().split('T')[0], $lte: end.toISOString().split('T')[0] } }
        ]
      });
      return { total, completed };
    }

    if (viewType === "yearly") {
      for (let i = 0; i < 12; i++) {
        const mStart = new Date(queryYear, i, 1);
        const mEnd = new Date(queryYear, i + 1, 0, 23, 59, 59, 990);

        const spent = await getSpendingForRange(userObjectId, mStart, mEnd);
        monthlySpendingTrends.push({ name: monthNames[i], value: spent });

        const { total, completed } = await getApptCountsForRange(userId, mStart, mEnd);
        monthlyApptTrends.push({ name: monthNames[i], total, completed });
      }
    } else {
      // Monthly view: Show selected month and 5 previous
      for (let i = 5; i >= 0; i--) {
        const mStart = new Date(queryYear, queryMonth - i, 1);
        const mEnd = new Date(queryYear, queryMonth - i + 1, 0, 23, 59, 59, 990);

        const spent = await getSpendingForRange(userObjectId, mStart, mEnd);
        monthlySpendingTrends.push({ name: monthNames[mStart.getMonth()], value: spent });

        const { total, completed } = await getApptCountsForRange(userId, mStart, mEnd);
        monthlyApptTrends.push({ name: monthNames[mStart.getMonth()], total, completed });
      }
    }

    // Activity Trend (Daily for Month, Monthly for Year)
    const activityTrend = [];
    if (viewType === "yearly") {
      for (let i = 0; i < 12; i++) {
        const mStart = new Date(queryYear, i, 1);
        const mEnd = new Date(queryYear, i + 1, 0, 23, 59, 59, 999);
        const count = await Appointment.countDocuments({
          client: userId,
          status: { $in: ["Upcoming", "Completed", "Confirmed"] },
          $or: [
            { startAt: { $gte: mStart, $lte: mEnd } },
            { date: { $gte: mStart.toISOString().split('T')[0], $lte: mEnd.toISOString().split('T')[0] } }
          ]
        });
        activityTrend.push(count);
      }
    } else {
      const daysInMonth = new Date(queryYear, queryMonth + 1, 0).getDate();
      for (let d = 1; d <= daysInMonth; d++) {
        const dStart = new Date(queryYear, queryMonth, d, 0, 0, 0, 0);
        const dEnd = new Date(queryYear, queryMonth, d, 23, 59, 59, 999);
        const count = await Appointment.countDocuments({
          client: userId,
          status: { $in: ["Upcoming", "Completed", "Confirmed"] },
          $or: [
            { startAt: { $gte: dStart, $lte: dEnd } },
            { date: dStart.toISOString().split('T')[0] }
          ]
        });
        activityTrend.push(count);
      }
    }

    const User = require("../../../models/user.model");
    const Consultant = require("../../../models/consultant.model").Consultant;

    const formattedRecent = await Promise.all(recentAppointmentsRaw.map(async (appt) => {
      let displayTime = "";
      let formattedDate = "";
      if (appt.startAt) {
        const d = new Date(appt.startAt);
        const timeStr = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
        displayTime = timeStr; // Just time

        // Relative Date Logic
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
        const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
        const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());

        formattedDate = d.toLocaleDateString("en-GB", { day: '2-digit', month: '2-digit', year: 'numeric' });
        if (target.getTime() === today.getTime()) formattedDate = "Today";
        else if (target.getTime() === tomorrow.getTime()) formattedDate = "Tomorrow";
        else if (target.getTime() === yesterday.getTime()) formattedDate = "Yesterday";
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
        cDoc = await Consultant.findById(appt.consultant).select("name firstName lastName fullName email image category");
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

      let displayCategory = "General";
      if (cDoc && cDoc.category) {
        if (typeof cDoc.category === 'object') {
          displayCategory = cDoc.category.name || cDoc.category.title || "General";
        } else {
          displayCategory = cDoc.category;
        }
      } else if (appt.consultantSnapshot && appt.consultantSnapshot.category) {
        const snapCat = appt.consultantSnapshot.category;
        displayCategory = typeof snapCat === 'object' ? (snapCat.name || snapCat.title) : snapCat;
      }

      if (cAvatar.includes("via.placeholder")) {
        cAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(cName)}&background=random`;
      }

      // Get Client Name (Me)
      let clientName = "You";
      // We can fetch it once outside loop, or just use "You" as fallback.
      if (req.user && req.user.firstName) {
        // req.user might be available if middleware populated it
        // But usually we don't have req in this scope if it's a helper?
        // It is `exports.getClientStats = async (req, res, next)` so `req` is available.
        // But `formattedRecent` is inside.
        if (req.user) clientName = req.user.fullName || req.user.name;
      }

      return {
        id: appt._id,
        name: cName,
        with: clientName,
        tag: displayCategory || "General",
        time: displayTime,
        date: formattedDate,
        status: appt.status,
        avatar: cAvatar
      };
    }));

    return sendSuccess(res, "Client stats fetched", {
      stats: [
        { id: "total", title: "Total Appointments", value: String(totalAppointments), delta: "+0%", up: true },
        { id: "completed", title: "Completed Sessions", value: String(completedAppointments), delta: "+0%", up: true },
        { id: "upcoming", title: "Upcoming Appointments", value: String(upcomingAppointments), delta: "+0%", up: true },
      ],
      recentAppointments: formattedRecent,
      monthlySpendingTrends,
      monthlyApptTrends,
      activityTrend
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

    const totalAppointments = await Appointment.countDocuments({ client: userId, status: { $in: ["Upcoming", "Completed"] } });
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
      .select("consultant date startAt status category consultantSnapshot")
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
        { id: "consultants", title: "Active Consultants", value: String(myConsultants), delta: "+0%", up: true },

      ],
      recentAppointments: formattedRecent,
      monthlySpendingTrends: [] // Placeholder as the calculation logic seems to be missing
    });
  } catch (err) {
    console.error("❌ [Analytics] Error fetching client stats by ID:", err);
    next(err);
  }
};
