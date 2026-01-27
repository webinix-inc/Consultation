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
import { useBooking } from "@/hooks/useBooking";

// Declare Razorpay types
declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function Consultants() {
  const navigate = useNavigate();
  const handleViewProfile = (consultantId: string) => {
    navigate(`/consultant/${consultantId}`);
  };
  // const queryClient = useQueryClient(); // Handled in hook
  const { user, isAuthenticated } = useSelector((state: RootState) => state.auth);
  const [searchTerm, setSearchTerm] = useState("");

  // Hook Initialization
  // We need to pass activeConsultants and categories to the hook if needed, 
  // currently the hook handles state, but standardizing data passing is good.
  const {
    sched,
    setSched,
    showBookingModal,
    setShowBookingModal,
    showConfirmModal,
    setShowConfirmModal,
    isProcessingPayment, // exposed as isPending
    selectedConsultant,
    setSelectedConsultant,
    selectedCategoryForBooking,
    setSelectedCategoryForBooking,
    handlePreBooking,
    confirmBooking,
    formatDateToISO,
    holdExpiresAt,
    handleExpire
  } = useBooking({
    user,
    isAuthenticated,
    activeConsultants: [], // We'll pass empty for now as hook doesn't heavily use it yet, can refactor hook later to own data fetching if needed
    categories: []
  });

  // Fetch all consultants (public)
  const { data: consultantsData, isLoading: isLoadingConsultants } = useQuery({
    queryKey: ["consultants", "public"],
    queryFn: async () => {
      try {
        const response = await axiosInstance.get("/consultants/public", { params: { status: "Active" } });
        return response.data?.data || response.data || [];
      } catch (error) {
        console.error("Error fetching consultants:", error);
        return [];
      }
    },
  });

  // Fetch categories
  const { data: categoriesData } = useQuery({
    queryKey: ["categories", "public"],
    queryFn: async () => {
      try {
        const res = await CategoryAPI.getAll();
        return res.data || res || [];
      } catch (err) { return []; }
    }
  });

  // Fetch active consultants (for booking logic consistency)
  const { data: activeConsultantsData } = useQuery({
    queryKey: ["active-consultants"],
    queryFn: async () => UserAPI.getActiveConsultants(),
    enabled: isAuthenticated && user?.role === "Client",
    staleTime: 5 * 60 * 1000,
  });

  const consultants = Array.isArray(consultantsData) ? consultantsData : [];
  const categories = Array.isArray(categoriesData) ? categoriesData : [];

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
      country: u.country || "IN", // Explicitly propagate country
      currency: u.currency || "", // Explicitly propagate currency
    }));
  }, [activeConsultantsData, isAuthenticated, user?.role]);

  // Client-side filtering
  const filteredConsultantsList = useMemo(() => {
    if (!searchTerm.trim()) return consultants;
    const searchLower = searchTerm.toLowerCase().trim();
    return consultants.filter((c: any) => {
      let categoryTitle = "";
      if (c.category) {
        categoryTitle = typeof c.category === 'object' ? (c.category.title || "") : String(c.category);
      }
      return categoryTitle.toLowerCase().includes(searchLower);
    });
  }, [consultants, searchTerm]);

  // Auto-set client when logged in
  useEffect(() => {
    if (isAuthenticated && user?.role === "Client" && user?.id) {
      // Only set if not already set
      if (!sched.client) {
        setSched((s) => ({ ...s, client: user.id || (user as any)._id || "" }));
      }
    }
  }, [isAuthenticated, user, sched.client, setSched]);


  // Auto-populate logic (Simplified from original)
  useEffect(() => {
    if (selectedConsultant && showBookingModal) {
      const cId = selectedConsultant._id || selectedConsultant.id;
      setSched(s => ({ ...s, consultant: String(cId) }));

      // Try to set category
      let catId = "";
      if (selectedConsultant.category) {
        if (typeof selectedConsultant.category === 'object') {
          catId = selectedConsultant.category._id || selectedConsultant.category.id;
        } else {
          // simple string match
          const match = categories.find((c: any) => (c._id || c.id) === String(selectedConsultant.category) || c.title === String(selectedConsultant.category));
          if (match) catId = match._id || match.id;
        }
      }
      if (catId) setSelectedCategoryForBooking(String(catId));
    }
  }, [selectedConsultant, showBookingModal, categories, setSched, setSelectedCategoryForBooking]);


  // Filter consultants for Booking Modal
  const filteredConsultants = useMemo(() => {
    let filtered: any[] = [];

    // 1. If Consultant is Pre-Selected (from card)
    if (selectedConsultant && sched.consultant) {
      // Return just this one
      // Try to find full details in activeConsultants
      const fullDetails = activeConsultants.find((c: any) => (c._id || c.id) === (selectedConsultant._id || selectedConsultant.id));
      const item = fullDetails || {
        ...selectedConsultant,
        fullName: selectedConsultant.name || selectedConsultant.fullName
      };
      return [item];
    }

    // 2. Filter by Category
    if (selectedCategoryForBooking) {
      filtered = activeConsultants.filter((c: any) => {
        const cCat = c.category?._id || c.category?.id || c.category;
        return String(cCat) === String(selectedCategoryForBooking);
      });
    } else {
      filtered = [...activeConsultants];
    }

    return filtered;
  }, [activeConsultants, selectedCategoryForBooking, selectedConsultant, sched.consultant]);


  // Slots Query
  const selectedDateISO = formatDateToISO(sched.date);
  const { data: availableSlots = [] } = useQuery({
    queryKey: ["available-slots", "consultant", sched.consultant, selectedDateISO],
    queryFn: async () => {
      if (!sched.consultant || !selectedDateISO) return [];
      try {
        const res = await AppointmentAPI.getAvailableSlots(sched.consultant, selectedDateISO, 60);
        return Array.isArray(res) ? res : [];
      } catch (e) { return []; }
    },
    enabled: !!sched.consultant && !!selectedDateISO
  });

  const getSlotsToRender = (date: Date) => {
    const dateStr = formatDateToISO(date);
    if (dateStr !== selectedDateISO) return [];
    return availableSlots;
  };

  // Prepare data for Confirm Modal
  const selectedConsultantForBooking = useMemo(() => {
    if (!sched.consultant) return null;
    // Find in active or filtered
    let found = activeConsultants.find(c => (c._id || c.id) === sched.consultant);
    if (!found && selectedConsultant && (selectedConsultant._id || selectedConsultant.id) === sched.consultant) {
      found = selectedConsultant;
    }
    // normalize fees
    if (found && !found.fees) found.fees = 0;
    return found;
  }, [sched.consultant, activeConsultants, selectedConsultant]);

  const consultationFee = selectedConsultantForBooking?.fees || 0;
  const platformFee = 0;
  const totalFee = consultationFee + platformFee;


  // Load Razorpay Script (Effect)
  useEffect(() => {
    if (showConfirmModal && !window.Razorpay) {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      document.body.appendChild(script);
      return () => {
        if (document.body.contains(script)) document.body.removeChild(script);
      };
    }
  }, [showConfirmModal]);

  const handleBookNow = (consultant: any) => {
    if (!isAuthenticated || user?.role !== "Client") {
      toast.error("Please login as a client");
      navigate("/login", { state: { redirect: `/consultants`, message: "Login required" } });
      return;
    }
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
              const clientsCount = consultant.clientsCount || consultant.clientInfo?.totalClients || consultant.clients || 0;
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
                      {String(
                        (typeof consultant.category === "object"
                          ? consultant.category?.title || consultant.category?.name
                          : consultant.category) || "Consultant"
                      )}
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
            handlePreBooking={() => handlePreBooking(consultationFee)}
            isPending={isProcessingPayment}
            isConsultant={(user as any)?.role === "Consultant"}
            isClient={(user as any)?.role === "Client"}
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
            onClose={() => {
              setShowConfirmModal(false);
              handleExpire();
            }}
            onConfirm={() => confirmBooking(totalFee)}
            consultantDetails={selectedConsultantForBooking || {}}
            sched={sched}
            isPending={isProcessingPayment}
            paymentMethod="Razorpay"
            setPaymentMethod={() => { }}
            consultationFee={consultationFee}
            platformFee={platformFee}
            totalFee={totalFee}
            expiresAt={holdExpiresAt || ""}
            onExpire={handleExpire}
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
