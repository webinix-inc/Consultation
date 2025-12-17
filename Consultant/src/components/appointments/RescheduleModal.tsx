import React from "react";
import { X, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { MiniCalendar } from "./MiniCalendar";

const fade = {
    hidden: { opacity: 0, scale: 0.95 },
    show: { opacity: 1, scale: 1, transition: { duration: 0.2 } },
    exit: { opacity: 0, scale: 0.95 },
};

interface RescheduleModalProps {
    open: boolean;
    onClose: () => void;
    sched: any;
    setSched: React.Dispatch<React.SetStateAction<any>>;
    getSlotsToRender: (date: Date) => string[];
    onConfirm: () => void;
    isPending: boolean;
}

export function RescheduleModal({ open, onClose, sched, setSched, getSlotsToRender, onConfirm, isPending }: RescheduleModalProps) {
    if (!open) return null;

    return (
        <AnimatePresence>
            <motion.div variants={fade} initial="hidden" animate="show" exit="exit" className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-50 p-4">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                    <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white flex-shrink-0">
                        <div>
                            <h3 className="text-lg font-bold text-gray-900">Reschedule Appointment</h3>
                            <p className="text-sm text-gray-500 mt-0.5">Choose a new date and time for your appointment.</p>
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
                            {/* Left Column: Calendar */}
                            <div className="space-y-1.5 h-full flex flex-col">
                                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">New Date <span className="text-red-500">*</span></label>
                                <MiniCalendar value={sched.date} onChange={(d) => setSched((s: any) => ({ ...s, date: d, time: null }))} />
                            </div>

                            {/* Right Column: Slots */}
                            <div className="flex flex-col gap-5">
                                <div className="space-y-1.5 flex-1 flex flex-col">
                                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">Available Time Slots <span className="text-red-500">*</span></label>
                                    <div className="border border-gray-200 rounded-lg p-3 bg-gray-50/50 flex-1 min-h-[120px]">
                                        <div className="flex flex-wrap gap-2 max-h-60 overflow-y-auto custom-scrollbar p-1">
                                            {getSlotsToRender(sched.date).length > 0 ? (
                                                getSlotsToRender(sched.date).map((slot) => (
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
                                                ))
                                            ) : (
                                                <div className="w-full h-full flex flex-col items-center justify-center py-4 text-gray-400">
                                                    <Clock className="h-8 w-8 mb-2 opacity-20" />
                                                    <span className="text-xs italic">No slots available for this date</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                            <h4 className="text-sm font-semibold text-blue-800 mb-1">Note</h4>
                            <p className="text-xs text-blue-600">
                                Rescheduling will automatically update the appointment status to <strong>Upcoming</strong>. The previous slot will be made available for other clients.
                            </p>
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
                            onClick={onConfirm}
                            disabled={isPending || !sched.time}
                            className="px-5 py-2.5 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-md hover:shadow-lg disabled:opacity-50 disabled:shadow-none transition-all flex items-center gap-2"
                        >
                            {isPending ? "Processing..." : "Confirm Reschedule"}
                        </button>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
