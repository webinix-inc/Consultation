import React from "react";
import { X, Video, Clock, Calendar as CalendarIcon, ChevronRight } from "lucide-react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { MiniCalendar } from "./MiniCalendar";

const fade: Variants = {
    hidden: { opacity: 0, scale: 0.95 },
    show: { opacity: 1, scale: 1, transition: { duration: 0.2, ease: "easeOut" } },
    exit: { opacity: 0, scale: 0.95, transition: { duration: 0.15, ease: "easeIn" } },
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
            <motion.div
                variants={fade}
                initial="hidden"
                animate="show"
                exit="exit"
                className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center z-50 p-4"
            >
                <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh] border border-white/20">
                    {/* Header */}
                    <div className="px-8 py-5 border-b border-slate-100 flex items-center justify-between bg-white/80 backdrop-blur-md sticky top-0 z-10">
                        <div>
                            <h3 className="text-xl font-bold text-slate-900 tracking-tight">Schedule Consultation</h3>
                            <p className="text-sm text-slate-500 mt-0.5">Book your session with our experts</p>
                        </div>
                        <button
                            className="h-9 w-9 grid place-items-center bg-slate-50 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-slate-200"
                            onClick={onClose}
                            title="Close"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    <div className="p-8 space-y-8 overflow-y-auto custom-scrollbar bg-white">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Client Selection: Only visible for Consultants */}
                            {isConsultant && (
                                <div className="space-y-2 col-span-full">
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Existing Client <span className="text-red-500">*</span></label>
                                    <div className="relative">
                                        <select
                                            className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-slate-50 focus:bg-white appearance-none text-slate-700 font-medium"
                                            value={sched.client}
                                            onChange={(e) => setSched((s: any) => ({ ...s, client: e.target.value, time: null }))}
                                            required
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
                                        <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 rotate-90 pointer-events-none" />
                                    </div>
                                </div>
                            )}

                            {/* Consultant Selection: Only visible for Clients */}
                            {isClient && (
                                <>
                                    <div className="space-y-2">
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Category <span className="text-red-500">*</span></label>
                                        <div className="relative">
                                            <select
                                                className={`w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all appearance-none font-medium ${isPreSelected ? 'bg-slate-100/50 text-slate-500 cursor-not-allowed border-dashed' : 'bg-slate-50 focus:bg-white text-slate-700'}`}
                                                value={selectedCategory}
                                                onChange={(e) => {
                                                    if (!isPreSelected) {
                                                        setSelectedCategory(e.target.value);
                                                        setSched((s: any) => ({ ...s, consultant: "", time: null }));
                                                    }
                                                }}
                                                required
                                                disabled={isPreSelected}
                                            >
                                                <option value="">Select Category</option>
                                                {categories.map((cat: any) => (
                                                    <option key={cat._id || cat.id} value={cat._id || cat.id}>
                                                        {cat.title}
                                                    </option>
                                                ))}
                                            </select>
                                            <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 rotate-90 pointer-events-none" />
                                        </div>
                                        {isPreSelected && selectedCategory && (
                                            <p className="text-xs text-blue-600/80 font-medium px-1">
                                                Locked via consultant profile
                                            </p>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Subcategory <span className="text-red-500">*</span></label>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm bg-slate-100/50 text-slate-500 cursor-not-allowed focus:outline-none font-medium"
                                                value={(() => {
                                                    const c = consultants.find((c: any) => (c._id || c.id) === sched.consultant);
                                                    if (!c) return "";
                                                    if (c.subcategory && typeof c.subcategory === 'object') {
                                                        return c.subcategory.title || c.subcategory.name || "";
                                                    }
                                                    return c.subcategory || "";
                                                })()}
                                                readOnly
                                                disabled
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2 col-span-full">
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Consultant <span className="text-red-500">*</span></label>
                                        <div className="relative">
                                            <select
                                                className={`w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all appearance-none font-medium ${isPreSelected ? 'bg-slate-100/50 text-slate-500 cursor-not-allowed border-dashed' : 'bg-slate-50 focus:bg-white text-slate-700'}`}
                                                value={sched.consultant}
                                                onChange={(e) => {
                                                    if (!isPreSelected) {
                                                        const newVal = e.target.value;
                                                        setSched((s: any) => ({ ...s, consultant: newVal, time: null }));
                                                    }
                                                }}
                                                required
                                                disabled={isPreSelected || isLoadingUsers || (!selectedCategory && !sched.consultant)}
                                            >
                                                <option value="">Select Consultant</option>
                                                {isLoadingUsers ? (
                                                    <option value="" disabled>Loading experts...</option>
                                                ) : (!selectedCategory && !sched.consultant) ? (
                                                    <option value="" disabled>Select a category first</option>
                                                ) : consultants.length === 0 ? (
                                                    <option value="" disabled>No consultants available</option>
                                                ) : (
                                                    consultants.map((c: any) => (
                                                        <option key={c._id || c.id} value={c._id || c.id}>
                                                            {c.fullName || c.name || "Unknown Consultant"} ({c.yearsOfExperience}+ Yoe)
                                                        </option>
                                                    ))
                                                )}
                                            </select>
                                            <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 rotate-90 pointer-events-none" />
                                        </div>
                                        {!isLoadingUsers && selectedCategory && consultants.length === 0 && !isPreSelected && (
                                            <p className="text-xs text-amber-600 mt-1.5 flex items-center gap-1.5 font-medium">
                                                <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-600"></span>
                                                No experts found in this category
                                            </p>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                            {/* Left Column: Calendar */}
                            <div className="space-y-3 h-full flex flex-col">
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                                    <CalendarIcon className="w-3.5 h-3.5" />
                                    Select Date <span className="text-red-500">*</span>
                                </label>
                                <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300">
                                    <MiniCalendar value={sched.date} onChange={(d) => setSched((s: any) => ({ ...s, date: d, time: null }))} />
                                </div>
                            </div>

                            {/* Right Column: Session Type and Slots */}
                            <div className="flex flex-col gap-6">
                                <div className="space-y-2">
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Session Type</label>
                                    <div className="relative group">
                                        <input
                                            type="text"
                                            className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm bg-blue-50/50 text-blue-700 font-medium cursor-not-allowed focus:outline-none"
                                            value="Video Consultation"
                                            readOnly
                                            disabled
                                        />
                                        <div className="absolute right-3 top-1/2 -translate-y-1/4 w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                                            <Video className="h-4 w-4" />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2 flex-1 flex flex-col">
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Available Time Slots <span className="text-red-500">*</span></label>
                                    <div className={`border rounded-2xl p-4 flex-1 min-h-[140px] transition-colors duration-300 ${!sched.consultant ? 'border-dashed border-slate-300 bg-slate-50/50' : 'border-slate-200 bg-white'}`}>
                                        {!sched.consultant ? (
                                            <div className="w-full h-full flex flex-col items-center justify-center py-6 text-slate-400">
                                                <Clock className="h-10 w-10 mb-3 opacity-20" />
                                                <span className="text-sm font-medium">Select a consultant to view slots</span>
                                            </div>
                                        ) : getSlotsToRender(sched.date).length > 0 ? (
                                            <div className="flex flex-wrap gap-2.5 max-h-48 overflow-y-auto custom-scrollbar p-1">
                                                {getSlotsToRender(sched.date).map((slot) => (
                                                    <button
                                                        key={slot}
                                                        onClick={() => setSched((s: any) => ({ ...s, time: slot }))}
                                                        className={`px-4 py-2.5 text-sm font-medium rounded-xl border transition-all duration-200 ${sched.time === slot
                                                            ? "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-200 scale-[1.02]"
                                                            : "bg-white text-slate-600 border-slate-200 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-600"
                                                            }`}
                                                    >
                                                        {slot}
                                                    </button>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="w-full h-full flex flex-col items-center justify-center py-6 text-slate-400">
                                                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                                                    <Clock className="h-6 w-6 text-slate-300" />
                                                </div>
                                                <span className="text-sm font-medium">No slots available for this date</span>
                                                <span className="text-xs text-slate-400 mt-1">Try selecting another day</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4 pt-6 border-t border-slate-100">
                            <div className="space-y-2">
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Consultation Topic</label>
                                <input
                                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium placeholder:text-slate-400 bg-slate-50 focus:bg-white"
                                    placeholder="e.g. Career Guidance, Resume Review..."
                                    value={sched.reason}
                                    onChange={(e) => setSched((s: any) => ({ ...s, reason: e.target.value }))}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Additional Notes (Optional)</label>
                                <textarea
                                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none font-medium placeholder:text-slate-400 bg-slate-50 focus:bg-white"
                                    rows={2}
                                    placeholder="Share any specific questions or context..."
                                    value={sched.notes}
                                    onChange={(e) => setSched((s: any) => ({ ...s, notes: e.target.value }))}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="px-8 py-5 bg-slate-50 border-t border-slate-100 flex justify-end gap-4 flex-shrink-0">
                        <button
                            onClick={onClose}
                            className="px-6 py-2.5 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:text-slate-900 transition-all shadow-sm hover:shadow active:scale-[0.98]"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handlePreBooking}
                            disabled={isPending}
                            className="px-8 py-2.5 text-sm font-semibold !bg-gradient-to-r !from-blue-600 !to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 shadow-md hover:shadow-gl disabled:opacity-50 disabled:shadow-none transition-all flex items-center gap-2.5 active:scale-[0.98]"
                        >
                            {isPending ? (
                                <>
                                    <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    <span>Processing...</span>
                                </>
                            ) : (
                                <>
                                    <span>Confirm Booking</span>
                                    <ChevronRight className="w-4 h-4 text-white/80" />
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
