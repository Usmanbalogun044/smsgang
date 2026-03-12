<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AdminStatsResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'total_orders' => $this['total_orders'],
            'total_revenue' => $this['total_revenue'],
            'active_activations' => $this['active_activations'],
            'registered_users' => $this['registered_users'],
            'revenue_today' => $this['revenue_today'],
            'revenue_week' => $this['revenue_week'],
            'revenue_month' => $this['revenue_month'],
        ];
    }
}
