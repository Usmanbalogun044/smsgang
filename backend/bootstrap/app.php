<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Console\Scheduling\Schedule;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->alias([
            'admin' => \App\Http\Middleware\EnsureIsAdmin::class,
            'active' => \App\Http\Middleware\EnsureIsActive::class,
        ]);

        $middleware->statefulApi();
    })
    ->withSchedule(function (Schedule $schedule) {
        // Clear sync lock every 30 mins
        $schedule->call(fn() => \Illuminate\Support\Facades\Cache::forget('sync_in_progress'))->everyThirtyMinutes();
        
        // Auto-sync prices from 5Sim hourly
        $schedule->job(new \App\Jobs\SyncAllPricingJob)->hourly();
        
        // Clear expired activations and check for SMS
        $schedule->job(new \App\Jobs\ExpireActivationsJob)->everyMinute();
        $schedule->job(new \App\Jobs\CheckAllActiveSmsJob)->everyMinute();
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })->create();
