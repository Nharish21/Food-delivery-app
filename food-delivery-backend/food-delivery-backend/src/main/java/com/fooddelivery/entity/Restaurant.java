package com.fooddelivery.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.*;
import com.fasterxml.jackson.annotation.JsonIgnore;
import java.util.List;

@Entity
@Table(name = "restaurants")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Restaurant {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "Restaurant name is required")
    @Column(nullable = false)
    private String name;

    @NotBlank(message = "Cuisine type is required")
    private String cuisine;

    @DecimalMin(value = "0.0") @DecimalMax(value = "5.0")
    private Double rating;

    private String deliveryTime;

    private Boolean isVeg;

    private String priceRange;

    private String imageUrl;

    private String address;

    private String phone;
    @Builder.Default
    private Boolean isOpen = true;

    @OneToMany(mappedBy = "restaurant", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @JsonIgnore
    private List<Food> foods;

    @OneToMany(mappedBy = "restaurant", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @JsonIgnore
    private List<Order> orders;
}