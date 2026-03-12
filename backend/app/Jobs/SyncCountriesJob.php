<?php

namespace App\Jobs;

use App\Models\Country;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class SyncCountriesJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $timeout = 300;

    public function handle(): void
    {
        Log::info('Starting 5SIM Countries Sync...');

        try {
            $response = Http::get('https://5sim.net/v1/guest/countries');
            
            if (!$response->successful()) {
                throw new \Exception('5SIM API failed: ' . $response->status());
            }

            $countries = $response->json();
            $synced = 0;
            $new = 0;

            foreach ($countries as $key => $data) {
                // Get the ISO code from the nested structure
                $iso = isset($data['iso']) ? array_key_first($data['iso']) : null;
                $name = $data['text_en'] ?? ucfirst($key);

                if (!$iso) continue;

                $country = Country::updateOrCreate(
                    ['code' => strtoupper($iso)],
                    [
                        'name' => $name,
                        'is_active' => true, // Defaulting new countries to active for admin review
                    ]
                );

                if ($country->wasRecentlyCreated) {
                    $new++;
                }
                $synced++;
            }

            Log::info("FINISHED: Successfully synced {$synced} countries ({$new} new) from 5SIM.");
        } catch (\Exception $e) {
            Log::error('SyncCountriesJob Failed: ' . $e->getMessage());
        }
    }
}
