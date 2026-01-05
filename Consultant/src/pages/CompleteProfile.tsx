import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useDispatch } from "react-redux";
import { loginSuccess } from "@/features/auth/authSlice";
import type { AppDispatch } from "@/app/store";
import AuthAPI from "@/api/auth.api";
import CategoryAPI from "@/api/category.api";
import Logo from "@/assets/images/logo.png";
import ConsultantAPI from "@/api/consultant.api";

const CompleteProfile = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const dispatch = useDispatch<AppDispatch>();

    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [role, setRole] = useState<'Consultant' | 'Client'>('Client');
    const [category, setCategory] = useState("");
    const [subcategory, setSubcategory] = useState("");
    const [loading, setLoading] = useState(false);

    const [categories, setCategories] = useState<any[]>([]);
    const [subcategories, setSubcategories] = useState<any[]>([]);
    const [loadingCategories, setLoadingCategories] = useState(false);

    const { registrationToken, mobile } = location.state || {};

    useEffect(() => {
        if (!registrationToken || !mobile) {
            toast.error("Invalid session. Please login again.");
            navigate("/login");
        }
    }, [registrationToken, mobile, navigate]);

    // Fetch categories when role is Consultant
    useEffect(() => {
        if (role === 'Consultant') {
            fetchCategories();
        } else {
            setCategory("");
            setSubcategory("");
            setCategories([]);
            setSubcategories([]);
        }
    }, [role]);

    // Update subcategories when category changes
    useEffect(() => {
        if (category) {
            const selectedCategory = categories.find(cat => cat._id === category);
            setSubcategories(selectedCategory?.subcategories || []);
            setSubcategory(""); // Reset subcategory selection
        } else {
            setSubcategory("");
            setSubcategories([]);
        }
    }, [category, categories]);

    const fetchCategories = async () => {
        setLoadingCategories(true);
        try {
            const response = await CategoryAPI.getAll();
            setCategories(response.data || []);
        } catch (error: any) {
            toast.error("Failed to load categories");
            console.error(error);
        } finally {
            setLoadingCategories(false);
        }
    };

    const handleRegister = async () => {
        if (!fullName || !email || !role) {
            toast.error("Please fill in all fields");
            return;
        }

        if (role === 'Consultant' && (!category || !subcategory)) {
            toast.error("Please select category and subcategory");
            return;
        }

        setLoading(true);
        try {
            const response = await AuthAPI.register({
                registrationToken,
                fullName,
                email,
                role,
                category: role === 'Consultant' ? category : undefined,
                subcategory: role === 'Consultant' ? subcategory : undefined,
            });

            const { token, user } = response.data.data;

            dispatch(loginSuccess({ token, user }));
            toast.success("Registration successful!");
            navigate("/dashboard");
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Registration failed");
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
                        Complete Profile
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Please provide your details to continue
                    </p>
                </div>

                <div className="space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Number</label>
                        <input
                            className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-gray-50 text-gray-500 cursor-not-allowed"
                            value={mobile}
                            disabled
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                        <input
                            className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#2E7FC4] text-gray-700"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            placeholder="John Doe"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                        <input
                            className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#2E7FC4] text-gray-700"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="john@example.com"
                            type="email"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">I am a...</label>
                        <div className="grid grid-cols-2 gap-4">
                            <button
                                type="button"
                                onClick={() => {
                                    console.log("Selected Client");
                                    setRole('Client');
                                }}
                                className={`py-3 rounded-xl font-medium border-2 transition-all duration-200 focus:outline-none focus:ring-0 ${role === 'Client'
                                    ? 'bg-blue-50 border-[#2E7FC4] text-[#2E7FC4] shadow-sm'
                                    : 'bg-white border-gray-100 text-gray-500 hover:bg-gray-50 hover:border-gray-200'
                                    }`}
                            >
                                Client
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    console.log("Selected Consultant");
                                    setRole('Consultant');
                                }}
                                className={`py-3 rounded-xl font-medium border-2 transition-all duration-200 focus:outline-none focus:ring-0 ${role === 'Consultant'
                                    ? 'bg-blue-50 border-[#2E7FC4] text-[#2E7FC4] shadow-sm'
                                    : 'bg-white border-gray-100 text-gray-500 hover:bg-gray-50 hover:border-gray-200'
                                    }`}
                            >
                                Consultant
                            </button>
                        </div>
                    </div>

                    {/* Show Category and Subcategory only for Consultants */}
                    {role === 'Consultant' && (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                                <select
                                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#2E7FC4] text-gray-700"
                                    value={category}
                                    onChange={(e) => setCategory(e.target.value)}
                                    disabled={loadingCategories}
                                >
                                    <option value="">Select Category</option>
                                    {categories.map((cat) => (
                                        <option key={cat._id} value={cat._id}>
                                            {cat.title}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Subcategory</label>
                                <select
                                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#2E7FC4] text-gray-700"
                                    value={subcategory}
                                    onChange={(e) => setSubcategory(e.target.value)}
                                    disabled={!category}
                                >
                                    <option value="">Select Subcategory</option>
                                    {subcategories.map((subcat) => (
                                        <option key={subcat._id} value={subcat._id}>
                                            {subcat.name || subcat.title}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </>
                    )}

                    <button
                        onClick={handleRegister}
                        disabled={loading}
                        className="w-full py-3 bg-[#2E7FC4] hover:bg-[#2567a5] text-white rounded-xl font-semibold shadow-md transition disabled:opacity-50 mt-4"
                    >
                        {loading ? "Creating Account..." : "Complete Registration"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CompleteProfile;
