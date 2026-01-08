import React, {
  useMemo, useRef, useState, useCallback,
  useEffect,
} from "react";

import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card";
import { useDispatch } from "react-redux";
import { updateUser } from "@/features/auth/authSlice";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  CalendarDays,
  Loader2,
  Pencil,
  Star,
  Trash2,
  Upload,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Image as ImageIcon } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import UserAPI from "@/api/user.api";
import ConsultantAPI from "@/api/consultant.api";
import CategoryAPI from "@/api/category.api";
import SubcategoryAPI from "@/api/subcategory.api";
import { toast } from "react-hot-toast";
import { Autocomplete } from "@/components/ui/autocomplete";
import { INDIAN_STATES } from "@/constants/indianStates";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Bell, Calendar } from "lucide-react";
import { NotificationsTab, AvailabilityTab } from "@/pages/Settings";
import TransactionAPI from "@/api/transaction.api";
import UploadAPI from "@/api/upload.api";

type Edu = { institute: string; qualification: string; year: string };
type Exp = { company: string; years: string; year: string };
type Award = { title: string; year: string; desc: string };

type EducationRow = {
  institute: string;
  qualification: string;
  startYear: string;
  endYear: string;
  description?: string;
};

type ExperienceRow = {
  company: string;
  role: string;
  years: string;
  startYear: string;
  endYear: string;
  description?: string;
};

type AwardRow = {
  title: string;
  year: string;
  desc: string;
};

type CustomRateRow = {
  durationMin: string;
  rate: string;
  label: string;
};

type CommissionForm = {
  platformPercent: string;
  minDurationMin: string;
  maxDurationMin: string;
  cancellationWindowHours: string;
  payoutDelayDays: string;
  notes: string;
  customRates: CustomRateRow[];
};

type PricingForm = {
  baseFee: string;
  currency: string;
  billingType: "per_session" | "per_hour";
  discountPercent: string;
};

type SocialForm = {
  website: string;
  linkedin: string;
  twitter: string;
  facebook: string;
  instagram: string;
};

type MediaForm = {
  introVideo: string;
  gallery: string;
};

type ProfileForm = {
  category: string;
  subcategory: string;
  fullName: string;
  email: string;
  phone: string;
  alternatePhone: string;
  fees: string;
  gender: string;
  regNo: string;
  languages: string;
  tags: string;
  about: string;
  bioTitle: string;
  yearsOfExperience: string;
  address: string;
  country: string;
  state: string;
  city: string;
  pincode: string;
};

type AppointmentSummary = {
  appointmentId?: string;
  clientName?: string;
  initials?: string;
  title?: string;
  scheduledFor?: string;
  durationMinutes?: number;
  channel?: "video" | "audio" | "chat" | "in_person";
  status?: "pending" | "confirmed" | "completed" | "cancelled" | "no_show";
  review?: string;
  rating?: number;
  lastUpdatedAt?: string;
};

type AppointmentPreferencesForm = {
  bookingWindowDays: string;
  minNoticeHours: string;
  bufferMinutes: string;
  allowInstantBooking: boolean;
  allowClientReschedule: boolean;
  allowClientCancellation: boolean;
  allowNotes: boolean;
  defaultMeetingLink: string;
};

type AvailabilitySlot = {
  start?: string;
  end?: string;
  channel?: "video" | "audio" | "chat" | "in_person";
  notes?: string;
};

type WeeklyAvailabilityRow = {
  day: string;
  isAvailable: boolean;
  slots: AvailabilitySlot[];
};

type AvailabilityForm = {
  timezone: string;
  weekly: WeeklyAvailabilityRow[];
  blackoutDates: string[];
};

const emptyEducation: EducationRow = {
  institute: "",
  qualification: "",
  startYear: "",
  endYear: "",
  description: "",
};

const emptyExperience: ExperienceRow = {
  company: "",
  role: "",
  years: "",
  startYear: "",
  endYear: "",
  description: "",
};

const emptyAward: AwardRow = {
  title: "",
  year: "",
  desc: "",
};

const createEmptyCustomRate = (): CustomRateRow => ({
  durationMin: "",
  rate: "",
  label: "",
});

const initialProfileForm: ProfileForm = {
  category: "",
  subcategory: "",
  fullName: "",
  email: "",
  phone: "",
  alternatePhone: "",
  fees: "",
  gender: "",
  regNo: "",
  languages: "",
  tags: "",
  about: "",
  bioTitle: "",
  yearsOfExperience: "",
  address: "",
  country: "",
  state: "",
  city: "",
  pincode: "",
};

const initialCommissionForm: CommissionForm = {
  platformPercent: "",
  minDurationMin: "",
  maxDurationMin: "",
  cancellationWindowHours: "",
  payoutDelayDays: "",
  notes: "",
  customRates: [createEmptyCustomRate()],
};

const initialPricingForm: PricingForm = {
  baseFee: "",
  currency: "INR",
  billingType: "per_session",
  discountPercent: "",
};

const initialSocialForm: SocialForm = {
  website: "",
  linkedin: "",
  twitter: "",
  facebook: "",
  instagram: "",
};

const initialMediaForm: MediaForm = {
  introVideo: "",
  gallery: "",
};

const initialAppointmentPreferences: AppointmentPreferencesForm = {
  bookingWindowDays: "",
  minNoticeHours: "",
  bufferMinutes: "",
  allowInstantBooking: false,
  allowClientReschedule: true,
  allowClientCancellation: true,
  allowNotes: true,
  defaultMeetingLink: "",
};

const initialAvailability: AvailabilityForm = {
  timezone: "Asia/Kolkata",
  weekly: [],
  blackoutDates: [],
};

function LabeledInput({
  id, label, placeholder, value, onChange, type = "text", className = "", disabled
}: {
  id: string;
  label: string;
  placeholder?: string;
  value?: string;
  onChange?: (v: string) => void;
  type?: string;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <div className={className}>
      <Label htmlFor={id} className="text-xs text-muted-foreground mb-1 block">
        {label}
      </Label>
      <Input
        id={id}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        type={type}
        className="h-9"
      />
    </div>
  );
}

export default function Profile() {

  const [editing, setEditing] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [form, setForm] = useState<ProfileForm>(initialProfileForm);
  const [profileTab, setProfileTab] = useState<
    "basic" | "address" | "online" | "education" | "settings" | "payments"
  >("basic");
  const [settingsSubTab, setSettingsSubTab] = useState<"notifications" | "schedule">("notifications");

  // Use predefined Indian states list
  const states = INDIAN_STATES;
  const [education, setEducation] = useState<EducationRow[]>([
    emptyEducation,
  ]);
  const [experiences, setExperiences] = useState<ExperienceRow[]>([
    emptyExperience,
  ]);
  const [awards, setAwards] = useState<AwardRow[]>([emptyAward]);
  const [commissionForm, setCommissionForm] =
    useState<CommissionForm>(initialCommissionForm);
  const [pricing, setPricing] = useState<PricingForm>(initialPricingForm);
  const [socials, setSocials] = useState<SocialForm>(initialSocialForm);
  const [media, setMedia] = useState<MediaForm>(initialMediaForm);
  const [appointmentPreferences, setAppointmentPreferences] =
    useState<AppointmentPreferencesForm>(initialAppointmentPreferences);
  const [availability, setAvailability] =
    useState<AvailabilityForm>(initialAvailability);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const navigate = useNavigate();
  const dispatch = useDispatch();
  const queryClient = useQueryClient();
  const [consultantId, setConsultantId] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);

  const fetchTransactions = useCallback(async () => {
    try {
      const res = await TransactionAPI.getTransactions({ limit: 100 });
      if (res && res.data) {
        setTransactions(res.data);
      }
    } catch (error) {
      console.error("Failed to fetch transactions:", error);
      toast.error("Failed to load transaction history");
    }
  }, []);

  useEffect(() => {
    if (profileTab === "payments") {
      fetchTransactions();
    }
  }, [profileTab, fetchTransactions]);

  const paymentStats = useMemo(() => {
    let earned = 0;
    let paid = 0;

    transactions.forEach((t) => {
      if (t.type === "Payment" && t.status === "Success") {
        // Use netAmount if available (new system), otherwise amount (legacy)
        const val = (t.netAmount !== undefined && t.netAmount !== null) ? t.netAmount : t.amount;
        earned += (val || 0);
      } else if (t.type === "Payout") {
        paid += t.amount;
      }
    });

    return {
      totalEarnings: earned,
      totalPaidOut: paid,
      balance: earned - paid
    };
  }, [transactions]);

  // Get logged-in user from localStorage
  const getCurrentFromStorage = () => {
    try {
      const raw = typeof window !== "undefined" && (localStorage.getItem("currentUser") || localStorage.getItem("user"));
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  };

  const [loggedInUser, setLoggedInUser] = useState<any | null>(() => getCurrentFromStorage());

  // Update logged-in user when localStorage changes
  useEffect(() => {
    const user = getCurrentFromStorage();
    if (user) {
      setLoggedInUser(user);
    }
  }, []);

  const loggedInUserId = loggedInUser?._id || loggedInUser?.id || loggedInUser?.userId;
  const loggedInUserEmail = loggedInUser?.email;

  // Fetch the complete user data for logged-in consultant
  const {
    data: userData,
    isLoading: isLoadingUser,
    isError: isUserError,
    error: userError,
  } = useQuery({
    queryKey: ["user", loggedInUserId],
    queryFn: async () => {
      if (!loggedInUserId && !loggedInUserEmail) {
        throw new Error("No user ID or email found");
      }
      try {
        // Try to get user by ID first
        if (loggedInUserId) {
          const allUsers = await UserAPI.getAllUsers();
          const user = allUsers?.data?.find((u: any) =>
            (u._id || u.id || u.userId) === loggedInUserId
          );
          if (user) {
            return { data: user };
          }
        }
        // Fallback: try by email
        if (loggedInUserEmail) {
          const allUsers = await UserAPI.getAllUsers();
          const user = allUsers?.data?.find((u: any) =>
            u.email?.toLowerCase() === loggedInUserEmail?.toLowerCase()
          );
          if (user) {
            return { data: user };
          }
        }
        // If not found in UserAPI, use logged-in user data from localStorage
        if (loggedInUser) {
          return { data: loggedInUser };
        }
        throw new Error("User not found");
      } catch (err) {
        // If API fails, use logged-in user from localStorage as fallback
        if (loggedInUser) {
          return { data: loggedInUser };
        }
        throw err;
      }
    },
    enabled: Boolean(loggedInUserId || loggedInUserEmail),
    retry: 1,
  });

  const user = userData?.data || loggedInUser;

  // Fetch consultant data - try by ID first, then by email
  const {
    data: consultantData,
    isLoading: isLoadingConsultant,
    isError: isConsultantError,
    error: consultantError,
  } = useQuery({
    queryKey: ["consultant", loggedInUserId, loggedInUserEmail],
    queryFn: async () => {
      if (!loggedInUserEmail && !loggedInUserId) return null;

      try {
        // First, try to get all consultants and find by email or ID
        const allConsultants = await ConsultantAPI.getAll();
        const consultant = allConsultants?.data?.find(
          (c: any) =>
            c.email?.toLowerCase() === loggedInUserEmail?.toLowerCase() ||
            (loggedInUserId && (c._id === loggedInUserId || c.id === loggedInUserId))
        );

        if (consultant) {
          const id = consultant._id || consultant.id;
          setConsultantId(id);
          return { data: consultant };
        }

        // If not found in list, try to get by ID if we have consultantId
        if (consultantId) {
          try {
            const consultantById = await ConsultantAPI.getById(consultantId);
            if (consultantById?.data) {
              return consultantById;
            }
          } catch (err) {
            // Consultant by ID not found, continue
          }
        }

        return null;
      } catch (err) {
        // If consultant doesn't exist, that's okay - we'll create one
        console.warn("Consultant fetch error:", err);
        return null;
      }
    },
    enabled: Boolean(loggedInUserEmail || loggedInUserId),
    retry: false,
  });

  /* ============================
     Fetch System Categories & Subcategories
     ============================ */
  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: CategoryAPI.getAll,
    select: (res: any) => res?.data ?? res ?? [],
  });

  const { data: subcategories = [] } = useQuery({
    queryKey: ["subcategories"],
    queryFn: () => SubcategoryAPI.getAll(),
    select: (res: any) => res?.data ?? res ?? [],
  });

  const consultant = consultantData?.data;
  const isLoading = isLoadingUser || isLoadingConsultant;
  // Only user fetch failure is an error - consultant not found is expected
  const isError = isUserError;
  const error = userError;


  const calculateYearsOfExperience = useCallback((experiences: ExperienceRow[]) => {
    if (!experiences || experiences.length === 0) return 0;

    let totalYears = 0;
    const currentYear = new Date().getFullYear();

    experiences.forEach((exp) => {
      if (exp.startYear && exp.endYear) {
        const start = parseInt(exp.startYear);
        const end = parseInt(exp.endYear);
        if (!isNaN(start) && !isNaN(end) && end >= start) {
          totalYears += (end - start);
        }
      } else if (exp.startYear) {
        const start = parseInt(exp.startYear);
        if (!isNaN(start)) {
          totalYears += (currentYear - start);
        }
      } else if (exp.years) {
        const years = parseFloat(exp.years);
        if (!isNaN(years)) {
          totalYears += years;
        }
      }
    });

    return Math.round(totalYears);
  }, []);

  const syncStateFromConsultant = useCallback(() => {
    // If consultant exists, use consultant data, otherwise use user data
    const source = consultant || user;
    if (!source) return;

    // Get full name
    const fullName = user?.fullName || consultant?.displayName || consultant?.name || "";

    // Get category from user or consultant
    const categoryTitle = user?.category?.title || user?.subcategory?.title || consultant?.category || "";
    const subcategoryTitle = user?.subcategory?.title || consultant?.subcategory || "";

    setPhoto(consultant?.image || null);
    setForm({
      category: categoryTitle,
      subcategory: subcategoryTitle,
      fullName: fullName,
      email: source.email || "",
      phone: consultant?.phone || source.mobile || "",
      alternatePhone: consultant?.alternatePhone || "",
      fees:
        consultant?.fees !== undefined && consultant?.fees !== null
          ? String(consultant.fees)
          : "",
      gender: consultant?.gender || "",
      regNo: consultant?.regNo || "",
      languages:
        Array.isArray(consultant?.languages) && consultant.languages.length > 0
          ? consultant.languages.join(", ")
          : typeof consultant?.languages === "string"
            ? consultant.languages
            : "",
      tags:
        Array.isArray(consultant?.tags) && consultant.tags.length > 0
          ? consultant.tags.join(", ")
          : typeof consultant?.tags === "string"
            ? consultant.tags
            : "",
      about: consultant?.about || "",
      bioTitle: consultant?.bioTitle || "",
      yearsOfExperience: "", // Will be calculated from experiences
      address: consultant?.address || "",
      country: consultant?.country || "",
      state: consultant?.state || "",
      city: consultant?.city || "",
      pincode: consultant?.pincode || "",
    });

    setEducation(
      Array.isArray(consultant?.education) && consultant.education.length > 0
        ? consultant.education.map((item: any) => {
          // Handle both old format (year) and new format (startYear/endYear)
          const yearStr = item.year || "";
          const yearParts = yearStr.split("-").map((p: string) => p.trim());
          return {
            institute: item.institute || "",
            qualification: item.qualification || "",
            startYear: item.startYear || yearParts[0] || "",
            endYear: item.endYear || yearParts[1] || "",
            description: item.description || "",
          };
        })
        : [emptyEducation]
    );

    const experiencesData = Array.isArray(consultant?.experiences) &&
      consultant.experiences.length > 0
      ? consultant.experiences.map((item: any) => {
        // Handle both old format (year) and new format (startYear/endYear)
        const yearStr = item.year || "";
        const yearParts = yearStr.split("-").map((p: string) => p.trim());
        return {
          company: item.company || "",
          role: item.role || "",
          years: item.years || "",
          startYear: item.startYear || yearParts[0] || "",
          endYear: item.endYear || yearParts[1] || "",
          description: item.description || "",
        };
      })
      : [emptyExperience];

    setExperiences(experiencesData);

    // Calculate years of experience from experiences
    const calculatedYears = calculateYearsOfExperience(experiencesData);
    setForm((prev) => ({
      ...prev,
      yearsOfExperience: calculatedYears > 0 ? String(calculatedYears) : "",
    }));

    setAwards(
      Array.isArray(consultant?.awards) && consultant.awards.length > 0
        ? consultant.awards.map((item: any) => ({
          title: item.title || "",
          year: item.year || "",
          desc: item.desc || "",
        }))
        : [emptyAward]
    );

    setCommissionForm({
      platformPercent:
        consultant?.commission?.platformPercent !== undefined
          ? String(consultant.commission.platformPercent)
          : "",
      minDurationMin:
        consultant?.commission?.minDurationMin !== undefined
          ? String(consultant.commission.minDurationMin)
          : "",
      maxDurationMin:
        consultant?.commission?.maxDurationMin !== undefined
          ? String(consultant.commission.maxDurationMin)
          : "",
      cancellationWindowHours:
        consultant?.commission?.cancellationWindowHours !== undefined
          ? String(consultant.commission.cancellationWindowHours)
          : "",
      payoutDelayDays:
        consultant?.commission?.payoutDelayDays !== undefined
          ? String(consultant.commission.payoutDelayDays)
          : "",
      notes: consultant?.commission?.notes || "",
      customRates:
        Array.isArray(consultant?.commission?.customRates) &&
          consultant.commission.customRates.length > 0
          ? consultant.commission.customRates.map((item: any) => ({
            durationMin:
              item.durationMin !== undefined && item.durationMin !== null
                ? String(item.durationMin)
                : "",
            rate:
              item.rate !== undefined && item.rate !== null
                ? String(item.rate)
                : "",
            label: item.label || "",
          }))
          : [createEmptyCustomRate()],
    });

    setPricing({
      baseFee:
        consultant?.pricing?.baseFee !== undefined &&
          consultant?.pricing?.baseFee !== null
          ? String(consultant.pricing.baseFee)
          : consultant?.fees !== undefined && consultant?.fees !== null
            ? String(consultant.fees)
            : "",
      currency: consultant?.pricing?.currency || "INR",
      billingType:
        (consultant?.pricing?.billingType as PricingForm["billingType"]) ||
        "per_session",
      discountPercent:
        consultant?.pricing?.discountPercent !== undefined &&
          consultant?.pricing?.discountPercent !== null
          ? String(consultant.pricing.discountPercent)
          : "",
    });

    setSocials({
      website: consultant?.socials?.website || "",
      linkedin: consultant?.socials?.linkedin || "",
      twitter: consultant?.socials?.twitter || "",
      facebook: consultant?.socials?.facebook || "",
      instagram: consultant?.socials?.instagram || "",
    });

    setMedia({
      introVideo: consultant?.media?.introVideo || "",
      gallery: Array.isArray(consultant?.media?.gallery)
        ? consultant.media.gallery.join("\n")
        : "",
    });

    setAppointmentPreferences({
      bookingWindowDays:
        consultant?.appointmentPreferences?.bookingWindowDays !== undefined &&
          consultant?.appointmentPreferences?.bookingWindowDays !== null
          ? String(consultant.appointmentPreferences.bookingWindowDays)
          : "",
      minNoticeHours:
        consultant?.appointmentPreferences?.minNoticeHours !== undefined &&
          consultant?.appointmentPreferences?.minNoticeHours !== null
          ? String(consultant.appointmentPreferences.minNoticeHours)
          : "",
      bufferMinutes:
        consultant?.appointmentPreferences?.bufferMinutes !== undefined &&
          consultant?.appointmentPreferences?.bufferMinutes !== null
          ? String(consultant.appointmentPreferences.bufferMinutes)
          : "",
      allowInstantBooking:
        consultant?.appointmentPreferences?.allowInstantBooking ?? false,
      allowClientReschedule:
        consultant?.appointmentPreferences?.allowClientReschedule ?? true,
      allowClientCancellation:
        consultant?.appointmentPreferences?.allowClientCancellation ?? true,
      allowNotes: consultant?.appointmentPreferences?.allowNotes ?? true,
      defaultMeetingLink:
        consultant?.appointmentPreferences?.defaultMeetingLink || "",
    });

    const weeklyAvailability =
      Array.isArray(consultant?.availability?.weekly) &&
        consultant.availability.weekly.length > 0
        ? consultant.availability.weekly.map((item: any) => ({
          day: item.day || "",
          isAvailable:
            item.isAvailable === undefined ? true : Boolean(item.isAvailable),
          slots: Array.isArray(item.slots)
            ? item.slots.map((slot: any) => ({
              start: slot.start || "",
              end: slot.end || "",
              channel: slot.channel || "video",
              notes: slot.notes || "",
            }))
            : [],
        }))
        : [];

    const blackoutDates =
      Array.isArray(consultant?.availability?.blackoutDates) &&
        consultant.availability.blackoutDates.length > 0
        ? consultant.availability.blackoutDates
          .map((value: any) => {
            const date = new Date(value);
            if (Number.isNaN(date.getTime())) return "";
            return date.toISOString().split("T")[0];
          })
          .filter(Boolean)
        : [];

    setAvailability({
      timezone: consultant?.availability?.timezone || "Asia/Kolkata",
      weekly: weeklyAvailability,
      blackoutDates,
    });
  }, [consultant, user]);

  useEffect(() => {
    syncStateFromConsultant();
  }, [syncStateFromConsultant]);


  const initials = useMemo(() => {
    const fullName = form.fullName || user?.fullName || consultant?.name || "";
    if (fullName.length >= 2) {
      return fullName.slice(0, 2).toUpperCase();
    }
    return (fullName[0] || "DR").toUpperCase();
  }, [
    form.fullName,
    consultant?.name,
    user?.fullName,
  ]);

  // Recalculate years of experience when experiences change
  useEffect(() => {
    const calculatedYears = calculateYearsOfExperience(experiences);
    setForm((prev) => ({
      ...prev,
      yearsOfExperience: calculatedYears > 0 ? String(calculatedYears) : "",
    }));
  }, [experiences, calculateYearsOfExperience]);

  const handlePick = () => fileRef.current?.click();

  const onFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const response = await UploadAPI.uploadImage(file);
      const newImageUrl = response.data.url;
      setPhoto(newImageUrl);

      // Update local storage and redux immediately for better UX
      // Update both keys to ensure compatibility with all components
      dispatch(updateUser({ image: newImageUrl, profileImage: newImageUrl }));

      toast.success("Image uploaded successfully");
    } catch (error) {
      console.error("Failed to upload image:", error);
      toast.error("Failed to upload image");
    } finally {
      setIsUploading(false);
    }
  };


  const addRow = <T,>(list: T[], setter: (rows: T[]) => void, empty: T) => {
    setter([...list, empty]);
  };

  const removeRow = <T,>(list: T[], setter: (rows: T[]) => void, index: number) => {
    setter(list.filter((_, idx) => idx !== index));
  };

  const updateEducationRow = (index: number, patch: Partial<EducationRow>) => {
    setEducation((rows) =>
      rows.map((row, idx) => (idx === index ? { ...row, ...patch } : row))
    );
  };

  const updateExperienceRow = (
    index: number,
    patch: Partial<ExperienceRow>
  ) => {
    setExperiences((rows) =>
      rows.map((row, idx) => (idx === index ? { ...row, ...patch } : row))
    );
  };

  const updateAwardRow = (index: number, patch: Partial<AwardRow>) => {
    setAwards((rows) =>
      rows.map((row, idx) => (idx === index ? { ...row, ...patch } : row))
    );
  };

  const updateCommissionRateRow = (
    index: number,
    patch: Partial<CustomRateRow>
  ) => {
    setCommissionForm((prev) => ({
      ...prev,
      customRates: prev.customRates.map((row, idx) =>
        idx === index ? { ...row, ...patch } : row
      ),
    }));
  };

  const addCommissionRateRow = () => {
    setCommissionForm((prev) => ({
      ...prev,
      customRates: [...prev.customRates, createEmptyCustomRate()],
    }));
  };

  const removeCommissionRateRow = (index: number) => {
    setCommissionForm((prev) => {
      if (prev.customRates.length === 1) return prev;
      return {
        ...prev,
        customRates: prev.customRates.filter((_, idx) => idx !== index),
      };
    });
  };


  const { mutate: updateConsultant, isPending: isSaving } = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      if (consultantId) {
        // Update existing consultant
        return ConsultantAPI.update(consultantId, payload);
      } else {
        // Create new consultant from user data
        const consultantPayload = {
          ...payload,
        };
        const result = await ConsultantAPI.create(consultantPayload);
        if (result?.data?._id || result?.data?.id) {
          setConsultantId(result.data._id || result.data.id);
        }
        return result;
      }
    },
    onSuccess: (data: any) => {

      setEditing(false);
      toast.success("Profile updated successfully!");

      // Sync Redux state with key profile fields
      dispatch(updateUser({
        name: form.fullName.trim(),
        // Map other fields if they exist in UserType (authSlice)
      }));

      queryClient.invalidateQueries({ queryKey: ["consultant"] });
      queryClient.invalidateQueries({ queryKey: ["user"] });
      queryClient.invalidateQueries({ queryKey: ["consultants"] });
    },
    onError: (err: any) => {
      const message =
        err?.response?.data?.message || (consultantId ? "Failed to update consultant" : "Failed to create consultant profile");
      toast.error(message);
    },
  });


  const handleSave = () => {
    if (!user) {
      toast.error("User data not available");
      return;
    }
    const parseDelimitedList = (value: string) =>
      value
        .split(/[,\n]/)
        .map((item) => item.trim())
        .filter(Boolean);

    const toNumber = (value: string, fallback = 0) => {
      if (!value) return fallback;
      const parsed = Number(value);
      return Number.isNaN(parsed) ? fallback : parsed;
    };

    const languagesList = parseDelimitedList(form.languages);
    const tagsList = parseDelimitedList(form.tags);
    const mediaGalleryList = parseDelimitedList(media.gallery);

    const baseFee =
      pricing.baseFee.trim() || form.fees.trim()
        ? toNumber(pricing.baseFee || form.fees)
        : 0;

    // Get category from user or consultant
    const categoryTitle = form.category || user?.category?.title || user?.subcategory?.title || consultant?.category || "General";

    // Extract firstName and lastName from fullName for backward compatibility
    const nameParts = form.fullName.trim().split(" ");
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || "";

    const payload = {
      firstName: firstName,
      lastName: lastName,
      displayName: form.fullName.trim(), // Use fullName as displayName
      name: form.fullName.trim(),
      bioTitle: form.bioTitle.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      alternatePhone: form.alternatePhone.trim(),
      category: categoryTitle,
      fees: toNumber(form.fees), // Explicitly use the fees from the form
      subcategory: form.subcategory,
      pricing: {
        baseFee: toNumber(form.fees), // Sync baseFee with fees
        currency: pricing.currency.trim() || "INR",
        billingType: pricing.billingType,
        discountPercent: toNumber(pricing.discountPercent),
        customRates: consultant?.pricing?.customRates || [],
      },
      gender: form.gender,
      regNo: form.regNo.trim(),
      languages: languagesList,
      tags: tagsList,
      about: form.about,
      yearsOfExperience: toNumber(form.yearsOfExperience),
      address: form.address,
      country: form.country,
      state: form.state,
      city: form.city,
      pincode: form.pincode,
      image: photo || "",
      socials: {
        website: socials.website.trim(),
        linkedin: socials.linkedin.trim(),
        twitter: socials.twitter.trim(),
        facebook: socials.facebook.trim(), // Corrected key from youtube to facebook
        instagram: socials.instagram.trim(),
      },
      education: education
        .filter(
          (row) =>
            row.institute.trim() ||
            row.qualification.trim() ||
            row.startYear.trim() ||
            row.endYear.trim()
        )
        .map((row) => ({
          institute: row.institute.trim(),
          qualification: row.qualification.trim(),
          startYear: row.startYear.trim(),
          endYear: row.endYear.trim(),
          year: row.startYear && row.endYear ? `${row.startYear}-${row.endYear}` : row.startYear || row.endYear || "", // For backward compatibility
          description: row.description?.trim() || "",
        })),
      experiences: experiences
        .filter(
          (row) =>
            row.company.trim() ||
            row.role.trim() ||
            row.startYear.trim() ||
            row.endYear.trim()
        )
        .map((row) => {
          const startYearNum = row.startYear ? parseInt(row.startYear) : null;
          const endYearNum = row.endYear ? parseInt(row.endYear) : null;
          const calculatedYears = startYearNum && endYearNum && !isNaN(startYearNum) && !isNaN(endYearNum)
            ? (endYearNum - startYearNum)
            : startYearNum && !isNaN(startYearNum)
              ? (new Date().getFullYear() - startYearNum)
              : 0;
          return {
            company: row.company.trim(),
            role: row.role.trim(),
            startYear: row.startYear.trim(),
            endYear: row.endYear.trim(),
            years: calculatedYears > 0 ? String(calculatedYears) : row.years.trim(), // Calculate from years
            year: row.startYear && row.endYear ? `${row.startYear}-${row.endYear}` : row.startYear || row.endYear || "", // For backward compatibility
            description: row.description?.trim() || "",
          };
        }),
      awards: awards
        .filter((row) => row.title.trim() || row.year.trim() || row.desc.trim())
        .map((row) => ({
          title: row.title.trim(),
          year: row.year.trim(),
          desc: row.desc.trim(),
        })),
      commission: {
        platformPercent: commissionForm.platformPercent
          ? Number(commissionForm.platformPercent)
          : 0,
        minDurationMin: commissionForm.minDurationMin
          ? Number(commissionForm.minDurationMin)
          : 0,
        maxDurationMin: commissionForm.maxDurationMin
          ? Number(commissionForm.maxDurationMin)
          : 0,
        cancellationWindowHours: commissionForm.cancellationWindowHours
          ? Number(commissionForm.cancellationWindowHours)
          : 0,
      },
    };

    updateConsultant(payload);
  };

  const handleCancel = () => {
    syncStateFromConsultant();
    setEditing(false);
  };
  // Avatar





  // Dynamic sections
  const [edu, setEdu] = useState<Edu[]>([
    { institute: "", qualification: "", year: "" },
    { institute: "", qualification: "", year: "" },
  ]);
  const [exp, setExp] = useState<Exp[]>([{ company: "", years: "", year: "" }]);


  const disabled = !editing;


  const delRow = <T,>(list: T[], setter: (x: T[]) => void, i: number) =>
    setter(list.filter((_, idx) => idx !== i));

  const setEduAt = (i: number, patch: Partial<Edu>) =>
    setEdu((arr) => arr.map((r, idx) => (i === idx ? { ...r, ...patch } : r)));
  const setExpAt = (i: number, patch: Partial<Exp>) =>
    setExp((arr) => arr.map((r, idx) => (i === idx ? { ...r, ...patch } : r)));
  const setAwardAt = (i: number, patch: Partial<Award>) =>
    setAwards((arr) => arr.map((r, idx) => (i === idx ? { ...r, ...patch } : r)));







  return (

    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Consultant Profile</h1>
          <p className="text-xs text-muted-foreground">
            Home » Consultant Profile
          </p>
        </div>
        <div className="flex items-center gap-2">
          {editing ? (
            <>
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="gap-2 bg-blue-600 hover:bg-blue-700"
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Pencil className="h-4 w-4" />
                )}
                Save Changes
              </Button>
            </>
          ) : (
            <Button onClick={() => setEditing(true)} className="gap-2 bg-blue-600 hover:bg-blue-700">
              <Pencil className="h-4 w-4" />
              Edit Profile
            </Button>
          )}
        </div>
      </div>

      <Tabs value={profileTab} onValueChange={(v) => setProfileTab(v as any)} className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="basic">Basic Info</TabsTrigger>
          <TabsTrigger value="address">Address</TabsTrigger>
          <TabsTrigger value="online">Online Presence</TabsTrigger>
          <TabsTrigger value="education">Education & Experience</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="space-y-5 mt-4">
          <Card className="border-muted/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-center gap-6">
                <Avatar className="h-16 w-16 rounded-lg">
                  <AvatarImage src={photo ?? undefined} />
                  <AvatarFallback className="rounded-lg">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/png,image/jpeg,image/gif"
                    className="hidden"
                    onChange={onFileChange}
                    disabled={disabled}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePick}
                    disabled={disabled || isUploading}
                    className="gap-2"
                  >
                    {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    {isUploading ? "Uploading..." : "Change Image"}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setPhoto(null)}
                    disabled={disabled || !photo}
                    className="gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    Remove
                  </Button>
                  <p className="w-full text-xs text-muted-foreground">
                    Upload square images (JPEG, PNG or GIF)
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-4">

                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">
                    Full Name
                  </Label>
                  <Input
                    value={form.fullName}
                    disabled={true}
                    className="h-9 bg-gray-50"
                  />
                </div>
                <LabeledInput
                  id="yearsOfExperience"
                  label="Years of Experience"
                  type="number"
                  value={form.yearsOfExperience}
                  onChange={() => { }}
                  disabled={true}
                  className="bg-gray-50"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <LabeledInput
                  id="email"
                  label="Email Address"
                  type="email"
                  value={form.email}
                  onChange={(value) =>
                    setForm((prev) => ({ ...prev, email: value }))
                  }
                  disabled={disabled || Boolean(consultantId)}
                  className={consultantId ? "bg-gray-50" : ""}
                />
                <LabeledInput
                  id="phone"
                  label="Phone Number"
                  value={form.phone}
                  onChange={(value) =>
                    setForm((prev) => ({ ...prev, phone: value }))
                  }
                  disabled={true}
                  className="bg-gray-50"
                />
                <LabeledInput
                  id="alternatePhone"
                  label="Alternate Phone"
                  value={form.alternatePhone}
                  onChange={(value) =>
                    setForm((prev) => ({ ...prev, alternatePhone: value }))
                  }
                  disabled={disabled}
                />
                <LabeledInput
                  id="fees"
                  label="Consultation Fee"
                  type="number"
                  value={form.fees}
                  onChange={(value) =>
                    setForm((prev) => ({ ...prev, fees: value }))
                  }
                  disabled={disabled}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <LabeledInput
                  id="bioTitle"
                  label="Professional Headline"
                  value={form.bioTitle}
                  onChange={(value) =>
                    setForm((prev) => ({ ...prev, bioTitle: value }))
                  }
                  disabled={disabled}
                />
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">
                    Gender
                  </Label>
                  <Select
                    disabled={disabled}
                    value={form.gender}
                    onValueChange={(value) =>
                      setForm((prev) => ({ ...prev, gender: value }))
                    }
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <LabeledInput
                  id="regNo"
                  label="Registration Number"
                  value={form.regNo}
                  onChange={(value) =>
                    setForm((prev) => ({ ...prev, regNo: value }))
                  }
                  disabled={disabled}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">
                    Known Languages
                  </Label>
                  <Textarea
                    disabled={disabled}
                    value={form.languages}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        languages: event.target.value,
                      }))
                    }
                    className="min-h-[56px]"
                    placeholder="Comma separated e.g. English, Hindi"
                  />
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Provide one or many languages separated by commas.
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">
                    Tags & Expertise
                  </Label>
                  <Textarea
                    disabled={disabled}
                    value={form.tags}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        tags: event.target.value,
                      }))
                    }
                    className="min-h-[56px]"
                    placeholder="Comma separated e.g. Leadership, Strategy"
                  />
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Tags power search and discovery for consultants.
                  </p>
                </div>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">
                  About
                </Label>
                <Textarea
                  disabled={disabled}
                  value={form.about}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      about: event.target.value,
                    }))
                  }
                  className="min-h-[80px]"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="address" className="space-y-5 mt-4">
          <Card className="border-muted/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                Address Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">
                  Address
                </Label>
                <Textarea
                  disabled={disabled}
                  value={form.address}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      address: event.target.value,
                    }))
                  }
                  className="min-h-[56px]"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">
                    Country
                  </Label>
                  <Select
                    disabled={disabled}
                    value={form.country}
                    onValueChange={(value) =>
                      setForm((prev) => ({ ...prev, country: value }))
                    }
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="india">India</SelectItem>
                      <SelectItem value="us">United States</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">
                    State
                  </Label>
                  <Autocomplete
                    value={form.state}
                    onValueChange={(value) => {
                      setForm((prev) => ({
                        ...prev,
                        state: value
                      }));
                    }}
                    options={states}
                    placeholder="Select state"
                    disabled={disabled}
                    allowCustom={false}
                    searchPlaceholder="Search states..."
                    emptyMessage="No states found."
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">
                    City
                  </Label>
                  <Input
                    value={form.city}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, city: e.target.value }))
                    }
                    placeholder="Enter city name"
                    disabled={disabled}
                    className="h-9"
                  />
                </div>
                <LabeledInput
                  id="pincode"
                  label="Pin Code"
                  type="number"
                  value={form.pincode}
                  onChange={(value) =>
                    setForm((prev) => ({ ...prev, pincode: value }))
                  }
                  disabled={disabled}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="online" className="space-y-5 mt-4">
          <Card className="border-muted/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Online Presence</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <LabeledInput
                id="website"
                label="Website"
                value={socials.website}
                onChange={(value) =>
                  setSocials((prev) => ({ ...prev, website: value }))
                }
                disabled={disabled}
              />
              <LabeledInput
                id="linkedin"
                label="LinkedIn"
                value={socials.linkedin}
                onChange={(value) =>
                  setSocials((prev) => ({ ...prev, linkedin: value }))
                }
                disabled={disabled}
              />
              <LabeledInput
                id="twitter"
                label="Twitter / X"
                value={socials.twitter}
                onChange={(value) =>
                  setSocials((prev) => ({ ...prev, twitter: value }))
                }
                disabled={disabled}
              />
              <LabeledInput
                id="facebook"
                label="Facebook"
                value={socials.facebook}
                onChange={(value) =>
                  setSocials((prev) => ({ ...prev, facebook: value }))
                }
                disabled={disabled}
              />
              <LabeledInput
                id="instagram"
                label="Instagram"
                value={socials.instagram}
                onChange={(value) =>
                  setSocials((prev) => ({ ...prev, instagram: value }))
                }
                disabled={disabled}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="education" className="space-y-5 mt-4">
          <Card className="border-muted/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                Educational Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {education.map((row, index) => (
                <div
                  key={`edu-${index}`}
                  className="rounded-md border border-muted/40 p-3 space-y-3"
                >
                  <div className="grid grid-cols-1 items-end gap-4 md:grid-cols-4">
                    <LabeledInput
                      id={`edu-institute-${index}`}
                      label="Institute Name"
                      value={row.institute}
                      onChange={(value) =>
                        updateEducationRow(index, { institute: value })
                      }
                      disabled={disabled}
                    />
                    <LabeledInput
                      id={`edu-qualification-${index}`}
                      label="Qualification"
                      value={row.qualification}
                      onChange={(value) =>
                        updateEducationRow(index, { qualification: value })
                      }
                      disabled={disabled}
                    />
                    <LabeledInput
                      id={`edu-startYear-${index}`}
                      label="Start Year"
                      value={row.startYear}
                      onChange={(value) =>
                        updateEducationRow(index, { startYear: value })
                      }
                      disabled={disabled}
                    />
                    <div className="flex items-end gap-2">
                      <LabeledInput
                        id={`edu-endYear-${index}`}
                        label="End Year"
                        value={row.endYear}
                        onChange={(value) =>
                          updateEducationRow(index, { endYear: value })
                        }
                        className="flex-1"
                        disabled={disabled}
                      />
                      <Button
                        variant="destructive"
                        size="icon"
                        disabled={disabled || education.length === 1}
                        onClick={() =>
                          removeRow(education, setEducation, index)
                        }
                        className="h-9 w-9"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">
                      Description / Notes
                    </Label>
                    <Textarea
                      disabled={disabled}
                      value={row.description || ""}
                      onChange={(event) =>
                        updateEducationRow(index, {
                          description: event.target.value,
                        })
                      }
                      className="min-h-[56px]"
                      placeholder="Highlights, awards, major learnings…"
                    />
                  </div>
                </div>
              ))}
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  addRow(education, setEducation, emptyEducation)
                }
                disabled={disabled}
                className="text-primary"
              >
                + Add Education
              </Button>
            </CardContent>
          </Card>

          <Card className="border-muted/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Experience</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {experiences.map((row, index) => (
                <div
                  key={`exp-${index}`}
                  className="rounded-md border border-muted/40 p-3 space-y-3"
                >
                  <div className="grid grid-cols-1 items-end gap-4 md:grid-cols-5">
                    <LabeledInput
                      id={`exp-company-${index}`}
                      label="Company Name"
                      value={row.company}
                      onChange={(value) =>
                        updateExperienceRow(index, { company: value })
                      }
                      disabled={disabled}
                    />
                    <LabeledInput
                      id={`exp-role-${index}`}
                      label="Role / Title"
                      value={row.role}
                      onChange={(value) =>
                        updateExperienceRow(index, { role: value })
                      }
                      disabled={disabled}
                    />
                    <LabeledInput
                      id={`exp-startYear-${index}`}
                      label="Start Year"
                      value={row.startYear}
                      onChange={(value) =>
                        updateExperienceRow(index, { startYear: value })
                      }
                      disabled={disabled}
                    />
                    <LabeledInput
                      id={`exp-endYear-${index}`}
                      label="End Year"
                      value={row.endYear}
                      onChange={(value) =>
                        updateExperienceRow(index, { endYear: value })
                      }
                      disabled={disabled}
                    />
                    <div className="flex items-end">
                      <Button
                        variant="destructive"
                        size="icon"
                        disabled={disabled || experiences.length === 1}
                        onClick={() =>
                          removeRow(experiences, setExperiences, index)
                        }
                        className="h-9 w-9"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">
                      Highlights & Responsibilities
                    </Label>
                    <Textarea
                      disabled={disabled}
                      value={row.description || ""}
                      onChange={(event) =>
                        updateExperienceRow(index, {
                          description: event.target.value,
                        })
                      }
                      className="min-h-[56px]"
                      placeholder="Include responsibilities, teams, achievements…"
                    />
                  </div>
                </div>
              ))}
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  addRow(experiences, setExperiences, emptyExperience)
                }
                disabled={disabled}
                className="text-primary"
              >
                + Add Experience
              </Button>
            </CardContent>
          </Card>

          <Card className="border-muted/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Awards</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {awards.map((row, index) => (
                <div
                  key={`award-${index}`}
                  className="grid grid-cols-1 items-end gap-4 md:grid-cols-3"
                >
                  <LabeledInput
                    id={`award-title-${index}`}
                    label="Title"
                    value={row.title}
                    onChange={(value) =>
                      updateAwardRow(index, { title: value })
                    }
                    disabled={disabled}
                  />
                  <LabeledInput
                    id={`award-year-${index}`}
                    label="Year"
                    value={row.year}
                    onChange={(value) =>
                      updateAwardRow(index, { year: value })
                    }
                    disabled={disabled}
                  />
                  <div className="flex items-end gap-2">
                    <LabeledInput
                      id={`award-desc-${index}`}
                      label="Description"
                      value={row.desc}
                      onChange={(value) =>
                        updateAwardRow(index, { desc: value })
                      }
                      className="flex-1"
                      disabled={disabled}
                    />
                    <Button
                      variant="destructive"
                      size="icon"
                      disabled={disabled || awards.length === 1}
                      onClick={() => removeRow(awards, setAwards, index)}
                      className="h-9 w-9"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => addRow(awards, setAwards, emptyAward)}
                disabled={disabled}
                className="text-primary"
              >
                + Add Award
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-5 mt-4">
          <Tabs value={settingsSubTab} onValueChange={(v) => setSettingsSubTab(v as "notifications" | "schedule")} className="w-full">
            <TabsList className="grid w-full grid-cols-2 max-w-md">
              <TabsTrigger value="notifications" className="gap-2">
                <Bell className="h-4 w-4" />
                Notifications
              </TabsTrigger>
              <TabsTrigger value="schedule" className="gap-2">
                <Calendar className="h-4 w-4" />
                Schedule
              </TabsTrigger>
            </TabsList>
            <TabsContent value="notifications" className="mt-4">
              <Card>
                <CardContent className="p-4 sm:p-6">
                  <NotificationsTab consultantId={consultantId || undefined} />
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="schedule" className="mt-4">
              <Card>
                <CardContent className="p-4 sm:p-6">
                  <AvailabilityTab consultantId={consultantId || undefined} />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="payments" className="space-y-5 mt-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card className="border-muted/60">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
                <div className="h-4 w-4 text-muted-foreground">$</div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(paymentStats.totalEarnings)}
                </div>
                <p className="text-xs text-muted-foreground">Successful payments received</p>
              </CardContent>
            </Card>
            <Card className="border-muted/60">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Paid Out</CardTitle>
                <div className="h-4 w-4 text-muted-foreground">↗</div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(paymentStats.totalPaidOut)}
                </div>
                <p className="text-xs text-muted-foreground">Amount transferred to you</p>
              </CardContent>
            </Card>
            <Card className="border-muted/60">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Balance Due</CardTitle>
                <div className="h-4 w-4 text-muted-foreground">=</div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(paymentStats.balance)}
                </div>
                <p className="text-xs text-muted-foreground">Pending payout</p>
              </CardContent>
            </Card>
          </div>

          <Card className="border-muted/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Transaction History</CardTitle>
            </CardHeader>
            <CardContent>
              {transactions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No transactions found.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Date</th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Type</th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Amount</th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Status</th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map((t) => (
                        <tr key={t._id} className="border-b transition-colors hover:bg-muted/50">
                          <td className="p-4 align-middle">
                            {t.createdAt ? new Date(t.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                          </td>
                          <td className="p-4 align-middle">
                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold
                                            ${t.type === 'Payment' ? 'bg-green-100 text-green-800' :
                                t.type === 'Payout' ? 'bg-blue-100 text-blue-800' :
                                  'bg-gray-100 text-gray-800'}`}>
                              {t.type}
                            </span>
                          </td>
                          <td className="p-4 align-middle font-medium">
                            {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(t.amount)}
                          </td>
                          <td className="p-4 align-middle">{t.status}</td>
                          <td className="p-4 align-middle text-muted-foreground">
                            {t.metadata?.notes || t.appointment?.reason || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
