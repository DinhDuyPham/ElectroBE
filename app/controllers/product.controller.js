const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const Recommender = require('../helpers/recommender.helper.js')
const db = require("../models");
const Product = db.product;
const Attribute = db.attribute;
const AttributeValue = db.attributeValue;
const OrderItem = db.orderItem;
const middlewares = require("./auth.middlewares");
const { constants } = require('fs/promises');

const DIR = 'static/images/';

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, DIR);
    },
    filename: (req, file, cb) => {
        const fileName = uuidv4() + '-' + file.originalname.toLowerCase().split(' ').join('-');
        cb(null, fileName);
    }
});

const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        const allowedMimeTypes = ["image/png", "image/jpg", "image/jpeg"];
        if (allowedMimeTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(null, false);
            return cb(new Error('Only .png, .jpg and .jpeg format allowed!'));
        }
    }
});

exports.create = async (req, res) => {
    try {
        upload.single('image')(req, res, async (err) => {
            if (err) {
                console.error(err);
                return res.status(400).send({ message: err.message });
            }

            // Check body product
            if (!req.body.name || !req.body.category_id || !req.body.price) {
                return res.status(400).send({ message: "Name, category_id, and price are required fields." });
            }

            // Create a new product
            const product = new Product({
                name: req.body.name,
                category_id: req.body.category_id,
                detail: req.body.detail || null,
                qty: req.body.qty,
                price: req.body.price,
                image: req.file ? req.file.filename : null,
                is_active: req.body.is_active || true
            });
            const savedProduct = await product.save();

            // Create attributes value if any
            if (req.body.attributes) {
                const attributes = JSON.parse(req.body.attributes);
                if (attributes != null) {
                    for (const e of attributes) {
                        if (e.code_name && e.value) {
                            let attribute = await Attribute.findOne({category_id: savedProduct.category_id, code_name: e.code_name});
                            let newAttributeValue = new AttributeValue({
                                attribute_id: attribute.id,
                                product_id: savedProduct.id,
                                value: e.value
                            });
                            await newAttributeValue.save();
                        }
                    }
                }
            }

            const result = { ...savedProduct.toObject() };
            const listAttribute = await Attribute.find({category_id: savedProduct.category_id});
            for (const e of listAttribute) {
                let attributeValue = await AttributeValue.findOne({attribute_id: e.id, product_id: savedProduct.id});
                result[e.code_name] = attributeValue?.value;
            }

            res.status(201).send(result);
        });
    } catch (error) {
        console.error(error);
        res.status(500).send({ message: "An error occurred while processing your request." });
    }
};

exports.getList = async (req, res) => {
    try {
        const products = await Product.find({}).lean();
        const productIds = products.map(p => p._id);

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

        products.forEach(p => {
            const attributeMap = attributeValueMap[p._id] || {};
            Object.assign(p, attributeMap);
        });

        res.status(200).json(products);
    } catch (error) {
        console.error("An error occurred while processing your request:", error);
        res.status(500).json({ message: "An error occurred while processing your request." });
    }
};

exports.getListByCategory = async (req, res) => {
    try {
        const products = await Product.find({category_id: req.params.id});
        const productIds = products.map(p => p._id);

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

        products.forEach(p => {
            const attributeMap = attributeValueMap[p._id] || {};
            Object.assign(p, attributeMap);
        });
        res.status(200).json(products);
    } catch (error) {
        console.error(error);
        res.status(500).send({ message: "An error occurred while processing your request." });
    }
};

exports.getProductById = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).send({ message: "Product not found." });
        }
        const result = { ...product.toObject() };
        const listAttribute = await Attribute.find({category_id: product.category_id});
        for (const e of listAttribute) {
            let attributeValue = await AttributeValue.findOne({attribute_id: e.id, product_id: product.id});
            result[e.code_name] = attributeValue?.value;
        }
        res.status(200).json(result);
    } catch (error) {
        console.error(error);
        if (error.kind === "ObjectId") {
            return res.status(404).send({ message: "Product not found." });
        }
        res.status(500).send({ message: "An error occurred while processing your request." });
    }
};

exports.update = async (req, res) => {
    const id = req.params.id;

    try {
        upload.single('image')(req, res, async (err) => {
            if (err) {
                console.error(err);
                return res.status(400).send({ message: err.message });
            }

            const product = await Product.findById(id);
            if (!product) {
                return res.status(404).send({ message: `Product with id ${id} not found` });
            }

            // Update fields
            product.name = req.body.name || product.name;
            product.category_id = req.body.category_id || product.category_id;
            product.detail = req.body.detail || product.detail;
            product.qty = req.body.qty || product.qty;
            product.price = req.body.price || product.price;
            product.image = req.file ? req.file.filename : product.image;

            // Save changes
            await product.save();

            // Create attributes value if any
            if (req.body.attributes) {
                const attributes = JSON.parse(req.body.attributes);
                if (attributes != null) {
                    for (const e of attributes) {
                        if (e.code_name && e.value) {
                            let attribute = await Attribute.findOne({category_id: product.category_id, code_name: e.code_name});
                            let attributeValue = await AttributeValue.findOne({attribute_id: attribute.id, product_id: product.id});
                            attributeValue.value = e.value;
                            await attributeValue.save();
                        }
                    }
                }
            }

            const result = { ...product.toObject() };
            const listAttribute = await Attribute.find({category_id: product.category_id});
            for (const e of listAttribute) {
                let attributeValue = await AttributeValue.findOne({attribute_id: e.id, product_id: product.id});
                result[e.code_name] = attributeValue?.value;
            }

            // Return updated product
            res.send(result);
        });
    } catch (error) {
        console.error(error);
        res.status(500).send({ message: "An error occurred while processing your request." });
    }
};

exports.delete = async (req, res) => {
    const id = req.params.id;

    try {
        const deletedProduct = await Product.findByIdAndDelete(id);
        if (!deletedProduct) {
            return res.status(404).send({ message: "Product not found." });
        }
        res.status(200).send({ message: "Product deleted successfully." });
    } catch (error) {
        console.error(error);
        res.status(500).send({ message: "An error occurred while processing your request." });
    }
};

exports.recommender = async (req, res) => {
    try {
        const auth = await middlewares.checkAuth(req);
        if (!auth) {
            return res.status(401).json({ message: "Authentication failed" });
        }

        var topProduct = await Recommender.recommender(auth);
        var listProductId = topProduct.map(item => item[0]);

        var shuffleListProductId = shuffleArray(listProductId);

        var result = await Product.find({ _id: { $in: shuffleListProductId } });
        const productIds = result.map(p => p._id);

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

        result.forEach(p => {
            const attributeMap = attributeValueMap[p._id] || {};
            Object.assign(p, attributeMap);
        });
        res.status(200).send(result);
    } catch (error) {
        console.error(error);
        res.status(500).send({ message: "An error occurred while processing your request." });
    }
};

exports.search = async (req, res) => {
    try {
        const keyValue = req.params.key;
        const regex = new RegExp(keyValue, 'i');
        var result = await Product.find({name: regex});
        const productIds = result.map(p => p._id);

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

        result.forEach(p => {
            const attributeMap = attributeValueMap[p._id] || {};
            Object.assign(p, attributeMap);
        });
        res.status(200).send(result);
    } catch (error) {
        console.error(error);
        res.status(500).send({ message: "An error occurred while processing your request." });
    }
};

exports.filter = async (req, res) => {
    try {
        const categoryId = req.params.cid;
        const minPrice = parseFloat(req.params.minp);
        const maxPrice = parseFloat(req.params.maxp);
        var products;

        if (categoryId == 0) {
            products = await Product.find({
                price: { $gte: minPrice, $lte: maxPrice }
            });
        } else {
            products = await Product.find({
                category_id: categoryId,
                price: { $gte: minPrice, $lte: maxPrice }
            });
        }

        const productIds = products.map(p => p._id);

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

        products = products.map(p => {
            const attributeMap = attributeValueMap[p._id] || {};
            return { ...p.toObject(), attributes: attributeMap };
        });

        res.status(200).send(products);
    } catch (error) {
        console.error(error);
        res.status(500).send({ message: "An error occurred while processing your request." });
    }
};

exports.productNew = async (req, res) => {
    try {
        const products = await Product.find({}).sort({ createdAt: -1 }).limit(8);
        const productIds = products.map(p => p._id);

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

        products.forEach(p => {
            const attributeMap = attributeValueMap[p._id] || {};
            Object.assign(p, attributeMap);
        });

        res.status(200).json(products);
    } catch (error) {
        console.error(error);
        res.status(500).send({ message: "An error occurred while processing your request." });
    }
};

exports.productTopSell = async (req, res) => {
    try {
        var productQuantities = {};

        const orderItems = await OrderItem.find().lean();
        for (const oi of orderItems) {
            if (!productQuantities[oi.product_id]) {
                productQuantities[oi.product_id] = 0;
            }
            productQuantities[oi.product_id] += oi.qty;
        }

        const sortedProducts = Object.entries(productQuantities).sort(
            (a, b) => b[1] - a[1]
        );
        const topProducts = sortedProducts.slice(0, 8);

        // Lấy danh sách product_ids từ topProducts
        const productIds = topProducts.map(item => item[0]);

        var products = await Product.find({ _id: { $in: productIds } });

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

        products = products.map(p => {
            const attributeMap = attributeValueMap[p._id] || {};
            return { ...p.toObject(), attributes: attributeMap };
        });

        res.status(200).json(products);
    } catch (error) {
        console.error(error);
        res.status(500).send({ message: "An error occurred while processing your request." });
    }
};

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}