import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import AuthAPI from "@/api/auth.api";
import Logo from "@/assets/images/logo.png";
import { ArrowLeft } from "lucide-react";

const ForgotPassword = () => {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [emailSent, setEmailSent] = useState(false);
    const navigate = useNavigate();

    const handleForgotPassword = async () => {
        if (!email) {
            toast.error("Please enter your email address");
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            toast.error("Please enter a valid email address");
            return;
        }

        setLoading(true);
        try {
            await AuthAPI.forgotPassword({ email });
            setEmailSent(true);
            toast.success("Password reset link sent to your email");
        } catch (error: any) {
            console.error("Forgot password error:", error);
            toast.error(error.response?.data?.message || "Failed to send reset link");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-tr from-[#e6f0fa] via-white to-[#d8ecfc] flex items-center justify-center px-4">
            <div className="bg-white shadow-xl border border-blue-100 rounded-3xl px-8 py-10 w-full max-w-md relative">
                <button
                    onClick={() => navigate('/login')}
                    className="absolute top-6 left-6 text-gray-400 hover:text-gray-600 transition"
                >
                    <ArrowLeft size={24} />
                </button>

                <div className="flex flex-col items-center mb-8 mt-2">
                    <img
                        src={Logo}
                        alt="Company Logo"
                        className="h-16 w-16 object-contain mb-2"
                    />
                    <h1 className="text-2xl font-bold text-[#007ACC] tracking-wide">
                        Forgot Password
                    </h1>
                    <p className="text-sm text-gray-500 mt-1 text-center">
                        {emailSent
                            ? "Check your email for the reset link"
                            : "Enter your email to reset your password"}
                    </p>
                </div>

                {emailSent ? (
                    <div className="text-center space-y-6">
                        <div className="bg-green-50 text-green-700 p-4 rounded-xl border border-green-100">
                            <p className="font-medium">Email Sent!</p>
                            <p className="text-sm mt-1">We have sent a password reset link to <span className="font-bold">{email}</span>.</p>
                        </div>

                        <button
                            onClick={() => navigate("/login")}
                            className="w-full py-3 bg-[#2E7FC4] hover:bg-[#2567a5] text-white rounded-xl font-semibold shadow-md transition"
                        >
                            Back to Login
                        </button>

                        <button
                            onClick={() => setEmailSent(false)}
                            className="text-sm text-[#2E7FC4] font-medium hover:underline"
                        >
                            Resend Link
                        </button>
                    </div>
                ) : (
                    <div className="space-y-6">
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

                        <button
                            onClick={handleForgotPassword}
                            disabled={loading}
                            className="w-full py-3 bg-[#2E7FC4] hover:bg-[#2567a5] text-white rounded-xl font-semibold shadow-md transition disabled:opacity-50"
                        >
                            {loading ? "Sending Link..." : "Send Reset Link"}
                        </button>
                    </div>
                )}

                <div className="text-center text-sm text-gray-600 mt-8">
                    Remember your password?{" "}
                    <Link
                        to="/login"
                        className="text-[#2E7FC4] font-semibold hover:underline"
                    >
                        Login
                    </Link>
                </div>

                <div className="text-center text-sm text-gray-400 mt-4">
                    © {new Date().getFullYear()} AIOB. All rights reserved.
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;
