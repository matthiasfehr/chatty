import gql from 'graphql-tag';

const MESSAGE_FRAGMENT = gql`
  fragment MessageFragment on Message {
    id
    to {
      id
    }
    from {
      id
      username
    }
    insertedAt
    text
  }
`;
export default MESSAGE_FRAGMENT;