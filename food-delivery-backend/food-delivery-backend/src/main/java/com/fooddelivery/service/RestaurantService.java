package com.fooddelivery.service;

import com.fooddelivery.entity.Restaurant;
import com.fooddelivery.exception.ResourceNotFoundException;
import com.fooddelivery.repository.RestaurantRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
@RequiredArgsConstructor
public class RestaurantService {

    private final RestaurantRepository restaurantRepository;

    public List<Restaurant> getAllRestaurants() {
        return restaurantRepository.findAll();
    }

    public Restaurant getRestaurantById(Long id) {
        return restaurantRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Restaurant not found with id: " + id));
    }

    public Restaurant createRestaurant(Restaurant restaurant) {
        return restaurantRepository.save(restaurant);
    }

    public Restaurant updateRestaurant(Long id, Restaurant updated) {
        Restaurant existing = getRestaurantById(id);
        existing.setName(updated.getName());
        existing.setCuisine(updated.getCuisine());
        existing.setRating(updated.getRating());
        existing.setDeliveryTime(updated.getDeliveryTime());
        existing.setIsVeg(updated.getIsVeg());
        existing.setPriceRange(updated.getPriceRange());
        existing.setImageUrl(updated.getImageUrl());
        existing.setAddress(updated.getAddress());
        existing.setPhone(updated.getPhone());
        existing.setIsOpen(updated.getIsOpen());
        return restaurantRepository.save(existing);
    }

    public void deleteRestaurant(Long id) {
        getRestaurantById(id);
        restaurantRepository.deleteById(id);
    }

    public List<Restaurant> searchByName(String name) {
        return restaurantRepository.findByNameContainingIgnoreCase(name);
    }

    public List<Restaurant> filterByVeg(Boolean isVeg) {
        return restaurantRepository.findByIsVeg(isVeg);
    }

    public List<Restaurant> filterByRating(Double minRating) {
        return restaurantRepository.findByRatingGreaterThanEqual(minRating);
    }

    public List<Restaurant> getOpenRestaurants() {
        return restaurantRepository.findByIsOpen(true);
    }
}
