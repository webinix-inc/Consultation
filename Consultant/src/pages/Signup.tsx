import { useEffect, useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useDispatch } from "react-redux";
import { loginSuccess } from "@/features/auth/authSlice";
import type { AppDispatch } from "@/app/store";
import AuthAPI from "@/api/auth.api";
import CategoryAPI from "@/api/category.api";
import { useQuery } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";

type CategoryItem = { categoryId: string; categoryName: string; subcategoryId: string; subcategoryName: string };
import Logo from "@/assets/images/logo.png";
import { getCurrencySymbol, getCurrencyCode } from "@/utils/currencyUtils";
import { validatePhone, formatPhoneForBackend } from "@/utils/validationUtils";

const Signup = () => {
  const [searchParams] = useSearchParams();
  const [userRole, setUserRole] = useState<'Client' | 'Consultant'>((searchParams.get("role") as 'Client' | 'Consultant') || 'Client');

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState(searchParams.get("mobile")?.replace(/\D/g, "") || "");
  const [selectedCountry, setSelectedCountry] = useState("in");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fees, setFees] = useState("");

  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loading, setLoading] = useState(false);

  const [selectedCategories, setSelectedCategories] = useState<CategoryItem[]>([
    { categoryId: "", categoryName: "", subcategoryId: "", subcategoryName: "" },
  ]);

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: () => CategoryAPI.getAll(),
    select: (res: any) => res?.data ?? res ?? [],
  });

  const getSubcategoriesForCategory = (categoryId: string) => {
    const cat = categories.find((c: any) => c._id === categoryId);
    return cat?.subcategories || [];
  };

  const addCategoryRow = () => {
    setSelectedCategories((prev) => [
      ...prev,
      { categoryId: "", categoryName: "", subcategoryId: "", subcategoryName: "" },
    ]);
  };

  const removeCategoryRow = (index: number) => {
    if (selectedCategories.length <= 1) return;
    setSelectedCategories((prev) => prev.filter((_, i) => i !== index));
  };

  const updateCategoryRow = (index: number, field: keyof CategoryItem, value: string) => {
    setSelectedCategories((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      if (field === "categoryId") {
        const cat = categories.find((c: any) => c._id === value);
        next[index].categoryName = cat?.title || "";
        next[index].subcategoryId = "";
        next[index].subcategoryName = "";
      } else if (field === "subcategoryId") {
        const cat = categories.find((c: any) => c._id === next[index].categoryId);
        const sub = cat?.subcategories?.find((s: any) => s._id === value);
        next[index].subcategoryName = sub?.name || sub?.title || "";
      }
      return next;
    });
  };
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    if (userRole === 'Client') {
      setSelectedCategories([{ categoryId: "", categoryName: "", subcategoryId: "", subcategoryName: "" }]);
    }
  }, [userRole]);

  // Redirect logged in users away from signup page
  useEffect(() => {
    if (isAuthenticated) {
      if (user.role !== 'Consultant' && user.role !== 'Client') {
        localStorage.removeItem('token');
        window.location.href = '/login';
        return;
      }
      navigate("/dashboard");
    }
  }, [isAuthenticated, navigate, user]);

  // Form validation check
  const isFormValid = () => {
    const baseFieldsValid = fullName && email && mobile.length >= 10 && password && confirmPassword && termsAccepted;
    if (userRole === 'Consultant') {
      const validCategories = selectedCategories.filter((c) => c.categoryId && c.subcategoryId);
      return baseFieldsValid && validCategories.length > 0 && fees;
    }
    return baseFieldsValid;
  };

  const handleSignup = async () => {
    // Validation
    if (!fullName || !email || !mobile || !password || !confirmPassword) {
      toast.error("Please fill in all fields");
      return;
    }

    if (!validatePhone(mobile)) {
      toast.error("Please enter a valid mobile number");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters long");
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    const validCategories = selectedCategories.filter((c) => c.categoryId && c.subcategoryId);
    if (userRole === 'Consultant' && validCategories.length === 0) {
      toast.error("Please select at least one category and subcategory");
      return;
    }

    if (userRole === 'Consultant' && !fees) {
      toast.error("Please enter a consultation fee");
      return;
    }

    if (!termsAccepted) {
      toast.error("Please accept the Terms and Conditions to continue");
      return;
    }

    setLoading(true);
    try {
      const normalizedMobile = formatPhoneForBackend(mobile, selectedCountry);

      const payload: any = {
        fullName,
        email,
        mobile: normalizedMobile,
        password,
        role: userRole,
        fees: userRole === 'Consultant' ? Number(fees) : undefined,
        currency: userRole === 'Consultant' ? getCurrencyCode(selectedCountry) : undefined,
      };

      if (userRole === 'Consultant' && validCategories.length > 0) {
        payload.categories = validCategories.map((c) => ({
          categoryId: c.categoryId,
          categoryName: c.categoryName,
          subcategoryId: c.subcategoryId,
          subcategoryName: c.subcategoryName,
        }));
        payload.category = validCategories[0].categoryId;
        payload.subcategory = validCategories[0].subcategoryId;
      }

      const response = await AuthAPI.signup(payload);

      const { token, user } = response.data.data;

      if (user.role === 'Consultant') {
        toast.success("Account created successfully! It is pending approval.");
        navigate("/account-status?status=pending");
      } else {
        dispatch(loginSuccess({ token, user }));
        toast.success("Account created successfully!");
        navigate("/dashboard");
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-tr from-[#e6f0fa] via-white to-[#d8ecfc] flex items-center justify-center px-4">
      <div className="bg-white shadow-xl border border-blue-100 rounded-3xl px-8 py-10 w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <img
            src={Logo}
            alt="Company Logo"
            className="h-16 w-16 object-contain mb-2"
          />
          <h1 className="text-2xl font-bold text-[#007ACC] tracking-wide">
            Create Account
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Sign up to get started
          </p>
        </div>

        <div className="space-y-5">

          {/* Role Selector */}
          <div className="flex gap-2 mb-4 bg-blue-50 p-1 rounded-lg border border-blue-100">
            <button
              onClick={() => setUserRole('Client')}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition ${userRole === 'Client'
                ? 'bg-white text-[#2E7FC4] shadow-sm font-semibold'
                : 'text-gray-600 hover:text-gray-800'
                }`}
            >
              Client
            </button>
            <button
              onClick={() => setUserRole('Consultant')}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition ${userRole === 'Consultant'
                ? 'bg-white text-[#2E7FC4] shadow-sm font-semibold'
                : 'text-gray-600 hover:text-gray-800'
                }`}
            >
              Consultant
            </button>
          </div>

          {userRole === 'Consultant' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-700">Categories</label>
                <button
                  type="button"
                  onClick={addCategoryRow}
                  className="text-sm text-[#2E7FC4] hover:underline flex items-center gap-1"
                >
                  <Plus size={14} /> Add category
                </button>
              </div>
              {selectedCategories.map((item, index) => (
                <div key={index} className="flex gap-2 items-end">
                  <div className="flex-1 grid grid-cols-2 gap-2">
                    <select
                      className="px-3 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#2E7FC4] text-gray-700 text-sm"
                      value={item.categoryId}
                      onChange={(e) => updateCategoryRow(index, "categoryId", e.target.value)}
                    >
                      <option value="">Category</option>
                      {categories.map((cat: any) => (
                        <option key={cat._id} value={cat._id}>
                          {cat.title}
                        </option>
                      ))}
                    </select>
                    <select
                      className="px-3 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#2E7FC4] text-gray-700 text-sm"
                      value={item.subcategoryId}
                      onChange={(e) => updateCategoryRow(index, "subcategoryId", e.target.value)}
                      disabled={!item.categoryId}
                    >
                      <option value="">Subcategory</option>
                      {getSubcategoriesForCategory(item.categoryId).map((sub: any) => (
                        <option key={sub._id} value={sub._id}>
                          {sub.name || sub.title}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeCategoryRow(index)}
                    disabled={selectedCategories.length <= 1}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {userRole === 'Consultant' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Consultation Fee ({getCurrencySymbol(selectedCountry)})
              </label>
              <input
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#2E7FC4] text-gray-700 placeholder-gray-400"
                value={fees}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9]/g, '');
                  setFees(val);
                }}
                placeholder="0"
                type="text" // numeric input controlled
                inputMode="numeric"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Full Name
            </label>
            <input
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#2E7FC4] text-gray-700 placeholder-gray-400"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="John Doe"
              type="text"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <input
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#2E7FC4] text-gray-700 placeholder-gray-400"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="john@example.com"
              type="email"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mobile Number
            </label>
            <PhoneInput
              country={'in'}
              value={mobile}
              onChange={(phone, country: any) => {
                setMobile(phone);
                setSelectedCountry(country.countryCode);
              }}
              enableSearch={true}
              containerClass="!w-full"
              inputClass="!w-full !h-[50px] !pl-[48px] !text-base !rounded-xl !border-gray-300 focus:!border-[#2E7FC4] !bg-white"
              buttonClass="!bg-gray-100 !rounded-l-xl !border-gray-300 !border-r-0 hover:!bg-gray-200"
              dropdownClass="!shadow-lg !rounded-lg"
              searchClass="!p-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#2E7FC4] text-gray-700 placeholder-gray-400"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Create a password"
              type="password"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confirm Password
            </label>
            <input
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#2E7FC4] text-gray-700 placeholder-gray-400"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm your password"
              type="password"
            />
          </div>



          {/* Terms and Conditions Checkbox */}
          <div className="flex items-start gap-2">
            <input
              type="checkbox"
              id="terms"
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-gray-300 text-[#2E7FC4] focus:ring-[#2E7FC4] cursor-pointer"
            />
            <label htmlFor="terms" className="text-sm text-gray-600 cursor-pointer">
              I agree to the{" "}
              <a
                href="/terms-and-conditions"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#2E7FC4] font-medium hover:underline"
              >
                Terms and Conditions
              </a>{" "}
              and{" "}
              <a
                href="/privacy-policy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#2E7FC4] font-medium hover:underline"
              >
                Privacy Policy
              </a>
            </label>
          </div>

          <button
            onClick={handleSignup}
            disabled={loading || !isFormValid()}
            className="w-full py-3 bg-[#2E7FC4] hover:bg-[#2567a5] text-white rounded-xl font-semibold shadow-md transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Creating Account..." : "Sign Up"}
          </button>

          <div className="text-center text-sm text-gray-600 mt-4">
            Already have an account?{" "}
            <Link
              to="/login"
              className="text-[#2E7FC4] font-semibold hover:underline"
            >
              Login
            </Link>
          </div>
        </div>

        <div className="text-center text-sm text-gray-400 mt-6">
          © {new Date().getFullYear()} AIOB. All rights reserved.
        </div>
      </div>
    </div >
  );
};

export default Signup;

