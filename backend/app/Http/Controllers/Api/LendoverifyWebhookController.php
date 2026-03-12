<?php

namespace App\Http\Controllers\Api;

use App\Enums\OrderStatus;
use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Services\ActivationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class LendoverifyWebhookController extends Controller
{
    public function __construct(
        private ActivationService $activationService,
    ) {}

    public function handle(Request $request): JsonResponse
    {
        $payload = $request->all();
        $event = $payload['event'] ?? null;
        $data = $payload['data'] ?? $payload;

        Log::channel('activity')->info('Webhook received', [
            'event' => $event,
            'reference' => $data['paymentReference'] ?? 'unknown',
        ]);

        if (! in_array($event, ['collection.successful', 'payment.successful']) && empty($data['success'])) {
            return response()->json(['message' => 'Event ignored.']);
        }

        $reference = $data['paymentReference'] ?? $data['reference'] ?? null;

        if (! $reference) {
            return response()->json(['message' => 'No reference found.'], 400);
        }

        $order = Order::where('payment_reference', $reference)->first();

        if (! $order) {
            Log::channel('activity')->warning('Webhook: order not found', ['reference' => $reference]);

            return response()->json(['message' => 'Order not found.'], 404);
        }

        if ($order->status !== OrderStatus::Pending) {
            return response()->json(['message' => 'Order already processed.']);
        }

        $order->update(['status' => OrderStatus::Paid]);

        try {
            $this->activationService->processAfterPayment($order);
        } catch (\Exception $e) {
            Log::channel('activity')->error('Webhook: activation failed after payment', [
                'order_id' => $order->id,
                'error' => $e->getMessage(),
            ]);
        }

        return response()->json(['message' => 'OK']);
    }
}
