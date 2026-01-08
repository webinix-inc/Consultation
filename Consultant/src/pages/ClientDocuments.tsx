import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
    Upload as UploadIcon,
    Eye,
    Download,
    Trash2,
    Search as LucideSearch,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import DocumentAPI from "@/api/document.api";
import UploadAPI from "@/api/upload.api";
import ClientConsultantAPI from "@/api/clientConsultant.api";
import { toast } from "react-hot-toast";
import { useAuth } from "@/hooks/useAuth";

/* --------------------------------------
   Types & Data
-------------------------------------- */
function normalize(s: string) {
    return (s || "")
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[\u2010-\u2015]/g, "-")
        .replace(/[^a-z0-9]+/g, "");
}

export type DocItem = {
    id: string;
    title: string;
    type: "Medical Report" | "Consultation Notes" | "Prescription" | "Invoice";
    client: string;
    consultant: string;
    size: string;
    date: string;
};

const typeBadgeCls: Record<DocItem["type"], string> = {
    "Medical Report": "bg-blue-100 text-blue-700 border-blue-200",
    "Consultation Notes": "bg-yellow-100 text-yellow-700 border-yellow-200",
    Prescription: "bg-emerald-100 text-emerald-700 border-emerald-200",
    Invoice: "bg-orange-100 text-orange-700 border-orange-200",
};

/* --------------------------------------
   Sub-components
-------------------------------------- */
const DocRow = ({ d, onDelete, canDelete }: { d: any; onDelete: (id: string) => void; canDelete: boolean }) => {
    return (
        <div className="rounded-xl border bg-white p-4 flex items-start justify-between gap-3">
            <div className="space-y-1">
                <div className="flex items-center gap-2">
                    <div className="font-medium">{d.title}</div>
                </div>
                <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-4">
                    <span>
                        Consultant: <span className="text-foreground">{d.consultant}</span>
                    </span>
                    <span>• {d.size}</span>
                    <span>• {d.date}</span>
                </div>
            </div>
            <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => window.open(d.fileUrl, "_blank")}>
                    <Eye className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => {
                    const link = document.createElement('a');
                    link.href = d.fileUrl;
                    link.download = d.title || 'document';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                }}>
                    <Download className="h-4 w-4" />
                </Button>
                {canDelete && (
                    <Button
                        variant="destructive"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => onDelete(d.id)}
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                )}
            </div>
        </div>
    );
}

function filterDocs(docs: DocItem[], q: string, cat: string) {
    const nq = normalize(q);
    return docs.filter(
        (d) =>
            (cat === "All Categories" || d.type === cat) &&
            (!nq ||
                normalize(d.title).includes(nq) ||
                normalize(d.client).includes(nq))
    );
}

/* --------------------------------------
   Main Page Component
-------------------------------------- */
const Modal = ({ open, onClose, children, title }: any) => {
    if (!open) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-6 space-y-4">
                <div className="flex justify-between items-center border-b pb-2">
                    <h3 className="font-semibold text-lg">{title}</h3>
                    <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
                </div>
                {children}
            </div>
        </div>
    );
};

/* --------------------------------------
   Main Page Component
-------------------------------------- */
export default function ClientDocuments() {
    const queryClient = useQueryClient();
    const { user } = useAuth();
    const [q, setQ] = useState("");
    const [cat, setCat] = useState("All Categories");

    const [isUploadOpen, setIsUploadOpen] = useState(false);
    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const [uploadTitle, setUploadTitle] = useState("");
    const [uploadType, setUploadType] = useState("Medical Report");
    const [selectedConsultant, setSelectedConsultant] = useState("");
    const [uploadDesc, setUploadDesc] = useState("");
    const [isUploading, setIsUploading] = useState(false);
    const [deleteId, setDeleteId] = useState<string | null>(null);

    // Fetch Documents
    const { data: documentsData, isLoading } = useQuery({
        queryKey: ["myDocuments"],
        queryFn: () => DocumentAPI.getAll(),
    });

    // Fetch My Consultants (for upload dropdown)
    // Fetch all linked consultants (not just those with upcoming/confirmed appointments)
    const userId = user?.id || user?._id;
    const { data: myConsultants } = useQuery({
        queryKey: ["myConsultants", userId],
        queryFn: async () => {
            if (!userId) return [];
            const result = await ClientConsultantAPI.getClientConsultants(userId, 1, 50, false);
            return result;
        },
        enabled: !!userId
    });

    const items = useMemo(() => {
        if (!documentsData?.documents) return [];
        return documentsData.documents.map((d: any) => ({
            id: d._id,
            title: d.title,
            type: d.type,
            client: d.clientSnapshot?.fullName || d.client?.fullName || "Me",
            consultant: d.consultantSnapshot?.displayName || d.consultant?.fullName || d.consultant?.displayName || d.consultant?.name || "Consultant",
            size: d.formattedSize || "0 KB",
            date: new Date(d.createdAt).toLocaleDateString(),
            fileUrl: d.fileUrl,
            uploadedBy: d.uploadedBy // Added uploadedBy
        }));
    }, [documentsData]);

    const filtered = useMemo(() => filterDocs(items, q, cat), [items, q, cat]);

    const uploadMutation = useMutation({
        mutationFn: async () => {
            if (!uploadFile) throw new Error("Please select a file");
            if (!selectedConsultant) throw new Error("Please select a consultant");

            // 1. Upload File
            const uploadRes = await UploadAPI.uploadDocument(uploadFile);
            const { url, key, fileName, size, mimeType } = uploadRes.data;

            // 2. Create Document
            const docPayload = {
                title: uploadTitle,
                type: uploadType,
                description: uploadDesc,
                consultant: selectedConsultant, // Assign to selected consultant
                fileUrl: url,
                fileKey: key,
                fileName,
                originalFileName: uploadFile.name,
                fileSize: size,
                mimeType
            };

            return DocumentAPI.create(docPayload);
        },
        onSuccess: () => {
            toast.success("Document uploaded successfully");
            setIsUploadOpen(false);
            setUploadFile(null);
            setUploadTitle("");
            setSelectedConsultant("");
            queryClient.invalidateQueries({ queryKey: ["myDocuments"] });
        },
        onError: (err: any) => {
            toast.error(err?.message || "Failed to upload document");
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => DocumentAPI.delete(id),
        onSuccess: () => {
            toast.success("Document deleted");
            queryClient.invalidateQueries({ queryKey: ["myDocuments"] });
            setDeleteId(null);
        },
        onError: (err: any) => {
            toast.error(err?.message || "Failed to delete document");
        }
    });

    const handleUpload = async () => {
        if (!uploadTitle) {
            toast.error("Please enter a title");
            return;
        }
        setIsUploading(true);
        try {
            await uploadMutation.mutateAsync();
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="mx-auto w-full max-w-7xl space-y-4">
            <div className="space-y-2">
                <h1 className="text-xl font-semibold">My Documents</h1>
                <p className="text-xs text-muted-foreground">Home » Documents</p>
            </div>

            <Card className="border-muted/50">
                <CardHeader className="pb-2">
                    <h3 className="text-base font-semibold">Document Management</h3>
                    <div className="text-xs text-muted-foreground">
                        Manage and monitor all platform documents
                    </div>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                        <Button className="gap-2 bg-blue-500 hover:bg-blue-600" onClick={() => setIsUploadOpen(true)}>
                            <UploadIcon className="h-4 w-4" /> Upload Document
                        </Button>
                    </div>

                    <div className="relative">
                        <LucideSearch className="absolute left-3 top-1/2 -translate-y-1/4 h-4 w-4 text-muted-foreground" />
                        <Input
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            placeholder="Search by title or consultant..."
                            className="pl-9"
                        />
                    </div>

                    <div className="space-y-3">
                        {isLoading ? <div className="p-4 text-center">Loading...</div> :
                            filtered.length > 0 ? filtered.map((d: any) => (
                                <DocRow
                                    key={d.id}
                                    d={d}
                                    onDelete={(id) => setDeleteId(id)}
                                    canDelete={d.uploadedBy === user?._id || d.uploadedBy === user?.id}
                                />
                            )) : (
                                <div className="text-sm text-muted-foreground p-4 text-center">
                                    No documents found.
                                </div>
                            )}
                    </div>
                </CardContent>
            </Card>

            <Modal open={isUploadOpen} onClose={() => setIsUploadOpen(false)} title="Upload Document">
                <div className="space-y-4">
                    <div className="grid gap-2">
                        <label className="text-sm font-medium">Title</label>
                        <Input value={uploadTitle} onChange={(e) => setUploadTitle(e.target.value)} placeholder="e.g. Lab Report" />
                    </div>

                    <div className="grid gap-2">
                        <label className="text-sm font-medium">Share with Consultant</label>
                        <Select value={selectedConsultant} onValueChange={setSelectedConsultant}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select Consultant" />
                            </SelectTrigger>
                            <SelectContent>
                                {myConsultants?.map((c: any) => {
                                    return (
                                        <SelectItem key={c.id || c._id} value={c.id || c._id}>
                                            {c.displayName || c.fullName || c.name || "Unknown"}
                                        </SelectItem>
                                    );
                                })}
                            </SelectContent>
                        </Select>
                    </div>



                    <div className="grid gap-2">
                        <label className="text-sm font-medium">File</label>
                        <Input type="file" onChange={(e) => setUploadFile(e.target.files?.[0] || null)} />
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <Button variant="outline" onClick={() => setIsUploadOpen(false)}>Cancel</Button>
                        <Button onClick={handleUpload} disabled={isUploading} className="bg-blue-600 hover:bg-blue-700 text-white">
                            {isUploading ? "Uploading..." : "Upload"}
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="Delete Document">
                <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                        Are you sure you want to delete this document? This action cannot be undone.
                    </p>
                    <div className="flex justify-end gap-3">
                        <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
                        <Button variant="destructive" onClick={() => deleteId && deleteMutation.mutate(deleteId)} disabled={deleteMutation.isPending}>
                            {deleteMutation.isPending ? "Deleting..." : "Delete"}
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
