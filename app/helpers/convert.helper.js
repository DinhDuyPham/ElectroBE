const db = require("../models");
const Cart = db.cart;
const CartItem = db.cartItem;
const Order = db.order;
const OrderItem = db.orderItem;
const Customer = db.customer;
const Admin = db.admin;
const listSocket = require("../socket");
const UpdateOrder = listSocket.updateOrder;

exports.convertCartToOrder = async (cartId, req, typeOrder) => {
    try {
        // Retrieve the cart by ID and check if it's active
        const cart = await Cart.findById(cartId);
        if (!cart || !cart.is_active) {
            return false;
        }

        // Retrieve the customer associated with the cart
        const customer = await Customer.findById(cart.customer_id);
        if (!customer) {
            return false;
        }

        // Retrieve the cart items and calculate total items and total price
        const cartItems = await CartItem.find({ cart_id: cartId });
        const totalCart = calculateTotalCart(cartItems);

        // Create a new order with customer details and calculated totals
        const newOrder = new Order({
            cart_id: cart.id,
            customer_id: cart.customer_id,
            first_name: req.body.firstName,
            last_name: req.body.lastName,
            phone: req.body.phone,
            email: customer.email,
            total_item: totalCart.total_item,
            total_price: totalCart.total_price,
            status: "NEW",
            type_order: typeOrder,
            is_payment: false,
            address: req.body.address,
            city: req.body.city,
            comment: req.body.comment,
            is_active: true,
        });

        // Save the new order
        const savedOrder = await newOrder.save();

        // Notify admins about the new order (using socket.io)
        const admins = await Admin.find({});
        const listOrder = await Order.find({});
        for (const admin of admins) {
            if (admin.socket_id) {
                UpdateOrder.to(admin.socket_id).emit("sendListOrder", listOrder);
            }
        }

        // Deactivate the original cart and create a new one
        cart.is_active = false;
        await cart.save();

        const newCart = new Cart({
            customer_id: cart.customer_id,
            total_item: 0,
            total_price: 0,
            is_active: true,
        });
        await newCart.save();

        // Create new order items and re-add inactive cart items to the new cart
        await Promise.all(
            cartItems.map(async (item) => {
                if (item.is_active) {
                    const newOrderItem = new OrderItem({
                        order_id: savedOrder.id,
                        product_id: item.product_id,
                        product_name: item.product_name,
                        product_image: item.product_image,
                        qty: item.qty,
                        price: item.price,
                        total_price: item.total_price,
                        is_active: item.is_active,
                    });
                    await newOrderItem.save();
                } else {
                    const newCartItem = new CartItem({
                        cart_id: newCart.id,
                        product_id: item.product_id,
                        product_name: item.product_name,
                        product_image: item.product_image,
                        qty: item.qty,
                        price: item.price,
                        total_price: item.total_price,
                        is_active: item.is_active,
                    });
                    await newCartItem.save();
                }
            })
        );

        // Update the new cart with its total items and price
        const newCartItems = await CartItem.find({ cart_id: newCart.id });
        if (newCartItems.length > 0) {
            newCart.total_item = newCartItems.reduce((acc, item) => acc + item.qty, 0);
            newCart.total_price = newCartItems.reduce((acc, item) => acc + item.total_price, 0);
            await newCart.save();
        }

        return savedOrder;
    } catch (error) {
        console.error(error);
        return false; // Handle errors by returning false, indicating failure
    }
};

exports.getArrayDate = async (startDate, endDate, typeGet) => {
    const arrayDate = [];
    if (typeGet === "Date") {
        const start = new Date(startDate);
        const end = new Date(endDate);
        for (let date = start; date <= end; date.setDate(date.getDate() + 1)) {
            arrayDate.push(new Date(date));
        }
    } else if (typeGet === "Month") {
        const start = new Date(startDate);
        const end = new Date(endDate);
        let currentMonth = start.getMonth();
        let currentYear = start.getFullYear();

        while (currentYear < end.getFullYear() || (currentYear === end.getFullYear() && currentMonth <= end.getMonth())) {
            arrayDate.push(new Date(currentYear, currentMonth));
            if (currentMonth === 11) {
                currentMonth = 0;
                currentYear++;
            } else {
                currentMonth++;
            }
        }
    } else if (typeGet === "Year") {
        const start = new Date(startDate);
        const end = new Date(endDate);
        let currentYear = start.getFullYear();

        while (currentYear <= end.getFullYear()) {
            arrayDate.push(new Date(currentYear, 0));
            currentYear++;
        }
    }

    return arrayDate;
};

function calculateTotalCart(cartItem) {
    let total_item = 0;
    let total_price = 0;
    for(item of cartItem) {
        if (item.is_active) {
            total_item += item.qty;
            total_price += item.total_price;
        }
    }
    return {total_item, total_price};
}
