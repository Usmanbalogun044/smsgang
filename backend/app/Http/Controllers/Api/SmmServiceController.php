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

            $query = SmmService::where('is_active', true)
                ->with(['prices' => function ($q) {
                    $q->where('is_active', true);
                }]);

            if ($category) {
                $query->where('category', 'like', "%{$category}%");
            }

            if ($type) {
                $query->where('type', $type);
            }

            if ($search) {
                $query->where('name', 'like', "%{$search}%");
            }

            $services = $query->paginate($perPage);

            return response()->json([
                'data' => $services->map(fn ($service) => (
                    $price = $service->prices->first()
                ) ? [
                    'id' => $price->id,
                    'smm_service_id' => $service->id,
                    'markup_type' => $price->markup_type,
                    'markup_value' => (string) $price->markup_value,
                    'final_price' => (string) $price->final_price,
                    'is_active' => $price->is_active,
                    'created_at' => $price->created_at,
                    'smm_service' => [
                        'id' => $service->id,
                        'crestpanel_service_id' => $service->crestpanel_service_id,
                        'name' => $service->name,
                        'category' => $service->category,
                        'type' => $service->type,
                        'rate' => (float) $service->rate,
                        'rate_per_unit' => (float) $service->rate / 1000,
                        'min' => $service->min,
                        'max' => $service->max,
                        'refill' => $service->refill,
                        'cancel' => $service->cancel,
                        'is_active' => $service->is_active,
                        'created_at' => $service->created_at,
                    ],
                ] : null)->filter(),
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

            $price = $service->getActivePrice();

            return response()->json([
                'id' => $service->id,
                'crestpanel_id' => $service->crestpanel_service_id,
                'name' => $service->name,
                'category' => $service->category,
                'type' => $service->type,
                'rate' => (string) $service->rate,
                'min' => $service->min,
                'max' => $service->max,
                'refill' => $service->refill,
                'cancel' => $service->cancel,
                'markup_type' => $price ? $price->markup_type : null,
                'markup_value' => $price ? (string) $price->markup_value : null,
                'final_price_ngn' => $price ? (string) $price->final_price : '0.00',
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
