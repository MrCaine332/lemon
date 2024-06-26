import { CreateRecipeBody } from "../types/bodies"
import { Step } from "../entities/step.entity"
import { Recipe } from "../entities/recipe.entity"
import { Ingredient } from "../entities/ingredient.entity"
import { AppDataSource } from "../../data-source"
import { User } from "../entities/user.entity"
import { Topic } from "../entities/topic.entity"
import { FindManyOptions } from "typeorm/find-options/FindManyOptions"
import { FindOneOptions, Like } from "typeorm"
import { RecipesParams } from "../types/params"
import { ApiError } from "../exceptions/api-error"
import { isDeepEqual } from "../helpers/isDeepEqual"
import ingredientsServices from "./ingredients-services"
import stepsServices from "./steps-services"
import StepsServices from "./steps-services"
import IngredientsServices from "./ingredients-services"

const recipeFindOptions: Partial<
  FindOneOptions<Recipe> | FindManyOptions<Recipe>
> = {
  relations: {
    steps: true,
    ingredients: true,
    author: true,
    topic: true
  },
  select: {
    author: {
      id: true,
      username: true,
      firstName: true,
      lastName: true,
    },
  },
}

class RecipeService {
  async create(body: CreateRecipeBody) {
    const user = await AppDataSource.getRepository(User).findOneBy({
      id: body.userId,
    })
    if (!user) {
      throw new Error("Authorized user was not found")
    }

    const topic = await AppDataSource.getRepository(Topic).findOneBy({
      id: body.topicId,
    })
    if (!topic) {
      throw ApiError.BadRequest(`Topic with id ${body.topicId} was not found`)
    }

    const steps: Step[] = []
    body.steps.map((step) => {
      const newStep = new Step()
      newStep.stepName = step.stepName
      newStep.stepDescription = step.stepDescription
      steps.push(newStep)
    })
    const ingredients: Ingredient[] = []
    body.ingredients.map((ingredient) => {
      const newIngredient = new Ingredient()
      newIngredient.ingredientName = ingredient.ingredientName
      newIngredient.ingredientAmount = ingredient.ingredientAmount
      ingredients.push(newIngredient)
    })

    const recipe = new Recipe()
    recipe.title = body.title
    recipe.description = body.description
    recipe.cookingTime = body.cookingTime
    recipe.difficulty = body.difficulty
    recipe.topic = topic
    recipe.steps = steps
    recipe.ingredients = ingredients
    recipe.author = user
    recipe.previewImageLink = body.previewImageLink

    for (let step of steps) {
      await StepsServices.create(step)
    }
    for (let ingredient of ingredients) {
      await IngredientsServices.create(ingredient)
    }

    const result = await AppDataSource.getRepository(Recipe).save(recipe)
    return result
  }

  async getTodaySelection() {
    const recipes = await this.getRecipesWithQuery()
      .orderBy("RAND()")
      .take(5)
      .getMany()

    return recipes
  }

  async getNewest() {
    const recipes = await AppDataSource.getRepository(Recipe).find({
      ...recipeFindOptions,
      order: { id: "DESC" },
      take: 3,
    })

    return recipes
  }

  async getFeatured() {
    const easyRecipes = this.getRecipesWithQuery()
      .where('recipe.difficulty = "EASY"')
      .orderBy("RAND()")
      .take(3)
      .getMany()
    const mediumRecipes = this.getRecipesWithQuery()
      .where('recipe.difficulty = "MEDIUM"')
      .orderBy("RAND()")
      .take(3)
      .getMany()
    const hardRecipes = this.getRecipesWithQuery()
      .where('recipe.difficulty = "HARD"')
      .orderBy("RAND()")
      .take(3)
      .getMany()

    const result = await Promise.all([easyRecipes, mediumRecipes, hardRecipes])
    const featuredRecipes = {
      easy: result[0],
      medium: result[1],
      hard: result[2],
    }

    return featuredRecipes
  }

  async get(params: RecipesParams) {
    const options: FindManyOptions<Recipe> = {
      ...recipeFindOptions,
      where: [
        {
          topic: { id: params.topicId || undefined },
          difficulty: params.difficulty || undefined,
          title: Like(`%${params.search || ""}%`),
          author: { id: params.userId  || undefined }
        },
        {
          topic: { id: params.topicId || undefined },
          difficulty: params.difficulty || undefined,
          description: Like(`%${params.search || ""}%`),
        },
      ],
      skip: params._limit * (params._page - 1),
      take: params._limit,
    }
    const recipes = await AppDataSource.getRepository(Recipe).find(options)
    const total = await AppDataSource.getRepository(Recipe).count()
    return { recipes, total }
  }

  async getOne(id: number) {
    const recipe = await AppDataSource.getRepository(Recipe).findOne({
      where: { id: id },
      ...recipeFindOptions,
    })
    return recipe
  }

  getRecipesWithQuery() {
    return AppDataSource.getRepository(Recipe)
      .createQueryBuilder("recipe")
      .select()
      .leftJoin("recipe.steps", "ingredients")
      .leftJoin("recipe.ingredients", "steps")
      .leftJoin("recipe.author", "user")
      .addSelect([
        "user.id",
        "user.username",
        "user.firstName",
        "user.lastName",
      ])
      .orderBy("RAND()")
  }

  async update(id: number, body: CreateRecipeBody) {
    const recipe = await AppDataSource.getRepository(Recipe).findOne({
      where: { id: id },
      ...recipeFindOptions,
    })

    if (!recipe) {
      throw ApiError.NotFound()
    }

    await ingredientsServices.updateRecipe(recipe, body.ingredients)
    await stepsServices.updateRecipe(recipe, body.steps)

    const recipeToUpdate: any = {
      title: body.title,
      description: body.description,
      topic: { id: body.topicId },
      cookingTime: body.cookingTime,
      difficulty: body.difficulty,
      previewImageLink: body.previewImageLink
    }

    const updatedRecipe = await AppDataSource.getRepository(Recipe).update(
      id,
      recipeToUpdate
    )

    return updatedRecipe
  }
}

export default new RecipeService()
