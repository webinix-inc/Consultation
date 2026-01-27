import React, { useState, useEffect } from "react";
import { Bell, User, Save, AlertCircle, Shield, Eye, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

// API service
import axiosInstance from "@/api/axiosInstance";

interface AdminSettings {
  profile: {
    name: string;
    email: string;
  };
  platform: {
    name: string;
    description: string;
    version: string;
  };
  general: {
    language: string;
    timezone: string;
    dateFormat: string;
    timeFormat: string;
    currency: string;
    defaultPage: string;
  };
  notifications: {
    email: boolean;
    sms: boolean;
    push: boolean;
    appointment: boolean;
    payment: boolean;
    marketing: boolean;
    system: boolean;
  };
  security: {
    termsAndConditions: string;
    privacyPolicy: string;
  };

}

const SettingsPage = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"general" | "notifications" | "security">("general");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewContent, setPreviewContent] = useState<{ title: string; content: string } | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [settings, setSettings] = useState<AdminSettings>({
    profile: {
      name: "",
      email: "",
    },
    platform: {
      name: "NexFutrr Consultation",
      description: "",
      version: "1.0.0",
    },
    general: {
      language: "en",
      timezone: "UTC",
      dateFormat: "MM/DD/YYYY",
      timeFormat: "12h",
      currency: "USD",
      defaultPage: "dashboard",
    },
    notifications: {
      email: true,
      sms: false,
      push: true,
      appointment: true,
      payment: true,
      marketing: false,
      system: true,
    },
    security: {
      termsAndConditions: "",
      privacyPolicy: "",
    },

  });



  // Fetch settings on component mount
  useEffect(() => {
    // Get user data from Redux or localStorage as fallback
    const userData = user || JSON.parse(localStorage.getItem("user") || "{}");

    if (userData?.id) {
      fetchSettings();
    } else if (userData?.name || userData?.email) {
      // Set profile data from user object even if no user.id
      setSettings(prev => ({
        ...prev,
        profile: {
          name: userData?.name || "",
          email: userData?.email || "",
          ...prev.profile
        }
      }));
    }
  }, [user?.id, user?.name, user?.email]);


  const fetchSettings = async () => {
    try {
      setLoading(true);
      // Get user data from Redux or localStorage as fallback
      const userData = user || JSON.parse(localStorage.getItem("user") || "{}");

      if (!userData?.id) {
        setMessage({ type: "error", text: "User not authenticated" });
        return;
      }
      const response = await axiosInstance.get(`/admin-settings/${userData.id}`);

      if (response.data && response.data.data) {
        const fetchedSettings = response.data.data;

        // Update settings with fetched data and merge with user profile info
        const updatedSettings = {
          ...fetchedSettings,
          profile: {
            ...fetchedSettings.profile,
            name: userData?.name || fetchedSettings.profile?.name || "",
            email: userData?.email || fetchedSettings.profile?.email || ""
          },
          platform: {
            name: "NexFutrr Consultation",
            description: fetchedSettings.platform?.description || "",
            version: fetchedSettings.platform?.version || "1.0.0",
            ...fetchedSettings.platform
          },
          notifications: {
            email: fetchedSettings.notifications?.email ?? true,
            sms: fetchedSettings.notifications?.sms ?? false,
            push: fetchedSettings.notifications?.push ?? true,
            appointment: fetchedSettings.notifications?.appointment ?? true,
            payment: fetchedSettings.notifications?.payment ?? true,
            marketing: fetchedSettings.notifications?.marketing ?? false,
            system: fetchedSettings.notifications?.system ?? true,
          },
          security: {
            termsAndConditions: fetchedSettings.security?.termsAndConditions || "",
            privacyPolicy: fetchedSettings.security?.privacyPolicy || "",
          }
        };

        setSettings(updatedSettings);
      } else {
        // If no settings exist, create from user data
        const defaultSettings = {
          profile: {
            name: userData?.name || "",
            email: userData?.email || ""
          },
          platform: {
            name: "NexFutrr Consultation",
            description: "",
            version: "1.0.0"
          },
          general: {
            language: "en",
            timezone: "UTC",
            dateFormat: "MM/DD/YYYY",
            timeFormat: "12h",
            currency: "USD",
            defaultPage: "dashboard"
          },
          notifications: {
            email: true,
            sms: false,
            push: true,
            appointment: true,
            payment: true,
            marketing: false,
            system: true
          },
          security: {
            termsAndConditions: "",
            privacyPolicy: ""
          },

        };

        setSettings(defaultSettings);
      }
    } catch (error) {
      console.error("Failed to fetch settings:", error);

      // Fallback to user data if API fails
      const userData = user || JSON.parse(localStorage.getItem("user") || "{}");
      const fallbackSettings = {
        profile: {
          name: userData?.name || "",
          email: userData?.email || ""
        },
        platform: {
          name: "NexFutrr Consultation",
          description: "",
          version: "1.0.0"
        },
        general: {
          language: "en",
          timezone: "UTC",
          dateFormat: "MM/DD/YYYY",
          timeFormat: "12h",
          currency: "USD",
          defaultPage: "dashboard"
        },
        notifications: {
          email: true,
          sms: false,
          push: true,
          appointment: true,
          payment: true,
          marketing: false,
          system: true
        },
        security: {
          termsAndConditions: "",
          privacyPolicy: ""
        },

      };

      setSettings(fallbackSettings);
      setMessage({ type: "error", text: "Failed to load settings from server, using local data" });
    } finally {
      setLoading(false);
    }
  };

  const updateProfileSettings = async () => {
    try {
      setSaving(true);
      // Get user data from Redux or localStorage as fallback
      const userData = user || JSON.parse(localStorage.getItem("user") || "{}");

      if (!userData?.id) {
        setMessage({ type: "error", text: "User not authenticated" });
        return;
      }

      // Update admin settings (excluding email since it's read-only)
      await axiosInstance.put(`/admin-settings/${userData.id}/profile`, {
        name: settings.profile.name,
        email: settings.profile.email // Keep email for consistency but it's read-only
      });

      // Update user model directly for name
      await axiosInstance.patch("/auth/edit-profile", {
        fullName: settings.profile.name,
      });

      // Update user data in Redux and localStorage
      if (userData) {
        const updatedUserData = {
          ...userData,
          name: settings.profile.name
        };

        // Update localStorage
        localStorage.setItem("user", JSON.stringify(updatedUserData));

        // If you have a Redux action to update user, dispatch it here
        // dispatch(updateUser(updatedUserData));
      }

      setMessage({ type: "success", text: "Profile settings updated successfully" });
    } catch (error) {
      console.error("Failed to update profile settings:", error);
      setMessage({ type: "error", text: "Failed to update profile settings" });
    } finally {
      setSaving(false);
    }
  };

  const updatePlatformSettings = async () => {
    try {
      setSaving(true);
      // Get user data from Redux or localStorage as fallback
      const userData = user || JSON.parse(localStorage.getItem("user") || "{}");

      if (!userData?.id) {
        setMessage({ type: "error", text: "User not authenticated" });
        return;
      }
      await axiosInstance.put(`/admin-settings/${userData.id}/platform`, settings.platform);
      setMessage({ type: "success", text: "Platform settings updated successfully" });
    } catch (error) {
      console.error("Failed to update platform settings:", error);
      setMessage({ type: "error", text: "Failed to update platform settings" });
    } finally {
      setSaving(false);
    }
  };

  const updateGeneralSettings = async () => {
    try {
      setSaving(true);
      if (!user?.id) {
        setMessage({ type: "error", text: "User not authenticated" });
        return;
      }

      // Save both general and platform settings together
      await Promise.all([
        axiosInstance.put(`/admin-settings/${user.id}/general`, settings.general),
        axiosInstance.put(`/admin-settings/${user.id}/platform`, settings.platform)
      ]);

      setMessage({ type: "success", text: "General and platform settings updated successfully" });
    } catch (error) {
      console.error("Failed to update general settings:", error);
      setMessage({ type: "error", text: "Failed to update general settings" });
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const updateNotificationSettings = async () => {
    try {
      setSaving(true);
      if (!user?.id) {
        setMessage({ type: "error", text: "User not authenticated" });
        return;
      }

      const response = await axiosInstance.put(`/admin-settings/${user.id}/notifications`, settings.notifications);

      setMessage({ type: "success", text: "Notification settings updated successfully" });
    } catch (error) {
      console.error("Failed to update notification settings:", error);
      setMessage({ type: "error", text: "Failed to update notification settings" });
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const updateSecuritySettings = async () => {
    try {
      setSaving(true);
      if (!user?.id) {
        setMessage({ type: "error", text: "User not authenticated" });
        return;
      }

      await axiosInstance.put(`/admin-settings/${user.id}/security`, settings.security);

      setMessage({ type: "success", text: "Security settings updated successfully" });
    } catch (error) {
      console.error("Failed to update security settings:", error);
      setMessage({ type: "error", text: "Failed to update security settings" });
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };



  const handleSave = () => {
    switch (activeTab) {
      case "general":
        updateGeneralSettings();
        break;
      case "notifications":
        updateNotificationSettings();
        break;
      case "security":
        updateSecuritySettings();
        break;

    }
  };

  const handleToggle = (key: string) => {
    setSettings(prev => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        [key]: !prev.notifications[key],
      },
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="text-gray-500">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">Settings</h2>
          <p className="text-sm text-gray-500">Home &gt; Settings</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 transition disabled:opacity-50"
        >
          <Save size={16} />
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>

      {/* Message Alert */}
      {message && (
        <div className={`flex items-center gap-2 p-3 rounded-md ${message.type === "success" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"
          }`}>
          <AlertCircle size={16} />
          <span className="text-sm">{message.text}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex bg-white border rounded-lg overflow-hidden">
        {[
          { key: "general", label: "General", icon: <User size={15} /> },
          { key: "notifications", label: "Notifications", icon: <Bell size={15} /> },
          { key: "security", label: "Security", icon: <Shield size={15} /> },

        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as typeof activeTab)}
            className={`flex-1 text-sm py-2.5 font-medium transition border-b-2 ${activeTab === tab.key
              ? "border-blue-600 text-blue-600 bg-blue-50"
              : "border-transparent text-gray-600 hover:bg-gray-50"
              }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* === General Tab === */}
      {activeTab === "general" && (
        <div className="bg-white border rounded-xl p-6 shadow-sm space-y-6">
          {/* Profile Section */}
          <div>
            <h3 className="font-semibold text-gray-800 mb-1">Profile Information</h3>
            <p className="text-sm text-gray-500">Manage your admin profile details</p>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="text-sm text-gray-700">Admin Name</label>
              <input
                type="text"
                value={settings.profile.name}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  profile: { ...prev.profile, name: e.target.value }
                }))}
                className="w-full border rounded-md mt-1 p-2 text-sm bg-gray-50"
                placeholder="Enter your name"
              />
            </div>
            <div>
              <label className="text-sm text-gray-700">Admin Email</label>
              <input
                type="email"
                value={settings.profile.email}
                disabled
                className="w-full border rounded-md mt-1 p-2 text-sm bg-gray-100 cursor-not-allowed"
                placeholder="Enter your email"
              />
            </div>
          </div>

          {/* Profile Section Save Button */}
          <div className="flex justify-end">
            <button
              onClick={updateProfileSettings}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 transition disabled:opacity-50"
            >
              <Save size={16} />
              {saving ? "Saving..." : "Save Profile"}
            </button>
          </div>

          {/* Platform Section */}
          <div>
            <h3 className="font-semibold text-gray-800 mb-1">Platform Settings</h3>
            <p className="text-sm text-gray-500">Configure platform information</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm text-gray-700">Platform Name</label>
              <input
                type="text"
                value={settings.platform.name}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  platform: { ...prev.platform, name: e.target.value }
                }))}
                className="w-full border rounded-md mt-1 p-2 text-sm bg-gray-50"
                placeholder="Enter platform name"
              />
            </div>
            <div>
              <label className="text-sm text-gray-700">Platform Description</label>
              <textarea
                value={settings.platform.description}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  platform: { ...prev.platform, description: e.target.value }
                }))}
                className="w-full border rounded-md mt-1 p-2 text-sm bg-gray-50"
                rows={3}
                placeholder="Enter platform description"
              />
            </div>
            <div>
              <label className="text-sm text-gray-700">Version</label>
              <input
                type="text"
                value={settings.platform.version}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  platform: { ...prev.platform, version: e.target.value }
                }))}
                className="w-full border rounded-md mt-1 p-2 text-sm bg-gray-50"
                placeholder="Enter version"
              />
            </div>
          </div>

          {/* Platform Section Save Button */}
          <div className="flex justify-end">
            <button
              onClick={updatePlatformSettings}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 transition disabled:opacity-50"
            >
              <Save size={16} />
              {saving ? "Saving..." : "Save Platform"}
            </button>
          </div>

          <div>
            <h3 className="font-semibold text-gray-800 mb-1">General Settings</h3>
            <p className="text-sm text-gray-500">Manage your general preferences</p>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="text-sm text-gray-700">Language</label>
              <select
                value={settings.general.language}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  general: { ...prev.general, language: e.target.value }
                }))}
                className="w-full border rounded-md mt-1 p-2 text-sm bg-gray-50"
              >
                <option>English</option>
                <option>Spanish</option>
                <option>French</option>
              </select>
            </div>

            <div>
              <label className="text-sm text-gray-700">Timezone</label>
              <select
                value={settings.general.timezone}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  general: { ...prev.general, timezone: e.target.value }
                }))}
                className="w-full border rounded-md mt-1 p-2 text-sm bg-gray-50"
              >
                <option>UTC</option>
                <option>EST</option>
                <option>PST</option>
                <option>GMT</option>
              </select>
            </div>

            <div>
              <label className="text-sm text-gray-700">Date Format</label>
              <select
                value={settings.general.dateFormat}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  general: { ...prev.general, dateFormat: e.target.value }
                }))}
                className="w-full border rounded-md mt-1 p-2 text-sm bg-gray-50"
              >
                <option>MM/DD/YYYY</option>
                <option>DD/MM/YYYY</option>
                <option>YYYY-MM-DD</option>
              </select>
            </div>

            <div>
              <label className="text-sm text-gray-700">Time Format</label>
              <select
                value={settings.general.timeFormat}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  general: { ...prev.general, timeFormat: e.target.value }
                }))}
                className="w-full border rounded-md mt-1 p-2 text-sm bg-gray-50"
              >
                <option>12h</option>
                <option>24h</option>
              </select>
            </div>

            <div>
              <label className="text-sm text-gray-700">Currency</label>
              <select
                value={settings.general.currency}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  general: { ...prev.general, currency: e.target.value }
                }))}
                className="w-full border rounded-md mt-1 p-2 text-sm bg-gray-50"
              >
                <option>USD</option>
                <option>EUR</option>
                <option>GBP</option>
              </select>
            </div>

            <div>
              <label className="text-sm text-gray-700">Default Page</label>
              <select
                value={settings.general.defaultPage}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  general: { ...prev.general, defaultPage: e.target.value }
                }))}
                className="w-full border rounded-md mt-1 p-2 text-sm bg-gray-50"
              >
                <option>dashboard</option>
                <option>appointments</option>
                <option>users</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* === Notifications Tab === */}
      {activeTab === "notifications" && (
        <div className="bg-white border rounded-xl p-6 shadow-sm space-y-6">
          <div>
            <h3 className="font-semibold text-gray-800 mb-1">Notification Preferences</h3>
            <p className="text-sm text-gray-500">Choose how you want to receive notifications</p>
          </div>

          {[
            { label: "Email Notifications", desc: "Receive notifications via email", key: "email" as const },
            { label: "SMS Notifications", desc: "Receive notifications via SMS", key: "sms" as const },
            { label: "Push Notifications", desc: "Receive browser push notifications", key: "push" as const },
          ].map((item) => (
            <div key={item.key} className="flex justify-between items-center border-b last:border-none py-3">
              <div>
                <p className="text-gray-800 text-sm font-medium">{item.label}</p>
                <p className="text-xs text-gray-500">{item.desc}</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.notifications[item.key] || false}
                  onChange={() => handleToggle(item.key)}
                  className="sr-only peer"
                />
                <div className="w-10 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer-checked:bg-blue-600 transition-all"></div>
                <div className="absolute left-1 top-1 w-3 h-3 bg-white rounded-full transition-transform peer-checked:translate-x-5"></div>
              </label>
            </div>
          ))}

          {[
            { label: "Appointment Updates", desc: "New bookings, cancellations, and changes", key: "appointment" },
            { label: "Payment Notifications", desc: "Payment confirmations and issues", key: "payment" },
            { label: "Marketing Updates", desc: "Product updates and promotional content", key: "marketing" },
          ].map((item) => (
            <div key={item.key} className="space-y-3">
              <div className="flex justify-between items-center border rounded-lg p-3">
                <div>
                  <p className="text-sm text-gray-800 font-medium">{item.label}</p>
                  <p className="text-xs text-gray-500">{item.desc}</p>
                </div>
              </div>
              <div className="ml-4 space-y-2">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={settings.notifications.email || false}
                    onChange={() => handleToggle("email")}
                    className="rounded"
                  />
                  Email
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={settings.notifications.sms || false}
                    onChange={() => handleToggle("sms")}
                    className="rounded"
                  />
                  SMS
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={settings.notifications.push || false}
                    onChange={() => handleToggle("push")}
                    className="rounded"
                  />
                  Push
                </label>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* === Security Tab === */}
      {activeTab === "security" && (
        <div className="bg-white border rounded-xl p-6 shadow-sm space-y-6">
          <div>
            <h3 className="font-semibold text-gray-800 mb-1">Security & Legal</h3>
            <p className="text-sm text-gray-500">Manage legal documents and policies</p>
          </div>

          <div className="space-y-6">
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm text-gray-700 font-medium">Terms and Conditions</label>
                <button
                  onClick={() => setPreviewContent({ title: "Terms and Conditions", content: settings.security.termsAndConditions })}
                  className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  <Eye size={14} /> Preview
                </button>
              </div>
              <textarea
                value={settings.security.termsAndConditions}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  security: { ...prev.security, termsAndConditions: e.target.value }
                }))}
                className="w-full border rounded-md p-3 text-sm bg-gray-50 min-h-[200px] focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="Enter Terms and Conditions..."
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm text-gray-700 font-medium">Privacy Policy</label>
                <button
                  onClick={() => setPreviewContent({ title: "Privacy Policy", content: settings.security.privacyPolicy })}
                  className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  <Eye size={14} /> Preview
                </button>
              </div>
              <textarea
                value={settings.security.privacyPolicy}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  security: { ...prev.security, privacyPolicy: e.target.value }
                }))}
                className="w-full border rounded-md p-3 text-sm bg-gray-50 min-h-[200px] focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="Enter Privacy Policy..."
              />
            </div>
          </div>
        </div>
      )}

      {/* === Preview Modal === */}
      {previewContent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-semibold">{previewContent.title} Preview</h3>
              <button
                onClick={() => setPreviewContent(null)}
                className="p-1 hover:bg-gray-100 rounded-full text-gray-500"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 bg-gray-50">
              <div
                className="prose max-w-none bg-white p-8 rounded shadow-sm"
                dangerouslySetInnerHTML={{ __html: previewContent.content }}
              />
            </div>
            <div className="p-4 border-t flex justify-end">
              <button
                onClick={() => setPreviewContent(null)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}


    </div>
  );
};

export default SettingsPage;
