import { tournamentResolvers } from './tournamentResolvers';
import { playerResolvers } from './playerResolvers';
import { matchResolvers } from './matchResolvers';
import { authResolvers } from './authResolvers';
import { clubResolvers } from './clubResolvers';
import { viewerResolvers } from './viewerResolver';
import { dateScalar } from './scalarResolvers';
import { mergeResolvers } from '@graphql-tools/merge';

export const resolvers = mergeResolvers([
  {
    Date: dateScalar,
  },
  tournamentResolvers,
  playerResolvers,
  matchResolvers,
  authResolvers,
  clubResolvers,
  viewerResolvers,
]);