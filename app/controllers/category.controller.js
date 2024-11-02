const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const db = require("../models");
const { json } = require('express');
const Category = db.category;
const Attribute = db.attribute;

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

            // Check category name in body
            if (!req.body.name) {
                return res.status(400).send({ message: "Category name is required." });
            }

            // Create a new category
            const category = new Category({
                name: req.body.name,
                image: req.file ? req.file.filename : null
            });

            const savedCategory = await category.save();

            // Create attributes if any
            if (req.body.attributes) {
                const attributes = JSON.parse(req.body.attributes);
                if (attributes != null) {
                    for (const e of attributes) {
                        if (e.name && e.code_name) {
                            let newAttribute = new Attribute({
                                category_id: savedCategory.id,
                                name: e.name,
                                code_name: e.code_name
                            });
                            await newAttribute.save();
                        }
                    }
                }
            }
            const listAttribute = await Attribute.find({category_id: savedCategory.id});

            res.status(201).send({category: savedCategory, attribute: listAttribute});
        });
    } catch (error) {
        console.error(error);
        res.status(500).send({ message: "An error occurred while processing your request." });
    }
};

exports.getList = async (req, res) => {
    try {
        var result = [];
        const categories = await Category.find({});
        for (const e of categories) {
            var listAttribute = await Attribute.find({category_id: e.id});
            result.push({category: e, attribute: listAttribute});
        }
        res.status(200).json(result);
    } catch (error) {
        console.error(error);
        res.status(500).send({ message: "An error occurred while processing your request." });
    }
};

exports.getCategoryById = async (req, res) => {
    try {
        const category = await Category.findById(req.params.id);
        if (!category) {
            return res.status(404).send({ message: "Category not found." });
        }
        const attribute = await Attribute.find({category_id: category.id});
        res.status(200).json({category, attribute});
    } catch (error) {
        console.error(error);
        if (error.kind === "ObjectId") {
            return res.status(404).send({ message: "Category not found." });
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

            const category = await Category.findById(id);
            if (!category) {
                return res.status(404).send({ message: `Category with id ${id} not found` });
            }

            // Update fields
            category.name = req.body.name || category.name;
            category.image = req.file ? req.file.filename : category.image;

            // Save changes
            await category.save();

            // Return updated category
            res.send(category);
        });
    } catch (error) {
        console.error(error);
        res.status(500).send({ message: "An error occurred while processing your request." });
    }
};

exports.delete = async (req, res) => {
    const id = req.params.id;

    try {
        const deletedCategory = await Category.findByIdAndDelete(id);
        if (!deletedCategory) {
            return res.status(404).send({ message: "Category not found." });
        }
        res.status(200).send({ message: "Category deleted successfully." });
    } catch (error) {
        console.error(error);
        res.status(500).send({ message: "An error occurred while processing your request." });
    }
};
