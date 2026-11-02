export const MEAL_IMAGE_BUCKET = 'meal-photos'
export const MEAL_IMAGE_URL_TTL = 20 * 60
export const MEAL_IMAGE_CACHE_TTL = 15 * 60 * 1000
export type MealImageVariant = 'full' | 'thumbnail'

const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
const IMAGE_PATH = new RegExp(`^${UUID}/${UUID}$`, 'i')

export function mealImageObjectPath(path: string, variant: MealImageVariant) {
  if (!IMAGE_PATH.test(path)) throw new Error('Érvénytelen képhivatkozás')
  return `${path}/${variant}.jpg`
}
