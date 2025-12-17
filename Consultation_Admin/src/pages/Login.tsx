import { useEffect, useState } from "react";
import { ArrowRight, Edit2 } from "lucide-react";
import Logo from "@/assets/images/logo.png";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useDispatch } from "react-redux";
import { loginSuccess } from "@/features/auth/authSlice";
import type { AppDispatch } from "@/app/store";
import AuthAPI from "@/api/auth.api";

const Login = () => {
  const [step, setStep] = useState(1); // 1: Mobile, 2: OTP
  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(30);

  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const dispatch = useDispatch<AppDispatch>();

  // ✅ Redirect logged in users away from login page
  useEffect(() => {
    if (isAuthenticated) {
      if (user.role !== 'Admin') {
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
    if (step === 2 && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [step, timer]);

  const handleSendOtp = async () => {
    if (!mobile || mobile.length !== 10) {
      toast.error("Please enter a valid 10-digit mobile number");
      return;
    }

    setLoading(true);
    try {
      const response = await AuthAPI.sendOtp({ mobile });
      const { otp } = response.data.data;

      toast.success(`OTP sent successfully. Code: ${otp}`);
      setStep(2);
      setTimer(30); // Reset timer on successful send
    } catch (error: any) {
      const message = error?.response?.data?.message || "Failed to send OTP";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp || otp.length !== 6) {
      toast.error("Please enter a valid 6-digit OTP");
      return;
    }

    setLoading(true);
    try {
      const response = await AuthAPI.verifyOtp({ mobile, otp, role: 'Admin' });
      const { token, user, isNewUser } = response.data.data;

      // Check if this is a new user (not registered yet)
      if (isNewUser) {
        toast.error('User not found. Please contact administrator to create your account.');
        setLoading(false);
        return;
      }

      // Check if user is admin
      if (user.role !== 'Admin') {
        toast.error('Access denied. Only administrators can log in to this portal.');
        setLoading(false);
        return;
      }

      console.log("Verify response:", user);

      // Dispatch to Redux
      dispatch(loginSuccess({ token, user }));

      // Force navigation
      window.location.href = "/dashboard";
    } catch (error: any) {
      const message = error?.response?.data?.message || "Invalid OTP";
      toast.error(message);
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
            {step === 1 ? "Admin Portal - Enter your mobile number" : "Enter the OTP sent to your mobile"}
          </p>
        </div>

        <div className="space-y-5">
          {step === 1 ? (
            <>
              <div className="relative">
                <span className="absolute left-4 top-1/2 transform -translate-y-1/4 text-gray-500 font-medium">
                  +91
                </span>
                <input
                  className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#2E7FC4] text-gray-700 placeholder-gray-400"
                  value={mobile}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "");
                    if (val.length <= 10) setMobile(val);
                  }}
                  placeholder="Mobile Number"
                  type="tel"
                />
              </div>
              <button
                onClick={handleSendOtp}
                disabled={loading || mobile.length !== 10}
                className="w-full py-3 bg-[#2E7FC4] hover:bg-[#2567a5] text-white rounded-xl font-semibold shadow-md transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? "Sending..." : "Send OTP"}
                {!loading && <ArrowRight size={18} />}
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
                    setStep(1);
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
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#2E7FC4] text-gray-700 placeholder-gray-400 text-center tracking-widest text-lg"
                value={otp}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "");
                  if (val.length <= 6) setOtp(val);
                }}
                placeholder="Enter 6-digit OTP"
                type="text"
                maxLength={6}
              />
              <button
                onClick={handleVerifyOtp}
                disabled={loading || otp.length !== 6}
                className="w-full py-3 bg-[#2E7FC4] hover:bg-[#2567a5] text-white rounded-xl font-semibold shadow-md transition disabled:opacity-50"
              >
                {loading ? "Verifying..." : "Verify & Login"}
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

        <div className="text-center text-sm text-gray-400 mt-6">
          © {new Date().getFullYear()} AIOB. All rights reserved.
        </div>
      </div>
    </div>
  );
};

export default Login;
