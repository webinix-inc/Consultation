import React, { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { Pencil, Trash2, Check, Clipboard, Eye, EyeOff, Ban, CheckCircle } from "lucide-react";

import {
    Dialog,
    DialogDescription,
    DialogContent,
    DialogTrigger,
    DialogTitle,
    DialogFooter,
    DialogHeader,
} from "@/components/ui/dialog";
import { DialogClose } from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import UserAPI from "@/api/user.api";
import ClientAPI from "@/api/client.api";
import CategoryAPI from "@/api/category.api";
import SubcategoryAPI from "@/api/subcategory.api";
import { useQuery } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import ClientProfileView from "./ClientProfileView";

const getRoleClass = (role: string) => {
    switch (role) {
        case "Client":
            return "bg-green-100 text-green-600";
        default:
            return "bg-gray-100 text-gray-600";
    }
};

const ClientManagement = () => {
    const [userData, setUserData] = useState({
        fullName: "",
        email: "",
        phone: "",
        role: "Client", // Default to Client
        category: "",
        subcategory: ""
    });
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");
    const perPage = 6;


    const [updatingStatusUserId, setUpdatingStatusUserId] = useState<string | null>(null);

    const [copied, setCopied] = useState(false);
    const [viewedEmail, setViewedEmail] = useState<string | null>(null);
    const [selectedClient, setSelectedClient] = useState<any>(null);

    const queryClient = useQueryClient();
    const { user: currentUser } = useAuth();

    const isCurrentUser = (user: any) => {
        if (!currentUser) return false;
        return (
            user.email?.toLowerCase() === currentUser.email?.toLowerCase() ||
            user._id === currentUser.id ||
            user.id === currentUser.id
        );
    };

    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: ["clients"],
        queryFn: ClientAPI.getAllClients,
        retry: (failureCount, error: any) => {
            if (error?.response?.status === 401) return false;
            return failureCount < 2;
        },
        refetchOnWindowFocus: true,
    });

    const { mutate: updateUser, isPending: isUpdating } = useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) =>
            UserAPI.updateUser(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["clients"] });
            toast.success("Client updated successfully!");
        },
        onError: (error: any) => toast.error("Failed to update client"),
    });

    const handleBlockToggle = (user: any) => {
        const newStatus = user.verificationStatus === 'Blocked' ? 'Approved' : 'Blocked';
        updateUser({ id: user._id, data: { verificationStatus: newStatus } });
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setUserData({ ...userData, [e.target.name]: e.target.value });
    };

    const usersData = data?.clients || data?.data?.clients || [];

    const filteredData = usersData?.filter((user: any) => {
        const matchesSearch = [user.fullName, user.email, user.mobile].some(
            (field) => field?.toLowerCase().includes(search.toLowerCase())
        );
        return matchesSearch;
    });

    const paginatedData = (filteredData ?? []).slice((page - 1) * perPage, page * perPage);
    const totalPages = Math.ceil((filteredData?.length || 0) / perPage) || 1;

    return (
        <div className="w-full p-6 space-y-6">
            {selectedClient ? (
                <ClientProfileView
                    client={selectedClient}
                    onBack={() => setSelectedClient(null)}
                />
            ) : (
                <>
                    {isLoading && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                            <p className="text-sm text-blue-800">Loading clients...</p>
                        </div>
                    )}

                    {/* Header */}
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-4">
                            <h1 className="text-2xl font-semibold">Client Management</h1>
                            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
                                {isLoading ? "🔄 Loading..." : "🔄 Refresh"}
                            </Button>
                        </div>

                        {/* Edit Dialog */}

                    </div>

                    {/* Filters */}
                    <div className="flex flex-wrap gap-4 items-center bg-gray-200 p-4 rounded-lg">
                        <Input
                            placeholder="Search by name, email or ID"
                            className="w-full sm:w-64"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>

                    {/* Table */}
                    <div className="overflow-auto rounded-lg border border-gray-200">
                        <table className="min-w-full table-auto text-sm text-left">
                            <thead className="bg-gray-200">
                                <tr>
                                    <th className="p-3 font-medium">Full Name</th>
                                    <th className="p-3 font-medium">Email ID</th>
                                    <th className="p-3 font-medium">Mobile Number</th>
                                    <th className="p-3 font-medium">Role</th>
                                    <th className="p-3 font-medium">Created On</th>
                                    <th className="p-3 font-medium">Verification</th>
                                    <th className="p-3 font-medium text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {paginatedData.map((user: any) => (
                                    <tr key={user._id} className="hover:bg-gray-50">
                                        <td className="p-3 cursor-pointer text-black font-medium hover:underline" onClick={() => setSelectedClient(user)}>
                                            {user.fullName}
                                        </td>
                                        <td className="p-3 max-w-[150px] overflow-hidden text-ellipsis whitespace-nowrap">
                                            <span title={user.email} onClick={() => setViewedEmail(user.email)} className="cursor-pointer underline text-blue-600">
                                                {user.email?.slice(0, 20)}{user.email.length > 20 ? "..." : ""}
                                            </span>
                                        </td>
                                        <td className="p-3">{user.mobile}</td>
                                        <td className="p-3"><span className="px-2 py-1 rounded-xl text-xs font-medium bg-green-100 text-green-600">Client</span></td>
                                        <td className="p-3">{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "N/A"}</td>
                                        <td className="p-3">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${user.verificationStatus === 'Blocked' ? 'bg-red-100 text-red-700' :
                                                user.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                                                }`}>
                                                {user.status || 'NA'}
                                            </span>
                                        </td>

                                        <td className="p-3 flex gap-2 justify-center">

                                            <Button
                                                size="sm"
                                                variant={user.verificationStatus === 'Blocked' ? "outline" : "destructive"}
                                                onClick={() => handleBlockToggle(user)}
                                                className={`h-8 ${user.verificationStatus === 'Blocked' ? 'text-green-600 border-green-200' : ''}`}
                                            >
                                                {user.verificationStatus === 'Blocked' ? <CheckCircle size={14} /> : <Ban size={14} />}
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <Dialog open={!!viewedEmail} onOpenChange={() => setViewedEmail(null)}>
                            <DialogContent className="sm:max-w-md fixed top-1/2 left-1/2 -translate-x-1/4 -translate-y-1/4 w-full max-w-lg bg-white rounded-xl shadow-xl border border-gray-200 p-6 overflow-visible">
                                <DialogHeader><DialogTitle>Email Address</DialogTitle></DialogHeader>
                                <div className="bg-gray-100 p-3 rounded">{viewedEmail}</div>
                                <DialogFooter className="flex justify-between items-center pt-2">
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            if (viewedEmail) {
                                                navigator.clipboard.writeText(viewedEmail);
                                                setCopied(true);
                                                setTimeout(() => setCopied(false), 2000);
                                            }
                                        }}
                                        className="relative border-none"
                                    >
                                        {copied ? (
                                            <div className="flex items-center gap-2 text-green-600 font-semibold transition-all duration-300">
                                                <Check className="w-4 h-4" />
                                                Copied!
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                <Clipboard className="w-4 h-4" />
                                                Copy to Clipboard
                                            </div>
                                        )}
                                    </Button>
                                    <Button onClick={() => setViewedEmail(null)}>Close</Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>

                    <div className="flex justify-center gap-2">
                        <Button variant="outline" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
                        <span className="px-3 py-2 text-sm">Page {page} of {totalPages}</span>
                        <Button variant="outline" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
                    </div>
                </>
            )}
        </div>
    );
};

export default ClientManagement;
