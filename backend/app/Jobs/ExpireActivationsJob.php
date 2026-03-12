<?php

namespace App\Jobs;

use App\Enums\ActivationStatus;
use App\Models\Activation;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class ExpireActivationsJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function handle(): void
    {
        Activation::where('expires_at', '<', now())
            ->whereNotIn('status', [
                ActivationStatus::Completed->value,
                ActivationStatus::Expired->value,
                ActivationStatus::Cancelled->value,
            ])
            ->update(['status' => ActivationStatus::Expired->value]);
    }
}
