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
        'Bill(billType: BillTypes!, month: MonthInputs!, year: Int!): Bill',
        'BillQuery(billType: BillTypes!, month: MonthInputs, year: Int!): [Bill]',
        'CalculateMonth(month: MonthInputs!, year: Int!, billTypes: [BillTypes!]): MonthTotalResult',
      ],
      Mutation: [
        'Bill(method: MutationMethods!, item: BillMutateInput!): Bill',
        'BillBatchPut(items: [BillMutateInput!]!): [Bill]',
        'BillBatchDelete(items: [BillDeleteInput!]!): [Bill]',
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
        CalculateMonth: async (_: any, args: any) => {
          const bills: any = {
            billTypes: {},
            total: 0,
          }
          if (typeof args.billTypes === 'undefined') {
            args.billTypes = ['electric', 'gas', 'water', 'internet', 'trash']
          }
          for (const type of args.billTypes) {
            const billParam = {
              ...args,
              billType: type,
            }
            const res = await dynGet(Bill, billParam)
            bills.billTypes[res.billType] = res.total
          }
          for (const billValue of Object.values(bills.billTypes)) {
            bills.total += billValue as number
          }
          return bills
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
  billType: BillTypes!
  month: MonthInputs!
  year: Int!
  total: Float!
}

input BillMutateInput {
  billType: BillTypes!
  month: MonthInputs!
  year: Int!
  total: Float!
}

input BillDeleteInput {
  billType: BillTypes!
  month: MonthInputs!
  year: Int!
}

enum MutationMethods {
  put
  delete
}

enum BillTypes {
  water
  gas
  electric
  internet
  trash
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
}

type CostByTypes {
  electric: Float
  gas: Float
  water: Float
  internet: Float
  trash: Float
}

type MonthTotalResult {
  billTypes: CostByTypes
  total: Float
}
`
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
      pk: `${process.env.CUSTOMER_ID} > bill > ${args.billType}`,
      sk: `year > ${args.year}`,
    }
    if (args.month) {
      compositeKey.sk += ` > month > ${months[args.month]}`
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
