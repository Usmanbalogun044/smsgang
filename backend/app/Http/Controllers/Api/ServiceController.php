<?php

namespace App\Http\Controllers\Api;

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
     * Price formula: (5SIM_cost_in_rubles × exchange_rate) + global_markup
     */
    public function countriesForService(Service $service): JsonResponse
    {
        $baseUrl = rtrim(config('services.fivesim.base_url'), '/');
        $cacheKey = "live_countries_{$service->id}";

        $priceData = Cache::remember($cacheKey, 300, function () use ($baseUrl, $service) {
            try {
                $response = Http::timeout(15)
                    ->get("{$baseUrl}/guest/prices", [
                        'product' => $service->provider_service_code,
                    ]);

                if (! $response->successful()) {
                    return [];
                }

                return $response->json() ?? [];
            } catch (\Exception $e) {
                Log::warning('5SIM prices fetch failed', [
                    'service' => $service->provider_service_code,
                    'error' => $e->getMessage(),
                ]);

                return [];
            }
        });

        $globalMarkup = (float) Setting::get('global_markup', 100);
        $exchangeRate = (float) Setting::get('exchange_rate', 18);

        $results = [];

        foreach ($priceData as $providerCode => $services) {
            $serviceData = $services[$service->provider_service_code] ?? null;
            if (! $serviceData) {
                continue;
            }

            // Pick cheapest operator with stock
            $bestCost = null;
            $availableCount = 0;
            foreach ($serviceData as $info) {
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

            // Upsert country so buy endpoint can find it by ID
            $country = Country::updateOrCreate(
                ['provider_code' => $providerCode],
                [
                    'name'      => ucwords(str_replace(['_', '-'], ' ', $providerCode)),
                    'code'      => strtoupper(substr($providerCode, 0, 2)),
                    'is_active' => true,
                ]
            );

            $finalPrice = round(($bestCost * $exchangeRate) + $globalMarkup, 2);

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

