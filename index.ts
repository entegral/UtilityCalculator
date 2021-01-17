import fs from 'fs'
import { lambdaServer } from './servers'
import {
  bindDynamo,
  dynBatchWrite,
  dynDelete,
  dynGet,
  dynPut,
  dynQuery,
  dynUpdate,
} from './targets/dynamo'

export { BaseClass } from './targets/BaseClass'

export const dynamo = {
  bindDynamo,
  methods: {
    dynBatchWrite,
    dynDelete,
    dynGet,
    dynPut,
    dynQuery,
    dynUpdate,
  },
}

const idxDir = fs.readdirSync(__dirname)
console.log('lambda dir', idxDir)

exports.server = lambdaServer(__dirname + '/types')
