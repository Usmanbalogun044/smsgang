<?php

namespace App\Jobs;

use App\Enums\ActivationStatus;
use App\Models\Activation;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class CheckAllActiveSmsJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct() {}

    public function handle(): void
    {
        // Find all activations that are currently active (waiting for SMS)
        $activations = Activation::where('status', ActivationStatus::WaitingSms)
            ->where('expires_at', '>', now())
            ->get();

        Log::info("SMS Check: Found {$activations->count()} active sessions to check.");

        foreach ($activations as $activation) {
            Log::info("Dispatching SMS check for Activation #{$activation->id} ({$activation->service->name})");
            // Dispatch the individual checker for this activation
            CheckSmsJob::dispatch($activation->id);
        }
    }
}
