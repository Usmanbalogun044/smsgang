<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreCountryRequest;
use App\Http\Requests\Admin\UpdateCountryRequest;
use App\Http\Resources\CountryResource;
use App\Models\Country;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class AdminCountryController extends Controller
{
    public function index(): AnonymousResourceCollection
    {
        return CountryResource::collection(Country::orderBy('name')->paginate(100));
    }

    public function store(StoreCountryRequest $request): JsonResponse
    {
        $country = Country::create($request->validated());

        Log::channel('activity')->info('Admin created country', [
            'country_id' => $country->id,
            'name' => $country->name,
        ]);

        return response()->json([
            'country' => new CountryResource($country),
        ], 201);
    }

    public function update(UpdateCountryRequest $request, Country $country): CountryResource
    {
        $country->update($request->validated());

        Log::channel('activity')->info('Admin updated country', [
            'country_id' => $country->id,
            'changes' => $request->validated(),
        ]);

        return new CountryResource($country);
    }

    public function sync(): JsonResponse
    {
        $baseUrl = rtrim(config('services.fivesim.base_url'), '/');

        $response = Http::withToken(config('services.fivesim.api_key'))
            ->timeout(30)
            ->get("{$baseUrl}/guest/countries");

        $response->throw();

        $countries = $response->json();
        $synced = 0;

        foreach ($countries as $code => $info) {
            if (!is_array($info)) continue;
            $name   = is_string($info['name'] ?? null) ? $info['name'] : ucwords(str_replace('_', ' ', $code));
            $isoRaw = $info['iso'] ?? null;
            $iso    = strtoupper(is_string($isoRaw) ? $isoRaw : substr($code, 0, 2));

            // Check if ISO code already exists with a different provider code to avoid UNIQUE violation
            $existing = Country::where('code', $iso)->first();
            
            if ($existing && $existing->provider_code !== $code) {
                // If the code exists but provider is different, skip or suffix (e.g., AL to A1)
                // For now, let's keep it clean: update the existing one if provider_code is null, 
                // OR skip if it's a conflict between two valid 5sim codes (rare)
                $existing->update([
                    'provider_code' => $code,
                    'name' => $name
                ]);
            } else {
                Country::updateOrCreate(
                    ['provider_code' => $code],
                    ['name' => $name, 'code' => $iso]
                );
            }
            $synced++;
        }

        return response()->json([
            'message' => "Synced {$synced} countries from 5SIM.",
        ]);
    }
}
