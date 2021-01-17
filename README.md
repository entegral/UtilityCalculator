# UtilityCalculator

#### Robert Bruce

## Description

This is a GraphQL API that helps keep track of and calculate utility costs for a household.

## API Documentation

## Deployment

### Required Environment variables

1. CUSTOMER_ID - string - name of the entity who will be using the service (used to isolate tables for billing purposes)
2. SERVICE_NAME - string - name for the service
3. API_PATH - string - path to use for service endpoint
4. X_API_KEY - string - api key

###

1. `npm i`
2. set required environment variables
3. `npm run dev` (to deploy to lambda using aws credentials) or `npm run local` (to use local Apollo server)
