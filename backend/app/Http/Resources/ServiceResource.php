<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ServiceResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'slug' => $this->slug,
            'provider_service_code' => $this->when($request->user()?->isAdmin(), $this->provider_service_code),
            'is_active' => $this->is_active,
            'created_at' => $this->created_at,
        ];
    }
}
