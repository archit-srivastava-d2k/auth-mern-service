import { checkSchema } from "express-validator";

export default checkSchema({
  email: {
    errorMessage: "Email is required",
    notEmpty: true,
    trim: true,
    isEmail: true,
  },
  firstName: {
    errorMessage: "First name is required",
    notEmpty: true,
    trim: true,
    isLength: {
      options: { min: 2 },
    },
  },
  lastName: {
    errorMessage: "Last name is required",
    notEmpty: true,
    trim: true,
    isLength: { options: { min: 2 } },
  },
  password: {
    errorMessage: "Password is required",
    notEmpty: true,
    trim: true,
    isLength: { options: { min: 6 } },
  },
});
