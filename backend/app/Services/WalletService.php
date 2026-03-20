<?php

namespace App\Services;

use App\Models\User;
use App\Models\Wallet;
use App\Models\Transaction;
use Illuminate\Support\Facades\DB;

class WalletService
{
    /**
     * Get or create user's wallet
     */
    public function getOrCreateWallet(User $user): Wallet
    {
        return $user->wallet()->firstOrCreate(
            ['user_id' => $user->id],
            ['balance' => 0]
        );
    }

    /**
     * Get user's wallet balance
     */
    public function getBalance(User $user): string
    {
        $wallet = $this->getOrCreateWallet($user);
        return (string) $wallet->balance;
    }

    /**
     * Add funds to user's wallet
     */
    public function addFunds(User $user, float $amount, string $reference): Transaction
    {
        $wallet = $this->getOrCreateWallet($user);

        $transaction = Transaction::create([
            'user_id' => $user->id,
            'amount' => $amount,
            'type' => 'credit',
            'operation_type' => 'wallet_fund',
            'status' => 'paid',
            'reference' => $reference,
            'description' => "Wallet funding",
            'gateway' => 'lendoverify',
        ]);

        $wallet->addBalance($amount);

        return $transaction;
    }

    /**
     * Deduct funds from wallet (for purchases)
     */
    public function deductFunds(User $user, float $amount, string $reference, string $description): ?Transaction
    {
        $wallet = $this->getOrCreateWallet($user);

        if ($wallet->balance < $amount) {
            return null; // Insufficient balance
        }

        $transaction = Transaction::create([
            'user_id' => $user->id,
            'amount' => $amount,
            'type' => 'debit',
            'operation_type' => 'wallet_debit',
            'status' => 'paid',
            'reference' => $reference,
            'description' => $description,
        ]);

        $wallet->deductBalance($amount);

        return $transaction;
    }

    /**
     * Get wallet transaction history
     */
    public function getTransactions(User $user, ?string $type = null, ?string $period = null, int $perPage = 20)
    {
        $query = Transaction::where('user_id', $user->id)
            ->where('operation_type', 'wallet_fund')
            ->orWhere(function ($q) use ($user) {
                $q->where('user_id', $user->id)
                  ->where('operation_type', 'wallet_debit');
            });

        if ($type) {
            $query->where('type', $type);
        }

        if ($period) {
            $query = $this->filterByPeriod($query, $period);
        }

        return $query->latest()->paginate($perPage);
    }

    /**
     * Filter transactions by period
     */
    private function filterByPeriod($query, string $period)
    {
        return match ($period) {
            'today' => $query->whereDate('created_at', today()),
            'week' => $query->whereBetween('created_at', [now()->startOfWeek(), now()->endOfWeek()]),
            'month' => $query->whereMonth('created_at', now()->month)->whereYear('created_at', now()->year),
            default => $query,
        };
    }
}
