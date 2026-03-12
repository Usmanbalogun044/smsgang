<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreServiceRequest;
use App\Http\Requests\Admin\UpdateServiceRequest;
use App\Http\Resources\ServiceResource;
use App\Models\Service;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class AdminServiceController extends Controller
{
    public function index(): AnonymousResourceCollection
    {
        return ServiceResource::collection(Service::latest()->paginate(50));
    }

    public function store(StoreServiceRequest $request): JsonResponse
    {
        $service = Service::create($request->validated());

        Log::channel('activity')->info('Admin created service', [
            'service_id' => $service->id,
            'name' => $service->name,
        ]);

        return response()->json([
            'service' => new ServiceResource($service),
        ], 201);
    }

    public function update(UpdateServiceRequest $request, Service $service): ServiceResource
    {
        $service->update($request->validated());

        Log::channel('activity')->info('Admin updated service', [
            'service_id' => $service->id,
            'changes' => $request->validated(),
        ]);

        return new ServiceResource($service);
    }

    public function sync(): JsonResponse
    {
        $baseUrl = rtrim(config('services.fivesim.base_url'), '/');

        $response = Http::withToken(config('services.fivesim.api_key'))
            ->timeout(30)
            ->get("{$baseUrl}/guest/products/any/any");

        $response->throw();

        $products = $response->json();
        $synced = 0;

        foreach ($products as $productCode => $info) {
            Service::updateOrCreate(
                ['provider_service_code' => $productCode],
                ['name' => ucwords(str_replace(['_', '-'], ' ', $productCode))]
            );
            $synced++;
        }

        return response()->json([
            'message' => "Synced {$synced} services from 5SIM.",
        ]);
    }
}
