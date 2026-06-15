package com.fooddelivery.dto;

import jakarta.validation.constraints.*;
import lombok.*;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class OrderRequest {

    @NotBlank(message = "Customer name is required")
    private String customerName;

    private String customerPhone;

    @NotBlank(message = "Delivery address is required")
    private String deliveryAddress;

    @NotNull(message = "Total amount is required")
    private Double totalAmount;

    private String paymentMethod;

    private String couponCode;

    private Double discount = 0.0;

    private String deliveryInstructions;

    @NotNull(message = "Restaurant ID is required")
    private Long restaurantId;

    @NotEmpty(message = "Order items cannot be empty")
    private List<OrderItemRequest> orderItems;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class OrderItemRequest {
        @NotNull private Long foodId;
        @NotNull @Min(1) private Integer quantity;
        @NotNull private Double price;
        private String addOns;
    }
}