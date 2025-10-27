import { GraphQLScalarType, Kind } from 'graphql';

export const dateScalar = new GraphQLScalarType({
  name: 'Date',
  description: 'Date custom scalar type',
  serialize(value: any) {
    if (value instanceof Date) {
      return value.getTime(); // Convert outgoing Date to integer for JSON
    }
    throw Error('GraphQL Date Scalar serializer expected a `Date` object');
  },
  parseValue(value: any) {
    if (typeof value === 'number') {
      return new Date(value); // Convert incoming integer to Date
    }
    if (typeof value === 'string') {
      return new Date(value); // Convert incoming ISO string to Date
    }
    if (value instanceof Date) {
      return value; // Already a Date object
    }
    throw new Error('GraphQL Date Scalar parser expected a `number`, `string`, or `Date`');
  },
  parseLiteral(ast) {
    if (ast.kind === Kind.INT) {
      // Convert hard-coded AST string to integer and then to Date
      return new Date(parseInt(ast.value, 10));
    }
    // Invalid hard-coded value (not an integer)
    return null;
  },
});