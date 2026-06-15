package com.fooddelivery.controller;

import com.fooddelivery.dto.ApiResponse;
import com.fooddelivery.entity.Restaurant;
import com.fooddelivery.service.RestaurantService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/restaurants")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class RestaurantController {

    private final RestaurantService restaurantService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<Restaurant>>> getAllRestaurants(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Boolean isVeg,
            @RequestParam(required = false) Double minRating,
            @RequestParam(required = false) Boolean isOpen) {

        List<Restaurant> restaurants;
        if (search != null) restaurants = restaurantService.searchByName(search);
        else if (isVeg != null) restaurants = restaurantService.filterByVeg(isVeg);
        else if (minRating != null) restaurants = restaurantService.filterByRating(minRating);
        else if (Boolean.TRUE.equals(isOpen)) restaurants = restaurantService.getOpenRestaurants();
        else restaurants = restaurantService.getAllRestaurants();

        return ResponseEntity.ok(ApiResponse.success("Restaurants fetched", restaurants));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<Restaurant>> getRestaurant(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success("Restaurant fetched", restaurantService.getRestaurantById(id)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<Restaurant>> createRestaurant(@Valid @RequestBody Restaurant restaurant) {
        Restaurant created = restaurantService.createRestaurant(restaurant);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Restaurant created", created));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<Restaurant>> updateRestaurant(
            @PathVariable Long id, @Valid @RequestBody Restaurant restaurant) {
        return ResponseEntity.ok(ApiResponse.success("Restaurant updated",
                restaurantService.updateRestaurant(id, restaurant)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteRestaurant(@PathVariable Long id) {
        restaurantService.deleteRestaurant(id);
        return ResponseEntity.ok(ApiResponse.success("Restaurant deleted", null));
    }
}