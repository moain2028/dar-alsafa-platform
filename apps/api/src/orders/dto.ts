import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsEnum, IsIn, IsInt, IsLatitude, IsLongitude, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Max, MaxLength, Min, ValidateNested } from 'class-validator';
import { OrderStatus, OrderType, PaymentMethod } from '../common/domain';

export class OrderItemDto {
  @IsUUID() productId: string;
  @IsInt() @Min(1) @Max(50) quantity: number;
  @IsOptional() @IsString() @MaxLength(250) notes?: string;
}
export class CreateOrderDto {
  @IsOptional() @IsUUID() branchId?: string;
  @IsOptional() @IsUUID() customerId?: string;
  @IsEnum(OrderType) type: OrderType;
  @IsEnum(PaymentMethod) paymentMethod: PaymentMethod;
  @IsArray() @ArrayMinSize(1) @ValidateNested({ each: true }) @Type(() => OrderItemDto) items: OrderItemDto[];
  @IsOptional() @IsString() @MaxLength(250) address?: string;
  @IsOptional() @IsLatitude() latitude?: number;
  @IsOptional() @IsLongitude() longitude?: number;
  @IsOptional() @IsString() @MaxLength(20) tableNumber?: string;
  @IsOptional() @IsString() @MaxLength(500) notes?: string;
  @IsOptional() @IsIn(['DAR10']) coupon?: string;
}
export class UpdateOrderStatusDto { @IsEnum(OrderStatus) status: OrderStatus; }
export class DeliverOrderDto { @IsString() @MaxLength(4) @IsNotEmpty() otp: string; }
export class UpdateProductDto {
  @IsOptional() @IsInt() @Min(0) priceHalalas?: number;
  @IsOptional() active?: boolean;
}
export class UpdateInventoryDto { @IsNumber() @Min(0) quantity: number; }
