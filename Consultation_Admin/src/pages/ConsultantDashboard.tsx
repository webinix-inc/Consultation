import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import {
  CalendarDays,
  Loader2,
  Pencil,
  Star,
  Trash2,
  Upload,
  ArrowLeft,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import ConsultantAPI from "@/api/consultant.api";
import { Autocomplete } from "@/components/ui/autocomplete";
import { INDIAN_STATES } from "@/constants/indianStates";
import { NotificationsTab, AvailabilityTab } from "@/components/ConsultantSettingsTabs";
import TransactionAPI from "@/api/transaction.api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

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

const ConsultantDashboard = () => {
  const [activeTab, setActiveTab] = useState<
    "profile" | "commission" | "appointments"
  >("profile");
  const [profileSubTab, setProfileSubTab] = useState<
    "basic" | "address" | "online" | "education" | "schedule" | "notifications" | "payments"
  >("basic");
  const [editing, setEditing] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const [form, setForm] = useState<ProfileForm>(initialProfileForm);
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

  const fileRef = useRef<HTMLInputElement | null>(null);

  const [searchParams] = useSearchParams();
  const userId = searchParams.get("id");
  const navigate = useNavigate();
  const location = useLocation();
  const fromView = location.state?.fromView || "main";

  const queryClient = useQueryClient();
  const [consultantId, setConsultantId] = useState<string | null>(null);

  // Payment states
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isPayoutOpen, setIsPayoutOpen] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState("");
  const [payoutNotes, setPayoutNotes] = useState("");
  const [isRecordingPayout, setIsRecordingPayout] = useState(false);

  const fetchTransactions = useCallback(async () => {
    if (!consultantId) return;
    try {
      const res = await TransactionAPI.getTransactions({
        consultant: consultantId,
        limit: 100 // Fetch acceptable number for history
      });
      setTransactions(res.data || []);
    } catch (err) {
      console.error("Failed to fetch transactions", err);
    }
  }, [consultantId]);

  useEffect(() => {
    if (activeTab === "profile" && profileSubTab === "payments") {
      fetchTransactions();
    }
  }, [activeTab, profileSubTab, fetchTransactions]);

  const handleRecordPayout = async () => {
    if (!consultantId || !payoutAmount) return;
    setIsRecordingPayout(true);
    try {
      await TransactionAPI.createPayout({
        consultantId,
        amount: Number(payoutAmount),
        notes: payoutNotes
      });
      toast.success("Payout recorded successfully");
      setIsPayoutOpen(false);
      setPayoutAmount("");
      setPayoutNotes("");
      fetchTransactions(); // Refresh list
    } catch (err) {
      toast.error("Failed to record payout");
    } finally {
      setIsRecordingPayout(false);
    }
  };

  const paymentStats = useMemo(() => {
    const earnings = transactions
      .filter(t => t.type === "Payment" && t.status === "Success" && t.appointment?.status === "Completed")
      .reduce((acc, curr) => {
        // Use netAmount if available (new system), otherwise amount (legacy)
        const val = (curr.netAmount !== undefined && curr.netAmount !== null) ? curr.netAmount : curr.amount;
        return acc + (val || 0);
      }, 0);

    const payouts = transactions
      .filter(t => t.type === "Payout")
      .reduce((acc, curr) => acc + (curr.amount || 0), 0);

    return {
      totalEarnings: earnings,
      totalPaidOut: payouts,
      balance: earnings - payouts
    };
  }, [transactions]);

  useEffect(() => {
    if (!userId) {
      toast.error("Select a consultant from the list");
      navigate("/consultants");
    } else {
      // Set consultant ID directly from URL parameter
      setConsultantId(userId);
    }
  }, [userId, navigate]);

  // Fetch consultant directly by ID (since consultants are now in Consultant model)
  const {
    data: consultantData,
    isLoading: isLoadingConsultant,
    isError: isConsultantError,
    error: consultantError,
  } = useQuery({
    queryKey: ["consultant", userId],
    queryFn: async () => {
      if (!userId) return null;
      try {
        // Try to get consultant by ID directly
        const consultant = await ConsultantAPI.getById(userId);
        if (consultant?.data) {
          setConsultantId(consultant.data._id || consultant.data.id || userId);
          return consultant;
        }
        // Fallback: try to get all consultants and find by ID
        const allConsultants = await ConsultantAPI.getAllConsultants();
        const found = allConsultants?.data?.find(
          (c: any) => (c._id || c.id) === userId
        );
        if (found) {
          setConsultantId(found._id || found.id);
          return { data: found };
        }
        throw new Error("Consultant not found");
      } catch (err: any) {
        throw new Error(err?.message || "Consultant not found");
      }
    },
    enabled: Boolean(userId),
    retry: 1,
  });

  const consultant = consultantData?.data;
  const isLoading = isLoadingConsultant;
  const isError = isConsultantError;
  const error = consultantError;

  // For backward compatibility, create a user-like object from consultant
  const user = consultant ? {
    _id: consultant._id || consultant.id,
    id: consultant._id || consultant.id,
    fullName: consultant.name || consultant.displayName || `${consultant.firstName || ""} ${consultant.lastName || ""}`.trim(),
    email: consultant.email,
    mobile: consultant.mobile || consultant.phone,
    role: "Consultant",
    status: consultant.status === "Active" ? "Active" : "Inactive",
    verificationStatus: consultant.status === "Active" ? "Active" : consultant.status || "Pending",
  } : null;

  // Use predefined Indian states list
  const states = INDIAN_STATES;

  // Calculate years of experience from experience entries
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
    // Use consultant data directly
    if (!consultant) return;

    // Get full name
    const fullName = consultant?.displayName || consultant?.name || `${consultant?.firstName || ""} ${consultant?.lastName || ""}`.trim() || "";

    // Get category and subcategory (category is stored as string in Consultant model)
    // Get category and subcategory (normalize object vs string)
    const getCatLabel = (val: any) => {
      if (!val) return "";
      if (typeof val === "object") return val.name || val.title || "";
      return val;
    };
    const categoryTitle = getCatLabel(consultant?.category);
    const subcategoryTitle = getCatLabel(consultant?.subcategory);

    setPhoto(consultant?.image || null);
    setForm({
      category: categoryTitle,
      subcategory: subcategoryTitle,
      fullName: fullName,
      email: consultant?.email || "",
      phone: consultant?.phone || consultant?.mobile || "",
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




  }, [consultant, calculateYearsOfExperience]);

  // Recalculate years of experience when experiences change
  useEffect(() => {
    syncStateFromConsultant();

    // Load commission settings
    if (consultant?.commission) {
      setCommissionForm({
        platformPercent: String(consultant.commission.platformPercent || 0),
        minDurationMin: String(consultant.commission.minDurationMin || 30),
        maxDurationMin: String(consultant.commission.maxDurationMin || 180),
        cancellationWindowHours: String(consultant.commission.cancellationWindowHours || 24),
        payoutDelayDays: "0",
        notes: "",
        customRates: [],
      });
    }
  }, [syncStateFromConsultant, consultant]);

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

  const onFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const preview = URL.createObjectURL(file);
    setPhoto(preview);
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
    onSuccess: () => {
      toast.success(consultantId ? "Consultant updated successfully" : "Consultant profile created successfully");
      setEditing(false);
      queryClient.invalidateQueries({ queryKey: ["consultant", consultantId] });
      queryClient.invalidateQueries({ queryKey: ["consultant", userId] });
      queryClient.invalidateQueries({ queryKey: ["consultants"] });
      queryClient.invalidateQueries({ queryKey: ["consultant-settings", consultantId] });
    },
    onError: (err: any) => {
      const message =
        err?.response?.data?.message || (consultantId ? "Failed to update consultant" : "Failed to create consultant profile");
      toast.error(message);
    },
  });

  const handleSave = () => {
    if (!consultant) {
      toast.error("Consultant data not available");
      return;
    }
    const parseDelimitedList = (value: string) =>
      value
        .split(/[,\\n]/)
        .map((item) => item.trim())
        .filter(Boolean);

    const toNumber = (value: string, fallback = 0) => {
      if (!value) return fallback;
      const parsed = Number(value);
      return Number.isNaN(parsed) ? fallback : parsed;
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let payload: any = {};

    if (activeTab === "commission") {
      payload = {
        commission: {
          platformPercent: commissionForm.platformPercent ? Number(commissionForm.platformPercent) : 0,
          minDurationMin: commissionForm.minDurationMin ? Number(commissionForm.minDurationMin) : 0,
          maxDurationMin: commissionForm.maxDurationMin ? Number(commissionForm.maxDurationMin) : 0,
          cancellationWindowHours: commissionForm.cancellationWindowHours ? Number(commissionForm.cancellationWindowHours) : 0,
        },
      };
    } else {
      const languagesList = parseDelimitedList(form.languages);
      const tagsList = parseDelimitedList(form.tags);
      const mediaGalleryList = parseDelimitedList(media.gallery);

      payload = {
        name: form.fullName,
        email: form.email,
        phone: form.phone,
        mobile: form.phone,
        about: form.about,
        bioTitle: form.bioTitle,
        gender: form.gender,
        regNo: form.regNo,
        address: form.address,
        country: form.country,
        state: form.state,
        city: form.city,
        pincode: form.pincode,
        yearsOfExperience: toNumber(form.yearsOfExperience),
        fees: toNumber(form.fees),
        languages: languagesList,
        tags: tagsList,
        category: form.category,
        subcategory: form.subcategory,
        image: photo,
        introVideo: media.introVideo,
        gallery: mediaGalleryList,
        socials,
        education: education.map((row) => ({
          ...row,
          startYear: row.startYear,
          endYear: row.endYear,
        })),
        experiences: experiences.map((row) => ({
          ...row,
          years: toNumber(row.years),
          startYear: toNumber(row.startYear),
          endYear: toNumber(row.endYear),
        })),
        awards: awards.map((row) => ({
          ...row,
          year: toNumber(row.year),
          desc: row.desc.trim(),
        })),
        billingType: pricing.billingType,
        baseFee: toNumber(pricing.baseFee),
        currency: pricing.currency,
        discountPercent: toNumber(pricing.discountPercent),
      };
    }

    updateConsultant(payload);
  };

  const handleCancel = () => {
    syncStateFromConsultant();
    setEditing(false);
  };

  const upcomingAppointments: AppointmentSummary[] =
    consultant?.appointmentsSnapshot?.upcoming || [];
  const pastAppointments: AppointmentSummary[] =
    consultant?.appointmentsSnapshot?.past || [];

  // Show message if consultant profile doesn't exist yet
  const hasNoConsultantProfile = !consultant && !isLoading;

  const disabled = !editing;

  return (
    <div className="min-h-screen bg-white flex">
      <aside className="w-64 bg-white border-r p-4 space-y-3">
        <div>
          <h2 className="font-semibold text-gray-700">
            Consultation Management
          </h2>
          <p className="text-xs text-muted-foreground">
            Manage consultant profile & operations
          </p>
        </div>
        {[
          { key: "profile", label: "Profile" },
          { key: "commission", label: "Business Commission" },
          { key: "appointments", label: "Appointments" },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() =>
              setActiveTab(tab.key as "profile" | "commission" | "appointments")
            }
            className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition ${activeTab === tab.key
              ? "bg-blue-600 text-white"
              : "hover:bg-gray-100 text-gray-700"
              }`}
          >
            {tab.label}
          </button>
        ))}
        <Button
          variant="ghost"
          className="w-full justify-start gap-2 text-gray-900 bg-gray-300 hover:text-gray-900 hover:bg-gray-300 mt-2"
          onClick={() => {
            if (fromView === "pending") {
              navigate("/consultants?view=pending");
            } else {
              navigate("/consultants");
            }
          }}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Consultants
        </Button>
      </aside>

      <main className="flex-1 p-6 space-y-6">

        {isLoading && (
          <div className="flex h-full w-full items-center justify-center py-24">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {isError && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
            {error instanceof Error
              ? error.message
              : "Unable to load consultant details."}
          </div>
        )}

        {!isLoading && !isError && consultant && (
          <>
            {hasNoConsultantProfile && (
              <div className="rounded-md border border-yellow-200 bg-yellow-50 p-4 mb-4">
                <p className="text-sm text-yellow-800">
                  <strong>Note:</strong> This consultant doesn't have all profile details yet.
                  You can edit the profile below to add more information.
                </p>
              </div>
            )}
            {activeTab === "profile" && (
              <div className="space-y-5">
                <div>
                  <h1 className="text-xl font-semibold">Consultant Profile</h1>
                  <p className="text-xs text-muted-foreground">
                    Home » Consultant Profile
                  </p>
                </div>

                <Tabs value={profileSubTab} onValueChange={(v) => setProfileSubTab(v as any)} className="w-full">
                  <TabsList className="grid w-full grid-cols-7">
                    <TabsTrigger value="basic">Basic Info</TabsTrigger>
                    <TabsTrigger value="address">Address</TabsTrigger>
                    <TabsTrigger value="online">Online Presence</TabsTrigger>
                    <TabsTrigger value="education">Education & Experience</TabsTrigger>
                    <TabsTrigger value="schedule">Schedule</TabsTrigger>
                    <TabsTrigger value="notifications">Notifications</TabsTrigger>
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
                              disabled={true}
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handlePick}
                              disabled={true}
                              className="gap-2"
                            >
                              <Upload className="h-4 w-4" />
                              Change Image
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => setPhoto(null)}
                              disabled={true}
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
                              Category
                            </Label>
                            <Input
                              value={form.category}
                              disabled={true}
                              onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
                              className={`h-9 ${!editing ? "bg-gray-50" : ""}`}
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground mb-1 block">
                              Subcategory
                            </Label>
                            <Input
                              value={form.subcategory}
                              disabled={true}
                              onChange={(e) => setForm((prev) => ({ ...prev, subcategory: e.target.value }))}
                              className={`h-9 ${!editing ? "bg-gray-50" : ""}`}
                            />
                          </div>
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
                            disabled={true}
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
                            disabled={true}
                          />
                          <LabeledInput
                            id="fees"
                            label="Consultation Fee"
                            type="number"
                            value={form.fees}
                            onChange={(value) =>
                              setForm((prev) => ({ ...prev, fees: value }))
                            }
                            disabled={true}
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
                            disabled={true}
                          />
                          <div>
                            <Label className="text-xs text-muted-foreground mb-1 block">
                              Gender
                            </Label>
                            <Select
                              disabled={true}
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
                            disabled={true}
                          />
                        </div>

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          <div>
                            <Label className="text-xs text-muted-foreground mb-1 block">
                              Known Languages
                            </Label>
                            <Textarea
                              disabled={true}
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
                              disabled={true}
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
                            disabled={true}
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
                            disabled={true}
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
                              disabled={true}
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
                                  state: value,
                                  city: "" // Reset city when state changes
                                }));
                              }}
                              options={states}
                              placeholder="Type or select state"
                              disabled={true}
                              allowCustom={true}
                              searchPlaceholder="Search states..."
                              emptyMessage="No states found. Type to add custom state."
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
                              disabled={true}
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
                            disabled={true}
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
                          disabled={true}
                        />
                        <LabeledInput
                          id="linkedin"
                          label="LinkedIn"
                          value={socials.linkedin}
                          onChange={(value) =>
                            setSocials((prev) => ({ ...prev, linkedin: value }))
                          }
                          disabled={true}
                        />
                        <LabeledInput
                          id="twitter"
                          label="Twitter / X"
                          value={socials.twitter}
                          onChange={(value) =>
                            setSocials((prev) => ({ ...prev, twitter: value }))
                          }
                          disabled={true}
                        />
                        <LabeledInput
                          id="facebook"
                          label="Facebook"
                          value={socials.facebook}
                          onChange={(value) =>
                            setSocials((prev) => ({ ...prev, facebook: value }))
                          }
                          disabled={true}
                        />
                        <LabeledInput
                          id="instagram"
                          label="Instagram"
                          value={socials.instagram}
                          onChange={(value) =>
                            setSocials((prev) => ({ ...prev, instagram: value }))
                          }
                          disabled={true}
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
                                disabled={true}
                              />
                              <LabeledInput
                                id={`edu-qualification-${index}`}
                                label="Qualification"
                                value={row.qualification}
                                onChange={(value) =>
                                  updateEducationRow(index, { qualification: value })
                                }
                                disabled={true}
                              />
                              <LabeledInput
                                id={`edu-startYear-${index}`}
                                label="Start Year"
                                value={row.startYear}
                                onChange={(value) =>
                                  updateEducationRow(index, { startYear: value })
                                }
                                disabled={true}
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
                                  disabled={true}
                                />
                                <Button
                                  variant="destructive"
                                  size="icon"
                                  disabled={true}
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
                                disabled={true}
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
                          disabled={true}
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
                                disabled={true}
                              />
                              <LabeledInput
                                id={`exp-role-${index}`}
                                label="Role / Title"
                                value={row.role}
                                onChange={(value) =>
                                  updateExperienceRow(index, { role: value })
                                }
                                disabled={true}
                              />
                              <LabeledInput
                                id={`exp-startYear-${index}`}
                                label="Start Year"
                                value={row.startYear}
                                onChange={(value) =>
                                  updateExperienceRow(index, { startYear: value })
                                }
                                disabled={true}
                              />
                              <LabeledInput
                                id={`exp-endYear-${index}`}
                                label="End Year"
                                value={row.endYear}
                                onChange={(value) =>
                                  updateExperienceRow(index, { endYear: value })
                                }
                                disabled={true}
                              />
                              <div className="flex items-end">
                                <Button
                                  variant="destructive"
                                  size="icon"
                                  disabled={true}
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
                                disabled={true}
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
                          disabled={true}
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
                              disabled={true}
                            />
                            <LabeledInput
                              id={`award-year-${index}`}
                              label="Year"
                              value={row.year}
                              onChange={(value) =>
                                updateAwardRow(index, { year: value })
                              }
                              disabled={true}
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
                                disabled={true}
                              />
                              <Button
                                variant="destructive"
                                size="icon"
                                disabled={true}
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
                          disabled={true}
                          className="text-primary"
                        >
                          + Add Award
                        </Button>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="schedule" className="space-y-5 mt-4">
                    {/* Consultant Settings Section - Availability */}
                    <AvailabilityTab consultantId={consultantId || undefined} readOnly={true} />
                  </TabsContent>

                  <TabsContent value="notifications" className="space-y-5 mt-4">
                    {/* Consultant Settings Section - Notifications */}
                    <NotificationsTab consultantId={consultantId || undefined} readOnly={true} />
                  </TabsContent>
                  <TabsContent value="payments" className="space-y-5 mt-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium text-muted-foreground">
                            Total Earnings
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">₹{paymentStats.totalEarnings}</div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium text-muted-foreground">
                            Total Paid Out
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">₹{paymentStats.totalPaidOut}</div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium text-muted-foreground">
                            Balance Due
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className={`text-2xl font-bold ${paymentStats.balance > 0 ? "text-green-600" : "text-gray-900"}`}>
                            ₹{paymentStats.balance}
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-medium">Transaction History</h3>
                      <Dialog open={isPayoutOpen} onOpenChange={setIsPayoutOpen}>
                        <DialogTrigger asChild>
                          <Button>Record Payout</Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-[600px] fixed top-1/2 left-1/2 transform -translate-x-1/4 -translate-y-1/4">
                          <DialogHeader>
                            <DialogTitle>Record Manual Payout</DialogTitle>
                            <DialogDescription>
                              Record a payment made to the consultant outside the system (e.g., Bank Transfer).
                            </DialogDescription>
                          </DialogHeader>
                          <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                              <Label htmlFor="amount">Amount (INR)</Label>
                              <Input
                                id="amount"
                                type="number"
                                value={payoutAmount}
                                onChange={(e) => setPayoutAmount(e.target.value)}
                                placeholder="Enter amount"
                              />
                            </div>
                            <div className="grid gap-2">
                              <Label htmlFor="notes">Notes / Reference ID</Label>
                              <Textarea
                                id="notes"
                                value={payoutNotes}
                                onChange={(e) => setPayoutNotes(e.target.value)}
                                placeholder="E.g., Bank Transfer Ref #123456"
                              />
                            </div>
                          </div>
                          <DialogFooter>
                            <Button variant="outline" onClick={() => setIsPayoutOpen(false)}>Cancel</Button>
                            <Button onClick={handleRecordPayout} disabled={isRecordingPayout}>
                              {isRecordingPayout && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                              Record Payout
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>

                    <Card>
                      <div className="relative w-full overflow-auto">
                        <table className="w-full caption-bottom text-sm text-left">
                          <thead className="[&_tr]:border-b">
                            <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                              <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Date</th>
                              <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Type</th>
                              <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Amount</th>
                              <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Status</th>
                              <th className="h-12 px-4 align-middle font-medium text-muted-foreground">User / Reference</th>
                            </tr>
                          </thead>
                          <tbody className="[&_tr:last-child]:border-0">
                            {transactions.length === 0 ? (
                              <tr>
                                <td colSpan={5} className="p-4 text-center text-muted-foreground">
                                  No transactions found.
                                </td>
                              </tr>
                            ) : (
                              transactions.map((t) => (
                                <tr key={t._id} className="border-b transition-colors hover:bg-muted/50">
                                  <td className="p-4 align-middle">{formatDateTime(t.createdAt)}</td>
                                  <td className="p-4 align-middle">
                                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${t.type === "Payment"
                                      ? "bg-green-100 text-green-800"
                                      : "bg-blue-100 text-blue-800"
                                      }`}>
                                      {t.type}
                                    </span>
                                  </td>
                                  <td className="p-4 align-middle font-medium">₹{t.amount}</td>
                                  <td className="p-4 align-middle">{t.status}</td>
                                  <td className="p-4 align-middle">
                                    <div className="flex flex-col">
                                      {t.user?.fullName || t.userSnapshot?.name || "N/A"}
                                      {t.metadata?.referenceId && (
                                        <span className="text-xs text-muted-foreground">Ref: {t.metadata.referenceId}</span>
                                      )}
                                      {t.metadata?.notes && (
                                        <span className="text-xs text-muted-foreground">{t.metadata.notes}</span>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </Card>
                  </TabsContent>
                </Tabs>
              </div>
            )}

            {
              activeTab === "commission" && (
                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h1 className="text-xl font-semibold">
                        Business Commission
                      </h1>
                      <p className="text-xs text-muted-foreground">
                        Configure business rules for payouts & bookings
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
                            className="gap-2"
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
                        <Button onClick={() => setEditing(true)} className="gap-2">
                          <Pencil className="h-4 w-4" />
                          Edit Commission
                        </Button>
                      )}
                    </div>
                  </div>

                  <Card className="border-muted/60">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">
                        Commission Settings
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <LabeledInput
                          id="platformPercent"
                          label="Platform Commission (%)"
                          type="number"
                          value={commissionForm.platformPercent}
                          onChange={(value) =>
                            setCommissionForm((prev) => ({
                              ...prev,
                              platformPercent: value,
                            }))
                          }
                          disabled={disabled}
                        />
                        <LabeledInput
                          id="minDuration"
                          label="Minimum Session Duration (min)"
                          type="number"
                          value={commissionForm.minDurationMin}
                          onChange={(value) =>
                            setCommissionForm((prev) => ({
                              ...prev,
                              minDurationMin: value,
                            }))
                          }
                          disabled={disabled}
                        />
                        <LabeledInput
                          id="maxDuration"
                          label="Maximum Session Duration (min)"
                          type="number"
                          value={commissionForm.maxDurationMin}
                          onChange={(value) =>
                            setCommissionForm((prev) => ({
                              ...prev,
                              maxDurationMin: value,
                            }))
                          }
                          disabled={disabled}
                        />
                        <LabeledInput
                          id="cancellationWindow"
                          label="Cancellation Window (hours)"
                          type="number"
                          value={commissionForm.cancellationWindowHours}
                          onChange={(value) =>
                            setCommissionForm((prev) => ({
                              ...prev,
                              cancellationWindowHours: value,
                            }))
                          }
                          disabled={disabled}
                        />
                      </div>
                    </CardContent>
                  </Card>

                  <p className="text-xs text-muted-foreground">
                    Commission settings are saved together with the profile when
                    you click “Save Changes”.
                  </p>
                </div>
              )
            }

            {
              activeTab === "appointments" && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h1 className="text-xl font-semibold">
                        Appointment Overview
                      </h1>
                      <p className="text-xs text-muted-foreground">
                        Review upcoming and past consultations
                      </p>
                    </div>
                  </div>

                  <Section
                    title="Upcoming Appointments"
                    subtitle="Consultations scheduled with clients"
                  >
                    {upcomingAppointments.length === 0 ? (
                      <EmptyState message="No upcoming appointments scheduled." />
                    ) : (
                      upcomingAppointments.map((appointment, index) => (
                        <AppointmentCard
                          key={appointment.appointmentId || index}
                          appointment={appointment}
                        />
                      ))
                    )}
                  </Section>

                  <Section
                    title="Past Appointments"
                    subtitle="Consultation history and feedback"
                  >
                    {pastAppointments.length === 0 ? (
                      <EmptyState message="No past appointments recorded." />
                    ) : (
                      pastAppointments.map((appointment, index) => (
                        <PastAppointmentCard
                          key={appointment.appointmentId || index}
                          appointment={appointment}
                        />
                      ))
                    )}
                  </Section>
                </div>
              )
            }
          </>
        )}
      </main >
    </div >
  );
};

const Section = ({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) => (
  <div className="rounded-lg border bg-white p-5 shadow-sm">
    <h3 className="text-gray-900 font-semibold">{title}</h3>
    {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
    <div className="mt-4 space-y-3">{children}</div>
  </div>
);

const LabeledInput = ({
  id,
  label,
  value,
  onChange,
  type = "text",
  disabled,
  className,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  disabled?: boolean;
  className?: string;
}) => (
  <div className={className}>
    <Label
      htmlFor={id}
      className="text-xs text-muted-foreground mb-1 block"
    >
      {label}
    </Label>
    <Input
      id={id}
      type={type}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      disabled={disabled}
      className="h-9"
    />
  </div>
);

const EmptyState = ({ message }: { message: string }) => (
  <div className="rounded-md border border-dashed border-muted-foreground/30 bg-muted/20 p-6 text-center text-sm text-muted-foreground">
    {message}
  </div>
);

const formatDateTime = (value?: string) => {
  if (!value) return "Date to be confirmed";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const dateText = new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
  }).format(date);
  const timeText = new Intl.DateTimeFormat("en-IN", {
    timeStyle: "short",
  }).format(date);
  return `${dateText} • ${timeText}`;
};

const formatDuration = (minutes?: number) => {
  if (!minutes) return "Flexible duration";
  if (minutes < 60) return `${minutes} min`;
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins ? `${hrs}h ${mins}m` : `${hrs}h`;
};

const statusStyles: Record<
  NonNullable<AppointmentSummary["status"]>,
  string
> = {
  pending: "bg-yellow-100 text-yellow-700",
  confirmed: "bg-green-100 text-green-700",
  completed: "bg-blue-100 text-blue-700",
  cancelled: "bg-red-100 text-red-700",
  no_show: "bg-orange-100 text-orange-700",
};

const AppointmentCard = ({
  appointment,
}: {
  appointment: AppointmentSummary;
}) => {
  const dateLabel = formatDateTime(appointment.scheduledFor);
  const durationLabel = formatDuration(appointment.durationMinutes);
  const statusClass =
    appointment.status && statusStyles[appointment.status]
      ? statusStyles[appointment.status]
      : "bg-gray-100 text-gray-700";

  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border p-4 transition hover:bg-gray-50">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200 text-sm font-semibold text-gray-700">
          {(appointment.initials ||
            appointment.clientName?.slice(0, 2) ||
            "CL")?.toUpperCase()}
        </div>
        <div>
          <p className="font-medium text-gray-900">
            {appointment.clientName || "Client"}
          </p>
          <p className="text-sm text-gray-500">
            {appointment.title || "Consultation"}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-gray-500">
            <span className="inline-flex items-center gap-1">
              <CalendarDays size={12} />
              {dateLabel}
            </span>
            <span>{durationLabel}</span>
            {appointment.channel && (
              <span className="rounded bg-gray-100 px-2 py-0.5 capitalize text-gray-600">
                {appointment.channel.replace("_", " ")}
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {appointment.status && (
          <span
            className={`rounded-md px-2 py-1 text-xs font-medium capitalize ${statusClass}`}
          >
            {appointment.status.replace("_", " ")}
          </span>
        )}
        <Button variant="outline" size="sm">
          View Details
        </Button>
      </div>
    </div>
  );
};

const PastAppointmentCard = ({
  appointment,
}: {
  appointment: AppointmentSummary;
}) => {
  const dateLabel = formatDateTime(appointment.scheduledFor);
  const durationLabel = formatDuration(appointment.durationMinutes);
  const rating = Math.round(appointment.rating ?? 0);
  const hasRating = rating > 0;
  const stars = hasRating
    ? "★".repeat(rating).padEnd(5, "☆")
    : "☆☆☆☆☆";

  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border p-4 transition hover:bg-gray-50">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200 text-sm font-semibold text-gray-700">
          {(appointment.initials ||
            appointment.clientName?.slice(0, 2) ||
            "CL")?.toUpperCase()}
        </div>
        <div>
          <p className="font-medium text-gray-900">
            {appointment.clientName || "Client"}
          </p>
          <p className="text-sm text-gray-500">
            {appointment.title || "Consultation"}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-gray-500">
            <span className="inline-flex items-center gap-1">
              <CalendarDays size={12} />
              {dateLabel}
            </span>
            <span>{durationLabel}</span>
          </div>
          <div className="mt-1 flex items-center gap-2 text-xs">
            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
            <span className="text-yellow-600">{stars}</span>
            {hasRating && (
              <span className="rounded bg-yellow-100 px-1.5 py-0.5 text-[10px] font-medium text-yellow-700">
                {appointment.rating?.toFixed(1)} / 5
              </span>
            )}
          </div>
          {appointment.review && (
            <p className="mt-2 max-w-xl text-xs text-gray-600">
              {appointment.review}
            </p>
          )}
        </div>
      </div>
      <Button variant="outline" size="sm">
        View Details
      </Button>
    </div>
  );
};

export default ConsultantDashboard;

