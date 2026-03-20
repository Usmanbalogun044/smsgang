export interface User {
  id: number;
  name: string;
  email: string;
  role: 'user' | 'admin';
  status: 'active' | 'suspended';
  balance: number;
  created_at: string;
}

export interface Service {
  id: number;
  name: string;
  slug: string;
  provider_service_code: string;
  provider_category?: string | null;
  provider_qty?: number | null;
  provider_base_price?: number | null;
  provider_payload?: Record<string, unknown> | null;
  last_synced_at?: string | null;
  is_active: boolean;
}

export interface Country {
  id: number;
  name: string;
  code: string;
  provider_code?: string | null;
  provider_name_ru?: string | null;
  provider_iso?: Record<string, number> | null;
  provider_prefix?: Record<string, number> | null;
  provider_capabilities?: Record<string, unknown> | null;
  provider_payload?: Record<string, unknown> | null;
  last_synced_at?: string | null;
  service_prices_count?: number;
  flag: string | null;
  is_active: boolean;
}

export interface ServicePrice {
  id: number;
  service: Service;
  country: Country;
  provider_price: number;
  available_count?: number;
  operator_count?: number;
  provider_payload?: Record<string, { cost?: number; count?: number; [key: string]: unknown }> | null;
  last_seen_at?: string | null;
  markup_type: 'percent' | 'percentage' | 'fixed';
  markup_value: number;
  final_price: number;
  is_active: boolean;
}

export interface Order {
  id: number;
  user_id: number;
  user?: User;
  service: Service;
  country: Country;
  price: number;
  status: OrderStatus;
  payment_reference: string | null;
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
  provider_operator?: string | null;
  expires_at: string;
  created_at: string;
  service: Service;
  country: Country;
  order?: Order;
}

export type OrderStatus = 'pending' | 'paid' | 'processing' | 'completed' | 'failed' | 'expired';
export type ActivationStatus = 'requested' | 'number_received' | 'waiting_sms' | 'sms_received' | 'completed' | 'expired' | 'cancelled';

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

export interface AdminStats {
  total_orders: number;
  completed_sales_count: number;
  total_revenue: number;
  total_profit: number;
  active_activations: number;
  registered_users: number;
  revenue_today: number;
  revenue_week: number;
  revenue_month: number;
  profit_today: number;
  profit_week: number;
  profit_month: number;
  total_withdrawals: number;
}

export interface Withdrawal {
  id: number;
  amount: number;
  note: string | null;
  created_at: string;
}

export interface AdminSettings {
  global_markup: number;
  global_markup_type: 'percentage' | 'fixed';
  exchange_rate: number;
}

export type TransactionStatus =
  | 'pending'
  | 'paid'
  | 'failed'
  | 'payment_received_issue';

export interface Transaction {
  id: number;
  reference: string;
  gateway: string;
  gateway_reference: string | null;
  amount: number;
  currency: string;
  status: TransactionStatus | string;
  description: string | null;
  verified_at: string | null;
  order_id: number | null;
  user?: User;
  created_at: string;
}

// SMM Types
export interface SmmService {
  id: number;
  crestpanel_service_id: number;
  name: string;
  category: string;
  type: string;
  rate: number;
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
  final_price: number;
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
  user?: User;
  created_at: string;
  updated_at: string;
}

