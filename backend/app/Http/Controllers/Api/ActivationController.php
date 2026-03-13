<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\BuyActivationRequest;
use App\Http\Resources\ActivationResource;
use App\Http\Resources\OrderResource;
use App\Models\Activation;
use App\Models\Country;
use App\Models\Order;
use App\Models\Service;
use App\Services\ActivationService;
use App\Services\LendoverifyService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Log;
use Throwable;

class ActivationController extends Controller
{
    public function __construct(
        private ActivationService $activationService,
        private LendoverifyService $lendoverify,
    ) {}

    public function buy(BuyActivationRequest $request): JsonResponse
    {
        $service = Service::findOrFail($request->service_id);
        $country = Country::findOrFail($request->country_id);

        $order = $this->activationService->initiatePurchase(
            user: $request->user(),
            service: $service,
            country: $country,
        );

        Log::channel('activity')->info('Activation purchase initiated', [
            'user_id' => $request->user()->id,
            'order_id' => $order->id,
            'service' => $service->name,
            'country' => $country->name,
            'price' => $order->price,
        ]);

        return response()->json([
            'message' => 'Order initiated. Please complete payment.',
            'order' => new OrderResource($order->load(['service', 'country'])),
            'checkout_url' => $order->lendoverify_checkout_url,
            'payment_gateway_link' => $order->lendoverify_checkout_url,
        ], 201);
    }

    public function verifyPayment(Request $request, Order $order): JsonResponse
    {
        $this->authorize('view', $order);

        if ($order->status->value !== 'pending') {
            return response()->json([
                'message' => 'Order is not awaiting payment.',
                'order' => new OrderResource($order->load(['service', 'country', 'activation'])),
            ], 422);
        }

        $result = $this->lendoverify->verifyReference($order->payment_reference);
        $data = $result['data'] ?? $result;

        $paymentStatusRaw = $data['paymentStatus'] ?? $data['status'] ?? null;
        $paymentStatus = is_string($paymentStatusRaw)
            ? strtolower(trim($paymentStatusRaw))
            : null;

        if (! in_array($paymentStatus, ['paid', 'success', 'successful', 'completed'], true)) {
            return response()->json([
                'message' => 'Payment not confirmed yet.',
                'payment_status' => $paymentStatusRaw,
            ], 402);
        }

        $amountPaid = $data['amountPaid'] ?? $data['amount'] ?? 0;
        if (is_string($amountPaid) && str_contains($amountPaid, '.')) {
            $amountPaid = (float) $amountPaid;
        } elseif (is_numeric($amountPaid) && $amountPaid > 10000) {
            $amountPaid = $amountPaid / 100;
        }

        if (abs((float) $amountPaid - (float) $order->price) > 1) {
            return response()->json([
                'message' => 'Payment amount mismatch.',
            ], 422);
        }

        $order->update(['status' => 'paid']);

        try {
            $activation = $this->activationService->processAfterPayment($order);
        } catch (Throwable $e) {
            $message = strtolower($e->getMessage());

            if (str_contains($message, 'not enough user balance')) {
                Log::channel('activity')->error('Provider balance insufficient after successful payment', [
                    'order_id' => $order->id,
                    'user_id' => $request->user()->id,
                    'provider' => '5sim',
                    'error' => $e->getMessage(),
                ]);

                return response()->json([
                    'message' => 'Payment received, but number allocation is temporarily unavailable. Please contact support for immediate assistance.',
                    'code' => 'PROVIDER_INSUFFICIENT_BALANCE',
                    'order_id' => $order->id,
                ], 503);
            }

            Log::channel('activity')->error('Payment verified but activation provisioning failed', [
                'order_id' => $order->id,
                'user_id' => $request->user()->id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'message' => 'Payment received, but activation provisioning failed. Please try again shortly or contact support.',
                'code' => 'ACTIVATION_PROVISIONING_FAILED',
                'order_id' => $order->id,
            ], 503);
        }

        Log::channel('activity')->info('Payment verified, number assigned', [
            'order_id' => $order->id,
            'activation_id' => $activation->id,
            'user_id' => $request->user()->id,
        ]);

        return response()->json([
            'message' => 'Payment verified. Number assigned.',
            'activation' => new ActivationResource($activation->load(['service', 'country'])),
        ]);
    }

    public function index(Request $request): AnonymousResourceCollection
    {
        $activations = Activation::with(['service', 'country', 'order'])
            ->whereHas('order', fn ($q) => $q->where('user_id', $request->user()->id))
            ->latest()
            ->paginate(20);

        return ActivationResource::collection($activations);
    }

    public function show(Activation $activation): ActivationResource
    {
        $this->authorize('view', $activation);

        return new ActivationResource($activation->load(['service', 'country']));
    }

    public function checkSms(Activation $activation): JsonResponse
    {
        $this->authorize('view', $activation);

        if ($activation->isTerminal()) {
            return response()->json([
                'activation' => new ActivationResource($activation),
                'message' => 'Activation is already in terminal state.',
            ]);
        }

        $smsCode = $this->activationService->checkForSms($activation);

        return response()->json([
            'activation' => new ActivationResource($activation->fresh()->load(['service', 'country'])),
            'sms_code' => $smsCode,
        ]);
    }

    public function cancel(Request $request, Activation $activation): JsonResponse
    {
        $this->authorize('cancel', $activation);

        $this->activationService->cancelActivation($activation);

        Log::channel('activity')->info('Activation cancelled by user', [
            'activation_id' => $activation->id,
            'user_id' => $request->user()->id,
        ]);

        return response()->json([
            'message' => 'Activation cancelled.',
            'activation' => new ActivationResource($activation->fresh()->load(['service', 'country'])),
        ]);
    }
}
