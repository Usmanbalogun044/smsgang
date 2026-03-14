<?php

namespace App\Services;

use App\Enums\ActivationStatus;
use App\Enums\MarkupType;
use App\Enums\OrderStatus;
use App\Jobs\CheckSmsJob;
use App\Models\Activation;
use App\Models\Country;
use App\Models\Order;
use App\Models\Service;
use App\Models\Setting;
use App\Models\ServicePrice;
use App\Models\User;
use App\Services\SmsProviders\ProviderInterface;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

class ActivationService
{
    public function __construct(
        private ProviderInterface $provider,
        private LendoverifyService $lendoverify,
        private PricingService $pricingService,
    ) {}

    public function initiatePurchase(User $user, Service $service, Country $country): Order
    {
        // Settings are handled inside PricingService.
        $providerPrice = 0.0;
        $providerCode = strtolower($country->provider_code ?? $country->name);
        $serviceCode = strtolower($service->provider_service_code);

        try {
            $baseUrl = rtrim(config('services.fivesim.base_url'), '/');
            $response = Http::connectTimeout(10)
                ->timeout(30)
                ->retry(1, 300)
                ->get("{$baseUrl}/guest/prices", [
                    'product' => $service->provider_service_code,
                ]);

            if (! $response->successful()) {
                throw new \RuntimeException('5SIM request failed with status ' . $response->status());
            }

            $priceData = $response->json() ?? [];
            $priceDataLower = array_change_key_case($priceData, CASE_LOWER);
            $countriesData = $priceDataLower[$serviceCode] ?? [];
            $operators = $countriesData[$providerCode] ?? [];

            foreach ($operators as $info) {
                $cost = (float) ($info['cost'] ?? 0);
                $count = (int) ($info['count'] ?? 0);

                if ($count > 0 && $cost > 0 && ($providerPrice <= 0 || $cost < $providerPrice)) {
                    $providerPrice = $cost;
                }
            }
        } catch (Throwable $e) {
            Log::warning('Could not fetch live price from 5SIM', [
                'service' => $service->provider_service_code,
                'country' => $country->name,
                'error'   => $e->getMessage(),
            ]);
        }

        if ($providerPrice <= 0) {
            $savedPrice = ServicePrice::query()
                ->where('service_id', $service->id)
                ->where('country_id', $country->id)
                ->where('is_active', true)
                ->first();

            if ($savedPrice) {
                $providerPrice = (float) $savedPrice->provider_price;
            }
        }

        if ($providerPrice <= 0) {
            throw new \RuntimeException('No active price found for the selected service and country.');
        }

        $exchangeRate = (float) Setting::get('exchange_rate_usd_ngn', 1600.0);
        $globalMarkupType = (string) Setting::get('global_markup_type', 'fixed');
        $globalMarkupValue = (float) Setting::get('global_markup_fixed', 150);

        // Keep the same safety factor as PricingService so reported profit aligns with selling price.
        $effectiveExchangeRate = $exchangeRate * 1.05;
        $estimatedCostNgn = round($providerPrice * $effectiveExchangeRate, 2);

        $markupAmount = $globalMarkupType === 'percentage'
            ? round(($estimatedCostNgn * $globalMarkupValue) / 100, 2)
            : round($globalMarkupValue, 2);

        $finalPrice = $this->pricingService->calculateFinalPrice($providerPrice, MarkupType::Fixed, 0);
        $profitAmount = round($finalPrice - $estimatedCostNgn, 2);

        if ($profitAmount < 0) {
            $profitAmount = 0.0;
        }

        $paymentReference = 'SMS_' . uniqid();

        $order = Order::create([
            'user_id'           => $user->id,
            'service_id'        => $service->id,
            'country_id'        => $country->id,
            'price'             => $finalPrice,
            'provider_price_usd' => $providerPrice,
            'exchange_rate_used' => $exchangeRate,
            'effective_exchange_rate' => $effectiveExchangeRate,
            'global_markup_type_used' => $globalMarkupType,
            'global_markup_value_used' => $globalMarkupValue,
            'estimated_cost_ngn' => $estimatedCostNgn,
            'profit_amount' => $profitAmount,
            'payment_reference' => $paymentReference,
            'status'            => OrderStatus::Pending,
        ]);

        // Send the clean base URL — Lendoverify will append ?paymentReference=... itself.
        // Do NOT add our own query params here or we'll get a double-? malformed URL.
        $callbackUrl = rtrim((string) config('app.verify_payment_url', config('app.frontend_url', config('app.url')) . '/verify-payment'), '/');

        $payment = $this->lendoverify->initializeTransaction([
            'amount'             => (int) round($finalPrice * 100),
            'customerEmail'      => $user->email,
            'customerName'       => $user->name,
            'paymentReference'   => $paymentReference,
            'paymentDescription' => "SMS Activation: {$service->name} ({$country->name})",
            'redirectUrl'        => $callbackUrl,
        ]);

        $data = $payment['data'] ?? $payment;

        $order->update([
            'lendoverify_checkout_url' => $data['checkout_url'] ?? $data['authorization_url'] ?? null,
            'payment_reference' => $data['paymentReference'] ?? $paymentReference,
        ]);

        return $order->fresh();
    }

    public function processAfterPayment(Order $order): Activation
    {
        $order->update(['status' => OrderStatus::Processing]);

        try {
            $result = $this->provider->buyNumber(
                product: $order->service->provider_service_code,
                country: $order->country->provider_code ?? strtolower($order->country->name),
            );

            $activation = Activation::create([
                'order_id' => $order->id,
                'service_id' => $order->service_id,
                'country_id' => $order->country_id,
                'provider_activation_id' => $result['id'],
                'phone_number' => $result['phone'],
                'status' => ActivationStatus::NumberReceived,
                'expires_at' => now()->addMinutes(15),
            ]);

            $order->update(['status' => OrderStatus::Completed]);

            CheckSmsJob::dispatch($activation->id)->delay(now()->addSeconds(5));

            Log::channel('activity')->info('Activation created', [
                'order_id' => $order->id,
                'activation_id' => $activation->id,
                'phone' => $result['phone'],
            ]);

            return $activation;
        } catch (\Exception $e) {
            $order->update(['status' => OrderStatus::Failed]);

            Log::channel('activity')->error('Number purchase failed', [
                'order_id' => $order->id,
                'error' => $e->getMessage(),
            ]);

            throw $e;
        }
    }

    public function checkForSms(Activation $activation): ?string
    {
        $result = $this->provider->checkSms($activation->provider_activation_id);

        if ($result && ! empty($result['codes'])) {
            $smsCode = implode(', ', $result['codes']);

            $activation->update([
                'sms_code' => $smsCode,
                'status' => ActivationStatus::SmsReceived,
            ]);

            return $smsCode;
        }

        if ($activation->status === ActivationStatus::NumberReceived) {
            $activation->update(['status' => ActivationStatus::WaitingSms]);
        }

        return null;
    }

    public function completeActivation(Activation $activation): void
    {
        $this->provider->finishActivation($activation->provider_activation_id);

        $activation->update(['status' => ActivationStatus::Completed]);
    }

    public function cancelActivation(Activation $activation): void
    {
        $this->provider->cancelActivation($activation->provider_activation_id);

        $activation->update(['status' => ActivationStatus::Cancelled]);
    }

    public function expireActivation(Activation $activation): void
    {
        $activation->update(['status' => ActivationStatus::Expired]);
    }
}
