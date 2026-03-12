<?php

namespace App\Jobs;

use App\Models\Service;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class SyncServicesJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $timeout = 300;

    public function handle(): void
    {
        Log::info('Starting 5SIM Services Sync...');

        try {
            $response = Http::get('https://5sim.net/v1/guest/products/any/any');
            
            if (!$response->successful()) {
                throw new \Exception('5SIM API failed: ' . $response->status());
            }

            $products = $response->json();
            $synced = 0;
            $new = 0;

            foreach ($products as $code => $data) {
                // Determine a friendly name based on code
                $name = ucwords(str_replace(['_', '-'], ' ', $code));
                
                $service = Service::updateOrCreate(
                    ['provider_service_code' => strtolower($code)],
                    [
                        'name' => $name,
                        'is_active' => true, // Syncing all as active for initial setup
                    ]
                );

                if ($service->wasRecentlyCreated) {
                    $new++;
                }
                $synced++;
            }

            Log::info("FINISHED: Successfully synced {$synced} services ({$new} new) from 5SIM.");
        } catch (\Exception $e) {
            Log::error('SyncServicesJob Failed: ' . $e->getMessage());
        }
    }
}
