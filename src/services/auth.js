const bcrypt = require("bcrypt");
const saltRounds = 10;
const jwt = require("jsonwebtoken");
const config = require("./config");

module.exports.hashPassword = (password, next) => {
    bcrypt.hash(password, saltRounds, (err, hashedPassword) => {
        if (err) {
            return next(err);
        }

        next(null, hashedPassword);
    });
};

module.exports.authorizeLogin = (email, password, userInfo, next) => {
    bcrypt.compare(password, userInfo.password, (err, res) => {
        if (err) {
            return next(err);
        }
        if (!res) {
            return next({message: "password is wrong"});
        }

        next(null, userInfo);
    });
};

module.exports.issueToken = ({name, email}, next) => {
    const token = jwt.sign({
        email,
        name
    }, config.jwtSecret);

    next(null, token);
};