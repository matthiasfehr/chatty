import gql from 'graphql-tag';
import MESSAGE_FRAGMENT from './message.fragment';

const GROUP_FRAGMENT = gql`
  fragment GroupFragment on Group {
    id
      name
      users {
        id
        username
      }
      messages(limit: $limit, offset: $offset) {
        ... MessageFragment
      }
  }
  ${MESSAGE_FRAGMENT}
`;
export default GROUP_FRAGMENT;