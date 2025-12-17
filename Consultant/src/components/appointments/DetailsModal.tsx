import React from "react";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const fade = {
    hidden: { opacity: 0, scale: 0.95 },
    show: { opacity: 1, scale: 1, transition: { duration: 0.2 } },
    exit: { opacity: 0, scale: 0.95 },
};

interface DetailsModalProps {
    open: boolean;
    onClose: () => void;
    appointment: any;
}

export function DetailsModal({ open, onClose, appointment }: DetailsModalProps) {
    if (!open || !appointment) return null;

    return (
        <AnimatePresence>
            <motion.div variants={fade} initial="hidden" animate="show" exit="exit" className="fixed inset-0 bg-black/40 flex justify-center items-center z-50">
                <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
                    <div className="flex items-start justify-between mb-4">
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900">Appointment Details</h3>
                            <p className="text-sm text-gray-500">View full appointment information.</p>
                        </div>
                        <button onClick={onClose} className="h-8 w-8 grid place-items-center hover:bg-gray-100 rounded-md"><X className="h-4 w-4" /></button>
                    </div>

                    <div className="space-y-2 text-sm text-gray-700">
                        <div><span className="font-medium">Client:</span> {appointment.client}</div>
                        <div><span className="font-medium">Consultant:</span> {appointment.consultant}</div>
                        <div><span className="font-medium">Category:</span> {appointment.category}</div>
                        <div><span className="font-medium">Session:</span> {appointment.session}</div>
                        <div><span className="font-medium">Date & Time:</span> {appointment.date}{appointment.time ? `, ${appointment.time}` : ""}</div>
                        <div><span className="font-medium">Status:</span> {appointment.status}</div>
                        {appointment.reason && <div><span className="font-medium">Reason:</span> {appointment.reason}</div>}
                        {appointment.notes && <div><span className="font-medium">Notes:</span> {appointment.notes}</div>}
                        {appointment.fee && <div><span className="font-medium">Fee:</span> {appointment.fee}</div>}
                    </div>

                    <div className="mt-6 flex justify-end gap-2">
                        <button onClick={onClose} className="px-4 py-2 text-sm border rounded-md hover:bg-gray-100">Close</button>

                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
