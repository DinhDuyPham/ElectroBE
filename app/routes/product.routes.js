module.exports = app => {
    const product = require("../controllers/product.controller.js");
  
    var router = require("express").Router();

    // Recommender
    router.get("/recommender", product.recommender);
  
    // Create
    router.post("/", product.create);

    // Get list
    router.get("/", product.getList);

    router.get("/new", product.productNew);

    router.get("/topsell", product.productTopSell);

    // Get list by category
    router.get("/category/:id", product.getListByCategory);

    // Get by Id
    router.get("/:id", product.getProductById);

    // Update
    router.put('/:id', product.update);

    // Delete
    router.delete('/:id', product.delete);

    // search
    router.get("/search/:key", product.search);

    // Get list filter
    router.get("/filter/:cid/:minp/:maxp", product.filter);

    app.use("/api/product", router);
  };