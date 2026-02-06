import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import AuthAPI from "@/api/auth.api";
import Logo from "@/assets/images/logo.png";
import { Eye, EyeOff } from "lucide-react";

const ResetPassword = () => {
    const { token } = useParams();
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const navigate = useNavigate();

    const handleResetPassword = async () => {
        if (!password || !confirmPassword) {
            toast.error("Please fill in all fields");
            return;
        }

        if (password !== confirmPassword) {
            toast.error("Passwords do not match");
            return;
        }

        if (password.length < 8) {
            toast.error("Password must be at least 8 characters long");
            return;
        }
        if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
            toast.error("Password must contain at least one uppercase letter, one lowercase letter, and one number");
            return;
        }

        setLoading(true);
        try {
            await AuthAPI.resetPassword(token as string, { password });
            toast.success("Password reset successfully! Please login with your new password.");
            navigate("/login");
        } catch (error: any) {
            console.error("Reset password error:", error);
            toast.error(error.response?.data?.message || "Failed to reset password");
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
                        Reset Password
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Create a new password for your account
                    </p>
                </div>

                <div className="space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            New Password
                        </label>
                        <div className="relative">
                            <input
                                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#2E7FC4] text-gray-700 placeholder-gray-400 pr-10"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="New Password"
                                type={showPassword ? "text" : "password"}
                            />
                            <button
                                type="button"
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Confirm New Password
                        </label>
                        <div className="relative">
                            <input
                                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#2E7FC4] text-gray-700 placeholder-gray-400 pr-10"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Confirm New Password"
                                type={showPassword ? "text" : "password"}
                            />
                        </div>
                    </div>

                    <button
                        onClick={handleResetPassword}
                        disabled={loading}
                        className="w-full py-3 bg-[#2E7FC4] hover:bg-[#2567a5] text-white rounded-xl font-semibold shadow-md transition disabled:opacity-50"
                    >
                        {loading ? "Resetting..." : "Reset Password"}
                    </button>
                </div>

                <div className="text-center text-sm text-gray-600 mt-6">
                    Back to{" "}
                    <Link
                        to="/login"
                        className="text-[#2E7FC4] font-semibold hover:underline"
                    >
                        Login
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default ResetPassword;
