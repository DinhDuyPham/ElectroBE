module.exports = mongoose => {
    const schema = mongoose.Schema(
      {
        attribute_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Attribute',
        },
        product_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
        },
        value: {
          type: String,
          null: true
        }
      },
      { timestamps: true }
    );
  
    schema.method("toJSON", function() {
      const { __v, _id, ...object } = this.toObject();
      object.id = _id;
      return object;
    });
  
    const AttributeValue = mongoose.model("attribute_value", schema);
    return AttributeValue;
  };
  