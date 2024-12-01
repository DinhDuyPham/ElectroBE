module.exports = mongoose => {
  const blogSchema = new mongoose.Schema(
    {
    title: {
      type: String,
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    author: {
      type: String,
      required: true,
    },
    image: {
      type: String,
    },
    

  },
  {
      timestamps: true, 
      toJSON: {
        transform: (doc, ret) => {
          ret.id = ret._id;
          delete ret._id;
          delete ret.__v;
        },
      },
    }

   
);

  const Blog = mongoose.model('blog', blogSchema );

  return Blog;
};