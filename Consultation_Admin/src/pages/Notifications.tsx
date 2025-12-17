import React, { useMemo, useState } from "react";
import { Clock, RefreshCw, Plus, Check, Trash2, Send } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import NotificationsAPI from "@/api/notifications.api";
import UserAPI from "@/api/user.api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface NotificationItem {
  _id: string;
  name: string;
  message: string;
  createdAt: string;
  avatar?: string;
  read: boolean;
}

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const NotificationsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [sendModalOpen, setSendModalOpen] = useState(false);
  const [notificationForm, setNotificationForm] = useState({
    name: "",
    message: "",
    recipientRole: "" as "Admin" | "Consultant" | "Client" | "",
    recipient: "",
    type: "other" as "system" | "appointment" | "registration" | "payment" | "other",
  });

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["notifications"],
    queryFn: NotificationsAPI.getAll,
  });
  const notifications: NotificationItem[] = useMemo(() => data?.data || [], [data]);

  // Fetch users for recipient selection
  const { data: usersData } = useQuery({
    queryKey: ["users"],
    queryFn: UserAPI.getAllUsers,
  });

  const users = useMemo(() => usersData?.data || [], [usersData]);

  const { mutate: markAllRead } = useMutation({
    mutationFn: NotificationsAPI.markAllRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });
  const { mutate: deleteAll } = useMutation({
    mutationFn: NotificationsAPI.deleteAll,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });
  const { mutate: createNotification, isPending: isCreating } = useMutation({
    mutationFn: NotificationsAPI.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      setSendModalOpen(false);
      setNotificationForm({
        name: "",
        message: "",
        recipientRole: "",
        recipient: "",
        type: "other",
      });
    },
  });

  const fadeUp = {
    hidden: { opacity: 0, y: 20 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.3 },
    },
  };

  // Mark all as read
  const handleMarkAllAsRead = () => markAllRead();

  // Delete all
  const handleDeleteAll = () => deleteAll();

  // Send notification
  const handleSendNotification = () => {
    if (!notificationForm.name || !notificationForm.message || !notificationForm.recipientRole) {
      return;
    }
    const payload: any = {
      name: notificationForm.name,
      message: notificationForm.message,
      recipientRole: notificationForm.recipientRole,
      type: notificationForm.type,
    };
    if (notificationForm.recipient) {
      payload.recipient = notificationForm.recipient;
    }
    createNotification(payload);
  };

  // Filter users by selected role
  const filteredUsers = useMemo(() => {
    if (!notificationForm.recipientRole) return [];
    return users.filter((user: any) => user.role === notificationForm.recipientRole);
  }, [users, notificationForm.recipientRole]);

  return (
    <motion.div
      className="min-h-screen bg-white p-6 space-y-8 relative"
      animate={{
        opacity: isFetching ? 0.7 : 1,
      }}
      transition={{ duration: 0.3 }}
    >
      {/* Loading Overlay */}
      <AnimatePresence>
        {isFetching && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-white/50 backdrop-blur-sm z-50 rounded-xl pointer-events-none flex items-center justify-center"
          >
            <div className="bg-white p-3 rounded-full shadow-lg">
              <RefreshCw className="animate-spin text-blue-600" size={24} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Area */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Notifications</h2>
          <p className="text-sm text-gray-500 mt-1">Manage your alerts and updates</p>
        </div>

        <div className="flex items-center gap-3">
          <motion.button
            className="p-2 bg-white border border-gray-200 rounded-full hover:bg-gray-50 text-gray-600 transition shadow-sm"
            onClick={() => refetch()}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            disabled={isFetching}
            title="Refresh"
          >
            <RefreshCw size={18} className={isFetching ? "animate-spin" : ""} />
          </motion.button>

          <motion.button
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 border border-blue-500 rounded-lg hover:bg-blue-600 text-white transition shadow-sm"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setSendModalOpen(true)}
            title="Send Notification"
          >
            <Send size={18} />
            Send Notification
          </motion.button>
        </div>
      </div>

      {/* Control Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-600">Total Notifications:</span>
          <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2.5 py-0.5 rounded-full">
            {notifications.length}
          </span>
        </div>

        <div className="flex gap-3 w-full sm:w-auto">
          {notifications.length > 0 && (
            <>
              <button
                onClick={handleMarkAllAsRead}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:text-blue-600 transition-colors shadow-sm"
              >
                <Check size={16} /> Mark all read
              </button>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-red-600 bg-red-50 border border-red-100 rounded-lg hover:bg-red-100 transition-colors shadow-sm"
                  >
                    <Trash2 size={16} /> Clear all
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent className="fixed top-1/2 left-1/2 -translate-x-1/4 -translate-y-1/4 w-full max-w-lg bg-white rounded-xl shadow-xl border border-gray-200 p-6 overflow-visible">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Clear all notifications?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. All your notifications will be permanently removed.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="rounded-lg">Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteAll} className="bg-red-600 hover:bg-red-700 rounded-lg">
                      Yes, clear all
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
        </div>
      </div>

      {/* Notifications List */}
      <div className="space-y-4">
        <AnimatePresence mode="popLayout">
          {notifications.length > 0 ? (
            notifications.map((n) => (
              <motion.div
                key={n._id}
                layout
                variants={fadeUp}
                initial="hidden"
                animate="show"
                exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                className={`group relative flex items-start gap-4 p-5 rounded-xl border transition-all duration-200 hover:shadow-md bg-white ${!n.read
                  ? "border-blue-100 border-l-4 border-l-blue-500 bg-blue-50/10"
                  : "border-gray-100 border-l-4 border-l-transparent hover:border-gray-200"
                  }`}
              >
                {/* Avatar */}
                <div className="relative shrink-0">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-semibold shadow-sm overflow-hidden ${!n.read ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-500"
                    }`}>
                    {n.avatar ? (
                      <img src={n.avatar} alt={n.name} className="w-full h-full object-cover" />
                    ) : (
                      n.name.charAt(0).toUpperCase()
                    )}
                  </div>
                  {!n.read && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-4 w-4 bg-blue-500 ring-2 ring-white"></span>
                    </span>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 pt-1">
                  <div className="flex justify-between items-start gap-4">
                    <p className={`text-base leading-snug ${!n.read ? "text-gray-900 font-medium" : "text-gray-600"}`}>
                      <span className="font-semibold text-gray-900 hover:underline cursor-pointer decoration-blue-500/30 underline-offset-2 transition-all">{n.name}</span>
                      {" "}
                      <span className={!n.read ? "font-medium" : "font-normal"}>{n.message}</span>
                    </p>
                    <span className="shrink-0 text-xs font-medium text-gray-400 whitespace-nowrap bg-gray-50 px-2 py-1 rounded-md border border-gray-100 flex items-center gap-1.5">
                      <Clock size={12} />
                      {new Date(n.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                      {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-dashed border-gray-200"
            >
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                <Clock className="text-gray-300" size={32} />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">All caught up!</h3>
              <p className="text-gray-500 text-sm mt-1">You have no new notifications at the moment.</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Send Notification Dialog */}
      <Dialog open={sendModalOpen} onOpenChange={setSendModalOpen}>
        <DialogContent className="sm:max-w-[500px] fixed top-1/2 left-1/2 transform -translate-x-1/4 -translate-y-1/4">
          <DialogHeader>
            <DialogTitle>Send Notification</DialogTitle>
            <DialogDescription>
              Send a notification to users. You can send to all users of a role or a specific user.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Title</label>
              <input
                type="text"
                value={notificationForm.name}
                onChange={(e) => setNotificationForm({ ...notificationForm, name: e.target.value })}
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter notification title"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Message</label>
              <textarea
                value={notificationForm.message}
                onChange={(e) => setNotificationForm({ ...notificationForm, message: e.target.value })}
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={4}
                placeholder="Enter notification message"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Recipient Role</label>
              <select
                value={notificationForm.recipientRole}
                onChange={(e) => setNotificationForm({ ...notificationForm, recipientRole: e.target.value as any, recipient: "" })}
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select role</option>
                <option value="Admin">All Admins</option>
                <option value="Consultant">All Consultants</option>
                <option value="Client">All Clients</option>
              </select>
            </div>
            {notificationForm.recipientRole && filteredUsers.length > 0 && (
              <div>
                <label className="text-sm font-medium text-gray-700">Specific User (Optional)</label>
                <select
                  value={notificationForm.recipient}
                  onChange={(e) => setNotificationForm({ ...notificationForm, recipient: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All {notificationForm.recipientRole}s</option>
                  {filteredUsers.map((user: any) => (
                    <option key={user._id || user.id} value={user._id || user.id}>
                      {user.fullName || user.name || user.email} ({user.email})
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-gray-700">Type</label>
              <select
                value={notificationForm.type}
                onChange={(e) => setNotificationForm({ ...notificationForm, type: e.target.value as any })}
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="other">Other</option>
                <option value="system">System</option>
                <option value="appointment">Appointment</option>
                <option value="registration">Registration</option>
                <option value="payment">Payment</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <button
              onClick={() => setSendModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSendNotification}
              disabled={isCreating || !notificationForm.name || !notificationForm.message || !notificationForm.recipientRole}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCreating ? "Sending..." : "Send Notification"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};

export default NotificationsPage;
