import { gql } from 'graphql-tag';

export const typeDefs = gql`
  scalar Date

  enum TournamentMode {
    singles
    doubles
  }

  enum TournamentStatus {
    registration
    in_progress
    completed
  }

  enum TournamentRegistrationType {
    open
    club_only
  }

  enum UserRole {
    superadmin
    club_admin
    member
  }

  enum MembershipStatus {
    pending
    approved
    rejected
  }

  enum BracketType {
    winners
    losers
  }

  enum BracketingMethod {
    random
    manual
  }

  enum Gender {
    male
    female
  }

  type User {
    id: ID!
    email: String!
    firstName: String!
    lastName: String!
    gender: Gender!
    role: UserRole!
    isActive: Boolean!
    createdAt: Date!
    updatedAt: Date!
  }

  type Club {
    id: ID!
    name: String!
    description: String
    clubAdmin: User!
    isActive: Boolean!
    memberCount: Int!
    createdAt: Date!
    updatedAt: Date!
  }

  type ClubMembership {
    id: ID!
    club: Club!
    user: User!
    status: MembershipStatus!
    requestedAt: Date!
    approvedAt: Date
    rejectedAt: Date
    approvedBy: User
    createdAt: Date!
    updatedAt: Date!
  }

  type ClubRequest {
    id: ID!
    name: String!
    description: String
    requestedBy: User!
    status: MembershipStatus!
    reviewedBy: User
    reviewedAt: Date
    rejectionReason: String
    createdAt: Date!
    updatedAt: Date!
  }

  type TournamentRegistration {
    id: ID!
    tournament: Tournament!
    club: Club!
    participantId: String!
    participantType: String!
    selectedByClubAdmin: Boolean!
    selectedAt: Date
    registeredAt: Date!
    createdAt: Date!
    updatedAt: Date!
  }

  type AuthPayload {
    token: String!
    user: User!
  }

  type Player {
    id: ID!
    firstName: String!
    lastName: String!
    gender: Gender!
    user: User
    club: Club
    teamId: String
    mode: TournamentMode!
    createdAt: Date!
    updatedAt: Date!
  }

  type Team {
    id: ID!
    name: String!
    player1Id: String!
    player2Id: String!
    tournamentId: String!
    player1: Player
    player2: Player
    createdAt: Date!
    updatedAt: Date!
  }

  type Score {
    participant1Score: Int!
    participant2Score: Int!
    participant1Points: Int
    participant2Points: Int
  }

  type Match {
    id: ID!
    tournamentId: String!
    round: Int!
    bracketType: BracketType!
    participant1: String!
    participant2: String!
    winner: String
    loser: String
    score: Score
    completed: Boolean!
    participant1Name: String
    participant2Name: String
    scheduledDate: Date
    scheduledTime: String
    createdAt: Date!
    updatedAt: Date!
  }

  type BracketState {
    winners: [String!]!
    losers: [String!]!
  }

  type Tournament {
    id: ID!
    name: String!
    mode: TournamentMode!
    status: TournamentStatus!
    registrationType: TournamentRegistrationType!
    club: Club
    maxParticipants: Int!
    currentParticipants: Int!
    bracketState: BracketState!
    bracketingMethod: BracketingMethod!
    seedingCompleted: Boolean!
    winnersChampion: String
    consolationChampion: String
    groupA: [String!]
    groupB: [String!]
    createdAt: Date!
    updatedAt: Date!
  }

  type BracketAssignment {
    id: ID!
    tournamentId: String!
    participantId: String!
    bracketType: BracketType!
    seed: Int!
    createdAt: Date!
    updatedAt: Date!
  }

  type BracketResponse {
    tournament: Tournament!
    winners: [Match!]!
    losers: [Match!]!
  }

  type ParticipantsResponse {
    participants: [ParticipantUnion!]!
  }

  union ParticipantUnion = Player | Team

  input ScoreInput {
    participant1Score: Int!
    participant2Score: Int!
    participant1Points: Int
    participant2Points: Int
  }

  input RegisterInput {
    email: String!
    password: String!
    firstName: String!
    lastName: String!
    gender: Gender!
  }

  input LoginInput {
    email: String!
    password: String!
  }

  input CreateClubInput {
    name: String!
    description: String
    clubAdminEmail: String!
  }

  input RequestClubInput {
    name: String!
    description: String
  }

  input CreateTournamentInput {
    name: String!
    mode: TournamentMode!
    registrationType: TournamentRegistrationType!
    clubId: String
    bracketingMethod: BracketingMethod
  }

  input AssignParticipantInput {
    tournamentId: String!
    participantId: String!
    bracketType: BracketType!
    seed: Int!
  }

  input RegisterPlayerInput {
    name: String!
    mode: TournamentMode!
    tournamentId: String!
  }

  input AddClubPlayerInput {
    firstName: String!
    lastName: String!
    gender: Gender!
    clubId: String!
    userId: String
  }

  input RegisterTeamInput {
    name: String!
    player1Name: String!
    player2Name: String!
    tournamentId: String!
  }

  input SubmitMatchResultInput {
    matchId: String!
    winnerId: String!
    loserId: String!
    score: ScoreInput
  }

  input UpdateLiveScoreInput {
    matchId: String!
    scoreA: Int!
    scoreB: Int!
    pointsA: Int
    pointsB: Int
  }

  input CreateQuickPlayerInput {
    firstName: String!
    lastName: String!
    gender: Gender!
    tournamentId: String!
  }

  input UpdateQuickPlayerInput {
    firstName: String
    lastName: String
    gender: Gender
  }

  input CreateQuickTeamInput {
    name: String!
    player1Id: String!
    player2Id: String!
    tournamentId: String!
  }

  input SetTournamentGroupsInput {
    tournamentId: String!
    groupA: [String!]!
    groupB: [String!]!
  }

  type TournamentGroups {
    tournamentId: String!
    groupA: [String!]!
    groupB: [String!]!
  }

  type Query {
    # Authentication queries
    me: User
    
    # User queries (admin only)
    users: [User!]!
    
    # Club queries
    clubs: [Club!]!
    club(id: ID!): Club
    myClubs: [Club!]!
    clubMembers(clubId: ID!): [ClubMembership!]!
    clubMembershipRequests(clubId: ID!): [ClubMembership!]!

    # Club request queries
    clubRequests: [ClubRequest!]!
    myClubRequests: [ClubRequest!]!
    
    # Tournament queries
    tournaments: [Tournament!]!
    tournament(id: ID!): Tournament
    
    # Player queries
    players(mode: TournamentMode): [Player!]!
    clubPlayers(clubId: ID!): [Player!]!
    
    # Team queries
    teams(tournamentId: String): [Team!]!
    
    # Match queries
    matches(tournamentId: String!): [Match!]!
    bracket(tournamentId: String!): BracketResponse!
    
    # Participant queries
    participants(tournamentId: String!): ParticipantsResponse!
    
    # Tournament registration queries
    tournamentRegistrations(tournamentId: ID!): [TournamentRegistration!]!

    # Quick tournament queries
    tournamentPlayers(tournamentId: String!): [Player!]!
    tournamentGroups(tournamentId: String!): TournamentGroups

    # Viewer tracking queries
    viewerCount(tournamentId: ID!): Int!
  }

  type Mutation {
    # Authentication mutations
    register(input: RegisterInput!): AuthPayload!
    login(input: LoginInput!): AuthPayload!
    
    # Club mutations
    createClub(input: CreateClubInput!): Club!
    requestClubMembership(clubId: ID!): ClubMembership!
    approveClubMembership(membershipId: ID!): ClubMembership!
    rejectClubMembership(membershipId: ID!): ClubMembership!

    # Club request mutations
    requestClubCreation(input: RequestClubInput!): ClubRequest!
    approveClubRequest(requestId: ID!): Club!
    rejectClubRequest(requestId: ID!, reason: String): ClubRequest!
    
    # Tournament mutations
    createTournament(input: CreateTournamentInput!): Tournament!
    updateTournamentStatus(id: ID!, status: TournamentStatus!): Tournament!
    updateTournamentRegistrationType(id: ID!, registrationType: TournamentRegistrationType!): Tournament!
    deleteTournament(id: ID!): Boolean!
    archiveTournament(id: ID!): Tournament!
    syncTournamentParticipants(id: ID!): Tournament!
    
    # Club tournament registration mutations
    selectPlayerForTournament(tournamentId: ID!, playerId: ID!): TournamentRegistration!
    removePlayerFromTournament(tournamentId: ID!, playerId: ID!): Boolean!
    
    # Player mutations
    registerPlayer(input: RegisterPlayerInput!): Player!
    addClubPlayer(input: AddClubPlayerInput!): Player!
    removeClubPlayer(playerId: ID!): Boolean!
    
    # Team mutations  
    registerTeam(input: RegisterTeamInput!): Team!
    
    # Match mutations
    generateMatches(tournamentId: String!): [Match!]!
    generateRoundRobinMatches(tournamentId: String!): [Match!]!
    recalculatePlayoffMatches(tournamentId: String!): [Match!]!
    deleteMatch(matchId: ID!): Boolean!
    resetMatch(matchId: ID!): Match!
    submitMatchResult(input: SubmitMatchResultInput!): Match!
    updateLiveScore(input: UpdateLiveScoreInput!): Match!
    updateMatchSchedule(matchId: ID!, scheduledDate: Date, scheduledTime: String): Match!

    # Bracket seeding mutations
    assignParticipantToBracket(input: AssignParticipantInput!): BracketAssignment!
    generateMatchesFromManualSeeding(tournamentId: String!): [Match!]!

    # Quick tournament mutations
    createQuickPlayer(input: CreateQuickPlayerInput!): Player!
    updateQuickPlayer(id: ID!, input: UpdateQuickPlayerInput!): Player!
    deleteQuickPlayer(id: ID!): Boolean!
    createQuickTeam(input: CreateQuickTeamInput!): Team!
    deleteQuickTeam(id: ID!): Boolean!
    setTournamentGroups(input: SetTournamentGroupsInput!): TournamentGroups!

    # Viewer tracking mutations
    trackViewer(tournamentId: ID!, sessionId: ID!): Boolean!
    removeViewer(tournamentId: ID!, sessionId: ID!): Boolean!
  }

  type Subscription {
    # Live score updates for real-time scoring
    matchScoreUpdated(matchId: String!): Match!
    
    # Tournament bracket updates
    tournamentUpdated(tournamentId: String!): Tournament!
  }
`;