import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useDispatch } from "react-redux";
import { loginSuccess } from "@/features/auth/authSlice";
import type { AppDispatch } from "@/app/store";
import AuthAPI from "@/api/auth.api";
import Logo from "@/assets/images/logo.png";

const Signup = () => {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

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

    setLoading(true);
    try {
      const response = await AuthAPI.signup({
        fullName,
        email,
        mobile,
        password,
        role: "Client",
      });

      const { token, user } = response.data.data;

      dispatch(loginSuccess({ token, user }));
      toast.success("Account created successfully!");
      navigate("/dashboard");
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
            <input
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#2E7FC4] text-gray-700 placeholder-gray-400"
              value={mobile}
              onChange={(e) => setMobile(e.target.value.replace(/\D/g, ""))}
              placeholder="1234567890"
              type="tel"
              maxLength={15}
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

          <button
            onClick={handleSignup}
            disabled={loading}
            className="w-full py-3 bg-[#2E7FC4] hover:bg-[#2567a5] text-white rounded-xl font-semibold shadow-md transition disabled:opacity-50"
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
          © {new Date().getFullYear()} Solvior. All rights reserved.
        </div>
      </div>
    </div>
  );
};

export default Signup;

