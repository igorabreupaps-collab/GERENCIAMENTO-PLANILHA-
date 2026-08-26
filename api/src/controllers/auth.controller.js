const { asyncHandler } = require("../lib/asyncHandler");
const { authService } = require("../services/auth.service");

const authController = {
  login: asyncHandler(async (req, res) => {
    const result = await authService.login(req.body.email, req.body.password);
    res.json(result);
  }),
};

module.exports = { authController };
