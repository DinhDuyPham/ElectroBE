const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const db = require("../models");
const Blog = db.blog;
const middlewares = require("./auth.middlewares");

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

// Create a new Blog
exports.create = async (req, res) => {
    try {
        upload.single('image')(req, res, async (err) => {
            if (err) {
                console.error(err);
                return res.status(400).send({ message: err.message });
            }

            if (!req.body.title || !req.body.content) {
                return res.status(400).send({ message: "Title and content are required fields." });
            }

            const blog = new Blog({
                title: req.body.title,
                content: req.body.content,
                image: req.file ? req.file.filename : null,
                author: req.body.author || "Anonymous",
                is_published: req.body.is_published || true
            });

            const savedBlog = await blog.save();
            res.status(201).send(savedBlog);
        });
    } catch (error) {
        console.error(error);
        res.status(500).send({ message: "An error occurred while processing your request." });
    }
};

// Get list of all Blogs
exports.getList = async (req, res) => {
    try {
        console.log("@@blogs", Blog.find({}));
        const blogs = await Blog.find({}).lean();
        console.log("@@blogs", blogs);
        res.status(200).json(blogs);
    } catch (error) {
        console.error(error);
        res.status(500).send({ message: "An error occurred while processing your request." });
    }
};

// Get Blog by ID
exports.getBlogById = async (req, res) => {
    try {
        const blog = await Blog.findById(req.params.id);
        if (!blog) {
            return res.status(404).send({ message: "Blog not found." });
        }
        res.status(200).json(blog);
    } catch (error) {
        console.error(error);
        if (error.kind === "ObjectId") {
            return res.status(404).send({ message: "Blog not found." });
        }
        res.status(500).send({ message: "An error occurred while processing your request." });
    }
};

// Update Blog
exports.update = async (req, res) => {
    const id = req.params.id;

    try {
        upload.single('image')(req, res, async (err) => {
            if (err) {
                console.error(err);
                return res.status(400).send({ message: err.message });
            }

            const blog = await Blog.findById(id);
            if (!blog) {
                return res.status(404).send({ message: `Blog with id ${id} not found` });
            }

            blog.title = req.body.title || blog.title;
            blog.content = req.body.content || blog.content;
            blog.author = req.body.author || blog.author;
            blog.is_published = req.body.is_published !== undefined ? req.body.is_published : blog.is_published;
            blog.image = req.file ? req.file.filename : blog.image;

            const updatedBlog = await blog.save();
            res.status(200).send(updatedBlog);
        });
    } catch (error) {
        console.error(error);
        res.status(500).send({ message: "An error occurred while processing your request." });
    }
};

// Delete Blog
exports.delete = async (req, res) => {
    const id = req.params.id;

    try {
        const deletedBlog = await Blog.findByIdAndDelete(id);
        if (!deletedBlog) {
            return res.status(404).send({ message: "Blog not found." });
        }
        res.status(200).send({ message: "Blog deleted successfully." });
    } catch (error) {
        console.error(error);
        res.status(500).send({ message: "An error occurred while processing your request." });
    }
};
