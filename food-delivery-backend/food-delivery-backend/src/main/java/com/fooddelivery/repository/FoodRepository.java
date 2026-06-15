package com.fooddelivery.repository;

import com.fooddelivery.entity.Food;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface FoodRepository extends JpaRepository<Food, Long> {
    List<Food> findByRestaurantId(Long restaurantId);
    List<Food> findByRestaurantIdAndCategory(Long restaurantId, String category);
    List<Food> findByIsVeg(Boolean isVeg);
    List<Food> findByNameContainingIgnoreCase(String name);
    List<Food> findByRestaurantIdAndIsAvailable(Long restaurantId, Boolean isAvailable);
}
