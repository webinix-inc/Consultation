import React from "react";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { MiniCalendar } from "./MiniCalendar";

const fade = {
    hidden: { opacity: 0, scale: 0.95 },
    show: { opacity: 1, scale: 1, transition: { duration: 0.2 } },
    exit: { opacity: 0, scale: 0.95 },
};

interface EditModalProps {
    open: boolean;
    onClose: () => void;
    appointment: any;
    setAppointment: React.Dispatch<React.SetStateAction<any>>;
    onSave: (payload: any) => void;
    isPending: boolean;
}

export function EditModal({ open, onClose, appointment, setAppointment, onSave, isPending }: EditModalProps) {
    if (!open || !appointment) return null;

    // Generate time slots (copied usage from main file logic, simplified here or passed as prop)
    // Assuming strict 9-17 slots for simplicity or passed via props. 
    // Ideally, this should be consistent. For now, regenerating locally.
    const generateTimeSlots = (startHour = 9, endHour = 17) => {
        const slots: string[] = [];
        for (let h = startHour; h <= endHour; h++) {
            const hh = String(h).padStart(2, "0");
            slots.push(`${hh}:00`);
        }
        return slots;
    };
    const TIME_SLOTS = generateTimeSlots(9, 17);

    return (
        <AnimatePresence>
            <motion.div variants={fade} initial="hidden" animate="show" exit="exit" className="fixed inset-0 bg-black/40 flex justify-center items-center z-50">
                <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg">
                    <div className="flex items-start justify-between mb-4">
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900">Edit Appointment</h3>
                            <p className="text-sm text-gray-500">Modify date, time, notes or status.</p>
                        </div>
                        <button onClick={onClose} className="h-8 w-8 grid place-items-center hover:bg-gray-100 rounded-md"><X className="h-4 w-4" /></button>
                    </div>

                    <div className="space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="rounded-md border p-3">
                                <div className="text-xs text-gray-500 mb-1">Date</div>
                                <MiniCalendar value={appointment.date ? new Date(appointment.date) : new Date()} onChange={(d) => setAppointment((s: any) => s ? ({ ...s, date: d.toLocaleDateString() }) : s)} />
                            </div>

                            <div className="rounded-md border p-3">
                                <div className="text-xs text-gray-500 mb-1">Time</div>
                                <div className="flex gap-2 flex-wrap">
                                    {TIME_SLOTS.map((slot) => (
                                        <button key={slot} onClick={() => setAppointment((s: any) => s ? ({ ...s, time: slot }) : s)} className={`px-3 py-1 text-xs rounded-md border ${appointment.time === slot ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-700 hover:bg-gray-50"}`}>
                                            {slot}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="rounded-md border p-3">
                            <div className="text-xs text-gray-500 mb-1">Notes</div>
                            <textarea className="w-full border rounded-md text-sm p-2 bg-gray-50" rows={3} value={appointment.notes || ""} onChange={(e) => setAppointment((s: any) => s ? ({ ...s, notes: e.target.value }) : s)} />
                        </div>


                    </div>

                    <div className="mt-4 flex justify-end gap-2">
                        <button onClick={onClose} className="px-4 py-2 text-sm border rounded-md hover:bg-gray-100">Cancel</button>
                        <button onClick={() => {
                            const payload: any = {};
                            if (appointment.date) payload.date = new Date(appointment.date).toISOString().split("T")[0];
                            if (appointment.time) payload.time = appointment.time;
                            if (appointment.notes !== undefined) payload.notes = appointment.notes;
                            if (appointment.status) payload.status = appointment.status;
                            onSave(payload);
                        }} disabled={isPending} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">{isPending ? "Saving..." : "Save Changes"}</button>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
