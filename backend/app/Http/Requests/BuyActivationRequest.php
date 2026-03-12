<?php

namespace App\Http\Requests;

use App\Models\ServicePrice;
use Illuminate\Foundation\Http\FormRequest;

class BuyActivationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'service_id' => ['required', 'integer', 'exists:services,id'],
            'country_id' => ['required', 'integer', 'exists:countries,id'],
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            if ($validator->errors()->any()) {
                return;
            }

            $price = ServicePrice::where('service_id', $this->service_id)
                ->where('country_id', $this->country_id)
                ->where('is_active', true)
                ->first();

            if (! $price) {
                $validator->errors()->add('service_id', 'No active pricing found for this service and country combination.');
            }
        });
    }
}
