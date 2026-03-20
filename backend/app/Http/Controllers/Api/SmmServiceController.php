<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SmmService;
use App\Services\CrestPanelService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SmmServiceController extends Controller
{
    /**
     * Get all active SMM services
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $category = $request->query('category');
            $type = $request->query('type');
            $search = $request->query('search');
            $perPage = (int) $request->query('per_page', 50);

            // Get global markup settings
            $globalMarkupValue = (float) \App\Models\Setting::get('smm_global_markup_fixed', 10);
            $globalMarkupType = \App\Models\Setting::get('smm_global_markup_type', 'percent');

            $query = SmmService::where('is_active', true);

            if ($category) {
                $query->where('category', $category);
            }

            if ($search) {
                $query->where('name', 'like', "%{$search}%");
            }

            $services = $query->paginate($perPage);

            return response()->json([
                'data' => $services->getCollection()->map(function ($service) use ($globalMarkupValue, $globalMarkupType) {
                    $baseRatePerUnit = (float) $service->rate / 1000;
                    
                    if ($globalMarkupType === 'percent') {
                        $finalRatePerUnit = $baseRatePerUnit * (1 + ($globalMarkupValue / 100));
                    } else {
                        $finalRatePerUnit = $baseRatePerUnit + ($globalMarkupValue / 1000);
                    }

                    return [
                        'id' => $service->id,
                        'name' => $service->name,
                        'category' => $service->category,
                        'type' => $service->type,
                        'rate_per_1000' => (float) $service->rate,
                        'rate_per_unit' => round($finalRatePerUnit, 4),
                        'min' => $service->min,
                        'max' => $service->max,
                        'refill' => $service->refill,
                        'cancel' => $service->cancel,
                    ];
                }),
                'meta' => [
                    'total' => $services->total(),
                    'per_page' => $services->perPage(),
                    'current_page' => $services->currentPage(),
                    'last_page' => $services->lastPage(),
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to fetch SMM services.',
                'error' => 'fetch_failed',
            ], 422);
        }
    }

    /**
     * Get single SMM service details
     */
    public function show(SmmService $service): JsonResponse
    {
        try {
            if (!$service->is_active) {
                return response()->json([
                    'message' => 'Service not found.',
                ], 404);
            }

            // Get global markup settings
            $globalMarkupValue = (float) \App\Models\Setting::get('smm_global_markup_fixed', 10);
            $globalMarkupType = \App\Models\Setting::get('smm_global_markup_type', 'percent');

            $baseRatePerUnit = (float) $service->rate / 1000;
                    
            if ($globalMarkupType === 'percent') {
                $finalRatePerUnit = $baseRatePerUnit * (1 + ($globalMarkupValue / 100));
            } else {
                $finalRatePerUnit = $baseRatePerUnit + ($globalMarkupValue / 1000);
            }

            return response()->json([
                'id' => $service->id,
                'crestpanel_id' => $service->crestpanel_service_id,
                'name' => $service->name,
                'category' => $service->category,
                'type' => $service->type,
                'rate_per_1000' => (float) $service->rate,
                'rate_per_unit' => round($finalRatePerUnit, 4),
                'min' => $service->min,
                'max' => $service->max,
                'refill' => $service->refill,
                'cancel' => $service->cancel,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to fetch service.',
                'error' => 'fetch_failed',
            ], 422);
        }
    }

    /**
     * Get CrestPanel account balance (admin only)
     */
    public function getBalance(): JsonResponse
    {
        try {
            $crestPanelService = new CrestPanelService();
            $balance = $crestPanelService->getBalance();

            return response()->json([
                'balance' => $balance !== null ? number_format($balance, 2) : 'N/A',
                'last_updated' => now()->toIso8601String(),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to fetch CrestPanel balance.',
                'error' => 'fetch_failed',
            ], 422);
        }
    }
}
