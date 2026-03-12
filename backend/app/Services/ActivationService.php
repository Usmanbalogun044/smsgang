<?php

namespace App\Services;

use App\Enums\ActivationStatus;
use App\Enums\OrderStatus;
use App\Jobs\CheckSmsJob;
use App\Models\Activation;
use App\Models\Country;
use App\Models\Order;
use App\Models\Service;
use App\Models\Setting;
use App\Models\User;
use App\Services\SmsProviders\ProviderInterface;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class ActivationService
{
    public function __construct(
        private ProviderInterface $provider,
        private LendoverifyService $lendoverify,
    ) {}

    public function initiatePurchase(User $user, Service $service, Country $country): Order
    {
        $globalMarkup = (float) Setting::get('global_markup', 100);
        $exchangeRate = (float) Setting::get('exchange_rate', 18);

        // Fetch live price from 5SIM for this country+service
        $providerPrice = 0.0;
        try {
            $baseUrl = rtrim(config('services.fivesim.base_url'), '/');
            $providerCode = $country->provider_code ?? strtolower($country->name);
            $response = Http::timeout(10)
                ->get("{$baseUrl}/guest/prices", [
                    'product' => $service->provider_service_code,
                    'country' => $providerCode,
                ]);
            $priceData = $response->json() ?? [];
            $operators = $priceData[$providerCode][$service->provider_service_code] ?? [];
            foreach ($operators as $info) {
                if (isset($info['cost'])) {
                    $providerPrice = (float) $info['cost'];
                    break;
                }
            }
        } catch (\Exception $e) {
            Log::warning('Could not fetch live price from 5SIM', [
                'service' => $service->provider_service_code,
                'country' => $country->name,
                'error'   => $e->getMessage(),
            ]);
        }

        $finalPrice = round(($providerPrice * $exchangeRate) + $globalMarkup, 2);
        $paymentReference = 'SMS_' . uniqid();

        $order = Order::create([
            'user_id'           => $user->id,
            'service_id'        => $service->id,
            'country_id'        => $country->id,
            'price'             => $finalPrice,
            'payment_reference' => $paymentReference,
            'status'            => OrderStatus::Pending,
        ]);

        $callbackUrl = rtrim(config('app.frontend_url', config('app.url')), '/') . '/activations/' . $order->id . '/verify';

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
