import React from "react";
import { motion, AnimatePresence } from "framer-motion";

const fade = {
    hidden: { opacity: 0, scale: 0.95 },
    show: { opacity: 1, scale: 1, transition: { duration: 0.2 } },
    exit: { opacity: 0, scale: 0.95 },
};

interface StatusModalProps {
    open: boolean;
    onClose: () => void;
    appointment: any;
    onUpdate: (id: string, data: any) => void;
    isPending: boolean;
}

export function StatusModal({ open, onClose, appointment, onUpdate, isPending }: StatusModalProps) {
    if (!open || !appointment) return null;

    return (
        <AnimatePresence>
            <motion.div variants={fade} initial="hidden" animate="show" exit="exit" className="fixed inset-0 bg-black/40 flex justify-center items-center z-50">
                <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Update Appointment Status</h3>
                    <p className="text-sm text-gray-600 mb-4">Change the status of this appointment.</p>

                    <div className="flex flex-col gap-2">
                        {appointment.status === "Upcoming" && (
                            <button
                                onClick={() => onUpdate(appointment.id, { status: "Confirmed" })}
                                disabled={isPending}
                                className="w-full py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                            >
                                Confirm Appointment
                            </button>
                        )}

                        {(appointment.status === "Upcoming" || appointment.status === "Confirmed") && (
                            <button
                                onClick={() => onUpdate(appointment.id, { status: "Completed" })}
                                disabled={isPending}
                                className="w-full py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                            >
                                Mark as Completed
                            </button>
                        )}

                        <button
                            onClick={() => onUpdate(appointment.id, { status: "Cancelled" })}
                            disabled={isPending}
                            className="w-full py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                        >
                            Cancel Appointment
                        </button>
                    </div>

                    <div className="mt-4 flex justify-end">
                        <button onClick={onClose} className="px-4 py-2 text-sm border rounded-md hover:bg-gray-100">Close</button>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
