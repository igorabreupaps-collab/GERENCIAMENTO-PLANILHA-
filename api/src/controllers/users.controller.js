const { asyncHandler } = require("../lib/asyncHandler");
const { usersService } = require("../services/users.service");

const usersController = {
  list: asyncHandler(async (req, res) => {
    res.json(await usersService.list());
  }),

  create: asyncHandler(async (req, res) => {
    const created = await usersService.create(req.body);
    res.status(201).json(created);
  }),

  updateRole: asyncHandler(async (req, res) => {
    const updated = await usersService.updateRole(req.params.id, req.body.role, req.user);
    res.json(updated);
  }),
};

module.exports = { usersController };
