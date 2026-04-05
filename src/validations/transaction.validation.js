const Joi = require("joi");

const createTransactionSchema = Joi.object({
  amount: Joi.number().positive().required(),
  fromAccount: Joi.string().required(),
  toAccount: Joi.string().required(),
  idempotencyKey: Joi.string().required(),   // ✅ ADD THIS
  description: Joi.string().optional()
});

module.exports = {
  createTransactionSchema
};