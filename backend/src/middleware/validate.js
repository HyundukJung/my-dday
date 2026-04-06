const { validationResult } = require('express-validator');

function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: '입력값이 올바르지 않습니다.',
      details: errors.array().map(e => e.msg),
    });
  }
  next();
}

module.exports = validate;
