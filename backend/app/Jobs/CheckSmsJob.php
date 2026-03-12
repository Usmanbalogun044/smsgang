<?php

namespace App\Jobs;

use App\Enums\ActivationStatus;
use App\Models\Activation;
use App\Services\ActivationService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class CheckSmsJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 60;

    public int $backoff = 5;

    public function __construct(
        private int $activationId,
    ) {}

    public function handle(ActivationService $activationService): void
    {
        $activation = Activation::find($this->activationId);

        if (! $activation || $activation->isTerminal()) {
            return;
        }

        if ($activation->isExpired()) {
            $activationService->expireActivation($activation);

            return;
        }

        $smsCode = $activationService->checkForSms($activation);

        if ($smsCode) {
            $activationService->completeActivation($activation->fresh());

            Log::channel('payments')->info('SMS received', [
                'activation_id' => $activation->id,
            ]);

            return;
        }

        // Re-dispatch to check again
        self::dispatch($this->activationId)->delay(now()->addSeconds(5));
    }
}
