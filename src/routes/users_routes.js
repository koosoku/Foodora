const app = require('express').Router();
const usersController = require('../controllers/users_controller');
const { env } = require('../../config');

if (env !== 'testing') {
  usersController.setup();
}

app.get('/', usersController.findAllUsers);
app.post('/', usersController.register);
app.delete('/', usersController.deleteUser);

app.post('/login', usersController.login);

app.get('/user_info', usersController.getUserInfo);
app.put('/user_info', usersController.changeUserInfo);

app.post('/liked_recipes', usersController.likesRecipes);
app.delete('/liked_recipes', usersController.unlikesRecipes);
app.post('/allergies', usersController.addAllergies);
app.delete('/allergies', usersController.removeAllergies);
app.post('/meal_plan', usersController.addRecipesToMealPlan);
app.delete('/meal_plan', usersController.removeRecipesFromMealPlan);

app.get('/recommended_recipes', usersController.getRecommendedRecipes);
module.exports = app;
