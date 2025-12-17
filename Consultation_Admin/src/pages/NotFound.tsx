import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Ghost, ArrowLeft } from "lucide-react";
import { ShieldAlert } from "lucide-react";
import { Compass } from "lucide-react";
import { FileWarning } from "lucide-react";
import { Ban } from "lucide-react";



const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-gradient-to-tr from-[#e0f2fe] via-white to-[#dbeafe] flex items-center justify-center px-4">
      <div className="backdrop-blur-lg bg-white/80 border border-blue-100 shadow-2xl rounded-3xl max-w-lg w-full px-10 py-14 text-center">
        {/* <div className="text-6xl mb-4">🚀</div> */}
        <div className="flex justify-center mb-6">
          <div className="bg-white p-5 rounded-full shadow-lg border border-blue-200">
            <Ban className="h-12 w-12 text-red-500" />
          </div>
        </div>
        <h1 className="text-4xl font-bold text-[#2563eb] mb-4">404 - Page Not Found</h1>
        <p className="text-lg text-gray-700 mb-2">
          Oops! The page you're looking for doesn't exist.
        </p>
        <p className="text-sm text-gray-500 mb-6">
          You tried to access:{" "}
          <span className="font-mono text-blue-600">{location.pathname}</span>
        </p>

        <Link
          to="/"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-blue-600 via-blue-500 to-blue-400 text-white font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 ease-in-out"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 19l-7-7 7-7M3 12h18"
            />
          </svg>
          Back to Home
        </Link>

        <p className="text-xs text-gray-400 mt-8">
          © {new Date().getFullYear()} Solvior. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default NotFound;
