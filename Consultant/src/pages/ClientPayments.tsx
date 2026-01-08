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
    Download,
    Search as LucideSearch,
    FileCog,
    Receipt,
    CreditCard,
    Hash,
    CalendarDays,
    Eye,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import TransactionAPI from "@/api/transaction.api";
import { cn } from "@/lib/utils";
import { TRANSACTION_STATUS_ARRAY } from "@/constants/appConstants";

/* --------------------------------------
   Types & Utils
-------------------------------------- */
function normalize(s: string) {
    return (s || "")
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[\u2010-\u2015]/g, "-")
        .replace(/[^a-z0-9]+/g, "");
}

function getInitials(name: string) {
    if (!name) return "??";
    const parts = name.trim().split(" ");
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export type PaymentItem = {
    id: string;
    initials: string;
    doctor: string;
    dept: string; // Changed to string to support all categories
    status: string;
    title: string;
    date: string;
    method: string;
    txn: string;
    invoice: string;
    price: number;
    session: string;
};

// Robust pill mapping with fallback
function getDeptPill(dept: string) {
    const map: Record<string, string> = {
        Health: "bg-blue-600/10 text-blue-700 border-blue-200",
        Finance: "bg-amber-500/10 text-amber-700 border-amber-200",
        Legal: "bg-violet-600/10 text-violet-700 border-violet-200",
        IT: "bg-emerald-600/10 text-emerald-700 border-emerald-200",
        General: "bg-gray-600/10 text-gray-700 border-gray-200"
    };
    return map[dept] || map["General"];
}

/* --------------------------------------
   Sub-components
-------------------------------------- */

function Modal({
    open,
    onClose,
    children,
    title,
    subtitle,
}: {
    open: boolean;
    onClose: () => void;
    children: React.ReactNode;
    title: string;
    subtitle?: string;
}) {
    if (!open) return null;
    return (
        <div className="fixed inset-0 z-50">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-[1px]" onClick={onClose} />
            <div className="absolute inset-0 grid place-items-center p-4">
                <div className="relative w-[640px] max-w-[95vw] rounded-xl bg-white shadow-xl border">
                    <div className="flex items-start justify-between p-4 border-b">
                        <div>
                            <div className="text-base font-semibold">{title}</div>
                            {subtitle && (
                                <div className="text-xs text-muted-foreground mt-0.5">
                                    {subtitle}
                                </div>
                            )}
                        </div>
                        <Button variant="ghost" size="sm" onClick={onClose}>
                            ✕
                        </Button>
                    </div>
                    <div className="p-4">{children}</div>
                </div>
            </div>
        </div>
    );
}

function PaymentRow({
    p,
    onOpen,
}: {
    p: PaymentItem;
    onOpen: (p: PaymentItem) => void;
}) {
    return (
        <div className="rounded-xl border bg-white p-4 flex flex-col md:flex-row md:items-start md:justify-between gap-3">
            <div className="flex gap-3">
                <div className="h-10 w-10 shrink-0 rounded-md bg-muted grid place-items-center text-xs font-medium text-muted-foreground">
                    {p.initials}
                </div>
                <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="font-medium">{p.doctor}</div>
                        <Badge
                            variant="outline"
                            className={cn(
                                "px-2 py-0.5 text-xs rounded-full",
                                getDeptPill(p.dept)
                            )}
                        >
                            {p.dept}
                        </Badge>
                        <Badge
                            variant="outline"
                            className={cn(
                                "px-2 py-0.5 text-xs rounded-full border",
                                p.status === "Success" || p.status === "Completed"
                                    ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                                    : p.status === "Pending"
                                        ? "bg-yellow-100 text-yellow-700 border-yellow-200"
                                        : "bg-red-100 text-red-700 border-red-200"
                            )}
                        >
                            {p.status}
                        </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">{p.title}</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1 text-sm text-muted-foreground mt-1">
                        <span className="inline-flex items-center gap-1">
                            <CalendarDays className="h-4 w-4" />
                            {p.date}
                        </span>
                        <span className="inline-flex items-center gap-1">
                            <Hash className="h-4 w-4" /> Invoice: {p.invoice}
                        </span>
                        <span className="inline-flex items-center gap-1">
                            <CreditCard className="h-4 w-4" /> {p.method}
                        </span>
                        <span className="inline-flex items-center gap-1">
                            <FileCog className="h-4 w-4" /> {p.txn}
                        </span>
                    </div>
                </div>
            </div>

            <div className="min-w-[220px] flex flex-col items-end gap-2">
                <div className="font-semibold">₹{p.price}</div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="gap-1">
                        <Download className="h-4 w-4" /> Invoice
                    </Button>
                    <Button variant="outline" size="sm" className="gap-1">
                        <Receipt className="h-4 w-4" /> Receipt
                    </Button>
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1 text-muted-foreground"
                    onClick={() => onOpen(p)}
                >
                    <Eye className="h-4 w-4" /> View Details
                </Button>
            </div>
        </div>
    );
}

function filterPayments(items: PaymentItem[], q: string) {
    const nq = normalize(q);
    return items.filter(
        (p) =>
            !nq ||
            normalize(p.doctor).includes(nq) ||
            normalize(p.invoice).includes(nq) ||
            normalize(p.method).includes(nq) ||
            normalize(p.title).includes(nq) ||
            normalize(p.txn).includes(nq)
    );
}

/* --------------------------------------
   Main Page Component
-------------------------------------- */
export default function ClientPayments() {
    const [q, setQ] = useState("");
    const [filter, setFilter] = useState("All Payments");
    const [open, setOpen] = useState<PaymentItem | null>(null);

    // Correct API Method: getTransactions
    const { data: transactionsData, isLoading: loadingTransactions } = useQuery({
        queryKey: ["clientTransactions"],
        queryFn: () => TransactionAPI.getTransactions(),
    });

    const transactions = transactionsData?.data || [];

    const mappedTransactions: PaymentItem[] = useMemo(() => transactions.map((t: any) => ({
        id: t._id,
        initials: getInitials(t.consultantSnapshot?.name || t.consultant?.fullName || t.consultant?.name || "Unknown"),
        doctor: t.consultantSnapshot?.name || t.consultant?.fullName || t.consultant?.name || "Unknown",
        dept: (typeof (t.consultantSnapshot?.category || t.consultant?.category) === 'object'
            ? (t.consultantSnapshot?.category?.name || t.consultant?.category?.name)
            : (t.consultantSnapshot?.category || t.consultant?.category)) || "General",
        status: t.status,
        title: `${(typeof (t.consultantSnapshot?.subcategory || t.consultant?.subcategory) === 'object' ? (t.consultantSnapshot?.subcategory?.name || t.consultant?.subcategory?.name) : (t.consultantSnapshot?.subcategory || t.consultant?.subcategory)) || t.consultant?.title || "Consultation"} • ${t.appointment?.reason || "Session"}`,
        date: new Date(t.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
        method: t.paymentMethod,
        txn: t.transactionId || "N/A",
        invoice: t.metadata?.invoiceId || "INV-" + t._id.substring(18),
        price: t.amount || 0,
        session: t.appointment?.session || "Video Call",
    })), [transactions]);

    const filtered = useMemo(() => {
        let items = mappedTransactions;
        if (filter !== "All Payments") {
            items = items.filter(t => t.status === filter);
        }
        return filterPayments(items, q);
    }, [mappedTransactions, q, filter]);

    if (loadingTransactions) {
        return <div className="p-8 text-center text-muted-foreground">Loading payments...</div>;
    }

    return (
        <div className="mx-auto w-full max-w-7xl space-y-4">
            <div className="space-y-2">
                <h1 className="text-xl font-semibold">Payments & Invoices</h1>
                <p className="text-xs text-muted-foreground">Home » Payments</p>
            </div>

            <Card className="border-muted/50">
                <CardHeader className="pb-2">
                    <h3 className="text-base font-semibold">Payment History</h3>
                    <div className="text-xs text-muted-foreground">
                        Complete record of all your transactions
                    </div>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                        <div className="relative w-full">
                            <LucideSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                value={q}
                                onChange={(e) => setQ(e.target.value)}
                                placeholder="Search by consultant, invoice number..."
                                className="pl-9"
                            />
                        </div>
                        <Select value={filter} onValueChange={setFilter}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="All Payments" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="All Payments">All Payments</SelectItem>
                                {TRANSACTION_STATUS_ARRAY.map(status => (
                                    <SelectItem key={status} value={status}>{status}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-3">
                        {filtered.map((p) => (
                            <PaymentRow key={p.id} p={p} onOpen={setOpen} />
                        ))}
                        {filtered.length === 0 && (
                            <div className="text-sm text-muted-foreground text-center py-8">
                                No payments found matching your criteria.
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            <Modal
                open={!!open}
                onClose={() => setOpen(null)}
                title="Payment Details"
                subtitle="Complete transaction information"
            >
                {open && (
                    <div className="space-y-4 text-sm">
                        <div className="rounded-lg border bg-muted/30 p-3">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="font-medium">{open.doctor}</div>
                                    <div className="text-xs text-muted-foreground">
                                        {open.dept}
                                    </div>
                                </div>
                                <Badge
                                    variant="outline"
                                    className={cn(
                                        "bg-white",
                                        open.status === "Success" || open.status === "Completed"
                                            ? "text-emerald-700 border-emerald-200 bg-emerald-50"
                                            : "text-gray-700 border-gray-200"
                                    )}
                                >
                                    ● {open.status}
                                </Badge>
                            </div>

                            <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                                <div>
                                    <div className="text-xs text-muted-foreground">Category</div>
                                    <div className="font-medium">{open.dept}</div>
                                </div>
                                <div>
                                    <div className="text-xs text-muted-foreground">
                                        Service Type
                                    </div>
                                    <div className="font-medium">
                                        {open.session}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                            <div>
                                <div className="text-xs text-muted-foreground">
                                    Transaction Date
                                </div>
                                <div className="flex items-center gap-2 font-medium">
                                    <CalendarDays className="h-4 w-4" /> {open.date}
                                </div>
                            </div>
                            <div>
                                <div className="text-xs text-muted-foreground">Amount</div>
                                <div className="text-xl font-semibold">₹{open.price}</div>
                            </div>
                            <div>
                                <div className="text-xs text-muted-foreground">Payment Method</div>
                                <div className="flex items-center gap-2 font-medium">
                                    <CreditCard className="h-4 w-4" /> {open.method}
                                </div>
                            </div>
                            <div>
                                <div className="text-xs text-muted-foreground">Invoice Number</div>
                                <div className="flex items-center gap-2 font-medium">
                                    <Hash className="h-4 w-4" /> {open.invoice}
                                </div>
                            </div>
                            <div className="col-span-2">
                                <div className="text-xs text-muted-foreground">
                                    Transaction ID
                                </div>
                                <div className="flex items-center gap-2 font-medium">
                                    <FileCog className="h-4 w-4" /> {open.txn}
                                </div>
                            </div>
                        </div>

                        <div className="pt-2 border-t flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Button variant="outline" className="gap-2" size="sm">
                                    <Download className="h-4 w-4" /> Invoice
                                </Button>
                                <Button variant="outline" className="gap-2" size="sm">
                                    <Receipt className="h-4 w-4" /> Receipt
                                </Button>
                            </div>
                            <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => setOpen(null)}
                            >
                                Close
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}
