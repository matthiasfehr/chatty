import _ from 'lodash';
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    FlatList,
    StyleSheet,
    View,
    Image,
    Text,
    TouchableOpacity,
} from 'react-native';
import PropTypes from 'prop-types';
import React, {Component} from 'react';
import randomColor from 'randomcolor';
import Message from '../components/message.component';
import {graphql, compose} from 'react-apollo';
import GROUP_QUERY from '../graphql/group.query';
import MessageInput from '../components/message-input.component';
import CREATE_MESSAGE_MUTATION from '../graphql/create-message.mutation';
import update from 'immutability-helper';
import moment from 'moment';
import USER_QUERY from '../graphql/user.query';

const styles = StyleSheet.create({
    container: {
        alignItems: 'stretch',
        backgroundColor: '#e5ddd5',
        flex: 1,
        flexDirection: 'column',
    },
    loading: {
        justifyContent: 'center',
    },
    titleWrapper: {
        alignItems: 'center',
        position: 'absolute',
        left: 0,
        right: 0,
    },
    title: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    titleImage: {
        marginRight: 6,
        width: 32,
        height: 32,
        borderRadius: 16,
    },
});

function isDuplicateMessage(newMessage, existingMessages) {
    return newMessage.id !== null &&
        existingMessages.some(message => newMessage.id === message.id);
}

class Messages extends Component {
    static navigationOptions = ({navigation}) => {
        const {state, navigate} = navigation;

        const goToGroupDetails = navigate.bind(this, 'GroupDetails', {
            id: state.params.groupId,
            title: state.params.title,
        });

        return {
            headerTitle: (
                <TouchableOpacity
                    style={styles.titleWrapper}
                    onPress={goToGroupDetails}
                >
                    <View style={styles.title}>
                        <Image
                            style={styles.titleImage}
                            source={{uri: 'https://facebook.github.io/react/img/logo_og.png'}}
                        />
                        <Text>{state.params.title}</Text>
                    </View>
                </TouchableOpacity>
            ),
        };
    };

    constructor(props) {
        super(props);
        const usernameColors = {};
        if (props.group && props.group.users) {
            props.group.users.forEach((user) => {
                usernameColors[user.username] = randomColor();
            });
        }
        this.state = {
            usernameColors: {},
            refreshing: false,
        };
        this.renderItem = this.renderItem.bind(this);
        this.send = this.send.bind(this);
        this.onEndReached = this.onEndReached.bind(this);
    }

    send(text) {
        this.props.createMessage({
            groupId: this.props.navigation.state.params.groupId,
            userId: 1, // faking the user for now
            text,
        }).then(() => {
            this.flatList.scrollToIndex({index: 0, animated: true});
        });
    }

    onEndReached() {
        if (!this.state.loadingMoreEntries) {
            this.setState({
                loadingMoreEntries: true,
            });
            this.props.loadMoreEntries().then(() => {
                this.setState({
                    loadingMoreEntries: false,
                });
            });
        }
    }

    componentWillReceiveProps(nextProps) {
        const usernameColors = {};
        // check for new messages
        if (nextProps.group) {
            if (nextProps.group.users) {
                // apply a color to each user
                nextProps.group.users.forEach((user) => {
                    usernameColors[user.username] = this.state.usernameColors[user.username] || randomColor();
                });
            }
            this.setState({
                usernameColors,
            });
        }
    }

    keyExtractor = item => item.id;
    renderItem = ({item: message}) => (
        <Message
            color={this.state.usernameColors[message.from.username]}
            isCurrentUser={message.from.id === 1} // for now until we implement auth
            message={message}
        />
    )

    render() {
        const {loading, group} = this.props;
        // render loading placeholder while we fetch messages
        if (loading || !group) {
            return (
                <View style={[styles.loading, styles.container]}>
                    <ActivityIndicator />
                </View>
            );
        }
        // render list of messages for group
        return (
            <KeyboardAvoidingView
                behavior={'position'}
                contentContainerStyle={styles.container}
                keyboardVerticalOffset={64}
                style={styles.container}
            >
                <FlatList
                    ref={(ref) => {
                        this.flatList = ref;
                    }}
                    inverted
                    data={group.messages}
                    keyExtractor={this.keyExtractor}
                    renderItem={this.renderItem}
                    onEndReached={this.onEndReached}
                />
                <MessageInput send={this.send}/>
            </KeyboardAvoidingView>
        );
    }
}
Messages.propTypes = {
    createMessage: PropTypes.func,
    navigation: PropTypes.shape({
        navigate: PropTypes.func,
        state: PropTypes.shape({
            params: PropTypes.shape({
                groupId: PropTypes.number,
            }),
        }),
    }),
    group: PropTypes.shape({
        messages: PropTypes.array,
        users: PropTypes.array,
    }),
    loading: PropTypes.bool,
    loadMoreEntries: PropTypes.func,
};
const createMessageMutation = graphql(CREATE_MESSAGE_MUTATION, {
    props: ({mutate}) => ({
        createMessage: ({text, userId, groupId}) =>
            mutate({
                variables: {text, userId, groupId},
                optimisticResponse: {
                    __typename: 'Mutation',
                    createMessage: {
                        __typename: 'Message',
                        id: -1, // don't know id yet, but it doesn't matter
                        text,
                        insertedAt: new Date().toISOString(),
                        from: {
                            __typename: 'User',
                            id: 1,
                            username: 'Ryan Swapp',
                        },
                        to: {
                            __typename: 'Group',
                            id: groupId,
                        },
                    },
                },
                update: (store, {data: {createMessage}}) => {
                    const userData = store.readQuery({
                        query: USER_QUERY,
                        variables: {
                            id: 1, // faking the user for now
                        },
                    });
                    // check whether mutation is latest msg and update cache
                    const updatedGroup = _.find(userData.user.groups, { id: createMessage.groupId });
                    if (!updatedGroup.messages.length ||
                        moment(updatedGroup.messages[0].insertedAt).isBefore(moment(createMessage.insertedAt))) {
                        // update the latest message
                        updatedGroup.messages[0] = createMessage;
                        // Write our data back to the cache.
                        store.writeQuery({
                            query: USER_QUERY,
                            variables: {
                                id: 1, // faking the user for now
                            },
                            data: userData,
                        });
                    }
                },
            }),
    }),
});

const ITEMS_PER_PAGE = 10;
const groupQuery = graphql(GROUP_QUERY, {
    options: ownProps => ({
        variables: {
            groupId: ownProps.navigation.state.params.groupId,
            offset: 0,
            limit: ITEMS_PER_PAGE,
        },
    }),
    props: ({ data: { fetchMore, loading, group } }) => ({
        loading,
        group,
        loadMoreEntries() {
            return fetchMore({
                // query: ... (you can specify a different query.
                // GROUP_QUERY is used by default)
                variables: {
                    // We are able to figure out offset because it matches
                    // the current messages length
                    offset: group.messages.length,
                    limit: ITEMS_PER_PAGE,
                },
                updateQuery: (previousResult, {fetchMoreResult}) => {
                    // we will make an extra call to check if no more entries
                    if (!fetchMoreResult) {
                        return previousResult;
                    }
                    // push results (older messages) to end of messages list
                    return update(previousResult, {
                        group: {
                            messages: {$push: fetchMoreResult.group.messages},
                        },
                    });
                },
            });
        },
    })
});
export default compose(
    groupQuery,
    createMessageMutation,
)(Messages);