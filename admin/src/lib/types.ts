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
  provider_price: number;
  markup_type: 'percent' | 'fixed';
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
