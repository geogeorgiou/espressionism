/** The café drinks the calculator knows; the mascot wears each as a flavor. */
export const DRINKS = ['house', 'latte', 'mocha', 'matcha', 'cherry'] as const

export type Drink = (typeof DRINKS)[number]

export const DRINK_LABELS: Record<Drink, string> = {
  house: 'House coffee',
  latte: 'Latte',
  mocha: 'Mocha',
  matcha: 'Matcha latte',
  cherry: 'Seasonal special',
}
