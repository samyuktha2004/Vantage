export type RsvpBreakdown = {
  hostManagedYes: number;
  partialSelfManagedYes: number;
  fullSelfManagedYes: number;
  arrivedCount: number;
  noCount: number;
  pendingCount: number;
  confirmedCount: number;
  yesCount: number;
};

export function getRsvpBreakdown(guests: any[] = []): RsvpBreakdown {
  const hasAnySelfManaged = (guest: any) => {
    const hasPartialStay = !!guest.partialStayCheckIn || !!guest.partialStayCheckOut;
    return !!(
      guest.selfManageFlights ||
      guest.selfManageHotel ||
      guest.selfManageArrival ||
      guest.selfManageDeparture ||
      hasPartialStay
    );
  };

  const isFullSelfManaged = (guest: any) => {
    const travelFullySelfManaged = !!guest.selfManageFlights || (!!guest.selfManageArrival && !!guest.selfManageDeparture);
    const stayFullySelfManaged = !!guest.selfManageHotel;
    return travelFullySelfManaged && stayFullySelfManaged;
  };

  const isYesStatus = (guest: any) => guest.status === "confirmed" || guest.status === "arrived";

  const confirmedCount = guests.filter((g: any) => g.status === "confirmed").length;
  const arrivedCount = guests.filter((g: any) => g.status === "arrived").length;
  const yesCount = confirmedCount + arrivedCount;
  const noCount = guests.filter((g: any) => g.status === "declined").length;
  const pendingCount = guests.filter((g: any) => g.status === "pending").length;

  const fullSelfManagedYes = guests.filter((g: any) => isYesStatus(g) && isFullSelfManaged(g)).length;
  const partialSelfManagedYes = guests.filter(
    (g: any) => isYesStatus(g) && hasAnySelfManaged(g) && !isFullSelfManaged(g)
  ).length;
  const hostManagedYes = Math.max(yesCount - fullSelfManagedYes - partialSelfManagedYes, 0);

  return {
    hostManagedYes,
    partialSelfManagedYes,
    fullSelfManagedYes,
    arrivedCount,
    noCount,
    pendingCount,
    confirmedCount,
    yesCount,
  };
}
