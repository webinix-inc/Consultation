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
function DocRow({ d, onDelete }: { d: DocItem; onDelete: (id: string) => void }) {
    return (
        <div className="rounded-xl border bg-white p-4 flex items-start justify-between gap-3">
            <div className="space-y-1">
                <div className="flex items-center gap-2">
                    <Badge
                        variant="outline"
                        className={cn(
                            "px-2 py-0.5 text-[11px] rounded-md",
                            typeBadgeCls[d.type]
                        )}
                    >
                        {d.type}
                    </Badge>
                    <div className="font-medium">{d.title}</div>
                </div>
                <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-4">
                    <span>
                        Client: <span className="text-foreground">{d.client}</span>
                    </span>
                    <span>
                        Consultant:{" "}
                        <span className="text-foreground">{d.consultant}</span>
                    </span>
                    <span>• {d.size}</span>
                    <span>• {d.date}</span>
                </div>
            </div>
            <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" className="h-8 w-8">
                    <Eye className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" className="h-8 w-8">
                    <Download className="h-4 w-4" />
                </Button>
                <Button
                    variant="destructive"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onDelete(d.id)}
                >
                    <Trash2 className="h-4 w-4" />
                </Button>
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
export default function ClientDocuments() {
    const [items, setItems] = useState<DocItem[]>([]);
    const [q, setQ] = useState("");
    const [cat, setCat] = useState("All Categories");
    const filtered = useMemo(() => filterDocs(items, q, cat), [items, q, cat]);

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
                        <Button className="gap-2 bg-blue-500 hover:bg-blue-600">
                            <UploadIcon className="h-4 w-4" /> Upload Document
                        </Button>
                        <Select value={cat} onValueChange={setCat}>
                            <SelectTrigger className="w-[160px]">
                                <SelectValue placeholder="All Categories" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="All Categories">All Categories</SelectItem>
                                <SelectItem value="Medical Report">Medical Report</SelectItem>
                                <SelectItem value="Consultation Notes">
                                    Consultation Notes
                                </SelectItem>
                                <SelectItem value="Prescription">Prescription</SelectItem>
                                <SelectItem value="Invoice">Invoice</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="relative">
                        <LucideSearch className="absolute left-3 top-1/2 -translate-y-1/4 h-4 w-4 text-muted-foreground" />
                        <Input
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            placeholder="Search by consultant, invoice number..."
                            className="pl-9"
                        />
                    </div>

                    <div className="space-y-3">
                        {filtered.map((d) => (
                            <DocRow
                                key={d.id}
                                d={d}
                                onDelete={(id) =>
                                    setItems((prev) => prev.filter((x) => x.id !== id))
                                }
                            />
                        ))}
                        {filtered.length === 0 && (
                            <div className="text-sm text-muted-foreground">
                                No documents found.
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
