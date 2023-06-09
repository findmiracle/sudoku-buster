import * as R from 'ramda'
import * as C from './constants'

const digitOrBlank = indexedDigitPredictions => index => {
  const item = indexedDigitPredictions.find(R.propEq('index', index))
  return item
    ? String(item.digitPrediction)
    : C.BLANK
}

export const digitPredictionsToPuzzle = indexedDigitPredictions =>
  R.compose(
    R.splitEvery(9),
    R.join(C.EMPTY),
    R.map(digitOrBlank(indexedDigitPredictions))
  )(R.range(0, 81))

const setsOfRowIndices = R.splitEvery(9, R.range(0, 81))

const setsOfColIndices = R.transpose(setsOfRowIndices)

const makeSetOfBoxIndices = (boxRow, boxCol) => {
  const baseIndex = boxRow * 27 + boxCol * 3
  return R.chain(rowWithinBox =>
    R.map(colWithinBox =>
      baseIndex + rowWithinBox * 9 + colWithinBox,
      R.range(0, 3)),
    R.range(0, 3))
}

const setsOfBoxIndices =
  R.chain(boxRow =>
    R.map(boxCol =>
      makeSetOfBoxIndices(boxRow, boxCol),
      R.range(0, 3)),
    R.range(0, 3))

const noDuplicates = xs =>
  xs.length === R.uniq(xs).length

const validateIndices = digitPredictions => indices => {
  const digits = digitPredictions
    .filter(({ index }) => indices.includes(index))
    .map(({ digitPrediction }) => digitPrediction)
  return noDuplicates(digits)
}

const validateSetsOfIndices = digitPredictions =>
  R.all(validateIndices(digitPredictions))

export const satisfiesAllConstraints = digitPredictions => {
  performance.mark('satisfiesAllConstraints-start')
  try {
    // https://en.wikipedia.org/wiki/Mathematics_of_Sudoku#Ordinary_Sudoku
    if (digitPredictions.length < 17) return false

    return R.all(
      validateSetsOfIndices(digitPredictions),
      [
        setsOfRowIndices,
        setsOfColIndices,
        setsOfBoxIndices
      ]
    )
  } finally {
    performance.measure('satisfiesAllConstraints', 'satisfiesAllConstraints-start')
  }
}
