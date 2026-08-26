const ROLES = Object.freeze({
  VIEWER: "viewer",
  EDITOR: "editor",
  ADMIN: "admin",
});

const ALL_ROLES = Object.freeze(Object.values(ROLES));
const EDIT_ROLES = Object.freeze([ROLES.EDITOR, ROLES.ADMIN]);

module.exports = { ROLES, ALL_ROLES, EDIT_ROLES };
