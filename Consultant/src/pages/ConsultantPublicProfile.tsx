import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import ConsultantAPI from "@/api/consultant.api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Mail, Phone, MapPin, Briefcase, Star, Clock, Globe, Linkedin, Twitter, Facebook, Instagram, ArrowLeft, Award, Users, CalendarCheck, ThumbsUp, Hash, User } from "lucide-react";
import { Separator } from "@/components/ui/separator";

const ConsultantPublicProfile = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const { data: consultantData, isLoading, isError } = useQuery({
        queryKey: ["consultant-public", id],
        queryFn: () => {
            if (!id) return Promise.reject("No ID");
            return ConsultantAPI.getById(id);
        },
        enabled: !!id,
    });

    const consultant = consultantData?.data;

    if (isLoading) {
        return <div className="flex justify-center items-center min-h-screen">Loading profile...</div>;
    }

    if (isError || !consultant) {
        return (
            <div className="flex flex-col justify-center items-center min-h-screen gap-4">
                <h2 className="text-xl font-semibold text-red-500">Consultant not found</h2>
                <Button onClick={() => navigate(-1)}>Go Back</Button>
            </div>
        );
    }

    return (
        <div className="container mx-auto py-8 px-4 max-w-6xl">
            <Button variant="ghost" className="mb-6 gap-2" onClick={() => navigate(-1)}>
                <ArrowLeft className="h-4 w-4" /> Back
            </Button>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Basic Info & Contact */}
                <div className="lg:col-span-1 space-y-6">
                    <Card className="overflow-hidden border-t-4 border-t-blue-600 shadow-md">
                        <CardContent className="pt-8 flex flex-col items-center text-center">
                            <Avatar className="h-32 w-32 border-4 border-white shadow-lg mb-4 ring-2 ring-blue-50">
                                <AvatarImage src={consultant.image || consultant.avatar} className="object-cover" />
                                <AvatarFallback className="text-4xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                                    {(consultant.fullName || consultant.name || "C").charAt(0).toUpperCase()}
                                </AvatarFallback>
                            </Avatar>

                            <h1 className="text-2xl font-bold text-slate-900 mb-1">
                                {consultant.fullName || consultant.name}
                            </h1>
                            <p className="text-blue-600 font-medium mb-2">
                                {consultant.bioTitle || (typeof consultant.category === 'object' ? (consultant.category.title || consultant.category.name) : consultant.category) || "Consultant"}
                            </p>
                            {/* {consultant.department && (
                                <Badge variant="outline" className="mb-4 bg-slate-50">
                                    {consultant.department}
                                </Badge>
                            )} */}

                            <div className="flex items-center gap-2 mb-6">
                                {consultant.ratingSummary?.average > 0 && (
                                    <Badge variant="secondary" className="bg-amber-100 text-amber-800 hover:bg-amber-100 border-amber-200">
                                        <Star className="h-3 w-3 mr-1 fill-amber-800" />
                                        {consultant.ratingSummary.average.toFixed(1)}
                                    </Badge>
                                )}
                                <Badge variant="outline" className="border-blue-200 text-blue-700 bg-blue-50">
                                    {consultant.yearsOfExperience ? `${consultant.yearsOfExperience} Years Exp.` : "Experienced"}
                                </Badge>
                            </div>

                            <Separator className="my-4" />

                            <div className="w-full space-y-4 text-sm text-left px-2">
                                {(consultant.city || consultant.state || consultant.address) && (
                                    <div className="flex items-start gap-3 text-slate-600">
                                        <MapPin className="h-4 w-4 shrink-0 text-slate-400 mt-0.5" />
                                        <span>
                                            {[consultant.address, consultant.city, consultant.state, consultant.pincode, consultant.country]
                                                .filter(Boolean)
                                                .join(", ")}
                                        </span>
                                    </div>
                                )}
                            </div>

                            <div className="w-full mt-6 pt-6 border-t bg-slate-50/50 -mx-6 px-6 pb-2">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-medium text-slate-500">Consultation Fee</span>
                                    <span className="text-xl font-bold text-slate-900">
                                        {`₹${(consultant.fees || 0).toLocaleString()}`}
                                    </span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Additional Details */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 text-sm">
                            {consultant.regNo && (
                                <div className="flex justify-between py-2 border-b border-slate-50 last:border-0">
                                    <span className="text-muted-foreground flex items-center gap-2">
                                        <Hash className="h-3.5 w-3.5" /> Reg. No
                                    </span>
                                    <span className="font-medium">{consultant.regNo}</span>
                                </div>
                            )}
                            {consultant.gender && (
                                <div className="flex justify-between py-2 border-b border-slate-50 last:border-0">
                                    <span className="text-muted-foreground flex items-center gap-2">
                                        <User className="h-3.5 w-3.5" /> Gender
                                    </span>
                                    <span className="font-medium capitalize">{consultant.gender}</span>
                                </div>
                            )}
                            <div className="flex justify-between py-2 border-b border-slate-50 last:border-0">
                                <span className="text-muted-foreground flex items-center gap-2">
                                    <Globe className="h-3.5 w-3.5" /> Language
                                </span>
                                <span className="font-medium text-right">
                                    {Array.isArray(consultant.languages) && consultant.languages.length > 0
                                        ? consultant.languages.join(", ")
                                        : "English"}
                                </span>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Social Links */}
                    {consultant.socials && Object.values(consultant.socials).some(Boolean) && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">Connect</CardTitle>
                            </CardHeader>
                            <CardContent className="flex gap-4 justify-center">
                                {consultant.socials.website && (
                                    <a href={consultant.socials.website} target="_blank" rel="noreferrer" className="text-slate-500 hover:text-blue-600 transition-colors">
                                        <Globe className="h-5 w-5" />
                                    </a>
                                )}
                                {consultant.socials.linkedin && (
                                    <a href={consultant.socials.linkedin} target="_blank" rel="noreferrer" className="text-slate-500 hover:text-blue-700 transition-colors">
                                        <Linkedin className="h-5 w-5" />
                                    </a>
                                )}
                                {consultant.socials.twitter && (
                                    <a href={consultant.socials.twitter} target="_blank" rel="noreferrer" className="text-slate-500 hover:text-sky-500 transition-colors">
                                        <Twitter className="h-5 w-5" />
                                    </a>
                                )}
                                {consultant.socials.facebook && (
                                    <a href={consultant.socials.facebook} target="_blank" rel="noreferrer" className="text-slate-500 hover:text-blue-800 transition-colors">
                                        <Facebook className="h-5 w-5" />
                                    </a>
                                )}
                                {consultant.socials.instagram && (
                                    <a href={consultant.socials.instagram} target="_blank" rel="noreferrer" className="text-slate-500 hover:text-pink-600 transition-colors">
                                        <Instagram className="h-5 w-5" />
                                    </a>
                                )}
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Right Column: Detailed Info */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <Card className="bg-blue-50 border-blue-100">
                            <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                                <Users className="h-5 w-5 text-blue-600 mb-2" />
                                <div className="text-2xl font-bold text-blue-700">{consultant.clientInfo?.totalClients || 0}</div>
                                <div className="text-xs text-blue-600 font-medium">Happy Clients</div>
                            </CardContent>
                        </Card>
                        <Card className="bg-emerald-50 border-emerald-100">
                            <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                                <CalendarCheck className="h-5 w-5 text-emerald-600 mb-2" />
                                <div className="text-2xl font-bold text-emerald-700">{consultant.clientInfo?.completedAppointments || 0}</div>
                                <div className="text-xs text-emerald-600 font-medium">Sessions Done</div>
                            </CardContent>
                        </Card>
                        <Card className="bg-amber-50 border-amber-100">
                            <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                                <Star className="h-5 w-5 text-amber-600 mb-2" />
                                <div className="text-2xl font-bold text-amber-700">{consultant.ratingSummary?.average?.toFixed(1) || "N/A"}</div>
                                <div className="text-xs text-amber-600 font-medium">Rating</div>
                            </CardContent>
                        </Card>
                        <Card className="bg-violet-50 border-violet-100">
                            <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                                <ThumbsUp className="h-5 w-5 text-violet-600 mb-2" />
                                <div className="text-2xl font-bold text-violet-700">{consultant.yearsOfExperience || 1}+</div>
                                <div className="text-xs text-violet-600 font-medium">Years Exp.</div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* About */}
                    <Card>
                        <CardHeader>
                            <CardTitle>About</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">
                                {consultant.about || "No bio available."}
                            </p>
                        </CardContent>
                    </Card>

                    {/* Expertise */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Expertise</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-wrap gap-2">
                                {consultant.category && (
                                    <Badge variant="secondary" className="px-3 py-1 text-sm">
                                        {typeof consultant.category === 'object'
                                            ? (consultant.category.title || consultant.category.name || "General")
                                            : consultant.category}
                                    </Badge>
                                )}
                                {consultant.subcategory && (
                                    <Badge variant="outline" className="px-3 py-1 text-sm">
                                        {typeof consultant.subcategory === 'object'
                                            ? (consultant.subcategory.title || consultant.subcategory.name || "")
                                            : consultant.subcategory}
                                    </Badge>
                                )}
                                {Array.isArray(consultant.tags) && consultant.tags.map((tag: string) => (
                                    <Badge key={tag} variant="outline" className="bg-slate-50 px-3 py-1 text-sm">{tag}</Badge>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Experience */}
                    {Array.isArray(consultant.experiences) && consultant.experiences.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Briefcase className="h-5 w-5 text-slate-500" /> Experience
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {consultant.experiences.map((exp: any, index: number) => (
                                    <div key={index} className="relative pl-6 border-l-2 border-slate-100 last:border-0 pb-6 last:pb-0">
                                        <div className="absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full bg-blue-500 ring-4 ring-white" />
                                        <h4 className="font-semibold text-slate-900 text-lg">{exp.role}</h4>
                                        <p className="text-sm font-medium text-blue-600">{exp.company}</p>
                                        <p className="text-xs text-muted-foreground mt-1 mb-2 flex items-center gap-1">
                                            <Clock className="h-3 w-3" /> {exp.startYear} - {exp.endYear || "Present"}
                                        </p>
                                        {exp.description && (
                                            <p className="text-sm text-slate-600 leading-relaxed">{exp.description}</p>
                                        )}
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    )}

                    {/* Education */}
                    {Array.isArray(consultant.education) && consultant.education.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Award className="h-5 w-5 text-slate-500" /> Education
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {consultant.education.map((edu: any, index: number) => (
                                    <div key={index} className="flex flex-col sm:flex-row sm:justify-between sm:items-start border-b border-slate-50 last:border-0 pb-4 last:pb-0 gap-2">
                                        <div>
                                            <h4 className="font-semibold text-slate-900">{edu.qualification}</h4>
                                            <p className="text-sm text-slate-600">{edu.institute}</p>
                                        </div>
                                        <span className="text-xs font-medium bg-slate-100 px-2.5 py-1 rounded-full text-slate-600 whitespace-nowrap">
                                            {edu.year || `${edu.startYear} - ${edu.endYear}`}
                                        </span>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    )}

                    {/* Awards */}
                    {Array.isArray(consultant.awards) && consultant.awards.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Award className="h-5 w-5 text-slate-500" /> Awards & Recognition
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {consultant.awards.map((award: any, index: number) => (
                                    <div key={index} className="flex flex-col sm:flex-row sm:justify-between sm:items-start border-b border-slate-50 last:border-0 pb-4 last:pb-0 gap-2">
                                        <div>
                                            <h4 className="font-semibold text-slate-900">{award.title}</h4>
                                            <p className="text-sm text-slate-600">{award.desc}</p>
                                        </div>
                                        <span className="text-xs font-medium bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full whitespace-nowrap border border-amber-100">
                                            {award.year}
                                        </span>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ConsultantPublicProfile;
