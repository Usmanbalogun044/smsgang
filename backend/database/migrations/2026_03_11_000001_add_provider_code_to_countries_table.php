<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('countries', function (Blueprint $table) {
            // 5SIM uses lowercase names like 'nigeria', 'russia' (not ISO codes)
            $table->string('provider_code')->nullable()->unique()->after('code');
        });
    }

    public function down(): void
    {
        Schema::table('countries', function (Blueprint $table) {
            $table->dropColumn('provider_code');
        });
    }
};
