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
  is_active: boolean;
}

export interface Order {
  id: number;
  user_id: number;
  service: Service;
  country: Country;
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

export interface PaginatedResponse<T> {
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
