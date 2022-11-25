const Category = require('../models/category');
const Link = require('../models/link');
const slugify = require('slugify');
const { v4: uuidv4 } = require('uuid');
const AWS = require('aws-sdk');

const CLIENT_URL = process.env.CLIENT_URL;

// s3
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  // region: 'us-east-1',
  region: process.env.AWS_REGION,
});

// exports.create = (req, res) => {
//   let form = new formidable.IncomingForm();
//   form.parse(req, (err, fields, files) => {
//     if (err) res.status(400).json({ error: 'Image could not upload' });
//     const { name, content } = fields;
//     const { image } = files;

//     if (image.size > 2000000) {
//       res.status(400).json({ error: 'Image should be less than 2mb' });
//     }

//     const slug = slugify(name);
//     let category = new Category({ name, content, slug });

//     // upload image to s3
//     const params = {
//       Bucket: 'hackrio-clone',
//       Key: `category/${uuidv4()}`,
//       Body: fs.readFileSync(image.filepath),
//       ACL: 'public-read',
//       ContentType: 'image/jpg',
//     };

//     s3.upload(params, (err, data) => {
//       if (err) return res.status(400).json({ error: 'Upload to s3 failed' });
//       console.log('AWS UPLOAD RES DATA', data);
//       category.image.url = data.Location;
//       category.image.key = data.Key;

//       // save to db
//       category.save((err, success) => {
//         if (err) {
//           console.log('-----err: ', err);
//           return res.status(400).json({ error: 'Error while saving category to database' });
//         }
//         return res.json(success);
//       });
//     });
//   });
// };

exports.create = (req, res) => {
  const { name, image, content } = req.body;
  // image data
  const base64Data = new Buffer.from(image.replace(/^data:image\/\w+;base64,/, ''), 'base64');
  const type = image.split(';')[0].split('/')[1];

  const slug = slugify(name);
  let category = new Category({ name, content, slug });

  // upload image to s3
  const params = {
    Bucket: 'hackrio-clone',
    Key: `category/${uuidv4()}.${type}`,
    Body: base64Data,
    ACL: 'public-read',
    ContentEncoding: 'base64',
    ContentType: `image/${type}`,
  };

  s3.upload(params, (err, data) => {
    if (err) return res.status(400).json({ error: 'Upload to s3 failed' });
    console.log('AWS UPLOAD RES DATA', data);
    category.image.url = data.Location;
    category.image.key = data.Key;

    // posted by
    category.postedBy = req.auth._id;

    // save to db
    category.save((err, success) => {
      if (err) return res.status(400).json({ error: 'Error while saving category to database' });
      return res.json(success);
    });
  });
};

exports.list = (req, res) => {
  Category.find({}).exec((err, data) => {
    if (err) return res.status(400).json({ error: 'Categories could not load' });
    res.json(data);
  });
};

exports.read = (req, res) => {
  const { slug } = req.params;
  let limit = req.body.limit ? parseInt(req.body.limit) : 10;
  let skip = req.body.skip ? parseInt(req.body.skip) : 0;

  Category.findOne({ slug })
    .populate('postedBy', '_id name username')
    .exec((err, category) => {
      if (err) return res.status(400).json({ error: 'Could not load category' });
      Link.find({ categories: category })
        .populate('postedBy', '_id name username')
        .populate('categories', 'name')
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip)
        .exec((err, links) => {
          if (err) return res.status(400).json({ error: 'Could not load links of a category' });
          res.json({ category, links });
        });
    });
};

exports.update = (req, res) => {
  const { slug } = req.params;
  const { name, image, content } = req.body;

  // image data
  const base64Data = new Buffer.from(image.replace(/^data:image\/\w+;base64,/, ''), 'base64');
  const type = image.split(';')[0].split('/')[1];

  Category.findOneAndUpdate({ slug }, { name, content }, { new: true }).exec((err, updated) => {
    if (err) return res.status(400).json({ error: 'Could not find a category to update' });

    console.log('UPDATED', updated);

    if (!image) return res.json(updated);

    // remove the existing image from s3 before uploading new/updated one
    const deleteParams = {
      Bucket: 'hackrio-clone',
      Key: `${updated.image.key}`,
    };
    
    s3.deleteObject(deleteParams, function (err, data) {
      if (err) console.log('S3 DELETE ERROR DURING UPDATE', err);
      else console.log('S3 DELETED DURING UPDATE', data);
    });

    const type = image.split(';')[0].split('/')[1];

    // handle upload image
    const params = {
      Bucket: 'hackrio-clone',
      Key: `category/${uuidv4()}.${type}`,
      Body: base64Data,
      ACL: 'public-read',
      ContentEncoding: 'base64',
      ContentType: `image/${type}`,
    };

    s3.upload(params, (err, data) => {
      if (err) return res.status(400).json({ error: 'Upload to s3 failed' });
      console.log('AWS UPLOAD RES DATA', data);
      updated.image.url = data.Location;
      updated.image.key = data.Key;

      // save to db
      updated.save((err, success) => {
        if (err) return res.status(400).json({ error: 'Error while saving category to database' });
        res.json(success);
      });
    });
  });
};

exports.remove = (req, res) => {
  const { slug } = req.params;

  Category.findOneAndRemove({ slug }).exec((err, data) => {
    if (err) return res.status(400).json({ error: 'Could not delete category' });

    // remove the existing image from s3 before uploading new/updated one
    const deleteParams = {
      Bucket: 'hackrio-clone',
      Key: `${data.image.key}`,
    };

    s3.deleteObject(deleteParams, function (err, data) {
      if (err) console.log('S3 DELETE ERROR DURING DELETION', err);
      else console.log('S3 IMAGE IS DELETED', data);
    });

    res.json({
      message: 'Category deleted successfully',
    });
  });
};
