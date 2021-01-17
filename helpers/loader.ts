import fs from 'fs'
import { resolve } from 'path'
import { BaseClass } from '../targets/BaseClass'

interface ResolverObject {
  Query: {
    [propName: string]: Function
  }
  Mutation: {
    [propName: string]: Function
  }
  [propName: string]: BaseClass
}

interface GraphQLParams {
  typeDefs: string
  resolvers: ResolverObject
}
interface SchemaHelper {
  Query: string[]
  Mutation: string[]
  Types: string[]
}
export const loadModels = (path: string): GraphQLParams => {
  const schema: SchemaHelper = {
    Query: [],
    Mutation: [],
    Types: [],
  }
  const resolvers: ResolverObject = {
    Query: {},
    Mutation: {},
  }
  const filenames = fs.readdirSync(path)

  for (const filename of filenames) {
    const modelClass = require(resolve(path, filename)).default
    // import schema artifacts
    schema.Types.push(modelClass.schema())
    const entryPointSchemas = modelClass.entryPointSchemas()
    if (Array.isArray(entryPointSchemas.Query)) {
      schema.Query = schema.Query.concat(entryPointSchemas.Query)
    }
    if (Array.isArray(entryPointSchemas.Mutation)) {
      schema.Mutation = schema.Mutation.concat(entryPointSchemas.Mutation)
    }
    // import resolvers
    const modelResolvers = modelClass.resolvers()
    if (modelResolvers.Query) {
      resolvers.Query = {
        ...resolvers.Query,
        ...modelResolvers.Query,
      }
    }
    if (modelResolvers.Mutation) {
      resolvers.Mutation = {
        ...resolvers.Mutation,
        ...modelResolvers.Mutation,
      }
    }
    resolvers[modelClass.name] = modelClass.new()
  }
  const schemaType = ['type schema {']
  const typeDefsArray = [schema.Types.join('\n')]
  if (schema.Query.length > 0) {
    typeDefsArray.push(['type Query {', ...schema.Query].join('\n  '))
    typeDefsArray.push('}')
    schemaType.push('  query: Query')
  }
  if (schema.Mutation.length > 0) {
    typeDefsArray.push(['type Mutation {', ...schema.Mutation].join('\n  '))
    typeDefsArray.push('}')
    schemaType.push('  mutation: Mutation')
  }
  schemaType.push('}')
  typeDefsArray.push(schemaType.join('\n'))
  const typeDefs = typeDefsArray.join('\n')
  return {
    typeDefs,
    resolvers,
  }
}
