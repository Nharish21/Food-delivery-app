package com.fooddelivery.controller;

import com.fooddelivery.dto.ApiResponse;
import com.fooddelivery.dto.OrderRequest;
import com.fooddelivery.entity.Order;
import com.fooddelivery.entity.Order.OrderStatus;
import com.fooddelivery.service.OrderService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class OrderController {

    private final OrderService orderService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<Order>>> getAllOrders(
            @RequestParam(required = false) Long restaurantId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String phone) {

        List<Order> orders;
        if (restaurantId != null && status != null && status.equals("PENDING"))
            orders = orderService.getPendingOrdersByRestaurant(restaurantId);
        else if (restaurantId != null)
            orders = orderService.getOrdersByRestaurant(restaurantId);
        else if (status != null)
            orders = orderService.getOrdersByStatus(OrderStatus.valueOf(status));
        else if (phone != null)
            orders = orderService.getOrdersByCustomerPhone(phone);
        else
            orders = orderService.getAllOrders();

        return ResponseEntity.ok(ApiResponse.success("Orders fetched", orders));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<Order>> getOrder(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success("Order fetched", orderService.getOrderById(id)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<Order>> createOrder(@Valid @RequestBody OrderRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Order placed successfully", orderService.createOrder(request)));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<ApiResponse<Order>> updateStatus(
            @PathVariable Long id, @RequestParam String status) {
        return ResponseEntity.ok(ApiResponse.success("Order status updated",
                orderService.updateOrderStatus(id, OrderStatus.valueOf(status))));
    }

    @PatchMapping("/{id}/accept")
    public ResponseEntity<ApiResponse<Order>> acceptOrder(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success("Order accepted", orderService.acceptOrder(id)));
    }

    @PatchMapping("/{id}/reject")
    public ResponseEntity<ApiResponse<Order>> rejectOrder(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success("Order rejected", orderService.rejectOrder(id)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteOrder(@PathVariable Long id) {
        orderService.deleteOrder(id);
        return ResponseEntity.ok(ApiResponse.success("Order deleted", null));
    }
}