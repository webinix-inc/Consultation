import React from "react";
import { ArrowUpRight, RefreshCw, Download } from "lucide-react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import AnalyticsAPI from "../api/analytics.api";

// Local screenshot the user uploaded (developer: transform this path to a url in your environment)
const screenshotPath = "/mnt/data/Screenshot 2025-11-21 142640.png";

const AnalyticsDashboard: React.FC = () => {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin-analytics"],
    queryFn: AnalyticsAPI.overview,
  });

  const analyticsData = data?.data || {};

  const categoryData = analyticsData.categoryPerformance || [];
  const consultants = analyticsData.topConsultants || [];
  const months = analyticsData.monthlyTrends || [];

  const maxMonthRevenue = Math.max(...months.map((m: any) => m.revenue), 1);
  const maxCategoryRevenue = Math.max(...categoryData.map((c: any) => c.revenue), 1);

  const fadeUp = {
    hidden: { opacity: 0, y: 16 },
    show: { opacity: 1, y: 0, transition: { duration: 0.28 } },
  };

  if (isLoading) {
    return <div className="p-6 text-center">Loading analytics...</div>;
  }

  return (
    <div className="min-h-screen bg-white p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
        <div>
          <h2 className="text-2xl font-semibold text-gray-800">Analytics</h2>
          <p className="text-sm text-gray-500">Home &gt; Analytics</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => refetch()}
            className="p-2 border rounded-md hover:bg-gray-100 transition"
          >
            <RefreshCw size={16} />
          </button>
          
        </div>
      </div>

      {/* Small analytics label with badge */}
      <div className="flex items-center gap-2 mb-6">
        <h3 className="text-md font-semibold text-gray-800">Analytics</h3>
        <span className="text-xs bg-orange-100 text-orange-700 font-medium px-2 py-0.5 rounded-md">04</span>
      </div>

      {/* Main layout -- left: revenue trend + category; right: top consultants */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          {/* Revenue Trend Card */}
          <motion.div variants={fadeUp} initial="hidden" animate="show" className="bg-white rounded-xl border shadow-sm p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h4 className="font-semibold text-gray-800">Revenue Trend (6 Months)</h4>
                <p className="text-sm text-gray-500">Monthly revenue and appointment growth</p>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {months.map((m: any) => {
                const widthPercent = Math.round((m.revenue / maxMonthRevenue) * 100);
                return (
                  <div key={m.name} className="flex items-center gap-4">
                    <div className="w-14 text-sm text-gray-700">{m.name}</div>
                    <div className="flex-1">
                      <div className="relative bg-gray-100 h-4 rounded-full overflow-hidden">
                        <div
                          className="absolute top-0 left-0 h-4 rounded-full bg-black"
                          style={{ width: `${widthPercent}%` }}
                        />
                      </div>
                    </div>
                    <div className="w-28 text-right text-sm text-gray-700 font-medium">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(m.revenue)}</div>
                    <div className="w-20 text-sm text-gray-500 text-right">{m.appt} apt</div>
                  </div>
                );
              })}
            </div>
          </motion.div>

          {/* Category Performance Card */}
          <motion.div variants={fadeUp} initial="hidden" animate="show" className="bg-white rounded-xl border shadow-sm p-5">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-gray-800">Category Performance</h4>
                <p className="text-sm text-gray-500">Revenue and growth by consultation category</p>
              </div>
              <div className="text-sm text-gray-500"> <ArrowUpRight size={16} /> </div>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              {categoryData.map((c: any) => {
                const pct = Math.round((c.revenue / maxCategoryRevenue) * 100);
                return (
                  <div key={c.name} className="flex items-center justify-between border rounded-lg p-3 hover:bg-gray-50 transition">
                    <div>
                      <p className="font-medium text-gray-800">{c.name}</p>
                      <p className="text-sm text-gray-500">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(c.revenue)} • {c.sessions} sessions • {c.rate}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-green-700 bg-green-100 px-2 py-1 rounded-md">{c.growth}</div>
                      <div className="text-xs text-gray-400 mt-1">{pct}% of top</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </div>

        {/* Right column: Top Performing Consultants */}
        <motion.div variants={fadeUp} initial="hidden" animate="show" className="bg-white rounded-xl border shadow-sm p-5">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-gray-800">Top Performing Consultants</h4>
              <p className="text-sm text-gray-500">Highest revenue generating consultants this month</p>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {consultants.map((c: any) => (
              <div key={c.rank} className="flex items-center justify-between border-b last:border-0 pb-2">
                <div className="flex items-center gap-3">
                  <span className={`w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-700 text-sm font-semibold`}>{c.rank}</span>
                  <div>
                    <p className="font-medium text-gray-800">{c.name}</p>
                    <p className="text-xs text-gray-500">{c.category} • ★ {c.rating} • {c.sessions} sessions</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-green-700 font-medium">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(c.revenue)}</p>
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
