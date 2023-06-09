import chai, { expect } from 'chai'
import chaiAlmost from 'chai-almost'
import * as tf from '@tensorflow/tfjs'
import * as R from 'ramda'
import { findBoundingBox, helloModuleLoaded } from '../src/findBoundingBox.js'
import { scanPuzzle } from '../src/scan'
import { satisfiesAllConstraints, digitPredictionsToPuzzle } from '../src/puzzle'
import * as I from '../src/image'

const main = async () => {

  chai.use(chaiAlmost())

  mocha
    .setup('bdd')
    .slow(5000)
    .timeout(5000)
    .checkLeaks()
    // .globals(['__VUE_DEVTOOLS_TOAST__'])

  await helloModuleLoaded

  // https://www.tensorflow.org/js/tutorials/deployment/size_optimized_bundles
  const profileInfo = await tf.profile(() =>
    // https://mochajs.org/api/mocha#run
    new Promise(resolve => mocha.run(failures => resolve(failures)))
  )

  console.log('profileInfo:', profileInfo)
  console.log('kernelNames:', profileInfo.kernelNames)
}

main()

describe('sudoku-buster tests', () => {

  let imageDataGood = undefined
  let imageDataWarped = undefined
  let cellsModel = undefined

  before(async () => {
    const imageTensorGood = await I.loadImage('/rawImages/good.png')
    imageDataGood = await I.imageTensorToImageData(imageTensorGood)
    imageTensorGood.dispose()

    const imageTensorWarped = await I.loadImage('/rawImages/warped.png')
    imageDataWarped = await I.imageTensorToImageData(imageTensorWarped)
    imageTensorWarped.dispose()

    cellsModel = await tf.loadLayersModel(`${location.origin}/models/cells/model.json`)
  })

  after(() => {
    if (cellsModel) {
      cellsModel.dispose()
    }
  })

  describe('findBoundingBox', () => {
    it('should find the correct bounding box', () => {
      const { boundingBox } = findBoundingBox(imageDataGood)
      const [x, y, w, h] = boundingBox
      const TOLERANCE = 3
      expect(x).to.be.almost(21, TOLERANCE)
      expect(y).to.be.almost(30, TOLERANCE)
      expect(w).to.be.almost(184, TOLERANCE)
      expect(h).to.be.almost(184, TOLERANCE)
    })
  })

  describe('scanPuzzle', () => {

    const checkInitialValues = (actual, expected) => {
      expect(actual).to.have.length(9)
      R.range(0, 9).forEach(index => {
        const actualRow = {
          row: index,
          values: actual[index]
        }
        const expectedRow = {
          row: index,
          values: expected[index]
        }
        expect(actualRow).to.deep.equal(expectedRow)
      })
    }

    it('should predict the correct initial values (good image)', async () => {
      const digitPredictions = await scanPuzzle(cellsModel, imageDataGood)
      const actual = digitPredictionsToPuzzle(digitPredictions)
      const expected = [
        "28  3  45",
        "5 4   6 2",
        " 1 5 4 9 ",
        "  28 34  ",
        "8   7   3",
        "  36 29  ",
        " 4 1 5 2 ",
        "1 5   7 4",
        "63  4  19"
      ]
      checkInitialValues(actual, expected)
    })

    it('should predict the correct initial values (warped image)', async () => {
      const digitPredictions = await scanPuzzle(cellsModel, imageDataWarped)
      const actual = digitPredictionsToPuzzle(digitPredictions)
      const expected = [
        " 59      ",
        "8     43 ",
        "3  6 2 1 ",
        "  1 3 8  ",
        "   7 5   ",
        "  4 9 2  ",
        " 7 4 1  9",
        " 13     2",
        "      67 "
      ]
      checkInitialValues(actual, expected)
    })

    it('should not leak any tensors', async () => {
      const numTensorsBefore = tf.memory().numTensors
      await scanPuzzle(cellsModel, imageDataGood)
      const numTensorsAfter = tf.memory().numTensors
      expect(numTensorsAfter).to.equal(numTensorsBefore)
    })
  })

  describe('satisfiesAllConstraints', () => {

    it('should fail given an empty collection of predictions', () => {
      expect(satisfiesAllConstraints([])).to.be.false
    })

    it('should succeed given the result of a successful scan', async () => {
      const digitPredictions = await scanPuzzle(cellsModel, imageDataGood)
      expect(satisfiesAllConstraints(digitPredictions)).to.be.true
    })

    const minimumDigitPredictions = [
      { digitPrediction: 2, index: 0 },
      { digitPrediction: 8, index: 1 },
      { digitPrediction: 3, index: 4 },
      { digitPrediction: 4, index: 7 },
      { digitPrediction: 5, index: 8 },
      { digitPrediction: 5, index: 9 },
      { digitPrediction: 4, index: 11 },
      { digitPrediction: 6, index: 15 },
      { digitPrediction: 2, index: 17 },
      { digitPrediction: 1, index: 19 },
      { digitPrediction: 5, index: 21 },
      { digitPrediction: 4, index: 23 },
      { digitPrediction: 9, index: 25 },
      { digitPrediction: 2, index: 29 },
      { digitPrediction: 8, index: 30 },
      { digitPrediction: 3, index: 32 },
      { digitPrediction: 4, index: 33 }
    ]

    const makeDeliberateDuplicate = (index1, index2) => {
      const digitPredictions = R.clone(minimumDigitPredictions)
      const findEntryAtIndex = index => digitPredictions.find(entry => entry.index === index)
      const entry1 = findEntryAtIndex(index1)
      const entry2 = findEntryAtIndex(index2)
      entry2.digitPrediction = entry1.digitPrediction
      return digitPredictions
    }

    it('should fail given a row with a duplicate digit', () => {
      const digitPredictions = makeDeliberateDuplicate(0, 1)
      expect(satisfiesAllConstraints(digitPredictions)).to.be.false
    })

    it('should fail given a column with a duplicate digit', () => {
      const digitPredictions = makeDeliberateDuplicate(0, 9)
      expect(satisfiesAllConstraints(digitPredictions)).to.be.false
    })

    it('should fail given a 3x3 box with a duplicate digit', () => {
      const digitPredictions = makeDeliberateDuplicate(0, 11)
      expect(satisfiesAllConstraints(digitPredictions)).to.be.false
    })
  })
})
