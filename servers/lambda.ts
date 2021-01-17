import { ApolloServer } from 'apollo-server-lambda'
import { loadModels } from '../helpers/loader'

export const lambdaServer = (pathToModels: string) => {
  const { typeDefs, resolvers } = loadModels(pathToModels)

  const validate = (handler: any, event: any, context: any, callback: any) => {
    const valid = process.env.X_API_KEY ?? 'fallbackKey'
    const key =
      event.headers?.['x-api-key'] ?? event.queryStringParameters?.apiKey
    if (key !== valid) {
      return Promise.resolve({
        isBase64Encoded: false,
        statusCode: 403,
        headers: {
          'Content-Type': 'application/json',
        },
        body: '{ "message": "Forbidden" }',
      })
    }
    return handler(event, context, callback)
  }

  const server = new ApolloServer({
    typeDefs,
    resolvers,
    playground: true,
    introspection: true,
  })

  return validate.bind(null, server.createHandler())
}
