module.exports = mongoose => {
    const schema = mongoose.Schema(
      {
        category_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Category',
        },
        name: {
          type: String
        },
        code_name: {
          type: String
        }
      },
      { timestamps: true }
    );
  
    schema.method("toJSON", function() {
      const { __v, _id, ...object } = this.toObject();
      object.id = _id;
      return object;
    });
  
    const Attribute = mongoose.model("attribute", schema);
    return Attribute;
  };
  