const middlewares = require("./auth.middlewares");
const db = require("../models");
const Cart = db.cart;
const CartItem = db.cartItem;
const Order = db.order;
const OrderItem = db.orderItem;
const convertHelper = require("../helpers/convert.helper.js");
const listSocket = require("../socket");
const UpdateOrder = listSocket.updateOrder;
const Customer = db.customer;
const Admin = db.admin;
const Attribute = db.attribute;
const AttributeValue = db.attributeValue;

exports.createCashOrder = async (req, res) => {
    try {
        const cartId = req.body.cartId;
        if (!cartId) {
            return res.status(400).send({ success: false, message: "No cart ID provided." });
        }
        const order = await convertHelper.convertCartToOrder(cartId, req, "cash");

        res.status(200).send({ success: true, message: "Order created successfully.", order });
    } catch (error) {
        console.error(error);
        res.status(500).send({ success: false, message: "An error occurred while processing your request." });
    }
};

exports.getListOrder = async (req, res) => {
    try {
        const auth = await middlewares.checkAuth(req);
        if (!auth) {
            return res.status(401).json({ message: "Authentication failed" });
        }

        var orders = auth.role == "user" ? await Order.find({ customer_id: auth.id }) : await Order.find({});
        orders.sort((a, b) => b.created_at - a.created_at);
        orders.reverse();

        if (auth.role == "user") {
            const orderList = await Promise.all(
                orders.map(async (order) => {
                    const orderItems = await OrderItem.find({ order_id: order.id });
                    const productIds = orderItems.map(oi => oi.product_id);
                    const attributes = await Attribute.find({});
                    const attributeValues = await AttributeValue.find({
                        product_id: { $in: productIds }
                    });
                    const attributeValueMap = {};
                    attributeValues.forEach(attrVal => {
                        if (!attributeValueMap[attrVal.product_id]) {
                            attributeValueMap[attrVal.product_id] = {};
                        }
                        const attribute = attributes.find(attr => attr._id.equals(attrVal.attribute_id));
                        if (attribute) {
                            attributeValueMap[attrVal.product_id][attribute.code_name] = attrVal.value;
                        }
                    });
                    orderItems.forEach(oi => {
                        const attributeMap = attributeValueMap[oi.product_id] || {};
                        Object.assign(oi, attributeMap);
                    });
                    return {order, orderItems};
                })
            );
            res.status(200).json(orderList);
        } else {
            res.status(200).json(orders);
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "An error occurred while processing your request." });
    }
};

exports.getOrder = async (req, res) => {
    try {
        const auth = await middlewares.checkAuth(req);
        if (!auth) {
            return res.status(401).json({ message: "Authentication failed" });
        }
        if (!req.params.orderId) {
            return res.status(400).send({ message: "No order ID provided." });
        }

        const order = await Order.findById(req.params.orderId);
        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }
        const orderItems = await OrderItem.find({ order_id: req.params.orderId });
        const productIds = orderItems.map(oi => oi.product_id);
        const attributes = await Attribute.find({});
        const attributeValues = await AttributeValue.find({
            product_id: { $in: productIds }
        });
        const attributeValueMap = {};
        attributeValues.forEach(attrVal => {
            if (!attributeValueMap[attrVal.product_id]) {
                attributeValueMap[attrVal.product_id] = {};
            }
            const attribute = attributes.find(attr => attr._id.equals(attrVal.attribute_id));
            if (attribute) {
                attributeValueMap[attrVal.product_id][attribute.code_name] = attrVal.value;
            }
        });
        orderItems.forEach(oi => {
            const attributeMap = attributeValueMap[oi.product_id] || {};
            Object.assign(oi, attributeMap);
        });
        res.status(200).json({ order, orderItems });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "An error occurred while processing your request." });
    }
};

exports.updateStatusOrder = async (req, res) => {
    try {
        const auth = await middlewares.checkAuth(req);
        if (!auth) {
            return res.status(401).json({ message: "Authentication failed" });
        }
        if (!req.body.orderId || !req.body.status) {
            return res.status(400).send({ message: "No order ID provided or Status." });
        }

        const order = await Order.findById(req.body.orderId);
        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }
        if (req.body.status == "canceled" && (order.status == "processing" || order.status == "completed")) {
            return res.status(400).send({ message: "Can't cancel." });
        }
        order.status = req.body.status;
        await order.save();

        const userId = order.customer_id;

        const customer = await Customer.findById(userId);
        if (customer.socket_id) {
            UpdateOrder.to(customer.socket_id).emit('sendStatusOrder', order);
        }
        const listOrder = await Order.find({});
        const admin = await Admin.find({});
        for (const ad of admin ) {
            if (ad.socket_id) {
                UpdateOrder.to(ad.socket_id).emit('sendListOrder', listOrder);
            }
        }
        res.status(200).json({ message: "Updated status." });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "An error occurred while processing your request." });
    }
};

exports.updateIsPayment = async (req, res) => {
    try {
        const isPayment = req.body.isPayment;
        const orderId = req.body.orderId;
        const order = await Order.findById(orderId);
        order.is_payment = isPayment;
        await order.save();
        res.status(200).json({ order });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "An error occurred while processing your request." });
    }
};
