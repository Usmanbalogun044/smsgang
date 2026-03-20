<?php

namespace App\Services;

use App\Models\SmmService;
use App\Models\SmmServicePrice;
use App\Models\Setting;
use Illuminate\Support\Facades\Log;

class SmmPricingService
{
    private string $markupType;
    private float $markupValue;
    private float $globalMarkupFixed;
    private string $globalMarkupType;

    public function __construct()
    {
        // Get global SMM markup settings from database (Setting model)
        $this->globalMarkupFixed = (float) Setting::get('smm_global_markup_fixed', 500); // Fixed NGN markup
        $this->globalMarkupType = Setting::get('smm_global_markup_type', 'fixed'); // 'fixed' or 'percent'
        $this->markupType = config('services.smm_markup_type', 'Fixed');
        $this->markupValue = (float) config('services.smm_markup_value', 10); // 10% as individual markup
    }

    /**
     * Calculate final price for SMM service (CrestPanel rate is for 1000 units, already in NGN)
     */
    public function calculatePrice(SmmService $service, int $quantity = 1): array
    {
        // CrestPanel rate is for 1,000 units. Convert to price per 1 unit.
        $rateInNgnPer1000 = (float) $service->rate;
        $pricePerUnit = $rateInNgnPer1000 / 1000;
        
        // Final base cost before markup
        $totalCostNgn = $pricePerUnit * $quantity;
        
        // Apply global markup first (base profit)
        $basePriceNgn = $totalCostNgn;
        if ($this->globalMarkupType === 'percent') {
            $basePriceNgn = $basePriceNgn * (1 + ($this->globalMarkupFixed / 100));
        } else {
            // If it's fixed, we should apply it per quantity or per order?
            // Usually, fixed markups are per 1000 or per order. 
            // Let's assume global markup is per 1000 units to be consistent with panel pricing.
            $fixedMarkupPerUnit = $this->globalMarkupFixed / 1000;
            $basePriceNgn += ($fixedMarkupPerUnit * $quantity);
        }
        
        // Apply individual service markup (likely percentage or per order)
        $markupAmount = $this->applyMarkup($basePriceNgn);
        $finalPriceNgn = $basePriceNgn + $markupAmount;

        return [
            'rate_ngn' => $rateInNgnPer1000,
            'price_per_unit' => $pricePerUnit,
            'quantity' => $quantity,
            'total_cost_ngn' => $totalCostNgn,
            'final_price_ngn' => round($finalPriceNgn, 2),
            'markup_applied' => $finalPriceNgn - $totalCostNgn,
        ];
    }
            'global_markup_fixed' => $this->globalMarkupFixed,
            'global_markup_type' => $this->globalMarkupType,
            'base_price_ngn' => $basePriceNgn,
            'markup_type' => $this->markupType,
            'markup_value' => $this->markupValue,
            'markup_amount' => $markupAmount,
            'final_price_ngn' => round($finalPriceNgn, 2),
        ];
    }

    /**
     * Apply markup based on type and value
     */
    private function applyMarkup(float $basePrice): float
    {
        return match ($this->markupType) {
            'Fixed' => $this->markupValue,
            'Percent' => ($basePrice * $this->markupValue) / 100,
            default => 0,
        };
    }

    /**
     * Sync and update service prices from CrestPanel
     */
    public function syncServices(array $crestpanelServices): array
    {
        $results = [
            'created' => 0,
            'updated' => 0,
            'failed' => 0,
        ];

        foreach ($crestpanelServices as $cpService) {
            try {
                $service = SmmService::updateOrCreate(
                    ['crestpanel_service_id' => $cpService['service'] ?? null],
                    [
                        'name' => $cpService['name'] ?? 'Unknown',
                        'category' => $cpService['category'] ?? null,
                        'type' => $cpService['type'] ?? null,
                        'rate' => (float) ($cpService['rate'] ?? 0), // Rate is in NGN from CrestPanel
                        'min' => (int) ($cpService['min'] ?? 1),
                        'max' => (int) ($cpService['max'] ?? 10000),
                        'refill' => (bool) ($cpService['refill'] ?? false),
                        'cancel' => (bool) ($cpService['cancel'] ?? false),
                        'provider_payload' => $cpService,
                        'last_synced_at' => now(),
                        'is_active' => true,
                    ]
                );

                // Calculate price per unit (quantity = 1)
                $priceData = $this->calculatePrice($service, 1);

                SmmServicePrice::updateOrCreate(
                    ['smm_service_id' => $service->id],
                    [
                        'markup_type' => $this->markupType,
                        'markup_value' => $this->markupValue,
                        'final_price' => $priceData['final_price_ngn'],
                        'last_synced_at' => now(),
                        'is_active' => true,
                    ]
                );

                $results['updated']++;
            } catch (\Exception $e) {
                Log::error('Failed to sync SMM service', [
                    'service_id' => $cpService['service'] ?? null,
                    'error' => $e->getMessage(),
                ]);
                $results['failed']++;
            }
        }

        return $results;
    }
}
