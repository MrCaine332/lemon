import express from "express"
import { body } from "express-validator"
import { authMiddleware } from "../middlewares/auth-middleware"
import userController from "../controllers/user-controller"
import { Roles } from "../enums"

const router = express.Router()

router.post(
  "/registration",
  body("email").isEmail().withMessage("Wrong email"),
  body("username").notEmpty().withMessage("Please, enter username"),
  body("password")
    .isLength({ min: 8 })
    .withMessage("Password can't be less than 8 symbols"),
  body("passwordConfirmation")
    .isLength({ min: 8 })
    .withMessage("Password can't be les than 8 symbols")
    .custom((value, { req }) => {
      return value === req.body.password
    })
    .withMessage("Passwords have to match"),
  userController.registration
)

router.post("/login", userController.login)

router.post("/logout", userController.logout)

router.post("/refresh", userController.refresh)

router.get("/", authMiddleware([Roles.admin]), userController.getUsers)

export default router