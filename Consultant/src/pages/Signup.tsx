import { useEffect, useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useDispatch } from "react-redux";
import { loginSuccess } from "@/features/auth/authSlice";
import type { AppDispatch } from "@/app/store";
import AuthAPI from "@/api/auth.api";
import CategoryAPI from "@/api/category.api";
import SubcategoryAPI from "@/api/subcategory.api";
import { useQuery } from "@tanstack/react-query";
import Logo from "@/assets/images/logo.jpg";

const Signup = () => {
  const [searchParams] = useSearchParams();
  const [userRole, setUserRole] = useState<'Client' | 'Consultant'>((searchParams.get("role") as 'Client' | 'Consultant') || 'Client');

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState(searchParams.get("mobile")?.replace(/\D/g, "") || "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loading, setLoading] = useState(false);

  const [category, setCategory] = useState("");
  const [subcategory, setSubcategory] = useState("");

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

  console.log("subcategories", subcategories);
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const dispatch = useDispatch<AppDispatch>();

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
    const baseFieldsValid = fullName && email && mobile.length >= 10 && password.length >= 6 && password === confirmPassword && termsAccepted;
    if (userRole === 'Consultant') {
      return baseFieldsValid && category && subcategory;
    }
    return baseFieldsValid;
  };

  const handleSignup = async () => {
    // Validation
    if (!fullName || !email || !mobile || !password || !confirmPassword) {
      toast.error("Please fill in all fields");
      return;
    }

    if (mobile.length < 10) {
      toast.error("Please enter a valid mobile number");
      return;
    }

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters long");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    if (userRole === 'Consultant' && (!category || !subcategory)) {
      toast.error("Please select a category and subcategory");
      return;
    }

    if (!termsAccepted) {
      toast.error("Please accept the Terms and Conditions to continue");
      return;
    }

    setLoading(true);
    try {
      // Resolve Category and Subcategory Titles for payload
      const categoryObj = categories.find((c: any) => c._id === category);
      const categoryTitle = categoryObj?.title;

      // subcategory state holds the title already (from the select value below)

      const payload: any = {
        fullName,
        email,
        mobile,
        password,
        role: userRole,
        category: userRole === 'Consultant' ? categoryTitle : undefined,
        subcategory: userRole === 'Consultant' ? subcategory : undefined,
      };

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
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#2E7FC4] text-gray-700 bg-white"
                  value={category}
                  onChange={(e) => {
                    setCategory(e.target.value);
                    setSubcategory(""); // Reset subcategory
                  }}
                >
                  <option value="">Select Category</option>
                  {categories.map((cat: any) => (
                    <option key={cat._id} value={cat._id}>
                      {cat.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Subcategory
                </label>
                <select
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#2E7FC4] text-gray-700 bg-white disabled:bg-gray-100 disabled:text-gray-400"
                  value={subcategory}
                  onChange={(e) => setSubcategory(e.target.value)}
                  disabled={!category}
                >
                  <option value="">Select Subcategory</option>
                  {subcategories
                    .filter((sub: any) => {
                      if (!category) return false;
                      const pVal = sub.parentCategory;
                      const pId = pVal?._id || pVal;
                      return String(pId) === String(category);
                    })
                    .map((sub: any) => (
                      <option key={sub._id} value={sub.title}>
                        {sub.title}
                      </option>
                    ))}
                </select>
              </div>
            </>
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
            <div className="flex items-center gap-2">
              <span className="px-3 py-3 bg-gray-100 border border-gray-300 rounded-l-xl text-gray-700 font-medium">+91</span>
              <input
                className="flex-1 px-4 py-3 rounded-r-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#2E7FC4] text-gray-700 placeholder-gray-400"
                value={mobile}
                onChange={(e) => setMobile(e.target.value.replace(/\D/g, ""))}
                placeholder="1234567890"
                type="tel"
                maxLength={10}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#2E7FC4] text-gray-700 placeholder-gray-400"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
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
    </div>
  );
};

export default Signup;

