<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ActivationResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'order_id' => $this->order_id,
            'phone_number' => $this->phone_number,
            'sms_code' => $this->sms_code,
            'status' => $this->status->value,
            'provider' => $this->provider,
            'provider_operator' => $this->provider_operator,
            'provider_activation_id' => $this->when($request->user()?->isAdmin(), $this->provider_activation_id),
            'expires_at' => $this->expires_at,
            'created_at' => $this->created_at,
            'service' => new ServiceResource($this->whenLoaded('service')),
            'country' => new CountryResource($this->whenLoaded('country')),
        ];
    }
}
