export interface User {
  id: number;
  name: string;
  email: string;
  avatar?: string | null;
  role: 'user' | 'admin';
  status: 'active' | 'suspended';
  balance?: number;
  created_at: string;
}

export interface Service {
  id: number;
  name: string;
  slug: string;
  is_active: boolean;
}

export interface Country {
  id: number;
  name: string;
  code: string;
  flag: string | null;
  is_active: boolean;
}

export interface ServicePrice {
  id: number;
  service: Service;
  country: Country;
  final_price: number;
  available_count?: number;
  operators?: Array<{
    name: string;
    cost: number;
    count: number;
    final_price: number;
  }>;
  is_active: boolean;
}

export interface Order {
  id: number;
  user_id: number;
  service: Service;
  country: Country;
  selected_operator?: string | null;
  price: number;
  status: OrderStatus;
  payment_reference: string | null;
  lendoverify_checkout_url: string | null;
  activation: Activation | null;
  created_at: string;
}

export interface Activation {
  id: number;
  order_id: number;
  phone_number: string;
  sms_code: string | null;
  status: ActivationStatus;
  provider: string;
  expires_at: string;
  created_at: string;
  service: Service;
  country: Country;
}

export type OrderStatus = 'pending' | 'paid' | 'processing' | 'completed' | 'failed' | 'expired';
export type ActivationStatus = 'requested' | 'number_received' | 'waiting_sms' | 'sms_received' | 'completed' | 'expired' | 'cancelled';

// SMM Types
export interface SmmService {
  id: number;
  crestpanel_service_id: number;
  name: string;
  category: string;
  type: string;
  rate: number; // USD
  min: number;
  max: number;
  refill: number | null;
  cancel: number | null;
  is_active: boolean;
  created_at: string;
}

export interface SmmServicePrice {
  id: number;
  smm_service_id: number;
  smm_service?: SmmService;
  markup_type: 'Fixed' | 'Percent';
  markup_value: number;
  final_price: number; // NGN
  is_active: boolean;
  created_at: string;
}

export interface SmmOrder {
  id: number;
  user_id: number;
  smm_service_id: number;
  crestpanel_order_id: string;
  link: string;
  quantity: number;
  total_cost_ngn: number;
  charge_ngn: number;
  status: 'Pending' | 'In progress' | 'Partial' | 'Completed' | 'Failed' | 'Cancelled';
  smm_service?: SmmService;
  created_at: string;
  updated_at: string;
}

// Wallet Types
export interface Wallet {
  id: number;
  user_id: number;
  balance: number;
  created_at: string;
  updated_at: string;
}

export interface WalletTransaction {
  id: number;
  user_id: number;
  wallet_id: number;
  order_id?: number;
  smm_order_id?: number;
  amount: number;
  operation_type: 'wallet_fund' | 'wallet_debit' | 'refund' | 'bonus' | 'affiliate';
  type: 'debit' | 'credit';
  description: string;
  reference: string;
  created_at: string;
}

export interface WalletFundingResponse {
  status: string;
  message: string;
  checkout_url: string;
  reference: string;
}

export type PaginatedResponse<T> = {
  data: T[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

export interface ApiError {
  message: string;
  errors?: Record<string, string[]>;
}
