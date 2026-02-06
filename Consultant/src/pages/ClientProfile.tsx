import React, { useMemo, useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  User,
  CalendarDays,
  DollarSign,
  CheckCircle2,
  MapPin,
  Mail,
  Phone,
  Clock,
  Pencil,
  Upload,
  Loader2,
  Trash2,
  Shield,
  Download,
} from "lucide-react";
import { useDispatch } from "react-redux";
import { updateUser } from "@/features/auth/authSlice";
import UploadAPI from "@/api/upload.api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import DashboardAPI from "@/api/dashboard.api";
import ClientAPI from "@/api/client.api";
import { toast } from "react-hot-toast";
import { cn } from "@/lib/utils";

/* --------------------------------------
   Top heading + client header (persistent for all tabs)
-------------------------------------- */
function PageHeading({ profile }: { profile: any }) {
  const [isUploading, setIsUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const dispatch = useDispatch();

  const updateProfileMutation = useMutation({
    mutationFn: (data: any) => ClientAPI.updateProfile(data),
    onSuccess: (data: any, variables: any) => {
      toast.success("Profile photo updated");
      // Update Redux state if avatar was updated
      if (variables.avatar !== undefined) {
        dispatch(updateUser({
          id: profile._id,
          name: profile.fullName,
          role: 'Client',
          avatar: variables.avatar,
          ...variables
        }));
      }
      queryClient.invalidateQueries({ queryKey: ["clientProfile"] });
    },
    onError: () => {
      toast.error("Failed to update profile photo");
    }
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setIsUploading(true);
      try {
        const response = await UploadAPI.uploadImage(e.target.files[0]);
        await updateProfileMutation.mutateAsync({ avatar: response.data.url });
      } catch (error) {
        console.error("Upload failed", error);
        toast.error("Failed to upload image");
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleDeletePhoto = async () => {
    if (!confirm("Are you sure you want to remove your profile photo?")) return;
    try {
      await updateProfileMutation.mutateAsync({ avatar: "" });
    } catch (error) {
      console.error("Delete failed", error);
    }
  };

  if (!profile) return null;

  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-lg font-semibold">Client Management</h1>
        <p className="text-xs text-muted-foreground">Home » Clients</p>
      </div>

      <div className="rounded-xl border bg-blue-50/80 p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="relative group">
            <div className="h-20 w-20 rounded-full border bg-white overflow-hidden flex items-center justify-center">
              {profile.avatar || profile.profileImage ? (
                <img
                  src={profile.avatar || profile.profileImage}
                  alt="avatar"
                  className="h-full w-full object-cover"
                />
              ) : (
                <User className="h-10 w-10 text-gray-300" />
              )}
            </div>
            {/* Hover Overlay for Upload */}
            <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer" onClick={() => fileRef.current?.click()}>
              {isUploading ? (
                <Loader2 className="h-6 w-6 text-white animate-spin" />
              ) : (
                <Upload className="h-6 w-6 text-white" />
              )}
            </div>
            <input
              type="file"
              ref={fileRef}
              className="hidden"
              accept="image/*"
              onChange={handleImageUpload}
              disabled={isUploading}
            />
          </div>

          <div className="text-center sm:text-left">
            <div className="text-lg font-semibold">{profile.fullName}</div>
            <div className="text-xs text-muted-foreground">
              {profile.email}
            </div>
            <div className="mt-1 flex items-center justify-center sm:justify-start gap-2">
              <Badge
                variant="outline"
                className="bg-emerald-50 text-emerald-700 border-emerald-400 "
              >
                Active Member
              </Badge>
              {(profile.avatar || profile.profileImage) && (
                <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500 hover:bg-red-50" onClick={handleDeletePhoto} title="Remove photo">
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
        </div>
        <div className="text-right text-s text-muted-foreground">
          <div>Member since</div>
          <div className="font-medium text-foreground">{new Date(profile.createdAt).toLocaleDateString()}</div>
        </div>
      </div>
    </div>
  );
}

/* --------------------------------------
   Small sparkline for stats
-------------------------------------- */
/* --------------------------------------
   Profile Tab (stats + personal info)
-------------------------------------- */

function ProfileField({
  label,
  icon: Icon,
  value,
  name,
  onChange,
  disabled,
  readOnly,
  type = "text",
}: {
  label: string;
  icon?: any;
  value: string;
  name?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  readOnly?: boolean;
  type?: string;
}) {
  return (
    <div className="space-y-1">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="relative">
        {Icon && (
          <Icon className="absolute left-3 top-1/2 -translate-y-1/4 h-4 w-4 text-muted-foreground" />
        )}
        <Input
          name={name}
          value={value}
          onChange={onChange}
          readOnly={readOnly}
          disabled={disabled}
          type={type}
          className={cn(
            Icon ? "pl-9" : "",
            disabled && !readOnly ? "bg-muted/40 border-muted/60 text-sm" : "bg-white text-sm"
          )}
        />
      </div>
    </div>
  );
}

function ProfileTab({ profile }: { profile: any }) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    mobile: "",
    dob: "",
    address: "",
    city: "",
    state: "",
    country: "",
    pincode: "",
    emergencyContact: "",
  });

  const queryClient = useQueryClient();

  useEffect(() => {
    if (profile) {
      setFormData({
        fullName: profile.fullName || "",
        email: profile.email || "",
        mobile: profile.mobile || "",
        dob: profile.dob ? new Date(profile.dob).toISOString().split("T")[0] : "",
        address: profile.address || "",
        city: profile.city || "",
        state: profile.state || "",
        country: profile.country || "",
        pincode: profile.pincode || "",
        emergencyContact: profile.emergencyContact || "",
      });
    }
  }, [profile]);

  const mutation = useMutation({
    mutationFn: (data: any) => ClientAPI.updateProfile(data),
    onSuccess: () => {
      toast.success("Profile updated successfully");
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ["clientProfile"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to update profile");
    },
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = () => {
    mutation.mutate(formData);
  };

  const handleCancel = () => {
    setIsEditing(false);
    if (profile) {
      setFormData({
        fullName: profile.fullName || "",
        email: profile.email || "",
        mobile: profile.mobile || "",
        dob: profile.dob ? new Date(profile.dob).toISOString().split("T")[0] : "",
        address: profile.address || "",
        city: profile.city || "",
        state: profile.state || "",
        country: profile.country || "",
        pincode: profile.pincode || "",
        emergencyContact: profile.emergencyContact || "",
      });
    }
  };

  if (!profile) return null;

  return (
    <div className="space-y-4">
      <Card className="border-muted/50">
        <CardHeader className="pb-2 flex flex-row items-start justify-between">
          <div>
            <div className="text-sm font-semibold">Personal Information</div>
            <div className="text-xs text-muted-foreground">
              Manage your profile details and personal information
            </div>
          </div>
          {!isEditing && (
            <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
              <Pencil className="h-3.5 w-3.5 mr-2" />
              Edit Profile
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ProfileField
              label="Full Name"
              icon={User}
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              disabled={!isEditing}
            />
            <ProfileField
              label="Email Address"
              icon={Mail}
              value={formData.email}
              readOnly
              disabled
            />
            <ProfileField
              label="Phone Number"
              icon={Phone}
              name="mobile"
              value={formData.mobile}
              onChange={handleChange}
              disabled={!isEditing}
            />
            <ProfileField
              label="Date of Birth"
              icon={CalendarDays}
              name="dob"
              type="date"
              value={formData.dob}
              onChange={handleChange}
              disabled={!isEditing}
            />
            <ProfileField
              label="Address"
              icon={MapPin}
              name="address"
              value={formData.address}
              onChange={handleChange}
              disabled={!isEditing}
            />
            <ProfileField
              label="Emergency Contact"
              icon={Phone}
              name="emergencyContact"
              value={formData.emergencyContact}
              onChange={handleChange}
              disabled={!isEditing}
            />
            <ProfileField
              label="City"
              name="city"
              value={formData.city}
              onChange={handleChange}
              disabled={!isEditing}
            />
            <ProfileField
              label="State"
              name="state"
              value={formData.state}
              onChange={handleChange}
              disabled={!isEditing}
            />
            <ProfileField
              label="Country"
              name="country"
              value={formData.country}
              onChange={handleChange}
              disabled={!isEditing}
            />
            <ProfileField
              label="Pincode"
              name="pincode"
              value={formData.pincode}
              onChange={handleChange}
              disabled={!isEditing}
            />
          </div>

          {isEditing && (
            <div className="flex items-center justify-end gap-3 pt-2">
              <Button variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={mutation.isPending} className="bg-blue-500 hover:bg-blue-600" >
                {mutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* --------------------------------------
   Privacy & Data Section (GDPR)
-------------------------------------- */
function PrivacyDataSection() {
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError] = useState("");

  const handleExport = async () => {
    setExporting(true);
    setDeleteError("");
    try {
      const data = await ClientAPI.exportMyData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `my-data-export-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Data exported successfully");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Export failed");
    } finally {
      setExporting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletePassword.trim()) {
      setDeleteError("Password is required");
      return;
    }
    setDeleting(true);
    setDeleteError("");
    try {
      await ClientAPI.deleteMyAccount(deletePassword);
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    } catch (err: any) {
      setDeleteError(err.response?.data?.message || "Failed to delete account");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-base font-semibold">Privacy & Data</h2>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Export your data or permanently delete your account. GDPR rights.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm text-muted-foreground mb-2">Download a copy of your personal data (profile, appointments, documents, transactions).</p>
          <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting} className="gap-2">
            {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {exporting ? "Exporting..." : "Export My Data"}
          </Button>
        </div>
        <div className="border-t pt-4">
          <p className="text-sm text-muted-foreground mb-2">Permanently delete your account and all data. This cannot be undone.</p>
          <Button variant="destructive" size="sm" onClick={() => setShowDeleteModal(true)} className="gap-2">
            <Trash2 className="h-4 w-4" />
            Delete My Account
          </Button>
        </div>
      </CardContent>

      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="font-semibold text-red-600">Confirm Account Deletion</h3>
            <p className="text-sm text-muted-foreground">
              This will permanently delete your account and all data. Enter your password to confirm.
            </p>
            <Input
              type="password"
              placeholder="Your password"
              value={deletePassword}
              onChange={(e) => { setDeletePassword(e.target.value); setDeleteError(""); }}
              className="mt-2"
            />
            {deleteError && <p className="text-sm text-red-600">{deleteError}</p>}
            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" onClick={() => { setShowDeleteModal(false); setDeletePassword(""); setDeleteError(""); }} disabled={deleting}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDeleteConfirm} disabled={deleting}>
                {deleting ? "Deleting..." : "Delete Permanently"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

/* --------------------------------------
   Main Page with persistent heading + header + tabs
-------------------------------------- */
export default function ClientProfile() {
  const { data: profile, isLoading: loadingProfile, error: profileError, isError: isProfileError } = useQuery({
    queryKey: ["clientProfile"],
    queryFn: ClientAPI.getProfile,
    retry: 1,
  });

  if (loadingProfile) {
    return <div className="p-8 text-center">Loading profile...</div>;
  }

  if (isProfileError) {
    const errorMessage = (profileError as any)?.response?.data?.message ||
      (profileError as any)?.message ||
      "Failed to load profile";
    const statusCode = (profileError as any)?.response?.status;

    return (
      <div className="p-8 text-center space-y-4">
        <div className="text-red-600 font-semibold">Error loading profile</div>
        <div className="text-sm text-muted-foreground">
          {errorMessage} {statusCode && `(Status: ${statusCode})`}
        </div>
        <div className="text-xs text-muted-foreground">
          {(profileError as any)?.response?.status === 404 &&
            "The profile endpoint was not found. Please check if the backend server is running and the route is configured correctly."}
          {(profileError as any)?.response?.status === 403 &&
            "Access denied. You may not have permission to view this profile."}
          {(profileError as any)?.response?.status === 401 &&
            "Authentication failed. Please log in again."}
        </div>
        <Button
          onClick={() => window.location.reload()}
          variant="outline"
          className="mt-4"
        >
          Retry
        </Button>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-8 text-center">
        <div className="text-muted-foreground">No profile data available</div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-4">
      <PageHeading profile={profile} />

      <div className="space-y-4">
        <ProfileTab profile={profile} />
        <PrivacyDataSection />
      </div>
    </div>
  );
}
