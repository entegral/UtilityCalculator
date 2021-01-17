if (!process.env.AWS_REGION) {
  process.env.AWS_REGION = 'us-west-2'
}

import { ApolloServer } from 'apollo-server'
import { loadModels } from '../helpers/loader'

export const localServer = (pathToModels: string) => {
  const { typeDefs, resolvers } = loadModels(pathToModels)
  const server = new ApolloServer({
    typeDefs,
    resolvers,
    playground: true,
    introspection: true,
  })

  // The `listen` method launches a web server.
  return server.listen().then((req: any) => {
    console.log(`🚀  Server ready at ${req.url}`)
  })
}

if (process.env.LOCAL) {
  localServer(__dirname + '/../types')
}
