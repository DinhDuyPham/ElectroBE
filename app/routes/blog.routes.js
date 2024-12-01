// const express = require('express');
// const blog = require('../controllers/blog.controller.js');
// const router = express.Router();

// router.post('/create', blog.create);
// router.get('/', blog.getList);
// router.get('/:id', blog.getBlogById);
// router.put('/:id', blog.update);
// router.delete('/:id', blog.delete);

// module.exports = router;
//
module.exports = app => {
    const blog = require('../controllers/blog.controller.js');
    var router = require("express").Router();

    // Create
    // router.post("/", product.create);
    router.post('/', blog.create);
    // Get list
    // router.get("/", product.getList);
    router.get('/', blog.getList);

    // router.get("/new", product.productNew);

    // router.get("/topsell", product.productTopSell);

    // Get list by category
    // router.get("/category/:id", product.getListByCategory);

    // Get by Id
    // router.get("/:id", product.getProductById);
    router.get('/:id', blog.getBlogById);

    // Update
    // router.put('/:id', product.update);
    router.put('/:id', blog.update);

    // Delete
    // router.delete('/:id', product.delete);
    router.delete('/:id', blog.delete);

    app.use("/api/blog", router);
  };