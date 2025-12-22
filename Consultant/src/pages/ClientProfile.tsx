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
function Spark({ color = "currentColor" }: { color?: string }) {
  return (
    <svg viewBox="0 0 120 32" className="w-full h-10" aria-hidden>
      <path
        d="M1 24 C 20 26, 24 18, 40 20 S 60 26, 80 22 S 100 26, 119 12"
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function StatCards({ stats }: { stats: any }) {
  if (!stats) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4" /> Total Appointments
            </span>
          </div>
          <div className="mt-1 text-2xl font-semibold">{stats.totalAppointments || 0}</div>
          <div className="text-sky-600 mt-2">
            <Spark />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" /> Completed Sessions
            </span>
          </div>
          <div className="mt-1 text-2xl font-semibold">{stats.completedAppointments || 0}</div>
          <div className="text-orange-500 mt-2">
            <Spark />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-2">
              <Clock className="h-4 w-4" /> Upcoming Appointments
            </span>
          </div>
          <div className="mt-1 text-2xl font-semibold">{stats.upcomingAppointments || 0}</div>
          <div className="text-violet-600 mt-2">
            <Spark />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" /> Total Spent
            </span>
          </div>
          <div className="mt-1 text-2xl font-semibold">₹{stats.totalSpent || 0}</div>
          <div className="text-pink-500 mt-2">
            <Spark />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

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
   Main Page with persistent heading + header + tabs
-------------------------------------- */
export default function ClientProfile() {
  const { data: profile, isLoading: loadingProfile, error: profileError, isError: isProfileError } = useQuery({
    queryKey: ["clientProfile"],
    queryFn: ClientAPI.getProfile,
    retry: 1,
  });

  const { data: statsData } = useQuery({
    queryKey: ["clientStats"],
    queryFn: DashboardAPI.getClientStats,
  });

  const stats = useMemo(() => {
    if (!statsData?.stats) return {};
    return statsData.stats.reduce((acc: any, curr: any) => {
      if (curr.id === 'total') acc.totalAppointments = curr.value;
      if (curr.id === 'completed') acc.completedAppointments = curr.value;
      if (curr.id === 'upcoming') acc.upcomingAppointments = curr.value;
      if (curr.id === 'spent') acc.totalSpent = curr.value;
      return acc;
    }, {});
  }, [statsData]);

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
        <StatCards stats={stats} />
        <ProfileTab profile={profile} />
      </div>
    </div>
  );
}
