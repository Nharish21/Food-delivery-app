package com.fooddelivery.service;

import com.fooddelivery.entity.Food;
import com.fooddelivery.entity.Restaurant;
import com.fooddelivery.exception.ResourceNotFoundException;
import com.fooddelivery.repository.FoodRepository;
import com.fooddelivery.repository.RestaurantRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
@RequiredArgsConstructor
public class FoodService {

    private final FoodRepository foodRepository;
    private final RestaurantRepository restaurantRepository;

    public List<Food> getAllFoods() {
        return foodRepository.findAll();
    }

    public Food getFoodById(Long id) {
        return foodRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Food not found with id: " + id));
    }

    public Food createFood(Food food) {
        Restaurant restaurant = restaurantRepository.findById(food.getRestaurantId())
                .orElseThrow(() -> new ResourceNotFoundException("Restaurant not found with id: " + food.getRestaurantId()));
        food.setRestaurant(restaurant);
        return foodRepository.save(food);
    }

    public Food updateFood(Long id, Food updated) {
        Food existing = getFoodById(id);
        existing.setName(updated.getName());
        existing.setDescription(updated.getDescription());
        existing.setPrice(updated.getPrice());
        existing.setCategory(updated.getCategory());
        existing.setIsVeg(updated.getIsVeg());
        existing.setIsAvailable(updated.getIsAvailable());
        existing.setImageUrl(updated.getImageUrl());
        existing.setAddOns(updated.getAddOns());
        return foodRepository.save(existing);
    }

    public void deleteFood(Long id) {
        getFoodById(id);
        foodRepository.deleteById(id);
    }

    public List<Food> getFoodsByRestaurant(Long restaurantId) {
        return foodRepository.findByRestaurantId(restaurantId);
    }

    public List<Food> getFoodsByCategory(Long restaurantId, String category) {
        return foodRepository.findByRestaurantIdAndCategory(restaurantId, category);
    }

    public List<Food> searchFoods(String name) {
        return foodRepository.findByNameContainingIgnoreCase(name);
    }

    public List<Food> getAvailableFoods(Long restaurantId) {
        return foodRepository.findByRestaurantIdAndIsAvailable(restaurantId, true);
    }
}