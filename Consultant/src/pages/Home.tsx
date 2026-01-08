import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import ConsultantAPI from "@/api/consultant.api";
import CategoryAPI from "@/api/category.api";
import axiosInstance from "@/api/axiosInstance";
import { Menu, X } from "lucide-react";
import Logo from "@/assets/images/logo.png";

export default function AIOBHero() {
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Fetch consultants from API (only Approved status) - using public endpoint
  const { data: consultantsData, isLoading: isLoadingConsultants } = useQuery({
    queryKey: ["consultants", "public"],
    queryFn: async () => {
      try {
        // Use public endpoint that doesn't require authentication
        const response = await axiosInstance.get("/consultants/public", {
          params: { status: "Active" }
        });
        // Handle different response structures
        let data = [];
        if (response.data?.data && Array.isArray(response.data.data)) {
          data = response.data.data;
        } else if (Array.isArray(response.data)) {
          data = response.data;
        }
        // Limit to 6 consultants for display
        return data.slice(0, 6);
      } catch (error: any) {
        console.error("Error fetching consultants:", error);
        return [];
      }
    },
  });

  // Fetch categories from API
  const { data: categoriesData, isLoading: isLoadingCategories } = useQuery({
    queryKey: ["categories", "public"],
    queryFn: async () => {
      try {
        const response = await CategoryAPI.getAll();
        // Handle different response structures
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

  // Extract consultants - data is already an array from queryFn
  const consultants = Array.isArray(consultantsData) ? consultantsData : [];

  // Extract categories - data is already an array from queryFn
  const categories = Array.isArray(categoriesData) ? categoriesData : [];
  return (
    <div className="overflow-x-hidden">
      {/* Hero Section - Dark Background */}
      <section className="min-h-screen bg-[#020617] text-white relative flex flex-col">
        {/* Top navigation */}
        <header className="max-w-7xl mx-auto px-6 py-6 flex items-center justify-between w-full relative z-50">
          <div className="flex items-center gap-3 relative z-50">
            <img src={Logo} alt="AIOB Logo" className="w-20 h-10 rounded-full object-cover" />
            {/* <span className="font-semibold text-xl tracking-tight">AIOB</span> */}
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
            <a href="/" className="hover:text-white transition-colors">Home</a>
            <a href="/consultants" className="hover:text-white transition-colors">Consultants</a>
            <a href="#services" className="hover:text-white transition-colors">Services</a>
            <a href="#" className="hover:text-white transition-colors">Blog</a>
            <a href="#" className="hover:text-white transition-colors">Contact</a>
          </nav>

          <div className="flex items-center gap-4">
            <div className="hidden md:block">
              {(() => {
                // Check if user is logged in from localStorage
                const token = localStorage.getItem("token");
                const userStr = localStorage.getItem("user");
                const isLoggedIn = !!token && !!userStr;

                if (isLoggedIn) {
                  return (
                    <button
                      onClick={() => navigate("/dashboard")}
                      className="bg-[#0d6efd] text-white px-6 py-2.5 rounded-full text-sm font-medium hover:bg-[#0b5ed7] transition-all shadow-lg hover:shadow-blue-500/25"
                    >
                      Dashboard
                    </button>
                  );
                }
                return (
                  <button
                    onClick={() => navigate("/login")}
                    className="bg-[#0d6efd] text-white px-6 py-2.5 rounded-full text-sm font-medium hover:bg-[#0b5ed7] transition-all shadow-lg hover:shadow-blue-500/25"
                  >
                    Login
                  </button>
                );
              })()}
            </div>

            {/* Mobile Menu Toggle */}
            <button
              className="md:hidden text-white p-2 relative z-50 focus:outline-none"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>

          {/* Mobile Menu Overlay */}
          {isMobileMenuOpen && (
            <div className="fixed inset-0 bg-[#020617] z-40 flex flex-col justify-center items-center gap-8 md:hidden animate-in fade-in zoom-in duration-300">
              <nav className="flex flex-col items-center gap-6 text-lg font-medium text-slate-300">
                <a href="/" onClick={() => setIsMobileMenuOpen(false)} className="hover:text-white transition-colors">Home</a>
                <a href="/consultants" onClick={() => setIsMobileMenuOpen(false)} className="hover:text-white transition-colors">Consultants</a>
                <a href="#services" onClick={() => setIsMobileMenuOpen(false)} className="hover:text-white transition-colors">Services</a>
                <a href="#" onClick={() => setIsMobileMenuOpen(false)} className="hover:text-white transition-colors">Blog</a>
                <a href="#" onClick={() => setIsMobileMenuOpen(false)} className="hover:text-white transition-colors">Contact</a>
              </nav>

              <div className="mt-4">
                {(() => {
                  const token = localStorage.getItem("token");
                  const userStr = localStorage.getItem("user");
                  const isLoggedIn = !!token && !!userStr;

                  return (
                    <button
                      onClick={() => {
                        navigate(isLoggedIn ? "/dashboard" : "/login");
                        setIsMobileMenuOpen(false);
                      }}
                      className="bg-[#0d6efd] text-white px-8 py-3 rounded-full text-base font-medium hover:bg-[#0b5ed7] transition-all shadow-lg hover:shadow-blue-500/25"
                    >
                      {isLoggedIn ? "Dashboard" : "Login"}
                    </button>
                  );
                })()}
              </div>
            </div>
          )}
        </header>

        {/* Hero Content */}
        <main className="max-w-7xl mx-auto px-6 py-12 flex-grow flex items-center relative z-10 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center w-full">
            {/* Left content */}
            <div className="lg:col-span-7 space-y-8">
              <h1 className="text-4xl sm:text-5xl md:text-7xl leading-[1.1] font-bold tracking-tight text-white max-w-3xl">
                Maximise growth
                <br />
                qualified business
                <br />
                consulting
              </h1>
              <p className="text-slate-400 text-lg max-w-xl leading-relaxed">
                Transform your business with expert consultancy services. Our team of seasoned consultants is unparalleled in driving success.
              </p>

              <div className="flex flex-wrap items-center gap-8 pt-4">
                <a
                  href="/consultants"
                  className="inline-flex items-center gap-3 bg-white text-[#071530] px-6 py-4 rounded-full font-semibold shadow-lg hover:bg-slate-50 transition-colors group"
                >
                  <div className="w-6 h-6 rounded-full border-2 border-[#071530] flex items-center justify-center">
                    <svg className="w-3 h-3 text-[#071530]" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                  Book consultation
                </a>


              </div>
            </div>

            {/* Right visual */}
            <div className="lg:col-span-5 flex justify-end relative">
              <div className="relative w-full max-w-md">
                {/* decorative dotted SVG */}
                <svg className="absolute -right-12 -top-12 z-0 opacity-50" width="160" height="160" viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <pattern id="dots" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
                      <circle cx="2" cy="2" r="2" fill="#1e3a8a" />
                    </pattern>
                  </defs>
                  <rect width="160" height="160" fill="url(#dots)" />
                </svg>

                {/* framed image */}
                <div className="relative z-10 rounded-3xl overflow-hidden shadow-2xl border border-slate-700/50 bg-slate-800">
                  <img
                    src="https://images.unsplash.com/photo-1556761175-5973dc0f32e7?ixlib=rb-4.0.3&auto=format&fit=crop&w=1632&q=80"
                    alt="Business consulting team"
                    className="w-full h-[300px] sm:h-[400px] md:h-[500px] object-cover"
                  />

                  {/* Play button overlay */}
                  <div className="absolute left-0 top-1/2 transform -translate-y-1/2 -translate-x-1/2">
                    <div className="relative group cursor-pointer">
                      <div className="absolute inset-0 bg-blue-600 rounded-full animate-ping opacity-20"></div>
                      <div className="w-20 h-20 rounded-full bg-[#071530] flex items-center justify-center shadow-2xl border-4 border-slate-800 relative z-10 group-hover:scale-105 transition-transform">
                        <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center">
                          <svg className="w-5 h-5 text-white ml-1" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        </div>
                        {/* Text on curve - simplified approximation */}
                        <div className="absolute w-full h-full rounded-full border border-white/10 animate-spin-slow"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* Small floating scroll pill on left */}
        <div className="absolute left-6 top-1/2 transform -translate-y-1/2 hidden xl:block">
          <div className="flex flex-col items-center gap-4">
            <div className="h-12 w-[1px] bg-slate-700"></div>
            <div className="vertical-text text-slate-500 text-xs tracking-[0.2em] uppercase font-medium" style={{ writingMode: 'vertical-rl' }}>Scroll</div>
          </div>
        </div>

        {/* Background decoration */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
          <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-blue-900/10 rounded-full blur-[100px]"></div>
          <div className="absolute bottom-[10%] right-[5%] w-[30%] h-[30%] bg-blue-600/5 rounded-full blur-[80px]"></div>
        </div>
      </section>

      {/* Features Section - Light Background */}
      <section className="bg-slate-50 py-16 md:py-24 px-6 relative overflow-hidden">
        {/* Decorative background elements for this section */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-[20%] right-[-5%] w-[300px] h-[300px] bg-blue-100 rounded-full blur-[80px] opacity-60"></div>
        </div>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 mb-4">
              <span className="w-1 h-1 rounded-full bg-blue-600"></span>
              <span className="text-blue-600 font-bold text-xs uppercase tracking-widest">Number #1 Solver</span>
              <span className="w-1 h-1 rounded-full bg-blue-600"></span>
            </div>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[#071530] mb-6 tracking-tight">
              Explore our core features
            </h2>
            <p className="text-slate-500 text-lg">
              Our mission is to empower businesses to thrive utilizing our expert solutions.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Feature 1 */}
            <div className="bg-white p-8 rounded-xl border border-slate-100 shadow-sm hover:shadow-lg transition-shadow group">
              <div className="w-16 h-16 mb-6 text-[#071530] group-hover:scale-110 transition-transform duration-300">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="w-full h-full">
                  <path d="M4 4h16v16H4z" strokeDasharray="4 4" />
                  <path d="M9 9h6v6H9z" />
                  <path d="M12 7v2 M12 15v2 M7 12h2 M15 12h2" strokeLinecap="round" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-[#071530] mb-3">Quick solutions</h3>
              <p className="text-slate-500 leading-relaxed text-sm">
                Our consultancy excels in providing quick solutions tailored to your business challenges
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white p-8 rounded-xl border border-slate-100 shadow-sm hover:shadow-lg transition-shadow group">
              <div className="w-16 h-16 mb-6 text-[#071530] group-hover:scale-110 transition-transform duration-300">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="w-full h-full">
                  <path d="M12 2l2.4 7.2h7.6l-6 4.8 2.4 7.2-6-4.8-6 4.8 2.4-7.2-6-4.8h7.6z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-[#071530] mb-3">Expert advice</h3>
              <p className="text-slate-500 leading-relaxed text-sm">
                Our consultancy excels in providing quick solutions tailored to your business challenges
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white p-8 rounded-xl border border-slate-100 shadow-sm hover:shadow-lg transition-shadow group">
              <div className="w-16 h-16 mb-6 text-[#071530] group-hover:scale-110 transition-transform duration-300">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="w-full h-full">
                  <circle cx="12" cy="12" r="9" strokeDasharray="4 4" />
                  <circle cx="12" cy="12" r="4" />
                  <path d="M12 2v2 M12 20v2 M2 12h2 M20 12h2" strokeLinecap="round" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-[#071530] mb-3">Strategic planning</h3>
              <p className="text-slate-500 leading-relaxed text-sm">
                Our consultancy excels in providing quick solutions tailored to your business challenges
              </p>
            </div>

            {/* Feature 4 */}
            <div className="bg-white p-8 rounded-xl border border-slate-100 shadow-sm hover:shadow-lg transition-shadow group">
              <div className="w-16 h-16 mb-6 text-[#071530] group-hover:scale-110 transition-transform duration-300">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="w-full h-full">
                  <path d="M4 12h16 M12 4v16" strokeDasharray="4 4" />
                  <rect x="8" y="8" width="8" height="8" rx="2" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-[#071530] mb-3">Efficient operations</h3>
              <p className="text-slate-500 leading-relaxed text-sm">
                Our consultancy excels in providing quick solutions tailored to your business challenges
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Our Company Section */}
      <section className="bg-[#eef2f6] py-16 md:py-24 px-6 relative overflow-hidden">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left Content - Images */}
          <div className="relative">
            {/* Main organic shape image */}
            <div className="relative z-10 w-full max-w-[500px] mx-auto lg:mx-0">
              {/* Custom shape using border-radius */}
              <div className="relative overflow-hidden shadow-2xl border-8 border-white"
                style={{ borderRadius: "30% 70% 50% 50% / 30% 30% 70% 70%" }}>
                <img
                  src="https://images.unsplash.com/photo-1552664730-d307ca884978?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
                  alt="Team meeting"
                  className="w-full aspect-square object-cover"
                />
              </div>
            </div>

            {/* Small floating top image - Circular */}
            <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 lg:translate-x-12 lg:left-[55%] z-20 w-28 h-28 rounded-full border-4 border-white shadow-xl overflow-hidden">
              <img
                src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80"
                alt="Consultant"
                className="w-full h-full object-cover"
              />
            </div>

            {/* Decorative elements */}
            <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-blue-600/10 rounded-full blur-2xl -z-10"></div>
          </div>

          {/* Right Content - Text */}
          <div className="space-y-8">
            <div className="inline-flex items-center gap-3">
              <span className="text-blue-600 font-bold text-xs uppercase tracking-[0.2em] relative">
                <span className="text-xl leading-none align-middle mr-2">•</span>
                Our Company
                <span className="text-xl leading-none align-middle ml-2">•</span>
              </span>
            </div>

            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[#071530] leading-[1.15]">
              Crafting success tailored solution for each & every challenges
            </h2>

            <p className="text-slate-500 text-lg leading-relaxed max-w-xl">
              Our mission is to empowers businesses off all size to thrive in an our businesses ever changing marketplace. We are committed to the delivering exceptional in the value through our strategic inset, innovative approaches.
              Our mission is to empower businesses of all sizes to thrive.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-8 pt-4">
              {/* Left Column: Checklist & Button */}
              <div className="space-y-8 pt-8">
                <ul className="space-y-4">
                  {[
                    "Expertise and experience",
                    "Client Centric approach",
                    "Commitment excellences"
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 text-[#071530] font-bold text-sm">
                      <div className="flex-shrink-0 text-blue-600">
                        {/* Double check icon */}
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M2 12L7 17L19 5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M12 17L17 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-50" />
                        </svg>
                      </div>
                      {item}
                    </li>
                  ))}
                </ul>


              </div>

              {/* Right Column: Stats & Avatars */}
              <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-white shadow-sm flex flex-col justify-center h-full">
                <div className="flex -space-x-3 mb-5">
                  <img className="w-11 h-11 rounded-full border-[3px] border-white object-cover" src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&q=80" alt="User" />
                  <img className="w-11 h-11 rounded-full border-[3px] border-white object-cover" src="https://images.unsplash.com/photo-1580489944761-15a19d654956?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&q=80" alt="User" />
                  <img className="w-11 h-11 rounded-full border-[3px] border-white object-cover" src="https://images.unsplash.com/photo-1633332755192-727a05c4013d?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&q=80" alt="User" />
                  <div className="w-11 h-11 rounded-full border-[3px] border-white bg-[#020617] text-white flex items-center justify-center text-xs font-bold">+</div>
                </div>
                <div className="text-5xl font-bold text-[#071530] mb-2 tracking-tight">3K+</div>
                <p className="text-slate-500 text-sm font-medium">Happy clients all over world now.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Specialized Expertise Section */}
      <section className="bg-white py-16 md:py-24 px-6 relative overflow-hidden">
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <div className="inline-flex items-center justify-center px-4 py-1.5 rounded-full border border-slate-200 bg-white mb-6">
              <span className="text-slate-600 font-medium text-xs tracking-wide">Consultation Categories</span>
            </div>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[#071530] mb-6 tracking-tight">
              Specialized Expertise
            </h2>
            <p className="text-slate-500 text-lg">
              Explore our diverse range of consultation services delivered by industry experts.
            </p>
          </div>

          {isLoadingCategories ? (
            <div className="text-center py-12">
              <p className="text-slate-500">Loading categories...</p>
            </div>
          ) : categories.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-slate-500">No categories available</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {categories.slice(0, 6).map((category: any, index: number) => (
                <div key={category._id || index} className="bg-white rounded-2xl overflow-hidden shadow-lg border border-slate-100 group hover:-translate-y-1 transition-transform duration-300 flex flex-col">
                  <div className="relative h-64 overflow-hidden bg-gradient-to-br from-blue-500 to-indigo-600">
                    {category.image && (
                      <img
                        src={category.image}
                        alt={category.title}
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    )}
                    <div className="absolute top-4 left-4 z-10 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full flex items-center gap-1 shadow-sm">
                      <svg className="w-4 h-4 text-yellow-500 fill-current" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
                      <span className="text-xs font-bold text-slate-800">
                        {category.consultants ? `${category.consultants}` : "0"}
                      </span>
                    </div>
                    {/* Dark overlay for text readability */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent z-0"></div>

                    {/* Fallback letter if no image (hidden if image exists) */}
                    {!category.image && (
                      <div className="w-full h-full flex items-center justify-center">
                        <div className="text-white text-6xl font-bold opacity-20">
                          {category.title?.[0] || "C"}
                        </div>
                      </div>
                    )}
                    <h3 className="absolute bottom-4 left-4 text-white text-xl font-bold z-10">{category.title || "Category"}</h3>
                  </div>
                  <div className="p-6 flex flex-col flex-grow">
                    <p className="text-blue-600 font-bold text-xs uppercase tracking-wider mb-2">
                      {`${category.title}`}
                    </p>
                    <p className="text-slate-500 text-sm leading-relaxed mb-6 line-clamp-3 flex-grow">
                      {`${category.description}`}
                    </p>
                    <a
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        navigate("/login");
                      }}
                      className="inline-flex items-center gap-2 text-blue-600 text-sm font-semibold hover:gap-3 transition-all mt-auto"
                    >
                      Learn More
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Top Consultants Section */}
      <section className="bg-[#e4e9f0] py-16 md:py-24 px-6 relative overflow-hidden">
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <div className="inline-flex items-center justify-center px-4 py-1.5 rounded-full border border-slate-300 bg-[#e4e9f0] mb-6">
              <span className="text-slate-600 font-medium text-xs tracking-wide">Expert Team</span>
            </div>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[#071530] mb-6 tracking-tight">
              Top Consultants
            </h2>
            <p className="text-slate-500 text-lg">
              Meet our highly-rated consultants with proven track records of delivering exceptional results.
            </p>
          </div>

          {isLoadingConsultants ? (
            <div className="text-center py-12">
              <p className="text-slate-500">Loading consultants...</p>
            </div>
          ) : consultants.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-slate-500">No consultants available</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {consultants.map((consultant: any, index: number) => {
                const consultantName = consultant.name || consultant.fullName || `${consultant.firstName || ""} ${consultant.lastName || ""}`.trim() || "Consultant";
                const consultantImage = consultant.image || consultant.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(consultantName)}&background=0d6efd&color=fff`;
                // Ensure rating is always a number
                const ratingValue = consultant.ratingSummary?.average || consultant.avgRating || 4.5;
                const rating = typeof ratingValue === 'number' ? ratingValue : parseFloat(ratingValue) || 4.5;
                const totalReviews = consultant.ratingSummary?.totalReviews || consultant.reviews?.length || 0;
                const clientsCount = consultant.clientsCount || consultant.clientInfo?.totalClients || consultant.clients || 0;
                const experience = consultant.yearsOfExperience ? `${consultant.yearsOfExperience}+ years of experience` : "Experienced professional";

                return (
                  <div key={consultant._id || consultant.id || index} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100 hover:shadow-xl transition-shadow duration-300 flex flex-col">
                    <div className="relative h-72 overflow-hidden bg-slate-100">
                      <div className="absolute top-4 right-4 z-10 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full flex items-center gap-1 shadow-sm">
                        <svg className="w-4 h-4 text-yellow-500 fill-current" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
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
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" /><polyline points="17 11 19 13 23 9" /></svg>
                          {experience}
                        </div>
                        <div className="flex items-center gap-3 text-slate-500 text-sm">
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                          {clientsCount}+ clients served
                        </div>
                      </div>

                      <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-slate-400 text-xs font-medium">{totalReviews} reviews</span>
                        <a
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            navigate(`/consultant/${consultant._id || consultant.id}`);
                          }}
                          className="flex items-center gap-1 text-blue-600 text-sm font-semibold hover:underline"
                        >
                          View Profile
                          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Fun Facts Section */}
      <section className="bg-[#e4e9f0] py-16 md:py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <span className="text-blue-600 font-bold text-xs uppercase tracking-[0.2em] relative inline-block mb-4">
              <span className="text-xl leading-none align-middle mr-2 text-blue-400">•</span>
              Fun Facts
              <span className="text-xl leading-none align-middle ml-2 text-blue-400">•</span>
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[#071530] max-w-2xl mx-auto leading-tight">
              Exploring fun tidbits and fascinating facts
            </h2>
          </div>

          <div className="bg-white rounded-none md:rounded-full shadow-sm border border-slate-100 grid grid-cols-1 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-slate-100 overflow-hidden">
            {[
              { val: "93%", label: "Complete project" },
              { val: "20M", label: "Reach worldwide" },
              { val: "8.5x", label: "Faster growth" },
              { val: "100+", label: "Awards archived" }
            ].map((item, i) => (
              <div key={i} className="p-10 text-center relative group">
                <div className="text-4xl md:text-5xl font-bold text-[#071530] mb-2">{item.val}</div>
                <div className="text-slate-500 font-medium text-sm">{item.label}</div>

                {/* Decorative circle on divider - hidden on mobile, visible on desktop except last item */}
                {i < 3 && (
                  <div className="hidden md:flex absolute top-1/2 -right-1.5 w-3 h-3 bg-white border-2 border-blue-500 rounded-full z-10 transform -translate-y-1/2 items-center justify-center">
                    <div className="w-1 h-1 bg-blue-500 rounded-full"></div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Skills & Experience Section */}
      <section className="relative py-16 md:py-24 px-6 min-h-[500px] flex items-center">
        {/* Background Image with Overlay */}
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1600880292203-757bb62b4baf?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80"
            alt="Office meeting"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-blue-900/40 mix-blend-multiply"></div>
        </div>

        <div className="max-w-7xl mx-auto w-full relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Spacer for left side */}
          <div className="hidden lg:block"></div>

          {/* Right Content */}
          <div className="bg-white/10 backdrop-blur-md border border-white/20 p-10 md:p-14 rounded-3xl shadow-2xl text-white">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6">Skill and experience</h2>
            <p className="text-blue-100 text-lg mb-10 leading-relaxed font-light">
              In today's dynamic business environment, the key to success lies in strategic planning and operational excellence.
            </p>

            <div className="space-y-8">
              {/* Progress Bar 1 */}
              <div>
                <div className="flex justify-between mb-2 font-bold tracking-wide">
                  <span>Business consultants</span>
                  <div className="bg-blue-600 px-2 py-0.5 rounded text-xs">90%</div>
                </div>
                <div className="h-2 bg-blue-900/50 rounded-full overflow-hidden relative">
                  <div className="absolute top-0 left-0 h-full bg-blue-500 w-[90%] rounded-full"></div>
                  {/* Handle */}
                  <div className="absolute top-1/2 -translate-y-1/2 left-[90%] w-4 h-4 bg-white border-4 border-blue-600 rounded-full shadow-lg"></div>
                </div>
              </div>

              {/* Progress Bar 2 */}
              <div>
                <div className="flex justify-between mb-2 font-bold tracking-wide">
                  <span>Client communication</span>
                  <div className="bg-blue-600 px-2 py-0.5 rounded text-xs">82%</div>
                </div>
                <div className="h-2 bg-blue-900/50 rounded-full overflow-hidden relative">
                  <div className="absolute top-0 left-0 h-full bg-blue-500 w-[82%] rounded-full"></div>
                  {/* Handle */}
                  <div className="absolute top-1/2 -translate-y-1/2 left-[82%] w-4 h-4 bg-white border-4 border-blue-600 rounded-full shadow-lg"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="bg-[#f8fafc] py-16 md:py-24 px-6 relative overflow-hidden">
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
            <div>
              <div className="text-blue-600 font-bold text-xs uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                <span className="text-xl leading-none">•</span> TESTIMONIALS <span className="text-xl leading-none">•</span>
              </div>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[#071530]">
                Listening to our clients
              </h2>
            </div>

            <div className="flex items-center gap-3">
              <button className="w-12 h-12 rounded-full border border-slate-200 flex items-center justify-center hover:bg-white hover:shadow-lg transition-all text-slate-400 hover:text-[#071530]">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
              </button>
              <button className="w-12 h-12 rounded-full border border-slate-200 flex items-center justify-center hover:bg-white hover:shadow-lg transition-all text-slate-400 hover:text-[#071530]">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Testimonial 1 */}
            <div className="bg-[#e4e9f0] p-10 rounded-none md:rounded-3xl relative">
              {/* Quote Mark */}
              <div className="text-blue-600 mb-6">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M14.017 21L14.017 18C14.017 16.8954 14.9124 16 16.017 16H19.017C19.5693 16 20.017 15.5523 20.017 15V9C20.017 8.44772 19.5693 8 19.017 8H15.017C14.4647 8 14.017 8.44772 14.017 9V11C14.017 11.5523 13.5693 12 13.017 12H12.017V5H22.017V15C22.017 18.3137 19.3307 21 16.017 21H14.017ZM5.0166 21L5.0166 18C5.0166 16.8954 5.91203 16 7.0166 16H10.0166C10.5689 16 11.0166 15.5523 11.0166 15V9C11.0166 8.44772 10.5689 8 10.0166 8H6.0166C5.46432 8 5.0166 8.44772 5.0166 9V11C5.0166 11.5523 4.56889 12 4.0166 12H3.0166V5H13.0166V15C13.0166 18.3137 10.3303 21 7.0166 21H5.0166Z" />
                </svg>
              </div>
              <p className="text-slate-600 text-lg leading-relaxed mb-8">
                Our experience with AIOB has been nothing short of exceptional. From day one, their team demonstrated a deep understanding of our industry and quickly identified key areas for improvement.
              </p>

              <div className="pt-8 border-t border-slate-300/50 flex items-center gap-4">
                <img className="w-14 h-14 rounded-full object-cover" src="https://images.unsplash.com/photo-1531123897727-8f129e1688ce?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&q=80" alt="Burdee Nicolas" />
                <div>
                  <div className="flex text-blue-600 mb-1">
                    {[1, 2, 3, 4, 5].map(i => (
                      <svg key={i} className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" /></svg>
                    ))}
                  </div>
                  <h4 className="font-bold text-[#071530] text-lg">Burdee Nicolas</h4>
                  <p className="text-slate-500 text-sm">Business owner</p>
                </div>
              </div>

              {/* White curve/notch at bottom left - decorative */}
              <div className="absolute -bottom-1 -left-1 w-20 h-20 bg-white rounded-tr-[50%] z-10"></div>
              <div className="absolute bottom-4 left-4 w-12 h-12 rounded-full overflow-hidden border-2 border-white z-20 shadow-lg">
                <img className="w-full h-full object-cover" src="https://images.unsplash.com/photo-1531123897727-8f129e1688ce?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&q=80" alt="Small avatar" />
              </div>
            </div>

            {/* Testimonial 2 */}
            <div className="bg-[#e4e9f0] p-10 rounded-none md:rounded-3xl relative">
              <div className="text-blue-600 mb-6">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M14.017 21L14.017 18C14.017 16.8954 14.9124 16 16.017 16H19.017C19.5693 16 20.017 15.5523 20.017 15V9C20.017 8.44772 19.5693 8 19.017 8H15.017C14.4647 8 14.017 8.44772 14.017 9V11C14.017 11.5523 13.5693 12 13.017 12H12.017V5H22.017V15C22.017 18.3137 19.3307 21 16.017 21H14.017ZM5.0166 21L5.0166 18C5.0166 16.8954 5.91203 16 7.0166 16H10.0166C10.5689 16 11.0166 15.5523 11.0166 15V9C11.0166 8.44772 10.5689 8 10.0166 8H6.0166C5.46432 8 5.0166 8.44772 5.0166 9V11C5.0166 11.5523 4.56889 12 4.0166 12H3.0166V5H13.0166V15C13.0166 18.3137 10.3303 21 7.0166 21H5.0166Z" />
                </svg>
              </div>
              <p className="text-slate-600 text-lg leading-relaxed mb-8">
                The strategic changes they recommended have not only optimized our operations but also led to a significant increase in our revenue. I highly recommend AIOB to any business looking to grow.
              </p>
              <div className="pt-8 border-t border-slate-300/50 flex items-center gap-4">
                <img className="w-14 h-14 rounded-full object-cover" src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&q=80" alt="Michael Desouza" />
                <div>
                  <div className="flex text-blue-600 mb-1">
                    {[1, 2, 3, 4, 5].map(i => (
                      <svg key={i} className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" /></svg>
                    ))}
                  </div>
                  <h4 className="font-bold text-[#071530] text-lg">Michael Desouza</h4>
                  <p className="text-slate-500 text-sm">Sr. Manager</p>
                </div>
              </div>

              {/* White curve/notch at bottom left - decorative */}
              <div className="absolute -bottom-1 -left-1 w-20 h-20 bg-white rounded-tr-[50%] z-10"></div>
              <div className="absolute bottom-4 left-4 w-12 h-12 rounded-full overflow-hidden border-2 border-white z-20 shadow-lg">
                <img className="w-full h-full object-cover" src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&q=80" alt="Small avatar" />
              </div>
            </div>
          </div>

          {/* Pagination dots */}
          <div className="flex justify-center gap-3 mt-12">
            <div className="w-3 h-3 rounded-full bg-blue-600"></div>
            <div className="w-3 h-3 rounded-full bg-slate-300 hover:bg-blue-300 cursor-pointer transition-colors"></div>
            <div className="w-3 h-3 rounded-full bg-slate-300 hover:bg-blue-300 cursor-pointer transition-colors"></div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="bg-[#020617] py-16 md:py-24 px-6 relative overflow-hidden text-white">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

          {/* Left Info */}
          <div>
            <div className="inline-flex items-center justify-center px-5 py-2 rounded-full bg-white text-[#071530] font-bold text-sm mb-8">
              Get in Touch
            </div>

            <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-6 leading-tight">
              Let's Start a <br />
              <span className="italic font-light">Conversation</span>
            </h2>

            <p className="text-slate-400 text-lg mb-12 max-w-md leading-relaxed">
              Ready to transform your business? Reach out to discuss how we can help you achieve your strategic objectives.
            </p>

            <div className="space-y-8">
              <div className="flex items-center gap-6 group">
                <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-[#071530] group-hover:scale-110 transition-transform shadow-[0_0_20px_rgba(255,255,255,0.1)]">
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
                </div>
                <div>
                  <p className="text-slate-400 text-sm mb-1">Email</p>
                  <p className="font-semibold text-xl">hello@consultpro.com</p>
                </div>
              </div>

              <div className="flex items-center gap-6 group">
                <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-[#071530] group-hover:scale-110 transition-transform shadow-[0_0_20px_rgba(255,255,255,0.1)]">
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.12 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
                </div>
                <div>
                  <p className="text-slate-400 text-sm mb-1">Phone</p>
                  <p className="font-semibold text-xl">+1 (555) 123-4567</p>
                </div>
              </div>

              <div className="flex items-center gap-6 group">
                <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-[#071530] group-hover:scale-110 transition-transform shadow-[0_0_20px_rgba(255,255,255,0.1)]">
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
                </div>
                <div>
                  <p className="text-slate-400 text-sm mb-1">Office</p>
                  <p className="font-semibold text-xl">123 Business Avenue, New York, NY 10001</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Form */}
          <div className="bg-white rounded-3xl p-8 md:p-10 text-[#071530]">
            <form className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">First Name</label>
                  <input type="text" placeholder="John" className="w-full bg-slate-100 border-none rounded-lg px-4 py-3 placeholder-slate-400 focus:ring-2 focus:ring-blue-600 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Last Name</label>
                  <input type="text" placeholder="Doe" className="w-full bg-slate-100 border-none rounded-lg px-4 py-3 placeholder-slate-400 focus:ring-2 focus:ring-blue-600 outline-none" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Email</label>
                <input type="email" placeholder="john@company.com" className="w-full bg-slate-100 border-none rounded-lg px-4 py-3 placeholder-slate-400 focus:ring-2 focus:ring-blue-600 outline-none" />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Company</label>
                <input type="text" placeholder="Your Company" className="w-full bg-slate-100 border-none rounded-lg px-4 py-3 placeholder-slate-400 focus:ring-2 focus:ring-blue-600 outline-none" />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Message</label>
                <textarea rows={4} placeholder="Tell us about your project..." className="w-full bg-slate-100 border-none rounded-lg px-4 py-3 placeholder-slate-400 focus:ring-2 focus:ring-blue-600 outline-none resize-none"></textarea>
              </div>

              <button type="button" className="w-full bg-[#1e5dab] hover:bg-blue-700 text-white font-bold py-4 rounded-lg transition-colors flex items-center justify-center gap-2">
                Send Message
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* Footer Section */}
      <footer className="bg-[#020617] pt-10 pb-10 px-6 border-t border-slate-800/50 text-slate-300">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
            {/* Brand Column */}
            <div className="lg:col-span-1">
              <div className="flex items-center gap-2 mb-6 text-white">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
                  <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>
                </div>
                <span className="text-xl font-bold tracking-tight">ConsultPro</span>
              </div>
              <p className="text-slate-500 text-sm leading-relaxed mb-6">
                Strategic consulting for ambitious organizations ready to transform and thrive.
              </p>
            </div>

            {/* Services Column */}
            <div>
              <h3 className="text-white font-semibold mb-6">Services</h3>
              <ul className="space-y-4 text-sm text-slate-400">
                <li><a href="#" className="hover:text-blue-400 transition-colors">Strategic Planning</a></li>
                <li><a href="#" className="hover:text-blue-400 transition-colors">Growth Optimization</a></li>
                <li><a href="#" className="hover:text-blue-400 transition-colors">Change Management</a></li>
                <li><a href="#" className="hover:text-blue-400 transition-colors">Innovation Advisory</a></li>
              </ul>
            </div>

            {/* Company Column */}
            <div>
              <h3 className="text-white font-semibold mb-6">Company</h3>
              <ul className="space-y-4 text-sm text-slate-400">
                <li><a href="#" className="hover:text-blue-400 transition-colors">About Us</a></li>
                <li><a href="#" className="hover:text-blue-400 transition-colors">Our Team</a></li>
                <li><a href="#" className="hover:text-blue-400 transition-colors">Careers</a></li>
                <li><a href="#" className="hover:text-blue-400 transition-colors">Contact</a></li>
              </ul>
            </div>

            {/* Connect Column */}
            <div>
              <h3 className="text-white font-semibold mb-6">Connect</h3>
              <div className="flex items-center gap-4">
                <a href="#" className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all text-slate-400">
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" /></svg>
                </a>
                <a href="#" className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all text-slate-400">
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z" /></svg>
                </a>
                <a href="#" className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all text-slate-400">
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" /></svg>
                </a>
              </div>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-800 flex flex-col md:flex-row justify-between items-center text-xs text-slate-500">
            <p>&copy; 2025 ConsultPro. All rights reserved.</p>
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
