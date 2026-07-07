const Category = require('../models/Category');

async function listCategories(req, res) {
  try {
    const categories = await Category.getAllCategories();
    res.json(categories);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Could not load categories.' });
  }
}

module.exports = { listCategories };


