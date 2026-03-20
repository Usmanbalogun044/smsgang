<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SmmOrder;
use App\Models\SmmService;
use App\Services\CrestPanelService;
use App\Services\SmmPricingService;
use App\Services\WalletService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Throwable;

class SmmOrderController extends Controller
{
    public function __construct(
        private CrestPanelService $crestPanelService,
        private SmmPricingService $smmPricingService,
        private WalletService $walletService,
    ) {}

    /**
     * Create a new SMM order
     */
    public function store(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'smm_service_id' => ['required', 'exists:smm_services,id'],
                'link' => ['required', 'string', 'url'],
                'quantity' => ['required', 'integer', 'min:1'],
                'runs' => ['nullable', 'integer', 'min:1'],
                'interval' => ['nullable', 'integer', 'min:1'],
                'comments' => ['nullable', 'string'],
            ]);

            $user = $request->user();
            $service = SmmService::findOrFail($validated['smm_service_id']);

            // Validate quantity is within service limits
            if ($validated['quantity'] < $service->min || $validated['quantity'] > $service->max) {
                return response()->json([
                    'message' => "Quantity must be between {$service->min} and {$service->max}.",
                    'error' => 'invalid_quantity',
                ], 422);
            }

            // Calculate price
            $priceData = $this->smmPricingService->calculatePrice($service, $validated['quantity']);

            // Check wallet balance
            $wallet = $this->walletService->getOrCreateWallet($user);
            if ($wallet->balance < $priceData['final_price_ngn']) {
                return response()->json([
                    'message' => 'Insufficient wallet balance.',
                    'error' => 'insufficient_balance',
                    'required' => $priceData['final_price_ngn'],
                    'available' => $wallet->balance,
                    'deficit' => $priceData['final_price_ngn'] - $wallet->balance,
                ], 422);
            }

            // Create order on CrestPanel
            $cpOrder = $this->crestPanelService->createOrder([
                'service_id' => $service->crestpanel_service_id,
                'link' => $validated['link'],
                'quantity' => $validated['quantity'],
                'runs' => $validated['runs'] ?? null,
                'interval' => $validated['interval'] ?? null,
                'comments' => $validated['comments'] ?? null,
            ]);

            if (!$cpOrder || isset($cpOrder['error'])) {
                return response()->json([
                    'message' => 'Failed to create order on CrestPanel.',
                    'error' => 'provider_error',
                ], 422);
            }

            // Create order record in database
            $order = SmmOrder::create([
                'user_id' => $user->id,
                'smm_service_id' => $service->id,
                'crestpanel_order_id' => $cpOrder['order'] ?? uniqid(),
                'link' => $validated['link'],
                'quantity' => $validated['quantity'],
                'runs' => $validated['runs'] ?? null,
                'interval' => $validated['interval'] ?? null,
                'comments' => $validated['comments'] ?? null,
                'price_per_unit' => $priceData['final_price_ngn'] / $validated['quantity'],
                'total_units' => $validated['quantity'],
                'total_cost_ngn' => $priceData['final_price_ngn'],
                'exchange_rate_used' => $priceData['exchange_rate'],
                'markup_type_used' => $priceData['markup_type'],
                'markup_value_used' => $priceData['markup_value'],
                'provider_payload' => $cpOrder,
                'status' => 'Pending',
            ]);

            // Deduct from wallet
            $this->walletService->deductFunds(
                $user,
                $priceData['final_price_ngn'],
                "smm_order_{$order->id}",
                "SMM service purchase - {$service->name}"
            );

            Log::channel('activity')->info('SMM order created', [
                'user_id' => $user->id,
                'order_id' => $order->id,
                'service' => $service->name,
                'quantity' => $validated['quantity'],
                'cost_ngn' => $priceData['final_price_ngn'],
            ]);

            return response()->json([
                'message' => 'Order created successfully.',
                'order' => [
                    'id' => $order->id,
                    'crestpanel_order_id' => $order->crestpanel_order_id,
                    'service_name' => $service->name,
                    'link' => $order->link,
                    'quantity' => $order->quantity,
                    'total_cost_ngn' => (string) $order->total_cost_ngn,
                    'status' => $order->status,
                    'created_at' => $order->created_at->toIso8601String(),
                ],
                'remaining_balance' => $this->walletService->getBalance($user),
            ], 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'message' => 'Validation error',
                'errors' => $e->errors(),
            ], 422);
        } catch (Throwable $e) {
            Log::error('SMM order creation failed', [
                'user_id' => $request->user()?->id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'message' => 'Failed to create order.',
                'error' => 'order_failed',
            ], 422);
        }
    }

    /**
     * Get user's SMM orders
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $user = $request->user();
            $perPage = (int) $request->query('per_page', 20);
            $status = $request->query('status');

            $query = SmmOrder::where('user_id', $user->id)
                ->with('service');

            if ($status) {
                $query->where('status', $status);
            }

            $orders = $query->latest()->paginate($perPage);

            return response()->json([
                'data' => $orders->map(fn ($order) => [
                    'id' => $order->id,
                    'crestpanel_order_id' => $order->crestpanel_order_id,
                    'service_name' => $order->service ? $order->service->name : 'Unknown',
                    'link' => $order->link,
                    'quantity' => $order->quantity,
                    'total_cost_ngn' => (string) $order->total_cost_ngn,
                    'status' => $order->status,
                    'created_at' => $order->created_at->toIso8601String(),
                ]),
                'pagination' => [
                    'total' => $orders->total(),
                    'per_page' => $orders->perPage(),
                    'current_page' => $orders->currentPage(),
                    'last_page' => $orders->lastPage(),
                ],
            ]);
        } catch (Throwable $e) {
            return response()->json([
                'message' => 'Failed to fetch orders.',
                'error' => 'fetch_failed',
            ], 422);
        }
    }

    /**
     * Get single SMM order details with real-time status
     */
    public function show(SmmOrder $order, Request $request): JsonResponse
    {
        try {
            // Check authorization
            if ($order->user_id !== $request->user()->id) {
                return response()->json([
                    'message' => 'Unauthorized',
                ], 403);
            }

            // Get real-time status from CrestPanel
            $statusData = $this->crestPanelService->getOrderStatus($order->crestpanel_order_id);

            $status = $statusData['status'] ?? $order->status;
            $remains = $statusData['remains'] ?? null;
            $startCount = $statusData['start_count'] ?? null;
            $charge = isset($statusData['charge']) 
                ? (float) $statusData['charge'] 
                : $order->charge_ngn;

            return response()->json([
                'id' => $order->id,
                'crestpanel_order_id' => $order->crestpanel_order_id,
                'service' => $order->service ? [
                    'id' => $order->service->id,
                    'name' => $order->service->name,
                ] : null,
                'link' => $order->link,
                'quantity' => $order->quantity,
                'total_cost_ngn' => (string) $order->total_cost_ngn,
                'charge_ngn' => $charge ? (string) $charge : null,
                'status' => $status,
                'remains' => $remains,
                'start_count' => $startCount,
                'created_at' => $order->created_at->toIso8601String(),
                'updated_at' => $order->updated_at->toIso8601String(),
            ]);
        } catch (Throwable $e) {
            return response()->json([
                'message' => 'Failed to fetch order.',
                'error' => 'fetch_failed',
            ], 422);
        }
    }
}
