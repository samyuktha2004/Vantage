// TBO API TypeScript Interfaces
// Based on TBO India Hotel API and TBO India Air API (GDS)

// ─── HOTEL API ───────────────────────────────────────────────────────────────

export interface TBOHotelCountry {
  Code: string;
  Name: string;
}

export interface TBOHotelCity {
  Code: string;
  Name: string;
}

export interface TBOHotelListItem {
  HotelCode: string;
  HotelName: string;
  HotelAddress?: string;
  StarRating?: number;
}

export interface TBOHotelDetails {
  HotelCode: string;
  HotelName: string;
  StarRating: number;
  HotelAddress: string;
  HotelDescription?: string;
  Amenities?: string[];
  Images?: string[];
  Latitude?: number;
  Longitude?: number;
}

export interface TBOPaxRoom {
  Adults: number;
  Children: number;
  ChildrenAges?: number[];
}

export interface TBOCancellationPolicy {
  ChargeType: string;
  CancellationCharge: number;
  FromDate: string;
  ToDate: string;
}

export interface TBORoomOption {
  Name: string[];
  Inclusion: string[];
  MealType: string;
  IsRefundable: boolean;
  TotalFare: number;
  TotalTax: number;
  RoomPromotion?: string[];
  CancellationPolicies?: TBOCancellationPolicy[];
  BookingCode: string;
}

export interface TBOHotelSearchResult {
  HotelCode: string;
  HotelName: string;
  StarRating: number;
  HotelAddress?: string;
  HotelRooms?: TBORoomOption[];
  MinCost?: number;
}

export interface TBOHotelSearchRequest {
  CheckIn: string;           // "YYYY-MM-DD"
  CheckOut: string;          // "YYYY-MM-DD"
  HotelCodes: string;        // comma-separated TBO hotel codes
  GuestNationality: string;  // ISO country code e.g. "IN"
  PaxRooms: TBOPaxRoom[];
  ResponseTime: number;      // seconds, e.g. 23
  IsDetailedResponse: boolean;
  Filters: {
    Refundable: boolean;
    NoOfRooms: number;
    MealType: string;        // "All" | "BreakfastIncluded" | etc.
    OrderBy: string;         // "Price"
    StarRating: number;
    HotelName: string;
  };
}

export interface TBOHotelSearchResponse {
  Status: { Code: number; Description: string };
  HotelResult?: TBOHotelSearchResult[];
}

export interface TBOPreBookRequest {
  BookingCode: string;
  PaymentMode: string;  // "Limit" | "CreditCard"
}

export interface TBOPreBookResponse {
  Status: { Code: number; Description: string };
  BookingCode?: string;
  TotalFare?: number;
  AgentMarkup?: number;
}

export interface TBOCustomerName {
  Title: string;    // "Mr" | "Mrs" | "Ms" | "Mstr"
  FirstName: string;
  LastName: string;
  Type: string;     // "Adult" | "Child"
}

export interface TBOBookHotelRequest {
  BookingCode: string;
  CustomerDetails: Array<{ CustomerNames: TBOCustomerName[] }>;
  ClientReferenceId: string;
  BookingReferenceId: string;
  TotalFare: number;
  EmailId: string;
  PhoneNumber: string;
  BookingType: string;   // "Voucher"
  PaymentMode: string;   // "Limit" | "CreditCard"
}

export interface TBOBookHotelResponse {
  Status: { Code: number; Description: string };
  ConfirmationNumber?: string;
  BookingRefNo?: string;
  BookingDetails?: Record<string, unknown>;
}

export interface TBOCancelHotelResponse {
  Status: { Code: number; Description: string };
  CancellationStatus?: string;
  RefundAmount?: number;
}

// ─── AIR/FLIGHT API ──────────────────────────────────────────────────────────

export interface TBOFlightSegmentRequest {
  Origin: string;                      // IATA airport code e.g. "DEL"
  Destination: string;                 // IATA airport code e.g. "DXB"
  FlightCabinClass: string;           // "1"=All, "2"=Economy, "3"=PremiumEconomy, "4"=Business, "6"=First
  PreferredDepartureTime: string;     // "YYYY-MM-DDTHH:mm:ss"
  PreferredArrivalTime: string;       // "YYYY-MM-DDTHH:mm:ss"
}

export interface TBOFlightSearchRequest {
  AdultCount: number;
  ChildCount: number;
  InfantCount: number;
  DirectFlight: boolean;
  OneStopFlight: boolean;
  JourneyType: "1" | "2";            // "1"=OneWay, "2"=Return
  PreferredAirlines: string[] | null;
  Sources: string[] | null;
  Segments: TBOFlightSegmentRequest[];
  ResultFareType?: string;            // "RegularFare"
}

export interface TBOAirline {
  AirlineCode: string;
  AirlineName: string;
  FlightNumber: string;
  FareClass: string;
  OperatingCarrier?: string;
}

export interface TBOAirport {
  AirportCode: string;
  AirportName?: string;
  Terminal?: string;
  CityCode?: string;
  CityName?: string;
  CountryCode?: string;
}

export interface TBOFlightSegment {
  Airline: TBOAirline;
  Origin: { Airport: TBOAirport; DepTime: string };
  Destination: { Airport: TBOAirport; ArrTime: string };
  Duration?: number;            // minutes
  GroundTime?: number;          // layover minutes
  Mile?: number;
  StopOver?: boolean;
  StopPoint?: string;
  StopPointArrivalTime?: string;
  StopPointDepartureTime?: string;
  Craft?: string;               // aircraft type
  IsETicketEligible?: boolean;
  FlightStatus?: string;
}

export interface TBOFare {
  Currency: string;
  BaseFare: number;
  Tax: number;
  TotalFare: number;
  OtherCharges?: number;
  Discount?: number;
  PublishedFare?: number;
  AgentMarkup?: number;
  ServiceTax?: number;
}

export interface TBOFlightResult {
  ResultIndex: string;
  Source: number;
  IsLCC: boolean;
  IsRefundable: boolean;
  AirlineRemark?: string;
  Fare: TBOFare;
  Segments: TBOFlightSegment[][];
  FareClassification?: string;
  ValidatingAirline?: string;
  LastTicketDate?: string;
}

export interface TBOFlightSearchResponse {
  Response: {
    TraceId: string;
    Results?: TBOFlightResult[][];
    Error?: { ErrorCode: number; ErrorMessage: string };
  };
}

export interface TBOFareQuoteResponse {
  Response: {
    TraceId: string;
    Results?: TBOFlightResult[][];
    Error?: { ErrorCode: number; ErrorMessage: string };
  };
}

export interface TBOFareRule {
  Origin: string;
  Destination: string;
  Airline: string;
  FareClass: string;
  FareRuleDetail: string;
}

export interface TBOFareRuleResponse {
  Response: {
    TraceId: string;
    FareRules?: TBOFareRule[];
    Error?: { ErrorCode: number; ErrorMessage: string };
  };
}

export interface TBOPassenger {
  Title: string;
  FirstName: string;
  LastName: string;
  PaxType: 1 | 2 | 3;   // 1=Adult, 2=Child, 3=Infant
  DateOfBirth: string;   // "YYYY-MM-DDTHH:mm:ss"
  Gender: string;        // "Male" | "Female"
  PassportNo?: string;
  PassportExpiry?: string;
  PassportIssuingCountry?: string;
  Nationality: string;   // ISO country code e.g. "IN"
  Email: string;
  ContactNo: string;
  AddressLine1: string;
  City: string;
  CountryCode: string;
  IsLeadPax?: boolean;
}

export interface TBOBookFlightRequest {
  TraceId: string;
  ResultIndex: string;
  Passengers: TBOPassenger[];
  Fare: TBOFare;
}

export interface TBOBookFlightResponse {
  Response: {
    PNR?: string;
    BookingId?: number;
    Itinerary?: Record<string, unknown>;
    Error?: { ErrorCode: number; ErrorMessage: string };
  };
}

export interface TBOTicketResponse {
  Response: {
    PNR?: string;
    Itinerary?: Record<string, unknown>;
    Error?: { ErrorCode: number; ErrorMessage: string };
  };
}

export interface TBOAuthResponse {
  TokenId?: string;
  Member?: {
    AgencyId: string;
    AgencyName: string;
    Email: string;
  };
  Error?: { ErrorCode: number; ErrorMessage: string };
}
