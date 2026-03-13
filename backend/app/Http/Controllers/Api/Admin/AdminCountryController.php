<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreCountryRequest;
use App\Http\Requests\Admin\UpdateCountryRequest;
use App\Http\Resources\CountryResource;
use App\Models\Country;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class AdminCountryController extends Controller
{
    public function index(): AnonymousResourceCollection
    {
        return CountryResource::collection(Country::orderBy('name')->paginate(100));
    }

    public function store(StoreCountryRequest $request): JsonResponse
    {
        $country = Country::create($request->validated());

        Log::channel('activity')->info('Admin created country', [
            'country_id' => $country->id,
            'name' => $country->name,
        ]);

        return response()->json([
            'country' => new CountryResource($country),
        ], 201);
    }

    public function update(UpdateCountryRequest $request, Country $country): CountryResource
    {
        $country->update($request->validated());

        Log::channel('activity')->info('Admin updated country', [
            'country_id' => $country->id,
            'changes' => $request->validated(),
        ]);

        return new CountryResource($country);
    }
}
