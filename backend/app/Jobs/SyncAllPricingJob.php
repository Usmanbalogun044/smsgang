<?php

namespace App\Jobs;

use App\Enums\MarkupType;
use App\Models\Country;
use App\Models\Service;
use App\Models\ServicePrice;
use App\Services\ExchangeRateService;
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

    public function handle(PricingService $pricingService, ExchangeRateService $exchangeRateService): void
    {
        Log::info('Background Sync: Starting comprehensive sync...');
        Cache::put('sync_in_progress', true, 1800);

        try {
            // Keep USD->NGN fresh before pulling 5SIM prices.
            $exchangeRateService->syncUsdToNgn();

            $baseUrl = rtrim(config('services.fivesim.base_url', 'https://5sim.net/v1'), '/');
            $apiKey = config('services.fivesim.api_key');

            // 1. Sync & Map Countries
            Log::info('Fetching Countries from 5SIM...');
            $countriesResponse = Http::get("{$baseUrl}/guest/countries");
            
            if (!$countriesResponse->successful()) {
                Log::error("Failed to fetch countries: " . $countriesResponse->status());
                return;
            }

            $apiCountries = $countriesResponse->json();
            $countryMap = []; // slug -> Country Model

            // Log total fetched
            Log::info("Fetched " . count($apiCountries) . " countries from API. Initializing map...");
            
            // Initialize existing codes to avoid conflicts
            $existingCodes = []; 

            foreach ($apiCountries as $slug => $data) {
                // Formatting service name
                $iso = isset($data['iso']) ? array_key_first($data['iso']) : null;
                $name = $data['text_en'] ?? ucfirst($slug);

                if (!$iso) {
                    // Fallback to slug-based code (up to 10 chars)
                    $iso = strtoupper(substr($slug, 0, 10)); 
                } else {
                    $iso = strtoupper($iso);
                }
                
                // Prevent code collisions
                if (isset($existingCodes[$iso])) {
                     // Collision! Try appending random digits
                     $iso = substr($iso, 0, 6) . rand(1000, 9999);
                }

                // Reserve this code for this run
                $existingCodes[$iso] = true;

                try {
                    $country = Country::updateOrCreate(
                        ['provider_code' => $slug], // Reliable unique key from 5SIM
                        [
                            'name' => $name, 
                            'code' => $iso, 
                            'is_active' => true // Default to active on first sync
                        ]
                    );
                    $countryMap[strtolower($slug)] = $country;
                } catch (\Exception $e) {
                    Log::error("Failed to sync country {$slug}: " . $e->getMessage());
                }
            }
            
            Log::info("Synced and updated country map.");


            // 2. Sync & Map Services
            Log::info('Fetching Services from 5SIM...');
            $servicesResponse = Http::get("{$baseUrl}/guest/products/any/any");

            if (!$servicesResponse->successful()) {
                Log::error("Failed to fetch services: " . $servicesResponse->status());
                return;
            }

            $apiServices = $servicesResponse->json();
            $serviceMap = []; // slug -> Service Model

            foreach ($apiServices as $slug => $data) {
                // Formatting service name
                $name = ucwords(str_replace(['_', '-'], ' ', $slug));
                
                $service = Service::firstOrCreate(
                    ['provider_service_code' => strtolower($slug)],
                    ['name' => $name, 'is_active' => true] // Default active
                );

                $serviceMap[strtolower($slug)] = $service;
            }

            Log::info("Synced and Mapped " . count($serviceMap) . " services.");


            // 3. Sync Prices
            Log::info('Fetching Prices from 5SIM...');
            $pricesResponse = Http::withToken($apiKey)
                ->withHeaders(['Accept-Encoding' => 'gzip'])
                ->timeout(300) // 5 minutes timeout for download
                ->get("{$baseUrl}/guest/prices");

            if (!$pricesResponse->successful()) {
                Log::error("Failed to fetch prices: " . $pricesResponse->status());
                return;
            }

            $allPrices = $pricesResponse->json();
            $syncedCount = 0;
            $skippedCountries = 0;
            $updatedPrices = 0;

            foreach ($allPrices as $countryKey => $products) {
                $cKey = strtolower($countryKey);
                
                // If country is missing from map (wasn't in countries list), auto-create with fallback
                if (!isset($countryMap[$cKey])) {
                     $name = ucfirst($countryKey);
                     $iso = strtoupper(substr($countryKey, 0, 3)); // Fallback
                     
                     $country = Country::firstOrCreate(
                        ['provider_code' => $countryKey], // Use provider_code for reliable identification
                        ['name' => $name, 'code' => $iso, 'is_active' => true]
                     );
                     $countryMap[$cKey] = $country;
                }
                
                $country = $countryMap[$cKey];

                foreach ($products as $serviceKey => $operators) {
                    $sKey = strtolower($serviceKey);
                    
                    // Ensure service exists even if missed in main list
                    if (!isset($serviceMap[$sKey])) {
                        $name = ucwords(str_replace(['_', '-'], ' ', $serviceKey));
                        $service = Service::firstOrCreate(
                            ['provider_service_code' => $sKey],
                            ['name' => $name, 'is_active' => true]
                        );
                        $serviceMap[$sKey] = $service;
                    }
                    $service = $serviceMap[$sKey];

                    // Determine Lowest Cost
                    $lowestCost = null;
                    if (is_array($operators)) {
                        foreach ($operators as $opName => $info) {
                            if (isset($info['cost'])) {
                                $cost = (float) $info['cost'];
                                if ($lowestCost === null || $cost < $lowestCost) {
                                    $lowestCost = $cost;
                                }
                            }
                        }
                    }

                    if ($lowestCost !== null) {
                        // Check for existing price to preserve settings
                        $existing = ServicePrice::where('service_id', $service->id)
                            ->where('country_id', $country->id)
                            ->first();

                        $markupType = $existing ? 
                             ($existing->markup_type instanceof MarkupType ? $existing->markup_type : MarkupType::from($existing->markup_type)) 
                             : MarkupType::Fixed;
                        
                        $markupValue = $existing ? (float)$existing->markup_value : 0;
                        $isActive = $existing ? $existing->is_active : true;

                        $finalPrice = $pricingService->calculateFinalPrice($lowestCost, $markupType, $markupValue);

                        ServicePrice::updateOrCreate(
                            ['service_id' => $service->id, 'country_id' => $country->id],
                            [
                                'provider_price' => $lowestCost,
                                'is_active' => $isActive,
                                'markup_type' => $markupType,
                                'markup_value' => $markupValue,
                                'final_price' => $finalPrice,
                                // 'updated_at' is handled automatically by updateOrCreate
                            ]
                        );
                        $syncedCount++;
                    }
                }
            }

            Log::info("Full Sync Completed. Processed {$syncedCount} prices. Skipped: {$skippedCountries} countries (no ISO).");

        } catch (\Throwable $e) {
            Log::error('Background Sync Failed: ' . $e->getMessage(), [
                'exception' => $e,
            ]);
        } finally {
            Cache::forget('sync_in_progress');
        }
    }
}
