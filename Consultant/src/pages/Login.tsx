import { useEffect, useState } from "react";
import { Edit2 } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useDispatch } from "react-redux";
import { loginSuccess } from "@/features/auth/authSlice";
import type { AppDispatch } from "@/app/store";
import AuthAPI from "@/api/auth.api";
import Logo from "@/assets/images/logo.jpg";

const Login = () => {
  const [loginMode, setLoginMode] = useState<'otp' | 'password'>('password');
  const [step, setStep] = useState<'mobile' | 'otp'>('mobile');
  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState("");
  const [loginId, setLoginId] = useState(""); // Email or mobile for password login
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(30);

  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const dispatch = useDispatch<AppDispatch>();

  // ✅ Redirect logged in users away from login page
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

  // Timer countdown logic
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (step === 'otp' && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [step, timer]);

  const handleSendOtp = async () => {
    // Normalize mobile number: strip all non-digit characters
    const normalizedMobile = mobile.replace(/\D/g, '');

    if (!normalizedMobile || normalizedMobile.length < 10) {
      toast.error("Please enter a valid mobile number");
      return;
    }

    setLoading(true);
    try {
      const response = await AuthAPI.sendOtp({ mobile: normalizedMobile });
      const { otp } = response.data.data;

      console.log("📱 About to show toast with OTP:", otp);
      const message = `OTP sent successfully. Code: ${otp}`;
      console.log("📱 Toast message:", message);
      toast.success(message);

      setStep('otp');
      setTimer(30); // Reset timer on successful send
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordLogin = async () => {
    if (!loginId || !password) {
      toast.error("Please enter email/mobile and password");
      return;
    }

    setLoading(true);
    try {
      const response = await AuthAPI.login({ loginId, password });
      const { token, user } = response.data.data;

      // Check if user is admin - block admin login
      if (user.role === 'Admin') {
        toast.error('Access denied. Admins cannot log in to this portal.');
        setLoading(false);
        return;
      }

      // Login success for Consultant/Client
      dispatch(loginSuccess({ token, user }));
      navigate("/dashboard");
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || "Login failed";

      if (errorMessage.includes("pending approval")) {
        navigate('/account-status?status=pending');
        return;
      } else if (errorMessage.includes("application has been rejected")) {
        navigate('/account-status?status=rejected');
        return;
      } else if (errorMessage.includes("has been blocked")) {
        navigate('/account-status?status=blocked');
        return;
      }

      // Check for user not found errors - redirect to signup
      if (errorMessage.toLowerCase().includes("invalid login") ||
        errorMessage.toLowerCase().includes("not found") ||
        errorMessage.toLowerCase().includes("user not found")) {
        toast.info("Account not found. Redirecting to sign up...");
        navigate(`/signup?mobile=${encodeURIComponent(loginId)}`);
        return;
      }

      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp || otp.length !== 6) {
      toast.error("Please enter a valid 6-digit OTP");
      return;
    }

    // Normalize mobile number: strip all non-digit characters
    const normalizedMobile = mobile.replace(/\D/g, '');

    setLoading(true);
    try {
      const response = await AuthAPI.verifyOtp({ mobile: normalizedMobile, otp });
      const { token, user, isNewUser, registrationToken } = response.data.data;

      if (isNewUser) {
        // User doesn't exist - redirect to signup with mobile number pre-filled
        toast.info("Account not found. Redirecting to sign up...");
        navigate(`/signup?mobile=${encodeURIComponent(normalizedMobile)}`);
        return;
      } else {
        // Check if user is admin - block admin login
        if (user.role === 'Admin') {
          toast.error('Access denied. Admins cannot log in to this portal.');
          setLoading(false);
          return;
        }

        // Login success for Consultant/Client
        dispatch(loginSuccess({ token, user }));
        navigate("/dashboard");
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || "Failed to verify OTP";

      if (errorMessage.includes("pending approval")) {
        navigate('/account-status?status=pending');
        return;
      } else if (errorMessage.includes("application has been rejected")) {
        navigate('/account-status?status=rejected');
        return;
      } else if (errorMessage.includes("has been blocked")) {
        navigate('/account-status?status=blocked');
        return;
      }

      toast.error(errorMessage);
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
            AIOB
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {loginMode === 'password'
              ? 'Login with email/mobile and password'
              : step === 'mobile'
                ? 'Enter your mobile number to login'
                : 'Enter the OTP sent to your mobile'}
          </p>
        </div>

        {/* Login Mode Toggle */}
        <div className="flex gap-2 mb-5 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => {
              setLoginMode('password');
              setStep('mobile');
              setLoginId("");
              setPassword("");
              setMobile("");
              setOtp("");
            }}
            className={`flex-1 py-2 rounded-md text-sm font-medium transition ${loginMode === 'password'
              ? 'bg-white text-[#2E7FC4] shadow-sm'
              : 'text-gray-600 hover:text-gray-800'
              }`}
          >
            Password
          </button>
          <button
            onClick={() => {
              setLoginMode('otp');
              setStep('mobile');
              setLoginId("");
              setPassword("");
            }}
            className={`flex-1 py-2 rounded-md text-sm font-medium transition ${loginMode === 'otp'
              ? 'bg-white text-[#2E7FC4] shadow-sm'
              : 'text-gray-600 hover:text-gray-800'
              }`}
          >
            OTP
          </button>
        </div>

        <div className="space-y-5">
          {loginMode === 'password' ? (
            <>
              <input
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#2E7FC4] text-gray-700 placeholder-gray-400"
                value={loginId}
                onChange={(e) => setLoginId(e.target.value)}
                placeholder="Email or Mobile Number"
                type="text"
              />
              <input
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#2E7FC4] text-gray-700 placeholder-gray-400"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                type="password"
              />
              <button
                onClick={handlePasswordLogin}
                disabled={loading}
                className="w-full py-3 bg-[#2E7FC4] hover:bg-[#2567a5] text-white rounded-xl font-semibold shadow-md transition disabled:opacity-50"
              >
                {loading ? "Logging in..." : "Login"}
              </button>
            </>
          ) : step === 'mobile' ? (
            <>
              <div className="flex items-center gap-2">
                <span className="px-3 py-3 bg-gray-100 border border-gray-300 rounded-l-xl text-gray-700 font-medium">+91</span>
                <input
                  className="flex-1 px-4 py-3 rounded-r-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#2E7FC4] text-gray-700 placeholder-gray-400"
                  value={mobile}
                  onChange={(e) => {
                    // Only allow digits
                    const value = e.target.value.replace(/\D/g, '');
                    setMobile(value);
                  }}
                  placeholder="Mobile Number"
                  type="tel"
                  maxLength={10}
                />
              </div>
              <button
                onClick={handleSendOtp}
                disabled={loading}
                className="w-full py-3 bg-[#2E7FC4] hover:bg-[#2567a5] text-white rounded-xl font-semibold shadow-md transition disabled:opacity-50"
              >
                {loading ? "Sending OTP..." : "Send OTP"}
              </button>
            </>
          ) : (
            <>
              <div className="flex justify-between items-center mb-2 bg-gray-50 p-3 rounded-xl border border-gray-100">
                <div className="flex flex-col">
                  <span className="text-xs text-gray-500 font-medium">
                    Mobile Number
                  </span>
                  <span className="text-sm font-bold text-gray-700">
                    +91 {mobile}
                  </span>
                </div>
                <button
                  onClick={() => {
                    setStep('mobile');
                    setOtp("");
                    setTimer(30);
                  }}
                  className="text-[#2E7FC4] hover:bg-blue-50 p-2 rounded-full transition"
                  title="Change Number"
                >
                  <Edit2 size={16} />
                </button>
              </div>

              <input
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#2E7FC4] text-gray-700 placeholder-gray-400 text-center tracking-widest text-xl"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="000000"
                type="text"
                maxLength={6}
              />
              <button
                onClick={handleVerifyOtp}
                disabled={loading}
                className="w-full py-3 bg-[#2E7FC4] hover:bg-[#2567a5] text-white rounded-xl font-semibold shadow-md transition disabled:opacity-50"
              >
                {loading ? "Verifying..." : "Verify OTP"}
              </button>

              <div className="text-center mt-4">
                {timer > 0 ? (
                  <p className="text-sm text-gray-500">
                    Resend OTP in <span className="font-bold text-[#2E7FC4]">{timer}s</span>
                  </p>
                ) : (
                  <button
                    onClick={handleSendOtp}
                    disabled={loading}
                    className="text-sm text-[#2E7FC4] font-semibold hover:underline disabled:opacity-50"
                  >
                    Resend OTP
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        <div className="text-center text-sm text-gray-600 mt-6">
          Don't have an account?{" "}
          <Link
            to="/signup"
            className="text-[#2E7FC4] font-semibold hover:underline"
          >
            Sign Up
          </Link>
        </div>

        <div className="text-center text-sm text-gray-400 mt-4">
          © {new Date().getFullYear()} AIOB. All rights reserved.
        </div>
      </div>
    </div>
  );
};

export default Login;
