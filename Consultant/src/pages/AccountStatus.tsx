import React from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Clock, Ban, ArrowLeft } from 'lucide-react';

const AccountStatus = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const status = searchParams.get('status');

    const getStatusContent = () => {
        switch (status) {
            case 'pending':
                return {
                    icon: <Clock className="w-16 h-16 text-yellow-500" />,
                    title: 'Application Under Review',
                    message: 'Your consultant account is currently pending approval. Our administrative team is reviewing your application details. You will be notified once your account is activated.',
                    color: 'text-yellow-600'
                };
            case 'rejected':
                return {
                    icon: <Ban className="w-16 h-16 text-red-500" />,
                    title: 'Application Rejected',
                    message: 'After careful review, we regret to inform you that your application has been rejected at this time. If you believe this is an error or would like to appeal, please contact support.',
                    color: 'text-red-600'
                };
            case 'blocked':
                return {
                    icon: <Ban className="w-16 h-16 text-red-600" />,
                    title: 'Account Blocked',
                    message: 'Your account has been blocked by the administrator due to policy violations or security concerns. You cannot log in at this time. Please contact support for assistance.',
                    color: 'text-red-700'
                };
            default:
                return {
                    icon: <Clock className="w-16 h-16 text-gray-500" />,
                    title: 'Account Status',
                    message: 'Please contact support for more information about your account status.',
                    color: 'text-gray-600'
                };
        }
    };

    const content = getStatusContent();

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                    AIOB
                </h2>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 text-center">
                    <div className="flex justify-center mb-6">
                        <div className={`p-3 rounded-full bg-opacity-10 ${content.color.replace('text', 'bg')}`}>
                            {content.icon}
                        </div>
                    </div>

                    <h3 className={`text-xl font-bold mb-4 ${content.color}`}>
                        {content.title}
                    </h3>

                    <p className="text-gray-600 mb-8 leading-relaxed">
                        {content.message}
                    </p>

                    <button
                        onClick={() => navigate('/login')}
                        className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-gray-700 bg-gray-100 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 w-full transition-colors duration-200"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to Login
                    </button>
                </div>

                <div className="mt-6 text-center">
                    <p className="text-xs text-gray-500">
                        Need help? <a href="#" className="font-medium text-indigo-600 hover:text-indigo-500">Contact Support</a>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default AccountStatus;
