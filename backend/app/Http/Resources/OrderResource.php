<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class OrderResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'user_id' => $this->user_id,
            'service' => new ServiceResource($this->whenLoaded('service')),
            'country' => new CountryResource($this->whenLoaded('country')),
            'price' => $this->price,
            'status' => $this->status->value,
            'payment_reference' => $this->payment_reference,
            'checkout_url' => $this->when(
                $this->status->value === 'pending',
                $this->lendoverify_checkout_url
            ),
            'activation' => new ActivationResource($this->whenLoaded('activation')),
            'created_at' => $this->created_at,
        ];
    }
}
