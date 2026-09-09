const { validationResult } = require("express-validator");

exports.validate = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const error = {};
    errors.array().forEach((item) => {
      error[item.path] = item.msg;
    });
    return res.status(422).json({ error });
  }

  next();
};
