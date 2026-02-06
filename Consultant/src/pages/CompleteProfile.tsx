import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useDispatch } from "react-redux";
import { loginSuccess } from "@/features/auth/authSlice";
import type { AppDispatch } from "@/app/store";
import AuthAPI from "@/api/auth.api";
import CategoryAPI from "@/api/category.api";
import Logo from "@/assets/images/logo.png";
import { Plus, Trash2 } from "lucide-react";

type CategoryItem = { categoryId: string; categoryName: string; subcategoryId: string; subcategoryName: string };

const CompleteProfile = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const dispatch = useDispatch<AppDispatch>();

    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [role, setRole] = useState<'Consultant' | 'Client'>('Client');
    const [loading, setLoading] = useState(false);

    const [categories, setCategories] = useState<any[]>([]);
    const [selectedCategories, setSelectedCategories] = useState<CategoryItem[]>([{ categoryId: "", categoryName: "", subcategoryId: "", subcategoryName: "" }]);
    const [loadingCategories, setLoadingCategories] = useState(false);

    const { registrationToken, mobile } = location.state || {};

    useEffect(() => {
        if (!registrationToken || !mobile) {
            toast.error("Invalid session. Please login again.");
            navigate("/login");
        }
    }, [registrationToken, mobile, navigate]);

    useEffect(() => {
        if (role === 'Consultant') {
            fetchCategories();
        } else {
            setSelectedCategories([{ categoryId: "", categoryName: "", subcategoryId: "", subcategoryName: "" }]);
        }
    }, [role]);

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

    const getSubcategoriesForCategory = (categoryId: string) => {
        const cat = categories.find(c => c._id === categoryId);
        return cat?.subcategories || [];
    };

    const addCategoryRow = () => {
        setSelectedCategories(prev => [...prev, { categoryId: "", categoryName: "", subcategoryId: "", subcategoryName: "" }]);
    };

    const removeCategoryRow = (index: number) => {
        if (selectedCategories.length <= 1) return;
        setSelectedCategories(prev => prev.filter((_, i) => i !== index));
    };

    const updateCategoryRow = (index: number, field: keyof CategoryItem, value: string) => {
        setSelectedCategories(prev => {
            const next = [...prev];
            next[index] = { ...next[index], [field]: value };
            if (field === "categoryId") {
                const cat = categories.find(c => c._id === value);
                next[index].categoryName = cat?.title || "";
                next[index].subcategoryId = "";
                next[index].subcategoryName = "";
            } else if (field === "subcategoryId") {
                const cat = categories.find(c => c._id === next[index].categoryId);
                const sub = cat?.subcategories?.find((s: any) => s._id === value);
                next[index].subcategoryName = sub?.name || sub?.title || "";
            }
            return next;
        });
    };

    const handleRegister = async () => {
        if (!fullName || !email || !role) {
            toast.error("Please fill in all fields");
            return;
        }

        const valid = selectedCategories.filter(c => c.categoryId && c.subcategoryId);
        if (role === 'Consultant' && valid.length === 0) {
            toast.error("Please select at least one category and subcategory");
            return;
        }

        setLoading(true);
        try {
            const payload: any = {
                registrationToken,
                fullName,
                email,
                role,
            };
            if (role === 'Consultant' && valid.length > 0) {
                payload.categories = valid.map(c => ({
                    categoryId: c.categoryId,
                    categoryName: c.categoryName,
                    subcategoryId: c.subcategoryId,
                    subcategoryName: c.subcategoryName,
                }));
                payload.category = valid[0].categoryId;
                payload.subcategory = valid[0].subcategoryId;
            }
            const response = await AuthAPI.register(payload);

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

                    {/* Multiple categories for Consultants */}
                    {role === 'Consultant' && (
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
                                            disabled={loadingCategories}
                                        >
                                            <option value="">Category</option>
                                            {categories.map((cat) => (
                                                <option key={cat._id} value={cat._id}>{cat.title}</option>
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
                                                <option key={sub._id} value={sub._id}>{sub.name || sub.title}</option>
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
