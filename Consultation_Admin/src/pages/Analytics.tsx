import React, { useState } from "react";
import { ArrowUpRight, ArrowDownRight, RefreshCw, TrendingUp, DollarSign, Users, Briefcase, Calendar, Download } from "lucide-react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import AnalyticsAPI from "../api/analytics.api";

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
};

const AnalyticsDashboard: React.FC = () => {
  const [viewType, setViewType] = useState<"monthly" | "yearly">("monthly");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1); // 1-indexed for display/value

  const [exporting, setExporting] = useState(false);
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin-analytics", viewType, selectedYear, selectedMonth],
    queryFn: () => {
      return AnalyticsAPI.overview({
        viewType,
        year: selectedYear,
        month: viewType === "monthly" ? selectedMonth : undefined,
      });
    },
  });

  console.log("ddata", data?.data.topConsultants);
  const analyticsData = data?.data || {};
  const revenueBreakdown = analyticsData.revenueBreakdown || {};
  const payoutSummary = analyticsData.payoutSummary || {};
  const categoryData = analyticsData.categoryPerformance || [];
  const consultants = analyticsData.topConsultants || [];
  const months = analyticsData.monthlyTrends || [];
  const cards = analyticsData.cards || {};

  // Safe calculation for max revenue to prevent NaN
  const maxMonthRevenue = Math.max(...months.map((m: any) => (m.gmv || m.revenue || 0)), 1);

  const fadeUp = {
    hidden: { opacity: 0, y: 16 },
    show: { opacity: 1, y: 0, transition: { duration: 0.28 } },
  };

  // Generate Year Options (last 5 years)
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  // Generate Month Options
  const monthOptions = [
    { value: 1, label: "January" }, { value: 2, label: "February" }, { value: 3, label: "March" },
    { value: 4, label: "April" }, { value: 5, label: "May" }, { value: 6, label: "June" },
    { value: 7, label: "July" }, { value: 8, label: "August" }, { value: 9, label: "September" },
    { value: 10, label: "October" }, { value: 11, label: "November" }, { value: 12, label: "December" }
  ];

  if (isLoading) {
    return <div className="p-6 text-center">Loading analytics...</div>;
  }

  return (
    <div className="min-h-screen bg-white p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-gray-800">Analytics Dashboard</h2>
          <p className="text-sm text-gray-500">Home &gt; Analytics</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">

          {/* View Type Toggle */}
          <div className="bg-white border rounded-md p-1 flex items-center">
            <button
              onClick={() => setViewType("monthly")}
              className={`px-3 py-1.5 text-sm font-medium rounded ${viewType === "monthly" ? "bg-blue-50 text-blue-600" : "text-gray-600 hover:bg-gray-50"}`}
            >
              Monthly
            </button>
            <button
              onClick={() => setViewType("yearly")}
              className={`px-3 py-1.5 text-sm font-medium rounded ${viewType === "yearly" ? "bg-blue-50 text-blue-600" : "text-gray-600 hover:bg-gray-50"}`}
            >
              Yearly
            </button>
          </div>

          {/* Month Selector (Only for Monthly View) */}
          {viewType === "monthly" && (
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm"
            >
              {monthOptions.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          )}

          {/* Year Selector */}
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm"
          >
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>

          <button
            onClick={() => refetch()}
            className="p-2 border rounded-md hover:bg-gray-100 transition flex items-center gap-2 bg-white"
          >
            <RefreshCw size={16} />
          </button>
          <button
            onClick={async () => {
              setExporting(true);
              try {
                const res = await AnalyticsAPI.overviewExport({
                  viewType,
                  year: selectedYear,
                  month: viewType === "monthly" ? selectedMonth : undefined,
                });
                const blob = res.data;
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.href = url;
                link.download = `analytics-overview-${selectedYear}-${String(selectedMonth).padStart(2, "0")}.csv`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);
              } catch (e) {
                console.error("Export failed", e);
              } finally {
                setExporting(false);
              }
            }}
            disabled={exporting}
            className="p-2 border rounded-md hover:bg-gray-100 transition flex items-center gap-2 bg-white disabled:opacity-50"
          >
            <Download size={16} />
            {exporting ? "Exporting..." : "Export CSV"}
          </button>
        </div>
      </div>

      {/* Revenue Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* GMV Card */}
        <motion.div variants={fadeUp} initial="hidden" animate="show" className="bg-white rounded-xl border shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <DollarSign className="h-5 w-5 text-blue-600" />
            </div>
            <span className={`text-sm font-medium flex items-center gap-1 ${revenueBreakdown.monthlyGmvGrowth?.includes('-') ? 'text-red-600' : 'text-green-600'}`}>
              {revenueBreakdown.monthlyGmvGrowth?.includes('-') ? <ArrowDownRight className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
              {revenueBreakdown.monthlyGmvGrowth || "0%"}
            </span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(revenueBreakdown.monthlyGmv || 0)}</p>
          <p className="text-sm text-gray-500 mt-1">Monthly GMV</p>
        </motion.div>

        {/* Platform Revenue Card */}
        <motion.div variants={fadeUp} initial="hidden" animate="show" className="bg-white rounded-xl border shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <TrendingUp className="h-5 w-5 text-green-600" />
            </div>
            <span className={`text-sm font-medium flex items-center gap-1 ${revenueBreakdown.monthlyPlatformGrowth?.includes('-') ? 'text-red-600' : 'text-green-600'}`}>
              {revenueBreakdown.monthlyPlatformGrowth?.includes('-') ? <ArrowDownRight className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
              {revenueBreakdown.monthlyPlatformGrowth || "0%"}
            </span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(revenueBreakdown.monthlyPlatformRevenue || 0)}</p>
          <p className="text-sm text-gray-500 mt-1">Platform Revenue</p>
        </motion.div>

        {/* Consultant Payouts */}
        <motion.div variants={fadeUp} initial="hidden" animate="show" className="bg-white rounded-xl border shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Briefcase className="h-5 w-5 text-purple-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(revenueBreakdown.monthlyConsultantPayouts || 0)}</p>
          <p className="text-sm text-gray-500 mt-1">Consultant Payouts</p>
        </motion.div>

        {/* Transactions */}
        <motion.div variants={fadeUp} initial="hidden" animate="show" className="bg-white rounded-xl border shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Users className="h-5 w-5 text-orange-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{revenueBreakdown.monthlyTransactions || 0}</p>
          <p className="text-sm text-gray-500 mt-1">Transactions This Month</p>
        </motion.div>
      </div>

      {/* Payout Summary & Remaining Balance */}
      <motion.div variants={fadeUp} initial="hidden" animate="show" className="bg-white rounded-xl border shadow-sm p-5 mb-6">
        <h4 className="font-semibold text-gray-800 mb-4">Payout Section</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="border rounded-lg p-4">
            <p className="text-sm text-gray-500">Total Consultant Earnings</p>
            <p className="text-xl font-bold text-gray-900">{formatCurrency(payoutSummary.totalEarnings || 0)}</p>
          </div>
          <div className="border rounded-lg p-4">
            <p className="text-sm text-gray-500">Total Paid Out</p>
            <p className="text-xl font-bold text-gray-900">{formatCurrency(payoutSummary.totalPaidOut || 0)}</p>
          </div>
          <div className="border rounded-lg p-4 bg-amber-50">
            <p className="text-sm text-gray-500">Remaining Balance</p>
            <p className="text-xl font-bold text-amber-700">{formatCurrency(payoutSummary.remainingBalance || 0)}</p>
          </div>
        </div>
      </motion.div>

      {/* YTD Summary */}
      <motion.div variants={fadeUp} initial="hidden" animate="show" className="bg-blue-700 rounded-xl p-5 mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold mb-1 text-white">Year to Date Performance</h3>
            <p className="text-blue-200 text-sm">Cumulative revenue for {new Date().getFullYear()}</p>
          </div>
          <div className="flex gap-8">
            <div>
              <p className="text-2xl font-bold text-white">{formatCurrency(revenueBreakdown.yearlyGmv || 0)}</p>
              <p className="text-blue-200 text-sm">Total GMV</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{formatCurrency(revenueBreakdown.yearlyPlatformRevenue || 0)}</p>
              <p className="text-blue-200 text-sm">Platform Revenue</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold text-white">{revenueBreakdown.yoyGrowth || "0%"}</span>
              <span className="text-blue-200 text-sm">YoY</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Main layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          {/* Revenue Trend Card */}
          <motion.div variants={fadeUp} initial="hidden" animate="show" className="bg-white rounded-xl border shadow-sm p-5">
            <h4 className="font-semibold text-gray-800">Revenue Trend (6 Months)</h4>
            <p className="text-sm text-gray-500 mb-4">GMV and platform revenue by month</p>

            <div className="space-y-3">
              {months.map((m: any) => {
                const val = m.gmv || m.revenue || 0;
                const widthPercent = maxMonthRevenue > 0 ? Math.round((val / maxMonthRevenue) * 100) : 0;

                return (
                  <div key={m.name} className="flex items-center gap-4">
                    <div className="w-14 text-sm text-gray-700 font-medium">{m.name}</div>
                    <div className="flex-1">
                      <div className="relative bg-gray-100 h-6 rounded-full overflow-hidden">
                        <div
                          className="absolute top-0 left-0 h-6 rounded-full bg-blue-600"
                          style={{ width: `${widthPercent}%` }}
                        />
                      </div>
                    </div>
                    <div className="w-28 text-right text-sm text-gray-700 font-medium">
                      {formatCurrency(val)}
                    </div>
                    <div className="w-20 text-sm text-gray-500 text-right">{m.appt} apt</div>
                  </div>
                );
              })}
            </div>
          </motion.div>

          {/* Category Performance Card */}
          <motion.div variants={fadeUp} initial="hidden" animate="show" className="bg-white rounded-xl border shadow-sm p-5">
            <h4 className="font-semibold text-gray-800">Category Performance</h4>
            <p className="text-sm text-gray-500 mb-4">Revenue and growth by consultation category</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {categoryData.map((c: any) => (
                <div key={c.name} className="flex items-center justify-between border rounded-lg p-3 hover:bg-gray-50 transition">
                  <div>
                    <p className="font-medium text-gray-800">{c.name}</p>
                    <p className="text-sm text-gray-500">{formatCurrency(c.revenue)} • {c.sessions} sessions</p>
                  </div>
                  <div className={`text-sm font-semibold px-2 py-1 rounded-md ${c.growth?.includes('-') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                    {c.growth}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Right column: Top Performing Consultants */}
        <motion.div variants={fadeUp} initial="hidden" animate="show" className="bg-white rounded-xl border shadow-sm p-5">
          <h4 className="font-semibold text-gray-800">Top Consultants</h4>
          <p className="text-sm text-gray-500 mb-4">Highest revenue this month</p>

          <div className="space-y-3">
            {consultants.map((c: any) => (
              <div key={c.rank} className="flex items-center justify-between border-b last:border-0 pb-3">
                <div className="flex items-center gap-3">
                  <span className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-semibold ${c.rank === 1 ? 'bg-yellow-100 text-yellow-700' : c.rank === 2 ? 'bg-gray-200 text-gray-700' : c.rank === 3 ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600'}`}>
                    {c.rank}
                  </span>
                  <div>
                    <p className="font-medium text-gray-800">{c.name}</p>
                    <p className="text-xs text-gray-500">{c.category} • ★ {c.rating}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-green-700 font-semibold">{formatCurrency(c.revenue)}</p>
                  <p className="text-xs text-gray-500">{c.sessions} sessions</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;

