import gql from 'graphql-tag';

import MESSAGE_FRAGMENT from './message.fragment';

const CREATE_GROUP_MUTATION = gql`
  mutation createGroup($name: String!, $userIds: [Int], $userId: Int!) {
    createGroup(name: $name, userIds: $userIds, userId: $userId) {
      id
      name
      users {
        id
        username
      }
      messages(limit: 1) {
        ... MessageFragment
      }
    }
  }
  ${MESSAGE_FRAGMENT}
`;

export default CREATE_GROUP_MUTATION;