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
import { Pencil, Trash2, Check, Clipboard, Ban, CheckCircle, Upload } from "lucide-react";
import UploadAPI from "@/api/upload.api";
import { PhoneDisplay } from "@/components/ui/PhoneDisplay";

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

import { useQuery } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";



const getRoleClass = (role: string) => {
  switch (role) {
    case "Admin":
      return "bg-red-100 text-red-600";
    case "Employee":
      return "bg-purple-100 text-purple-600";
    case "Consultant":
      return "bg-blue-100 text-blue-600";
    case "Client":
      return "bg-green-100 text-green-600";
    default:
      return "bg-gray-100 text-gray-600";
  }
};



const UserManagement = () => {
  const [userData, setUserData] = useState({
    fullName: "",
    email: "",
    phone: "",
    role: "",
    profileImage: "",
  });
  const [isUploading, setIsUploading] = useState(false);
  const [page, setPage] = useState(1);
  const [roleFilter, setRoleFilter] = useState("All");
  const [search, setSearch] = useState("");
  const perPage = 6;

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // Reset form when Add User dialog opens
  useEffect(() => {
    if (isDialogOpen) {
      setUserData({
        fullName: "",
        email: "",
        phone: "",
        role: "",
        profileImage: "",
      });
    }
  }, [isDialogOpen]);
  const [userToDelete, setUserToDelete] = useState<any>(null);
  const [userToEdit, setUserToEdit] = useState<any>(null);

  const [copied, setCopied] = useState(false);

  const [viewedEmail, setViewedEmail] = useState<string | null>(null);

  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();

  // Check if a user is the currently logged-in user
  const isCurrentUser = (user: any) => {
    if (!currentUser) return false;
    // Compare by email (most reliable) or by id
    return (
      user.email?.toLowerCase() === currentUser.email?.toLowerCase() ||
      user._id === currentUser.id ||
      user.id === currentUser.id
    );
  };

  // Function to generate userId
  const generateUserId = () => {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `user${timestamp}${random}`;
  };

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["users"],
    queryFn: () => UserAPI.getAllUsers(),
    retry: (failureCount, error: any) => {
      // Don't retry if it's an authentication error (401)
      if (error?.response?.status === 401) {
        console.log("🔐 Authentication required for user API");
        return false;
      }
      // Retry up to 2 times for network errors
      return failureCount < 2;
    },
    retryDelay: 3000, // Wait 3 seconds before retry
    staleTime: 5 * 60 * 1000, // Data is fresh for 5 minutes
    refetchOnWindowFocus: true, // Refetch when window gains focus
    refetchOnMount: true, // Always refetch when component mounts
  });

  // Fetch categories


  const { mutate: createUser, isPending: isCreatingUser } = useMutation({
    mutationFn: UserAPI.createUser,
    onSuccess: () => {
      // e.g., invalidate "users" query to refetch updated list
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("User created successfully!");

      // Reset form
      setUserData({
        fullName: "",
        email: "",
        phone: "",
        role: "",
        profileImage: "",
      });

      // Close dialog
      setIsDialogOpen(false);
    },
    onError: (error: any) => {
      const statusCode = error?.response?.status;
      let errorMessage = "Failed to create user";

      if (statusCode === 401) {
        toast.error(
          "Authentication failed. Backend API requires proper authentication."
        );
      } else if (statusCode === 403) {
        toast.error("Access denied. Admin privileges required.");
      } else if (statusCode === 400) {
        // Handle validation errors with specific messages
        const errors = error.response?.data?.errors;
        const message =
          error.response?.data?.message || "Invalid user data provided.";

        // Handle field-level errors (Joi array format)
        if (Array.isArray(errors)) {
          errors.forEach((err: { field: string; message: string }) => {
            toast.error(err.message);
          });
        } else {
          // Show fallback error message
          toast.error(message);
        }
      } else if (statusCode === 409) {
        toast.error(
          error?.response?.data?.message ||
          "User already exists with this email or ID."
        );
      } else if (error?.code === "ERR_NETWORK") {
        toast.error("Cannot connect to backend server.");
      }
      console.log(
        "Create User Error:",
        statusCode,
        error?.message,
        error?.response?.data
      );
    },
  });

  // Update User
  const { mutate: updateUser, isPending: isUpdating } = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      UserAPI.updateUser(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("User updated successfully!");
      setUserToEdit(null);
      setIsEditDialogOpen(false);
    },
    onError: (error: any) => {
      const statusCode = error?.response?.status;
      let errorMessage = "Failed to update user";

      if (statusCode === 401) {
        toast.error(
          "Authentication failed. Backend API requires proper authentication.");
      } else if (statusCode === 403) {
        toast.error("Access denied. Admin privileges required.");
      } else if (statusCode === 400) {
        const errors = error.response?.data?.errors;
        const message =
          error?.response?.data?.message;

        if (Array.isArray(errors)) {
          // Show all Joi validation errors
          errors.forEach((err: { field: string; message: string }) => {
            toast.error(err.message);
          });
        } else {
          // Backend general error
          toast.error(message);
        }
        // Set a usable error message for UI/logging

      } else if (error?.code === "ERR_NETWORK") {
        toast.error("Cannot connect to backend server.");
      } else {
        toast.error(errorMessage);
      }
    },
  });

  // Delete User
  const { mutate: deleteUser, isPending: isDeleting } = useMutation({
    mutationFn: UserAPI.deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("User deleted successfully!");
      setUserToDelete(null);
    },
    onError: (error: any) => {
      const statusCode = error?.response?.status;
      let errorMessage = "Failed to delete user";

      if (statusCode === 401) {
        toast.error(
          "Authentication failed. Backend API requires proper authentication.");
      } else if (statusCode === 403) {
        toast.error("Access denied. Admin privileges required.");
      } else if (statusCode === 404) {
        toast.error("User not found or already deleted.");
      } else if (error?.code === "ERR_NETWORK") {
        toast.error("Cannot connect to backend server.");
      }
      setUserToDelete(null);
    },
  });



  const handleBlockToggle = (user: any) => {
    if (isCurrentUser(user)) {
      toast.error("You cannot block your own account");
      return;
    }
    const newStatus = user.verificationStatus === 'Blocked' ? 'Approved' : 'Blocked';
    updateUser({ id: user._id, data: { verificationStatus: newStatus } });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUserData({ ...userData, [e.target.name]: e.target.value });
  };

  const handleRoleChange = (value: string) => {
    // Set default permissions based on role
    setUserData({
      ...userData,
      role: value,
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setIsUploading(true);
      try {
        const response = await UploadAPI.uploadImage(e.target.files[0]);
        setUserData({ ...userData, profileImage: response.data.url });
        toast.success("Image uploaded successfully");
      } catch (error) {
        toast.error("Failed to upload image");
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (
      !userData.fullName ||
      !userData.email ||
      !userData.phone ||
      !userData.role
    ) {
      toast.error("Please fill in all required fields");
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(userData.email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    // Phone validation
    const phoneRegex = /^\+?[\d\s-()]+$/;
    if (!phoneRegex.test(userData.phone)) {
      toast.error("Please enter a valid phone number");
      return;
    }

    // Prepare user data for API
    const userPayload: any = {
      userId: generateUserId(),
      fullName: userData.fullName,
      email: userData.email,
      mobile: userData.phone,
      role: userData.role,
      status: "Active",
      profileImage: userData.profileImage,
    };

    createUser(userPayload);
  };

  const handleCancel = () => {
    // Reset form
    setUserData({
      fullName: "",
      email: "",
      phone: "",
      role: "",
      profileImage: "",
    });

    // Close dialog
    setIsDialogOpen(false);
  };

  const handleEditUser = (user: any) => {
    setUserToEdit(user);
    setUserData({
      fullName: user.fullName,
      email: user.email,
      phone: user.mobile,
      role: user.role,
      profileImage: user.profileImage || "",
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (
      !userData.fullName ||
      !userData.email ||
      !userData.phone ||
      !userData.role
    ) {
      toast.error("Please fill in all required fields");

      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(userData.email)) {
      toast.error("Please enter a valid email address");

      return;
    }

    // Phone validation
    const phoneRegex = /^\+?[\d\s-()]+$/;
    if (!phoneRegex.test(userData.phone)) {
      toast.error("Please enter a valid phone number");

      return;
    }

    // Prepare user data for API
    const userPayload: any = {
      fullName: userData.fullName,
      email: userData.email,
      mobile: userData.phone,
      role: userData.role,
      profileImage: userData.profileImage,
    };


    updateUser({ id: userToEdit._id, data: userPayload });
  };

  const handleEditCancel = () => {
    setUserToEdit(null);
    setUserData({
      fullName: "",
      email: "",
      phone: "",
      role: "",
      profileImage: "",
    });
    setIsEditDialogOpen(false);
  };

  const handleDeleteUser = (user: any) => {
    // Prevent deleting the current user
    if (isCurrentUser(user)) {
      toast.error("You cannot delete your own account");
      return;
    }
    setUserToDelete(user);
  };

  const confirmDelete = () => {
    if (userToDelete) {
      // Double check before deleting
      if (isCurrentUser(userToDelete)) {
        toast.error("You cannot delete your own account");
        setUserToDelete(null);
        return;
      }
      deleteUser(userToDelete._id);
    }
  };


  const usersData = data?.data || [];

  const filteredData = usersData?.filter((user: any) => {
    // Only show Admin and Employee users
    if (user.role !== 'Admin' && user.role !== 'Employee') {
      return false;
    }

    const matchesSearch = [user.userId, user.fullName, user.email].some(
      (field) => field?.toLowerCase().includes(search.toLowerCase())
    );
    const matchesRole = roleFilter === "All" || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const totalPages = Math.max(
    1,
    Math.ceil((filteredData?.length || 0) / perPage)
  );
  const paginatedData = (filteredData ?? []).slice(
    (page - 1) * perPage,
    page * perPage
  );

  // Reset page to 1 if current page is greater than total pages
  useEffect(() => {
    if (page > totalPages) {
      setPage(1);
    }
  }, [totalPages, page]);

  useEffect(() => {
    if (data?.users && data.users.length > 0) {
      // Debug logging removed for production
      // console.log("First user structure:", data.users[0]);
      // console.log("Available fields:", Object.keys(data.users[0]));
    }
  }, [data]);

  // Temporarily disable loading screen to show form immediately
  // if (isLoading) return (
  //   <div className="flex items-center justify-center min-h-screen">
  //     <div className="text-center space-y-4">
  //       <div className="animate-spin h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
  //       <p className="text-gray-600">Loading users...</p>
  //     </div>
  //   </div>
  // );

  // Don't block the UI if API fails - show form with fallback data
  // if (isError) return (
  //   <div className="flex items-center justify-center min-h-screen">
  //     <div className="text-center space-y-4">
  //       <p className="text-red-600">Error loading users</p>
  //       <p className="text-gray-500">Please check if the backend server is running</p>
  //     </div>
  //   </div>
  // );

  return (
    <div className="w-full p-6 space-y-6">
      {/* Loading indicator */}
      {isLoading && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="animate-spin h-4 w-4 border-b-2 border-blue-600"></div>
            <p className="text-sm text-blue-800">
              Loading users from database...
            </p>
          </div>
        </div>
      )}

      {/* API Error Banner */}
      {isError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="text-red-600">❌</div>
            <div>
              <p className="text-sm text-red-800 font-medium">
                Failed to load users
              </p>
              <p className="text-xs text-red-600">
                Unable to connect to the database. Please check your connection
                and try again.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-semibold">User Management</h1>

          {/* API Status */}
          <div className="flex items-center gap-2">
            {!isError && data ? (
              <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full flex items-center gap-1">
                🟢 Database Connected ({usersData.length} users)
              </span>
            ) : (
              <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full flex items-center gap-1">
                🔴 Database Error
              </span>
            )}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
            className="text-xs"
          >
            {isLoading ? "🔄 Loading..." : "🔄 Refresh"}
          </Button>
        </div>
        {currentUser?.role === 'Admin' && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                Add New User
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] fixed top-1/2 left-1/2 -translate-x-1/4 -translate-y-1/4 w-full max-w-lg bg-white rounded-xl shadow-xl border border-gray-200 p-6 overflow-visible">
              <form onSubmit={handleSubmit}>
                <DialogTitle className="text-lg font-semibold mb-4">
                  Add New User
                </DialogTitle>

                {/* Profile Image Upload */}
                <div className="flex justify-center mb-6">
                  <div className="relative group">
                    <div className="w-24 h-24 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden">
                      {userData.profileImage ? (
                        <img
                          src={userData.profileImage}
                          alt="Profile"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="text-center p-2">
                          <Upload size={20} className="mx-auto text-gray-400 mb-1" />
                          <span className="text-[10px] text-gray-500">
                            Upload Photo
                          </span>
                        </div>
                      )}
                    </div>
                    <label className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-full cursor-pointer text-white text-xs font-medium">
                      {isUploading ? "..." : "Change"}
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={handleImageUpload}
                        disabled={isUploading}
                      />
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    name="fullName"
                    placeholder="Full Name"
                    value={userData.fullName}
                    onChange={handleChange}
                  />
                  <Input
                    name="email"
                    placeholder="Email ID"
                    value={userData.email}
                    onChange={handleChange}
                  />
                  <Input
                    name="phone"
                    placeholder="Mobile Number"
                    value={userData.phone}
                    onChange={handleChange}
                  />
                  <Select value={userData.role} onValueChange={handleRoleChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Admin">Admin</SelectItem>
                      <SelectItem value="Employee">Employee</SelectItem>
                    </SelectContent>
                  </Select>

                </div>
                <div className="flex justify-end gap-4 mt-6">
                  <Button type="button" variant="outline" onClick={handleCancel}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isCreatingUser}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {isCreatingUser ? "Adding User..." : "Add User"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}

        {/* Edit User Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[700px] max-h-[90vh] fixed top-1/2 left-1/2 -translate-x-1/4 -translate-y-1/4 w-full max-w-lg bg-white rounded-xl shadow-xl border border-gray-200 p-6 overflow-visible">
            <form onSubmit={handleUpdateSubmit}>
              <DialogTitle className="text-lg font-semibold mb-4">
                Edit User
              </DialogTitle>

              {/* Profile Image Upload */}
              <div className="flex justify-center mb-6">
                <div className="relative group">
                  <div className="w-24 h-24 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden">
                    {userData.profileImage ? (
                      <img
                        src={userData.profileImage}
                        alt="Profile"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-center p-2">
                        <Upload size={20} className="mx-auto text-gray-400 mb-1" />
                        <span className="text-[10px] text-gray-500">
                          Upload Photo
                        </span>
                      </div>
                    )}
                  </div>
                  <label className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-full cursor-pointer text-white text-xs font-medium">
                    {isUploading ? "..." : "Change"}
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={isUploading}
                    />
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  name="fullName"
                  placeholder="Full Name"
                  value={userData.fullName}
                  onChange={handleChange}
                />
                <Input
                  name="email"
                  placeholder="Email ID"
                  value={userData.email}
                  onChange={handleChange}
                />
                <Input
                  name="phone"
                  placeholder="Mobile Number"
                  value={userData.phone}
                  onChange={handleChange}
                />
                <Select value={userData.role} onValueChange={handleRoleChange} disabled>
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Admin">Admin</SelectItem>
                    <SelectItem value="Employee">Employee</SelectItem>
                  </SelectContent>
                </Select>

              </div>
              <div className="flex justify-end gap-4 mt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleEditCancel}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isUpdating}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {isUpdating ? "Updating User..." : "Update User"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center bg-gray-200 p-4 rounded-lg">
        <Input
          placeholder="Search by name, email or ID"
          className="w-full sm:w-64"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select value={roleFilter} onValueChange={(val) => setRoleFilter(val)}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All Roles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All Roles</SelectItem>
            <SelectItem value="Admin">Admin</SelectItem>
            <SelectItem value="Employee">Employee</SelectItem>
          </SelectContent>
        </Select>

      </div>

      {/* Table */}
      <div className="overflow-auto rounded-lg border border-gray-200">
        <table className="min-w-full table-auto text-sm text-left">
          <thead className="bg-gray-200">
            <tr>
              <th className="p-3 font-medium">Profile</th>
              <th className="p-3 font-medium">Full Name</th>
              <th className="p-3 font-medium">Email ID</th>
              <th className="p-3 font-medium">Mobile Number</th>
              <th className="p-3 font-medium">Role</th>
              <th className="p-3 font-medium">Created On</th>
              <th className="p-3 font-medium">Verification</th>
              <th className="p-3 font-medium pl-8">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {paginatedData.map((user: any) => (
              <tr
                key={user._id}
                className={`hover:bg-gray-50 ${isCurrentUser(user) ? "bg-blue-50/50" : ""}`}
              >

                <td className="p-3">
                  <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
                    {user.profileImage ? (
                      <img
                        src={user.profileImage}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 font-semibold bg-gray-100">
                        {user.fullName.charAt(0)}
                      </div>
                    )}
                  </div>
                </td>
                <td className="p-3">{user.fullName}</td>
                {/* <td className="p-3">{user.email}</td>
                 */}
                <td className="p-3 max-w-[150px] overflow-hidden text-ellipsis whitespace-nowrap">
                  <span
                    title={user.email}
                    onClick={() => setViewedEmail(user.email)}
                    className="cursor-pointer underline underline-offset-2 text-blue-600 hover:text-blue-800"
                  >
                    {user.email?.slice(0, 20)}
                    {user.email.length > 20 ? "..." : ""}
                  </span>
                </td>
                <td className="p-3">
                  <PhoneDisplay phone={user.mobile} label="" />
                </td>
                <td className="p-3">
                  <span
                    className={`px-2 py-1 rounded-xl text-xs font-medium ${getRoleClass(
                      user.role
                    )}`}
                  >
                    {user.role}
                  </span>
                </td>

                <td className="p-3">
                  {user.createdAt
                    ? new Date(user.createdAt).toLocaleDateString()
                    : "N/A"}
                </td>




                <td className="p-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${user.verificationStatus === 'Blocked'
                    ? 'bg-red-100 text-red-700'
                    : user.verificationStatus === 'Approved'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-yellow-100 text-yellow-700'
                    }`}>
                    {user.verificationStatus || 'Pending'}
                  </span>
                </td>

                <td className="p-3 flex gap-2">
                  {(user.role === 'Admin' || user.role === 'Employee') && currentUser?.role === 'Admin' ? (
                    <>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleEditUser(user)}
                        disabled={isCurrentUser(user)}
                        title={isCurrentUser(user) ? "Cannot edit your own account" : "Edit user"}
                      >
                        <Pencil className="w-4 h-4 text-blue-600" />
                      </Button>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleDeleteUser(user)}
                            disabled={isCurrentUser(user)}
                            title={isCurrentUser(user) ? "Cannot delete your own account" : "Delete user"}
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="fixed top-1/2 left-1/2 -translate-x-1/4 -translate-y-1/4 w-full max-w-lg bg-white rounded-xl shadow-xl border border-gray-200 p-6 overflow-visible">
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. This will permanently
                              delete the user{" "}
                              <strong>{userToDelete?.fullName}</strong> and remove
                              their data from our servers.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={confirmDelete}
                              className="bg-red-600 hover:bg-red-700 text-white"
                              disabled={isDeleting}
                            >
                              {isDeleting ? "Deleting..." : "Delete"}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </>
                  ) : (
                    <Button
                      size="sm"
                      variant={user.verificationStatus === 'Blocked' ? "outline" : "destructive"}
                      onClick={() => handleBlockToggle(user)}
                      disabled={isUpdating}
                      className={`flex items-center gap-1 h-8 ${user.verificationStatus === 'Blocked' ? 'text-green-600 border-green-200 hover:bg-green-50' : ''}`}
                      title={user.verificationStatus === 'Blocked' ? "Unblock user" : "Block user"}
                    >
                      {user.verificationStatus === 'Blocked' ? (
                        <>
                          <CheckCircle size={14} />
                          Unblock
                        </>
                      ) : (
                        <>
                          <Ban size={14} />
                          Block
                        </>
                      )}
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Dialog
          open={!!viewedEmail}
          onOpenChange={() => {
            setViewedEmail(null);
            setCopied(false); // reset animation state on dialog close
          }}
        >
          <DialogContent className="sm:max-w-md top-1/2 left-1/2 -translate-x-1/4 -translate-y-1/4">
            <DialogHeader>
              <DialogTitle>User Email</DialogTitle>
              <DialogDescription>
                This is the full email address.
              </DialogDescription>
            </DialogHeader>

            <div className="text-sm bg-gray-100 p-3 rounded font-mono break-all">
              {viewedEmail}
            </div>

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

      {/* Pagination */}
      <div className="flex justify-center gap-2">
        <Button
          variant="outline"
          disabled={page === 1}
          onClick={() => setPage((p) => p - 1)}
        >
          Previous
        </Button>
        <span className="px-3 py-2 text-sm">
          Page {page} of {totalPages}
        </span>
        <Button
          variant="outline"
          disabled={page === totalPages}
          onClick={() => setPage((p) => p + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
};

export default UserManagement;
