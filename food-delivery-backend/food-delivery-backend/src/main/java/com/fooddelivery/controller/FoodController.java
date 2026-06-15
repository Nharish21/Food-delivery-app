package com.fooddelivery.controller;

import com.fooddelivery.dto.ApiResponse;
import com.fooddelivery.entity.Food;
import com.fooddelivery.service.FoodService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/foods")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class FoodController {

    private final FoodService foodService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<Food>>> getAllFoods(
            @RequestParam(required = false) Long restaurantId,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Boolean available) {

        List<Food> foods;
        if (restaurantId != null && category != null)
            foods = foodService.getFoodsByCategory(restaurantId, category);
        else if (restaurantId != null && Boolean.TRUE.equals(available))
            foods = foodService.getAvailableFoods(restaurantId);
        else if (restaurantId != null)
            foods = foodService.getFoodsByRestaurant(restaurantId);
        else if (search != null)
            foods = foodService.searchFoods(search);
        else
            foods = foodService.getAllFoods();

        return ResponseEntity.ok(ApiResponse.success("Foods fetched", foods));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<Food>> getFood(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success("Food fetched", foodService.getFoodById(id)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<Food>> createFood(@Valid @RequestBody Food food) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Food created", foodService.createFood(food)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<Food>> updateFood(
            @PathVariable Long id, @Valid @RequestBody Food food) {
        return ResponseEntity.ok(ApiResponse.success("Food updated", foodService.updateFood(id, food)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteFood(@PathVariable Long id) {
        foodService.deleteFood(id);
        return ResponseEntity.ok(ApiResponse.success("Food deleted", null));
    }
}