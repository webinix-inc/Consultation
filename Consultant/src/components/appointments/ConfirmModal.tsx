import React from "react";
import { X, Calendar, Clock, Video, CreditCard } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { BookingTimer } from "./BookingTimer";
import { formatCurrency, getCurrencyCode } from "@/utils/currencyUtils";

const fade = {
    hidden: { opacity: 0, scale: 0.95 },
    show: { opacity: 1, scale: 1, transition: { duration: 0.2 } },
    exit: { opacity: 0, scale: 0.95 },
};

interface ConfirmModalProps {
    open: boolean;
    onClose: () => void;
    consultantDetails: any;
    sched: any;
    paymentMethod: string;
    setPaymentMethod: (method: string) => void;
    consultationFee: number;
    platformFee: number;
    totalFee: number;
    onConfirm: () => void;
    isPending: boolean;
    expiresAt?: Date | string; // Optional for compatibility
    onExpire?: () => void;
}

export function ConfirmModal({
    open,
    onClose,
    consultantDetails,
    sched,
    paymentMethod,
    setPaymentMethod,
    consultationFee,
    platformFee,
    totalFee,
    onConfirm,
    isPending,
    expiresAt,
    onExpire
}: ConfirmModalProps) {
    if (!open) return null;

    return (
        <AnimatePresence>
            <motion.div variants={fade} initial="hidden" animate="show" exit="exit" className="fixed inset-0 bg-black/40 flex justify-center items-center z-50 p-4">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b">
                        <div>
                            <div className="flex items-center gap-3">
                                <h2 className="text-lg font-semibold text-gray-900">Confirmation Page</h2>
                                {expiresAt && onExpire && (
                                    <div className="bg-blue-50 px-3 py-1 rounded-full">
                                        <BookingTimer expiresAt={expiresAt} onExpire={onExpire} />
                                    </div>
                                )}
                            </div>
                            <p className="text-sm text-gray-500 mt-0.5">Create a new consultation appointment.</p>
                        </div>
                        <button
                            className="h-8 w-8 grid place-items-center hover:bg-gray-100 rounded-full transition-colors"
                            onClick={onClose}
                            title="Close"
                        >
                            <X className="h-5 w-5 text-gray-500" />
                        </button>
                    </div>

                    {/* Consultant Profile Section */}
                    <div className="px-6 py-5 bg-gray-50 border-b">
                        <div className="flex items-center gap-4">
                            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-semibold text-xl flex-shrink-0">
                                {consultantDetails?.fullName?.charAt(0) || "?"}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="text-base font-semibold text-gray-900 truncate">
                                    {consultantDetails?.fullName || "Unknown Consultant"}
                                </h3>
                                <p className="text-sm text-gray-600 mt-0.5">
                                    {consultantDetails?.category?.title || "General"} • {consultantDetails?.subcategory?.title || "Specialist"}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Appointment Details */}
                    <div className="px-6 py-5 space-y-3">
                        <div className="flex items-center gap-3 text-sm">
                            <Video className="h-5 w-5 text-gray-600 flex-shrink-0" />
                            <span className="text-gray-900">{sched.session}</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                            <Calendar className="h-5 w-5 text-gray-600 flex-shrink-0" />
                            <span className="text-gray-900">{sched.date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                            <Clock className="h-5 w-5 text-gray-600 flex-shrink-0" />
                            <span className="text-gray-900">{sched.time}</span>
                        </div>
                    </div>

                    {/* Payment Method */}
                    <div className="px-6 py-4 border-t">
                        <h4 className="text-sm font-semibold text-gray-900 mb-3">Payment Method</h4>
                        <div className="flex items-center justify-center gap-3 px-4 py-3 rounded-lg border-2 border-blue-500 bg-blue-50">
                            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M3 9V7C3 5.89543 3.89543 5 5 5H19C20.1046 5 21 5.89543 21 7V9M3 9V17C3 18.1046 3.89543 19 5 19H19C20.1046 19 21 18.1046 21 17V9M3 9H21" stroke="#0d6efd" strokeWidth="2" strokeLinecap="round" />
                                <path d="M7 13H7.01M11 13H11.01M15 13H15.01" stroke="#0d6efd" strokeWidth="2" strokeLinecap="round" />
                            </svg>
                            <span className="text-sm font-semibold text-gray-900">Razorpay</span>
                            <div className="ml-auto h-5 w-5 rounded-full bg-blue-500 flex items-center justify-center">
                                <div className="h-2 w-2 rounded-full bg-white"></div>
                            </div>
                        </div>
                        <p className="text-xs text-gray-500 mt-2 text-center">
                            Secure payment powered by Razorpay
                        </p>
                    </div>

                    {/* Fee Breakdown */}
                    <div className="px-6 py-4 bg-gray-50 border-t space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Consultation Fee</span>
                            <span className="font-medium text-gray-900">{formatCurrency(consultationFee, consultantDetails?.currency || getCurrencyCode(consultantDetails?.country || 'IN'))}</span>
                        </div>
                        {platformFee > 0 && (
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Platform Fee</span>
                                <span className="font-medium text-gray-900">{formatCurrency(platformFee, consultantDetails?.currency || getCurrencyCode(consultantDetails?.country || 'IN'))}</span>
                            </div>
                        )}
                        <div className="flex justify-between text-base font-semibold pt-2 border-t">
                            <span className="text-gray-900">Total Amount</span>
                            <span className="text-blue-600">{formatCurrency(totalFee, consultantDetails?.currency || getCurrencyCode(consultantDetails?.country || 'IN'))}</span>
                        </div>
                    </div>

                    {/* Action Button */}
                    <div className="px-6 py-4">
                        <button
                            onClick={onConfirm}
                            disabled={isPending}
                            className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {isPending ? "Processing..." : "Confirm Appointment"}
                        </button>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
