import React, { useEffect, useState } from "react";
import axios from "axios";
import { Loader2 } from "lucide-react";

// Use the public axios instance or standard axios if not authenticated
// Assuming we can access the backend URL from env
const API_URL = import.meta.env.VITE_BACKEND_URL
    ? `${import.meta.env.VITE_BACKEND_URL}/api/v1`
    : (import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1");

const TermsOfService = () => {
    const [content, setContent] = useState<string>("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchTerms = async () => {
            try {
                const response = await axios.get(`${API_URL}/admin-settings/public`);
                const terms = response.data?.data?.security?.termsAndConditions;

                if (terms) {
                    setContent(terms);
                } else {
                    setError("Terms and Conditions have not been published yet.");
                }
            } catch (err) {
                console.error("Failed to fetch Terms:", err);
                setError("Failed to load Terms of Service.");
            } finally {
                setLoading(false);
            }
        };

        fetchTerms();
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-gray-800 mb-2">Terms of Service</h1>
                    <p className="text-gray-500">{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-sm border p-8 sm:p-12">
                {/* Render HTML content safely */}
                <div
                    className="prose prose-blue max-w-none prose-headings:font-bold prose-headings:text-gray-900 prose-p:text-gray-600"
                    dangerouslySetInnerHTML={{ __html: content }}
                />
            </div>
        </div>
    );
};

export default TermsOfService;
