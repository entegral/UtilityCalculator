import AWS, { DynamoDB } from 'aws-sdk'
import debug from 'debug'
import { assert } from '../helpers/TestHelpers'
const dynamoLog = debug('arctica>targets>dynamo')
const docClient = new AWS.DynamoDB.DocumentClient()
const TableName = process.env.TABLENAME || 'MUST SET TABLENAME ENV VAR'

interface KeyArgs {
  id: string
}

interface DynamoKey {
  pk: string
  sk: string
}

export function bindDynamo(klass: any, methods: string[]) {
  if (typeof klass.Indexes === 'undefined') {
    klass.Indexes = DynamoClass.Indexes
  }
  if (typeof klass.Key === 'undefined') {
    throw new Error(
      `${klass.name} must have a static "Key" function that returns an object with a pk/sk composite key.`
    )
  }
  for (const method of methods) {
    if (method === 'get') {
      klass.get = DynamoClass.get
      klass.getParams = DynamoClass.getParams
    }
    if (method === 'put') {
      klass.prototype.put = DynamoClass.prototype.put
      klass.putParams = DynamoClass.putParams
    }
    if (method === 'update') {
      klass.prototype.update = DynamoClass.prototype.update
      klass.updateParams = DynamoClass.updateParams
    }
    if (method === 'delete') {
      klass.prototype.delete = DynamoClass.prototype.delete
      klass.deleteParams = DynamoClass.deleteParams
    }
    if (method === 'query') {
      klass.query = DynamoClass.query
      klass.queryParams = DynamoClass.queryParams
    }
    if (method === 'batchPut') {
      klass.batchPut = DynamoClass.batchPut
      klass.batchPutParams = DynamoClass.batchPutParams
    }

    if (method === 'batchDelete') {
      klass.batchDelete = DynamoClass.batchDelete
      klass.batchDeleteParams = DynamoClass.batchDeleteParams
    }
  }
}
export class DynamoClass {
  [propName: string]: any

  constructor(args: any) {
    for (const field in args) {
      this[field] = args[field]
    }
  }

  static Indexes(item: any): Object {
    return {}
  }
  static Key(args: KeyArgs): DynamoKey {
    return {
      pk: 'All model types must define a static Key function with pk and sk',
      sk: `All model types must define a static Key function with pk and sk`,
    }
  }

  static async get(args: any) {
    return await dynGet(this, args)
  }

  async put() {
    await dynPut(this.constructor, this)
    return this
  }
  async update(args: any) {
    dynamoLog('[DynamoClass.update] args:', args)
    const res = await dynUpdate(this.constructor, this, args.item)
    return { ...res, ...args.item }
  }

  static async batchPut(args: any) {
    dynamoLog('[DynamoClass.batchPut] args:', args)
    const res = await dynBatchWrite(this.constructor, args.items, 'Put')
    return { ...res, ...args.item }
  }

  static async batchDelete(args: any) {
    dynamoLog('[DynamoClass.batchDelete] args:', args)
    const res = await dynBatchWrite(this.constructor, args.items, 'Delete')
    return { ...res, ...args.item }
  }

  static async query(args: any) {
    dynamoLog('[DynamoClass.query] args:', args)
    return await dynQuery(this.constructor, args)
  }

  static updateParams(
    updateFields: any,
    instance: any
  ): AWS.DynamoDB.DocumentClient.UpdateItemInput {
    dynamoLog('[DynamoClass.updateParams] args', { updateFields, instance })
    const params = {
      TableName,
      Key: this.Key(instance),
      UpdateExpression: ``,
      ExpressionAttributeNames: {} as any,
      ExpressionAttributeValues: {} as any,
    }
    const sets = []
    const removes = []
    for (const field in updateFields) {
      const value = updateFields[field]
      if (value === null) {
        removes.push(`#${field}`)
      } else {
        sets.push(`#${field} = :${field}`)
        params.ExpressionAttributeValues[`:${field}`] = value
      }
      params.ExpressionAttributeNames[`#${field}`] = field
    }
    if (sets.length > 0) {
      params.UpdateExpression = `SET ${sets.join(', ')}`
    }
    if (removes.length > 0) {
      params.UpdateExpression += ` REMOVE ${removes.join(', ')}`
    }
    dynamoLog('[DynamoClass.updateParams] updateParams', params)
    return params
  }

  static getParams(args: any): AWS.DynamoDB.DocumentClient.GetItemInput {
    return {
      TableName,
      Key: this.Key(args),
    }
  }

  static deleteParams(args: any): AWS.DynamoDB.DocumentClient.DeleteItemInput {
    return {
      TableName,
      Key: this.Key(args),
    }
  }

  static putParams(item: any): AWS.DynamoDB.DocumentClient.PutItemInput {
    const putParams: AWS.DynamoDB.DocumentClient.PutItemInput = {
      TableName,
      Item: {
        ...item,
        ...this.Indexes(item),
        ...this.Key(item),
      },
    }
    return putParams
  }

  static batchPutParams(
    items: any[]
  ): AWS.DynamoDB.DocumentClient.BatchWriteItemInput {
    const params: AWS.DynamoDB.DocumentClient.BatchWriteItemInput = {
      RequestItems: {
        [TableName]: [],
      },
    }
    assert.isArray(items, '"items" must be an array')
    assert(items.length <= 25, '"items" array length must be 25 or less')
    for (const item of items) {
      const writeRequest = {
        PutRequest: {
          Item: {
            ...item,
            ...this.Key(item),
          },
        },
      }
      params.RequestItems[TableName].push(writeRequest)
    }
    return params
  }

  static batchDeleteParams(
    items: any[]
  ): AWS.DynamoDB.DocumentClient.BatchWriteItemInput {
    const params: AWS.DynamoDB.DocumentClient.BatchWriteItemInput = {
      RequestItems: {
        [TableName]: [],
      },
    }
    assert.isArray(items, '"items" must be an array')
    assert(items.length <= 25, '"items" array length must be 25 or less')
    for (const item of items) {
      const writeRequest = {
        DeleteRequest: {
          Key: this.Key(item),
        },
      }
      params.RequestItems[TableName].push(writeRequest)
    }
    return params
  }

  static queryParams(args: any): AWS.DynamoDB.DocumentClient.QueryInput {
    const key = this.Key(args)
    return {
      TableName,
      KeyConditionExpression: '#pk = :pk AND begins_with(#sk, :sk)',
      ExpressionAttributeNames: {
        '#pk': 'pk',
        '#sk': 'sk',
      },
      ExpressionAttributeValues: {
        ':pk': key.pk,
        ':sk': key.sk,
      },
    }
  }
}

export const dynGet = async (klass: any, args: any): Promise<any> => {
  const getParams: AWS.DynamoDB.DocumentClient.GetItemInput = klass.getParams(
    args
  )
  dynamoLog('[dynGet] getParams', getParams)
  const data = await docClient.get(getParams).promise()
  dynamoLog('[dynGet] get data', data)
  return new klass(data.Item)
}

export const dynQuery = async (
  klass: any,
  args: any
): Promise<AWS.DynamoDB.DocumentClient.QueryOutput> => {
  const queryParams: AWS.DynamoDB.DocumentClient.QueryInput = klass.queryParams(
    args
  )
  dynamoLog('[dynQuery] queryParams', queryParams)
  assert.isFunction(
    klass.queryReducer,
    `${klass.name} must define a queryReducer to use the query operation`
  )
  const dynResponse = await docClient.query(queryParams).promise()
  return klass.queryReducer(dynResponse)
}

export const dynDelete = async (klass: any, args: any): Promise<any> => {
  const deleteParams = klass.deleteParams(args)
  dynamoLog('[dynDelete] deleteParams', deleteParams)
  await docClient.delete(deleteParams).promise()
  return new klass(args)
}

export const dynPut = async (klass: any, args: any): Promise<object> => {
  const putParams = klass.putParams(args)
  dynamoLog('[dynPut] putParams', putParams)
  await docClient.put(putParams).promise()
  return new klass(args)
}

export const dynBatchWrite = async (
  klass: any,
  items: any,
  putOrDelete: 'Put' | 'Delete'
): Promise<any> => {
  const batchWriteParams = klass[`batch${putOrDelete}Params`](items)
  dynamoLog('[batchWrite] batchWriteParams', batchWriteParams)
  await docClient.batchWrite(batchWriteParams).promise()
  return items.map((item: any) => new klass(item))
}

export const dynUpdate = async (
  klass: any,
  instance: any,
  args: any
): Promise<object> => {
  const updateParams = klass.updateParams(args, instance)
  updateParams.ReturnValues = 'ALL_NEW'
  dynamoLog('[dynUpdate] updateParams', updateParams)
  await docClient.update(updateParams).promise()
  return new klass({ ...instance, ...args })
}
