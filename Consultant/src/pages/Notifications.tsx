import React, { useMemo, useState } from "react";
import {
  Clock, RefreshCw, Check, Trash2, Send, Bell, Calendar,
  CreditCard, MessageSquare, Settings, Filter, ChevronDown,
  AlertTriangle, X, ArrowRight
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import NotificationsAPI, { NotificationItem, NotificationListResponse } from "@/api/notifications.api";
import ClientConsultantAPI from "@/api/clientConsultant.api";
import { useAuth } from "@/hooks/useAuth";
import ConsultantAPI from "@/api/consultant.api";
import UserAPI from "@/api/user.api";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Button } from "@/components/ui/button";

// Category tabs configuration
const categoryTabs = [
  { id: "all", label: "All", icon: Bell },
  { id: "appointments", label: "Appointments", icon: Calendar },
  { id: "payments", label: "Payments", icon: CreditCard },
  { id: "messages", label: "Messages", icon: MessageSquare },
  { id: "system", label: "System", icon: Settings },
];

// Priority styles
const priorityStyles: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  urgent: { bg: "bg-red-50", text: "text-red-700", border: "border-l-red-500", dot: "bg-red-500" },
  high: { bg: "bg-orange-50", text: "text-orange-700", border: "border-l-orange-500", dot: "bg-orange-500" },
  normal: { bg: "bg-blue-50", text: "text-blue-700", border: "border-l-blue-500", dot: "bg-blue-500" },
  low: { bg: "bg-gray-50", text: "text-gray-600", border: "border-l-gray-300", dot: "bg-gray-400" },
};

// Type icons
const typeIcons: Record<string, React.ReactNode> = {
  appointment: <Calendar className="h-4 w-4" />,
  payment: <CreditCard className="h-4 w-4" />,
  message: <MessageSquare className="h-4 w-4" />,
  reminder: <Clock className="h-4 w-4" />,
  system: <Settings className="h-4 w-4" />,
  alert: <AlertTriangle className="h-4 w-4" />,
  registration: <Bell className="h-4 w-4" />,
  other: <Bell className="h-4 w-4" />,
};

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const NotificationsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeCategory, setActiveCategory] = useState("all");
  const [sendModalOpen, setSendModalOpen] = useState(false);
  const [notificationForm, setNotificationForm] = useState({
    name: "",
    message: "",
    recipient: "",
    type: "message" as NotificationItem["type"],
    priority: "normal" as NotificationItem["priority"],
  });

  // Fetch notifications
  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["notifications", activeCategory],
    queryFn: () => NotificationsAPI.getAll({
      limit: 50,
      category: activeCategory === "all" ? undefined : activeCategory
    }),
  });

  const notifications = data?.data || [];
  const unreadCount = data?.unreadCount || 0;

  // Get grouped counts for tabs
  const { data: groupedData } = useQuery({
    queryKey: ["notifications-grouped"],
    queryFn: NotificationsAPI.getGrouped,
  });

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: 0 };
    if (groupedData) {
      groupedData.forEach((g: any) => {
        counts[g._id] = g.unreadCount;
        counts.all += g.unreadCount;
      });
    }
    return counts;
  }, [groupedData]);

  // Consultant clients for send modal
  const { data: consultantsData } = useQuery({
    queryKey: ["consultants"],
    queryFn: () => ConsultantAPI.getAll(),
    enabled: !!user?.email,
  });

  const { data: usersData } = useQuery({
    queryKey: ["users"],
    queryFn: () => UserAPI.getAllUsers(),
    enabled: !!user?.email,
  });

  const currentConsultant = useMemo(() => {
    if (!user?.email) return null;
    if (consultantsData?.data) {
      const found = consultantsData.data.find((c: any) => c.email?.toLowerCase() === user.email?.toLowerCase());
      if (found) return found;
    }
    if (usersData?.data) {
      const found = usersData.data.find((u: any) => u.email?.toLowerCase() === user.email?.toLowerCase() && u.role === "Consultant");
      if (found) return { _id: found._id || found.id, id: found._id || found.id };
    }
    return null;
  }, [user?.email, consultantsData?.data, usersData?.data]);

  const consultantId = currentConsultant?._id || currentConsultant?.id;

  const { data: linkedClientsData } = useQuery({
    queryKey: ["consultant-clients", consultantId],
    queryFn: async () => {
      if (!consultantId) return [];
      try {
        const res = await ClientConsultantAPI.getConsultantClients(consultantId);
        if (Array.isArray(res)) return res;
        if (res?.data && Array.isArray(res.data)) return res.data;
        if (res?.data?.data && Array.isArray(res.data.data)) return res.data.data;
        return [];
      } catch { return []; }
    },
    enabled: !!consultantId,
  });

  const linkedClients = linkedClientsData || [];

  // Mutations
  const { mutate: markRead } = useMutation({
    mutationFn: NotificationsAPI.markRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-grouped"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-unread-count"] });
    },
  });

  const { mutate: markAllRead, isPending: isMarkingAll } = useMutation({
    mutationFn: NotificationsAPI.markAllRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-grouped"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-unread-count"] });
    },
  });

  const { mutate: deleteNotification } = useMutation({
    mutationFn: NotificationsAPI.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-grouped"] });
    },
  });

  const { mutate: deleteAll, isPending: isDeletingAll } = useMutation({
    mutationFn: NotificationsAPI.deleteAll,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-grouped"] });
    },
  });

  const { mutate: sendToClient, isPending: isSending } = useMutation({
    mutationFn: NotificationsAPI.sendToClient,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      setSendModalOpen(false);
      setNotificationForm({ name: "", message: "", recipient: "", type: "message", priority: "normal" });
    },
  });

  const handleNotificationClick = (notification: NotificationItem) => {
    if (!notification.read) {
      markRead(notification._id);
    }
    if (notification.actionUrl) {
      if (notification.actionUrl.startsWith("http")) {
        window.open(notification.actionUrl, "_blank");
      } else {
        navigate(notification.actionUrl);
      }
    }
  };

  return (
    <motion.div
      className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100/50 p-6 space-y-6"
      animate={{ opacity: isFetching ? 0.7 : 1 }}
      transition={{ duration: 0.2 }}
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-xl">
              <Bell className="h-6 w-6 text-blue-600" />
            </div>
            Notifications
          </h1>
          <p className="text-sm text-gray-500 mt-1 ml-12">
            Stay updated with your appointments and messages
          </p>
        </div>

        <div className="flex items-center gap-3">
          <motion.button
            className="p-2.5 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-600 transition shadow-sm"
            onClick={() => refetch()}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            disabled={isFetching}
            title="Refresh"
          >
            <RefreshCw size={18} className={isFetching ? "animate-spin" : ""} />
          </motion.button>

          {linkedClients.length > 0 && (
            <Button
              onClick={() => setSendModalOpen(true)}
              className="gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-md"
            >
              <Send size={16} /> Send to Client
            </Button>
          )}
        </div>
      </div>

      {/* Category Tabs */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-1.5 flex gap-1 overflow-x-auto">
        {categoryTabs.map((tab) => {
          const Icon = tab.icon;
          const count = categoryCounts[tab.id] || 0;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveCategory(tab.id)}
              className={cn(
                "flex-1 min-w-[120px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all",
                activeCategory === tab.id
                  ? "bg-blue-600 text-white shadow-md"
                  : "text-gray-600 hover:bg-gray-100"
              )}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
              {count > 0 && (
                <span className={cn(
                  "ml-1 px-2 py-0.5 text-xs rounded-full",
                  activeCategory === tab.id
                    ? "bg-white/20 text-white"
                    : "bg-red-100 text-red-600"
                )}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Control Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-600">
            {notifications.length} notification{notifications.length !== 1 ? "s" : ""}
          </span>
          {unreadCount > 0 && (
            <span className="px-2.5 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-full">
              {unreadCount} unread
            </span>
          )}
        </div>

        <div className="flex gap-2">
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => markAllRead()}
              disabled={isMarkingAll}
              className="gap-2"
            >
              <Check size={14} /> Mark all read
            </Button>
          )}

          {notifications.length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 text-red-600 border-red-200 hover:bg-red-50">
                  <Trash2 size={14} /> Clear all
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="fixed top-1/2 left-1/2 transform -translate-x-1/4 -translate-y-1/4">
                <AlertDialogHeader>
                  <AlertDialogTitle>Clear all notifications?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. All your notifications will be permanently removed.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => deleteAll()}
                    disabled={isDeletingAll}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Yes, clear all
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {isLoading ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center justify-center py-20"
            >
              <div className="animate-spin h-8 w-8 border-3 border-blue-600 border-t-transparent rounded-full" />
            </motion.div>
          ) : notifications.length > 0 ? (
            notifications.map((n) => {
              const styles = priorityStyles[n.priority] || priorityStyles.normal;
              return (
                <motion.div
                  key={n._id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={cn(
                    "group relative flex items-start gap-4 p-5 rounded-2xl border-l-4 bg-white shadow-sm transition-all duration-200 hover:shadow-md cursor-pointer",
                    !n.read ? styles.border : "border-l-transparent border border-gray-100"
                  )}
                  onClick={() => handleNotificationClick(n)}
                >
                  {/* Icon */}
                  <div className={cn(
                    "shrink-0 w-12 h-12 rounded-xl flex items-center justify-center",
                    !n.read ? styles.bg : "bg-gray-100"
                  )}>
                    <span className={!n.read ? styles.text : "text-gray-500"}>
                      {typeIcons[n.type] || typeIcons.other}
                    </span>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <p className={cn("text-base leading-snug", !n.read ? "text-gray-900 font-medium" : "text-gray-600")}>
                          <span className="font-semibold">{n.name}</span> {n.message}
                        </p>
                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-xs text-gray-400 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatTimeAgo(n.createdAt)}
                          </span>
                          {n.priority === "urgent" && (
                            <span className="text-xs font-medium text-red-600 flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" /> Urgent
                            </span>
                          )}
                          {n.actionUrl && (
                            <span className="text-xs text-blue-600 flex items-center gap-1 font-medium">
                              {n.actionLabel || "View details"} <ArrowRight className="h-3 w-3" />
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {!n.read && (
                          <button
                            onClick={(e) => { e.stopPropagation(); markRead(n._id); }}
                            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-blue-600 transition"
                            title="Mark as read"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteNotification(n._id); }}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition"
                          title="Delete"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Unread indicator */}
                  {!n.read && (
                    <span className={cn("absolute top-5 right-5 w-2.5 h-2.5 rounded-full", styles.dot)} />
                  )}
                </motion.div>
              );
            })
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-dashed border-gray-200"
            >
              <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
                <Bell className="h-10 w-10 text-gray-300" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">All caught up!</h3>
              <p className="text-gray-500 text-sm mt-1">No notifications in this category</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Send Notification Dialog */}
      <Dialog open={sendModalOpen} onOpenChange={setSendModalOpen}>
        <DialogContent className="sm:max-w-[500px] fixed top-1/2 left-1/2 transform -translate-x-1/4 -translate-y-1/4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5 text-blue-600" />
              Send Notification to Client
            </DialogTitle>
            <DialogDescription>
              Send a personalized notification to one of your linked clients.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Title</label>
              <input
                type="text"
                value={notificationForm.name}
                onChange={(e) => setNotificationForm({ ...notificationForm, name: e.target.value })}
                className="w-full mt-1.5 px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., Appointment Reminder"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Message</label>
              <textarea
                value={notificationForm.message}
                onChange={(e) => setNotificationForm({ ...notificationForm, message: e.target.value })}
                className="w-full mt-1.5 px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={3}
                placeholder="Your message here..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Client</label>
                <select
                  value={notificationForm.recipient}
                  onChange={(e) => setNotificationForm({ ...notificationForm, recipient: e.target.value })}
                  className="w-full mt-1.5 px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select client</option>
                  {linkedClients.map((client: any) => (
                    <option key={client._id || client.id} value={client._id || client.id}>
                      {client.fullName || client.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Priority</label>
                <select
                  value={notificationForm.priority}
                  onChange={(e) => setNotificationForm({ ...notificationForm, priority: e.target.value as any })}
                  className="w-full mt-1.5 px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSendModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => sendToClient(notificationForm)}
              disabled={isSending || !notificationForm.name || !notificationForm.message || !notificationForm.recipient}
              className="gap-2 bg-blue-600 hover:bg-blue-700"
            >
              {isSending ? "Sending..." : "Send Notification"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};

export default NotificationsPage;
