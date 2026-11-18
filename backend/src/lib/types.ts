export type UserRole = "ADMIN" | "SHOPKEEPER" | "WORKSHOP";

export interface StaffUserDto {
  id: string;
  name: string;
  email: string;
  mobile: string;
  role: UserRole;
  isActive: boolean;
  isTemporary?: boolean;
  createdAt: string;
}

export interface CustomerDto {
  id: string;
  name: string;
  mobile: string;
  alternateMobile?: string | null;
  address?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  orderCount?: number;
}

export interface GarmentTypeDto {
  id: string;
  hindiName: string;
  englishName: string;
  category: string;
  iconName: string;
  isActive: boolean;
  displayOrder: number;
}

export type OrderStatus =
  | "RECEIVED"
  | "PROCESSING"
  | "QUANTITY_PENDING"
  | "QR_GENERATED"
  | "READY"
  | "DELIVERED"
  | "CANCELLED";

export interface OrderGarmentItem {
  id?: string;
  garmentTypeId?: string | null;
  hindiName: string;
  englishName: string;
  quantity: number;
  notes?: string | null;
}

export interface OrderDto {
  id: string;
  orderNumber: string;
  customerId: string;
  customerName?: string;
  customerMobile?: string;
  customerAlternateMobile?: string | null;
  customerAddress?: string | null;
  slipNumber?: string | null;
  slipImageUrl?: string | null;
  status: OrderStatus;
  expectedQuantity: number;
  actualQuantity?: number | null;
  isQuantityVerified: boolean;
  verifiedByStaffId?: string | null;
  verifiedByStaffName?: string | null;
  verifiedAt?: string | null;
  receivedDate: string;
  expectedDeliveryDate: string;
  deliveredAt?: string | null;
  deliveredByStaffId?: string | null;
  deliveredByStaffName?: string | null;
  cancelledAt?: string | null;
  cancellationReason?: string | null;
  createdByStaffId?: string | null;
  createdByStaffName?: string | null;
  specialInstructions?: string | null;
  duplicateReceiptCount: number;
  lastReceiptPrintedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  garments?: OrderGarmentItem[];
  activeQrCode?: {
    id: string;
    tokenDisplayPrefix: string;
    rawToken?: string;
    generatedAt: string;
    qrDataUrl?: string;
  } | null;
  lastNotification?: {
    status: string;
    sentAt: string;
    recipientMobile: string;
    messageBody: string;
  } | null;
  deliveryAlert?: {
    level: "OVERDUE" | "DUE_TODAY" | "URGENT" | "UPCOMING" | "NORMAL";
    daysDifference: number;
    labelHindi: string;
    labelEnglish: string;
  };
}

export interface OcrExtractionResult {
  slipNumber: string | null;
  customerName: string | null;
  mobile: string | null;
  receivedDate: string | null;
  expectedDeliveryDate: string | null;
  garments: {
    hindiName: string;
    englishName: string;
    quantity: number;
    confidence: number;
  }[];
  notes: string | null;
  rawText: string;
  confidenceOverall: number;
  uncertainFields: string[];
}

export interface DashboardSummary {
  totalActiveOrders: number;
  ordersReceivedToday: number;
  ordersInProcessing: number;
  quantityVerificationPending: number;
  qrGenerated: number;
  readyForPickup: number;
  dueToday: number;
  overdueOrders: number;
  deliveredToday: number;
}

export interface DeliveryAlertItem {
  orderId: string;
  orderNumber: string;
  customerName: string;
  customerMobile: string;
  expectedDeliveryDate: string;
  status: OrderStatus;
  level: "OVERDUE" | "DUE_TODAY" | "URGENT" | "UPCOMING";
  daysDifference: number;
  expectedQuantity: number;
}
