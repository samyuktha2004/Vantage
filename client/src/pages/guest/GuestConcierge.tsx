import { useLocation } from "wouter";
import { useGuestPortal, useSubmitGuestRequest } from "@/hooks/use-guest-portal";
import { GuestLayout } from "@/components/GuestLayout";
import { Loader2, Star, Mail, Phone, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

export default function GuestConcierge({ token }: { token: string }) {
  const { data: guestData, isLoading } = useGuestPortal(token);
  const submitRequest = useSubmitGuestRequest(token);
  const [, navigate] = useLocation();

  if (isLoading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;
  if (!guestData) return <div className="p-10 text-center">Invalid access link</div>;

  const { label } = guestData;

  // Use real perks from the portal — includes only perks enabled for the guest's label
  const availablePerks = (guestData.availablePerks ?? [])
    .filter((p: any) => p.isEnabled !== false)
    .map((p: any) => ({
      ...p,
      isIncluded: p.pricingType === "included" || p.expenseHandledByClient === true,
    }));

  const handleRequest = async (perk: any) => {
    try {
      await submitRequest.mutateAsync({
        type: 'perk',
        addonType: perk.name,
        perkId: perk.id,
        budgetConsumed: perk.clientFacingRate ?? perk.unitCost ?? 0,
      });
      toast({
        title: "Request Sent",
        description: `We've received your request for ${perk.name}.`,
      });
    } catch (e) {
      toast({ title: "Error", description: "Could not send request.", variant: "destructive" });
    }
  };

  return (
    <GuestLayout step={3} token={token}>
      <div className="space-y-8">
        <div className="text-center mb-10">
          <Badge variant="outline" className="mb-4 py-1 px-3 border-primary/20 text-primary uppercase tracking-widest text-[10px]">
            {label?.name || "Guest"} Access
          </Badge>
          <h1 className="text-3xl font-serif text-primary mb-2">Concierge Services</h1>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Customize your experience. Select from your exclusive available perks below.
          </p>
        </div>

        {availablePerks.length === 0 && (
          <div className="text-center py-10 text-muted-foreground border-2 border-dashed rounded-2xl">
            <Star className="w-8 h-8 mx-auto mb-2 opacity-20" />
            <p className="text-sm">No concierge services are configured for your tier yet.</p>
            <p className="text-xs mt-1">Contact your event host for assistance.</p>
          </div>
        )}
        <div className="grid md:grid-cols-2 gap-6">
          {(availablePerks as any[]).map((perk: any, idx: number) => (
            <motion.div 
              key={perk.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="bg-white rounded-2xl p-6 border border-border/50 shadow-sm hover:shadow-md transition-all group"
            >
              <div className="flex justify-between items-start mb-4">
                <div className={`
                  w-10 h-10 rounded-full flex items-center justify-center
                  ${perk.isIncluded ? "bg-secondary/30 text-primary" : "bg-muted text-muted-foreground"}
                `}>
                  <Star className="w-5 h-5" />
                </div>
                {perk.isIncluded ? (
                  <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-none">Included</Badge>
                ) : (
                  <Badge variant="outline" className="text-muted-foreground">Optional Add-on</Badge>
                )}
              </div>
              
              <h3 className="text-lg font-bold text-primary mb-2">{perk.name}</h3>
              <p className="text-sm text-muted-foreground mb-6 min-h-[40px]">{perk.description}</p>

              <Button
                className={`w-full ${perk.isIncluded ? "bg-primary text-white hover:bg-primary/90" : ""}`}
                variant={perk.isIncluded ? "default" : "outline"}
                onClick={() => handleRequest(perk)}
                disabled={submitRequest.isPending}
              >
                {submitRequest.isPending ? "Confirming..." : perk.isIncluded ? "Confirm Selection" : "Request Add-on"}
              </Button>
            </motion.div>
          ))}
        </div>

        <div className="bg-primary/5 rounded-2xl p-8 text-center mt-12 border border-primary/10">
          <h3 className="font-serif text-xl text-primary mb-2">Need something else?</h3>
          <p className="text-muted-foreground text-sm mb-6">Our dedicated team is here to assist with special arrangements.</p>
          {guestData.event?.contactEmail || guestData.event?.contactPhone ? (
            <div className="flex justify-center gap-4 flex-wrap">
              {guestData.event?.contactEmail && (
                <Button
                  variant="outline"
                  className="gap-2 bg-white"
                  onClick={() => {
                    window.location.href = `mailto:${guestData.event.contactEmail}?subject=${encodeURIComponent("Concierge support request — " + (guestData.event?.name ?? "event"))}`;
                  }}
                >
                  <Mail className="w-4 h-4" /> Email Concierge
                </Button>
              )}
              {guestData.event?.contactPhone && (
                <Button
                  variant="outline"
                  className="gap-2 bg-white"
                  onClick={() => {
                    window.location.href = `tel:${guestData.event.contactPhone}`;
                  }}
                >
                  <Phone className="w-4 h-4" /> Call Support
                </Button>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Contact details will be shared closer to the event.</p>
          )}
        </div>

        {/* Continue to Next Step */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="flex justify-center pt-8"
        >
          <Button 
            size="lg"
            className="px-12"
            onClick={() => navigate(`/guest/${token}/idvault`)}
          >
            Continue to ID Verification
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </motion.div>
      </div>
    </GuestLayout>
  );
}
