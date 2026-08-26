const { asyncHandler } = require("../lib/asyncHandler");
const { meService } = require("../services/me.service");

const meController = {
  get: (req, res) => {
    res.json(req.user);
  },

  changePassword: asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    await meService.changePassword(req.user.id, currentPassword, newPassword);
    res.json({ ok: true });
  }),
};

module.exports = { meController };
