import { assert } from '../helpers/TestHelpers'
import { BaseClass } from '../targets/BaseClass'
import { bindDynamo, dynBatchWrite, dynGet, dynQuery } from '../targets/dynamo'
if (!process.env.CUSTOMER_ID) {
  throw new Error('CUSTOMER_ID must be defined')
}

class Bill extends BaseClass {
  static entryPointSchemas() {
    return {
      Query: [
        'Bill(company: String!, month: Int!, year: Int!): Bill',
        'BillQuery(company: String!, month: Int, year: Int): [Bill]',
      ],
      Mutation: [
        'Bill(method: MutationMethods!, item: BillInput!): Bill',
        'BillBatchPut(items: [BillInput!]!): [Bill]',
        'BillBatchDelete(items: [BillInput!]!): [Bill]',
      ],
    }
  }

  static resolvers() {
    return {
      Query: {
        Bill: async (_: any, args: any) => {
          return await dynGet(Bill, args)
        },
        BillQuery: async (_: any, args: any) => {
          return await dynQuery(Bill, args)
        },
      },
      Mutation: {
        Bill: async (_: any, args: any) => {
          const instance = new Bill(args.item)
          assert(
            args.item.year >= new Date().getFullYear(),
            'bill cannot be for a previous year'
          )
          return instance[args.method]()
        },
        BillBatchPut: async (_: any, args: any) => {
          const thisYear = new Date().getFullYear()
          for (const item of args.items) {
            assert(item.year >= thisYear, 'bill cannot be for a previous year')
          }
          return await dynBatchWrite(Bill, args.items, 'Put')
        },
        BillBatchDelete: async (_: any, args: any) => {
          return await dynBatchWrite(Bill, args.items, 'Delete')
        },
      },
    }
  }

  static queryReducer(dynamoResponse: AWS.DynamoDB.DocumentClient.QueryOutput) {
    const records = []
    if (dynamoResponse.Items) {
      for (const item of dynamoResponse.Items) {
        records.push(new this(item))
      }
    }
    return records
  }

  static schema() {
    return `
type Bill {
  company: String!
  month: MonthInputs!
  year: Int!
  total: Float!
}

input BillInput {
  company: String!
  month: MonthInputs!
  year: Int!
  total: Float!
}

enum MutationMethods {
  put
  delete
}

enum MonthInputs {
  Jan
  Feb
  Mar
  Apr
  May
  Jun
  Jul
  Aug
  Sep
  Oct
  Nov
  Dec
}

input BillUpdate {
  total: Float!
}`
  }

  // MODEL SPECIFIC METHODS
  static Key(args: any): CompositeKey {
    const months: any = {
      Jan: '01',
      Feb: '02',
      Mar: '03',
      Apr: '04',
      May: '05',
      Jun: '06',
      Jul: '07',
      Aug: '08',
      Sep: '09',
      Oct: '10',
      Nov: '11',
      Dec: '12',
    }
    const compositeKey = {
      pk: `${process.env.CUSTOMER_ID} > bill > ${args.company}`,
      sk: `year > ${args.year} > ${months[args.month]}`,
    }
    return compositeKey
  }
}
interface CompositeKey {
  pk: string
  sk: string
}

bindDynamo(Bill, [
  'get',
  'put',
  'update',
  'delete',
  'query',
  'batchPut',
  'batchDelete',
])

export default Bill
