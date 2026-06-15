package com.fooddelivery.repository;

import com.fooddelivery.entity.Order;
import com.fooddelivery.entity.Order.OrderStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface OrderRepository extends JpaRepository<Order, Long> {
    List<Order> findByRestaurantId(Long restaurantId);
    List<Order> findByStatus(OrderStatus status);
    List<Order> findByCustomerPhone(String customerPhone);
    List<Order> findByRestaurantIdAndStatus(Long restaurantId, OrderStatus status);
    List<Order> findByCustomerNameContainingIgnoreCase(String customerName);
}