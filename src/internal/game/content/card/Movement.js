import { CardType } from '../../CardType'

export const cardTypeList = []

for (let i = 0; i < 3; ++i) {
  cardTypeList.push(new CardType('Forward x' + i))
}
