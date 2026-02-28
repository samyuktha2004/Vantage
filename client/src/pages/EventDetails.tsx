import { DashboardLayout } from "@/components/Layout";
import { useAuth } from "@/hooks/use-auth";
import { useEvent } from "@/hooks/use-events";
import { useRoute, useLocation } from "wouter";
import ClientEventView from "./ClientEventView";
import { Loader2, Users, Tag, Gift, Inbox, Upload, FileSpreadsheet, Download, Eye, Edit, Plus, Trash2, Settings, FileDown, CheckSquare, BarChart3, Hotel, Plane, AlertTriangle, Globe, UserPlus, Copy } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useGuests, useDeleteGuest } from "@/hooks/use-guests";
import { useLabels } from "@/hooks/use-labels";
import { usePerks } from "@/hooks/use-perks";
import { useRequests } from "@/hooks/use-requests";
import { useHotelBookings } from "@/hooks/use-hotel-bookings";
import { format } from "date-fns";
import { useState } from "react";
import { parseExcelFile, parseCSVFile, generateGuestListTemplate, exportManifestToExcel } from "@/lib/excelParser";
import { generateEventReport } from "@/lib/reportGenerator";
import { useToast } from "@/hooks/use-toast";
import { GuestLinkManager } from "@/components/GuestLinkManager";
import { CapacityAlert } from "@/components/CapacityAlert";

export default function EventDetails() {
  const [match, params] = useRoute("/events/:id");
  const id = Number(params?.id);
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const { data: event, isLoading: isEventLoading } = useEvent(id);

  // Clients get a read+limited view instead of the full agent tabs
  if (user?.role === "client") {
    return (
      <DashboardLayout>
        <div className="mb-6">
          <h1 className="text-3xl font-serif text-primary">{event?.name ?? "Loading…"}</h1>
          {event?.location && <p className="text-muted-foreground mt-1">{event.location}</p>}
        </div>
        <ClientEventView eventId={id} />
      </DashboardLayout>
    );
  }
  
  // Get tab from URL query parameter
  const urlParams = new URLSearchParams(window.location.search);
  const initialTab = urlParams.get('tab') || 'guests';
  
  // Fetch related data
  const { data: guests, refetch: refetchGuests, isLoading: isLoadingGuests, error: guestsError } = useGuests(id);
  const { data: labels } = useLabels(id);
  const { data: perks } = usePerks(id);
  const { data: requests } = useRequests(id);
  const { data: hotelBookings } = useHotelBookings(id);
  const deleteGuest = useDeleteGuest();
  const { data: inventoryStatus } = useQuery({
    queryKey: ['inventory-status', id],
    queryFn: async () => {
      const res = await fetch(`/api/events/${id}/inventory/status`, { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!id,
    staleTime: 30000,
  });
  
  // Debug logging
  console.log('[DEBUG] Event ID:', id);
  console.log('[DEBUG] Guests data:', guests);
  console.log('[DEBUG] Guests loading:', isLoadingGuests);
  console.log('[DEBUG] Guests error:', guestsError);
  
  const [uploading, setUploading] = useState(false);
  const [showImportPreview, setShowImportPreview] = useState(false);
  const [importedGuests, setImportedGuests] = useState<any[]>([]);
  
  // Label management state
  const [newLabelName, setNewLabelName] = useState("");
  const [newLabelBudget, setNewLabelBudget] = useState(0);
  const [isAddingLabel, setIsAddingLabel] = useState(false);
  const [showLabelDialog, setShowLabelDialog] = useState(false);

  // Perk management state
  const [newPerkData, setNewPerkData] = useState({ name: "", description: "", type: "", unitCost: 0, pricingType: "requestable" });
  const [isAddingPerk, setIsAddingPerk] = useState(false);
  const [showPerkDialog, setShowPerkDialog] = useState(false);
  
  // Label-Perk assignment state
  const [selectedLabel, setSelectedLabel] = useState<any>(null);
  const [showAssignPerksDialog, setShowAssignPerksDialog] = useState(false);
  
  // Manual guest creation state
  const [showAddGuestDialog, setShowAddGuestDialog] = useState(false);
  const [isAddingGuest, setIsAddingGuest] = useState(false);
  const [newGuestData, setNewGuestData] = useState({
    name: "",
    email: "",
    phone: "",
    category: "",
    dietaryRestrictions: "",
    specialRequests: "",
  });
  
  const [isSeedingItinerary, setIsSeedingItinerary] = useState(false);

  // Publish state
  const [isPublishing, setIsPublishing] = useState(false);

  // Microsite appearance state
  const THEME_PRESETS: { value: string; label: string; color: string }[] = [
    { value: "navy",   label: "Navy",   color: "#1B2D5B" },
    { value: "rose",   label: "Rose",   color: "#9B2C2C" },
    { value: "forest", label: "Forest", color: "#1A4731" },
    { value: "slate",  label: "Slate",  color: "#334155" },
    { value: "gold",   label: "Gold",   color: "#92400E" },
    { value: "custom", label: "Custom", color: "" },
  ];
  const [micrositeData, setMicrositeData] = useState({
    coverMediaUrl: (event as any)?.coverMediaUrl ?? "",
    coverMediaType: (event as any)?.coverMediaType ?? "image",
    themePreset: (event as any)?.themePreset ?? "navy",
    themeColor: (event as any)?.themeColor ?? "#1B2D5B",
  });
  const [isSavingMicrosite, setIsSavingMicrosite] = useState(false);
  const handleSaveMicrositeSettings = async () => {
    setIsSavingMicrosite(true);
    try {
      const res = await fetch(`/api/events/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(micrositeData),
      });
      if (!res.ok) throw new Error("Failed to save settings");
      toast({ title: "Microsite settings saved" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setIsSavingMicrosite(false);
    }
  };

  // Staff account creation state
  const [showStaffDialog, setShowStaffDialog] = useState(false);
  const [isCreatingStaff, setIsCreatingStaff] = useState(false);
  const [staffData, setStaffData] = useState({ firstName: "", lastName: "", email: "", password: "" });

  const handlePublishEvent = async () => {
    setIsPublishing(true);
    try {
      const res = await fetch(`/api/events/${id}/publish`, { method: "POST", credentials: "include" });
      if (!res.ok) throw new Error("Failed to publish event");
      toast({ title: "Event published!", description: "Your event microsite is now live." });
      window.location.reload();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setIsPublishing(false);
    }
  };

  const handleCreateStaffAccount = async () => {
    if (!staffData.firstName || !staffData.email || !staffData.password) return;
    setIsCreatingStaff(true);
    try {
      const res = await fetch("/api/groundteam/create-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ...staffData, eventCode: event?.eventCode }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to create account");
      }
      toast({
        title: "Staff account created",
        description: `${staffData.firstName} can sign in at /auth/groundteam/signin`,
      });
      setStaffData({ firstName: "", lastName: "", email: "", password: "" });
      setShowStaffDialog(false);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setIsCreatingStaff(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      let parsedGuests: any[] = [];
      
      if (file.name.endsWith('.csv')) {
        parsedGuests = await parseCSVFile(file);
      } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        parsedGuests = await parseExcelFile(file);
      } else {
        throw new Error('Unsupported file type. Please upload .csv or .xlsx files.');
      }

      parsedGuests = parsedGuests.filter(g => g.name && g.name.trim() !== '');
      
      setImportedGuests(parsedGuests);
      setShowImportPreview(true);
      toast({ title: "File parsed!", description: `Found ${parsedGuests.length} guests` });
    } catch (error: any) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const handleImportToDatabase = async () => {
    setUploading(true);
    try {
      for (const guest of importedGuests) {
        await fetch(`/api/events/${id}/guests`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            eventId: id,
            name: guest.name,
            email: guest.email,
            phone: guest.phone ? String(guest.phone) : undefined,
            category: guest.category,
            dietaryRestrictions: guest.dietaryRestrictions,
            specialRequests: guest.specialRequests,
          }),
        });
      }

      toast({ title: "Import successful!", description: `${importedGuests.length} guests added` });
      setImportedGuests([]);
      setShowImportPreview(false);
      
      // Force refetch and wait for it
      await refetchGuests();
      
      // Small delay to ensure UI updates
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (error: any) {
      toast({ title: "Import failed", description: error.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  // Label handlers
  const handleCreateLabel = async () => {
    if (!newLabelName.trim()) return;
    
    setIsAddingLabel(true);
    try {
      const response = await fetch(`/api/events/${id}/labels`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId: id, name: newLabelName, addOnBudget: newLabelBudget }),
      });

      if (!response.ok) throw new Error('Failed to create label');

      toast({ title: "Label created", description: `${newLabelName} has been added` });
      setNewLabelName("");
      setNewLabelBudget(0);
      setShowLabelDialog(false);
      window.location.reload(); // Refresh to show new label
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsAddingLabel(false);
    }
  };

  // Perk handlers
  const handleCreatePerk = async () => {
    if (!newPerkData.name.trim()) return;
    
    setIsAddingPerk(true);
    try {
      const response = await fetch(`/api/events/${id}/perks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId: id, ...newPerkData }),
      });

      if (!response.ok) throw new Error('Failed to create perk');
      
      toast({ title: "Perk created", description: `${newPerkData.name} has been added` });
      setNewPerkData({ name: "", description: "", type: "", unitCost: 0, pricingType: "requestable" });
      setShowPerkDialog(false);
      window.location.reload(); // Refresh to show new perk
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsAddingPerk(false);
    }
  };

  const handleDeleteGuest = async (guestId: number, guestName: string) => {
    if (!confirm(`Are you sure you want to remove ${guestName} from the guest list?`)) {
      return;
    }

    try {
      await deleteGuest.mutateAsync({ id: guestId, eventId: id });
      toast({ 
        title: "Guest removed", 
        description: `${guestName} has been removed from the guest list` 
      });
    } catch (error: any) {
      toast({ 
        title: "Failed to remove guest", 
        description: error.message, 
        variant: "destructive" 
      });
    }
  };

  const handleAddGuest = async () => {
    if (!newGuestData.name.trim() || !newGuestData.email.trim()) {
      toast({ 
        title: "Missing required fields", 
        description: "Name and email are required", 
        variant: "destructive" 
      });
      return;
    }
    
    setIsAddingGuest(true);
    try {
      const response = await fetch(`/api/events/${id}/guests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: id,
          name: newGuestData.name,
          email: newGuestData.email,
          phone: newGuestData.phone || undefined,
          category: newGuestData.category || undefined,
          dietaryRestrictions: newGuestData.dietaryRestrictions || undefined,
          specialRequests: newGuestData.specialRequests || undefined,
        }),
      });

      if (!response.ok) throw new Error('Failed to add guest');
      
      toast({ 
        title: "Guest added", 
        description: `${newGuestData.name} has been added to the guest list` 
      });
      
      // Reset form
      setNewGuestData({
        name: "",
        email: "",
        phone: "",
        category: "",
        dietaryRestrictions: "",
        specialRequests: "",
      });
      setShowAddGuestDialog(false);
      
      // Refresh guest list
      await refetchGuests();
    } catch (error: any) {
      toast({ 
        title: "Failed to add guest", 
        description: error.message, 
        variant: "destructive" 
      });
    } finally {
      setIsAddingGuest(false);
    }
  };

  const handleSeedItinerary = async () => {
    setIsSeedingItinerary(true);
    try {
      const response = await fetch(`/api/events/${id}/seed-itinerary`, {
        method: 'POST',
      });

      if (!response.ok) throw new Error('Failed to seed itinerary');
      
      const result = await response.json();
      
      toast({ 
        title: "Itinerary seeded!", 
        description: `Added ${result.count} sample events with deliberate conflicts for testing`,
        duration: 5000,
      });
    } catch (error: any) {
      toast({ 
        title: "Failed to seed itinerary", 
        description: error.message, 
        variant: "destructive" 
      });
    } finally {
      setIsSeedingItinerary(false);
    }
  };

  const handleDownloadManifest = async () => {
    try {
      const res = await fetch(`/api/events/${id}/manifest`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to generate manifest");
      const data = await res.json();
      exportManifestToExcel(data.guests, data.eventName);
      toast({ title: "Manifest downloaded!", description: `${data.guests.length} guests exported` });
    } catch (error: any) {
      toast({ title: "Download failed", description: error.message, variant: "destructive" });
    }
  };

  const handleDownloadReport = () => {
    try {
      generateEventReport({
        event,
        guests: guests || [],
        labels: labels || [],
        perks: perks || [],
        requests: requests || [],
        hotelBookings: hotelBookings || [],
      });
      toast({ 
        title: "Report downloaded!", 
        description: "Your event report has been saved" 
      });
    } catch (error: any) {
      toast({ 
        title: "Download failed", 
        description: error.message, 
        variant: "destructive" 
      });
    }
  };

  const handleAssignPerksToLabel = async (labelId: number, perkId: number, isEnabled: boolean) => {
    try {
      const response = await fetch(`/api/labels/${labelId}/perks/${perkId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isEnabled, expenseHandledByClient: false }),
      });

      if (!response.ok) throw new Error('Failed to update perk assignment');
      
      toast({ title: "Updated", description: "Perk assignment updated" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  if (isEventLoading || !event) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border/50 pb-6">
          <div>
            <div className="text-sm text-accent-foreground/80 font-medium mb-1 uppercase tracking-wider">Event Dashboard</div>
            <h1 className="text-4xl font-serif text-primary mb-2">{event.name}</h1>
            <div className="flex gap-4 text-sm text-muted-foreground">
              <span>{format(new Date(event.date), "PPP p")}</span>
              <span>•</span>
              <span>{event.location}</span>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">Event Code:</span>
              <code className="text-sm font-mono font-bold bg-primary/10 text-primary px-3 py-1 rounded-md border border-primary/20">
                {event.eventCode}
              </code>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => {
                  navigator.clipboard.writeText(event.eventCode);
                  toast({ title: "Copied!", description: "Event code copied to clipboard" });
                }}
              >
                Copy
              </Button>
            </div>
          </div>
          <div className="flex gap-2 items-end">
            <div className="text-right hidden md:block mr-4">
              <div className="text-2xl font-serif font-bold text-primary">{guests?.length || 0}</div>
              <div className="text-xs text-muted-foreground uppercase">Guests</div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadReport}
              className="gap-2"
            >
              <FileDown className="w-4 h-4" />
              Download Report
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSeedItinerary}
              disabled={isSeedingItinerary}
              className="gap-2"
            >
              {isSeedingItinerary ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Seeding...
                </>
              ) : (
                <>
                  <Settings className="w-4 h-4" />
                  Add Demo Events
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/events/${id}/setup`)}
              className="gap-2"
            >
              <Edit className="w-4 h-4" />
              Edit Setup
            </Button>
            <Button
              size="sm"
              onClick={() => navigate(`/events/${id}/preview`)}
              className="gap-2"
            >
              <Eye className="w-4 h-4" />
              Preview Event
            </Button>
            {!event.isPublished ? (
              <Button
                size="sm"
                variant="default"
                onClick={handlePublishEvent}
                disabled={isPublishing}
                className="gap-2 bg-green-600 hover:bg-green-700"
              >
                {isPublishing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Globe className="w-4 h-4" />
                )}
                Publish Event
              </Button>
            ) : (
              <>
                <span className="flex items-center gap-1.5 text-xs text-green-700 bg-green-50 border border-green-200 px-3 py-1.5 rounded-md font-medium">
                  <Globe className="w-3.5 h-3.5" /> Published
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/event/${event.eventCode}`);
                    toast({ title: "Link copied!", description: `Invite link for ${event.eventCode} copied to clipboard` });
                  }}
                >
                  <Copy className="w-3 h-3" /> Copy invite link
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="gap-1.5 font-mono text-xs"
                  onClick={() => {
                    navigator.clipboard.writeText(event.eventCode);
                    toast({ title: "Event code copied!", description: event.eventCode });
                  }}
                >
                  <Copy className="w-3 h-3" /> {event.eventCode}
                </Button>
              </>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowStaffDialog(true)}
              className="gap-2"
            >
              <UserPlus className="w-4 h-4" />
              Add Staff
            </Button>
          </div>
        </div>
      </div>

      {/* Create Staff Account Dialog */}
      <Dialog open={showStaffDialog} onOpenChange={setShowStaffDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Ground Team Account</DialogTitle>
            <DialogDescription>
              Create a sign-in account for on-site event staff. They will be scoped to this event only.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="staffFirst">First Name *</Label>
                <Input
                  id="staffFirst"
                  placeholder="First name"
                  value={staffData.firstName}
                  onChange={(e) => setStaffData({ ...staffData, firstName: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="staffLast">Last Name</Label>
                <Input
                  id="staffLast"
                  placeholder="Last name"
                  value={staffData.lastName}
                  onChange={(e) => setStaffData({ ...staffData, lastName: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="staffEmail">Email *</Label>
              <Input
                id="staffEmail"
                type="email"
                placeholder="staff@example.com"
                value={staffData.email}
                onChange={(e) => setStaffData({ ...staffData, email: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="staffPass">Password *</Label>
              <Input
                id="staffPass"
                type="password"
                placeholder="Min. 6 characters"
                value={staffData.password}
                onChange={(e) => setStaffData({ ...staffData, password: e.target.value })}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Staff will sign in at <code className="bg-muted px-1 rounded">/auth/groundteam/signin</code> and will be automatically directed to this event's check-in dashboard.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStaffDialog(false)}>Cancel</Button>
            <Button
              onClick={handleCreateStaffAccount}
              disabled={isCreatingStaff || !staffData.firstName || !staffData.email || !staffData.password}
            >
              {isCreatingStaff ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating…</> : "Create Account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Capacity Alert */}
      {hotelBookings && hotelBookings.length > 0 && (
        <CapacityAlert 
          totalRooms={hotelBookings.reduce((sum: number, booking: any) => sum + (booking.numberOfRooms || 0), 0)}
          totalGuests={guests?.length || 0}
          className="mb-6"
        />
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-4 rounded-xl border border-border/50 shadow-sm">
          <div className="text-muted-foreground text-xs uppercase mb-1">Total Guests</div>
          <div className="text-2xl font-serif text-primary">{guests?.length || 0}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-border/50 shadow-sm">
          <div className="text-muted-foreground text-xs uppercase mb-1">Pending Requests</div>
          <div className="text-2xl font-serif text-accent-foreground">{requests?.filter(r => r.status === 'pending').length || 0}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-border/50 shadow-sm">
          <div className="text-muted-foreground text-xs uppercase mb-1">VIP Labels</div>
          <div className="text-2xl font-serif text-primary">{labels?.length || 0}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-border/50 shadow-sm">
          <div className="text-muted-foreground text-xs uppercase mb-1">Active Perks</div>
          <div className="text-2xl font-serif text-primary">{perks?.length || 0}</div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mb-6 bg-gradient-to-r from-primary/5 to-accent/5 p-4 rounded-xl border border-primary/20">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-sm mb-1">Quick Actions</h3>
            <p className="text-xs text-muted-foreground">Manage your event settings</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/events/${id}/approval`)}
              className="gap-2 relative"
            >
              <CheckSquare className="w-4 h-4" />
              Review & Payment
              {(requests ?? []).filter((r: any) => r.status === 'pending').length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                  {(requests ?? []).filter((r: any) => r.status === 'pending').length}
                </span>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowLabelDialog(true)}
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Label
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPerkDialog(true)}
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Perk
            </Button>
          </div>
        </div>
      </div>
      {/* Capacity Alert */}
      {hotelBookings && hotelBookings.length > 0 && (
        <CapacityAlert 
          totalRooms={hotelBookings.reduce((sum: number, booking: any) => sum + (booking.numberOfRooms || 0), 0)}
          totalGuests={guests?.length || 0}
          className="mb-6"
        />
      )}
      {/* Tabs */}
      <Tabs defaultValue={initialTab} className="w-full">
        <TabsList className="bg-white border border-border/50 p-1 mb-6 rounded-xl flex-wrap">
          <TabsTrigger value="guests" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white">Guests</TabsTrigger>
          <TabsTrigger value="labels" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white">Labels & Permissions</TabsTrigger>
          <TabsTrigger value="perks" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white">Perks & Add-ons</TabsTrigger>
          <TabsTrigger value="requests" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white">Requests</TabsTrigger>
          <TabsTrigger value="inventory" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white">
            <BarChart3 className="w-3.5 h-3.5 mr-1.5" />Inventory
          </TabsTrigger>
          <TabsTrigger value="microsite" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white">
            <Globe className="w-3.5 h-3.5 mr-1.5" />Microsite
          </TabsTrigger>
        </TabsList>

        <TabsContent value="guests" className="space-y-4">
          {/* Import Section */}
          <div className="grid md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Download className="w-4 h-4" />
                  Download Template
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Button onClick={generateGuestListTemplate} variant="outline" className="w-full">
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  Excel Template
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Upload className="w-4 h-4" />
                  Import Guests
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Input type="file" accept=".csv,.xlsx,.xls" onChange={handleFileUpload} disabled={uploading} />
                {uploading && <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="w-3 h-3 animate-spin" />Processing...</div>}
              </CardContent>
            </Card>

            <Card className="border-emerald-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileDown className="w-4 h-4 text-emerald-600" />
                  Ground Team Manifest
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Button onClick={handleDownloadManifest} variant="outline" className="w-full border-emerald-300 text-emerald-700 hover:bg-emerald-50">
                  <Download className="w-4 h-4 mr-2" />
                  Download Manifest
                </Button>
                <p className="text-xs text-muted-foreground mt-2">Full Excel with PNR, meal, room, emergency contacts</p>
              </CardContent>
            </Card>
          </div>

          {/* Preview */}
          {showImportPreview && importedGuests.length > 0 && (
            <Card className="border-primary">
              <CardHeader>
                <CardTitle className="text-base">Preview ({importedGuests.length} guests)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="max-h-48 overflow-auto border rounded">
                  <table className="w-full text-sm">
                    <thead className="border-b bg-muted/50 sticky top-0">
                      <tr>
                        <th className="p-2 text-left">Name</th>
                        <th className="p-2 text-left">Email</th>
                        <th className="p-2 text-left">Category</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importedGuests.map((g, i) => (
                        <tr key={i} className="border-b">
                          <td className="p-2">{g.name}</td>
                          <td className="p-2 text-muted-foreground">{g.email}</td>
                          <td className="p-2"><span className="px-2 py-0.5 bg-primary/10 text-primary rounded text-xs">{g.category || 'General'}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-4 flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => { setImportedGuests([]); setShowImportPreview(false); }}>Cancel</Button>
                  <Button size="sm" onClick={handleImportToDatabase} disabled={uploading}>
                    {uploading ? <><Loader2 className="w-3 h-3 mr-2 animate-spin" />Importing...</> : `Import ${importedGuests.length}`}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
          
          <div className="bg-white rounded-2xl border border-border/50 overflow-hidden shadow-sm">
            <div className="p-4 border-b border-border/50 bg-muted/20 flex justify-between items-center">
              <h3 className="font-medium">Guest List ({guests?.length || 0})</h3>
              <Button size="sm" onClick={() => setShowAddGuestDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Guest
              </Button>
            </div>
            <div className="divide-y divide-border/50">
              {guests?.map(guest => (
                <div key={guest.id} className="p-4 flex items-center justify-between hover:bg-muted/10 transition-colors">
                  <div className="flex-1">
                    <div className="font-medium text-primary">{guest.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {guest.email && <span>{guest.email}</span>}
                      {guest.phone && <span> • {guest.phone}</span>}
                    </div>
                    {guest.category && (
                      <span className="inline-block mt-1 px-2 py-0.5 bg-primary/10 text-primary rounded text-xs">{guest.category}</span>
                    )}
                    {guest.status && (
                      <span className={`inline-block mt-1 ml-2 px-2 py-0.5 rounded text-xs ${
                        guest.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                        guest.status === 'declined' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {guest.status}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <GuestLinkManager guest={guest} />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteGuest(guest.id, guest.name)}
                      disabled={deleteGuest.isPending}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
              {guests?.length === 0 && (
                <div className="p-8 text-center text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-2 opacity-20" />
                  <p>No guests yet. Upload an Excel file to import.</p>
                </div>
              )}
            </div>
          </div>
          
          {/* Add Guest Dialog */}
          <Dialog open={showAddGuestDialog} onOpenChange={setShowAddGuestDialog}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Add Guest</DialogTitle>
                <DialogDescription>
                  Manually add a single guest to the event
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="guestName">
                    Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="guestName"
                    placeholder="Full name"
                    value={newGuestData.name}
                    onChange={(e) => setNewGuestData({ ...newGuestData, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="guestEmail">
                    Email <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="guestEmail"
                    type="email"
                    placeholder="email@example.com"
                    value={newGuestData.email}
                    onChange={(e) => setNewGuestData({ ...newGuestData, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="guestPhone">Phone</Label>
                  <Input
                    id="guestPhone"
                    placeholder="Phone number"
                    value={newGuestData.phone}
                    onChange={(e) => setNewGuestData({ ...newGuestData, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="guestCategory">Category</Label>
                  <Input
                    id="guestCategory"
                    placeholder="e.g., VIP, General, Family"
                    value={newGuestData.category}
                    onChange={(e) => setNewGuestData({ ...newGuestData, category: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="guestDietary">Dietary Restrictions</Label>
                  <Input
                    id="guestDietary"
                    placeholder="e.g., Vegetarian, Gluten-free"
                    value={newGuestData.dietaryRestrictions}
                    onChange={(e) => setNewGuestData({ ...newGuestData, dietaryRestrictions: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="guestRequests">Special Requests</Label>
                  <Input
                    id="guestRequests"
                    placeholder="Any special accommodations"
                    value={newGuestData.specialRequests}
                    onChange={(e) => setNewGuestData({ ...newGuestData, specialRequests: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowAddGuestDialog(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleAddGuest} 
                  disabled={isAddingGuest || !newGuestData.name.trim() || !newGuestData.email.trim()}
                >
                  {isAddingGuest ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    "Add Guest"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="labels" className="space-y-4">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-lg font-sans font-medium">Guest Labels & Permissions</h3>
              <p className="text-sm text-muted-foreground">Create categories and assign perks to each label</p>
            </div>
            <Dialog open={showLabelDialog} onOpenChange={setShowLabelDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Label
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Label</DialogTitle>
                  <DialogDescription>
                    Create a category for your guests (e.g., VIP, Staff, Friend, Family)
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label htmlFor="labelName">Label Name</Label>
                    <Input
                      id="labelName"
                      placeholder="e.g., VIP Guest"
                      value={newLabelName}
                      onChange={(e) => setNewLabelName(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="labelBudget">Add-on Budget (₹ per guest)</Label>
                    <Input
                      id="labelBudget"
                      type="number"
                      min={0}
                      placeholder="e.g., 5000"
                      value={newLabelBudget || ""}
                      onChange={(e) => setNewLabelBudget(Number(e.target.value) || 0)}
                    />
                    <p className="text-xs text-muted-foreground mt-1">Amount guests in this tier can spend on requestable add-ons. 0 = no discretionary budget.</p>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowLabelDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateLabel} disabled={isAddingLabel || !newLabelName.trim()}>
                    {isAddingLabel ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating...</> : "Create Label"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4">
            {labels?.map((label: any) => (
              <Card key={label.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base">{label.name}</CardTitle>
                      <CardDescription className="mt-1">
                        {label.addOnBudget > 0
                          ? `Add-on budget: ₹${label.addOnBudget.toLocaleString()} per guest`
                          : "No discretionary add-on budget"}
                      </CardDescription>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedLabel(label);
                        setShowAssignPerksDialog(true);
                      }}
                    >
                      <Settings className="w-4 h-4 mr-2" />
                      Assign Perks
                    </Button>
                  </div>
                </CardHeader>
              </Card>
            ))}

            {labels?.length === 0 && (
              <div className="bg-white rounded-2xl border border-border/50 p-8 text-center">
                <Tag className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="text-lg font-medium">No Labels Yet</h3>
                <p className="text-muted-foreground mt-2 max-w-md mx-auto">
                  Create labels to categorize your guests and control their access to perks.
                </p>
              </div>
            )}
          </div>

          {/* Assign Perks Dialog */}
          <Dialog open={showAssignPerksDialog} onOpenChange={setShowAssignPerksDialog}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Assign Perks to {selectedLabel?.name}</DialogTitle>
                <DialogDescription>
                  Select which perks guests with this label can see and request
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2 max-h-96 overflow-y-auto py-4">
                {perks?.map(perk => (
                  <div key={perk.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium">{perk.name}</div>
                      <div className="text-sm text-muted-foreground">{perk.description}</div>
                      {perk.type && (
                        <span className="inline-block mt-1 px-2 py-0.5 bg-primary/10 text-primary rounded text-xs">
                          {perk.type}
                        </span>
                      )}
                    </div>
                    <Checkbox
                      onCheckedChange={(checked) => handleAssignPerksToLabel(selectedLabel?.id, perk.id, !!checked)}
                    />
                  </div>
                ))}
                {perks?.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    No perks available. Create perks first in the Perks & Add-ons tab.
                  </p>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>
        
        <TabsContent value="perks" className="space-y-4">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-lg font-medium">Perks & Add-ons</h3>
              <p className="text-sm text-muted-foreground">Define services guests can request</p>
            </div>
            <Dialog open={showPerkDialog} onOpenChange={setShowPerkDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Perk
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Perk</DialogTitle>
                  <DialogDescription>
                    Add a service or amenity that guests can request
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label htmlFor="perkName">Perk Name</Label>
                    <Input
                      id="perkName"
                      placeholder="e.g., Airport Pickup"
                      value={newPerkData.name}
                      onChange={(e) => setNewPerkData({ ...newPerkData, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="perkDescription">Description</Label>
                    <Input
                      id="perkDescription"
                      placeholder="e.g., Complimentary airport transfer service"
                      value={newPerkData.description}
                      onChange={(e) => setNewPerkData({ ...newPerkData, description: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="perkType">Type</Label>
                    <Input
                      id="perkType"
                      placeholder="e.g., transport, accommodation, meal, activity"
                      value={newPerkData.type}
                      onChange={(e) => setNewPerkData({ ...newPerkData, type: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="perkUnitCost">Unit Cost (₹)</Label>
                    <Input
                      id="perkUnitCost"
                      type="number"
                      min={0}
                      placeholder="e.g., 1500"
                      value={newPerkData.unitCost || ""}
                      onChange={(e) => setNewPerkData({ ...newPerkData, unitCost: Number(e.target.value) || 0 })}
                    />
                    <p className="text-xs text-muted-foreground mt-1">0 = included at no cost</p>
                  </div>
                  <div>
                    <Label htmlFor="perkPricingType">Pricing Type</Label>
                    <select
                      id="perkPricingType"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                      value={newPerkData.pricingType}
                      onChange={(e) => setNewPerkData({ ...newPerkData, pricingType: e.target.value })}
                    >
                      <option value="included">Included — host covers, no budget deduction</option>
                      <option value="requestable">Requestable — deducted from guest's add-on budget</option>
                      <option value="self_pay">Self-pay — guest pays directly</option>
                    </select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowPerkDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreatePerk} disabled={isAddingPerk || !newPerkData.name.trim()}>
                    {isAddingPerk ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating...</> : "Create Perk"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4">
            {perks?.map((perk: any) => (
              <Card key={perk.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">{perk.name}</CardTitle>
                      <CardDescription>{perk.description}</CardDescription>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0 ml-4">
                      {perk.unitCost > 0 && (
                        <span className="text-sm font-semibold text-primary">₹{perk.unitCost.toLocaleString()}</span>
                      )}
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        perk.pricingType === "included" ? "bg-green-100 text-green-700" :
                        perk.pricingType === "self_pay" ? "bg-blue-100 text-blue-700" :
                        "bg-amber-100 text-amber-700"
                      }`}>
                        {perk.pricingType === "included" ? "Included" :
                         perk.pricingType === "self_pay" ? "Self-pay" : "Requestable"}
                      </span>
                    </div>
                  </div>
                </CardHeader>
                {perk.type && (
                  <CardContent>
                    <span className="inline-block px-3 py-1 bg-primary/10 text-primary rounded-full text-sm">
                      {perk.type}
                    </span>
                  </CardContent>
                )}
              </Card>
            ))}

            {perks?.length === 0 && (
              <div className="bg-white rounded-2xl border border-border/50 p-8 text-center">
                <Gift className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="text-lg font-medium">No Perks Yet</h3>
                <p className="text-muted-foreground mt-2 max-w-md mx-auto">
                  Create perks like Airport Pickup, Spa Treatments, or Room Upgrades for your guests.
                </p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="requests">
          <div className="bg-white rounded-2xl border border-border/50 p-8 text-center">
            <Inbox className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-medium">Guest Requests</h3>
            <p className="text-muted-foreground mt-2 max-w-md mx-auto">Review and approve special requests from guests.</p>
          </div>
        </TabsContent>

        {/* ── Inventory Tab ── */}
        <TabsContent value="inventory" className="space-y-4">
          {/* EWS — Inventory Early Warning System */}
          {inventoryStatus && (
            <>
              {inventoryStatus.hotelAlerts?.filter((a: any) => a.severity !== "ok").map((alert: any, i: number) => (
                <div key={i} className={`flex items-start gap-3 p-4 rounded-lg border ${alert.severity === "critical" ? "bg-red-50 border-red-200" : "bg-amber-50 border-amber-200"}`}>
                  <AlertTriangle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${alert.severity === "critical" ? "text-red-600" : "text-amber-600"}`} />
                  <div>
                    <p className={`font-semibold text-sm ${alert.severity === "critical" ? "text-red-800" : "text-amber-800"}`}>
                      {alert.hotelName} — {alert.utilizationPct}% utilized
                    </p>
                    <p className={`text-xs mt-0.5 ${alert.severity === "critical" ? "text-red-700" : "text-amber-700"}`}>{alert.message}</p>
                  </div>
                </div>
              ))}
              {inventoryStatus.flightAlerts?.filter((a: any) => a.severity !== "ok").map((alert: any, i: number) => (
                <div key={i} className={`flex items-start gap-3 p-4 rounded-lg border ${alert.severity === "critical" ? "bg-red-50 border-red-200" : "bg-amber-50 border-amber-200"}`}>
                  <AlertTriangle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${alert.severity === "critical" ? "text-red-600" : "text-amber-600"}`} />
                  <div>
                    <p className={`font-semibold text-sm ${alert.severity === "critical" ? "text-red-800" : "text-amber-800"}`}>
                      Flight Block — {alert.utilizationPct}% utilized
                    </p>
                    <p className={`text-xs mt-0.5 ${alert.severity === "critical" ? "text-red-700" : "text-amber-700"}`}>{alert.message}</p>
                  </div>
                </div>
              ))}
            </>
          )}
          <InventoryTab eventId={id} />
        </TabsContent>

        {/* ── Microsite Appearance Tab ── */}
        <TabsContent value="microsite" className="space-y-6 max-w-2xl">
          <div>
            <h3 className="text-lg font-medium mb-1">Microsite Appearance</h3>
            <p className="text-sm text-muted-foreground">
              Customise how your event invite page looks at <code className="text-xs bg-muted px-1 rounded">/event/{event?.eventCode}</code>
            </p>
          </div>

          {/* Cover Media */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Cover Image / Video</CardTitle>
              <CardDescription>Displayed as a full-width hero behind the event title</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-3">
                <button
                  className={`px-4 py-2 rounded border text-sm font-medium transition-colors ${micrositeData.coverMediaType === "image" ? "bg-primary text-white border-primary" : "border-input"}`}
                  onClick={() => setMicrositeData({ ...micrositeData, coverMediaType: "image" })}
                >
                  Image
                </button>
                <button
                  className={`px-4 py-2 rounded border text-sm font-medium transition-colors ${micrositeData.coverMediaType === "video" ? "bg-primary text-white border-primary" : "border-input"}`}
                  onClick={() => setMicrositeData({ ...micrositeData, coverMediaType: "video" })}
                >
                  Video
                </button>
              </div>
              <div>
                <Label htmlFor="coverMediaUrl">
                  {micrositeData.coverMediaType === "video" ? "Video URL (MP4, WebM)" : "Image URL"}
                </Label>
                <Input
                  id="coverMediaUrl"
                  placeholder={micrositeData.coverMediaType === "video" ? "https://example.com/event-video.mp4" : "https://example.com/event-cover.jpg"}
                  value={micrositeData.coverMediaUrl}
                  onChange={(e) => setMicrositeData({ ...micrositeData, coverMediaUrl: e.target.value })}
                />
                <p className="text-xs text-muted-foreground mt-1">Leave blank for a solid-color hero</p>
              </div>
              {micrositeData.coverMediaUrl && micrositeData.coverMediaType === "image" && (
                <img
                  src={micrositeData.coverMediaUrl}
                  alt="Cover preview"
                  className="w-full h-32 object-cover rounded-lg border"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              )}
            </CardContent>
          </Card>

          {/* Theme Color */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Theme Colour</CardTitle>
              <CardDescription>Controls the hero background, buttons, and accent colours on the microsite</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {THEME_PRESETS.map(preset => (
                  <button
                    key={preset.value}
                    onClick={() => setMicrositeData({
                      ...micrositeData,
                      themePreset: preset.value,
                      themeColor: preset.value !== "custom" ? preset.color : micrositeData.themeColor,
                    })}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
                      micrositeData.themePreset === preset.value ? "ring-2 ring-primary ring-offset-1 border-primary" : "border-input"
                    }`}
                  >
                    {preset.value !== "custom" && (
                      <span className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: preset.color }} />
                    )}
                    {preset.label}
                  </button>
                ))}
              </div>
              {micrositeData.themePreset === "custom" && (
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={micrositeData.themeColor}
                    onChange={(e) => setMicrositeData({ ...micrositeData, themeColor: e.target.value })}
                    className="w-10 h-10 rounded border border-input cursor-pointer"
                  />
                  <Input
                    className="w-40 font-mono text-sm"
                    value={micrositeData.themeColor}
                    onChange={(e) => setMicrositeData({ ...micrositeData, themeColor: e.target.value })}
                    placeholder="#1B2D5B"
                  />
                  <div
                    className="w-16 h-10 rounded-lg border"
                    style={{ backgroundColor: micrositeData.themeColor }}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          <Button onClick={handleSaveMicrositeSettings} disabled={isSavingMicrosite} className="w-full">
            {isSavingMicrosite ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : "Save Microsite Settings"}
          </Button>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}

// ── Inventory Tab Component ──────────────────────────────────────────────────

function ProgressBar({ value, max, color = "bg-primary" }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  const isLow = pct >= 90;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{value} / {max}</span>
        <span className={isLow ? "text-destructive font-semibold" : ""}>{pct}%{isLow ? " ⚠" : ""}</span>
      </div>
      <div className="w-full bg-muted rounded-full h-2.5">
        <div
          className={`h-2.5 rounded-full transition-all ${isLow ? "bg-destructive" : color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function InventoryTab({ eventId }: { eventId: number }) {
  const { data: inventory = [], isLoading } = useQuery({
    queryKey: ["inventory", eventId],
    queryFn: async () => {
      const res = await fetch(`/api/events/${eventId}/inventory`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load inventory");
      return res.json();
    },
    enabled: !!eventId,
  });

  const { data: hotelBookings = [] } = useQuery({
    queryKey: ["hotel-bookings", eventId],
    queryFn: async () => {
      const res = await fetch(`/api/events/${eventId}/hotel-bookings`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!eventId,
  });

  const { data: travelOptions = [] } = useQuery({
    queryKey: ["travel-options", eventId],
    queryFn: async () => {
      const res = await fetch(`/api/events/${eventId}/travel-options`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!eventId,
  });

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  const hotelInventory = (inventory as any[]).filter((i: any) => i.inventoryType === "hotel");
  const flightInventory = (inventory as any[]).filter((i: any) => i.inventoryType === "flight");

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Rooms Blocked", value: hotelInventory.reduce((s: number, i: any) => s + (i.roomsBlocked ?? 0), 0), icon: Hotel },
          { label: "Rooms Confirmed", value: hotelInventory.reduce((s: number, i: any) => s + (i.roomsConfirmed ?? 0), 0), icon: Hotel },
          { label: "Seats Allocated", value: flightInventory.reduce((s: number, i: any) => s + (i.seatsAllocated ?? 0), 0), icon: Plane },
          { label: "Seats Confirmed", value: flightInventory.reduce((s: number, i: any) => s + (i.seatsConfirmed ?? 0), 0), icon: Plane },
        ].map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardContent className="p-4 flex items-center gap-3">
              <Icon className="w-5 h-5 text-primary shrink-0" />
              <div>
                <p className="text-2xl font-bold">{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Hotel bookings */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Hotel className="w-4 h-4 text-primary" /> Hotel Allocation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {(hotelBookings as any[]).length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No hotel bookings yet.</p>
          ) : (
            (hotelBookings as any[]).map((booking: any) => {
              const inv = hotelInventory.find((i: any) => i.hotelBookingId === booking.id);
              const blocked = inv?.roomsBlocked ?? booking.numberOfRooms ?? 0;
              const confirmed = inv?.roomsConfirmed ?? 0;
              return (
                <div key={booking.id} className="space-y-2 p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-sm">{booking.hotelName}</p>
                    {booking.tboHotelData && (
                      <span className="text-xs text-primary bg-primary/10 px-2 py-0.5 rounded">TBO</span>
                    )}
                  </div>
                  {booking.checkInDate && booking.checkOutDate && (
                    <p className="text-xs text-muted-foreground">
                      {new Date(booking.checkInDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                      {" – "}
                      {new Date(booking.checkOutDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  )}
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Rooms blocked → confirmed</p>
                    <ProgressBar value={confirmed} max={blocked} />
                  </div>
                  {blocked > 0 && ((blocked - confirmed) / blocked) < 0.1 && (
                    <div className="flex items-center gap-1.5 text-xs text-destructive">
                      <AlertTriangle className="w-3 h-3" />
                      Less than 10% rooms remaining
                    </div>
                  )}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* Flight allocation */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Plane className="w-4 h-4 text-primary" /> Flight Allocation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {(travelOptions as any[]).length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No flight bookings yet.</p>
          ) : (
            (travelOptions as any[]).map((opt: any) => {
              const inv = flightInventory.find((i: any) => i.travelOptionId === opt.id);
              const allocated = inv?.seatsAllocated ?? 0;
              const confirmed = inv?.seatsConfirmed ?? 0;
              return (
                <div key={opt.id} className="space-y-2 p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-sm capitalize">
                      {opt.travelMode}
                      {opt.fromLocation && opt.toLocation ? ` — ${opt.fromLocation} → ${opt.toLocation}` : ""}
                    </p>
                    {opt.tboFlightData && (
                      <span className="text-xs text-primary bg-primary/10 px-2 py-0.5 rounded">TBO</span>
                    )}
                  </div>
                  {opt.tboFlightData?.pnr && (
                    <p className="text-xs font-mono text-muted-foreground">PNR: {opt.tboFlightData.pnr}</p>
                  )}
                  {allocated > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Seats allocated → confirmed</p>
                      <ProgressBar value={confirmed} max={allocated} />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
