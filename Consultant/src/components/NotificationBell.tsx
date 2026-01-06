import React, { useState, useRef, useEffect } from "react";
import { Bell, Check, Clock, ArrowRight, X } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import NotificationsAPI, { NotificationItem } from "@/api/notifications.api";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

const priorityColors: Record<string, string> = {
    urgent: "bg-red-500",
    high: "bg-orange-500",
    normal: "bg-blue-500",
    low: "bg-gray-400",
};

const typeIcons: Record<string, string> = {
    appointment: "📅",
    payment: "💳",
    message: "💬",
    reminder: "⏰",
    system: "⚙️",
    alert: "⚠️",
    other: "📢",
    registration: "👤",
};

function formatTimeAgo(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function NotificationBell() {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    // Fetch unread count
    const { data: countData } = useQuery({
        queryKey: ["notifications-unread-count"],
        queryFn: NotificationsAPI.getUnreadCount,
        refetchInterval: 30000, // Poll every 30 seconds
    });

    // Fetch recent notifications (limited)
    const { data: notificationsData, isLoading } = useQuery({
        queryKey: ["notifications-preview"],
        queryFn: () => NotificationsAPI.getAll({ limit: 5, sortOrder: "desc" }),
        enabled: isOpen,
    });

    const unreadCount = countData?.count || 0;
    const notifications = notificationsData?.data || [];

    // Mark single as read
    const { mutate: markRead } = useMutation({
        mutationFn: NotificationsAPI.markRead,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["notifications-unread-count"] });
            queryClient.invalidateQueries({ queryKey: ["notifications-preview"] });
            queryClient.invalidateQueries({ queryKey: ["notifications"] });
        },
    });

    // Mark all as read
    const { mutate: markAllRead } = useMutation({
        mutationFn: NotificationsAPI.markAllRead,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["notifications-unread-count"] });
            queryClient.invalidateQueries({ queryKey: ["notifications-preview"] });
            queryClient.invalidateQueries({ queryKey: ["notifications"] });
        },
    });

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleNotificationClick = (notification: NotificationItem) => {
        if (!notification.read) {
            markRead(notification._id);
        }
        if (notification.actionUrl) {
            navigate(notification.actionUrl);
            setIsOpen(false);
        }
    };

    const handleViewAll = () => {
        setIsOpen(false);
        navigate("/notifications");
    };

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Bell Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "relative p-2 rounded-full transition-all duration-200",
                    "hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20",
                    isOpen && "bg-gray-100"
                )}
            >
                <Bell className={cn("h-5 w-5 transition-colors", isOpen ? "text-blue-600" : "text-gray-600")} />

                {/* Unread Badge */}
                <AnimatePresence>
                    {unreadCount > 0 && (
                        <motion.span
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0 }}
                            className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-red-500 rounded-full ring-2 ring-white"
                        >
                            {unreadCount > 99 ? "99+" : unreadCount}
                        </motion.span>
                    )}
                </AnimatePresence>
            </button>

            {/* Dropdown */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 mt-2 w-96 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden z-50"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-gray-50 to-white border-b">
                            <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-gray-900">Notifications</h3>
                                {unreadCount > 0 && (
                                    <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
                                        {unreadCount} new
                                    </span>
                                )}
                            </div>
                            {unreadCount > 0 && (
                                <button
                                    onClick={() => markAllRead()}
                                    className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
                                >
                                    <Check className="h-3 w-3" /> Mark all read
                                </button>
                            )}
                        </div>

                        {/* Notifications List */}
                        <div className="max-h-[400px] overflow-y-auto">
                            {isLoading ? (
                                <div className="flex items-center justify-center py-8">
                                    <div className="animate-spin h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full" />
                                </div>
                            ) : notifications.length > 0 ? (
                                <div className="divide-y divide-gray-100">
                                    {notifications.map((notification) => (
                                        <div
                                            key={notification._id}
                                            onClick={() => handleNotificationClick(notification)}
                                            className={cn(
                                                "flex gap-3 p-4 cursor-pointer transition-colors hover:bg-gray-50",
                                                !notification.read && "bg-blue-50/50"
                                            )}
                                        >
                                            {/* Priority Indicator & Icon */}
                                            <div className="relative shrink-0">
                                                <div className={cn(
                                                    "w-10 h-10 rounded-full flex items-center justify-center text-lg",
                                                    notification.read ? "bg-gray-100" : "bg-blue-100"
                                                )}>
                                                    {notification.avatar ? (
                                                        <img src={notification.avatar} alt="" className="w-full h-full rounded-full object-cover" />
                                                    ) : (
                                                        typeIcons[notification.type] || typeIcons.other
                                                    )}
                                                </div>
                                                {!notification.read && (
                                                    <span className={cn(
                                                        "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full ring-2 ring-white",
                                                        priorityColors[notification.priority]
                                                    )} />
                                                )}
                                            </div>

                                            {/* Content */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start justify-between gap-2">
                                                    <p className={cn(
                                                        "text-sm leading-snug",
                                                        notification.read ? "text-gray-600" : "text-gray-900 font-medium"
                                                    )}>
                                                        <span className="font-semibold">{notification.name}</span>
                                                        {" "}
                                                        <span className="text-gray-600">{notification.message}</span>
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-xs text-gray-400 flex items-center gap-1">
                                                        <Clock className="h-3 w-3" />
                                                        {formatTimeAgo(notification.createdAt)}
                                                    </span>
                                                    {notification.actionUrl && (
                                                        <span className="text-xs text-blue-600 flex items-center gap-0.5">
                                                            {notification.actionLabel || "View"} <ArrowRight className="h-3 w-3" />
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-12 text-center">
                                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                                        <Bell className="h-6 w-6 text-gray-400" />
                                    </div>
                                    <p className="text-sm font-medium text-gray-900">All caught up!</p>
                                    <p className="text-xs text-gray-500 mt-1">No new notifications</p>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        {notifications.length > 0 && (
                            <div className="border-t bg-gray-50 px-4 py-3">
                                <button
                                    onClick={handleViewAll}
                                    className="w-full text-center text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
                                >
                                    View all notifications
                                </button>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
