import * as XLSX from 'xlsx';
import Papa from 'papaparse';

export interface GuestRow {
  name: string;
  email?: string;
  phone?: string;
  category?: string; // VIP, Friends, Family
  dietaryRestrictions?: string;
  specialRequests?: string;
}

/**
 * Parse Excel file (.xlsx, .xls) to guest data
 */
export function parseExcelFile(file: File): Promise<GuestRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        
        // Get first sheet
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        
        // Convert to JSON
        const jsonData = XLSX.utils.sheet_to_json(sheet);
        
        // Map to GuestRow format
        const guests = jsonData.map((row: any) => ({
          name: row.Name || row.name || '',
          email: row.Email || row.email || '',
          phone: row.Phone || row.phone || '',
          category: row.Category || row.category || '',
          dietaryRestrictions: row['Dietary Restrictions'] || row.dietary || '',
          specialRequests: row['Special Requests'] || row.requests || '',
        }));
        
        resolve(guests);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsBinaryString(file);
  });
}

/**
 * Parse CSV file to guest data
 */
export function parseCSVFile(file: File): Promise<GuestRow[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      complete: (results) => {
        const guests = results.data.map((row: any) => ({
          name: row.Name || row.name || '',
          email: row.Email || row.email || '',
          phone: row.Phone || row.phone || '',
          category: row.Category || row.category || '',
          dietaryRestrictions: row['Dietary Restrictions'] || row.dietary || '',
          specialRequests: row['Special Requests'] || row.requests || '',
        }));
        resolve(guests);
      },
      error: (error) => reject(error),
    });
  });
}

/**
 * Generate Excel template for guest list
 */
export function generateGuestListTemplate(): void {
  const templateData = [
    {
      Name: 'John Doe',
      Email: 'john@example.com',
      Phone: '+1234567890',
      Category: 'VIP',
      'Dietary Restrictions': 'Vegetarian',
      'Special Requests': 'Window seat preference'
    },
    {
      Name: 'Jane Smith',
      Email: 'jane@example.com',
      Phone: '+0987654321',
      Category: 'Friends',
      'Dietary Restrictions': '',
      'Special Requests': ''
    }
  ];
  
  const ws = XLSX.utils.json_to_sheet(templateData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Guest List');
  
  // Download file
  XLSX.writeFile(wb, 'guest_list_template.xlsx');
}

/**
 * Export guests to Excel
 */
export function exportGuestsToExcel(guests: GuestRow[], filename: string = 'guests.xlsx'): void {
  const ws = XLSX.utils.json_to_sheet(guests);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Guests');
  XLSX.writeFile(wb, filename);
}

/**
 * Export full ground team manifest to Excel with all operational columns
 */
export function exportManifestToExcel(guests: any[], eventName: string = 'Event'): void {
  const TRANSPORT_LABELS: Record<string, string> = {
    group_flight: "Group Transport",
    own_flight: "Own Flight",
    train: "Train",
    other: "Bus / Car / Other",
    local: "Local / In City",
  };

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const rows = guests.map((g, i) => ({
    "#": i + 1,
    "Name": g.name ?? "",
    "Booking Ref": g.bookingRef ?? "",
    "Guest Portal Link": g.accessToken ? `${origin}/guest/${g.accessToken}` : "",
    "Label / Tier": g.label ?? "",
    "Status": g.status ?? "",
    "Seats": g.confirmedSeats ?? 1,
    "Transport Mode": TRANSPORT_LABELS[g.arrivalMode] ?? g.arrivalMode ?? "",
    "Origin": g.originCity ?? "",
    "Arrival PNR": g.arrivalPnr ?? "",
    "Departure PNR": g.departurePnr ?? "",
    "Meal Preference": g.mealPreference ?? "",
    "Extended Check-in": g.extendedCheckIn ?? "",
    "Extended Check-out": g.extendedCheckOut ?? "",
    "Emergency Contact": g.emergencyContactName ?? "",
    "Emergency Phone": g.emergencyContactPhone ?? "",
    "Source": g.registrationSource === "on_spot" ? "Walk-in" : g.registrationSource === "self_reg" ? "Self-reg" : "Invited",
    "Notes / Arrangements": g.specialRequests ?? "",
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);

  // Style header row width (added portal link column at position 3)
  const colWidths = [4, 24, 14, 44, 14, 12, 6, 18, 12, 14, 14, 16, 16, 16, 20, 16, 10, 30];
  ws['!cols'] = colWidths.map(w => ({ wch: w }));

  // Mark walk-ins with a note (XLSX doesn't support cell colors easily without enterprise lib)
  XLSX.utils.book_append_sheet(wb, ws, 'Manifest');
  XLSX.writeFile(wb, `${eventName.replace(/[^a-z0-9]/gi, '_')}_Manifest.xlsx`);
}
