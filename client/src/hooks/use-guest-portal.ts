import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";

/**
 * Hook to access guest portal with token
 */
export function useGuestPortal(token: string) {
  return useQuery({
    queryKey: ['guest-portal', token],
    queryFn: async () => {
      if (!token) return null;
      const url = buildUrl(api.guests.portal.path, { token });
      const res = await fetch(url);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to access guest portal");
      return res.json();
    },
    enabled: !!token,
    retry: false,
  });
}

/**
 * Hook to update guest RSVP
 */
export function useUpdateRSVP(token: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (data: {
      status: 'confirmed' | 'declined';
      confirmedSeats?: number;
      familyMembers?: Array<{ name: string; relationship: string; age?: number }>;
    }) => {
      const url = buildUrl(api.guests.updateRSVP.path, { token });
      const res = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update RSVP");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guest-portal', token] });
    },
    onError: () => {
      toast({ title: "Failed to save RSVP", description: "Please try again.", variant: "destructive" });
    },
  });
}

/**
 * Hook to update bleisure dates
 */
export function useUpdateBleisure(token: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (data: {
      extendedCheckIn?: Date;
      extendedCheckOut?: Date;
    }) => {
      const url = buildUrl(api.guests.updateBleisure.path, { token });
      const res = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update dates");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guest-portal', token] });
    },
    onError: () => {
      toast({ title: "Failed to save dates", description: "Please try again.", variant: "destructive" });
    },
  });
}

/**
 * Hook to upload ID document
 */
export function useUploadID(token: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      documentUrl: string;
      verifiedName: string;
    }) => {
      const url = buildUrl(api.guests.uploadID.path, { token });
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to upload ID");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guest-portal', token] });
    },
  });
}

/**
 * Hook to toggle self-management options
 */
export function useToggleSelfManagement(token: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      selfManageFlights?: boolean;
      selfManageHotel?: boolean;
    }) => {
      const url = buildUrl(api.guests.toggleSelfManagement.path, { token });
      const res = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update preferences");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guest-portal', token] });
    },
  });
}

/**
 * Hook to join waitlist
 */
export function useJoinWaitlist(token: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async () => {
      const url = buildUrl(api.guests.joinWaitlist.path, { token });
      const res = await fetch(url, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to join waitlist");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guest-portal', token] });
    },
    onError: () => {
      toast({ title: "Could not join waitlist", description: "Please try again.", variant: "destructive" });
    },
  });
}

/**
 * Hook to register for itinerary event
 */
export function useRegisterForEvent(token: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (eventId: number) => {
      const url = buildUrl(api.itinerary.register.path, { token, eventId: eventId.toString() });
      const res = await fetch(url, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to register");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guest-portal', token] });
    },
    onError: () => {
      toast({ title: "Could not register", description: "Please try again.", variant: "destructive" });
    },
  });
}

/**
 * Hook to update guest profile (emergency contact, meal preference)
 */
export function useUpdateProfile(token: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      emergencyContactName?: string;
      emergencyContactPhone?: string;
      mealPreference?: string;
      specialRequests?: string;
    }) => {
      const url = buildUrl(api.guests.portal.path.replace('/portal/:token', '/:token/profile'), { token });
      const res = await fetch(`/api/guest/${token}/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update profile");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guest-portal', token] });
    },
  });
}

/**
 * Hook to select a hotel option
 */
export function useSelectHotel(token: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (hotelBookingId: number | null) => {
      const res = await fetch(`/api/guest/${token}/hotel-selection`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hotelBookingId }),
      });
      if (!res.ok) throw new Error("Failed to select hotel");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guest-portal', token] });
    },
    onError: () => {
      toast({ title: "Failed to save hotel selection", description: "Please try again.", variant: "destructive" });
    },
  });
}

/**
 * Hook to update travel preferences
 */
export function useUpdateTravelPrefs(token: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      selfManageArrival?: boolean;
      selfManageDeparture?: boolean;
      arrivalPnr?: string;
      departurePnr?: string;
      originCity?: string;
      arrivalMode?: string;
      departureMode?: string;
      journeyNotes?: string;
      specialRequests?: string;
      partialStayCheckIn?: Date;
      partialStayCheckOut?: Date;
    }) => {
      const res = await fetch(`/api/guest/${token}/travel-prefs`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update travel preferences");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guest-portal', token] });
    },
  });
}

/**
 * Hook to submit an add-on request (perk, room upgrade, flight, etc.)
 */
export function useSubmitGuestRequest(token: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (data: {
      type: string;
      notes?: string;
      addonType?: string;
      perkId?: number;
      budgetConsumed?: number;
    }) => {
      const res = await fetch(`/api/guest/${token}/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to submit request");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guest-portal', token] });
    },
    onError: () => {
      toast({ title: "Request could not be submitted", description: "Please try again.", variant: "destructive" });
    },
  });
}

/**
 * Hook to unregister from itinerary event
 */
export function useUnregisterFromEvent(token: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (eventId: number) => {
      const url = buildUrl(api.itinerary.unregister.path, { token, eventId: eventId.toString() });
      const res = await fetch(url, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to unregister");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guest-portal', token] });
    },
    onError: () => {
      toast({ title: "Could not unregister", description: "Please try again.", variant: "destructive" });
    },
  });
}
