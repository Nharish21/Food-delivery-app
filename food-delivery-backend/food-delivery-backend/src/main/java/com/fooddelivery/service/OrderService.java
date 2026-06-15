package com.fooddelivery.service;

import com.fooddelivery.dto.OrderRequest;
import com.fooddelivery.entity.*;
import com.fooddelivery.entity.Order.OrderStatus;
import com.fooddelivery.exception.ResourceNotFoundException;
import com.fooddelivery.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class OrderService {

    private final OrderRepository orderRepository;
    private final RestaurantRepository restaurantRepository;
    private final FoodRepository foodRepository;

    public List<Order> getAllOrders() {
        return orderRepository.findAll();
    }

    public Order getOrderById(Long id) {
        return orderRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found with id: " + id));
    }

    @Transactional
    public Order createOrder(OrderRequest request) {
        Restaurant restaurant = restaurantRepository.findById(request.getRestaurantId())
                .orElseThrow(() -> new ResourceNotFoundException("Restaurant not found"));

        Order order = Order.builder()
                .customerName(request.getCustomerName())
                .customerPhone(request.getCustomerPhone())
                .deliveryAddress(request.getDeliveryAddress())
                .totalAmount(request.getTotalAmount())
                .paymentMethod(request.getPaymentMethod())
                .couponCode(request.getCouponCode())
                .discount(request.getDiscount())
                .deliveryInstructions(request.getDeliveryInstructions())
                .restaurant(restaurant)
                .status(OrderStatus.PENDING)
                .build();

        List<OrderItem> items = request.getOrderItems().stream().map(itemReq -> {
            Food food = foodRepository.findById(itemReq.getFoodId())
                    .orElseThrow(() -> new ResourceNotFoundException("Food not found with id: " + itemReq.getFoodId()));
            return OrderItem.builder()
                    .food(food)
                    .foodName(food.getName())
                    .quantity(itemReq.getQuantity())
                    .price(itemReq.getPrice())
                    .addOns(itemReq.getAddOns())
                    .order(order)
                    .build();
        }).collect(Collectors.toList());

        order.setOrderItems(items);
        return orderRepository.save(order);
    }

    public Order updateOrderStatus(Long id, OrderStatus status) {
        Order order = getOrderById(id);
        order.setStatus(status);
        return orderRepository.save(order);
    }

    public Order acceptOrder(Long id) {
        return updateOrderStatus(id, OrderStatus.CONFIRMED);
    }

    public Order rejectOrder(Long id) {
        return updateOrderStatus(id, OrderStatus.REJECTED);
    }

    public void deleteOrder(Long id) {
        getOrderById(id);
        orderRepository.deleteById(id);
    }

    public List<Order> getOrdersByRestaurant(Long restaurantId) {
        return orderRepository.findByRestaurantId(restaurantId);
    }

    public List<Order> getOrdersByStatus(OrderStatus status) {
        return orderRepository.findByStatus(status);
    }

    public List<Order> getOrdersByCustomerPhone(String phone) {
        return orderRepository.findByCustomerPhone(phone);
    }

    public List<Order> getPendingOrdersByRestaurant(Long restaurantId) {
        return orderRepository.findByRestaurantIdAndStatus(restaurantId, OrderStatus.PENDING);
    }
}