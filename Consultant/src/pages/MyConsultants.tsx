import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import ClientConsultantAPI from "@/api/clientConsultant.api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Mail, Phone, MapPin, Briefcase, Video } from "lucide-react";
import { Button } from "@/components/ui/button";

const MyConsultants = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [showLive, setShowLive] = useState(false);
    const userId = user?.id || (user as any)?._id;

    const { data: consultantsData, isLoading, isError } = useQuery({
        queryKey: ["my-consultants", userId, showLive],
        queryFn: () => {
            if (!userId) return Promise.resolve({ data: [] });
            return ClientConsultantAPI.getClientConsultants(userId, 1, 50, showLive);
        },
        enabled: !!userId,
    });

    const consultants = Array.isArray(consultantsData) ? consultantsData : (consultantsData as any)?.data || [];

    if (isLoading) {
        return <div className="p-6">Loading consultants...</div>;
    }

    if (isError) {
        return <div className="p-6 text-red-500">Failed to load consultants.</div>;
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">My Consultants</h1>
                    <p className="text-muted-foreground">
                        View and manage your connected consultants
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant={!showLive ? "default" : "outline"}
                        onClick={() => setShowLive(false)}
                        className={!showLive ? "bg-blue-600 hover:bg-blue-700" : ""}
                    >
                        <Briefcase className="mr-2 h-4 w-4" />
                        My Consultants
                    </Button>
                    <Button
                        variant={showLive ? "default" : "outline"}
                        onClick={() => setShowLive(true)}
                        className={showLive ? "bg-green-600 hover:bg-green-700" : ""}
                    >
                        <Video className="mr-2 h-4 w-4" />
                        Live Consultants
                    </Button>
                </div>
            </div>

            {consultants.length === 0 ? (
                <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-10 text-center">
                        <div className="rounded-full bg-blue-50 p-3 mb-4">
                            <Briefcase className="h-6 w-6 text-blue-500" />
                        </div>
                        <h3 className="text-lg font-semibold">No consultants found</h3>
                        <p className="text-sm text-muted-foreground max-w-sm mt-1 mb-4">
                            You haven't been linked to any consultants yet.
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {consultants.map((consultant: any) => (
                        <Card key={consultant._id || consultant.id} className="overflow-hidden hover:shadow-lg transition-all duration-300 border-t-4 border-t-blue-500">
                            <CardHeader className="pb-3 flex flex-row items-start gap-4 space-y-0 bg-slate-50/50">
                                <Avatar className="h-16 w-16 border-2 border-white shadow-md ring-2 ring-blue-100">
                                    <AvatarImage src={consultant.image || consultant.avatar} className="object-cover" />
                                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-xl font-bold">
                                        {(consultant.fullName || consultant.name || "C").charAt(0).toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0 pt-1">
                                    <div className="flex justify-between items-start">
                                        <CardTitle className="text-lg font-bold truncate text-slate-900">
                                            {consultant.fullName || consultant.name}
                                        </CardTitle>
                                        {consultant.ratingSummary?.average > 0 && (
                                            <Badge variant="secondary" className="bg-amber-100 text-amber-800 hover:bg-amber-100 border-amber-200">
                                                ★ {consultant.ratingSummary.average.toFixed(1)}
                                            </Badge>
                                        )}
                                    </div>
                                    <p className="text-sm font-medium text-blue-600 truncate mt-0.5">
                                        {consultant.bioTitle || consultant.category?.title || "Consultant"}
                                    </p>
                                    <p className="text-xs text-muted-foreground truncate mt-1">
                                        {consultant.yearsOfExperience ? `${consultant.yearsOfExperience} Years Exp.` : "Experienced"}
                                    </p>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4 pt-4 text-sm">
                                {consultant.about && (
                                    <p className="text-muted-foreground line-clamp-2 text-xs leading-relaxed">
                                        {consultant.about}
                                    </p>
                                )}

                                <div className="grid grid-cols-2 gap-3 py-2 border-y border-slate-100">
                                    <div className="flex flex-col">
                                        <span className="text-xs text-muted-foreground">Consultation Fee</span>
                                        <span className="font-semibold text-slate-900">
                                            {`₹${(consultant.fees || 0).toLocaleString()}`}
                                        </span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-xs text-muted-foreground">Category</span>
                                        <span className="font-medium text-slate-900 truncate">
                                            {consultant.category || "N/A"}
                                        </span>
                                        {consultant.subcategory && (
                                            <span className="text-[10px] text-muted-foreground truncate">
                                                {consultant.subcategory}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <Mail className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                                        <span className="truncate text-xs">{consultant.email}</span>
                                    </div>
                                    {consultant.mobile && (
                                        <div className="flex items-center gap-2 text-muted-foreground">
                                            <Phone className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                                            <span className="text-xs">{consultant.mobile}</span>
                                        </div>
                                    )}
                                    {(consultant.city || consultant.state) && (
                                        <div className="flex items-center gap-2 text-muted-foreground">
                                            <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                                            <span className="text-xs">
                                                {[consultant.city, consultant.state].filter(Boolean).join(", ")}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                <div className="pt-2 flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="w-full bg-blue-600 hover:bg-blue-700 shadow-sm text-white hover:text-white"
                                        onClick={() => navigate(`/consultant/${consultant._id || consultant.id}`)}
                                    >
                                        View Profile
                                    </Button>

                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
};

export default MyConsultants;
