import React from "react";
import { RefreshCw, Download } from "lucide-react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import DashboardAPI from "@/api/dashboard.api";

// design reference (will be served from your environment)
const designRef = "/mnt/data/Screenshot 2025-11-21 142130.png";

const AnalyticsDashboard: React.FC = () => {
  const [viewType, setViewType] = React.useState<"monthly" | "yearly">("monthly");
  const [selectedDate, setSelectedDate] = React.useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [selectedYear, setSelectedYear] = React.useState(new Date().getFullYear());
  const [exporting, setExporting] = React.useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["consultant-analytics", viewType, selectedDate, selectedYear],
    queryFn: () => {
      const [year, month] = selectedDate.split("-").map(Number);
      return DashboardAPI.getConsultantStats({
        viewType,
        month: viewType === "monthly" ? month : undefined,
        year: viewType === "monthly" ? year : selectedYear,
      });
    },
  });

  const statsData = data || {};
  const payoutSummary = statsData.payoutSummary || {};

  // Map API data to UI requirements
  const months = statsData.monthlyRevenueTrends || [];
  const weeklyAppointments = statsData.weeklyAppointments || [0, 0, 0, 0, 0, 0, 0];
  const performance = statsData.performance || {
    sessionCompletion: 0,
    avgRating: 0,
    responseTime: 0,
    rebookingRate: 0,
  };
  const metrics = statsData.metrics || {
    monthlyRevenue: 0,
    monthlyRevenueDelta: "+0%",
    totalSessions: 0,
    totalSessionsDelta: "+0%",
  };

  // Find dynamic max values for charts
  const maxRevenue = Math.max(...months.map((m: any) => m.revenue), 1);
  const maxAppt = Math.max(...weeklyAppointments, 1);

  const fadeUp = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0, transition: { duration: 0.28 } },
  };

  if (isLoading) {
    return <div className="p-6 text-center">Loading analytics...</div>;
  }

  return (
    <div className="min-h-screen bg-white p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-gray-800">Analytics</h2>
          <p className="text-sm text-gray-500">Home &gt; Analytics</p>
        </div>
        <div className="flex items-center gap-3">
          {/* View Toggle */}
          <div className="flex bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setViewType("monthly")}
              className={`px-3 py-1 text-sm font-medium rounded-md transition ${viewType === "monthly" ? "bg-white shadow text-indigo-600" : "text-gray-500 hover:text-gray-700"
                }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setViewType("yearly")}
              className={`px-3 py-1 text-sm font-medium rounded-md transition ${viewType === "yearly" ? "bg-white shadow text-indigo-600" : "text-gray-500 hover:text-gray-700"
                }`}
            >
              Yearly
            </button>
          </div>

          {/* Date Selector */}
          {viewType === "monthly" ? (
            <input
              type="month"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            />
          ) : (
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white min-w-[100px]"
            >
              {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          )}

          <button
            onClick={() => refetch()}
            className="p-2 border rounded-md hover:bg-gray-100 transition"
          >
            <RefreshCw size={16} />
          </button>
          <button
            onClick={async () => {
              setExporting(true);
              try {
                const [year, month] = selectedDate.split("-").map(Number);
                const res = await DashboardAPI.getConsultantStatsExport({
                  viewType,
                  month: viewType === "monthly" ? month : undefined,
                  year: viewType === "monthly" ? year : selectedYear,
                });
                const blob = res.data;
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.href = url;
                link.download = `consultant-analytics-${viewType === "monthly" ? selectedDate : selectedYear}.csv`;
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
            className="p-2 border rounded-md hover:bg-gray-100 transition flex items-center gap-2 disabled:opacity-50"
          >
            <Download size={16} />
            {exporting ? "Exporting..." : "Export CSV"}
          </button>
        </div>
      </div>

      {/* Top metric cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <motion.div variants={fadeUp} initial="hidden" animate="show" className="bg-white rounded-lg p-4 shadow-sm border flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500">Monthly Revenue</p>
            <h3 className="text-xl font-semibold">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(metrics.monthlyRevenue)}</h3>
          </div>
          <div className="flex flex-col items-end">
            <div className={`text-sm font-semibold ${metrics.monthlyRevenueDelta.includes('-') ? 'text-red-600' : 'text-green-600'}`}>{metrics.monthlyRevenueDelta}</div>
            {/* tiny sparkline */}
            <svg width="140" height="36" viewBox="0 0 140 36" className="mt-2">
              <polyline fill="none" stroke="#f472b6" strokeWidth="2" points="0,24 20,18 40,20 60,16 80,18 100,20 120,14 140,6" />
            </svg>
          </div>
        </motion.div>

        <motion.div variants={fadeUp} initial="hidden" animate="show" className="bg-white rounded-lg p-4 shadow-sm border flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500">Total Sessions</p>
            <h3 className="text-xl font-semibold">{metrics.totalSessions}</h3>
          </div>
          <div className="flex flex-col items-end">
            <div className={`text-sm font-semibold ${metrics.totalSessionsDelta.includes('-') ? 'text-red-600' : 'text-green-600'}`}>{metrics.totalSessionsDelta}</div>
            <svg width="140" height="36" viewBox="0 0 140 36" className="mt-2">
              <polyline fill="none" stroke="#60a5fa" strokeWidth="2" points="0,20 20,20 40,18 60,18 80,16 100,16 120,14 140,12" />
            </svg>
          </div>
        </motion.div>
      </div>

      {/* Payout & Balance Card */}
      <motion.div variants={fadeUp} initial="hidden" animate="show" className="bg-white rounded-xl border shadow-sm p-4">
        <h4 className="font-semibold text-gray-800 mb-3">Payout & Balance</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="border rounded-lg p-3">
            <p className="text-xs text-gray-500">Total Earnings</p>
            <p className="text-lg font-bold text-gray-900">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(payoutSummary.totalEarnings || 0)}</p>
          </div>
          <div className="border rounded-lg p-3">
            <p className="text-xs text-gray-500">Total Paid Out</p>
            <p className="text-lg font-bold text-gray-900">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(payoutSummary.totalPaidOut || 0)}</p>
          </div>
          <div className="border rounded-lg p-3 bg-amber-50">
            <p className="text-xs text-gray-500">Remaining Balance</p>
            <p className="text-lg font-bold text-amber-700">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(payoutSummary.remainingBalance || 0)}</p>
          </div>
        </div>
      </motion.div>

      {/* Badge + Export */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-md font-semibold text-gray-800">Analytics</h3>
          <span className="text-xs bg-orange-100 text-orange-700 font-medium px-2 py-0.5 rounded-md">04</span>
        </div>
      </div>

      {/* Main grid: left big area + right metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-4">
          <motion.div variants={fadeUp} initial="hidden" animate="show" className="bg-white rounded-xl border shadow-sm p-4">
            <h4 className="font-semibold text-gray-800 mb-2">Revenue Trend</h4>
            <p className="text-sm text-gray-500 mb-3">Monthly revenue over the last 6 months</p>

            {/* Simple area chart using SVG (static) */}
            <div className="w-full h-56 bg-white rounded-md p-2">
              <svg viewBox="0 0 600 240" className="w-full h-full">
                <defs>
                  <linearGradient id="areaGrad" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#c7b9ff" stopOpacity="0.9" />
                    <stop offset="100%" stopColor="#c7b9ff" stopOpacity="0.25" />
                  </linearGradient>
                </defs>
                {/* background grid lines */}
                {[0, 1, 2, 3, 4].map((i) => (
                  <line key={i} x1={40} x2={560} y1={40 + i * 40} y2={40 + i * 40} stroke="#e5e7eb" strokeWidth={1} />
                ))}

                {/* compute points */}
                {(() => {
                  const w = 520; // chart width
                  const h = 160; // chart height
                  const left = 40;
                  const top = 20;
                  const pts = months.map((m: any, i: number) => {
                    const x = left + (i * w) / Math.max(months.length - 1, 1);
                    const y = top + (1 - (m.revenue || 0) / maxRevenue) * h;
                    return `${x},${y}`;
                  });
                  const areaPath = `M ${left + 0},${top + h} L ${pts.join(" ")} L ${left + w},${top + h} Z`;
                  const linePath = `M ${pts.join(" L ")}`;

                  return (
                    <g>
                      <path d={areaPath} fill="url(#areaGrad)" stroke="none" />
                      <path d={linePath} fill="none" stroke="#6b46c1" strokeWidth={2} />
                    </g>
                  );
                })()}

                {/* x labels */}
                {months.map((m: any, i: number) => (
                  <text key={m.name || i} x={40 + (i * 520) / Math.max(months.length - 1, 1)} y={210} fontSize={12} fill="#6b7280" textAnchor="middle">
                    {m.name}
                  </text>
                ))}

                {/* legend */}
                <text x={300} y={230} fontSize={12} fill="#6b7280" textAnchor="middle">Revenue (₹)</text>
              </svg>
            </div>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <motion.div variants={fadeUp} initial="hidden" animate="show" className="bg-white rounded-xl border shadow-sm p-4">
              <h5 className="font-semibold text-gray-800 mb-2">Appointment Statistics</h5>
              <p className="text-sm text-gray-500 mb-3">Weekly appointment breakdown</p>

              {/* simple bar chart */}
              <div className="h-44 flex items-end gap-2 px-2">
                {weeklyAppointments.map((v: number, i: number) => (
                  <div key={i} className="flex-1 flex flex-col items-center">
                    <div style={{ height: `${(v / maxAppt) * 100}%` }} className="w-full bg-green-400 rounded-t-md" />
                    <div className="text-xs text-gray-600 mt-2">{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][i]}</div>
                  </div>
                ))}
              </div>
              <div className="text-xs text-green-400 mt-2">Appointments</div>
            </motion.div>

            <motion.div variants={fadeUp} initial="hidden" animate="show" className="bg-white rounded-xl border shadow-sm p-4">
              <h5 className="font-semibold text-gray-800 mb-2">Performance Metrics</h5>
              <p className="text-sm text-gray-500 mb-3">Key performance indicators</p>

              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs text-gray-600">
                    <span>Session Completion Rate</span>
                    <span>{performance.sessionCompletion}%</span>
                  </div>
                  <div className="w-full bg-gray-100 h-2 rounded-full mt-1">
                    <div className="h-2 rounded-full" style={{ width: `${performance.sessionCompletion}%`, background: '#16a34a' }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs text-gray-600">
                    <span>Average Client Rating</span>
                    <span>{performance.avgRating}/5.0</span>
                  </div>
                  <div className="w-full bg-gray-100 h-2 rounded-full mt-1">
                    <div className="h-2 rounded-full" style={{ width: `${(performance.avgRating / 5) * 100}%`, background: '#3b82f6' }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs text-gray-600">
                    <span>Response Time</span>
                    <span>&lt; {performance.responseTime} hours</span>
                  </div>
                  <div className="w-full bg-gray-100 h-2 rounded-full mt-1">
                    <div className="h-2 rounded-full" style={{ width: `60%`, background: '#a78bfa' }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs text-gray-600">
                    <span>Rebooking Rate</span>
                    <span>{performance.rebookingRate}%</span>
                  </div>
                  <div className="w-full bg-gray-100 h-2 rounded-full mt-1">
                    <div className="h-2 rounded-full" style={{ width: `${performance.rebookingRate}%`, background: '#fb923c' }} />
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* right column: small summary card referencing uploaded design */}
        <motion.div variants={fadeUp} initial="hidden" animate="show" className="bg-white rounded-xl border shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-gray-800">Summary</h4>
            <div className="bg-gray-200 w-20 h-12 rounded-md flex items-center justify-center text-xs text-gray-500 italic">Ref Image</div>
          </div>

          <div className="space-y-3">
            <div className="text-sm text-gray-600">Monthly Revenue</div>
            <div className="text-lg font-semibold">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(metrics.monthlyRevenue)}</div>
            <div className={`text-sm ${metrics.monthlyRevenueDelta.includes('-') ? 'text-red-600' : 'text-green-600'}`}>{metrics.monthlyRevenueDelta} vs last month</div>

            <div className="border-t pt-3">
              <div className="text-sm text-gray-600">Active Clients</div>
              <div className="text-lg font-semibold">{statsData.clientStats?.active || 0}</div>
            </div>

            <div className="border-t pt-3">
              <div className="text-sm text-gray-600">Total Appointments</div>
              <div className="text-lg font-semibold">{metrics.totalSessions}</div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
