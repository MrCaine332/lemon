import express from "express";
import userRouter from "./user-routes";
import recipeRouter from "./recipe-routes";
import topicRouter from "./topic-routes";

const router = express.Router()

router.use("/users", userRouter)
router.use("/topics", topicRouter)
router.use("/recipes", recipeRouter)

export default router