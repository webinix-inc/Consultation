import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import type { RootState } from "@/app/store";
import ConsultantAPI from "@/api/consultant.api";
import CategoryAPI from "@/api/category.api";
import UserAPI from "@/api/user.api";
import AppointmentAPI from "@/api/appointment.api";
import PaymentAPI from "@/api/payment.api";
import axiosInstance from "@/api/axiosInstance";
import { toast } from "react-hot-toast";
import { ScheduleModal } from "@/components/appointments/ScheduleModal";
import { ConfirmModal } from "@/components/appointments/ConfirmModal";
import { MiniCalendar } from "@/components/appointments/MiniCalendar";

// Declare Razorpay types
declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function Consultants() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useSelector((state: RootState) => state.auth);
  const [searchTerm, setSearchTerm] = useState("");
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedConsultant, setSelectedConsultant] = useState<any>(null);

  // Fetch all consultants from API (only Approved status) - using public endpoint
  const { data: consultantsData, isLoading: isLoadingConsultants } = useQuery({
    queryKey: ["consultants", "public"],
    queryFn: async () => {
      try {
        const params: any = { status: "Active" };
        const response = await axiosInstance.get("/consultants/public", { params });
        let data = [];
        if (response.data?.data && Array.isArray(response.data.data)) {
          data = response.data.data;
        } else if (Array.isArray(response.data)) {
          data = response.data;
        }
        return data;
      } catch (error: any) {
        console.error("Error fetching consultants:", error);
        return [];
      }
    },
  });

  // Fetch categories for filter and booking
  const { data: categoriesData } = useQuery({
    queryKey: ["categories", "public"],
    queryFn: async () => {
      try {
        const response = await CategoryAPI.getAll();
        if (response?.data && Array.isArray(response.data)) {
          return response.data;
        } else if (Array.isArray(response)) {
          return response;
        }
        return [];
      } catch (error: any) {
        console.error("Error fetching categories:", error);
        return [];
      }
    },
  });

  // Fetch active consultants for booking (only when logged in as client)
  const { data: activeConsultantsData } = useQuery({
    queryKey: ["active-consultants"],
    queryFn: async () => {
      const response = await UserAPI.getActiveConsultants();
      return response;
    },
    enabled: isAuthenticated && user?.role === "Client",
    staleTime: 5 * 60 * 1000,
  });

  const consultants = Array.isArray(consultantsData) ? consultantsData : [];
  const categories = Array.isArray(categoriesData) ? categoriesData : [];

  // Client-side filtering: case-insensitive category search with partial matching
  const filteredConsultantsList = useMemo(() => {
    if (!searchTerm.trim()) {
      return consultants; // Show all consultants if no search term
    }

    const searchLower = searchTerm.toLowerCase().trim();

    return consultants.filter((consultant: any) => {
      // Get category title (handle both object and string formats)
      let categoryTitle = "";
      if (consultant.category) {
        if (typeof consultant.category === 'object') {
          categoryTitle = consultant.category.title || "";
        } else {
          categoryTitle = String(consultant.category);
        }
      }

      // Case-insensitive partial match
      return categoryTitle.toLowerCase().includes(searchLower);
    });
  }, [consultants, searchTerm]);

  // Normalize active consultants
  const activeConsultants = useMemo(() => {
    if (!isAuthenticated || user?.role !== "Client") return [];
    let raw: any[] = [];
    if (!activeConsultantsData) return [];
    if (Array.isArray(activeConsultantsData)) raw = activeConsultantsData as any[];
    else if (activeConsultantsData.data && Array.isArray(activeConsultantsData.data)) raw = activeConsultantsData.data;
    else if ((activeConsultantsData as any).success && Array.isArray((activeConsultantsData as any).data)) raw = (activeConsultantsData as any).data;

    return raw.map((u: any) => ({
      ...u,
      fullName: u.fullName || u.name || `${u.firstName || ""} ${u.lastName || ""}`.trim() || "Unknown",
      _id: u._id || u.id,
      id: u._id || u.id,
    }));
  }, [activeConsultantsData, isAuthenticated, user?.role]);

  // Booking state
  const [sched, setSched] = useState({
    client: "",
    consultant: "",
    date: new Date(),
    time: null as string | null,
    session: "Video Call" as const,
    reason: "",
    notes: "",
  });

  const [selectedCategoryForBooking, setSelectedCategoryForBooking] = useState("");

  // Auto-set client when logged in
  useEffect(() => {
    if (isAuthenticated && user?.role === "Client" && user?.id) {
      setSched((s) => ({ ...s, client: user.id || (user as any)._id || "" }));
    }
  }, [isAuthenticated, user]);

  // Auto-populate category and consultant when booking from card
  useEffect(() => {
    if (selectedConsultant && showBookingModal) {
      const consultantId = selectedConsultant._id || selectedConsultant.id;

      // Extract category - handle both object and string formats
      let categoryId = "";
      let categoryTitle = "";

      if (selectedConsultant.category) {
        if (typeof selectedConsultant.category === 'object') {
          categoryId = selectedConsultant.category._id || selectedConsultant.category.id || "";
          categoryTitle = selectedConsultant.category.title || "";
        } else {
          // If string, assume it's the title
          categoryTitle = String(selectedConsultant.category);
        }
      }

      // If we only have title but no ID, try to find ID from categories list
      if (!categoryId && categoryTitle && categories.length > 0) {
        const foundCat = categories.find((cat: any) => cat.title === categoryTitle);
        if (foundCat) {
          categoryId = foundCat._id || foundCat.id;
        }
      }

      // Fallback: Try to find from activeConsultants logic if still not found
      let matchingConsultant = null;
      if (!categoryId) {
        matchingConsultant = activeConsultants.find((c: any) => {
          const cId = c._id || c.id;
          return String(cId) === String(consultantId);
        });

        if (matchingConsultant) {
          const cat = matchingConsultant.category;
          if (cat) {
            if (typeof cat === 'object') {
              categoryId = cat._id || cat.id || "";
            } else {
              // If it's a string title, look it up again in categories
              const foundCat = categories.find((c: any) => c.title === cat);
              if (foundCat) {
                categoryId = foundCat._id || foundCat.id;
              }
            }
          }
        }
      } else {
        // Just find it for logging purposes if needed, or leave null
        matchingConsultant = activeConsultants.find((c: any) => {
          const cId = c._id || c.id;
          return String(cId) === String(consultantId);
        });
      }

      // Set consultant immediately
      setSched((s) => ({ ...s, consultant: String(consultantId) }));

      // Set category if available
      if (categoryId) {
        setSelectedCategoryForBooking(String(categoryId));
      }

      console.log("Auto-populating booking:", {
        consultantId,
        categoryId,
        selectedConsultant,
        matchingConsultant: !!matchingConsultant,
        activeConsultantsCount: activeConsultants.length
      });
    }
  }, [selectedConsultant, showBookingModal, activeConsultants]);

  // Filter consultants by category for booking
  // If consultant is pre-selected from card, always include it and lock it
  const filteredConsultants = useMemo(() => {
    let filtered: any[] = [];

    // If consultant is pre-selected from card, always include it first
    if (selectedConsultant && sched.consultant) {
      const consultantId = selectedConsultant._id || selectedConsultant.id;
      const selected = activeConsultants.find((c: any) => {
        const cId = c._id || c.id;
        return String(cId) === String(consultantId);
      });

      if (selected) {
        filtered = [selected];
      } else {
        // If not found in activeConsultants, create a temporary entry from selectedConsultant
        filtered = [{
          _id: consultantId,
          id: consultantId,
          fullName: selectedConsultant.name || selectedConsultant.fullName || `${selectedConsultant.firstName || ""} ${selectedConsultant.lastName || ""}`.trim(),
          name: selectedConsultant.name || selectedConsultant.fullName,
          category: selectedConsultant.category,
          subcategory: selectedConsultant.subcategory,
        }];
      }
    } else {
      // Normal filtering by category
      if (selectedCategoryForBooking) {
        filtered = activeConsultants.filter((c: any) => {
          const catId = c.category?._id || c.category?.id || c.category;
          return String(catId) === String(selectedCategoryForBooking);
        });
      } else {
        // If no category selected, show all active consultants
        filtered = [...activeConsultants];
      }

      // If consultant is already selected, ensure it's in the list
      if (sched.consultant) {
        const selected = activeConsultants.find((c: any) => {
          const cId = c._id || c.id;
          return String(cId) === String(sched.consultant);
        });

        if (selected && !filtered.find((c: any) => {
          const cId = c._id || c.id;
          return String(cId) === String(sched.consultant);
        })) {
          // Add selected consultant if not already in filtered list
          filtered = [selected, ...filtered];
        }
      }
    }

    return filtered;
  }, [activeConsultants, selectedCategoryForBooking, sched.consultant, selectedConsultant]);

  // Get available time slots
  const selectedDateISO = useMemo(() => {
    const year = sched.date.getFullYear();
    const month = String(sched.date.getMonth() + 1).padStart(2, "0");
    const day = String(sched.date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }, [sched.date]);

  const { data: availableSlots = [] } = useQuery({
    queryKey: ["available-slots", "consultant", sched.consultant, selectedDateISO],
    queryFn: async () => {
      if (!sched.consultant || !selectedDateISO) return [];
      try {
        const slots = await AppointmentAPI.getAvailableSlots(sched.consultant, selectedDateISO, 60);
        return Array.isArray(slots) ? slots : [];
      } catch (error) {
        console.error("Error fetching slots:", error);
        return [];
      }
    },
    enabled: !!sched.consultant && !!selectedDateISO,
  });

  const getSlotsToRender = (date: Date): string[] => {
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    if (dateStr !== selectedDateISO || !sched.consultant) return [];
    return availableSlots || [];
  };

  // Note: Appointment creation is now handled directly in finalConfirmBooking
  // No separate mutation needed as we handle the flow manually

  const handlePreBooking = () => {
    // Validate client
    if (!sched.client) {
      toast.error("Please ensure you are logged in as a client");
      return;
    }

    // Validate consultant
    if (!sched.consultant) {
      toast.error("Please select a consultant");
      return;
    }

    // Validate date
    if (!sched.date) {
      toast.error("Please select a date for your appointment");
      return;
    }

    // Check if date is in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedDate = new Date(sched.date);
    selectedDate.setHours(0, 0, 0, 0);

    if (selectedDate < today) {
      toast.error("Cannot book appointments in the past. Please select a future date");
      return;
    }

    // Validate time slot
    if (!sched.time) {
      toast.error("Please select an available time slot");
      return;
    }

    // All validations passed
    setShowConfirmModal(true);
  };

  // Get selected consultant details for confirmation
  const selectedConsultantForBooking = useMemo(() => {
    if (!sched.consultant) return null;

    // First try to find in activeConsultants
    const found = activeConsultants.find((c: any) => {
      const cId = c._id || c.id;
      return String(cId) === String(sched.consultant);
    });

    if (found) return found;

    // Fallback to selectedConsultant if it matches
    if (selectedConsultant) {
      const consultantId = selectedConsultant._id || selectedConsultant.id;
      if (String(consultantId) === String(sched.consultant)) {
        // Transform selectedConsultant to match expected format
        return {
          _id: consultantId,
          id: consultantId,
          fullName: selectedConsultant.name || selectedConsultant.fullName || `${selectedConsultant.firstName || ""} ${selectedConsultant.lastName || ""}`.trim(),
          name: selectedConsultant.name || selectedConsultant.fullName,
          category: selectedConsultant.category,
          subcategory: selectedConsultant.subcategory,
          fees: selectedConsultant.fees || 0,
        };
      }
    }

    return null;
  }, [sched.consultant, activeConsultants, selectedConsultant]);

  const consultationFee = selectedConsultantForBooking?.fees || 0;
  const platformFee = 0; // No platform fee for now
  const totalFee = consultationFee + platformFee;
  const [pendingAppointmentId, setPendingAppointmentId] = useState<string | null>(null);
  const [pendingTransactionId, setPendingTransactionId] = useState<string | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // Load Razorpay script
  useEffect(() => {
    if (showConfirmModal && !window.Razorpay) {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      document.body.appendChild(script);

      script.onload = () => {
        console.log("Razorpay script loaded");
      };

      return () => {
        if (document.body.contains(script)) {
          document.body.removeChild(script);
        }
      };
    }
  }, [showConfirmModal]);

  const finalConfirmBooking = async () => {
    if (!window.Razorpay) {
      toast.error("Payment gateway is loading. Please wait...");
      return;
    }

    if (isProcessingPayment) {
      return; // Prevent multiple clicks
    }

    // Validate user is logged in as Client
    if (!isAuthenticated || user?.role !== "Client") {
      toast.error("Please login as a client to book an appointment");
      navigate("/login", { state: { redirect: `/consultants`, message: "Please login to book an appointment" } });
      return;
    }

    // Ensure client ID is set
    if (!sched.client) {
      const clientId = (user as any)?._id || user?.id || "";
      if (!clientId) {
        toast.error("Unable to identify user. Please login again.");
        navigate("/login", { state: { redirect: `/consultants`, message: "Please login to book an appointment" } });
        return;
      }
      setSched((s) => ({ ...s, client: String(clientId) }));
    }

    // Validate required fields with specific messages
    if (!sched.consultant) {
      toast.error("Please select a consultant");
      setIsProcessingPayment(false);
      return;
    }

    if (!sched.date) {
      toast.error("Please select a date for your appointment");
      setIsProcessingPayment(false);
      return;
    }

    // Check if date is in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedDate = new Date(sched.date);
    selectedDate.setHours(0, 0, 0, 0);

    if (selectedDate < today) {
      toast.error("Cannot book appointments in the past. Please select a future date");
      setIsProcessingPayment(false);
      return;
    }

    if (!sched.time) {
      toast.error("Please select an available time slot");
      setIsProcessingPayment(false);
      return;
    }

    // Validate fee
    if (!consultationFee || consultationFee <= 0) {
      toast.error("Invalid consultation fee. Please contact support");
      setIsProcessingPayment(false);
      return;
    }

    setIsProcessingPayment(true);

    try {
      const consultantId = sched.consultant;
      const selectedConsultantObj = selectedConsultantForBooking;

      const category = selectedConsultantObj?.category?.title || selectedConsultantObj?.subcategory?.title || categories?.[0]?.title || "General";
      const fee = consultationFee;

      // Parse time slot
      const slotTime = sched.time || "";
      const [startHH, startMM] = slotTime.includes(" - ") ? slotTime.split(" - ")[0].split(":") : slotTime.split(":");
      const endTime = slotTime.includes(" - ") ? slotTime.split(" - ")[1] : null;
      const [endHH, endMM] = endTime ? endTime.split(":") : [String(parseInt(startHH) + 1).padStart(2, "0"), startMM];

      // Step 1: Create appointment with pending payment
      const appointmentPayload = {
        client: sched.client,
        consultant: consultantId,
        category,
        session: sched.session,
        date: selectedDateISO,
        timeStart: `${startHH}:${startMM}`,
        timeEnd: `${endHH}:${endMM}`,
        status: "Upcoming",
        reason: sched.reason || "",
        notes: sched.notes || "",
        fee: fee,
      };

      const appointmentResponse = await AppointmentAPI.create(appointmentPayload);
      const appointmentId = appointmentResponse?.data?._id || appointmentResponse?._id || appointmentResponse?.data?.id;

      if (!appointmentId) {
        toast.error("Failed to create appointment. Please try again");
        setIsProcessingPayment(false);
        return;
      }

      setPendingAppointmentId(appointmentId);

      // Step 2: Create Razorpay order
      let orderResponse;
      try {
        orderResponse = await PaymentAPI.createOrder({
          amount: fee,
          appointmentId: appointmentId,
          consultantId: consultantId,
          clientId: sched.client,
        });
      } catch (orderError: any) {
        console.error("Error creating Razorpay order:", orderError);
        toast.error(orderError?.response?.data?.message || "Failed to initialize payment. Please try again");
        setIsProcessingPayment(false);
        // Clean up pending appointment
        if (appointmentId) {
          AppointmentAPI.remove(appointmentId).catch(console.error);
        }
        return;
      }

      const orderData = orderResponse?.data || orderResponse;
      const razorpayOrderId = orderData.orderId;
      const razorpayKey = orderData.key;
      const transactionId = orderData.transactionId;

      if (!razorpayOrderId || !razorpayKey) {
        toast.error("Payment gateway initialization failed. Please try again");
        setIsProcessingPayment(false);
        // Clean up pending appointment
        if (appointmentId) {
          AppointmentAPI.remove(appointmentId).catch(console.error);
        }
        return;
      }

      setPendingTransactionId(transactionId);

      // Step 3: Open Razorpay checkout
      const options = {
        key: razorpayKey,
        amount: orderData.amount,
        currency: orderData.currency || "INR",
        name: "AIOB Consultation",
        description: `Appointment with ${selectedConsultantObj?.fullName || "Consultant"}`,
        order_id: razorpayOrderId,
        handler: async function (response: any) {
          try {
            // Step 4: Verify payment
            await PaymentAPI.verifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              transactionId: transactionId,
              appointmentId: appointmentId,
            });

            toast.success("Payment successful! Appointment confirmed.");
            queryClient.invalidateQueries({ queryKey: ["appointments"] });
            setShowBookingModal(false);
            setShowConfirmModal(false);
            setSelectedConsultant(null);
            setPendingAppointmentId(null);
            setPendingTransactionId(null);
            setIsProcessingPayment(false);
            setSched({
              client: sched.client, // Keep client
              consultant: "",
              date: new Date(),
              time: null,
              session: "Video Call",
              reason: "",
              notes: "",
            });
            setSelectedCategoryForBooking("");
          } catch (error: any) {
            console.error("Payment verification error:", error);
            toast.error(error?.response?.data?.message || "Payment verification failed");
            setIsProcessingPayment(false);
          }
        },
        prefill: {
          name: user?.name || "",
          email: user?.email || "",
          contact: (user as any)?.mobile || "",
        },
        theme: {
          color: "#0d6efd",
        },
        modal: {
          ondismiss: function () {
            toast.error("Payment cancelled");
            setIsProcessingPayment(false);
            // Optionally delete the pending appointment
            if (appointmentId) {
              AppointmentAPI.remove(appointmentId).catch(console.error);
            }
          },
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.on("payment.failed", function (response: any) {
        toast.error(`Payment failed: ${response.error.description}`);
        setIsProcessingPayment(false);
      });
      razorpay.open();
    } catch (error: any) {
      console.error("Error initiating payment:", error);
      toast.error(error?.response?.data?.message || "Failed to initiate payment");
      setIsProcessingPayment(false);
    }
  };

  const handleViewProfile = (consultantId: string) => {
    navigate(`/consultant/${consultantId}`);
  };

  const handleBookNow = (consultant: any) => {
    if (!isAuthenticated || user?.role !== "Client") {
      toast.error("Please login as a client to book an appointment");
      navigate("/login", { state: { redirect: `/consultants`, message: "Please login to book an appointment" } });
      return;
    }

    // Set selected consultant and open modal
    setSelectedConsultant(consultant);
    setShowBookingModal(true);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-[#020617] text-white">
        <div className="max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center font-bold text-lg text-white">S</div>
            <span className="font-semibold text-xl tracking-tight">AIOB</span>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
            <a href="/" className="hover:text-white transition-colors">Home</a>
            <a href="/consultants" className="text-white font-semibold">Consultants</a>
            <a href="#services" className="hover:text-white transition-colors">Services</a>
            <a href="#" className="hover:text-white transition-colors">Portfolios</a>
            <a href="#" className="hover:text-white transition-colors">Blog</a>
            <a href="#" className="hover:text-white transition-colors">Contact</a>
          </nav>
          <div className="ml-4">
            {isAuthenticated ? (
              <button
                onClick={() => navigate("/dashboard")}
                className="hidden md:inline-block bg-[#0d6efd] text-white px-6 py-2.5 rounded-full text-sm font-medium hover:bg-[#0b5ed7] transition-all shadow-lg hover:shadow-blue-500/25"
              >
                Dashboard
              </button>
            ) : (
              <button
                onClick={() => navigate("/login")}
                className="hidden md:inline-block bg-[#0d6efd] text-white px-6 py-2.5 rounded-full text-sm font-medium hover:bg-[#0b5ed7] transition-all shadow-lg hover:shadow-blue-500/25"
              >
                Login
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-12">
        {/* Page Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-[#071530] mb-4">
            Our Expert Consultants
          </h1>
          <p className="text-slate-600 text-lg max-w-2xl mx-auto">
            Connect with experienced professionals ready to help you achieve your goals
          </p>
        </div>

        {/* Search Filter */}
        <div className="mb-8">
          <input
            type="text"
            placeholder="Search by category..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Consultants Grid */}
        {isLoadingConsultants ? (
          <div className="text-center py-12">
            <p className="text-slate-500">Loading consultants...</p>
          </div>
        ) : filteredConsultantsList.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-slate-500">No consultants found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredConsultantsList.map((consultant: any, index: number) => {
              const consultantName = consultant.name || consultant.fullName || `${consultant.firstName || ""} ${consultant.lastName || ""}`.trim() || "Consultant";
              const consultantImage = consultant.image || consultant.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(consultantName)}&background=0d6efd&color=fff`;
              const ratingValue = consultant.ratingSummary?.average || consultant.avgRating || 4.5;
              const rating = typeof ratingValue === 'number' ? ratingValue : parseFloat(ratingValue) || 4.5;
              const totalReviews = consultant.ratingSummary?.totalReviews || consultant.reviews?.length || 0;
              const clientsCount = consultant.clientInfo?.totalClients || consultant.clients || 0;
              const experience = consultant.yearsOfExperience ? `${consultant.yearsOfExperience}+ years of experience` : "Experienced professional";
              const consultantId = consultant._id || consultant.id;

              return (
                <div key={consultantId || index} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100 hover:shadow-xl transition-shadow duration-300 flex flex-col">
                  <div className="relative h-72 overflow-hidden bg-slate-100">
                    <div className="absolute top-4 right-4 z-10 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full flex items-center gap-1 shadow-sm">
                      <svg className="w-4 h-4 text-yellow-500 fill-current" viewBox="0 0 24 24">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                      </svg>
                      <span className="text-xs font-bold text-slate-800">{rating.toFixed(1)}</span>
                    </div>
                    <img
                      src={consultantImage}
                      alt={consultantName}
                      className="w-full h-full object-cover object-top"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(consultantName)}&background=0d6efd&color=fff`;
                      }}
                    />
                  </div>
                  <div className="p-6 flex-grow flex flex-col">
                    <h3 className="text-xl font-bold text-[#071530] mb-1">{consultantName}</h3>
                    <p className="text-blue-600 font-medium text-sm mb-4">
                      {consultant.category?.title || consultant.category || "Consultant"}
                    </p>

                    <div className="space-y-2 mb-6">
                      <div className="flex items-center gap-3 text-slate-500 text-sm">
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                          <circle cx="8.5" cy="7" r="4" />
                          <polyline points="17 11 19 13 23 9" />
                        </svg>
                        {experience}
                      </div>
                      <div className="flex items-center gap-3 text-slate-500 text-sm">
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                          <circle cx="9" cy="7" r="4" />
                          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                        </svg>
                        {clientsCount}+ clients served
                      </div>
                    </div>

                    <div className="mt-auto pt-4 border-t border-slate-100 space-y-3">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-slate-400 text-xs font-medium">{totalReviews} reviews</span>
                      </div>
                      <div className="flex gap-3">
                        <button
                          onClick={() => handleViewProfile(consultantId)}
                          className="flex-1 px-4 py-2.5 text-sm font-semibold text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                        >
                          View
                        </button>
                        <button
                          onClick={() => handleBookNow(consultant)}
                          className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          Book Now
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Booking Modal */}
      {isAuthenticated && user?.role === "Client" && (
        <>
          <ScheduleModal
            open={showBookingModal}
            onClose={() => {
              setShowBookingModal(false);
              setSelectedConsultant(null);
              setSched({
                client: sched.client, // Keep client
                consultant: "",
                date: new Date(),
                time: null,
                session: "Video Call",
                reason: "",
                notes: "",
              });
              setSelectedCategoryForBooking("");
            }}
            sched={sched}
            setSched={setSched}
            clients={[]}
            categories={categories}
            consultants={filteredConsultants}
            isLoadingUsers={false}
            handlePreBooking={handlePreBooking}
            isPending={isProcessingPayment}
            isConsultant={false}
            isClient={true}
            getSlotsToRender={getSlotsToRender}
            selectedCategory={selectedCategoryForBooking}
            setSelectedCategory={(catId: string) => {
              // Only allow category change if not pre-selected
              if (!selectedConsultant) {
                setSelectedCategoryForBooking(catId);
                if (catId && sched.consultant) {
                  const consultantMatchesCategory = filteredConsultants.some((c: any) => {
                    const cId = c._id || c.id;
                    return String(cId) === String(sched.consultant);
                  });
                  if (!consultantMatchesCategory) {
                    setSched((s: any) => ({ ...s, consultant: "", time: null }));
                  }
                } else if (!catId) {
                  setSched((s: any) => ({ ...s, consultant: "", time: null }));
                }
              }
            }}
            isPreSelected={!!selectedConsultant}
          />

          <ConfirmModal
            open={showConfirmModal}
            onClose={() => setShowConfirmModal(false)}
            onConfirm={finalConfirmBooking}
            consultantDetails={selectedConsultantForBooking || {}}
            sched={sched}
            isPending={isProcessingPayment}
            paymentMethod="Razorpay"
            setPaymentMethod={() => { }}
            consultationFee={consultationFee}
            platformFee={platformFee}
            totalFee={totalFee}
          />
        </>
      )}

      {/* Footer */}
      <footer className="bg-[#020617] pt-10 pb-10 px-6 border-t border-slate-800/50 text-slate-300 mt-20">
        <div className="max-w-7xl mx-auto">
          <div className="pt-8 border-t border-slate-800 flex flex-col md:flex-row justify-between items-center text-xs text-slate-500">
            <p>&copy; 2025 AIOB. All rights reserved.</p>
            <div className="flex items-center gap-6 mt-4 md:mt-0">
              <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
