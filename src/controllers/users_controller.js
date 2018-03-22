const async = require("async");
const usersModel = require("../models/users_model");

module.exports.findAllUsers = (req, res) => {
    usersModel.findAllUsers((err, users) => {
        res.status(err ? 500 : 200).json(err ? undefined : users);
    });
};

module.exports.register = ({body: {name = null, email = null, password = null}}, res) => {
    if (!email || !password || !name) {
        return res.status(400).json({
            error: "Email, name and Password must be provided"
        });
    }
    usersModel.registerUser(name, email, password, (err) => {
        res.status(err ? 500 : 200).json();
    });
};

module.exports.deleteUser = ({body: {email = null, password = null}}, res) => {
    res.json(usersModel.deleteUser(email, password, (err) => {
        res.status(err ? 500 : 200).json();
    }));
};

module.exports.login = ({body: {email = null, password = null}}, res) => {
    if (!email || !password) {
        return res.status(400).json({
            error: "Email, name and Password must be provided"
        });
    }
    usersModel.login(email, password, (err, token) => {
        res.status(err ? 401 : 200).json(err ? undefined : {token});
    });
};

module.exports.getUserInfo = ({headers: {token}}, res) => {
    usersModel.verifyTokenAndGetUserInfo(token, (err, userInfo) => {
        res.status(err ? 500 : 200).json(err ? undefined : {userInfo});
    });
};

module.exports.likesRecipe = ({body: {recipeId}, headers: {token}}, res) => {
    async.waterfall([
        (next) => usersModel.verifyTokenAndGetUserInfo(token, next),
        ({email}, next) => usersModel.connect(
            (err, client, collection) => usersModel.likeRecipe(client, collection, email, recipeId, next)
        )
    ], (err) => res.status(err ? 500 : 200).json(err ? err : undefined));
};
