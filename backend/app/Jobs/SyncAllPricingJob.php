<?php

namespace App\Jobs;

use App\Enums\MarkupType;
use App\Models\Country;
use App\Models\Service;
use App\Models\ServicePrice;
use App\Services\PricingService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;

class SyncAllPricingJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $timeout = 1800; // 30 minutes

    public function __construct() {}

    public function handle(PricingService $pricingService): void
    {
        Log::info('Background Sync: Fetching 5Sim pricing data...');
        Cache::put('sync_in_progress', true, 1800);

        try {
            $baseUrl = rtrim(config('services.fivesim.base_url'), '/');
            $apiKey = config('services.fivesim.api_key');

            Log::info("Using API Key: " . substr($apiKey, 0, 4) . "...");

            $response = Http::withToken($apiKey)
                ->withHeaders(['Accept-Encoding' => 'gzip'])
                ->timeout(300)
                ->get("{$baseUrl}/guest/prices");

            if (!$response->successful()) {
                Log::error('Background Sync Failed: 5Sim API returned ' . $response->status());
                return;
            }

            $allData = $response->json();
            
            if (empty($allData)) {
                Log::error('Background Sync Failed: 5Sim API returned empty JSON payload.');
                return;
            }

            Log::info("5Sim Data Received. Parsing " . count($allData) . " countries.");
            
            // Map 1: By ISO Code (e.g., "RU")
            $countriesByCode = Country::where('is_active', true)->get()->keyBy(fn($c) => strtolower($c->code));
            
            // Map 2: By Name without spaces (e.g., "russia", "antiguaandbarbuda")
            $countriesByName = Country::where('is_active', true)->get()->keyBy(fn($c) => strtolower(str_replace(' ', '', $c->name)));
            
            $services = Service::where('is_active', true)->get()->keyBy(fn($s) => strtolower($s->provider_service_code));

            $syncedCount = 0;
            $skippedCountries = 0;
            $skippedServices = 0;

            foreach ($allData as $countryKey => $products) {
                $ckey = strtolower($countryKey);
                
                // Strategy: Try ISO code first, then fallback to normalized name
                $country = $countriesByCode->get($ckey) ?? $countriesByName->get($ckey);
                
                if (!$country) {
                    $skippedCountries++;
                    continue;
                }

                foreach ($products as $productCode => $operators) {
                    $sKey = strtolower($productCode);
                    $service = $services->get($sKey);
                    
                    if (!$service || !is_array($operators)) {
                        $skippedServices++;
                        continue;
                    }

                    $lowestCost = null;
                    foreach ($operators as $opName => $info) {
                        if (isset($info['cost'])) {
                            $cost = (float) $info['cost'];
                            if ($lowestCost === null || $cost < $lowestCost) $lowestCost = $cost;
                        }
                    }

                    if ($lowestCost !== null) {
                        $existing = ServicePrice::where('service_id', $service->id)
                            ->where('country_id', $country->id)
                            ->first();

                        $markupType = $existing ? ($existing->markup_type instanceof MarkupType ? $existing->markup_type : MarkupType::from($existing->markup_type)) : MarkupType::Fixed;
                        $markupValue = $existing ? (float)$existing->markup_value : 0;

                        $finalPrice = $pricingService->calculateFinalPrice($lowestCost, $markupType, $markupValue);

                        ServicePrice::updateOrCreate(
                            ['service_id' => $service->id, 'country_id' => $country->id],
                            [
                                'provider_price' => $lowestCost,
                                'is_active' => true,
                                'markup_type' => $markupType,
                                'markup_value' => $markupValue,
                                'final_price' => $finalPrice,
                                'updated_at' => now(), 
                            ]
                        );
                        $syncedCount++;

                        // Log every 500th item to show progress without filling the disk too fast
                        if ($syncedCount % 500 === 0) {
                            Log::info("Progress: Synced $syncedCount items...");
                        }
                    }
                }
            }

            Log::info("Background Sync FINISHED.", [
                'total_synced' => $syncedCount,
                'countries_in_api' => count($allData),
                'skipped_countries' => $skippedCountries,
                'skipped_services' => $skippedServices,
                'db_active_countries' => $countriesByCode->count(),
                'db_active_services' => $services->count(),
            ]);
            Cache::put('last_sync_time', now()->toDateTimeString(), 86400 * 7);

        } catch (\Exception $e) {
            Log::error('Background Sync Critical Error: ' . $e->getMessage());
        } finally {
            Cache::forget('sync_in_progress');
        }
    }
}
