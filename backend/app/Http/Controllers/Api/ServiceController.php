<?php

namespace App\Http\Controllers\Api;

use App\Enums\MarkupType;
use App\Http\Controllers\Controller;
use App\Http\Resources\CountryResource;
use App\Http\Resources\ServiceResource;
use App\Models\Country;
use App\Models\Service;
use App\Models\Setting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

class ServiceController extends Controller
{
    public function index(): AnonymousResourceCollection
    {
        $services = Service::where('is_active', true)->get();

        return ServiceResource::collection($services);
    }

    public function countries(): AnonymousResourceCollection
    {
        $countries = Country::where('is_active', true)->get();

        return CountryResource::collection($countries);
    }

    /**
     * Return countries available for a service, with live prices from 5SIM
     * plus the admin's global markup applied.
     * Price formula: (5SIM_cost_in_usd × exchange_rate) + global_markup
     */
    public function countriesForService(Service $service, \App\Services\PricingService $pricingService): JsonResponse
    {
        $baseUrl = rtrim(config('services.fivesim.base_url'), '/');
        $cacheKey = "live_countries_{$service->id}";

        $priceData = Cache::get($cacheKey);

        if (! is_array($priceData)) {
            try {
                $response = Http::connectTimeout(10)
                    ->timeout(30)
                    ->retry(1, 300)
                    ->get("{$baseUrl}/guest/prices", [
                        'product' => $service->provider_service_code,
                    ]);

                if (! $response->successful()) {
                    Log::error('5SIM API Error', [
                        'service' => $service->provider_service_code,
                        'status' => $response->status(),
                        'body' => $response->body(),
                    ]);

                    return response()->json([
                        'service' => $service->provider_service_code,
                        'error' => '5SIM request failed with status ' . $response->status(),
                    ], 502);
                }

                $priceData = $response->json() ?? [];
                Cache::put($cacheKey, $priceData, 30);
            } catch (Throwable $e) {
                Log::warning('5SIM prices fetch failed', [
                    'service' => $service->provider_service_code,
                    'error' => $e->getMessage(),
                ]);

                return response()->json([
                    'service' => $service->provider_service_code,
                    'error' => $e->getMessage(),
                ], 504);
            }
        }

        $results = [];
        // API returns {"service_name": {"country_name": {"provider": {cost, count}}}}
        // e.g. {"whatsapp": {"usa": {"virtual1": {cost: 1.0, count: 100}}}}
        
        $targetServiceCode = strtolower($service->provider_service_code);
        $priceDataLower = array_change_key_case($priceData, CASE_LOWER);
        
        // Get the countries object for this service
        $countriesData = $priceDataLower[$targetServiceCode] ?? [];

        foreach ($countriesData as $countryName => $providers) {
            // $countryName is the country identifier from 5sim (e.g. 'afghanistan', 'usa')
            // $providers has operator info
            
            if (empty($providers) || !is_array($providers)) {
                continue;
            }

            // Pick cheapest operator with stock
            $bestCost = null;
            $availableCount = 0;
            
            foreach ($providers as $operatorCode => $info) {
                $count = (int) ($info['count'] ?? 0);
                if ($count > 0) {
                    $cost = (float) ($info['cost'] ?? 0);
                    if ($bestCost === null || $cost < $bestCost) {
                        $bestCost = $cost;
                    }
                    $availableCount += $count;
                }
            }

            if ($bestCost === null || $availableCount <= 0) {
                continue;
            }

            // Upsert country so buy endpoint can find it by ID if needed locally
            // Using countryName as provider_code
            $country = Country::updateOrCreate(
                ['provider_code' => $countryName],
                [
                    'name'      => ucwords(str_replace(['_', '-'], ' ', $countryName)),
                    // Avoid unique constraint violation by using longer code derived from unique provider_code
                    'code'      => strtoupper(substr($countryName, 0, 10)),
                    'is_active' => true,
                ]
            );

            // Using PricingService to calculate final price (Exchange Rate + Global Markup + 0 specific markup)
            $finalPrice = $pricingService->calculateFinalPrice($bestCost, MarkupType::Fixed, 0);

            $results[] = [
                'id'              => $country->id,
                'service'         => [
                    'id'   => $service->id,
                    'name' => $service->name,
                    'slug' => $service->slug,
                ],
                'country'         => [
                    'id'   => $country->id,
                    'name' => $country->name,
                    'code' => strtoupper($country->code),
                    'flag' => $country->flag,
                ],
                'final_price'     => $finalPrice,
                'available_count' => $availableCount,
                'is_active'       => true,
            ];
        }

        // Sort A-Z by country name
        usort($results, fn ($a, $b) => strcmp($a['country']['name'], $b['country']['name']));

        return response()->json(['data' => $results]);
    }

    public function servicesForCountry(Country $country): AnonymousResourceCollection
    {
        // Return active services (country filtering can be added later)
        return ServiceResource::collection(Service::where('is_active', true)->get());
    }
}

