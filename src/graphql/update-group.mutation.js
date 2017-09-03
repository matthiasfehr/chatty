import gql from 'graphql-tag';

const UPDATE_GROUP_MUTATION = gql`
  mutation updateGroup($id: Int!, $name: String!) {
    updateGroup(id: $id, name: $name) {
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
`;

export default UPDATE_GROUP_MUTATION;