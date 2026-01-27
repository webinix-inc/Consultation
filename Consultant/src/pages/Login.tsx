import { useEffect, useState } from "react";
import { Edit2 } from "lucide-react";
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
import { validatePhone, formatPhoneForBackend } from "@/utils/validationUtils";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useDispatch } from "react-redux";
import { loginSuccess } from "@/features/auth/authSlice";
import type { AppDispatch } from "@/app/store";
import AuthAPI from "@/api/auth.api";
import Logo from "@/assets/images/logo.png";

const Login = () => {
  const [activeTab, setActiveTab] = useState<'otp' | 'password'>('otp');
  const [step, setStep] = useState<'mobile' | 'otp'>('mobile');
  const [selectedCountry, setSelectedCountry] = useState('in');
  const [role, setRole] = useState<'Client' | 'Consultant'>('Client');

  // Mobile/OTP State
  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState("");
  const [timer, setTimer] = useState(30);

  // Email/Password State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);

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
    if (!mobile || !validatePhone(mobile)) {
      toast.error("Please enter a valid mobile number");
      return;
    }

    const normalizedMobile = formatPhoneForBackend(mobile, selectedCountry);

    setLoading(true);
    try {
      const response = await AuthAPI.sendOtp({ mobile: normalizedMobile });
      const { otp } = response.data.data;

      // console.log("📱 OTP:", otp); 
      const message = `OTP sent successfully. Code: ${otp}`;
      toast.success(message);

      setStep('otp');
      setTimer(30); // Reset timer on successful send
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp || otp.length !== 6) {
      toast.error("Please enter a valid 6-digit OTP");
      return;
    }

    const normalizedMobile = formatPhoneForBackend(mobile, selectedCountry);

    setLoading(true);
    try {
      const response = await AuthAPI.verifyOtp({ mobile: normalizedMobile, otp, role });
      const { token, user, isNewUser, registrationToken } = response.data.data;

      if (isNewUser) {
        // User doesn't exist - redirect to signup with mobile number pre-filled
        toast.info("Account not found. Redirecting to sign up...");
        // Pass the raw mobile (with country code) to signup so it can pre-fill correctly
        navigate(`/signup?mobile=${encodeURIComponent(mobile)}`);
        return;
      } else {
        handleLoginSuccess(token, user);
      }
    } catch (error: any) {
      handleLoginError(error);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordLogin = async () => {
    if (!email || !password) {
      toast.error("Please enter email and password");
      return;
    }

    setLoading(true);
    try {
      const response = await AuthAPI.login({ email, password, role });
      const { token, user } = response.data.data;
      handleLoginSuccess(token, user);
    } catch (error: any) {
      handleLoginError(error);
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSuccess = (token: string, user: any) => {
    // Check if user is admin - block admin login
    if (user.role === 'Admin') {
      toast.error('Access denied. Admins cannot log in to this portal.');
      return;
    }

    // Login success for Consultant/Client
    dispatch(loginSuccess({ token, user }));
    toast.success("Login successful!");
    navigate("/dashboard");
  };

  const handleLoginError = (error: any) => {
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

    toast.error(errorMessage);
  };

  return (
    <div className="min-h-screen bg-gradient-to-tr from-[#e6f0fa] via-white to-[#d8ecfc] flex items-center justify-center px-4">
      <div className="bg-white shadow-xl border border-blue-100 rounded-3xl px-8 py-10 w-full max-w-md">
        <div className="flex flex-col items-center mb-6">
          <img
            src={Logo}
            alt="Company Logo"
            className="h-16 w-16 object-contain mb-2"
          />
          <h1 className="text-2xl font-bold text-[#007ACC] tracking-wide">
            AIOB
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Welcome back! Please login to continue.
          </p>
        </div>

        {/* Role Toggle */}
        <div className="flex gap-2 mb-6 bg-gray-100 p-1 rounded-xl">
          <button
            onClick={() => setRole('Client')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${role === 'Client' ? 'bg-white shadow text-[#007ACC]' : 'text-gray-500 hover:text-gray-700'
              }`}
          >
            I am a Client
          </button>
          <button
            onClick={() => setRole('Consultant')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${role === 'Consultant' ? 'bg-white shadow text-[#007ACC]' : 'text-gray-500 hover:text-gray-700'
              }`}
          >
            I am a Consultant
          </button>
        </div>

        {/* Login Method Tabs */}
        <div className="flex gap-2 mb-6 bg-gray-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('otp')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${activeTab === 'otp' ? 'bg-white shadow text-[#007ACC]' : 'text-gray-500 hover:text-gray-700'
              }`}
          >
            Login via OTP
          </button>
          <button
            onClick={() => setActiveTab('password')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${activeTab === 'password' ? 'bg-white shadow text-[#007ACC]' : 'text-gray-500 hover:text-gray-700'
              }`}
          >
            Login via Password
          </button>
        </div>

        <div className="space-y-5">
          {activeTab === 'otp' ? (
            // OTP Login Form
            step === 'mobile' ? (
              <>
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
                      +{mobile}
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
            )
          ) : (
            // Password Login Form
            <>
              <div>
                <input
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#2E7FC4] text-gray-700 placeholder-gray-400"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email Address"
                  type="email"
                />
              </div>
              <div className="relative">
                <input
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#2E7FC4] text-gray-700 placeholder-gray-400 pr-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  type={showPassword ? "text" : "password"}
                  onKeyDown={(e) => e.key === 'Enter' && handlePasswordLogin()}
                />
              </div>

              <div className="flex justify-end">
                <Link to="/forgot-password" className="text-xs text-[#2E7FC4] font-semibold hover:underline">
                  Forgot Password?
                </Link>
              </div>

              <button
                onClick={handlePasswordLogin}
                disabled={loading}
                className="w-full py-3 bg-[#2E7FC4] hover:bg-[#2567a5] text-white rounded-xl font-semibold shadow-md transition disabled:opacity-50"
              >
                {loading ? "Logging in..." : "Login"}
              </button>
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
    </div >
  );
};

export default Login;
