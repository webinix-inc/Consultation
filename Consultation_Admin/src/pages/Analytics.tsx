import React from "react";
import { ArrowUpRight, RefreshCw, Download } from "lucide-react";
import { motion } from "framer-motion";

// Local screenshot the user uploaded (developer: transform this path to a url in your environment)
const screenshotPath = "/mnt/data/Screenshot 2025-11-21 142640.png";

const AnalyticsDashboard: React.FC = () => {
  const categoryData = [
    { name: "Legal", revenue: 65000, sessions: 87, rate: "₹300/hr avg", growth: "+15%" },
    { name: "Finance", revenue: 52000, sessions: 145, rate: "₹200/hr avg", growth: "+23%" },
    { name: "IT", revenue: 45000, sessions: 167, rate: "₹175/hr avg", growth: "+18%" },
    { name: "Health", revenue: 38000, sessions: 198, rate: "₹150/hr avg", growth: "+12%" },
    { name: "Construction", revenue: 42000, sessions: 89, rate: "₹125/hr avg", growth: "+8%" },
    { name: "Farming", revenue: 28000, sessions: 67, rate: "₹110/hr avg", growth: "+5%" },
  ];

  const consultants = [
    { rank: 1, name: "Lisa Johnson", category: "Legal", rating: 4.9, sessions: 75, revenue: 22500 },
    { rank: 2, name: "Michael Chen", category: "Finance", rating: 4.8, sessions: 93, revenue: 18600 },
    { rank: 3, name: "Dr. Sarah Wilson", category: "Health", rating: 4.9, sessions: 108, revenue: 16200 },
    { rank: 4, name: "David Lee", category: "IT", rating: 4.7, sessions: 90, revenue: 15750 },
    { rank: 5, name: "Amanda Rodriguez", category: "Construction", rating: 4.6, sessions: 110, revenue: 13750 },
  ];

  const months = [
    { name: "Jan", revenue: 85000, appt: 245 },
    { name: "Feb", revenue: 92000, appt: 267 },
    { name: "Mar", revenue: 78000, appt: 223 },
    { name: "Apr", revenue: 105000, appt: 298 },
    { name: "May", revenue: 118000, appt: 334 },
    { name: "Jun", revenue: 125000, appt: 365 },
  ];

  const maxMonthRevenue = Math.max(...months.map((m) => m.revenue));
  const maxCategoryRevenue = Math.max(...categoryData.map((c) => c.revenue));

  const fadeUp = {
    hidden: { opacity: 0, y: 16 },
    show: { opacity: 1, y: 0, transition: { duration: 0.28 } },
  };

  return (
    <div className="min-h-screen bg-white p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
        <div>
          <h2 className="text-2xl font-semibold text-gray-800">Analytics</h2>
          <p className="text-sm text-gray-500">Home &gt; Analytics</p>
        </div>

        <div className="flex items-center gap-3">
          <button className="p-2 border rounded-md hover:bg-gray-100 transition">
            <RefreshCw size={16} />
          </button>
          <button className="flex items-center gap-2 px-3 py-2 bg-white border rounded-md text-sm font-medium hover:bg-gray-50 transition">
            <Download size={14} /> Export Report
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
              {months.map((m) => {
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
              {categoryData.map((c) => {
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
            {consultants.map((c) => (
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
