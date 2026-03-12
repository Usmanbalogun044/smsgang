<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\LoginRequest;
use App\Http\Requests\RegisterRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;

class AuthController extends Controller
{
    public function register(RegisterRequest $request): JsonResponse
    {
        $user = User::create($request->validated());

        $token = $user->createToken('auth-token')->plainTextToken;

        Log::channel('activity')->info('User registered', [
            'user_id' => $user->id,
            'email' => $user->email,
        ]);

        return response()->json([
            'user' => new UserResource($user),
            'token' => $token,
        ], 201);
    }

    public function login(LoginRequest $request): JsonResponse
    {
        $user = User::where('email', $request->email)->first();

        if (! $user || ! Hash::check($request->password, $user->password)) {
            Log::channel('activity')->warning('Failed login attempt', [
                'email' => $request->email,
            ]);

            return response()->json([
                'message' => 'Invalid credentials.',
            ], 401);
        }

        if (! $user->isActive()) {
            Log::channel('activity')->warning('Suspended user login attempt', [
                'user_id' => $user->id,
                'email' => $user->email,
            ]);

            return response()->json([
                'message' => 'Account suspended.',
            ], 403);
        }

        $token = $user->createToken('auth-token')->plainTextToken;

        Log::channel('activity')->info('User logged in', [
            'user_id' => $user->id,
            'email' => $user->email,
            'role' => $user->role->value,
        ]);

        return response()->json([
            'user' => new UserResource($user),
            'token' => $token,
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Logged out.']);
    }

    public function user(Request $request): UserResource
    {
        return new UserResource($request->user());
    }
}
