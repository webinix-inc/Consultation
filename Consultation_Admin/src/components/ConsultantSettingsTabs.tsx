import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { AlertCircle, Plus, Trash2 } from "lucide-react";
import ConsultantAPI from "@/api/consultant.api";
import { cn } from "@/lib/utils"; // Assuming utils exists, or verify

/* --------------------------------------
   Types (partial - match backend nested shape)
-------------------------------------- */
type TimeSlot = {
    start: string;
    end: string;
};

type DaySettings = {
    enabled: boolean;
    slots: TimeSlot[];
};

type ConsultantSettings = {
    _id?: string;
    consultant?: string;
    notifications?: {
        email?: boolean;
        sms?: boolean;
        appointmentReminders?: boolean;
        clientMsgs?: boolean;
        weeklyReports?: boolean;
    };
    availability?: {
        acceptingNewClients?: boolean;
        currentStatus?: "available" | "busy" | "offline" | string;
        workingHours?: Record<string, DaySettings>;
        sessionSettings?: {
            defaultDuration?: number;
            bufferTime?: number;
            maxSessionsPerDay?: number;
            minDuration?: number;
            maxDuration?: number;
        };
        timeOff?: Array<any>;
        cancellation?: any;
    };
    // other fields omitted for brevity...
};

/* --------------------------------------
   Helpers
-------------------------------------- */
// Use local cn if not imported, or replace with local implementation
// function cn(...xs: Array<string | false | null | undefined>) {
//   return xs.filter(Boolean).join(" ");
// }

function generatePreviewSlots(start: string, end: string, durationMin: number, bufferMin: number): string[] {
    if (!start || !end || !durationMin) return [];

    const slots: string[] = [];
    const [startH, startM] = start.split(":").map(Number);
    const [endH, endM] = end.split(":").map(Number);

    let current = new Date();
    current.setHours(startH, startM, 0, 0);

    const endTime = new Date(current);
    endTime.setHours(endH, endM, 0, 0);

    // Safety break to prevent infinite loops
    let iterations = 0;
    while (current < endTime && iterations < 50) {
        const slotStart = new Date(current);
        const slotEnd = new Date(current.getTime() + durationMin * 60000);

        if (slotEnd > endTime) break;

        const formatTime = (d: Date) => d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
        slots.push(`${formatTime(slotStart)} - ${formatTime(slotEnd)}`);

        // Advance by duration + buffer
        current = new Date(slotEnd.getTime() + bufferMin * 60000);
        iterations++;
    }

    return slots;
}

function defaultSettings(): ConsultantSettings {
    return {
        notifications: {
            email: true,
            sms: false,
            appointmentReminders: true,
            clientMsgs: true,
            weeklyReports: true,
        },
        availability: {
            acceptingNewClients: true,
            currentStatus: "available",
            workingHours: {
                monday: { enabled: true, slots: [{ start: "09:00", end: "17:00" }] },
                tuesday: { enabled: true, slots: [{ start: "09:00", end: "17:00" }] },
                wednesday: { enabled: true, slots: [{ start: "09:00", end: "17:00" }] },
                thursday: { enabled: true, slots: [{ start: "09:00", end: "17:00" }] },
                friday: { enabled: true, slots: [{ start: "09:00", end: "17:00" }] },
                saturday: { enabled: false, slots: [] },
                sunday: { enabled: false, slots: [] },
            },
            sessionSettings: { defaultDuration: 60, bufferTime: 15, maxSessionsPerDay: 8 },
        },
    };
}

/* --------------------------------------
   Notifications Tab
-------------------------------------- */
export function NotificationsTab({ consultantId, readOnly = false }: { consultantId?: string; readOnly?: boolean }) {
    const [settings, setSettings] = useState<ConsultantSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    useEffect(() => {
        if (!consultantId) {
            setLoading(false);
            setMessage({ type: "error", text: "Consultant ID is missing" });
            return;
        }
        fetchSettings();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [consultantId]);

    const fetchSettings = async () => {
        try {
            setLoading(true);
            setMessage(null);
            const data = await ConsultantAPI.getSettings(consultantId!);
            const settingsData = data?.data;
            if (settingsData) {
                setSettings(settingsData);
            } else {
                setSettings(defaultSettings());
            }
        } catch (err: any) {
            setMessage({ type: "error", text: err.response?.data?.message || "Failed to load settings" });
            setSettings(defaultSettings());
        } finally {
            setLoading(false);
        }
    };

    const saveNotifications = async () => {
        if (!settings || !consultantId || readOnly) return;
        try {
            setSaving(true);
            setMessage(null);
            // Normalize to flat boolean structure for backend
            const payload = {
                email: typeof settings.notifications?.email === 'object'
                    ? !!(settings.notifications.email as any)?.enabled
                    : !!settings.notifications?.email,
                sms: typeof settings.notifications?.sms === 'object'
                    ? !!(settings.notifications.sms as any)?.enabled
                    : !!settings.notifications?.sms,
                appointmentReminders: !!settings.notifications?.appointmentReminders,
                clientMsgs: !!settings.notifications?.clientMsgs,
                weeklyReports: !!settings.notifications?.weeklyReports,
            };
            const res = await ConsultantAPI.updateNotifications(consultantId, payload);
            if (res?.success) {
                setMessage({ type: "success", text: "Notification preferences saved" });
                const updated = res?.data || res?.notifications || null;
                if (updated) setSettings((prev) => ({ ...(prev || {}), notifications: updated }));
            } else {
                setMessage({ type: "error", text: res?.message || "Save failed" });
            }
        } catch (err: any) {
            setMessage({ type: "error", text: err.response?.data?.message || "Error saving notifications" });
        } finally {
            setSaving(false);
        }
    };

    const updateSimpleFlag = (key: keyof NonNullable<ConsultantSettings["notifications"]>, value: boolean) => {
        if (!settings || readOnly) return;
        setSettings({
            ...settings,
            notifications: {
                ...(settings.notifications || {}),
                [key]: value,
            } as any,
        });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-8">
                <div className="text-sm text-muted-foreground">Loading settings...</div>
            </div>
        );
    }

    if (!settings) {
        return (
            <div className="flex items-center justify-center py-8">
                <div className="text-sm text-red-600">Failed to load settings</div>
            </div>
        );
    }

    const notif = settings.notifications!;

    // rows to show exactly as in the image
    const rows: { key: keyof NonNullable<ConsultantSettings["notifications"]>; title: string; subtitle?: string }[] = [
        { key: "email", title: "Email Notifications", subtitle: "Receive email updates about your appointments" },
        { key: "sms", title: "SMS Notifications", subtitle: "Get text messages for important updates" },
        { key: "appointmentReminders", title: "Appointment Reminders", subtitle: "Get reminded 24 hours before appointments" },
        { key: "clientMsgs", title: "Client Messages", subtitle: "Receive notifications when clients send messages" },
        { key: "weeklyReports", title: "Weekly Reports", subtitle: "Get weekly practice analytics and summaries" },
    ];

    return (
        <div className="space-y-4">
            {message && (
                <div className={`p-3 rounded-lg flex items-center gap-2 ${message.type === "success" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}>
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm">{message.text}</span>
                </div>
            )}

            <div className="text-sm font-semibold">Notification Preferences</div>

            <div className="space-y-3">
                {rows.map((r) => {
                    const checked = !!(notif as any)[r.key];

                    return (
                        <div key={String(r.key)} className="rounded-xl border bg-white px-4 py-4 flex items-center justify-between">
                            <div>
                                <div className="text-sm font-medium">{r.title}</div>
                                {r.subtitle && <div className="text-xs text-muted-foreground">{r.subtitle}</div>}
                            </div>

                            <div>
                                <Switch
                                    checked={checked}
                                    onCheckedChange={(v) => updateSimpleFlag(r.key, !!v)}
                                    disabled={readOnly}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>

            {!readOnly && (
                <div className="flex items-center justify-end gap-2 pt-2">
                    <Button variant="outline" onClick={fetchSettings}>
                        Cancel
                    </Button>
                    <Button className="bg-blue-600 hover:bg-blue-700" onClick={saveNotifications} disabled={saving}>
                        {saving ? "Saving..." : "Save Changes"}
                    </Button>
                </div>
            )}
        </div>
    );
}

/* --------------------------------------
   Availability Tab
-------------------------------------- */
export function AvailabilityTab({ consultantId, readOnly = false }: { consultantId?: string; readOnly?: boolean }) {
    const [settings, setSettings] = useState<ConsultantSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    useEffect(() => {
        if (!consultantId) {
            setLoading(false);
            setMessage({ type: "error", text: "Consultant ID missing" });
            return;
        }
        fetchSettings();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [consultantId]);

    const fetchSettings = async () => {
        try {
            setLoading(true);
            setMessage(null);
            const res = await ConsultantAPI.getSettings(consultantId!);
            const data = res?.data || defaultSettings();

            // Normalize workingHours to support multiple slots if backend returns old format
            if (data.availability?.workingHours) {
                const wh = data.availability.workingHours;
                Object.keys(wh).forEach(day => {
                    if ((wh[day] as any).start && (wh[day] as any).end && !wh[day].slots) {
                        // Convert legacy start/end to slots array
                        wh[day] = {
                            enabled: (wh[day] as any).enabled,
                            slots: [{ start: (wh[day] as any).start, end: (wh[day] as any).end }]
                        };
                    } else if (!wh[day].slots) {
                        wh[day] = { enabled: wh[day].enabled, slots: [] };
                    }
                });
            }

            setSettings(data);
        } catch (err: any) {
            setMessage({ type: "error", text: err.response?.data?.message || "Failed to load settings" });
            setSettings(defaultSettings());
        } finally {
            setLoading(false);
        }
    };

    const validateSlots = () => {
        if (!settings?.availability?.workingHours) return true;
        const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
        for (const day of days) {
            const daySettings = settings.availability.workingHours[day];
            if (daySettings?.enabled && daySettings.slots.length > 1) {
                const sorted = [...daySettings.slots].sort((a, b) => a.start.localeCompare(b.start));
                for (let i = 1; i < sorted.length; i++) {
                    if (sorted[i].start < sorted[i - 1].end) {
                        setMessage({ type: "error", text: `Time slots overlap on ${day.charAt(0).toUpperCase() + day.slice(1)}` });
                        return false;
                    }
                }
            }
        }
        return true;
    };

    const saveAvailability = async () => {
        if (!settings || !consultantId || readOnly) return;

        if (!validateSlots()) return;

        try {
            setSaving(true);
            setMessage(null);

            // Calculate generated slots for each day before saving
            const updatedAvailability = { ...settings.availability };
            const duration = updatedAvailability.sessionSettings?.defaultDuration || 60;
            const buffer = updatedAvailability.sessionSettings?.bufferTime || 0;

            if (updatedAvailability.workingHours) {
                const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
                days.forEach(day => {
                    const daySettings = updatedAvailability.workingHours![day];
                    if (daySettings && daySettings.enabled) {
                        // Flatten all generated slots for the day
                        const allGeneratedSlots: string[] = [];
                        daySettings.slots.forEach(slot => {
                            const generated = generatePreviewSlots(slot.start, slot.end, duration, buffer);
                            allGeneratedSlots.push(...generated);
                        });
                        // Add generatedSlots to the day settings object (cast to any to avoid TS error if type isn't updated yet)
                        (daySettings as any).generatedSlots = allGeneratedSlots;
                    } else if (daySettings) {
                        (daySettings as any).generatedSlots = [];
                    }
                });
            }

            const payload = updatedAvailability;
            const res = await ConsultantAPI.updateAvailability(consultantId, payload);
            if (res?.success) {
                setMessage({ type: "success", text: "Availability saved" });
                if (res?.data) setSettings((prev) => ({ ...(prev || {}), availability: res.data }));
            } else {
                setMessage({ type: "error", text: res?.message || "Save failed" });
            }
        } catch (err: any) {
            setMessage({ type: "error", text: err.response?.data?.message || "Error saving availability" });
        } finally {
            setSaving(false);
        }
    };

    const updateAvailabilityField = (field: keyof NonNullable<ConsultantSettings["availability"]>, value: any) => {
        if (!settings || readOnly) return;
        setSettings({ ...settings, availability: { ...(settings.availability || {}), [field]: value } });
    };

    const updateDayEnabled = (day: string, enabled: boolean) => {
        if (!settings || readOnly) return;
        const wh = { ...(settings.availability?.workingHours || {}) };
        wh[day] = { ...(wh[day] || { slots: [], enabled: false }), enabled };
        updateAvailabilityField("workingHours", wh);
    };

    const updateSlot = (day: string, index: number, field: "start" | "end", value: string) => {
        if (!settings || readOnly) return;
        const wh = { ...(settings.availability?.workingHours || {}) };
        const daySettings = { ...(wh[day] || { slots: [], enabled: true }) };
        const newSlots = [...daySettings.slots];

        if (newSlots[index]) {
            newSlots[index] = { ...newSlots[index], [field]: value };
        }

        daySettings.slots = newSlots;
        wh[day] = daySettings;
        updateAvailabilityField("workingHours", wh);
    };

    const addSlot = (day: string) => {
        if (!settings || readOnly) return;
        const wh = { ...(settings.availability?.workingHours || {}) };
        const daySettings = { ...(wh[day] || { slots: [], enabled: true }) };

        // Default new slot
        daySettings.slots = [...daySettings.slots, { start: "09:00", end: "17:00" }];
        daySettings.enabled = true; // Auto-enable day if adding slot

        wh[day] = daySettings;
        updateAvailabilityField("workingHours", wh);
    };

    const removeSlot = (day: string, index: number) => {
        if (!settings || readOnly) return;
        const wh = { ...(settings.availability?.workingHours || {}) };
        const daySettings = { ...(wh[day] || { slots: [], enabled: true }) };

        const newSlots = [...daySettings.slots];
        newSlots.splice(index, 1);
        daySettings.slots = newSlots;

        // If no slots left, maybe disable day? Optional.
        if (newSlots.length === 0) daySettings.enabled = false;

        wh[day] = daySettings;
        updateAvailabilityField("workingHours", wh);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-8">
                <div className="text-sm text-muted-foreground">Loading settings...</div>
            </div>
        );
    }

    if (!settings) {
        return (
            <div className="flex items-center justify-center py-8">
                <div className="text-sm text-red-600">Failed to load settings</div>
            </div>
        );
    }

    const avail = settings.availability!;
    const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

    // Get session settings for preview
    const duration = avail.sessionSettings?.defaultDuration || 60;
    const buffer = avail.sessionSettings?.bufferTime || 0;

    return (
        <div className="space-y-4">
            {message && (
                <div className={`p-3 rounded-lg flex items-center gap-2 ${message.type === "success" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}>
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm">{message.text}</span>
                </div>
            )}

            <div className="text-sm font-semibold">Practice Availability</div>

            <div className="rounded-xl border bg-white px-4 py-4 flex items-center justify-between">
                <div>
                    <div className="text-sm font-medium">Accepting New Clients</div>
                    <div className="text-xs text-muted-foreground">Allow new clients to book consultations</div>
                </div>
                <Switch checked={!!avail.acceptingNewClients} onCheckedChange={(v) => updateAvailabilityField("acceptingNewClients", !!v)} disabled={readOnly} />
            </div>

            <div className="rounded-xl border bg-white px-4 py-4 space-y-3">
                <div className="text-sm font-medium">Current Status</div>
                <div className="text-xs text-muted-foreground">Your availability status shown to clients</div>
                <div className="flex flex-wrap gap-2">
                    {(["available", "busy", "offline"] as const).map((s) => (
                        <Button
                            key={s}
                            variant={avail.currentStatus === s ? "default" : "outline"}
                            onClick={() => updateAvailabilityField("currentStatus", s)}
                            size="sm"
                            disabled={readOnly}
                            className={cn("rounded-full", avail.currentStatus === s ? "bg-blue-600 hover:bg-blue-700" : "bg-white", (readOnly && (avail.currentStatus !== s)) ? "opacity-50" : "")}
                        >
                            {s.charAt(0).toUpperCase() + s.slice(1)}
                        </Button>
                    ))}
                </div>
            </div>

            <div className="rounded-xl border bg-white px-4 py-4 space-y-3">
                <div className="text-sm font-medium">Session Settings</div>
                <div className="text-xs text-muted-foreground">Configure your consultation session parameters</div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                        <div className="text-xs text-muted-foreground">Session Duration (min)</div>
                        <Input type="number" value={avail.sessionSettings?.defaultDuration || 60} onChange={(e) => updateAvailabilityField("sessionSettings", { ...(avail.sessionSettings || {}), defaultDuration: parseInt(e.target.value) || 60 })} disabled={readOnly} />
                    </div>
                    <div className="space-y-1">
                        <div className="text-xs text-muted-foreground">Buffer Time (min)</div>
                        <Input type="number" value={avail.sessionSettings?.bufferTime || 0} onChange={(e) => updateAvailabilityField("sessionSettings", { ...(avail.sessionSettings || {}), bufferTime: parseInt(e.target.value) || 0 })} disabled={readOnly} />
                    </div>
                    <div className="space-y-1">
                        <div className="text-xs text-muted-foreground">Max Sessions/Day</div>
                        <Input type="number" value={avail.sessionSettings?.maxSessionsPerDay || 1} onChange={(e) => updateAvailabilityField("sessionSettings", { ...(avail.sessionSettings || {}), maxSessionsPerDay: parseInt(e.target.value) || 1 })} disabled={readOnly} />
                    </div>
                </div>
            </div>

            <div className="rounded-xl border bg-white px-4 py-4 space-y-3">
                <div className="text-sm font-medium">Working Hours</div>
                <div className="text-xs text-muted-foreground">Set your standard consultation hours. You can add multiple slots per day.</div>
                <div className="space-y-4">
                    {days.map((day) => {
                        const daySettings = (avail.workingHours && avail.workingHours[day]) || { slots: [], enabled: false };
                        return (
                            <div key={day} className="border-b pb-4 last:border-0 last:pb-0">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-3">
                                        <Switch checked={!!daySettings.enabled} onCheckedChange={(v) => updateDayEnabled(day, !!v)} disabled={readOnly} />
                                        <span className="text-sm capitalize font-medium">{day}</span>
                                    </div>
                                    {daySettings.enabled && !readOnly && (
                                        <Button variant="ghost" size="sm" onClick={() => addSlot(day)} className="h-7 text-xs gap-1 text-blue-600 hover:text-blue-700">
                                            <Plus className="h-3 w-3" /> Add Slot
                                        </Button>
                                    )}
                                </div>

                                {daySettings.enabled && (
                                    <div className="space-y-2 pl-12">
                                        {daySettings.slots.length === 0 && (
                                            <div className="text-xs text-muted-foreground italic">No slots added. Add a time slot to be available.</div>
                                        )}
                                        {daySettings.slots.map((slot, idx) => {
                                            const previewSlots = generatePreviewSlots(slot.start, slot.end, duration, buffer);
                                            return (
                                                <div key={idx} className="space-y-2">
                                                    <div className="flex items-center gap-2">
                                                        <Input
                                                            type="time"
                                                            value={slot.start}
                                                            onChange={(e) => updateSlot(day, idx, "start", e.target.value)}
                                                            className="w-32 h-8 text-sm"
                                                            disabled={readOnly}
                                                        />
                                                        <span className="text-xs text-muted-foreground">to</span>
                                                        <Input
                                                            type="time"
                                                            value={slot.end}
                                                            onChange={(e) => updateSlot(day, idx, "end", e.target.value)}
                                                            className="w-32 h-8 text-sm"
                                                            disabled={readOnly}
                                                        />
                                                        {!readOnly && (
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                                                                onClick={() => removeSlot(day, idx)}
                                                                title="Remove slot"
                                                            >
                                                                <Trash2 className="h-3 w-3" />
                                                            </Button>
                                                        )}
                                                    </div>

                                                    {/* Slot Preview */}
                                                    {previewSlots.length > 0 && (
                                                        <div className="bg-gray-50 rounded-md p-2 text-xs">
                                                            <div className="text-gray-500 mb-1 font-medium">Preview ({previewSlots.length} slots):</div>
                                                            <div className="flex flex-wrap gap-1">
                                                                {previewSlots.map((ps, i) => (
                                                                    <span key={i} className="inline-block px-2 py-0.5 bg-white border rounded text-gray-600">
                                                                        {ps}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {!readOnly && (
                <div className="flex items-center justify-end gap-2 pt-2">
                    <Button variant="outline" onClick={fetchSettings}>
                        Cancel
                    </Button>
                    <Button className="bg-blue-600 hover:bg-blue-700" onClick={saveAvailability} disabled={saving}>
                        {saving ? "Saving..." : "Save Changes"}
                    </Button>
                </div>
            )}
        </div>
    );
}
