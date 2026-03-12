<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ServicePriceResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'service' => new ServiceResource($this->whenLoaded('service')),
            'country' => new CountryResource($this->whenLoaded('country')),
            'provider_price' => $this->when($request->user()?->isAdmin(), $this->provider_price),
            'markup_type' => $this->when($request->user()?->isAdmin(), $this->markup_type?->value),
            'markup_value' => $this->when($request->user()?->isAdmin(), $this->markup_value),
            'final_price' => $this->final_price,
            'is_active' => $this->is_active,
        ];
    }
}
