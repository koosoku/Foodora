const { spawn } = require('child_process');
const fs = require('fs');
const async = require('async');
const recipesModel = require('../models/recipes_model');

const PYTHON_MODES = {
  PROCESS: 'PROCESS',
  RECOMMEND: 'RECOMMEND',
};

module.exports.setUp = () => {
  recipesModel.setup();
};

module.exports.findAllRecipes = (req, res) => {
  recipesModel.allRecipes((err, result) => {
    res.status(err ? 500 : 200).json(err ? undefined : result);
  });
};

module.exports.searchRecipes = ({ body: { query = null } }, res) => {
  recipesModel.search(query, (err, result) => {
    if (err) {
      console.log(err);
    }
    res.status(err ? 500 : 200).json(err ? undefined : result);
  });
};

module.exports.callPythonScriptTest = (req, res) => {
  const pythonProcess = spawn('python', ['test_script.py']);

  pythonProcess.stdout.on('data', (data) => {
    res.status(200).json(data.toString());
  });
};

module.exports.selectRecipeById = ({ params: { recipeId = null } }, res) => {
  if (recipeId === null) {
    return res.status(400).json('Please enter the recipe Id');
  }

  return recipesModel.selectRecipeById(recipeId, (err, result) => {
    res.status(err ? 500 : 200).json(err ? undefined : result);
  });
};

module.exports.processRecipesJson = (req, res) => {
  const rawRecipeData = fs.readFileSync('data/recipes/recipes.json');
  const recipes = JSON.parse(rawRecipeData);

  const ingredientsList = recipes.map(({ id, ingredients }) => ({
    id,
    ingredients: ingredients.map(ingredient => ingredient.ingredientID),
  }));


  const pythonProcess = spawn('python', ['recommender.py', PYTHON_MODES.PROCESS]);

  pythonProcess.stdin.write(JSON.stringify(ingredientsList));
  pythonProcess.stdin.end();

  let dataString = '';

  pythonProcess.stdout.on('data', (data) => {
    dataString += data;
  });

  pythonProcess.stderr.on('data', (error) => {
    console.error(error.toString());
  });

  pythonProcess.stdout.on('end', () => {
    res.status(200).json(dataString.toString());
  });
};

module.exports.planMeals = ({ body: { recipeIds = null } }, res) => {
  const recipeIdQueries = recipeIds.map(recipeId => (callback) => {
    recipesModel.selectRecipeById(recipeId, callback);
  });

  async.parallel(recipeIdQueries, (err, results) => {
    const nutritions = {
      calories: { amount: 0, unit: null },
      fat: { amount: 0, unit: null },
      cholesterol: { amount: 0, unit: null },
      carbohydrates: { amount: 0, unit: null },
      protein: { amount: 0, unit: null },
      sugars: { amount: 0, unit: null },
    };

    results.forEach(({
      nutrition: {
        calories, fat, cholesterol, carbohydrates, protein, sugars,
      },
    }) => {
      if (nutritions.calories.unit == null) {
        nutritions.calories.unit = calories.unit;
        nutritions.fat.unit = fat.unit;
        nutritions.cholesterol.unit = cholesterol.unit;
        nutritions.carbohydrates.unit = carbohydrates.unit;
        nutritions.protein.unit = protein.unit;
        nutritions.sugars.unit = sugars.unit;
      }

      nutritions.calories.amount += calories.amount;
      nutritions.fat.amount += fat.amount;
      nutritions.cholesterol.amount += cholesterol.amount;
      nutritions.carbohydrates.amount += carbohydrates.amount;
      nutritions.protein.amount += protein.amount;
      nutritions.sugars.amount += sugars.amount;
    });
    res.status(200).json(nutritions);
  });
};

module.exports.recommendRecipe = ({ params: { recipeId = null } }, res) => {
  if (recipeId === null) {
    return res.status(400).json('Please enter the recipe Id');
  }

  const pythonProcess = spawn('python', [
    'recommender.py',
    PYTHON_MODES.RECOMMEND,
    recipeId,
  ]);

  let dataString = '';

  pythonProcess.stdout.on('data', (data) => {
    dataString += data;
  });

  pythonProcess.stderr.on('data', (error) => {
    console.error(error.toString());
  });

  return pythonProcess.stdout.on('end', () => {
    res.status(200).json(JSON.parse(dataString.toString()));
  });
};
