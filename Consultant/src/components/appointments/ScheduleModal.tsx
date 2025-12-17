import React from "react";
import { X, Video, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { MiniCalendar } from "./MiniCalendar";

const fade = {
    hidden: { opacity: 0, scale: 0.95 },
    show: { opacity: 1, scale: 1, transition: { duration: 0.2 } },
    exit: { opacity: 0, scale: 0.95 },
};

interface ScheduleModalProps {
    open: boolean;
    onClose: () => void;
    sched: any;
    setSched: React.Dispatch<React.SetStateAction<any>>;
    clients: any[];
    categories: any[];
    consultants: any[]; // filteredConsultants
    isLoadingUsers: boolean;
    handlePreBooking: () => void;
    isPending: boolean;
    isConsultant: boolean;
    isClient: boolean;
    getSlotsToRender: (date: Date) => string[];
    selectedCategory: string;
    setSelectedCategory: React.Dispatch<React.SetStateAction<string>>;
    isPreSelected?: boolean; // If true, category and consultant are locked (from card booking)
}

export function ScheduleModal({
    open,
    onClose,
    sched,
    setSched,
    clients,
    categories,
    consultants,
    isLoadingUsers,
    handlePreBooking,
    isPending,
    isConsultant,
    isClient,
    getSlotsToRender,
    selectedCategory,
    setSelectedCategory,
    isPreSelected = false,
}: ScheduleModalProps) {
    if (!open) return null;

    return (
        <AnimatePresence>
            <motion.div variants={fade} initial="hidden" animate="show" exit="exit" className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-50 p-4">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                    <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white flex-shrink-0">
                        <div>
                            <h3 className="text-lg font-bold text-gray-900">Schedule New Appointment</h3>
                            <p className="text-sm text-gray-500 mt-0.5">Fill in the details to book a new consultation.</p>
                        </div>
                        <button
                            className="h-8 w-8 grid place-items-center hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors"
                            onClick={onClose}
                            title="Close"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    <div className="p-6 space-y-5 overflow-y-auto custom-scrollbar">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            {/* Client Selection: Only visible for Consultants */}
                            {isConsultant && (
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">Existing Client <span className="text-red-500">*</span></label>
                                    <select
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white"
                                        value={sched.client}
                                        onChange={(e) => setSched((s: any) => ({ ...s, client: e.target.value, time: null }))}
                                        required
                                        aria-label="Select client"
                                    >
                                        <option value="">Select client</option>
                                        {clients.length === 0 ? (
                                            <option value="" disabled>No linked clients found</option>
                                        ) : (
                                            clients.map((c: any) => (
                                                <option key={c._id || c.id} value={c._id || c.id}>
                                                    {c.fullName || c.name || c.email || (c.mobile && `+${c.mobile}`)}
                                                </option>
                                            ))
                                        )}
                                    </select>
                                </div>
                            )}

                            {/* Consultant Selection: Only visible for Clients */}
                            {isClient && (
                                <>
                                    <div className="space-y-1.5">
                                        <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">Category <span className="text-red-500">*</span></label>
                                        <select
                                            className={`w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${isPreSelected ? 'bg-gray-50 text-gray-600 cursor-not-allowed' : 'bg-white'}`}
                                            value={selectedCategory}
                                            onChange={(e) => {
                                                if (!isPreSelected) {
                                                    setSelectedCategory(e.target.value);
                                                    setSched((s: any) => ({ ...s, consultant: "", time: null }));
                                                }
                                            }}
                                            required
                                            disabled={isPreSelected}
                                            aria-label="Select Category"
                                        >
                                            <option value="">Select Category</option>
                                            {categories.map((cat: any) => (
                                                <option key={cat._id || cat.id} value={cat._id || cat.id}>
                                                    {cat.title}
                                                </option>
                                            ))}
                                        </select>
                                        {isPreSelected && selectedCategory && (
                                            <p className="text-xs text-gray-500 mt-1">
                                                Category is pre-selected from consultant
                                            </p>
                                        )}
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">Consultant <span className="text-red-500">*</span></label>
                                        <select
                                            className={`w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${isPreSelected ? 'bg-gray-50 text-gray-600 cursor-not-allowed' : 'bg-white'} disabled:bg-gray-50 disabled:text-gray-400`}
                                            value={sched.consultant}
                                            onChange={(e) => {
                                                if (!isPreSelected) {
                                                    const newVal = e.target.value;
                                                    setSched((s: any) => ({ ...s, consultant: newVal, time: null }));
                                                }
                                            }}
                                            required
                                            aria-label="Select consultant"
                                            disabled={isPreSelected || isLoadingUsers || (!selectedCategory && !sched.consultant)}
                                        >
                                            <option value="">Select Consultant</option>
                                            {isLoadingUsers ? (
                                                <option value="" disabled>Loading...</option>
                                            ) : (!selectedCategory && !sched.consultant) ? (
                                                <option value="" disabled>Select category first</option>
                                            ) : consultants.length === 0 ? (
                                                <option value="" disabled>No consultants available</option>
                                            ) : (
                                                consultants.map((c: any) => (
                                                    <option key={c._id || c.id} value={c._id || c.id}>
                                                        {c.fullName || c.name || "Unknown Consultant"}
                                                    </option>
                                                ))
                                            )}
                                        </select>
                                        {isPreSelected && sched.consultant && (
                                            <p className="text-xs text-gray-500 mt-1">
                                                Consultant is pre-selected from card
                                            </p>
                                        )}
                                        {!isLoadingUsers && selectedCategory && consultants.length === 0 && !isPreSelected && (
                                            <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                                                <span className="inline-block w-1 h-1 rounded-full bg-amber-600"></span>
                                                No active consultants in this category
                                            </p>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            {/* Left Column: Calendar */}
                            <div className="space-y-1.5 h-full flex flex-col">
                                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">Date <span className="text-red-500">*</span></label>
                                <MiniCalendar value={sched.date} onChange={(d) => setSched((s: any) => ({ ...s, date: d, time: null }))} />
                            </div>

                            {/* Right Column: Session Type and Slots */}
                            <div className="flex flex-col gap-5">
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">Session Type <span className="text-red-500">*</span></label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-gray-50 text-gray-500 cursor-not-allowed focus:outline-none"
                                            value="Video Call"
                                            readOnly
                                            disabled
                                        />
                                        <Video className="absolute right-3 top-1/2 -translate-y-1/4 h-4 w-4 text-gray-400" />
                                    </div>
                                </div>

                                <div className="space-y-1.5 flex-1 flex flex-col">
                                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">Available Time Slots <span className="text-red-500">*</span></label>
                                    <div className={`border rounded-lg p-3 flex-1 min-h-[120px] ${!sched.consultant ? 'border-amber-300 bg-amber-50/30' : 'border-gray-200 bg-gray-50/50'}`}>
                                        {!sched.consultant ? (
                                            <div className="w-full h-full flex flex-col items-center justify-center py-4 text-amber-600">
                                                <Clock className="h-8 w-8 mb-2 opacity-40" />
                                                <span className="text-xs font-medium">Please select a consultant first</span>
                                            </div>
                                        ) : getSlotsToRender(sched.date).length > 0 ? (
                                            <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto custom-scrollbar p-1">
                                                {getSlotsToRender(sched.date).map((slot) => (
                                                    <button
                                                        key={slot}
                                                        onClick={() => setSched((s: any) => ({ ...s, time: slot }))}
                                                        className={`px-4 py-2 text-xs font-medium rounded-md border transition-all ${sched.time === slot
                                                            ? "bg-blue-600 text-white border-blue-600 shadow-sm ring-2 ring-blue-200"
                                                            : "bg-white text-gray-700 border-gray-200 hover:border-blue-300 hover:bg-blue-50"
                                                            }`}
                                                    >
                                                        {slot}
                                                    </button>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="w-full h-full flex flex-col items-center justify-center py-4 text-gray-400">
                                                <Clock className="h-8 w-8 mb-2 opacity-20" />
                                                <span className="text-xs italic">No slots available for this date</span>
                                            </div>
                                        )}
                                    </div>
                                    {!sched.time && sched.consultant && getSlotsToRender(sched.date).length > 0 && (
                                        <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                                            <span className="inline-block w-1 h-1 rounded-full bg-amber-600"></span>
                                            Please select a time slot
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3 pt-2 border-t border-gray-100">
                            <div className="space-y-1.5">
                                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">Reason</label>
                                <input
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                    placeholder="e.g. Initial Consultation"
                                    value={sched.reason}
                                    onChange={(e) => setSched((s: any) => ({ ...s, reason: e.target.value }))}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">Additional Notes</label>
                                <textarea
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                                    rows={2}
                                    placeholder="Any specific details..."
                                    value={sched.notes}
                                    onChange={(e) => setSched((s: any) => ({ ...s, notes: e.target.value }))}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3 flex-shrink-0">
                        <button
                            onClick={onClose}
                            className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:text-gray-900 transition-all shadow-sm"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handlePreBooking}
                            disabled={isPending}
                            className="px-5 py-2.5 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-md hover:shadow-lg disabled:opacity-50 disabled:shadow-none transition-all flex items-center gap-2"
                        >
                            {isPending ? (
                                <>
                                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    Processing...
                                </>
                            ) : (
                                "Confirm Booking"
                            )}
                        </button>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
