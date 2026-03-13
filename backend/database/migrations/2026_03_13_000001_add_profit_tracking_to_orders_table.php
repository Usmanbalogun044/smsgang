<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->decimal('provider_price_usd', 12, 4)->nullable()->after('price');
            $table->decimal('exchange_rate_used', 12, 4)->nullable()->after('provider_price_usd');
            $table->decimal('effective_exchange_rate', 12, 4)->nullable()->after('exchange_rate_used');
            $table->string('global_markup_type_used', 20)->nullable()->after('effective_exchange_rate');
            $table->decimal('global_markup_value_used', 12, 4)->nullable()->after('global_markup_type_used');
            $table->decimal('estimated_cost_ngn', 12, 2)->nullable()->after('global_markup_value_used');
            $table->decimal('profit_amount', 12, 2)->nullable()->after('estimated_cost_ngn');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn([
                'provider_price_usd',
                'exchange_rate_used',
                'effective_exchange_rate',
                'global_markup_type_used',
                'global_markup_value_used',
                'estimated_cost_ngn',
                'profit_amount',
            ]);
        });
    }
};
