package com.fooddelivery.repository;

import com.fooddelivery.entity.Restaurant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface RestaurantRepository extends JpaRepository<Restaurant, Long> {
    List<Restaurant> findByNameContainingIgnoreCase(String name);
    List<Restaurant> findByCuisineContainingIgnoreCase(String cuisine);
    List<Restaurant> findByIsVeg(Boolean isVeg);
    List<Restaurant> findByIsOpen(Boolean isOpen);
    List<Restaurant> findByRatingGreaterThanEqual(Double rating);
}
