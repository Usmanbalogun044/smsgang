<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\UpdateUserRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Log;

class AdminUserController extends Controller
{
    public function index(): AnonymousResourceCollection
    {
        return UserResource::collection(User::latest()->paginate(50));
    }

    public function update(UpdateUserRequest $request, User $user): UserResource
    {
        $user->update($request->validated());

        Log::channel('activity')->info('Admin updated user', [
            'user_id' => $user->id,
            'changes' => $request->validated(),
        ]);

        return new UserResource($user);
    }
}
